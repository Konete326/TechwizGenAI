import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { env } from "../config/env.js";
import { isValidEmail, isStrongPassword, sanitizeText } from "../utils/validators.js";
import { updateUserProfile } from "../services/profileService.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, { expiresIn: "7d" });
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status || "active",
    lastLogin: user.lastLogin,
    profileImage: user.profileImage || "",
    totalTokensUsed: user.totalTokensUsed || 0,
    createdAt: user.createdAt
  };
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ success: false, message: "All fields are required" });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: "Invalid email format" });
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character" });
    }
    const cleanName = sanitizeText(name);
    if (!cleanName || cleanName.length > 50) return res.status(400).json({ success: false, message: "Name must be between 1 and 50 characters" });
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ success: false, message: "User with this email already exists" });
    const user = await User.create({ email: email.toLowerCase().trim(), password, name: cleanName });
    const token = generateToken(user._id);
    return res.status(201).json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: "Invalid email format" });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (user.status === "suspended") return res.status(403).json({ success: false, message: "Account has been suspended by an administrator" });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    await Notification.create({
      userId: user._id,
      title: "New Login Detected",
      message: `Session authenticated for ${user.name}.`,
      type: "info",
      href: "/profile"
    }).catch(() => {});

    const token = generateToken(user._id);
    return res.status(200).json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, user: sanitizeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, profileImage } = req.body;
    const user = await updateUserProfile(req.user._id, { name, profileImage });
    return res.status(200).json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};
