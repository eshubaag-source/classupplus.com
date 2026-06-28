import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  grade: { type: String, default: '' },
  section: { type: String, default: '' },
  schoolName: { type: String, required: true },
  aadhaarNumber: { type: String },
  qualification: { type: String },
  subject: { type: String },
  password: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
