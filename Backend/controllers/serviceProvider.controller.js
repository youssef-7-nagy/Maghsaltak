const mongoose = require("mongoose");
const path = require("path");
const BookWash = require("../models/BookWash");
const { User } = require("../models/User");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";


exports.getMyAssignedBookings = async (req, res) => {
  try {
    const spId = req.user?.id;
    if (!spId || !mongoose.Types.ObjectId.isValid(spId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }

    const bookings = await BookWash.find({ assignedTo: spId })
      .sort({ date: 1, time: 1 })
      .populate("user", "name email phone profilePhoto")
      .populate("vehicle.car", "year brand model plateNumber type color");

    return res.status(200).json({ status: "success", data: bookings });
  } catch (error) {
    console.error("getMyAssignedBookings error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch assigned bookings" });
  }
};


exports.getAssignedBookingById = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    const booking = await BookWash.findOne({ _id: id, assignedTo: spId })
      .populate("user", "name email phone profilePhoto")
      .populate("vehicle.car", "year brand model plateNumber type color");

    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not assigned to you" });
    }

    return res.status(200).json({ status: "success", data: booking });
  } catch (error) {
    console.error("getAssignedBookingById error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch booking" });
  }
};

// ── PUT /service-provider/bookings/:id/accept ───────────────────────────────
// Service provider accepts the assignment
exports.acceptBooking = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    const booking = await BookWash.findOne({ _id: id, assignedTo: spId });
    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not assigned to you" });
    }

    if (booking.workerStatus !== "unassigned") {
      return res.status(400).json({ status: "fail", message: "Booking already accepted" });
    }

    booking.workerStatus = "accepted";
    booking.acceptedAt = new Date();
    await booking.save();

    // Emit socket event if io is available
    const io = req.app.get("io");
    if (io) {
      io.to(`booking_${id}`).emit("worker_status_update", {
        bookingId: id,
        workerStatus: "accepted",
        acceptedAt: booking.acceptedAt,
      });
    }

    return res.status(200).json({ status: "success", data: booking });
  } catch (error) {
    console.error("acceptBooking error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to accept booking" });
  }
};

// ── PUT /service-provider/bookings/:id/status ───────────────────────────────
// Update worker real-time status
const VALID_WORKER_STATUSES = ["on_the_way", "arrived", "washing", "finished"];

exports.updateWorkerStatus = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { id } = req.params;
    const { workerStatus, estimatedArrival } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    if (!VALID_WORKER_STATUSES.includes(workerStatus)) {
      return res.status(400).json({
        status: "fail",
        message: `Invalid worker status. Valid values: ${VALID_WORKER_STATUSES.join(", ")}`,
      });
    }

    const booking = await BookWash.findOne({ _id: id, assignedTo: spId });
    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not assigned to you" });
    }

    const updates = { workerStatus };
    if (estimatedArrival) updates.estimatedArrival = String(estimatedArrival).trim();

    if (workerStatus === "washing") {
      updates.startedAt = new Date();
      // Also update the main booking status
      updates.status = "accepted";
    }

    if (workerStatus === "finished") {
      updates.finishedAt = new Date();
      updates.status = "completed";
    }

    const updated = await BookWash.findByIdAndUpdate(id, updates, { new: true })
      .populate("user", "name email phone profilePhoto")
      .populate("vehicle.car", "year brand model plateNumber type color");

    // Broadcast to room via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`booking_${id}`).emit("worker_status_update", {
        bookingId: id,
        workerStatus,
        estimatedArrival: estimatedArrival || null,
        startedAt: updated.startedAt,
        finishedAt: updated.finishedAt,
        status: updated.status,
      });
    }

    return res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    console.error("updateWorkerStatus error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to update worker status" });
  }
};

// ── PUT /service-provider/bookings/:id/location ─────────────────────────────
// Update GPS location of worker (called frequently from SP app)
exports.updateWorkerLocation = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ status: "fail", message: "lat and lng must be numbers" });
    }

    const booking = await BookWash.findOneAndUpdate(
      { _id: id, assignedTo: spId },
      { workerLocation: { lat, lng, updatedAt: new Date() } },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not assigned to you" });
    }

    // Broadcast GPS to booking room
    const io = req.app.get("io");
    if (io) {
      io.to(`booking_${id}`).emit("worker_location_update", {
        bookingId: id,
        lat,
        lng,
        updatedAt: new Date(),
      });
    }

    return res.status(200).json({ status: "success", data: { lat, lng } });
  } catch (error) {
    console.error("updateWorkerLocation error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to update worker location" });
  }
};

// ── POST /service-provider/bookings/:id/images ──────────────────────────────
// Upload before or after wash images
exports.uploadWashImages = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { id } = req.params;
    const imageType = req.body?.imageType; // "before" | "after"

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    if (!["before", "after"].includes(imageType)) {
      return res.status(400).json({ status: "fail", message: 'imageType must be "before" or "after"' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ status: "fail", message: "No images uploaded" });
    }

    const booking = await BookWash.findOne({ _id: id, assignedTo: spId });
    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not assigned to you" });
    }

    const imageUrls = req.files.map(
      (file) => `/uploads/wash-images/${file.filename}`
    );

    const field = imageType === "before" ? "beforeImages" : "afterImages";
    const updated = await BookWash.findByIdAndUpdate(
      id,
      { $push: { [field]: { $each: imageUrls } } },
      { new: true }
    );

    // Notify client of new images
    const io = req.app.get("io");
    if (io) {
      io.to(`booking_${id}`).emit("wash_images_uploaded", {
        bookingId: id,
        imageType,
        images: imageUrls,
      });
    }

    return res.status(200).json({
      status: "success",
      data: { imageType, images: imageUrls, booking: updated },
    });
  } catch (error) {
    console.error("uploadWashImages error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to upload images" });
  }
};

// ── PUT /service-provider/availability ──────────────────────────────────────
// Toggle SP availability
exports.updateAvailability = async (req, res) => {
  try {
    const spId = req.user?.id;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ status: "fail", message: "isAvailable must be a boolean" });
    }

    const user = await User.findByIdAndUpdate(spId, { isAvailable }, { new: true });
    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    return res.status(200).json({ status: "success", data: { isAvailable: user.isAvailable } });
  } catch (error) {
    console.error("updateAvailability error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to update availability" });
  }
};
