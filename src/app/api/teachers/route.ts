import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';
import { getAdminId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const teachers = await Teacher.find({ adminId }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(teachers);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const payload = await request.json();
    
    // Simple validation
    if (!payload.name || !payload.email || !payload.phone || !payload.grade || !payload.section || !payload.schoolName) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    // Check for unique email
    const existingTeacher = await Teacher.findOne({ email: payload.email });
    if (existingTeacher) {
      return NextResponse.json({ message: 'A teacher with this email already exists.' }, { status: 400 });
    }

    let hashedPassword;
    if (payload.password) {
      hashedPassword = await bcrypt.hash(payload.password, 10);
    }

    const newTeacher = new Teacher({ ...payload, adminId, ...(hashedPassword && { password: hashedPassword }) });
    await newTeacher.save();
    
    return NextResponse.json(newTeacher, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create teacher' }, { status: 500 });
  }
}
