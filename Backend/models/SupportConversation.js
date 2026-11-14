const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, enum: ["user", "serviceProvider", "admin"], required: true },
    text:       { type: String, required: true, trim: true, maxlength: 2000 },
    sentAt:     { type: Date, default: Date.now },
  },
  { _id: true }
);

const supportConversationSchema = new mongoose.Schema(
  {
    // The client who opened the support chat
    user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName:   { type: String, required: true, trim: true },
    userEmail:  { type: String, trim: true, default: "" },

    // Conversation metadata
    subject:    { type: String, trim: true, default: "General Support" },
    status:     { type: String, enum: ["open", "closed"], default: "open", index: true },

    // Chat messages
    messages:   { type: [supportMessageSchema], default: [] },

    // Track when admin last replied (for unread indicators)
    lastAdminReplyAt:  { type: Date, default: null },
    lastUserMessageAt: { type: Date, default: Date.now },

    // Number of user messages admin hasn't read yet (WhatsApp-style unread count)
    unreadByAdmin: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: "support_conversations",
  }
);

supportConversationSchema.index({ user: 1, status: 1 });
supportConversationSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("SupportConversation", supportConversationSchema);

