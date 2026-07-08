import dbConnect from './src/lib/db.js';
import { Vehicle } from './src/models/Vehicle.js';
import mongoose from 'mongoose';

async function fix() {
  try {
    await dbConnect();
    console.log('Connected via dbConnect');
    
    // We can also drop the index directly using mongoose models
    try {
      await Vehicle.collection.dropIndex('adminId_1_vehicleNumber_1');
      console.log('Dropped unique index adminId_1_vehicleNumber_1');
    } catch (err) {
      console.log('Index drop error (might not exist):', err.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
