const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

const baseUploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(__dirname, "../uploads");

const washImagesDir = path.join(baseUploadDir, "wash-images");

[baseUploadDir, washImagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
});

// ── Profile Photo Upload ─────────────────────────────────────────────────────
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(baseUploadDir)) {
      try { fs.mkdirSync(baseUploadDir, { recursive: true }); } catch (e) {}
    }
    cb(null, baseUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

// ── Wash Images Upload (before/after) ───────────────────────────────────────
const washImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(washImagesDir)) {
      try { fs.mkdirSync(washImagesDir, { recursive: true }); } catch (e) {}
    }
    cb(null, washImagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const type = req.body?.imageType === "after" ? "after" : "before";
    cb(null, `wash-${type}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadWashImages = multer({
  storage: washImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image."), false);
    }
  },
});

module.exports = { upload, uploadWashImages };
