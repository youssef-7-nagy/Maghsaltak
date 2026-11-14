const mongoose = require("mongoose");
const PackageSubscription = require("../models/PackageSubscription");
const LegacyOrder = require("../models/Order");
const Package = require("../models/Package");
const { User } = require("../models/User");

const VALID_STATUSES = ["pending", "delivered", "completed", "cancelled"];
const VALID_SUB_STATUSES = ["pending_activation", "active", "expired", "cancelled"];

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const toDateSafe = (value, fallback = new Date()) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
};

const sanitizeItems = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      packageId: mongoose.Types.ObjectId.isValid(item.packageId) ? item.packageId : undefined,
      title: String(item.title || "").trim(),
      quantity: toPositiveNumber(item.quantity, 1),
      unitPrice: Number(item.unitPrice ?? item.price ?? 0) || 0,
      specialInstructions: item.specialInstructions
        ? String(item.specialInstructions).trim()
        : undefined,
    }))
    .filter((item) => item.title.length > 0);
};

const isAdmin = (req) => req.user?.role === "admin";

const sortByCreatedAtDesc = (left, right) =>
  new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();

/* ─────────────────────────────────────────────────────────
   CREATE ORDER (Client checkout from cart)
───────────────────────────────────────────────────────── */
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized user" });
    }

    const {
      userName,
      userEmail,
      userPhone,
      address,
      items,
      totalAmount,
      paymentMethod,
      subscriptionDetails = {},
      carId,
    } = req.body || {};

    const hasCustomSubscriptionFlag = Object.prototype.hasOwnProperty.call(
      subscriptionDetails,
      "isSubscription"
    );

    const normalizedItems = sanitizeItems(items);
    if (normalizedItems.length === 0) {
      return res.status(400).json({ status: "fail", message: "At least one order item is required" });
    }

    const parsedTotalAmount = Number(totalAmount);
    if (!Number.isFinite(parsedTotalAmount) || parsedTotalAmount <= 0) {
      return res.status(400).json({ status: "fail", message: "Invalid total amount" });
    }

    const dbUser = await User.findById(userId).select("name email phone");
    if (!dbUser) {
      return res.status(404).json({ status: "fail", message: "User not found" });
    }

    const resolvedPhone = String(userPhone || dbUser.phone || "").trim();
    if (!resolvedPhone) {
      return res.status(400).json({ status: "fail", message: "Phone number is required" });
    }

    const packageIdCandidate = subscriptionDetails.packageId || normalizedItems[0]?.packageId;
    const validPackageId = mongoose.Types.ObjectId.isValid(packageIdCandidate)
      ? packageIdCandidate
      : undefined;

    const packageDoc = validPackageId
      ? await Package.findById(validPackageId).select("title")
      : null;

    // Resolve car
    const validCarId = mongoose.Types.ObjectId.isValid(carId) ? carId : undefined;

    const durationMonths = toPositiveNumber(subscriptionDetails.durationMonths, 1);
    const washesPerMonth = toPositiveNumber(subscriptionDetails.washesPerMonth, 4);
    const startDate = toDateSafe(subscriptionDetails.startDate, new Date());
    const endDate = toDateSafe(subscriptionDetails.endDate, new Date(startDate));

    if (!subscriptionDetails.endDate) {
      endDate.setMonth(endDate.getMonth() + durationMonths);
    }

    const newOrder = await PackageSubscription.create({
      user: userId,
      car: validCarId,
      userName: String(userName || dbUser.name || "App User").trim(),
      userEmail: String(userEmail || dbUser.email || "").trim(),
      userPhone: resolvedPhone,
      address: String(address || "").trim(),
      items: normalizedItems,
      subscriptionDetails: {
        isSubscription: hasCustomSubscriptionFlag
          ? Boolean(subscriptionDetails.isSubscription)
          : true,
        packageId: packageDoc?._id || validPackageId,
        packageTitle: String(
          subscriptionDetails.packageTitle ||
            packageDoc?.title ||
            normalizedItems[0]?.title ||
            "Subscription Package"
        ).trim(),
        billingCycle: String(subscriptionDetails.billingCycle || "monthly").trim().toLowerCase(),
        durationMonths,
        washesPerMonth,
        startDate,
        endDate,
      },
      totalAmount: parsedTotalAmount,
      paymentMethod: String(paymentMethod || "cash").trim().toLowerCase(),
      washesUsed: 0,
      subscriptionStatus: "pending_activation",
    });

    // Award Points
    const pointsEarned = parsedTotalAmount > 0 ? Math.floor(parsedTotalAmount * 0.1) : 50;
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { rewardsPoints: pointsEarned }
      });
    } catch (err) {
      console.error("Failed to add points to user for subscription:", err);
    }

    return res.status(201).json({ status: "success", data: newOrder });
  } catch (error) {
    console.error("Failed to create order:", error);
    return res.status(500).json({ status: "fail", message: "Failed to create order" });
  }
};

/* ─────────────────────────────────────────────────────────
   GET MY ORDERS (Client)
───────────────────────────────────────────────────────── */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized user" });
    }

    const [subscriptions, legacyOrders] = await Promise.all([
      PackageSubscription.find({ user: userId })
        .populate("subscriptionDetails.packageId", "title price")
        .populate("car", "brand model year plateNumber color type"),
      LegacyOrder.find({ user: userId })
        .populate("subscriptionDetails.packageId", "title price"),
    ]);

    const orders = [...subscriptions, ...legacyOrders].sort(sortByCreatedAtDesc);
    return res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch your orders" });
  }
};

/* ─────────────────────────────────────────────────────────
   GET MY SUBSCRIPTIONS (Client - dedicated endpoint)
───────────────────────────────────────────────────────── */
exports.getMySubscriptions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ status: "fail", message: "Unauthorized user" });
    }

    const subscriptions = await PackageSubscription.find({ user: userId })
      .populate("subscriptionDetails.packageId", "title price images")
      .populate("car", "brand model year plateNumber color type")
      .sort({ createdAt: -1 });

    return res.status(200).json({ status: "success", data: subscriptions });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch subscriptions" });
  }
};

/* ─────────────────────────────────────────────────────────
   GET ALL ORDERS (Admin)
───────────────────────────────────────────────────────── */
exports.getAllOrders = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const [subscriptions, legacyOrders] = await Promise.all([
      PackageSubscription.find({})
        .populate("user", "name email phone role")
        .populate("car", "brand model year plateNumber color type")
        .populate("subscriptionDetails.packageId", "title price"),
      LegacyOrder.find({})
        .populate("user", "name email phone role")
        .populate("subscriptionDetails.packageId", "title price"),
    ]);

    const orders = [...subscriptions, ...legacyOrders].sort(sortByCreatedAtDesc);
    return res.status(200).json({ status: "success", data: orders });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch orders" });
  }
};

/* ─────────────────────────────────────────────────────────
   GET ADMIN SUBSCRIPTIONS (Admin - dedicated tab)
───────────────────────────────────────────────────────── */
exports.getAdminSubscriptions = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    // Auto-expire any subscriptions whose endDate has passed
    const now = new Date();
    await PackageSubscription.updateMany(
      { subscriptionStatus: "active", "subscriptionDetails.endDate": { $lt: now } },
      { $set: { subscriptionStatus: "expired" } }
    );

    const subscriptions = await PackageSubscription.find({})
      .populate("user", "name email phone")
      .populate("car", "brand model year plateNumber color type")
      .populate("subscriptionDetails.packageId", "title price images")
      .sort({ createdAt: -1 });

    return res.status(200).json({ status: "success", data: subscriptions });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to fetch subscriptions" });
  }
};

/* ─────────────────────────────────────────────────────────
   UPDATE ORDER STATUS (Admin - payment/logistics workflow)
───────────────────────────────────────────────────────── */
exports.updateOrderStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").trim().toLowerCase();

    if (!VALID_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ status: "fail", message: "Invalid status" });
    }

    let updatedOrder = await PackageSubscription.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true }
    );

    if (!updatedOrder) {
      updatedOrder = await LegacyOrder.findByIdAndUpdate(
        id,
        { status: nextStatus },
        { new: true }
      );
    }

    if (!updatedOrder) {
      return res.status(404).json({ status: "fail", message: "Order not found" });
    }

    return res.status(200).json({ status: "success", data: updatedOrder });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to update order status" });
  }
};

/* ─────────────────────────────────────────────────────────
   UPDATE SUBSCRIPTION STATUS (Admin - service lifecycle)
   Activating sets startDate=now, endDate=now+durationMonths
───────────────────────────────────────────────────────── */
exports.updateSubscriptionStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const { id } = req.params;
    const nextStatus = String(req.body?.subscriptionStatus || "").trim().toLowerCase();

    if (!VALID_SUB_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ status: "fail", message: "Invalid subscription status" });
    }

    const sub = await PackageSubscription.findById(id);
    if (!sub) {
      return res.status(404).json({ status: "fail", message: "Subscription not found" });
    }

    const updateFields = { subscriptionStatus: nextStatus };

    // When activating for the first time, set the actual start/end dates
    if (nextStatus === "active" && sub.subscriptionStatus === "pending_activation") {
      const now = new Date();
      const durationMonths = sub.subscriptionDetails?.durationMonths || 1;
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + durationMonths);
      updateFields["subscriptionDetails.startDate"] = now;
      updateFields["subscriptionDetails.endDate"] = endDate;
    }

    const updated = await PackageSubscription.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("car", "brand model year plateNumber color type")
      .populate("subscriptionDetails.packageId", "title price");

    return res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to update subscription status" });
  }
};

/* ─────────────────────────────────────────────────────────
   RECORD WASH USED (Admin - mark one wash session done)
───────────────────────────────────────────────────────── */
exports.recordWashUsed = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ status: "fail", message: "Access denied" });
    }

    const { id } = req.params;
    const sub = await PackageSubscription.findById(id);
    if (!sub) {
      return res.status(404).json({ status: "fail", message: "Subscription not found" });
    }

    if (sub.subscriptionStatus !== "active") {
      return res.status(400).json({
        status: "fail",
        message: "Can only record washes for active subscriptions",
      });
    }

    const totalWashes =
      (sub.subscriptionDetails?.washesPerMonth || 4) *
      (sub.subscriptionDetails?.durationMonths || 1);

    const newWashesUsed = (sub.washesUsed || 0) + 1;
    const updateFields = { washesUsed: newWashesUsed };
    const pushFields = {};

    const washDate = req.body.date ? new Date(req.body.date) : new Date();
    pushFields.washLogs = { date: washDate, completedAt: new Date() };

    // Auto-expire if all washes used up
    if (newWashesUsed >= totalWashes) {
      updateFields.subscriptionStatus = "expired";
    }

    const updated = await PackageSubscription.findByIdAndUpdate(
      id,
      { $set: updateFields, $push: pushFields },
      { new: true }
    )
      .populate("user", "name email phone")
      .populate("car", "brand model year plateNumber color type")
      .populate("subscriptionDetails.packageId", "title price");

    return res.status(200).json({ status: "success", data: updated });
  } catch (error) {
    return res.status(500).json({ status: "fail", message: "Failed to record wash" });
  }
};

exports.logSubscriptionWash = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ status: "fail", message: "Wash date is required" });
    }

    const sub = await PackageSubscription.findById(id);
    if (!sub) {
      return res.status(404).json({ status: "fail", message: "Subscription not found" });
    }

    if (sub.subscriptionStatus !== "active") {
      return res.status(400).json({ status: "fail", message: "Subscription is not active" });
    }

    const maxWashes = (sub.subscriptionDetails?.durationMonths || 1) * (sub.subscriptionDetails?.washesPerMonth || 4);
    if (sub.washesUsed >= maxWashes) {
      return res.status(400).json({ status: "fail", message: "Maximum washes for this subscription reached" });
    }

    sub.washLogs.push({ date: new Date(date), completedAt: new Date() });
    sub.washesUsed += 1;

    // Check if that was the last wash
    if (sub.washesUsed >= maxWashes) {
      sub.subscriptionStatus = "completed";
    }

    const updatedSub = await sub.save();

    // Re-fetch populated for response
    const populated = await PackageSubscription.findById(updatedSub._id)
      .populate("user", "name email phone")
      .populate("car", "brand model plateNumber color type")
      .populate("subscriptionDetails.packageId", "title price");

    return res.status(200).json({ status: "success", data: populated });
  } catch (error) {
    console.error("Error logging wash:", error);
    return res.status(500).json({ status: "fail", message: "Failed to log wash" });
  }
};
