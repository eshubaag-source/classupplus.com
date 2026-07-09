import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  userAgent: { type: String, default: 'Unknown Device' },
  ipAddress: { type: String, default: 'Unknown IP' },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
