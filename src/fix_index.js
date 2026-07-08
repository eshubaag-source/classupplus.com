const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('vehicles');
    
    // Check if the index exists
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);
    
    const indexName = 'adminId_1_vehicleNumber_1';
    const indexExists = indexes.some(idx => idx.name === indexName);
    
    if (indexExists) {
      await collection.dropIndex(indexName);
      console.log(`Dropped index: ${indexName}`);
      
      // Re-create the index without unique constraint
      await collection.createIndex({ adminId: 1, vehicleNumber: 1 });
      console.log('Re-created index without unique constraint');
    } else {
      console.log('Index not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

fixIndex();
