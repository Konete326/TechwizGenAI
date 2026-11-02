import mongoose from 'mongoose';

const workspaceFileSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'text/plain',
      trim: true
    }
  },
  { _id: false }
);

const workspaceRevisionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkspaceProject',
      required: true,
      index: true
    },
    clientId: {
      type: String,
      default: null,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    summary: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300
    },
    files: {
      type: [workspaceFileSchema],
      required: true
    },
    filesCount: {
      type: Number,
      default: 0
    },
    totalSize: {
      type: Number,
      default: 0
    },
    sourceHash: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

workspaceRevisionSchema.index({ projectId: 1, version: 1 }, { unique: true });
workspaceRevisionSchema.index({ projectId: 1, version: -1 });

export const WorkspaceRevision = mongoose.model('WorkspaceRevision', workspaceRevisionSchema);
export default WorkspaceRevision;
