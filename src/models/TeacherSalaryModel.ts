import mongoose from 'mongoose';

const TeacherSalarySchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  month: { type: String, required: true }, // formatted as YYYY-MM, e.g., "2026-07"
  paidDate: { type: Date },
  paymentMode: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'], default: 'Cash' },
  note: { type: String, default: '' }, 
  createdAt: { type: Date, default: Date.now },
});

// Compound index to ensure uniqueness per teacher per month
TeacherSalarySchema.index({ teacherId: 1, month: 1 }, { unique: true });

export default mongoose.models.TeacherSalary || mongoose.model('TeacherSalary', TeacherSalarySchema);
