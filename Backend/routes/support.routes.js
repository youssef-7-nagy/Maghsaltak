const express = require("express");
const supportController = require("../controllers/support.controller");
const { authMiddleWare: authenticate } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

const router = express.Router();

// Client: get or create their support conversation
router.get("/my", authenticate, supportController.getMyConversation);
router.post("/message", authenticate, supportController.sendMessageHttp);

// Admin: list all conversations (includes unreadByAdmin per conversation)
router.get("/admin/all", authenticate, adminOnly, supportController.getAllConversations);

// Admin: get a single conversation by ID
router.get("/admin/:id", authenticate, adminOnly, supportController.getConversationById);

// Admin: mark a conversation as read (resets unreadByAdmin to 0)
router.put("/admin/:id/read", authenticate, adminOnly, supportController.markConversationRead);

// Admin: close a conversation
router.put("/admin/:id/close", authenticate, adminOnly, supportController.closeConversation);

module.exports = router;
