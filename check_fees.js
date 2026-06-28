const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false }).then(async () => {
  const db = mongoose.connection.db;
  const fees = await db.collection('fees').find({}).toArray();
  const vehicleFees = await db.collection('vehiclefees').find({}).toArray();
  process.exit(0);
});
