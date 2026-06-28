import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkFees() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  
  const db = mongoose.connection.db;
  if (!db) {
    process.exit(1);
  }
  
  const fees = await db.collection('fees').find({}).toArray();
  if (fees.length > 0) {
    
    const feesWithAdminId = fees.filter(f => f.adminId);
  }
  
  process.exit(0);
}

checkFees().catch(console.error);
