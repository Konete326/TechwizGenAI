import mongoose from 'mongoose';

const clientAppSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['CDN', 'SDK'], required: true },
  code: { type: String, required: true },
  domain: { type: String },
  status: { type: String, default: 'Inactive' },
  appName: { type: String, default: 'My Web Application' },
  appCategory: { type: String, default: 'POS' },
  powers: {
    autoCapture: { type: Boolean, default: true },
    selfLearning: { type: Boolean, default: true },
    formFilling: { type: Boolean, default: true },
    navigation: { type: Boolean, default: true },
    dynamicModals: { type: Boolean, default: true },
    spotlightGuidance: { type: Boolean, default: true }
  },
  customInstructions: { type: String, default: '' },
  voiceName: { type: String, default: 'Aoede' },
  domData: { type: mongoose.Schema.Types.Mixed },
  elementsCount: { type: Number, default: 0 },
  frontendUrl: { type: String, default: 'https://techwiz-gen-ai.vercel.app' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const ClientApp = mongoose.model('ClientApp', clientAppSchema);
