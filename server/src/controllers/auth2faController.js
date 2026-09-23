import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { generateTwoFactorSecret, verifyTwoFactorToken } from "../services/twoFactorService.js";
import { sendOtpEmail } from "../services/emailService.js";

const generateToken = (userId) => jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: "7d" });

const sanitizeUser = (user) => ({
  id: user._id, email: user.email, name: user.name,
  role: user.role, status: user.status || "active",
  lastLogin: user.lastLogin, profileImage: user.profileImage || "",
  totalTokensUsed: user.totalTokensUsed || 0, createdAt: user.createdAt,
  twoFactorEnabled: user.twoFactorEnabled || false
});

export const setup2FA = async (req, res, next) => {
  try {
    const { secret, qrCodeUrl } = await generateTwoFactorSecret(req.user.email);
    return res.json({ success: true, qrCodeUrl, secret });
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (req, res, next) => {
  try {
    const { code, secret } = req.body;
    if (!code || !secret) return res.status(400).json({ success: false, message: "Code and secret are required" });
    const valid = verifyTwoFactorToken({ secret, token: code });
    if (!valid) return res.status(401).json({ success: false, message: "Invalid or expired verification code" });
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true, twoFactorSecret: secret });
    return res.json({ success: true, message: "Two-factor authentication enabled" });
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null });
    return res.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (error) {
    next(error);
  }
};

export const validateLogin2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ success: false, message: "Token and code are required" });
    let payload;
    try {
      payload = jwt.verify(tempToken, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired session token" });
    }
    if (!payload.require2FA) return res.status(400).json({ success: false, message: "Invalid token type" });
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    const valid = verifyTwoFactorToken({ secret: user.twoFactorSecret, token: code });
    if (!valid) return res.status(401).json({ success: false, message: "Invalid authenticator code" });
    const token = generateToken(user._id);
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ success: true, message: "If that email exists, an OTP has been sent" });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 600000);
    await user.save({ validateModifiedOnly: true });
    await sendOtpEmail({ to: user.email, otp });
    return res.json({ success: true, message: "If that email exists, an OTP has been sent" });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: "All fields are required" });
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetPasswordOtp) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    if (user.resetPasswordOtp !== String(otp)) return res.status(400).json({ success: false, message: "Incorrect OTP" });
    if (user.resetPasswordExpires < new Date()) return res.status(400).json({ success: false, message: "OTP has expired" });
    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save({ validateModifiedOnly: false });
    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};
