import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';
import Otp from '@/models/Otp';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: Request) {
  try {
    const { tempToken, method } = await req.json();

    if (!tempToken || !method) {
      return NextResponse.json({ message: 'Token and delivery method are required.' }, { status: 400 });
    }

    if (method !== 'email' && method !== 'phone') {
      return NextResponse.json({ message: 'Invalid delivery method.' }, { status: 400 });
    }

    // Verify tempToken
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
    }

    if (!decoded.temp) {
      return NextResponse.json({ message: 'Invalid session for OTP generation.' }, { status: 401 });
    }

    await dbConnect();

    // Find the user destination
    let destination = '';
    if (decoded.role === 'admin') {
      const user = await Admin.findById(decoded.id);
      if (!user) {
        return NextResponse.json({ message: 'Admin account not found.' }, { status: 404 });
      }
      destination = method === 'email' ? user.email : user.mobileNumber;
    } else if (decoded.role === 'teacher') {
      const user = await Teacher.findById(decoded.id);
      if (!user) {
        return NextResponse.json({ message: 'Teacher account not found.' }, { status: 404 });
      }
      destination = method === 'email' ? user.email : user.phone;
    } else {
      return NextResponse.json({ message: 'Invalid user role.' }, { status: 400 });
    }

    if (!destination) {
      return NextResponse.json({ message: `No registered ${method} found for this account.` }, { status: 400 });
    }

    // Generate random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any previous OTPs for this user
    await Otp.deleteMany({ userId: decoded.id });

    // Store OTP (valid for 5 minutes)
    await Otp.create({
      userId: decoded.id,
      userType: decoded.role,
      otp: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Send the OTP
    if (method === 'email') {
      try {
        const nodemailer = require('nodemailer');
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
          subject: 'Your Login OTP',
          html: `<p>Your OTP for login is: <strong>${otpCode}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
        });
        console.log(`Email sent successfully to ${destination}`);
      } catch (emailError: any) {
        console.error('Email sending failed:', emailError);
        // Continue anyway in dev, but maybe fail in prod if you want strictly
      }
    } else {
      // Phone / SMS logic would go here (e.g. Twilio, AWS SNS)
      console.log(`[SMS MOCK] Sending OTP ${otpCode} to phone ${destination}`);
    }

    const responsePayload: any = {
      message: `OTP has been successfully sent to your ${method === 'email' ? 'email address' : 'phone number'}.`,
    };

    // Return OTP in response payload for dev environment testing convenience
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.serverOtp = otpCode;
    }

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to send OTP.' }, { status: 500 });
  }
}
