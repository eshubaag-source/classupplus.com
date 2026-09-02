import mongoose from 'mongoose';
          
const StudentSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  name: { type: String, required: true }, 
  fatherName: { type: String, required: true },
  rollNumber: { type: String, required: true },
  grade: { type: String, required: true },
  section: { type: String, required: true },
  parentContact: { type: String },
  note: { type: String, required: false },
  // lastFeesAmount: { type: Number, default: 0 },
  subjectPaperNumber: { type: String, default: '' },
  subject: { type: String, default: '' },
  totalNumber: { type: String, default: '' },
  classPaperMarks: [{
    subject: { type: String, default: '' },
    totalNumber: { type: String, default: '' },
    subjectPaperNumber: { type: String, default: '' },
    date: { type: String, default: '' },
  }],
  createdAt: { type: Date, default: Date.now },
});

// Roll number unique per class (grade + section), NOT school-wide.
// e.g. roll 14 can exist in Class 11 AND Class 12 simultaneously.
StudentSchema.index({ adminId: 1, grade: 1, section: 1, rollNumber: 1 }, { unique: true });

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

export default Student;
