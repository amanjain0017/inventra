// models/invoiceSchema.js
const mongoose = require("mongoose");

const invoiceStatusEnum = ["Unpaid", "Paid", "Overdue", "Cancelled"];

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    referenceNumber: {
      type: String,
      sparse: true,
      trim: true,
    },
    products: [
      {
        productId: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        totalProductPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000),
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    status: {
      type: String,
      enum: invoiceStatusEnum,
      default: "Unpaid",
      required: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    subTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate derived fields and update status
invoiceSchema.pre("save", async function (next) {
  let subTotal = 0;
  this.products.forEach((item) => {
    item.totalProductPrice = item.quantity * item.price;
    subTotal += item.totalProductPrice;
  });
  this.subTotal = subTotal;

  // Calculate tax amount as 10% of subtotal
  this.taxAmount = this.subTotal * 0.1;

  this.totalAmount =
    this.subTotal + this.taxAmount - (this.discountAmount || 0);

  // ⚡ If status is Paid but paidAmount is not set, force it = totalAmount
  if (
    this.isModified("status") &&
    this.status === "Paid" &&
    (!this.paidAmount || this.paidAmount <= 0)
  ) {
    this.paidAmount = this.totalAmount;
  }

  this.balanceDue = this.totalAmount - (this.paidAmount || 0);

  // Handle reference number generation/removal based on status
  const wasStatusModified = this.isModified("status");
  const previousStatus = this.isModified("status")
    ? this.$__.original?.status
    : this.status;

  if (wasStatusModified && this.status === "Paid" && !this.referenceNumber) {
    this.referenceNumber = await mongoose
      .model("Invoice")
      .generateReferenceNumber();
  }

  if (wasStatusModified && this.status !== "Paid" && this.referenceNumber) {
    this.referenceNumber = null;
  }

  // Auto-update status based on balance and due date
  if (
    this.isModified("balanceDue") ||
    this.isModified("dueDate") ||
    this.isNew
  ) {
    if (this.balanceDue <= 0) {
      this.status = "Paid";
      if (!this.referenceNumber) {
        this.referenceNumber = await mongoose
          .model("Invoice")
          .generateReferenceNumber();
      }
    } else if (this.balanceDue > 0 && this.dueDate < new Date()) {
      this.status = "Overdue";
      this.referenceNumber = null;
    } else if (this.status !== "Cancelled") {
      this.status = "Unpaid";
      this.referenceNumber = null;
    }
  }

  if (wasStatusModified && this.status === "Cancelled") {
    this.referenceNumber = null;
  } else if (
    wasStatusModified &&
    this.status !== "Cancelled" &&
    this.status !== "Paid"
  ) {
    this.referenceNumber = null;
  }

  next();
});

// Method to generate a unique Invoice ID (e.g., INV-001)
invoiceSchema.statics.generateInvoiceId = async function () {
  const prefix = `INV-`;

  const lastInvoice = await this.findOne(
    { invoiceId: { $regex: `^${prefix}` } },
    {},
    { sort: { invoiceId: -1 } }
  );

  let counter = 1;
  if (lastInvoice) {
    const lastCounter = parseInt(lastInvoice.invoiceId.split("-").pop());
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1;
    }
  }
  const newCounter = counter.toString().padStart(4, "0");
  return `${prefix}${newCounter}`;
};

// Method to generate a unique Reference Number (e.g., REF-0001)
invoiceSchema.statics.generateReferenceNumber = async function () {
  const prefix = `REF-`;
  const lastInvoice = await this.findOne(
    { referenceNumber: { $exists: true, $ne: null } },
    {},
    { sort: { referenceNumber: -1 } }
  );
  let counter = 1;
  if (lastInvoice && lastInvoice.referenceNumber) {
    const lastCounter = parseInt(lastInvoice.referenceNumber.split("-").pop());
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1;
    }
  }
  const newCounter = counter.toString().padStart(3, "0");
  return `${prefix}${newCounter}`;
};

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
