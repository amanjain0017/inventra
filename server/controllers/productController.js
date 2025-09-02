const Product = require("../models/productSchema");
const csv = require("csv-parser");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;
const invoiceController = require("./invoiceController");

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Helper Functions (unchanged for now) ---
const calculateAvailabilityStatus = (quantity, thresholdValue, expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiryDate && new Date(expiryDate) < today) {
    return "Expired";
  }
  if (quantity === 0) {
    return "Out of Stock";
  }
  if (quantity <= thresholdValue) {
    return "Low Stock";
  }
  return "In Stock";
};

const processProductData = (data) => {
  const processedData = { ...data };

  processedData.price = parseFloat(processedData.price) || 0;
  processedData.quantity = parseInt(processedData.quantity) || 0;
  processedData.thresholdValue = parseInt(processedData.thresholdValue) || 0;

  if (processedData.expiryDate) {
    try {
      const date = new Date(processedData.expiryDate);
      if (!isNaN(date.getTime())) {
        processedData.expiryDate = date;
      } else {
        processedData.expiryDate = null;
      }
    } catch (e) {
      processedData.expiryDate = null;
    }
  } else {
    processedData.expiryDate = null;
  }

  processedData.availabilityStatus = calculateAvailabilityStatus(
    processedData.quantity,
    processedData.thresholdValue,
    processedData.expiryDate
  );

  return processedData;
};

// =========================================================================
// 1. Add Product (Individual)
// Route: POST /api/products
// Access: Protected
// Description: Adds a single new product to the inventory.
// =========================================================================
exports.addProduct = async (req, res) => {
  try {
    const { imageUrl, cloudinaryPublicId, ...restOfProductData } = req.body;

    const productData = processProductData(restOfProductData);

    productData.imageUrl = imageUrl || null;
    productData.cloudinaryPublicId = cloudinaryPublicId || null; // SECURE CHANGE: Assign the product to the current user

    productData.userId = req.user._id; // SECURE CHANGE: Check for uniqueness based on productId AND userId

    const existingProduct = await Product.findOne({
      productId: productData.productId,
      userId: req.user._id,
    });
    if (existingProduct) {
      return res.status(409).json({
        error: "Product with this ID already exists for your account.",
      });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({ message: "Product added successfully!", product });
  } catch (error) {
    console.error("Add Product error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error during adding product." });
  }
};

// =========================================================================
// 2. Add Products (Bulk CSV Upload)
// Route: POST /api/products/bulk
// Access: Protected
// Description: Adds multiple products from a CSV file.
// =========================================================================
exports.addBulkProducts = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "No CSV file uploaded." });
    }

    const products = [];
    const errors = [];
    const readableStream = new Readable();
    readableStream.push(req.file.buffer);
    readableStream.push(null);

    readableStream
      .pipe(csv())
      .on("data", (row) => {
        const productData = {
          name: row["Product Name"],
          productId: row["Product ID"],
          category: row["Category"],
          price: row["Price"],
          quantity: row["Quantity"],
          unit: row["Unit"],
          expiryDate: row["Expiry Date"],
          thresholdValue: row["Threshold Value"],
        };
        // Assign userId to each product from the CSV
        productData.userId = req.user._id;

        try {
          // Validate expiry date before processing
          if (productData.expiryDate && productData.expiryDate.trim() !== "") {
            const expiryDate = new Date(productData.expiryDate);
            const currentDate = new Date();

            // Check if expiry date is valid
            if (isNaN(expiryDate.getTime())) {
              throw new Error(
                `Invalid expiry date format: ${productData.expiryDate}`
              );
            }

            // Check if expiry date is in the past
            if (expiryDate <= currentDate) {
              throw new Error(
                `Product expired on ${productData.expiryDate}. Cannot add expired products.`
              );
            }
          }

          const processedData = processProductData(productData);
          products.push(processedData);
        } catch (e) {
          errors.push({
            row: {
              productId: productData.productId,
              name: productData.name,
              expiryDate: productData.expiryDate,
            },
            error: e.message,
          });
        }
      })
      .on("end", async () => {
        if (products.length === 0 && errors.length === 0) {
          return res.status(400).json({ error: "Empty or invalid CSV file." });
        }

        try {
          const uniqueProducts = [];
          const productIds = new Set();
          for (const prod of products) {
            //  Check for existing products only for the current user
            const existing = await Product.findOne({
              productId: prod.productId,
              userId: req.user._id,
            });
            if (existing) {
              errors.push({
                row: {
                  productId: prod.productId,
                  name: prod.name,
                },
                error: `Product ID ${prod.productId} already exists for your account.`,
              });
            } else if (!productIds.has(prod.productId)) {
              uniqueProducts.push(prod);
              productIds.add(prod.productId);
            } else {
              errors.push({
                row: {
                  productId: prod.productId,
                  name: prod.name,
                },
                error: `Duplicate Product ID ${prod.productId} in CSV.`,
              });
            }
          }

          if (uniqueProducts.length === 0 && errors.length > 0) {
            return res.status(400).json({
              message: "No new products added due to errors.",
              errors,
            });
          }

          const result = await Product.insertMany(uniqueProducts, {
            ordered: false,
          });

          res.status(200).json({
            message: `${result.length} products added successfully.`,
            addedCount: result.length,
            errorsCount: errors.length,
            errors: errors,
          });
        } catch (bulkError) {
          console.error("Bulk Add Products error:", bulkError);
          const dbErrors = bulkError.writeErrors
            ? bulkError.writeErrors.map((err) => ({
                index: err.index,
                error: err.errmsg,
              }))
            : [];
          res.status(500).json({
            error: "Server error during bulk product upload.",
            details: dbErrors,
            processedErrors: errors,
          });
        }
      })
      .on("error", (err) => {
        console.error("CSV parsing error:", err);
        res.status(400).json({ error: "Error parsing CSV file." });
      });
  } catch (error) {
    console.error("Bulk Add Products initial error:", error);
    res.status(500).json({ error: "Server error during bulk product upload." });
  }
};

// =========================================================================
// 3. Get All Products (Paginated & Searchable)
// Route: GET /api/products
// Access: Protected
// Description: Retrieves a list of products with pagination and search/filter capabilities.
// =========================================================================
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    // SECURE CHANGE: Start the query with a filter for the current user
    let query = { userId: req.user._id };

    if (searchQuery) {
      // Text-based search fields
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { productId: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
        { supplier: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { unit: { $regex: searchQuery, $options: "i" } },
        { availabilityStatus: { $regex: searchQuery, $options: "i" } },
      ];

      // Numeric field searches
      const numSearch = parseFloat(searchQuery);
      if (!isNaN(numSearch)) {
        query.$or.push(
          { price: numSearch },
          { quantity: numSearch },
          { thresholdValue: numSearch }
        );
      }

      // Date field searches
      // Check if searchQuery looks like a date (YYYY-MM-DD format)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(searchQuery)) {
        const searchDate = new Date(searchQuery);
        if (!isNaN(searchDate.getTime())) {
          // Search for products with expiry date matching the searched date
          const nextDay = new Date(searchDate);
          nextDay.setDate(nextDay.getDate() + 1);

          query.$or.push({
            expiryDate: {
              $gte: searchDate,
              $lt: nextDay,
            },
          });
        }
      }

      // Alternative date searches - check for partial date matches
      // Search for year (YYYY format)
      const yearMatch = searchQuery.match(/^\d{4}$/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        const startOfYear = new Date(year, 0, 1);
        const startOfNextYear = new Date(year + 1, 0, 1);

        query.$or.push(
          {
            expiryDate: {
              $gte: startOfYear,
              $lt: startOfNextYear,
            },
          },
          {
            createdAt: {
              $gte: startOfYear,
              $lt: startOfNextYear,
            },
          },
          {
            updatedAt: {
              $gte: startOfYear,
              $lt: startOfNextYear,
            },
          }
        );
      }

      // Search for month-year (MM-YYYY or YYYY-MM format)
      const monthYearMatch =
        searchQuery.match(/^(\d{1,2})-(\d{4})$/) ||
        searchQuery.match(/^(\d{4})-(\d{1,2})$/);
      if (monthYearMatch) {
        let month, year;
        if (searchQuery.match(/^(\d{1,2})-(\d{4})$/)) {
          // MM-YYYY format
          month = parseInt(monthYearMatch[1]) - 1; // Month is 0-indexed
          year = parseInt(monthYearMatch[2]);
        } else {
          // YYYY-MM format
          year = parseInt(monthYearMatch[1]);
          month = parseInt(monthYearMatch[2]) - 1; // Month is 0-indexed
        }

        const startOfMonth = new Date(year, month, 1);
        const startOfNextMonth = new Date(year, month + 1, 1);

        query.$or.push(
          {
            expiryDate: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
          },
          {
            createdAt: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
          },
          {
            updatedAt: {
              $gte: startOfMonth,
              $lt: startOfNextMonth,
            },
          }
        );
      }
    }

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const productsWithStatus = products.map((product) => {
      const updatedProduct = product.toObject();
      updatedProduct.availabilityStatus = calculateAvailabilityStatus(
        updatedProduct.quantity,
        updatedProduct.thresholdValue,
        updatedProduct.expiryDate
      );
      return updatedProduct;
    });

    res.status(200).json({
      message: "Products retrieved successfully.",
      products: productsWithStatus,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      totalProducts,
      perPage: limit,
    });
  } catch (error) {
    console.error("Get All Products error:", error);
    res.status(500).json({ error: "Server error during retrieving products." });
  }
};

// =========================================================================
// 4. Get Product Metrics (FIXED)
// Route: GET /api/products/metrics
// Access: Protected
// Description: Retrieves key metrics for the Product page indicators.
// =========================================================================
exports.getProductMetrics = async (req, res) => {
  try {
    // Get distinct categories and count them properly
    const distinctCategories = await Product.distinct("category", {
      userId: req.user._id,
    });
    const totalCategories = distinctCategories.length;

    const totalProducts = await Product.countDocuments({
      userId: req.user._id,
    });

    // Use an aggregation pipeline to compare fields for low stock count
    const lowStockResult = await Product.aggregate([
      {
        $match: {
          userId: req.user._id,
          quantity: { $gt: 0 },
          availabilityStatus: { $ne: "Expired" },
        },
      },
      {
        $match: {
          $expr: { $lte: ["$quantity", "$thresholdValue"] },
        },
      },
      { $count: "lowStocks" },
    ]);
    const lowStockCount = lowStockResult[0]?.lowStocks || 0;

    const outOfStockCount = await Product.countDocuments({
      userId: req.user._id,
      quantity: 0,
    });

    // FIX: Use an aggregation pipeline to count expired products
    const expiredCountResult = await Product.aggregate([
      {
        $match: {
          userId: req.user._id,
          expiryDate: { $lt: new Date() },
        },
      },
      { $count: "expiredProducts" },
    ]);
    const expiredCount = expiredCountResult[0]?.expiredProducts || 0;

    const totalStockResult = await Product.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, totalStock: { $sum: "$quantity" } } },
    ]);
    const totalStock = totalStockResult[0]?.totalStock || 0;

    const totalCostResult = await Product.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
    ]);
    const totalCost = totalCostResult[0]?.totalCost || 0;

    const restockResult = await Product.aggregate([
      {
        $match: {
          userId: req.user._id,
          availabilityStatus: { $ne: "Expired" }, // ignore expired
          $expr: { $lte: ["$quantity", "$thresholdValue"] },
        },
      },
      {
        $project: {
          restockNeeded: {
            $cond: [
              { $lte: ["$quantity", "$thresholdValue"] },
              { $add: [{ $subtract: ["$thresholdValue", "$quantity"] }, 1] },
              0,
            ],
          },
          price: 1,
        },
      },
      {
        $project: {
          restockCost: { $multiply: ["$restockNeeded", "$price"] },
        },
      },
      {
        $group: {
          _id: null,
          totalRestockCost: { $sum: "$restockCost" },
        },
      },
    ]);

    const totalRestockCost =
      restockResult.length > 0 ? restockResult[0].totalRestockCost : 0;

    res.status(200).json({
      message: "Product metrics retrieved successfully.",
      categories: totalCategories,
      totalProducts,
      totalStock,
      totalCost,
      totalRestockCost,
      lowStocks: lowStockCount,
      notInStock: outOfStockCount,
      expiredProducts: expiredCount,
    });
  } catch (error) {
    console.error("Get Product Metrics error:", error);
    res
      .status(500)
      .json({ error: "Server error during retrieving product metrics." });
  }
};
// =========================================================================
// 5. Get Single Product by ID
// Route: GET /api/products/:id
// Access: Protected
// Description: Retrieves a single product by its database ID.
// =========================================================================
exports.getProductById = async (req, res) => {
  try {
    // SECURE CHANGE: Use findOne with both _id and userId
    const product = await Product.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found or you do not have permission to view it.",
      });
    }

    const updatedProduct = product.toObject();
    updatedProduct.availabilityStatus = calculateAvailabilityStatus(
      updatedProduct.quantity,
      updatedProduct.thresholdValue,
      updatedProduct.expiryDate
    );

    res.status(200).json({
      message: "Product retrieved successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Get Product by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format." });
    }
    res.status(500).json({ error: "Server error during retrieving product." });
  }
};

// =========================================================================
// 6. Update Product
// Route: PUT /api/products/:id
// Access: Protected
// Description: Updates an existing product's details.
// =========================================================================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl, cloudinaryPublicId, ...restOfUpdates } = req.body;

    const updatedData = processProductData(restOfUpdates);

    updatedData.imageUrl = imageUrl === undefined ? null : imageUrl;
    updatedData.cloudinaryPublicId =
      cloudinaryPublicId === undefined ? null : cloudinaryPublicId;

    // SECURE CHANGE: Find the old product by both _id and userId
    const oldProduct = await Product.findOne({ _id: id, userId: req.user._id });
    if (!oldProduct) {
      return res.status(404).json({
        error: "Product not found or you do not have permission to update it.",
      });
    }

    // SECURE CHANGE: Ensure productId is not changed
    if (
      updatedData.productId &&
      updatedData.productId !== oldProduct.productId
    ) {
      return res.status(400).json({ error: "Product ID cannot be changed." });
    }

    if (
      oldProduct.cloudinaryPublicId &&
      (cloudinaryPublicId === null ||
        (cloudinaryPublicId &&
          oldProduct.cloudinaryPublicId !== cloudinaryPublicId))
    ) {
      try {
        await cloudinary.uploader.destroy(oldProduct.cloudinaryPublicId);
        console.log(
          `Old image ${oldProduct.cloudinaryPublicId} deleted from Cloudinary.`
        );
      } catch (clError) {
        console.error(
          `Error deleting old image ${oldProduct.cloudinaryPublicId} from Cloudinary:`,
          clError
        );
      }
    } // SECURE CHANGE: Use findOneAndUpdate with _id and userId

    const product = await Product.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updatedData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        error: "Product not found or you do not have permission to update it.",
      });
    }

    res.status(200).json({ message: "Product updated successfully!", product });
  } catch (error) {
    console.error("Update Product error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format." });
    }
    res.status(500).json({ error: "Server error during updating product." });
  }
};

// =========================================================================
// 7. Delete Product
// Route: DELETE /api/products/:id
// Access: Protected
// Description: Deletes a product from the inventory and its associated image from Cloudinary.
// =========================================================================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params; // SECURE CHANGE: Use findOneAndDelete with _id and userId

    const product = await Product.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found or you do not have permission to delete it.",
      });
    }

    if (product.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(product.cloudinaryPublicId);
        console.log(
          `Image ${product.cloudinaryPublicId} deleted from Cloudinary.`
        );
      } catch (clError) {
        console.error(
          `Error deleting image ${product.cloudinaryPublicId} from Cloudinary:`,
          clError
        );
      }
    }

    res.status(200).json({ message: "Product deleted successfully!" });
  } catch (error) {
    console.error("Delete Product error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format." });
    }
    res.status(500).json({ error: "Server error during deleting product." });
  }
};

// =========================================================================
// 8. Order Product (Update Quantity & Create Invoice)
// Route: PUT /api/products/:id/order
// Access: Protected
// Description: Reduces product quantity and creates a new invoice for the order.
// =========================================================================
exports.orderProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderedQuantity } = req.body;

    if (
      !orderedQuantity ||
      typeof orderedQuantity !== "number" ||
      orderedQuantity <= 0
    ) {
      return res
        .status(400)
        .json({ error: "Please provide a valid quantity to order." });
    } // SECURE CHANGE: Find the product by both _id and userId

    const product = await Product.findOne({ _id: id, userId: req.user._id });

    if (!product) {
      return res.status(404).json({
        error: "Product not found or you do not have permission to order it.",
      });
    }

    if (product.quantity < orderedQuantity) {
      return res.status(400).json({
        error: `Not enough stock. Only ${product.quantity} available.`,
      });
    }
    if (product.availabilityStatus === "Expired") {
      return res
        .status(400)
        .json({ error: "Cannot order an expired product." });
    } // Update product quantity

    product.quantity -= orderedQuantity; // Recalculate status immediately
    product.availabilityStatus = calculateAvailabilityStatus(
      product.quantity,
      product.thresholdValue,
      product.expiryDate
    );

    const invoiceData = {
      products: [
        {
          productId: product.productId,
          name: product.name,
          quantity: orderedQuantity,
          price: product.price,
        },
      ],
      userId: req.user._id,
    };

    const newInvoice = await invoiceController.createInvoiceInternal(
      invoiceData
    );

    await product.save();

    res.status(200).json({
      message: "Product ordered and invoice generated successfully!",
      product,
      invoice: newInvoice,
    });
  } catch (error) {
    console.error("Order Product error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid product ID format." });
    }
    res.status(500).json({ error: "Server error during ordering product." });
  }
};
