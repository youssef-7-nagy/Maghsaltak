const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");

// Ensure MongoDB Atlas SRV records resolve reliably on local machines
if (!process.env.VERCEL && process.platform === "win32") {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  } catch (e) {
    // Ignore if custom DNS fails to apply
  }
}

dotenv.config();

let cachedPromise = null;

async function databaseConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  if (!cachedPromise) {
    if (!process.env.DB_URL) {
      console.error("DB_URL environment variable is not set!");
      throw new Error("DB_URL environment variable is missing.");
    }
    const opts = {
      serverSelectionTimeoutMS: 5000,
    };
    cachedPromise = mongoose.connect(process.env.DB_URL, opts).then((m) => {
      console.log("MongoDB Connected!");
      return m;
    }).catch((err) => {
      cachedPromise = null;
      console.error("MongoDB connection error:", err.message);
      throw err;
    });
  }

  return cachedPromise;
}

module.exports = {
  databaseConnection,
};
