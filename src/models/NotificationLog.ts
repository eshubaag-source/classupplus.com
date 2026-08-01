import mongoose, { Schema } from 'mongoose';

const NotificationLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  recipient: { type: String, required: true },
  type: { type: String, enum: ['SMS', 'WhatsApp', 'Both'], required: true },
  category: { type: String, enum: ['Attendance', 'Fee', 'VehicleFee', 'Custom', 'ClassPaper', 'other'], required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Sent', 'Simulated', 'Failed'], default: 'Simulated' },
  error: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const NotificationLog = mongoose.models.NotificationLog || mongoose.model('NotificationLog', NotificationLogSchema);
