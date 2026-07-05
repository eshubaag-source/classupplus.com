import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username, schoolName, email, mobileNumber, password } = await req.json();

    if (!username || !schoolName || !email || !mobileNumber || !password) {
      return NextResponse.json({ message: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    // Check if username already exists
    const existingUsername = await Admin.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ message: 'Username is already taken. Please choose a different one.' }, { status: 400 });
    }

    // Check if school name already has an admin account
    const existingSchool = await Admin.findOne({ schoolName: { $regex: new RegExp(`^${schoolName.trim()}$`, 'i') } });
    if (existingSchool) {
      return NextResponse.json({ message: `An admin account for "${schoolName}" already exists. Each school can only have one admin.` }, { status: 400 });
    }

    // Check if email already exists
    const existingEmailAdmin = await Admin.findOne({ email });
    const existingEmailTeacher = await Teacher.findOne({ email });
    if (existingEmailAdmin || existingEmailTeacher) {
      return NextResponse.json({ message: 'Email is already registered.' }, { status: 400 });
    }

    // Check if mobile number already exists
    const existingMobileAdmin = await Admin.findOne({ mobileNumber });
    const existingMobileTeacher = await Teacher.findOne({ phone: mobileNumber });
    if (existingMobileAdmin || existingMobileTeacher) {
      return NextResponse.json({ message: 'Mobile number is already registered.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.create({
      username,
      schoolName: schoolName.trim(),
      email,
      mobileNumber,
      password: hashedPassword,
    });

    return NextResponse.json({ message: 'Admin account created successfully' }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      // Identify which field caused the duplicate
      const field = error.keyPattern;
      if (field?.schoolName) {
        return NextResponse.json({ message: 'An admin account for this school already exists. Each school can only have one admin.' }, { status: 400 });
      }
      if (field?.username) {
        return NextResponse.json({ message: 'Username is already taken. Please choose a different one.' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Account already exists with these details.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Registration failed' }, { status: 500 });
  }
}
