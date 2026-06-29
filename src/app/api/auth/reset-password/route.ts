import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';
import Otp from '@/models/Otp';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username, otp, newPassword } = await req.json();

    if (!username || !otp || !newPassword) {
      return NextResponse.json({ message: 'Username/Email, verification code, and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Find the user: can be Admin or Teacher
    // Admin: match username or email
    // Teacher: match email
    let user: any = await Admin.findOne({
      $or: [
        { username: username.trim() },
        { email: username.trim() }
      ]
    });
    let role = 'admin';

    if (!user) {
      user = await Teacher.findOne({ email: username.trim() });
      role = 'teacher';
    }

    if (!user) {
      return NextResponse.json({ message: 'No account found with that username or email.' }, { status: 404 });
    }

    // Find active, unexpired OTP code
    const activeOtp = await Otp.findOne({
      userId: user._id,
      otp: otp.trim(),
      expiresAt: { $gt: new Date() },
    });

    if (!activeOtp) {
      return NextResponse.json({ message: 'Invalid or expired verification code. Please try again.' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save user password
    user.password = hashedPassword;
    await user.save();

    // Delete verified OTP so it cannot be used again
    await Otp.deleteOne({ _id: activeOtp._id });

    return NextResponse.json({ message: 'Password has been reset successfully. You can now log in.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to reset password.' }, { status: 500 });
  }
}
