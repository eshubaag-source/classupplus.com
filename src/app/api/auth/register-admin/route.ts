import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';
import Admin from '@/models/Admin';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { name, email, phone, schoolName, password, grade, section } = await req.json();

    if (!name || !email || !phone || !schoolName || !password) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    // Check if teacher with email already exists
    const existingTeacher = await Teacher.findOne({ email });
    const existingAdminEmail = await Admin.findOne({ email });
    if (existingTeacher || existingAdminEmail) {
      return NextResponse.json({ message: 'Email is already registered.' }, { status: 400 });
    }

    // Check if teacher with phone already exists
    const existingPhone = await Teacher.findOne({ phone });
    const existingAdminPhone = await Admin.findOne({ mobileNumber: phone });
    if (existingPhone || existingAdminPhone) {
      return NextResponse.json({ message: 'Phone number is already registered.' }, { status: 400 });
    }

    // Find the admin associated with this schoolName
    const admin = await Admin.findOne({ schoolName: new RegExp(`^${schoolName}$`, 'i') });
    if (!admin) {
      return NextResponse.json({ message: 'School not found. Please check the school name.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newTeacher = await Teacher.create({
      adminId: admin._id,
      name,
      email,
      phone,
      grade: grade || '',
      section: section || '',
      schoolName: admin.schoolName, // normalize casing
      password: hashedPassword
    });

    return NextResponse.json({ message: 'Teacher account created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Registration failed' }, { status: 500 });
  }
}
