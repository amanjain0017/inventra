const Invoice = require("../models/invoiceSchema");
const Product = require("../models/productSchema");
const productController = require("./productController");

const invoiceStatusEnum = ["Unpaid", "Paid", "Overdue", "Cancelled"];

// =========================================================================
// Helper: createInvoiceInternal - Used by other controllers (e.g., Product)
// Access: Internal (not a direct API route)
// Description: Creates an invoice document in the database.
// =========================================================================
exports.createInvoiceInternal = async (invoiceData) => {
  try {
    // Generate unique Invoice ID
    const generatedInvoiceId = await Invoice.generateInvoiceId();

    // Prepare the new invoice object
    const newInvoice = new Invoice({
      ...invoiceData,
      invoiceId: generatedInvoiceId,

      products: invoiceData.products.map((p) => ({
        productId: p.productId,
        name: p.name,
        quantity: p.quantity,
        price: p.price,
        totalProductPrice: p.quantity * p.price,
      })),
      userId: invoiceData.userId,
      status: "Unpaid",
    });

    await newInvoice.save();
    return newInvoice;
  } catch (error) {
    console.error("Internal Invoice Creation error:", error);
    throw new Error("Failed to create invoice internally: " + error.message);
  }
};

// =========================================================================
// 1. Create Invoice (API Endpoint)
// Route: POST /api/invoices
// Access: Protected
// Description: Creates a new invoice. Can be used for manual invoice creation.
// =========================================================================
exports.createInvoice = async (req, res) => {
  try {
    const {
      products,
      customerName,
      customerEmail,
      dueDate,
      discountAmount, // Removed taxAmount from input as it's auto-calculated
      paymentMethod,
      notes,
    } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res
        .status(400)
        .json({ error: "Invoice must contain at least one product." });
    }

    const invoiceProducts = [];
    for (const item of products) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          error:
            "Each product in invoice must have a valid productId and quantity.",
        });
      }
      const productDetail = await Product.findOne({
        productId: item.productId,
      });
      if (!productDetail) {
        return res
          .status(404)
          .json({ error: `Product with ID ${item.productId} not found.` });
      }
      if (productDetail.quantity < item.quantity) {
        return res.status(400).json({
          error: `Not enough stock for ${productDetail.name}. Only ${productDetail.quantity} available.`,
        });
      }
      if (productDetail.availabilityStatus === "Expired") {
        return res.status(400).json({
          error: `Cannot invoice expired product: ${productDetail.name}`,
        });
      }

      // Deduct quantity from product inventory
      productDetail.quantity -= item.quantity;
      // Recalculate product status using helper from productController
      productDetail.availabilityStatus =
        productController.calculateAvailabilityStatus(
          productDetail.quantity,
          productDetail.thresholdValue,
          productDetail.expiryDate
        );
      await productDetail.save();

      invoiceProducts.push({
        productId: productDetail.productId,
        name: productDetail.name,
        quantity: item.quantity,
        price: productDetail.price,
        totalProductPrice: item.quantity * productDetail.price,
      });
    }

    // Prepare data for internal creation function
    const invoiceData = {
      products: invoiceProducts,
      customerName,
      customerEmail,
      dueDate,
      discountAmount, // Tax amount will be auto-calculated in pre-save hook
      paymentMethod,
      notes,
      userId: req.user._id,
    };

    const newInvoice = await exports.createInvoiceInternal(invoiceData);

    res
      .status(201)
      .json({ message: "Invoice created successfully!", invoice: newInvoice });
  } catch (error) {
    console.error("Create Invoice API error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Server error during invoice creation." });
  }
};

// =========================================================================
// 2. Get All Invoices (Paginated & Searchable)
// Route: GET /api/invoices
// Access: Protected
// Description: Retrieves a list of invoices with pagination and search/filter.
// =========================================================================
exports.getAllInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";
    const statusFilter = req.query.status;

    let query = { userId: req.user._id };

    if (searchQuery) {
      query.$or = [
        { invoiceId: { $regex: searchQuery, $options: "i" } },
        { referenceNumber: { $regex: searchQuery, $options: "i" } },
        { customerName: { $regex: searchQuery, $options: "i" } },
        { customerEmail: { $regex: searchQuery, $options: "i" } },
        { "products.name": { $regex: searchQuery, $options: "i" } },
        { status: { $regex: searchQuery, $options: "i" } },
      ];
      const numSearch = parseFloat(searchQuery);
      if (!isNaN(numSearch)) {
        query.$or.push({ totalAmount: numSearch });
      }
    }

    if (statusFilter && invoiceStatusEnum.includes(statusFilter)) {
      query.status = statusFilter;
    }

    const totalInvoices = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("userId", "firstName lastName email")
      .skip(skip)
      .limit(limit)
      .sort({ invoiceDate: -1 });

    res.status(200).json({
      message: "Invoices retrieved successfully.",
      invoices,
      currentPage: page,
      totalPages: Math.ceil(totalInvoices / limit),
      totalInvoices,
      perPage: limit,
    });
  } catch (error) {
    console.error("Get All Invoices error:", error);
    res.status(500).json({ error: "Server error during retrieving invoices." });
  }
};

// =========================================================================
// 3. Get Single Invoice by ID
// Route: GET /api/invoices/:id
// Access: Protected
// Description: Retrieves a single invoice by its database ID.
// =========================================================================
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        error: "Invoice not found or you do not have permission to view it.",
      });
    }

    res
      .status(200)
      .json({ message: "Invoice retrieved successfully.", invoice });
  } catch (error) {
    console.error("Get Invoice by ID error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    res.status(500).json({ error: "Server error during retrieving invoice." });
  }
};

// =========================================================================
// 4. Update Invoice (e.g., Record Payment, Change Status)
// Route: PUT /api/invoices/:id
// Access: Protected
// Description: Updates an existing invoice's details, including recording payments.
// =========================================================================
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const invoice = await Invoice.findOne({ _id: id, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({
        error: "Invoice not found or you do not have permission to update it.",
      });
    }

    // Prevent updating certain fields through this route
    if (updates.invoiceId) delete updates.invoiceId;
    if (updates.referenceNumber) delete updates.referenceNumber;
    if (updates.taxAmount) delete updates.taxAmount; // Prevent manual tax amount setting

    // Define allowed fields that can be updated
    const allowedFields = [
      "status",
      "customerName",
      "customerEmail",
      "dueDate",
      "discountAmount",
      "paymentMethod",
      "notes",
      "paidAmount",
    ];

    // Apply updates only for allowed fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && allowedFields.includes(key)) {
        invoice[key] = updates[key];
      }
    });

    // Save will trigger the pre-save hook for status/balance recalculation and reference number handling
    await invoice.save();

    res.status(200).json({ message: "Invoice updated successfully!", invoice });
  } catch (error) {
    console.error("Update Invoice error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    res.status(500).json({ error: "Server error during updating invoice." });
  }
};

// =========================================================================
// 5. Delete Invoice
// Route: DELETE /api/invoices/:id
// Access: Protected
// Description: Deletes an invoice.
// =========================================================================
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({
        error: "Invoice not found or you do not have permission to delete it.",
      });
    }

    // TODO: Consider adding back product quantities if an invoice is deleted and it was not a "cancelled" invoice.
    // This is a complex decision: if a product was ordered and quantity reduced, deleting the invoice
    // might imply the order was cancelled and quantity should be restored.
    // For current scope, we are doing a hard delete without restocking.

    res.status(200).json({ message: "Invoice deleted successfully!" });
  } catch (error) {
    console.error("Delete Invoice error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid invoice ID format." });
    }
    res.status(500).json({ error: "Server error during deleting invoice." });
  }
};

// =========================================================================
// 6. Get Invoice Metrics
// Route: GET /api/invoices/metrics
// Access: Protected
// Description: Retrieves key metrics for the Invoice page (e.g., total sales, pending amounts).
// =========================================================================
exports.getInvoiceMetrics = async (req, res) => {
  try {
    // Only count metrics for the logged-in user
    const totalInvoices = await Invoice.countDocuments({
      userId: req.user._id,
    });
    const unpaidInvoices = await Invoice.countDocuments({
      userId: req.user._id,
      status: "Unpaid",
    });
    const paidInvoices = await Invoice.countDocuments({
      userId: req.user._id,
      status: "Paid",
    });
    const overdueInvoices = await Invoice.countDocuments({
      userId: req.user._id,
      status: "Overdue",
    });
    const cancelledInvoices = await Invoice.countDocuments({
      userId: req.user._id,
      status: "Cancelled",
    });

    // Total Subtotal (before tax/discounts)
    const totalSubTotalResult = await Invoice.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: { $in: ["Paid", "Unpaid", "Overdue"] }, // ignore Cancelled
        },
      },
      { $group: { _id: null, totalSubTotal: { $sum: "$subTotal" } } },
    ]);
    const totalSubTotal =
      totalSubTotalResult.length > 0 ? totalSubTotalResult[0].totalSubTotal : 0;

    // Total sales (all active invoices, regardless of paid/unpaid/overdue)
    const totalSalesAmountResult = await Invoice.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: { $in: ["Paid", "Unpaid", "Overdue"] },
        },
      },
      { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } },
    ]);
    const totalSalesAmount =
      totalSalesAmountResult.length > 0
        ? totalSalesAmountResult[0].totalAmount
        : 0;

    // Total unpaid
    const totalUnpaidAmountResult = await Invoice.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: { $in: ["Unpaid", "Overdue"] },
        },
      },
      { $group: { _id: null, totalBalanceDue: { $sum: "$balanceDue" } } },
    ]);
    const totalUnpaidAmount =
      totalUnpaidAmountResult.length > 0
        ? totalUnpaidAmountResult[0].totalBalanceDue
        : 0;

    //  Total paid
    const totalPaidAmountResult = await Invoice.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: "Paid",
        },
      },
      { $group: { _id: null, totalPaid: { $sum: "$paidAmount" } } },
    ]);
    const totalPaidAmount =
      totalPaidAmountResult.length > 0 ? totalPaidAmountResult[0].totalPaid : 0;

    //  Total products sold (sum of all quantities from products array in invoices)
    const totalProductsSoldResult = await Invoice.aggregate([
      {
        $match: {
          userId: req.user._id,
          status: { $in: ["Paid", "Unpaid", "Overdue"] }, // ignore Cancelled
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
    ]);
    const totalProductsSold =
      totalProductsSoldResult.length > 0
        ? totalProductsSoldResult[0].totalQuantity
        : 0;

    res.status(200).json({
      message: "Invoice metrics retrieved successfully.",
      totalInvoices,
      unpaidInvoices,
      paidInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalSubTotal,
      totalSalesAmount,
      totalUnpaidAmount,
      totalPaidAmount,
      totalProductsSold,
    });
  } catch (error) {
    console.error("Get Invoice Metrics error:", error);
    res
      .status(500)
      .json({ error: "Server error during retrieving invoice metrics." });
  }
};
