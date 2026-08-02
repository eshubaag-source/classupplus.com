import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testBulk() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({}));
  const Student = mongoose.models.Student || mongoose.model('Student', new mongoose.Schema({}));
  
  const admin = await Admin.findOne();
  if (!admin) {
    console.log("No admin found");
    return;
  }
  
  const students = await Student.find({ adminId: admin._id }).limit(2);
  if (students.length === 0) {
    console.log("No students found");
    return;
  }
  
  const studentIds = students.map(s => s._id.toString());
  const messages = {};
  students.forEach(s => {
    messages[s._id.toString()] = "Test class paper message for " + s.name;
  });
  
  console.log("studentIds:", studentIds);
  console.log("messages:", messages);
  
  // Replicate bulk logic
  const results = [];
  for (const student of students) {
    const studentMessage = typeof messages === 'string' ? messages : (messages[student._id.toString()] || '');
    if (!studentMessage) {
      results.push({ studentId: student._id, success: false, error: 'No message provided for this student' });
      continue;
    }
    
    // Simulate sendNotification call
    let message = studentMessage;
    message = `[${admin.schoolName}] ${message}`;
    message = message.replace(/\[Student Name\]/gi, student.name || 'your child');
    const rawContact = student.parentContact;
    if (!rawContact) {
      console.log(`[Notification Alert] No parent contact found for student: ${student.name}`);
      results.push({ success: false, error: 'No contact number' });
      continue;
    }
    
    results.push({ success: true, message });
  }
  
  console.log(results);
  process.exit(0);
}

testBulk().catch(console.error);
