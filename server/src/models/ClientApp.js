import mongoose from 'mongoose';

const clientAppSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['CDN', 'SDK'], required: true },
  code: { type: String, required: true },
  domain: { type: String }, // For Origin validation (Trust on First Use)
  status: { type: String, default: 'Inactive' },
  domData: { type: mongoose.Schema.Types.Mixed },
  elementsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const ClientApp = mongoose.model('ClientApp', clientAppSchema);
