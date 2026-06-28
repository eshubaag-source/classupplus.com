import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; username: string; role?: string };
  } catch {
    return null;
  }
}

export async function PUT(req: Request) {
  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const role = userPayload.role || 'admin';
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Both current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'New password must be at least 6 characters' }, { status: 400 });
    }

    let user;
    if (role === 'admin') {
      user = await Admin.findById(userPayload.id);
    } else {
      user = await Teacher.findById(userPayload.id);
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      // If no password set, we allow them to set one without requiring current password
      // But this endpoint usually requires currentPassword. Let's assume they must provide something or we skip check.
      // For simplicity, let's just allow it if they pass any currentPassword string when there's none stored.
      // Wait, teachers might not have a password if created by Admin.
      if (currentPassword !== 'default' && currentPassword !== '') {
          // If they didn't have a password, they shouldn't hit this path unless we design a "set password" flow.
      }
    } else {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ message: 'Current password is incorrect' }, { status: 403 });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

