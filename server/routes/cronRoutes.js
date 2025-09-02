const express = require("express");
const router = express.Router();
const {
  updateProductExpiry,
  updateInvoiceOverdue,
} = require("../controllers/cronController");

// Use a secret token for security
const SECRET = process.env.CRON_SECRET;

// Endpoint for product expiry
router.post("/product-expiry", async (req, res) => {
  if (req.body.secret !== SECRET) return res.status(403).send("Forbidden");
  await updateProductExpiry();
  res.send("Product expiry job executed.");
});

// Endpoint for invoice overdue
router.post("/invoice-overdue", async (req, res) => {
  if (req.body.secret !== SECRET) return res.status(403).send("Forbidden");
  await updateInvoiceOverdue();
  res.send("Invoice overdue job executed.");
});

module.exports = router;
