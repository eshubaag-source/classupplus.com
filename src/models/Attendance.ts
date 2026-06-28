import mongoose from 'mongoose';

const AttendanceSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound index to ensure unique attendance per student per day
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
