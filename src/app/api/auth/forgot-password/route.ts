import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';
import Otp from '@/models/Otp';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ message: 'Username or Email is required.' }, { status: 400 });
    }

    let user: any = await Admin.findOne({
      $or: [
        { username: username.trim() },
        { email: username.trim() }
      ]
    });
    let role: 'admin' | 'teacher' = 'admin';

    if (!user) {
      user = await Teacher.findOne({ email: username.trim() });
      role = 'teacher';
    }

    if (!user) {
      return NextResponse.json({ message: 'No account found with that username or email.' }, { status: 404 });
    }

    const destination = user.email;

    if (!destination) {
      return NextResponse.json({
        message: 'No registered email address found for this account.'
      }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this user
    await Otp.deleteMany({ userId: user._id });

    // Store OTP in the DB, expires in 5 minutes
    await Otp.create({
      userId: user._id,
      userType: role,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send the OTP via email
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Classupplus" <${process.env.SMTP_USER || 'noreply@school.com'}>`,
        to: destination,
        subject: 'Reset Password OTP',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Use the following One-Time Password (OTP) to proceed:</p>
            <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px 20px; border-radius: 5px; display: inline-block; margin: 10px 0;">
              ${otpCode}
            </div>
            <p>This OTP is valid for 5 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`Reset password email sent successfully to ${destination}`);
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
    }

    const responsePayload: any = {
      message: 'Verification code has been successfully sent to your registered email address.',
    };

    // Return OTP in response payload for dev environment testing convenience
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.serverOtp = otpCode;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to process forgot password request.' }, { status: 500 });
  }
}
