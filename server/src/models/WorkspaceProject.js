import mongoose from 'mongoose';

const workspaceProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    clientId: {
      type: String,
      default: null,
      index: true
    },
    framework: {
      type: String,
      default: 'react',
      enum: ['react', 'vite', 'next', 'vanilla', 'vue', 'node']
    },
    activeVersion: {
      type: Number,
      default: 0
    },
    totalRevisions: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active'
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
    versionKey: false
  }
);

workspaceProjectSchema.index({ userId: 1, _id: 1 });
workspaceProjectSchema.index({ userId: 1, createdAt: -1 });
workspaceProjectSchema.index({ userId: 1, status: 1 });

export const WorkspaceProject = mongoose.model('WorkspaceProject', workspaceProjectSchema);
export default WorkspaceProject;
