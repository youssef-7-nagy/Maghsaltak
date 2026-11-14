const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { User } = require("../models/User");

dotenv.config();

const TARGET_EMAIL = "youssefn899@gmail.com";

async function makeAdmin() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is missing in environment variables");
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB.");

  const user = await User.findOne({ email: TARGET_EMAIL });

  if (!user) {
    console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.email}) — current role: ${user.role}`);

  if (user.role === "admin") {
    console.log("✅ User is already an admin. Nothing to do.");
  } else {
    user.role = "admin";
    await user.save();
    console.log(`✅ Successfully promoted ${user.email} to admin.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

makeAdmin().catch(async (err) => {
  console.error("❌ Error:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
