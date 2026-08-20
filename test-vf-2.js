const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const VehicleFee = mongoose.connection.db.collection('vehiclefees');
  // find the fee for eshu with amount 5000
  const fee = await VehicleFee.findOne({ amount: 5000 });
  console.log("Vehicle fee found:", fee);
  process.exit(0);
}
run().catch(console.error);
