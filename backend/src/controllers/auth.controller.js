const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  sendVerificationEmail,
  sendOwnerRequestNotification,
} = require("../services/email.service");
const { logEvent } = require("../services/audit.service");
require("dotenv").config();

const resendCooldowns = new Map();
const RESEND_COOLDOWN_MS = 60 * 1000;

const generateVerificationLink = (userId) => {
  const timestamp = Date.now();
  const payload = `${userId}|${timestamp}`;
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(payload)
    .digest("hex");
  const token = encodeURIComponent(`${payload}|${signature}`);
  const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/verify-email?token=${token}`;
};

exports.register = async (req, res) => {
  try {
    const allowed = ["client", "owner"];
    const { name, email, password } = req.body || {};
    const role = allowed.includes(req.body.role) ? req.body.role : "client";
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      await logEvent(req, { action: "AUTH_REGISTER", entity: "User", status: "failure", details: { email, reason: "email_exists" } });
      return res.status(400).json({ message: "Email already used" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });
    const verifyLink = generateVerificationLink(user._id);
    const mailConfigured = !!(process.env.MAIL_USER && process.env.MAIL_PASS && process.env.MAIL_FROM);
    if (mailConfigured) {
      try {
        await sendVerificationEmail(user, verifyLink);
        if (user.role === "owner") await sendOwnerRequestNotification(user);
      } catch (err) {
        await user.deleteOne();
        console.error("Error sending validation email:", err);
        await logEvent(req, { action: "AUTH_REGISTER", entity: "User", entityId: user._id, status: "failure", details: { email, reason: "email_send_failed" } });
        return res.status(500).json({ message: "Error sending validation email" });
      }
    } else {
      user.email_verified = true;
      await user.save();
      console.warn("[dev] Mail not configured; auto-verified user:", user.email, "verifyLink:", verifyLink);
    }
    await logEvent(req, { action: "AUTH_REGISTER", entity: "User", entityId: user._id, details: { email: user.email, role: user.role } });
    const message = !mailConfigured
      ? "user registration successful! (email auto-verified in dev)"
      : user.role === "owner"
        ? "owner account pending validation"
        : "user registration successful!";
    return res.status(201).json({ message });
  } catch (err) {
    console.error("Error during registration:", err);
    await logEvent(req, { action: "AUTH_REGISTER", entity: "User", status: "failure", details: { error: err.message } });
    return res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      await logEvent(req, { action: "AUTH_LOGIN", entity: "User", status: "failure", details: { email, reason: "invalid_credentials" } });
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const pwmatch = await bcrypt.compare(password, user.password);
    if (!pwmatch) {
      await logEvent(req, { action: "AUTH_LOGIN", entity: "User", entityId: user._id, status: "failure", details: { email, reason: "invalid_credentials" } });
      return res.status(400).json({ message: "Invalid credentials" });
    }
    if (!user.email_verified && user.role !== "admin") {
      await logEvent(req, { action: "AUTH_LOGIN", entity: "User", entityId: user._id, status: "failure", details: { reason: "email_not_verified" } });
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }
    if (!user.isActive) {
      await logEvent(req, { action: "AUTH_LOGIN", entity: "User", entityId: user._id, status: "failure", details: { reason: "inactive" } });
      return res.status(403).json({ message: "Account suspended" });
    }
    if (user.role === "owner" && !user.isValidated) {
      await logEvent(req, { action: "AUTH_LOGIN", entity: "User", entityId: user._id, status: "failure", details: { reason: "owner_not_validated" } });
      return res.status(403).json({ message: "Owner account awaiting admin approval" });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: 3600000,
    });
    await logEvent({ ...req, user: { id: user._id, role: user.role, email: user.email } }, { action: "AUTH_LOGIN", entity: "User", entityId: user._id, details: { email: user.email } });
    return res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    await logEvent(req, { action: "AUTH_LOGIN", entity: "User", status: "failure", details: { error: err.message } });
    res.status(500).json({ message: "server error" });
  }
};

exports.verifyEmail = async (req, res) => {
  const FRONTEND_BASE = "http://localhost:4200/verify-email";
  const { token } = req.query;
  if (!token) {
    return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Verification token is required")}`);
  }
  try {
    const parts = token.split("|");
    if (parts.length !== 3) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid verification token format")}`);
    }
    const payload = parts[0] + "|" + parts[1];
    const signature = parts[2];
    const userId = parts[0];
    const timestamp = parts[1];
    const expectedSignature = crypto.createHmac("sha256", process.env.JWT_SECRET).update(payload).digest("hex");
    if (expectedSignature !== signature) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid or expired verification link")}`);
    }
    if (!userId || !timestamp) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Invalid verification token structure")}`);
    }
    const linkAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000;
    if (linkAge > maxAge) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Verification link has expired")}`);
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("User not found")}`);
    }
    if (user.email_verified) {
      return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("Email already verified")}`);
    }
    user.email_verified = true;
    await user.save();
    await logEvent(req, { action: "AUTH_VERIFY_EMAIL", entity: "User", entityId: user._id, details: { email: user.email } });
    return res.redirect(`${FRONTEND_BASE}?status=success`);
  } catch (err) {
    console.error("Email verification error:", err);
    return res.redirect(`${FRONTEND_BASE}?status=error&reason=${encodeURIComponent("An error occurred during email verification")}`);
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Email is required" });
    const now = Date.now();
    const lastSent = resendCooldowns.get(email);
    if (lastSent) {
      const elapsed = now - lastSent;
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      if (elapsed < RESEND_COOLDOWN_MS) {
        return res.status(429).json({ message: "Please wait before requesting another email.", retryAfter: remaining });
      }
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email_verified) return res.status(400).json({ message: "Email already verified" });
    const verifyLink = generateVerificationLink(user._id);
    await sendVerificationEmail(user, verifyLink);
    resendCooldowns.set(email, Date.now());
    await logEvent(req, { action: "AUTH_RESEND_VERIFICATION", entity: "User", entityId: user._id, details: { email: user.email } });
    return res.status(200).json({ message: "Verification email resent successfully" });
  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({ message: "Error resending verification email" });
  }
};

exports.Logout = async (req, res) => {
  await logEvent(req, { action: "AUTH_LOGOUT", entity: "User", entityId: req.user?.id || null });
  res.clearCookie("token");
  res.json({ message: "User Logged out successfully" });
};
