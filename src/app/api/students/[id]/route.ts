import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import Fees from '@/models/Fees';
import { Teacher } from '@/models/Teacher';
import { getTokenPayload, getTeacherClassFilter, isTeacherAuthorizedForStudent } from '@/lib/auth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;

    const student = await Student.findOne({ _id: id, adminId });
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (payload.role === 'teacher') {
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.grade, student.section);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized to update this student' }, { status: 403 });
      }

      const teacher = await Teacher.findById(payload.id);
      if (!teacher) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (body.grade && body.grade !== teacher.grade) {
        return NextResponse.json({ message: 'Cannot move student to a grade you do not teach' }, { status: 403 });
      }
      if (body.section && body.section !== teacher.section) {
        return NextResponse.json({ message: 'Cannot move student to a section you do not teach' }, { status: 403 });
      }
    }

    // If roll number, grade, or section is being changed, check for class-level duplicates
    const incomingRoll = body.rollNumber ?? student.rollNumber;
    const incomingGrade = body.grade ?? student.grade;
    const incomingSection = body.section ?? student.section;

    const rollConflict = await Student.findOne({
      adminId,
      grade: incomingGrade,
      section: incomingSection,
      rollNumber: incomingRoll,
      _id: { $ne: id },        // exclude current student
    });
    if (rollConflict) {
      return NextResponse.json(
        { message: `Roll number ${incomingRoll} is already taken in Class ${incomingGrade}-${incomingSection}.` },
        { status: 409 }
      );
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: id, adminId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json(updatedStudent);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;

    const student = await Student.findOne({ _id: id, adminId });
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (payload.role === 'teacher') {
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.grade, student.section);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized to delete this student' }, { status: 403 });
      }
    }

    // Cascade delete associated attendance and fee records
    await Promise.all([
      Attendance.deleteMany({ studentId: id, adminId }),
      Fees.deleteMany({ studentId: id, adminId }),
      Student.findOneAndDelete({ _id: id, adminId }),
    ]);

    return NextResponse.json({ message: 'Student and related records deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
