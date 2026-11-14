const express = require("express");
const multer = require("multer");
const path = require("path");
const packageController = require("../controllers/package.controller");
const { authMiddleWare: authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "package-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


router.get("/", packageController.getAllPackages);


router.post("/", authenticate, adminOnly, upload.array("images", 5), packageController.createPackage);
router.put("/reorder", authenticate, adminOnly, packageController.reorderPackages);
router.put("/:id", authenticate, adminOnly, upload.array("images", 5), packageController.updatePackage);
router.delete("/:id", authenticate, adminOnly, packageController.deletePackage);

module.exports = router;
