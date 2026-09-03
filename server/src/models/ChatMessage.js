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
