const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller.js");
const { authMiddleWare } = require("../middlewares/auth.middleware.js");
const { adminOnly } = require("../middlewares/admin.middleware.js");
const { upload } = require("../middlewares/upload.middleware.js");

router.get("/me", authMiddleWare, authController.validateMe);
router.put("/me/gender", authMiddleWare, authController.updateMyGender);
router.post("/me/photo", authMiddleWare, upload.single("photo"), authController.uploadProfilePhoto);
router.post("/me/cards", authMiddleWare, authController.addSavedCard);

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.get("/users", authMiddleWare, adminOnly, authController.getAllUsers);
router.put("/users/:id/role", authMiddleWare, adminOnly, authController.updateUserRole);
router.post("/google", authController.googleLogin);

module.exports = router;
