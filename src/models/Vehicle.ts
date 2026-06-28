import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVehicle extends Document {
  adminId: Types.ObjectId;   // reference to Admin collection
  vehicleNumber: string;     // e.g., 'RJ-01-AB-1234'
  city: string;              // city / route area this vehicle covers
  totalFees: number;         // monthly fee amount charged for this vehicle
  driverNumber?: string;     // optional driver contact number
  description?: string;      // optional notes (driver name, route, etc.)
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    vehicleNumber: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    totalFees: { type: Number, required: true, min: 0 },
    driverNumber: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// A vehicle number must be unique per school
VehicleSchema.index({ adminId: 1, vehicleNumber: 1 }, { unique: true });

export const Vehicle =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);
