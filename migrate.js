const mongoose = require('mongoose');

async function migrate() {
  try {
    await mongoose.connect('mongodb://eshubaag_db_user:Eshutata2000@ac-01f8eak-shard-00-00.plj3uqm.mongodb.net:27017,ac-01f8eak-shard-00-01.plj3uqm.mongodb.net:27017,ac-01f8eak-shard-00-02.plj3uqm.mongodb.net:27017/?ssl=true&replicaSet=atlas-lu1z73-shard-0&authSource=admin&appName=schoolmanagement/test');
    const db = mongoose.connection.db;
    const oldAdminId = new mongoose.Types.ObjectId('6a44839edd6936892076bae2');
    const adminDoc = await db.collection('admins').findOne({ username: 'admin' });
    
    if (!adminDoc) {
      console.log('Admin not found');
      process.exit(1);
    }
    
    const newAdminId = adminDoc._id;
    const collectionsToUpdate = [
      'students', 'teachers', 'attendances', 'fees', 
      'vehiclefees', 'timetables', 'teachersalaries', 'classfees'
    ];
    
    for (const col of collectionsToUpdate) {
      const result = await db.collection(col).updateMany(
        { adminId: oldAdminId },
        { $set: { adminId: newAdminId } }
      );
      console.log(`Updated ${result.modifiedCount} records in ${col}`);
    }
    
    console.log('Data migration complete! Please refresh your dashboard.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
