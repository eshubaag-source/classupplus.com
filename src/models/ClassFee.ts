import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClassFee extends Document {
  adminId: Types.ObjectId;
  grade: string;
  subject?: string;
  amount: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassFeeSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    grade: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// A grade+subject combo must be unique per school (allows Class 11 Science and Class 11 Commerce as separate entries)
ClassFeeSchema.index({ adminId: 1, grade: 1, subject: 1 }, { unique: true });

export const ClassFee =
  mongoose.models.ClassFee || mongoose.model<IClassFee>('ClassFee', ClassFeeSchema);

// One-time migration: drop the old grade-only unique index if it still exists.
// The new index (adminId + grade + subject) replaces it, allowing separate fee
// entries per subject for Classes 11 & 12.
ClassFee.collection
  .dropIndex('adminId_1_grade_1')
  .catch(() => {
    // Index doesn't exist (already dropped or never created) — ignore silently.
  });

