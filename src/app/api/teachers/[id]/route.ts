import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';
import { getAdminId, getTokenPayload } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const payload = await getTokenPayload();
    if (!payload || !payload.adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (payload.role === 'teacher') return NextResponse.json({ message: 'Teachers cannot edit teacher records' }, { status: 403 });
    const adminId = payload.adminId;

    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    } else {
      delete body.password; // Do not update password if not provided
    }

    const updatedTeacher = await Teacher.findOneAndUpdate(
      { _id: id, adminId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      return NextResponse.json({ message: 'Teacher record not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTeacher);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Email must be unique.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Failed to update teacher' }, { status: 500 });
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
    if (!payload || !payload.adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    if (payload.role === 'teacher') return NextResponse.json({ message: 'Teachers cannot delete teacher records' }, { status: 403 });
    const adminId = payload.adminId;

    const deletedTeacher = await Teacher.findOneAndDelete({ _id: id, adminId });
    if (!deletedTeacher) {
      return NextResponse.json({ message: 'Teacher record not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Teacher record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete teacher' }, { status: 500 });
  }
}
