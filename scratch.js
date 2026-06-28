const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false }).then(async () => {
  const db = mongoose.connection.db;
  const admins = await db.collection('admins').find({}).toArray();
  
  // also check all collection names
  const collections = await db.listCollections().toArray();
  
  process.exit(0);
}).catch(err => {
  process.exit(1);
});
