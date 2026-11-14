const SupportConversation = require("../models/SupportConversation");
const { User } = require("../models/User");


exports.getMyConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ status: "fail", message: "Unauthorized" });

    const user = await User.findById(userId).select("name email");
    if (!user) return res.status(404).json({ status: "fail", message: "User not found" });

   
    let conv = await SupportConversation.findOne({ user: userId, status: "open" });
    if (!conv) {
      conv = await SupportConversation.create({
        user:      userId,
        userName:  user.name || "Customer",
        userEmail: user.email || "",
      });
    }

    return res.status(200).json({ status: "success", data: conv });
  } catch (err) {
    console.error("getMyConversation error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};


exports.getAllConversations = async (req, res) => {
  try {
    const convs = await SupportConversation.find()
      .sort({ updatedAt: -1 })
      .populate("user", "profilePhoto gender")
      .select(
        "user userName userEmail subject status lastUserMessageAt lastAdminReplyAt unreadByAdmin messages createdAt updatedAt"
      );

    return res.status(200).json({ status: "success", data: convs });
  } catch (err) {
    console.error("getAllConversations error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

// ── Admin: get single conversation with all messages ─────────────────────────
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await SupportConversation.findById(id);
    if (!conv) return res.status(404).json({ status: "fail", message: "Conversation not found" });

    return res.status(200).json({ status: "success", data: conv });
  } catch (err) {
    console.error("getConversationById error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

// ── Admin: mark conversation as read (reset unreadByAdmin to 0) ───────────────
exports.markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await SupportConversation.findByIdAndUpdate(
      id,
      { $set: { unreadByAdmin: 0 } },
      { new: true }
    );
    if (!conv) return res.status(404).json({ status: "fail", message: "Conversation not found" });
    return res.status(200).json({ status: "success", data: { unreadByAdmin: 0 } });
  } catch (err) {
    console.error("markConversationRead error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};

// ── Admin: close a conversation ───────────────────────────────────────────────
exports.closeConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await SupportConversation.findByIdAndUpdate(
      id,
      { status: "closed", $set: { unreadByAdmin: 0 } },
      { new: true }
    );
    if (!conv) return res.status(404).json({ status: "fail", message: "Conversation not found" });
    return res.status(200).json({ status: "success", data: conv });
  } catch (err) {
    console.error("closeConversation error:", err);
    return res.status(500).json({ status: "fail", message: "Server error" });
  }
};
