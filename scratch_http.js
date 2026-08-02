import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({}));
  const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}));
  const admin = await Admin.findOne();
  const students = await Student.find({ adminId: admin._id }).limit(2);
  
  const studentIds = students.map(s => s._id.toString());
  const messages = {};
  students.forEach(s => {
    messages[s._id.toString()] = "Test class paper message for " + s.name;
  });

  const body = {
    studentIds,
    type: 'SMS',
    category: 'ClassPaper',
    message: messages
  };

  const res = await fetch('http://localhost:3000/api/notifications/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
  
  process.exit(0);
}
test().catch(console.error);
