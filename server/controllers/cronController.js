const Product = require("../models/productSchema");
const Invoice = require("../models/invoiceSchema");

const updateProductExpiry = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await Product.updateMany(
    { expiryDate: { $lt: today }, availabilityStatus: { $ne: "Expired" } },
    { $set: { availabilityStatus: "Expired" } }
  );
  console.log(`[Cron] Products updated: ${result.modifiedCount}`);
};

const updateInvoiceOverdue = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await Invoice.updateMany(
    { dueDate: { $lt: today }, balanceDue: { $gt: 0 }, status: "Pending" },
    { $set: { status: "Overdue" } }
  );
  console.log(`[Cron] Invoices updated: ${result.modifiedCount}`);
};

module.exports = { updateProductExpiry, updateInvoiceOverdue };
