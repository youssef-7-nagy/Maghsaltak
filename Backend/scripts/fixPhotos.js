const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { User } = require("../models/User");

dotenv.config();

async function fixPhotos() {
  if (!process.env.DB_URL) {
    throw new Error("DB_URL is missing in environment variables");
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB.");

  // Find users with invalid/corrupt profile photos
  const users = await User.find({});
  let fixedCount = 0;

  for (const user of users) {
    if (user.profilePhoto) {
      const p = user.profilePhoto;
      // If it's a data URL that's broken (doesn't contain base64 content or is somehow corrupt)
      // For safety, let's just clear any profilePhoto that starts with 'data:image' 
      // but doesn't look like a valid complete base64 string, or just clear them if they caused an error.
      if (p.startsWith('data:image')) {
        console.log(`Clearing corrupt/data image for user: ${user.name} (${user.email})`);
        user.profilePhoto = undefined;
        await user.save();
        fixedCount++;
      } else if (p.length > 1000) {
        console.log(`Clearing abnormally large profile photo string for user: ${user.name} (${user.email})`);
        user.profilePhoto = undefined;
        await user.save();
        fixedCount++;
      }
    }
  }

  console.log(`Fixed ${fixedCount} users.`);

  await mongoose.disconnect();
  process.exit(0);
}

fixPhotos().catch(async (err) => {
  console.error("❌ Error:", err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
