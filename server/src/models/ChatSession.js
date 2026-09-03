import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
      maxlength: 100
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export default ChatSession;
