const mongoose = require("mongoose");
const availabilityStatusEnum = [
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Expired",
];

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      trim: true,
    },
    thresholdValue: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      default: null,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    supplier: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    availabilityStatus: {
      type: String,
      enum: availabilityStatusEnum,
      default: "Out of Stock",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
