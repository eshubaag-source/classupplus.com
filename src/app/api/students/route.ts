import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import { Teacher } from '@/models/Teacher';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const adminId = payload.adminId;
    let query: any = { adminId };
    console.log('STUDENT QUERY payload:', payload);
    console.log('STUDENT QUERY adminId:', adminId);

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
      query = { ...query, ...classFilter };
    }

    const students = await Student.find(query).sort({ name: 1 });
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const adminId = payload.adminId;
    const body = await req.json();

    if (payload.role === 'teacher') {
      const teacher = await Teacher.findById(payload.id);
      if (!teacher) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      // Auto-assign student grade/section to match teacher class
      body.grade = teacher.grade;
      body.section = teacher.section;
    }

    // Check roll number uniqueness within the same class (grade + section)
    const duplicate = await Student.findOne({
      adminId,
      grade: body.grade,
      section: body.section,
      rollNumber: body.rollNumber,
    });
    if (duplicate) {
      return NextResponse.json(
        { message: `Roll number ${body.rollNumber} is already taken in Class ${body.grade}-${body.section}.` },
        { status: 409 }
      );
    }

    const student = await Student.create({ ...body, adminId });
    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create student' }, { status: 500 });
  }
}

// NOTE: DELETE endpoint for individual student is handled in src/app/api/students/[id]/route.ts. This file now only provides GET and POST.
