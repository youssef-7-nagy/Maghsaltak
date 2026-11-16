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

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function databaseConnection() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (mongoose.connection.readyState === 2 && cached.promise) {
    return cached.promise;
  }

  if (!cached.promise) {
    if (!process.env.DB_URL) {
      console.error("DB_URL environment variable is not set!");
      throw new Error("DB_URL environment variable is missing.");
    }
    const opts = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    };
    cached.promise = mongoose.connect(process.env.DB_URL, opts).then((m) => {
      console.log("MongoDB Connected!");
      cached.conn = m;
      return m;
    }).catch((err) => {
      cached.promise = null;
      cached.conn = null;
      console.error("MongoDB connection error:", err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = {
  databaseConnection,
};
