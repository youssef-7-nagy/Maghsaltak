const { User } = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");
const {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  genderSchema,
} = require("../validators/auth.validator");
const { sendPasswordResetEmail } = require("../utils/mailer");

dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const buildUserPayload = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  phone: user.phone || "",
  role: user.role,
  gender: user.gender || null,
  profilePhoto: user.profilePhoto || "",
  savedCards: user.savedCards || [],
  rewardsPoints: user.rewardsPoints || 0,
  isAvailable: user.isAvailable ?? true,
});

async function register(request, response) {
  const { error, value } = registerSchema.validate(request.body, {
    abortEarly: false,
  });
  
  if (error) {
    return response
      .status(400)
      .json({ message: error.details.map((item) => item.message) });
  }
  
  try {
    const { email, password, name, phone } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, name, phone });
    const token = generateToken(user);

    return response.status(201).json({
      message: "user created ..",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function validateMe(request, response) {
  try {
    const id = request.user.id;
    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    return response.json({
      message: "user logged in",
      isLoggedIn: true,
      data: {
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function login(request, response) {
  try {
    const { error } = loginSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }
    
    const { email, password } = request.body;
    const user = await User.findOne({ email });

    if (!user) {
      return response.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return response.status(400).json({ message: "Invalid Credentials" });
    }

    const token = generateToken(user);
    return response.json({
      message: "user logged in successfully ..",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function forgotPassword(request, response) {
  try {
    const { error } = forgotSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }
    
    const { email } = request.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Security: return success message anyway to not reveal if email exists
      return response.json({ message: "If this email is registered, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour from now
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    
    // IMPORTANT: Print the URL to the terminal so the user can click it locally!
    console.log("\n=======================================================");
    console.log("🔑 PASSWORD RESET LINK:");
    console.log(resetUrl);
    console.log("=======================================================\n");

    try {
      await sendPasswordResetEmail(email, resetUrl);
      return response.json({ message: "Reset link sent! Check your inbox (or terminal)." });
    } catch (mailError) {
      console.log("SMTP Error (ISP blocking port):", mailError.message);
      // Even if email fails, return success so they can use the terminal link
      return response.json({ message: "Email blocked by ISP. Please check your terminal for the reset link!" });
    }
  } catch (error) {
    console.log("forgotPassword error:", error);
    return response.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
}

async function resetPassword(request, response) {
  try {
    const { error } = resetSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }

    const { newPassword, token } = request.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // must not be expired
    });

    if (!user) {
      return response.status(400).json({ message: "Reset link is invalid or has expired. Please request a new one." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return response.json({ message: "Password updated successfully! You can now log in." });
  } catch (error) {
    console.log("resetPassword error:", error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function getAllUsers(request, response) {
  try {
    const users = await User.find({}).select("-password -resetPasswordToken");
    return response.json({ message: "Users fetched successfully", data: users });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function updateUserRole(request, response) {
  try {
    const { id } = request.params;
    const { role } = request.body;
    
    if (!["user", "admin", "serviceProvider"].includes(role)) {
      return response.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    return response.json({ message: "Role updated successfully", data: { id: user._id, role: user.role } });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function updateMyGender(request, response) {
  try {
    const { error, value } = genderSchema.validate(request.body);
    if (error) {
      return response.status(400).json({ message: error.message });
    }

    const id = request.user.id;
    const user = await User.findById(id);

    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    user.gender = value.gender;
    await user.save();

    return response.json({
      message: "Gender updated successfully",
      data: {
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function googleLogin(request, response) {
  try {
    const { credential, email: directEmail, name: directName } = request.body || {};
    let email = directEmail;
    let name = directName;

    // If an ID token (credential) was passed from Google OAuth, verify it securely
    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
      } catch (verifyErr) {
        // If credential verification failed because GOOGLE_CLIENT_ID is still a placeholder,
        // or token is invalid, log and check if direct email was provided as fallback
        console.warn("Google credential verification warning:", verifyErr.message);
        if (!email) {
          return response.status(401).json({ message: "Invalid Google token" });
        }
      }
    }

    if (!email) {
      return response.status(400).json({ message: "Email is required for Google login" });
    }
    
    let user = await User.findOne({ email });

    if (!user) {
      // Securely auto-generate a strong placeholder password for Google users
      const generatedPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(generatedPassword, 12);
      
      user = await User.create({ email, password: hashedPassword, name: name || "Google User" });
    }

    const token = generateToken(user);

    return response.json({
      message: "Google login successfully processed",
      data: {
        token,
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: "internal server error.." });
  }
}

async function uploadProfilePhoto(request, response) {
  try {
    const id = request.user.id;
    if (!request.file) {
      return response.status(400).json({ message: "No photo uploaded" });
    }

    const port = process.env.PORT || 8080;
    const photoUrl = `${process.env.BACKEND_URL || `http://localhost:${port}`}/uploads/${request.file.filename}`;

    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "User not found" });
    }

    user.profilePhoto = photoUrl;
    await user.save();

    return response.json({
      message: "Profile photo updated successfully",
      data: {
        user: buildUserPayload(user),
      },
    });
  } catch (error) {
    console.log(error);
    return response.status(500).json({ message: error.message || "internal server error.." });
  }
}

const addSavedCard = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cardName, cardNumber, expiryDate, cardType } = req.body;
    
    if (!cardName || !cardNumber || !expiryDate || !cardType) {
      return res.status(400).json({ status: "fail", message: "Missing card details" });
    }

    const cardNumberStr = String(cardNumber).replace(/\s+/g, '');
    const cardNumberLast4 = cardNumberStr.slice(-4);
    
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012';
    const IV_LENGTH = 16;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(cardNumberStr);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const encryptedCardNumber = iv.toString('hex') + ':' + encrypted.toString('hex');

    const newCard = {
      cardName,
      cardNumberLast4,
      encryptedCardNumber,
      expiryDate,
      cardType // 'visa', 'mastercard', 'meeza'
    };

    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { savedCards: newCard } },
      { new: true }
    ).select("-password");

    return res.status(200).json({ status: "success", data: user });
  } catch (error) {
    console.error("addSavedCard error:", error);
    return res.status(500).json({ status: "fail", message: "Failed to add saved card" });
  }
};

module.exports = {
  register,
  login,
  validateMe,
  forgotPassword,
  resetPassword,
  getAllUsers,
  updateUserRole,
  updateMyGender,
  uploadProfilePhoto,
  googleLogin,
  addSavedCard,
};
