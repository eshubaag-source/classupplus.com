import dbConnect from './src/lib/db.js';
import mongoose from 'mongoose';
import Student from './src/models/Student.js';
import { Teacher } from './src/models/Teacher.js';
import Admin from './src/models/Admin.js';
import Attendance from './src/models/Attendance.js';
import 'dotenv/config';

async function run() {
  await dbConnect();
  const teacher = await Teacher.findOne();
  if (!teacher) {
    console.log('No teacher found');
    process.exit(1);
  }
  console.log('Found teacher:', teacher.name, 'AdminId:', teacher.adminId, 'AssignedClasses:', teacher.assignedClasses);
  
  const student = await Student.findOne({ adminId: teacher.adminId });
  if (!student) {
    console.log('No student found');
    process.exit(1);
  }
  
  console.log('Found student:', student.name, 'Grade:', student.grade, 'Section:', student.section, 'TeacherId:', student.teacherId);
  
  // check logic
  let authorized = false;
  if (teacher.grade && teacher.section && student.grade === teacher.grade && student.section === teacher.section) {
    authorized = true;
    console.log('Authorized by teacher.grade/section');
  } else if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    for (const cls of teacher.assignedClasses) {
      if (cls.grade === student.grade && cls.section === student.section) {
        authorized = true;
        console.log('Authorized by assignedClasses');
      }
    }
  } else if (student.teacherId && student.teacherId.toString() === teacher._id.toString()) {
    authorized = true;
    console.log('Authorized by teacherId fallback');
  }

  console.log('Is Authorized?', authorized);
  
  process.exit(0);
}
run();
