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

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));

app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

export default app;
