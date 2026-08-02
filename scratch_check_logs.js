import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const NotificationLogSchema = new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    recipient: { type: String, required: true },
    type: { type: String, enum: ['SMS', 'WhatsApp', 'Both'], required: true },
    category: { type: String, enum: ['Attendance', 'Fee', 'VehicleFee', 'Custom', 'ClassPaper', 'other'], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['Sent', 'Simulated', 'Failed'], default: 'Simulated' },
    error: { type: String },
    createdAt: { type: Date, default: Date.now }
  });
  
  const NotificationLog = mongoose.models.NotificationLog || mongoose.model('NotificationLog', NotificationLogSchema);

  const logs = await NotificationLog.find();
  console.log(`Total notifications: ${logs.length}`);
  
  const categories = await NotificationLog.distinct('category');
  console.log(`Distinct categories:`, categories);

  process.exit(0);
}

check().catch(console.error);
