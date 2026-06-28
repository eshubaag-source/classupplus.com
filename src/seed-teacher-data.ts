import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Teacher } from './models/Teacher';
import Student from './models/Student';
import Fees from './models/Fees';
import { VehicleFee } from './models/VehicleFee';
import Attendance from './models/Attendance';

dotenv.config({ path: '.env.local' });

async function seedData() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to DB');

  const email = 'ishwarchand.baag@school.com';
  const teacher = await Teacher.findOne({ email });

  if (!teacher) {
    console.log(`Teacher with email ${email} not found.`);
    process.exit(1);
  }

  const adminId = teacher.adminId;
  console.log(`Found teacher. Admin ID: ${adminId}`);

  // 1. Create Students
  const studentsToCreate = [
    { name: 'Aarav Patel', fatherName: 'Rahul Patel', rollNumber: 'R101', grade: '10th', section: 'A', parentContact: '9876543210', adminId },
    { name: 'Diya Sharma', fatherName: 'Amit Sharma', rollNumber: 'R102', grade: '10th', section: 'A', parentContact: '9876543211', adminId },
    { name: 'Rohan Gupta', fatherName: 'Vikram Gupta', rollNumber: 'R103', grade: '9th', section: 'B', parentContact: '9876543212', adminId }
  ];

  // Clear existing dummy students for this admin to avoid duplicates if run multiple times (optional, but let's just insert new ones)
  const students = await Student.insertMany(studentsToCreate);
  console.log(`Created ${students.length} students.`);

  // 2. Create Attendance for today
  const today = new Date().toISOString().split('T')[0];
  const attendanceRecords = students.map((student, index) => ({
    studentId: student._id,
    adminId,
    date: today,
    status: index === 2 ? 'Absent' : 'Present' // Make one student absent
  }));
  await Attendance.insertMany(attendanceRecords);
  console.log(`Created ${attendanceRecords.length} attendance records for today.`);

  // 3. Create Fees
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const previousMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString('default', { month: 'long', year: 'numeric' });

  const feeRecords = [
    { studentId: students[0]._id, adminId, amount: 2500, month: currentMonth, status: 'Paid', paidDate: new Date(), description: 'Tuition Fee' },
    { studentId: students[1]._id, adminId, amount: 2500, month: currentMonth, status: 'Pending', description: 'Tuition Fee' },
    { studentId: students[2]._id, adminId, amount: 2000, month: previousMonth, status: 'Paid', paidDate: new Date(), description: 'Tuition Fee' }
  ];
  await Fees.insertMany(feeRecords);

  // 4. Create Vehicle Fees
  const vehicleFeeRecords = [
    { studentId: students[0]._id, adminId, amount: 800, month: currentMonth, status: 'Paid', paidDate: new Date(), category: 'vehicle', description: 'Bus Route A' },
    { studentId: students[2]._id, adminId, amount: 500, month: currentMonth, status: 'Pending', category: 'vehicle', description: 'Van Route C' }
  ];
  await VehicleFee.insertMany(vehicleFeeRecords);

  console.log('Seed data successfully generated!');
  process.exit(0);
}

seedData().catch(console.error);
