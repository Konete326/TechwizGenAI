import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    format: {
      type: String,
      required: true
    },
    bytes: {
      type: Number,
      required: true
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

assetSchema.index({ title: "text" });

export const Asset = mongoose.model("Asset", assetSchema);
export default Asset;
