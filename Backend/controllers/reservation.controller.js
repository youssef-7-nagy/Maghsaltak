const mongoose = require("mongoose");
const crypto = require("crypto");
const BookWash = require("../models/BookWash");
const { User } = require("../models/User");
const { Car } = require("../models/Car");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

const VALID_RESERVATION_STATUSES = ["pending", "accepted", "rejected", "completed", "cancelled"];

const isAdmin = (req) => req.user?.role === "admin";

const toSafeDate = (dateValue, timeValue) => {
  if (!dateValue) return null;
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return null;

  if (timeValue && /^\d{2}:\d{2}$/.test(String(timeValue))) {
    const [hours, minutes] = String(timeValue).split(":").map(Number);
    parsedDate.setHours(hours, minutes, 0, 0);
  }

  return parsedDate;
};

exports.createReservation = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized user" });
    }

    const {
      vehicle = {},
      services = [],
      totalPrice = 0,
      washPackage = {},
      location,
      date,
      time,
      notes,
      paymentMethod,
      paymentDetails,
    } = req.body || {};

    const hasServices = Array.isArray(services) && services.length > 0;
    const hasWashPackage = Boolean(washPackage?.name);

    if (!location || !date || !time || (!hasServices && !hasWashPackage)) {
      return res.status(400).json({
        status: "fail",
        message: "Vehicle, services/package, location, date and time are required",
      });
    }

    let processedPaymentDetails = undefined;
    if (paymentMethod === "visa" && paymentDetails) {
      processedPaymentDetails = {
        cardName: paymentDetails.cardName,
        cardNumberLast4: String(paymentDetails.cardNumber || "").slice(-4),
        encryptedCardNumber: encrypt(paymentDetails.cardNumber),
        expiryDate: paymentDetails.cardExpiry
      };
    }

    let locString = "";
    if (typeof location === "object" && location !== null) {
      locString = `${location.area || ""} - ${location.exactAddress || ""}`.trim();
    } else {
      locString = String(location).trim();
    }

    let packageData = {
      code: "custom",
      name: "Custom Services",
      price: Number(totalPrice) || 0,
      duration: "Variable",
      description: "Custom selected services",
    };

    if (hasServices) {
      packageData.name = services.map(s => s.name).join(", ");
    } else if (hasWashPackage) {
      packageData = {
        code: washPackage.code ? String(washPackage.code).trim() : "",
        name: String(washPackage.name).trim(),
        price: Number(washPackage.price || 0),
        duration: washPackage.duration ? String(washPackage.duration).trim() : "",
        description: washPackage.description ? String(washPackage.description).trim() : "",
      };
    }

    const reservationDate = toSafeDate(date, time);
    if (!reservationDate) {
      return res.status(400).json({ status: "fail", message: "Invalid booking date/time" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    let vehiclePayload = {
      type: vehicle.type ? String(vehicle.type).trim() : "",
      label: vehicle.label ? String(vehicle.label).trim() : "",
    };

    const carId = vehicle?.car || vehicle?.carId;
    if (carId && mongoose.Types.ObjectId.isValid(carId)) {
      const selectedCar = await Car.findOne({ _id: carId, user: userId }).select("year brand model plateNumber type");
      if (selectedCar) {
        vehiclePayload = {
          car: selectedCar._id,
          type: selectedCar.type,
          label: `${selectedCar.year} ${selectedCar.brand} ${selectedCar.model} (${selectedCar.plateNumber})`,
        };
      }
    }

    const newReservation = await BookWash.create({
      user: userId,
      userName: String(user.name || "App User").trim(),
      userEmail: String(user.email || "").trim(),
      userPhone: String(user.phone || "Not Provided").trim(),
      vehicle: vehiclePayload,
      washPackage: packageData,
      location: locString,
      date: reservationDate,
      time: String(time).trim(),
      notes: notes ? String(notes).trim() : "",
      paymentMethod: paymentMethod === 'visa' ? 'visa' : 'cash',
      paymentDetails: processedPaymentDetails
    });

    // Award Points
    const pointsEarned = packageData.price > 0 ? Math.floor(packageData.price * 0.1) : 10;
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { rewardsPoints: pointsEarned }
      });
    } catch (err) {
      console.error("Failed to add points to user for wash:", err);
    }

    if (paymentMethod === "visa" && processedPaymentDetails) {
      console.log("Processing visa payment for user:", userId);
      const isCardAlreadySaved = user.savedCards && user.savedCards.some(
        card => card.cardNumberLast4 === processedPaymentDetails.cardNumberLast4
      );
      
      console.log("Is card already saved?", isCardAlreadySaved);

      if (!isCardAlreadySaved) {
        const types = ["stripe", "wise", "paypal"];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        console.log("Adding new card to user profile...");
        try {
          await User.findByIdAndUpdate(userId, {
            $push: {
              savedCards: {
                cardName: processedPaymentDetails.cardName,
                cardNumberLast4: processedPaymentDetails.cardNumberLast4,
                encryptedCardNumber: processedPaymentDetails.encryptedCardNumber,
                expiryDate: processedPaymentDetails.expiryDate,
                cardType: randomType
              }
            }
          });
          console.log("Successfully saved card to User profile.");
        } catch (updateErr) {
          console.error("Failed to update User with savedCard:", updateErr);
        }
      }
    }

    return res.status(201).json({ status: "success", data: newReservation });
  } catch (error) {
    console.error("Failed to create reservation:", error);
    return res.status(500).json({ status: "fail", message: "Failed to create reservation" });
  }
};

exports.getMyReservations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized user" });
    }

    const reservations = await BookWash.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("vehicle.car", "year brand model plateNumber type color")
      .populate("assignedTo", "name profilePhoto phone");

    return res.status(200).json({ status: "success", data: reservations });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch reservations" });
  }
};

exports.getAllReservationsAdmin = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const reservations = await BookWash.find({})
      .sort({ createdAt: -1 })
      .populate("user", "name email phone role")
      .populate("vehicle.car", "year brand model plateNumber type color");

    return res.status(200).json({ status: "success", data: reservations });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch reservations" });
  }
};

exports.updateReservationStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();

    if (!VALID_RESERVATION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ status: "fail", message: "Invalid reservation status" });
    }

    const reservation = await BookWash.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true }
    );

    if (!reservation) {
      return res.status(404).json({ status: "fail", message: "Reservation not found" });
    }

    return res.status(200).json({ status: "success", data: reservation });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to update reservation status" });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ status: "fail", message: "Date parameter is required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await BookWash.find({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["pending", "accepted"] }
    }).select("time");

    const bookedSlots = reservations.map(r => r.time);
    return res.status(200).json({ status: "success", data: bookedSlots });
  } catch (error) {
    console.error("Failed to fetch booked slots:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch booked slots" });
  }
};

// ── Admin: Assign a booking to a service provider ───────────────────────────
exports.assignBooking = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const { id } = req.params;
    const { serviceProviderId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: "fail", message: "Invalid booking ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceProviderId)) {
      return res.status(400).json({ status: "fail", message: "Invalid service provider ID" });
    }

    // Verify the SP exists and has the right role
    const sp = await User.findOne({ _id: serviceProviderId, role: "serviceProvider" });
    if (!sp) {
      return res.status(404).json({ status: "fail", message: "Service provider not found" });
    }

    const booking = await BookWash.findByIdAndUpdate(
      id,
      {
        assignedTo: serviceProviderId,
        assignedAt: new Date(),
        workerStatus: "unassigned",
        status: "accepted",
      },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone profilePhoto");

    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found" });
    }

    // Notify the SP via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`sp_${serviceProviderId}`).emit("booking_assigned", {
        booking,
      });
    }

    return res.status(200).json({ status: "success", data: booking });
  } catch (error) {
    console.error("assignBooking error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to assign booking" });
  }
};

// ── Admin: Get all service providers ────────────────────────────────────────
exports.getServiceProviders = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const providers = await User.find({ role: "serviceProvider" })
      .select("name email phone profilePhoto isAvailable createdAt")
      .sort({ name: 1 });

    return res.status(200).json({ status: "success", data: providers });
  } catch (error) {
    console.error("getServiceProviders error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch service providers" });
  }
};

// ── Client: Submit a Review ─────────────────────────────────────────────────
exports.submitReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rating, reviewText } = req.body;

    if (!userId) return res.status(401).json({ status: "fail", message: "Unauthorized" });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: "fail", message: "Rating must be between 1 and 5" });
    }

    const booking = await BookWash.findOneAndUpdate(
      { _id: id, user: userId, workerStatus: "finished" },
      { rating, reviewText },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found or not finished yet" });
    }

    return res.status(200).json({ status: "success", data: booking });
  } catch (error) {
    console.error("submitReview error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to submit review" });
  }
};

// ── Get Chat Message History ──────────────────────────────────────────────────
exports.getChatMessages = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ status: "fail", message: "Unauthorized" });

    const booking = await BookWash.findById(id).select("messages user assignedTo");
    if (!booking) {
      return res.status(404).json({ status: "fail", message: "Booking not found" });
    }

    // Only the booking owner, the assigned worker, or an admin can read messages
    const isOwner    = booking.user?.toString() === userId;
    const isWorker   = booking.assignedTo?.toString() === userId;
    const isAdminReq = userRole === "admin";

    if (!isOwner && !isWorker && !isAdminReq) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    return res.status(200).json({ status: "success", data: booking.messages || [] });
  } catch (error) {
    console.error("getChatMessages error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch messages" });
  }
};

// ── Public: Get Recent Reviews ──────────────────────────────────────────────
exports.getRecentReviews = async (req, res) => {
  try {
    const reviews = await BookWash.find({ rating: { $exists: true, $gte: 1 } })
      .sort({ updatedAt: -1 })
      .limit(6)
      .populate("user", "profilePhoto")
      .select("userName rating reviewText updatedAt user");
    return res.status(200).json({ status: "success", data: reviews });
  } catch (error) {
    console.error("getRecentReviews error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch reviews" });
  }
};


// ── Admin: Get Analytics (Business Intelligence) ────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const PackageSubscription = require("../models/PackageSubscription");

    // ── Totals (Bookings + Subscriptions) ────────────────────────
    const [
      totalBookings, completedBookings, pendingBookings, acceptedBookings, rejectedBookings, cancelledBookings,
      totalSubs, completedSubs, pendingSubs, deliveredSubs, cancelledSubs
    ] = await Promise.all([
      BookWash.countDocuments(),
      BookWash.countDocuments({ status: "completed" }),
      BookWash.countDocuments({ status: "pending" }),
      BookWash.countDocuments({ status: "accepted" }),
      BookWash.countDocuments({ status: "rejected" }),
      BookWash.countDocuments({ status: "cancelled" }),
      PackageSubscription.countDocuments(),
      PackageSubscription.countDocuments({ status: "completed" }),
      PackageSubscription.countDocuments({ status: "pending" }),
      PackageSubscription.countDocuments({ status: "delivered" }),
      PackageSubscription.countDocuments({ status: "cancelled" }),
    ]);

    const combinedTotal = totalBookings + totalSubs;
    const combinedCompleted = completedBookings + completedSubs + deliveredSubs;
    const combinedPending = pendingBookings + pendingSubs;
    const combinedAccepted = acceptedBookings;
    const combinedCancelled = cancelledBookings + rejectedBookings + cancelledSubs;

    // ── Wash Revenue — completed bookings only ───────────────────
    const washRevenueAgg = await BookWash.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$washPackage.price" } } },
    ]);
    const washRevenue = washRevenueAgg[0]?.total || 0;

    // ── Subscription Revenue — non-cancelled subs ────────────────
    const orderRevenueAgg = await PackageSubscription.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const orderRevenue = orderRevenueAgg[0]?.total || 0;

    const totalRevenue = washRevenue + orderRevenue;

    // ── Payment breakdown — BOOKINGS by payment method ───────────
    const bookingPaymentBreakdown = await BookWash.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$paymentMethod", "cash"] },
          count: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$washPackage.price", 0] },
          },
        },
      },
    ]);

    // ── Payment breakdown — SUBSCRIPTIONS by payment method ──────
    const subPaymentBreakdown = await PackageSubscription.aggregate([
      { $match: { status: { $nin: ["cancelled"] } } },
      {
        $group: {
          _id: { $ifNull: ["$paymentMethod", "cash"] },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // ── Merge both into a combined payment summary ────────────────
    const paymentMap = {};
    for (const row of bookingPaymentBreakdown) {
      const key = (row._id || "cash").toLowerCase();
      if (!paymentMap[key]) paymentMap[key] = { name: key.toUpperCase(), bookingCount: 0, subCount: 0, count: 0, revenue: 0 };
      paymentMap[key].bookingCount += row.count;
      paymentMap[key].count += row.count;
      paymentMap[key].revenue += row.revenue;
    }
    for (const row of subPaymentBreakdown) {
      const key = (row._id || "cash").toLowerCase();
      if (!paymentMap[key]) paymentMap[key] = { name: key.toUpperCase(), bookingCount: 0, subCount: 0, count: 0, revenue: 0 };
      paymentMap[key].subCount += row.count;
      paymentMap[key].count += row.count;
      paymentMap[key].revenue += row.revenue;
    }
    const paymentSummary = Object.values(paymentMap);

    // Keep legacy paymentBreakdown (bookings-only) for the pie chart
    const paymentBreakdown = bookingPaymentBreakdown.map((r) => ({
      _id: r._id,
      count: r.count,
      revenue: r.revenue,
    }));

    // ── Monthly revenue & bookings trend ─────────────────────────
    const monthlyBookingsData = await BookWash.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$washPackage.price", 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $in: ["$status", ["cancelled", "rejected"]] }, 1, 0] } },
        },
      }
    ]);
    const monthlySubsData = await PackageSubscription.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalAmount", 0] } },
          completed: { $sum: { $cond: [{ $in: ["$status", ["completed", "delivered"]] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      }
    ]);

    const monthlyMap = {};
    const mergeMonthly = (arr) => {
      arr.forEach(m => {
        if (!m._id.year || !m._id.month) return;
        const key = `${m._id.year}-${m._id.month}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            _id: m._id,
            count: 0, revenue: 0, completed: 0, cancelled: 0
          };
        }
        monthlyMap[key].count += m.count;
        monthlyMap[key].revenue += m.revenue;
        monthlyMap[key].completed += m.completed;
        monthlyMap[key].cancelled += m.cancelled;
      });
    };
    mergeMonthly(monthlyBookingsData);
    mergeMonthly(monthlySubsData);

    const monthlyBookings = Object.values(monthlyMap).sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      return a._id.month - b._id.month;
    });

    // ── Popular packages ──────────────────────────────────────────
    const popularWashPackages = await BookWash.aggregate([
      {
        $group: {
          _id: "$washPackage.name",
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$washPackage.price", 0] } },
        },
      }
    ]);
    const popularSubPackages = await PackageSubscription.aggregate([
      {
        $group: {
          _id: "$subscriptionDetails.packageTitle",
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalAmount", 0] } },
        },
      }
    ]);
    const packageMap = {};
    const mergePackages = (arr) => {
      arr.forEach(p => {
        const key = p._id || "Unknown";
        if (!packageMap[key]) packageMap[key] = { _id: key, count: 0, revenue: 0 };
        packageMap[key].count += p.count;
        packageMap[key].revenue += p.revenue;
      });
    };
    mergePackages(popularWashPackages);
    mergePackages(popularSubPackages);

    const popularPackages = Object.values(packageMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Top customers by spend ────────────────────────────────────
    const topWashCustomers = await BookWash.aggregate([
      { $match: { userName: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$userName",
          bookings: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$washPackage.price", 0] } },
        },
      }
    ]);
    const topSubCustomers = await PackageSubscription.aggregate([
      { $match: { userName: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: "$userName",
          bookings: { $sum: 1 },
          spent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$totalAmount", 0] } },
        },
      }
    ]);

    const customerMap = {};
    const mergeCustomers = (arr) => {
      arr.forEach(c => {
        if (!customerMap[c._id]) customerMap[c._id] = { _id: c._id, bookings: 0, spent: 0 };
        customerMap[c._id].bookings += c.bookings;
        customerMap[c._id].spent += c.spent;
      });
    };
    mergeCustomers(topWashCustomers);
    mergeCustomers(topSubCustomers);

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // ── Status distribution ───────────────────────────────────────
    const statusDistribution = [
      { name: "Completed", value: combinedCompleted, color: "#10b981" },
      { name: "Pending",   value: combinedPending,   color: "#f59e0b" },
      { name: "Accepted",  value: combinedAccepted,  color: "#3b82f6" },
      { name: "Cancelled", value: combinedCancelled, color: "#ef4444" },
    ].filter((s) => s.value > 0);

    return res.status(200).json({
      status: "success",
      data: {
        totals: {
          bookings: combinedTotal,
          completed: combinedCompleted,
          pending: combinedPending,
          accepted: combinedAccepted,
          cancelled: combinedCancelled,
          revenue: totalRevenue,
          washRevenue,
          orderRevenue,
        },
        monthly: monthlyBookings,
        packages: popularPackages,
        paymentBreakdown,   // bookings-only (for pie chart)
        paymentSummary,     // visa+cash merged across bookings & subs
        topCustomers,
        statusDistribution,
      },
    });
  } catch (error) {
    console.error("getAnalytics error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to fetch analytics" });
  }
};
