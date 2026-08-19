import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { ClassFee } from '@/models/ClassFee';
import { getAdminId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const classFees = await ClassFee.find({ adminId }).sort({ grade: 1 }).lean();
    return NextResponse.json(classFees);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch class fees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const payload = await request.json();

    if (!payload.grade || payload.amount == null) {
      return NextResponse.json({ message: 'Grade and amount are required.' }, { status: 400 });
    }

    const classFee = new ClassFee({ ...payload, adminId });
    await classFee.save();
    return NextResponse.json(classFee, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'A fee entry for this class and subject already exists.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Failed to create class fee' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    const payload = await request.json();
    const updated = await ClassFee.findOneAndUpdate({ _id: id, adminId }, payload, { new: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to update class fee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminId = await getAdminId();
    if (!adminId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 });

    await ClassFee.deleteOne({ _id: id, adminId });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete class fee' }, { status: 500 });
  }
}
