const mongoose = require("mongoose");

const washPackageSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
    duration: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const vehicleSchema = new mongoose.Schema(
  {
    car: { type: mongoose.Schema.Types.ObjectId, ref: "Car" },
    type: { type: String, trim: true },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const paymentDetailsSchema = new mongoose.Schema(
  {
    cardName: { type: String, trim: true },
    cardNumberLast4: { type: String, trim: true },
    encryptedCardNumber: { type: String },
    expiryDate: { type: String, trim: true },
  },
  { _id: false }
);

const workerLocationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, enum: ['user', 'serviceProvider', 'admin'], required: true },
    text:       { type: String, required: true, trim: true, maxlength: 1000 },
    sentAt:     { type: Date, default: Date.now },
  },
  { _id: true }
);

const WORKER_STATUSES = ["unassigned", "accepted", "on_the_way", "arrived", "washing", "finished"];

const bookWashSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, default: "", trim: true },
    userPhone: { type: String, required: true, trim: true },
    vehicle: { type: vehicleSchema, default: () => ({}) },
    washPackage: { type: washPackageSchema, required: true },
    location: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    time: { type: String, required: true, trim: true },
    paymentMethod: { type: String, enum: ["cash", "visa"], default: "cash" },
    paymentDetails: { type: paymentDetailsSchema, default: undefined },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    notes: { type: String, trim: true },

    // ── Service Provider Assignment ──────────────────────────────────
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedAt: { type: Date, default: null },

    // ── Worker Real-time Status ──────────────────────────────────────
    workerStatus: {
      type: String,
      enum: WORKER_STATUSES,
      default: "unassigned",
      index: true,
    },
    estimatedArrival: { type: String, default: null },
    workerLocation: { type: workerLocationSchema, default: null },

    // ── Workflow Timestamps ──────────────────────────────────────────
    acceptedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },

    // ── Before / After Images ────────────────────────────────────────
    beforeImages: [{ type: String }],
    afterImages: [{ type: String }],

    // ── Review & Rating ──────────────────────────────────────────────
    rating: { type: Number, min: 1, max: 5, default: null },
    reviewText: { type: String, trim: true, default: null },

    // ── In-App Chat Messages ─────────────────────────────────────────
    messages: { type: [chatMessageSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "book_washes",
  }
);

bookWashSchema.index({ user: 1, date: 1, time: 1 });
bookWashSchema.index({ status: 1, createdAt: -1 });
bookWashSchema.index({ date: 1, time: 1, status: 1 });
bookWashSchema.index({ "washPackage.name": 1, createdAt: -1 });
bookWashSchema.index({ assignedTo: 1, workerStatus: 1 });

module.exports = mongoose.model("BookWash", bookWashSchema);
