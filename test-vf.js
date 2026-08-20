const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const VehicleFee = mongoose.connection.db.collection('vehiclefees');
  const fees = await VehicleFee.find({}).sort({ createdAt: -1 }).limit(5).toArray();
  console.log("Latest Vehicle Fees:");
  fees.forEach(f => {
    console.log(f._id, "amount:", f.amount, "lastyear:", f.lastyear, "lasyearamount:", f.lasyearamount);
  });
  process.exit(0);
}
run().catch(console.error);
