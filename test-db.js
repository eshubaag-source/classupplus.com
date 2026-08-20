const mongoose = require('mongoose');
const path = require('path');
// setup env
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to", mongoose.connection.db.databaseName);
  
  const Fees = mongoose.connection.db.collection('fees');
  const ClassFee = mongoose.connection.db.collection('classfees');
  const Student = mongoose.connection.db.collection('students');
  
  const studentG = await Student.findOne({ name: /GHJKGF/i });
  if (studentG) {
     console.log("Found student GHJKGF:", studentG);
     const studentFees = await Fees.find({ studentId: studentG._id }).toArray();
     console.log("Fees for student:", studentFees);
     const classFees = await ClassFee.find({ adminId: studentG.adminId }).toArray();
     console.log("ClassFees for admin:", classFees);
  } else {
     console.log("No student GHJKGF found");
  }
  process.exit(0);
}
run().catch(console.error);
