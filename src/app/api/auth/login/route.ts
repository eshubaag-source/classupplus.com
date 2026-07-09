import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username, password } = await req.json(); // username can be Admin username OR Teacher email

    // Check if admin exists by username
    let user: any = await Admin.findOne({ username });
    let role = 'admin';

    // If not found in admin, check in Teacher collection using email
    if (!user) {
      user = await Teacher.findOne({ email: username });
      role = 'teacher';
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ message: 'Account is not configured for login. Please set a password.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown Device';
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown IP';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    const { Session } = await import('@/models/Session');
    const newSession = await Session.create({
      userId: user._id,
      role,
      userAgent,
      ipAddress,
      expiresAt,
    });

    const tokenPayload = {
      id: user._id,
      username: role === 'admin' ? user.username : user.email,
      role,
      adminId: role === 'admin' ? user._id : user.adminId,
      sessionId: newSession._id,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1d',
    });

    const response = NextResponse.json({
      message: 'Logged in successfully',
      otpRequired: false,
      role
    }, { status: 200 });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
