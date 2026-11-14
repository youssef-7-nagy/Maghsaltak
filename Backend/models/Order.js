const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
  title: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  specialInstructions: String,
});

const subscriptionDetailsSchema = new mongoose.Schema(
  {
    isSubscription: { type: Boolean, default: false },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    packageTitle: { type: String },
    billingCycle: { type: String, default: "monthly" },
    durationMonths: { type: Number, default: 1 },
    washesPerMonth: { type: Number, default: 4 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, default: "" },
    userPhone: { type: String, required: true },
    address: { type: String },
    items: [orderItemSchema],
    subscriptionDetails: { type: subscriptionDetailsSchema, default: () => ({}) },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "cash" },
    status: {
      type: String,
      enum: ["pending", "delivered", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
