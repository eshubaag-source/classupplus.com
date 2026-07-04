const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false }).then(async () => {
  const db = mongoose.connection.db;
  const admins = await db.collection('admins').find({}).toArray();
  const teachers = await db.collection('teachers').find({}).toArray();
  console.log('ADMINS:', admins.map(a => ({ id: a._id, username: a.username, email: a.email })));
  console.log('TEACHERS:', teachers.map(t => ({ id: t._id, name: t.name, email: t.email })));
  process.exit(0);
});
