import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVehicleFee extends Document {
  adminId: Types.ObjectId; // reference to Admin collection
  studentId: Types.ObjectId; // reference to Student collection
  fatherName: string;
  amount: number; // fee amount paid by the student this month
  month: string; // e.g., '2024-09' or 'September 2024'
  status: 'Pending' | 'Paid' | 'Overdue';
  city?: string; // city / route area this vehicle covers
  busNumber?: string; // vehicle / bus registration number
  totalFees?: number; // fixed monthly fee for this bus route
  description?: string;
  category: 'vehicle'; // fixed value to differentiate from other fee types
  paidDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleFeeSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    fatherName: { type: String, ref: 'FatherName', required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue'],
      default: 'Pending',
    },
    city: { type: String, trim: true },
    busNumber: { type: String, trim: true },
    totalFees: { type: Number, min: 0 },
    description: { type: String },
    category: { type: String, default: 'vehicle', immutable: true },
    paidDate: { type: Date },
  },
  { timestamps: true }
);

export const VehicleFee = mongoose.models.VehicleFee || mongoose.model<IVehicleFee>('VehicleFee', VehicleFeeSchema);
 