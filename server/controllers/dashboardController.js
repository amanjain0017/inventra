const Product = require("../models/productSchema");
const Invoice = require("../models/invoiceSchema");

// 1. Get Top Selling Products
// Route: GET /api/dashboard/top-selling-products
// Access: Protected
// Description: Lists products sold the most, including full product information.
exports.getTopSellingProducts = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 5;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const topProducts = await Invoice.aggregate([
      {
        $match: {
          userId: userId,
          invoiceDate: { $gte: startDate },
          status: { $in: ["Paid", "Unpaid", "Overdue"] },
        },
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalQuantitySold: { $sum: "$products.quantity" },
          totalRevenue: { $sum: "$products.totalProductPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products", // The collection name in MongoDB (typically lowercase, plural)
          localField: "_id",
          foreignField: "productId",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" }, // Deconstruct the array created by $lookup
      {
        $project: {
          _id: 0,
          totalQuantitySold: 1,
          totalRevenue: 1,
          product: "$productDetails", // Promote the full product details to the top level
        },
      },
    ]);

    // Calculate summary metrics for top selling products
    const topProductsCount = topProducts.length;
    const totalRevenueFromTopProducts = topProducts.reduce(
      (sum, product) => sum + (product.totalRevenue || 0),
      0
    );
    const totalQuantityFromTopProducts = topProducts.reduce(
      (sum, product) => sum + (product.totalQuantitySold || 0),
      0
    );

    res.status(200).json({
      message: `Top ${limit} selling products from last ${days} days retrieved successfully.`,
      topProducts,
      summary: {
        count: topProductsCount,
        totalRevenue: totalRevenueFromTopProducts,
        totalQuantitySold: totalQuantityFromTopProducts,
        averageRevenuePerProduct:
          topProductsCount > 0
            ? totalRevenueFromTopProducts / topProductsCount
            : 0,
        period: `${days} days`,
        requestedLimit: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching top selling products:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching top selling products." });
  }
};

// 2. Get Sales Data Over Time (Updated to include Purchase Data)
// Route: GET /api/dashboard/sales-over-time
// Access: Protected
// Description: Provides aggregated sales and purchase data for charts (e.g., daily, weekly, yearly trends).
exports.getSalesOverTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const period = req.query.period || "daily"; // 'daily', 'weekly', 'yearly'
    const numPeriods = parseInt(req.query.numPeriods) || 30; // e.g., last 30 days, last 12 weeks, last 12 months

    let groupFormat;
    let sortByField;
    let startDate;

    switch (period) {
      case "weekly":
        // Group by week (year and week number)
        groupFormat = {
          year: { $year: "$invoiceDate" },
          week: { $week: "$invoiceDate" },
        };
        sortByField = { "_id.year": 1, "_id.week": 1 };
        startDate = new Date();
        startDate.setDate(startDate.getDate() - numPeriods * 7); // weeks * 7 days
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        groupFormat = { year: { $year: "$invoiceDate" } };
        sortByField = { "_id.year": 1 };
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - numPeriods);
        startDate.setMonth(0, 1); // Start from Jan 1
        break;
      case "daily":
      default:
        groupFormat = {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" },
          day: { $dayOfMonth: "$invoiceDate" },
        };
        sortByField = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
        startDate = new Date();
        startDate.setDate(startDate.getDate() - numPeriods);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Get sales data from invoices
    const salesData = await Invoice.aggregate([
      {
        $match: {
          userId: userId,
          invoiceDate: { $gte: startDate },
          status: { $in: ["Paid", "Unpaid", "Overdue"] },
        },
      },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: "$totalAmount" },
          totalInvoices: { $sum: 1 },
        },
      },
      { $sort: sortByField },
    ]);

    // Get purchase data (total cost of products created/updated in the time period)
    const purchaseData = await Product.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate }, // Use createdAt for when products were added/purchased
        },
      },
      {
        $group: {
          _id:
            period === "weekly"
              ? {
                  year: { $year: "$createdAt" },
                  week: { $week: "$createdAt" },
                }
              : period === "yearly"
              ? { year: { $year: "$createdAt" } }
              : {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                  day: { $dayOfMonth: "$createdAt" },
                },
          totalPurchases: { $sum: { $multiply: ["$price", "$quantity"] } }, // Cost of inventory
          totalProducts: { $sum: 1 },
          totalQuantityPurchased: { $sum: "$quantity" },
        },
      },
      { $sort: sortByField },
    ]);

    // Combine sales and purchase data
    const combinedData = [];
    const salesMap = new Map();
    const purchaseMap = new Map();

    // Create maps for easy lookup
    salesData.forEach((item) => {
      const key = JSON.stringify(item._id);
      salesMap.set(key, item);
    });

    purchaseData.forEach((item) => {
      const key = JSON.stringify(item._id);
      purchaseMap.set(key, item);
    });

    // Get all unique periods from both datasets
    const allPeriods = new Set([
      ...salesData.map((item) => JSON.stringify(item._id)),
      ...purchaseData.map((item) => JSON.stringify(item._id)),
    ]);

    // Create combined dataset
    allPeriods.forEach((periodKey) => {
      const period = JSON.parse(periodKey);
      const salesItem = salesMap.get(periodKey);
      const purchaseItem = purchaseMap.get(periodKey);

      // Format period label based on type
      let periodLabel;
      if (period.day) {
        periodLabel = `${period.year}-${String(period.month).padStart(
          2,
          "0"
        )}-${String(period.day).padStart(2, "0")}`;
      } else if (period.week) {
        periodLabel = `${period.year}-W${String(period.week).padStart(2, "0")}`;
      } else {
        periodLabel = `${period.year}`;
      }

      combinedData.push({
        period: period,
        periodLabel: periodLabel,
        totalSales: salesItem?.totalSales || 0,
        totalInvoices: salesItem?.totalInvoices || 0,
        totalPurchases: purchaseItem?.totalPurchases || 0,
        totalProducts: purchaseItem?.totalProducts || 0,
        totalQuantityPurchased: purchaseItem?.totalQuantityPurchased || 0,
      });
    });

    // Sort the combined data
    combinedData.sort((a, b) => {
      if (a.period.year !== b.period.year) return a.period.year - b.period.year;
      if (a.period.week && b.period.week) return a.period.week - b.period.week;
      if (a.period.month && b.period.month)
        return a.period.month - b.period.month;
      if (a.period.day && b.period.day) return a.period.day - b.period.day;
      return 0;
    });

    // Calculate summary metrics
    const summary = {
      totalSales: combinedData.reduce((sum, item) => sum + item.totalSales, 0),
      totalPurchases: combinedData.reduce(
        (sum, item) => sum + item.totalPurchases,
        0
      ),
      totalInvoices: combinedData.reduce(
        (sum, item) => sum + item.totalInvoices,
        0
      ),
      totalProductsPurchased: combinedData.reduce(
        (sum, item) => sum + item.totalProducts,
        0
      ),
      period: period,
      numPeriods: numPeriods,
      dataPoints: combinedData.length,
    };

    res.status(200).json({
      message: `Sales and purchase data for last ${numPeriods} ${period}s retrieved successfully.`,
      salesData: combinedData,
      summary: summary,
    });
  } catch (error) {
    console.error("Error fetching sales data over time:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching sales data over time." });
  }
};
