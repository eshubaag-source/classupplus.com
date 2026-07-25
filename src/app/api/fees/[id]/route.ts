import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Fees from '@/models/Fees';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const fee = await Fees.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to modify fee for this student' }, { status: 403 });
      }
    }

    const updatedFee = await Fees.findOneAndUpdate(
      { _id: id, adminId },
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedFee);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to update fee' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    const { id } = await params;

    const fee = await Fees.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to delete fee for this student' }, { status: 403 });
      }
    }

    await Fees.findOneAndDelete({ _id: id, adminId });
    return NextResponse.json({ message: 'Fee record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete fee' }, { status: 500 });
  }
}
