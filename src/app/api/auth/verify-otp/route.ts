import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';
import Otp from '@/models/Otp';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: Request) {
  try {
    const { tempToken, otp } = await req.json();

    if (!tempToken || !otp) {
      return NextResponse.json({ message: 'Token and OTP code are required.' }, { status: 400 });
    }

    // Verify tempToken
    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: 'Session expired or invalid.' }, { status: 401 });
    }

    if (!decoded.temp) {
      return NextResponse.json({ message: 'Invalid session for OTP verification.' }, { status: 401 });
    }

    await dbConnect();

    // Check if OTP matches and is active (not expired)
    const activeOtp = await Otp.findOne({
      userId: decoded.id,
      otp: otp.trim(),
      expiresAt: { $gt: new Date() },
    });

    if (!activeOtp) {
      return NextResponse.json({ message: 'Invalid or expired OTP code. Please try again.' }, { status: 400 });
    }

    // Delete verified OTP so it cannot be reused
    await Otp.deleteOne({ _id: activeOtp._id });

    // Fetch the user information to construct the final session JWT
    let user: any;
    if (decoded.role === 'admin') {
      user = await Admin.findById(decoded.id);
    } else if (decoded.role === 'teacher') {
      user = await Teacher.findById(decoded.id);
    }

    if (!user) {
      return NextResponse.json({ message: 'User account not found.' }, { status: 404 });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown Device';
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    const { Session } = await import('@/models/Session');
    const newSession = await Session.create({
      userId: user._id,
      role: decoded.role,
      userAgent,
      ipAddress,
      expiresAt,
    });

    // Sign the final session JWT token (same payload as original credentials check)
    const tokenPayload = {
      id: user._id,
      username: decoded.role === 'admin' ? user.username : user.email,
      role: decoded.role,
      adminId: decoded.role === 'admin' ? user._id : user.adminId,
      sessionId: newSession._id,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1d',
    });

    const response = NextResponse.json(
      { message: 'Logged in successfully', role: decoded.role },
      { status: 200 }
    );

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Verification failed.' }, { status: 500 });
  }
}
