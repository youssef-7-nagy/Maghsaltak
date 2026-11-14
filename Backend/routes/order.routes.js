const express = require("express");
const orderController = require("../controllers/order.controller");
const { authMiddleWare: authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

// Client routes
router.post("/", authenticate, orderController.createOrder);
router.get("/my", authenticate, orderController.getMyOrders);
router.get("/my-subscriptions", authenticate, orderController.getMySubscriptions);

// Admin routes
router.get("/admin/all", authenticate, adminOnly, orderController.getAllOrders);
router.get("/admin/subscriptions", authenticate, adminOnly, orderController.getAdminSubscriptions);
router.put("/:id/status", authenticate, adminOnly, orderController.updateOrderStatus);
router.put("/:id/subscription-status", authenticate, adminOnly, orderController.updateSubscriptionStatus);
router.put("/:id/log-wash", authenticate, adminOnly, orderController.logSubscriptionWash);
router.put("/:id/add-wash", authenticate, adminOnly, orderController.recordWashUsed);

module.exports = router;
