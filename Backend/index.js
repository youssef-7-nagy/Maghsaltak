const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const authRouter = require("./routes/auth.routes");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const { databaseConnection } = require("./db/db.config");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible in route handlers via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Client (user) joins a booking room to receive live updates
  socket.on("join_booking_room", (bookingId) => {
    if (bookingId) {
      socket.join(`booking_${bookingId}`);
      console.log(`[Socket] ${socket.id} joined booking room: booking_${bookingId}`);
    }
  });

  // Service provider joins their personal room for notifications
  socket.on("join_sp_room", (spId) => {
    if (spId) {
      socket.join(`sp_${spId}`);
      console.log(`[Socket] SP ${socket.id} joined SP room: sp_${spId}`);
    }
  });

  // Admin joins admin room
  socket.on("join_admin_room", () => {
    socket.join("admin_room");
    console.log(`[Socket] Admin ${socket.id} joined admin room`);
  });

  // ── In-App Chat ───────────────────────────────────────────────────────────
  // Payload: { bookingId, senderId, senderName, senderRole, text }
  socket.on("chat_message", async (payload) => {
    const { bookingId, senderId, senderName, senderRole, text } = payload || {};
    if (!bookingId || !senderId || !text?.trim()) return;

    try {
      const BookWash = require("./models/BookWash");
      const message = { senderId, senderName, senderRole, text: text.trim(), sentAt: new Date() };

      // Persist to DB
      await BookWash.findByIdAndUpdate(bookingId, { $push: { messages: message } });

      // Broadcast to everyone in this booking room (client + worker)
      const outgoing = { ...message, bookingId };
      io.to(`booking_${bookingId}`).emit("chat_message", outgoing);
      console.log(`[Chat] Message in booking ${bookingId} from ${senderName} (${senderRole})`);
    } catch (err) {
      console.error("[Chat] Failed to save message:", err.message);
    }
  });

  // ── Support Chat ─────────────────────────────────────────────────────────────
  // Client joins their own support room
  socket.on("join_support_room", (conversationId) => {
    if (conversationId) {
      socket.join(`support_${conversationId}`);
      console.log(`[Socket] ${socket.id} joined support room: support_${conversationId}`);
    }
  });

  // Admin joins the global support admin room to monitor all convos
  socket.on("join_support_admin", () => {
    socket.join("support_admin");
    console.log(`[Socket] Admin ${socket.id} joined support_admin room`);
  });

  // Payload: { conversationId, senderId, senderName, senderRole, text }
  socket.on("support_message", async (payload) => {
    const { conversationId, senderId, senderName, senderRole, text } = payload || {};
    if (!conversationId || !senderId || !text?.trim()) return;

    try {
      const mongoose = require("mongoose");
      const SupportConversation = require("./models/SupportConversation");
      
      const messageId = new mongoose.Types.ObjectId();
      const message = { _id: messageId, senderId, senderName, senderRole, text: text.trim(), sentAt: new Date() };

      const updateFields = { $push: { messages: message } };
      if (senderRole === "admin") {
        // Admin replied → update lastAdminReplyAt, clear unread counter
        updateFields.$set = { lastAdminReplyAt: new Date(), unreadByAdmin: 0 };
      } else {
        // User sent → update lastUserMessageAt, increment unread counter for admin
        updateFields.$set  = { lastUserMessageAt: new Date() };
        updateFields.$inc  = { unreadByAdmin: 1 };
      }

      await SupportConversation.findByIdAndUpdate(conversationId, updateFields);

      const outgoing = { ...message, conversationId };

      // Notify the specific conversation room (client side)
      io.to(`support_${conversationId}`).emit("support_message", outgoing);

      // Notify the admin room so admins see new messages from any user
      // Include unread increment flag so admin UI can update without refetching
      if (senderRole !== "admin") {
        io.to("support_admin").emit("support_new_user_message", {
          ...outgoing,
          conversationId,
        });
      }
      io.to("support_admin").emit("support_message", outgoing);

      console.log(`[Support] Message in convo ${conversationId} from ${senderName} (${senderRole})`);
    } catch (err) {
      console.error("[Support] Failed to save message:", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Ensure uploads directories exist ────────────────────────────────────────
const uploadDir = path.join(__dirname, "uploads");
const washImagesDir = path.join(__dirname, "uploads/wash-images");
[uploadDir, washImagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/auth", authRouter);

const carRouter = require("./routes/car.routes");
app.use("/cars", carRouter);

const packageRouter = require("./routes/package.routes");
app.use("/packages", packageRouter);

const orderRouter = require("./routes/order.routes");
app.use("/order", orderRouter);
app.use("/subscriptions", orderRouter);

const reservationRouter = require("./routes/reservation.routes");
app.use("/reservation", reservationRouter);
app.use("/book-washes", reservationRouter);

const serviceProviderRouter = require("./routes/serviceProvider.routes");
app.use("/service-provider", serviceProviderRouter);

const supportRouter = require("./routes/support.routes");
app.use("/support", supportRouter);

const inventoryRouter = require("./routes/inventory.routes");
app.use("/inventory", inventoryRouter);

// ── Database + Start Server ──────────────────────────────────────────────────
databaseConnection();

// ── Subscription Auto-Expiry ─────────────────────────────────────────────────
const { checkAndExpireSubscriptions } = require("./utils/subscriptionExpiry");
// Run once on startup, then every 6 hours
checkAndExpireSubscriptions();
setInterval(checkAndExpireSubscriptions, 6 * 60 * 60 * 1000);

// ── TEMP: One-time admin promotion route (DELETE AFTER USE) ──────────────────
app.get("/__make-admin", async (req, res) => {
  try {
    const { User } = require("./models/User");
    const user = await User.findOneAndUpdate(
      { email: "youssefn899@gmail.com" },
      { role: "admin" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: `✅ Done! ${user.email} is now: ${user.role}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TEMP: Seed default packages (DELETE AFTER USE) ───────────────────────────
app.get("/__seed-packages", async (req, res) => {
  try {
    const Package = require("./models/Package");
    const defaultPackages = [
      {
        title: "Silver Package",
        price: 400,
        stock: "1 Month",
        category: "subscription",
        description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)",
        images: [],
        order: 0,
      },
      {
        title: "Gold Package",
        price: 600,
        stock: "1 Month",
        category: "subscription",
        description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)\nWeekly interior vacuum (4x)",
        images: [],
        order: 1,
      },
      {
        title: "Platinum Package",
        price: 900,
        stock: "1 Month",
        category: "subscription",
        description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)\nWeekly interior vacuum (4x)\nChemical interior wash (2x/month)",
        images: [],
        order: 2,
      },
    ];

    await Package.deleteMany({ category: "subscription" });
    const inserted = await Package.insertMany(defaultPackages);
    res.json({ message: `✅ Seeded ${inserted.length} packages successfully!`, packages: inserted.map(p => p.title) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TEMP: Fix invalid profile photos & package images (DELETE AFTER USE) ───────────────────
app.get("/__fix-photos", async (req, res) => {
  try {
    const { User } = require("./models/User");
    const Package = require("./models/Package");
    
    // Fix Users
    const users = await User.find({});
    let userCount = 0;
    for (const user of users) {
      if (user.profilePhoto && user.profilePhoto.startsWith("data:image")) {
        user.profilePhoto = undefined;
        await user.save();
        userCount++;
      } else if (user.profilePhoto && user.profilePhoto.length > 500 && !user.profilePhoto.startsWith("http")) {
        user.profilePhoto = undefined;
        await user.save();
        userCount++;
      }
    }

    // Fix Packages
    const packages = await Package.find({});
    let pkgCount = 0;
    for (const pkg of packages) {
      if (pkg.images && pkg.images.length > 0) {
        let modified = false;
        pkg.images = pkg.images.filter(img => {
          if (img.startsWith("data:image")) {
            modified = true;
            return false; // remove
          }
          if (img.length > 500 && !img.startsWith("http")) {
            modified = true;
            return false;
          }
          return true;
        });
        if (modified) {
          await pkg.save();
          pkgCount++;
        }
      }
    }

    res.json({ message: `✅ Cleared invalid photos for ${userCount} users and ${pkgCount} packages.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready`);
});

