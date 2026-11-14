const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["chemicals", "towels", "equipment", "other"],
    default: "chemicals",
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
  },
  threshold: {
    type: Number,
    required: true,
    default: 10,
  },
  unit: {
    type: String,
    required: true,
    default: "units",
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model("Inventory", inventorySchema);
