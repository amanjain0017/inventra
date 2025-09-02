const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/auth");

// All dashboard routes will be protected by authentication
router.use(authMiddleware);

// Routes for Dashboard Metrics
router.get("/top-selling-products", dashboardController.getTopSellingProducts);
router.get("/sales-over-time", dashboardController.getSalesOverTime);

module.exports = router;
