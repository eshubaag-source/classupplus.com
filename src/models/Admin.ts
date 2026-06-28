import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  schoolName: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  mobileNumber: { type: String, default: '' },
  twilioAccountSid: { type: String, default: '' },
  twilioAuthToken: { type: String, default: '' },
  twilioSmsNumber: { type: String, default: '' },
  twilioWhatsappNumber: { type: String, default: '' },
  smsEnabled: { type: Boolean, default: true },
  whatsappEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
