const express = require("express");
const reservationController = require("../controllers/reservation.controller");
const { authMiddleWare: authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

router.post("/", authenticate, reservationController.createReservation);
router.get("/slots", reservationController.getBookedSlots);
router.get("/my", authenticate, reservationController.getMyReservations);
router.get("/admin/all", authenticate, adminOnly, reservationController.getAllReservationsAdmin);
router.get("/admin/analytics", authenticate, adminOnly, reservationController.getAnalytics);
router.put("/:id/status", authenticate, adminOnly, reservationController.updateReservationStatus);

// Admin: assign a booking to a service provider
router.put("/:id/assign", authenticate, adminOnly, reservationController.assignBooking);

// Admin: list all service providers
router.get("/admin/service-providers", authenticate, adminOnly, reservationController.getServiceProviders);

// Client: submit a review
router.post("/:id/review", authenticate, reservationController.submitReview);

// Chat history – available to client AND service provider
router.get("/:id/messages", authenticate, reservationController.getChatMessages);

// Public: get recent reviews for About Us page
router.get("/public/reviews", reservationController.getRecentReviews);

module.exports = router;
