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

    const tempToken = jwt.sign({
      id: user._id,
      role,
      temp: true
    }, JWT_SECRET, { expiresIn: '5m' });

    const userEmail = user.email || '';
    const userPhone = role === 'admin' ? (user.mobileNumber || '') : (user.phone || '');

    function maskEmail(emailStr: string): string {
      if (!emailStr) return 'Not configured';
      const [local, domain] = emailStr.split('@');
      if (!domain) return emailStr;
      if (local.length <= 3) {
        return `${local[0]}***@${domain}`;
      }
      return `${local.substring(0, 3)}***@${domain}`;
    }

    function maskPhone(phoneStr: string): string {
      if (!phoneStr) return 'Not configured';
      const clean = phoneStr.replace(/\s+/g, '');
      if (clean.length <= 4) return clean;
      return `${'*'.repeat(clean.length - 4)}${clean.substring(clean.length - 4)}`;
    }

    return NextResponse.json({
      message: 'Credentials verified. OTP verification required.',
      otpRequired: true,
      tempToken,
      email: userEmail,
      phone: userPhone,
      maskedEmail: maskEmail(userEmail),
      maskedPhone: maskPhone(userPhone),
      role
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
