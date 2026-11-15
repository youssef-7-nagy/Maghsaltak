const mongoose = require("mongoose");
const dotenv = require("dotenv");
const dns = require("dns");

// Ensure MongoDB Atlas SRV records resolve reliably across all ISPs/networks
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if custom DNS fails to apply
}

dotenv.config();

let isConnected = false;

async function databaseConnection() {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }
  try {
    const db = await mongoose.connect(process.env.DB_URL);
    isConnected = db.connections[0].readyState === 1;
    console.log("MongoDB Connected!");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
  }
}

module.exports = {
  databaseConnection,
};
