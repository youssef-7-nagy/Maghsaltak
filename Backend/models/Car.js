const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["SUV", "Sedan", "Hatchback"], required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    plateNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
    collection: "cars",
  }
);

carSchema.index({ user: 1, plateNumber: 1 });
carSchema.index({ user: 1, createdAt: -1 });

const Car = mongoose.model("Car", carSchema);

module.exports = { Car };
