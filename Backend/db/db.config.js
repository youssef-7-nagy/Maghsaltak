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

async function databaseConnection() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB Conntected!");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

module.exports = {
  databaseConnection,
};
