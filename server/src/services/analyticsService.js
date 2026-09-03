import mongoose from "mongoose";
import { User } from "../models/User.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { ChatSession } from "../models/ChatSession.js";
import { Asset } from "../models/Asset.js";

const imageExts = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
const calcCost = (p = 0, c = 0, t = 0) => (p || c) ? (p * 1e-7 + c * 4e-7) : t * 2.5e-7;

const getTimeline = async (match) => {
  const dStart = new Date(Date.now() - 6 * 86400000);
  dStart.setHours(0, 0, 0, 0);
  const agg = await ChatMessage.aggregate([
    { $match: { ...match, createdAt: { $gte: dStart } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, tokens: { $sum: { $ifNull: ["$tokensUsed.total", 0] } } } }
  ]);
  const map = new Map(agg.map((d) => [d._id, d.tokens]));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split("T")[0];
    return { date: d, tokens: map.get(d) || 0 };
  });
};

const aggregateAssets = (assets) => {
  let img = 0; let doc = 0; let total = 0;
  for (const a of assets) {
    const b = a.bytes || 0;
    total += b;
    if (imageExts.includes((a.format || "").toLowerCase())) img += b; else doc += b;
  }
  return { totalBytes: total, count: assets.length, imageBytes: img, documentBytes: doc };
};

export const getUserMetrics = async (userId) => {
  const uId = new mongoose.Types.ObjectId(String(userId));
  const user = await User.findById(uId).select("name email totalTokensUsed role");
  const sessions = await ChatSession.find({ userId: uId }).select("_id");
  const sIds = sessions.map((s) => s._id);

  const [tAgg, assets, timeline] = await Promise.all([
    ChatMessage.aggregate([
      { $match: { sessionId: { $in: sIds } } },
      { $group: { _id: null, p: { $sum: { $ifNull: ["$tokensUsed.prompt", 0] } }, c: { $sum: { $ifNull: ["$tokensUsed.completion", 0] } }, t: { $sum: { $ifNull: ["$tokensUsed.total", 0] } } } }
    ]),
    Asset.find({ userId: uId }).select("bytes format"),
    getTimeline({ sessionId: { $in: sIds } })
  ]);

  const p = tAgg[0]?.p || 0;
  const c = tAgg[0]?.c || 0;
  const total = Math.max(tAgg[0]?.t || 0, user?.totalTokensUsed || 0);

  return {
    user: { id: user?._id, name: user?.name, email: user?.email, role: user?.role },
    tokens: { prompt: p, completion: c, total },
    storage: aggregateAssets(assets),
    sessionsCount: sessions.length,
    cost: calcCost(p, c, total),
    timeline
  };
};

export const getAdminPlatformMetrics = async () => {
  const [tAgg, uAgg, assets, sessCount, msgCount, topConsumers, timeline] = await Promise.all([
    ChatMessage.aggregate([
      { $group: { _id: null, p: { $sum: { $ifNull: ["$tokensUsed.prompt", 0] } }, c: { $sum: { $ifNull: ["$tokensUsed.completion", 0] } }, t: { $sum: { $ifNull: ["$tokensUsed.total", 0] } } } }
    ]),
    User.aggregate([{ $group: { _id: null, t: { $sum: { $ifNull: ["$totalTokensUsed", 0] } } } }]),
    Asset.find().select("bytes format"),
    ChatSession.countDocuments(),
    ChatMessage.countDocuments(),
    User.find({ totalTokensUsed: { $gt: 0 } }).sort({ totalTokensUsed: -1 }).limit(5).select("name email totalTokensUsed role"),
    getTimeline({})
  ]);

  const p = tAgg[0]?.p || 0;
  const c = tAgg[0]?.c || 0;
  const total = Math.max(tAgg[0]?.t || 0, uAgg[0]?.t || 0);

  return {
    tokens: { prompt: p, completion: c, total },
    storage: aggregateAssets(assets),
    sessionsCount: sessCount,
    messagesCount: msgCount,
    cost: calcCost(p, c, total),
    topConsumers,
    timeline
  };
};

export default { getUserMetrics, getAdminPlatformMetrics };
