const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");

// Multer configuration for in-memory storage for CSV files
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB
  },
});

// All product routes will be protected
router.use(authMiddleware);

// Routes for Products
router.post("/", productController.addProduct); // Add individual product
router.post("/bulk", upload.single("file"), productController.addBulkProducts); // Add multiple products via CSV
router.get("/", productController.getAllProducts); // Get all products with pagination and search
router.get("/metrics", productController.getProductMetrics); // Get product page metrics
router.get("/:id", productController.getProductById); // Get single product by ID
router.put("/:id", productController.updateProduct); // Update product
router.delete("/:id", productController.deleteProduct); // Delete product
router.put("/:id/order", productController.orderProduct); // Order product (reduce quantity & create invoice)

module.exports = router;
