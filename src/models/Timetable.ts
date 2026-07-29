import mongoose from 'mongoose';

const TimetableSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  day: { type: String, required: true }, // e.g., 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  periodNumber: { type: String, required: true }, // e.g., '1', '2', '3'
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  section: { type: String, required: true },
  startTime: { type: String, required: true }, // e.g., '09:00' or '09:00 AM'
  endTime: { type: String, required: true },   // e.g., '09:45' or '09:45 AM'
  roomNumber: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export const Timetable = mongoose.models.Timetable || mongoose.model('Timetable', TimetableSchema);
export default Timetable;
