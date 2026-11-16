const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const packageController = require("../controllers/package.controller");
const { authMiddleWare: authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    // Ignore error if creating directory fails
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (e) {}
    }
    cb(null, uploadDir);
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
