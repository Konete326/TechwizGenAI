import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import { errorHandler } from "./src/middleware/error.js";

import authRoutes from "./src/routes/authRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import assetRoutes from "./src/routes/assetRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import dashboardRoutes from "./src/routes/dashboardRoutes.js";
import { seedAdmin } from "./src/config/seedAdmin.js";

await connectDB();
await seedAdmin();

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later"
  }
});

app.use(helmet({ contentSecurityPolicy: false, frameguard: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
const allowedOrigins = (env.CLIENT_URL || "http://localhost:5173").split(",").map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*") || origin.endsWith(".vercel.app")) {
      return cb(null, true);
    }
    return cb(null, true);
  },
  credentials: true
}));
app.use((req, res, next) => {
  if (req.url && req.url.includes("//")) {
    req.url = req.url.replace(/\/+/g, "/");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.path.endsWith(".pdf")) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
  }
  next();
}, express.static("uploads"));

app.use("/api", apiLimiter);

app.get(["/api/health", "/health"], (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use(["/api/auth", "/auth"], authRoutes);
app.use(["/api/ai", "/ai"], aiRoutes);
app.use(["/api/assets", "/assets"], assetRoutes);
app.use(["/api/admin", "/admin"], adminRoutes);
app.use(["/api/notifications", "/notifications"], notificationRoutes);
app.use(["/api/analytics", "/analytics"], analyticsRoutes);
app.use(["/api/dashboard", "/dashboard"], dashboardRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

export default app;
