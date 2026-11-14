const express = require("express");
const router = express.Router();
const spController = require("../controllers/serviceProvider.controller");
const { authMiddleWare } = require("../middlewares/auth.middleware");
const { serviceProviderOnly } = require("../middlewares/admin.middleware");
const { uploadWashImages } = require("../middlewares/upload.middleware");

// All routes require authentication + serviceProvider role
router.use(authMiddleWare, serviceProviderOnly);

// Bookings
router.get("/bookings", spController.getMyAssignedBookings);
router.get("/bookings/:id", spController.getAssignedBookingById);
router.put("/bookings/:id/accept", spController.acceptBooking);
router.put("/bookings/:id/status", spController.updateWorkerStatus);
router.put("/bookings/:id/location", spController.updateWorkerLocation);
router.post(
  "/bookings/:id/images",
  uploadWashImages.array("images", 5),
  spController.uploadWashImages
);

// Availability toggle
router.put("/availability", spController.updateAvailability);

module.exports = router;
