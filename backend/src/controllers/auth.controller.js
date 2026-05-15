const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  sendVerificationEmail,
  sendOwnerRequestNotification,
} = require("../services/email.service");
require("dotenv").config();

// In-memory cooldown store for resend verification: email -> lastSentAt timestamp
const resendCooldowns = new Map();
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

const generateVerificationLink = (userId) => {
  const timestamp = Date.now();
  // Use '|' as separator to avoid ambiguity with ObjectId hex strings (which contain dots via old format)
  const payload = `${userId}|${timestamp}`;
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(payload)
    .digest("hex");
  const token = encodeURIComponent(`${payload}|${signature}`);
  return `http://localhost:3000/api/auth/verify-email?token=${token}`;
};

exports.register = async (req, res) => {
  try {
    const allowed = ["client", "owner"];
    const { name, email, password } = req.body;
    let role = allowed.includes(req.body.role) ? req.body.role : "client";

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already used" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "client",
    });
    const verifyLink = generateVerificationLink(user._id);
    try {
      await sendVerificationEmail(user, verifyLink);
      if (user.role === "owner") await sendOwnerRequestNotification(user);
    } catch (err) {
      user.deleteOne();
      console.error("Error sending validation email:", err);
      return res
        .status(500)
        .json({ message: "Error sending validation email" });
    }

    return res.status(201).json({
      message:
        user.role === "owner"
          ? "owner account pending validation"
          : "user registration successful!",
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }); //.select('+password');
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const pwmatch = await bcrypt.compare(password, user.password);
    if (!pwmatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Admins are always pre-verified; skip the check for them
    if (!user.email_verified && user.role !== "admin") {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account suspended" });
    }
    if (user.role === "owner" && !user.isValidated) {
      return res.status(403).json({
        message: "Owner account awaiting admin approval",
      });
    }
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: 3600000,
    });

    return res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (err) {
    res.status(500).json({
      message: "server error",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  const FRONTEND_BASE = "http://localhost:4200/verify-email";
  const { token } = req.query;

  if (!token) {
    return res.redirect(
      `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Verification token is required")}`,
    );
  }

  try {
    // Token format: userId|timestamp|signature  (pipe-separated, 3 parts)
    const parts = token.split("|");
    if (parts.length !== 3) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid verification token format")}`,
      );
    }

    const payload = parts[0] + "|" + parts[1]; // userId|timestamp
    const signature = parts[2];
    const userId = parts[0];
    const timestamp = parts[1];

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(payload)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid or expired verification link")}`,
      );
    }

    if (!userId || !timestamp) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid verification token structure")}`,
      );
    }

    // Check link age (24-hour expiry)
    const linkAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000;

    if (linkAge > maxAge) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Verification link has expired")}`,
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("User not found")}`,
      );
    }

    if (user.email_verified) {
      return res.redirect(
        `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Email already verified")}`,
      );
    }

    user.email_verified = true;
    await user.save();

    return res.redirect(`${FRONTEND_BASE}?status=success`);
  } catch (err) {
    console.error("Email verification error:", err);
    return res.redirect(
      `${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("An error occurred during email verification")}`,
    );
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // --- Rate-limit: 60-second cooldown per email ---
    const now = Date.now();
    const lastSent = resendCooldowns.get(email);
    if (lastSent) {
      const elapsed = now - lastSent;
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      if (elapsed < RESEND_COOLDOWN_MS) {
        return res.status(429).json({
          message: "Please wait before requesting another email.",
          retryAfter: remaining,
        });
      }
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verifyLink = generateVerificationLink(user._id);
    await sendVerificationEmail(user, verifyLink);

    // Record send time AFTER a successful dispatch
    resendCooldowns.set(email, Date.now());

    return res.status(200).json({
      message: "Verification email resent successfully",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({
      message: "Error resending verification email",
    });
  }
};

exports.Logout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "User Logged out successfully" });
};
