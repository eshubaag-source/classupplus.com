import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['admin', 'teacher'], required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// TTL index to automatically expire OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
