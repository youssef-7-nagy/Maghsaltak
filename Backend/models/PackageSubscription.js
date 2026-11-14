const mongoose = require("mongoose");

const subscriptionItemSchema = new mongoose.Schema(
  {
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, default: 0, min: 0 },
    specialInstructions: { type: String, trim: true },
  },
  { _id: true }
);

const subscriptionDetailsSchema = new mongoose.Schema(
  {
    isSubscription: { type: Boolean, default: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package" },
    packageTitle: { type: String, trim: true },
    billingCycle: { type: String, default: "monthly", trim: true },
    durationMonths: { type: Number, default: 1, min: 1 },
    washesPerMonth: { type: Number, default: 4, min: 1 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

const packageSubscriptionSchema = new mongoose.Schema(
  {
    legacyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, default: "", trim: true },
    userPhone: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    items: { type: [subscriptionItemSchema], default: [] },
    subscriptionDetails: { type: subscriptionDetailsSchema, default: () => ({}) },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "cash", trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    washesUsed: { type: Number, default: 0, min: 0 },
    washLogs: [
      {
        date: { type: Date, required: true },
        completedAt: { type: Date, default: Date.now }
      }
    ],
    subscriptionStatus: {
      type: String,
      enum: ["pending_activation", "active", "expired", "cancelled"],
      default: "pending_activation",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "package_subscriptions",
  }
);

packageSubscriptionSchema.index({ legacyOrderId: 1 }, { unique: true, sparse: true });
packageSubscriptionSchema.index({ user: 1, createdAt: -1 });
packageSubscriptionSchema.index({ status: 1, createdAt: -1 });
packageSubscriptionSchema.index({ subscriptionStatus: 1, createdAt: -1 });
packageSubscriptionSchema.index({ "subscriptionDetails.packageId": 1, createdAt: -1 });

module.exports = mongoose.model("PackageSubscription", packageSubscriptionSchema);
