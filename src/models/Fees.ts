import mongoose from 'mongoose';

const FeesSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  month: { type: String, required: true }, // e.g., "January 2024"
  paidDate: { type: Date },
  description: { type: String },
  utr: { type: String },
  lastyear: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Fees || mongoose.model('Fees', FeesSchema);
