import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ["user", "model"],
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    attachment: {
      type: String,
      default: null
    },
    attachmentType: {
      type: String,
      enum: ["image", "document", "none"],
      default: "none"
    },
    attachmentName: {
      type: String,
      default: null
    },
    images: {
      type: [String],
      default: []
    },
    documents: {
      type: [{ name: String, data: String, mimeType: String, size: Number }],
      default: []
    },
    tokensUsed: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
export default ChatMessage;
