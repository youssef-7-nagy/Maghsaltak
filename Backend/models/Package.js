const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    stock: {
      type: String,
      default: "Unlimited",
      trim: true,
    },
    category: {
      type: String,
      default: "wash",
      trim: true,
    },
    images: {
      type: [String], // Array of image paths or URLs natively handled
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "packages",
  }
);

packageSchema.index({ order: 1, createdAt: -1 });
packageSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("Package", packageSchema);
