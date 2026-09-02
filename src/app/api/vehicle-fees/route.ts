/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { VehicleFee } from '@/models/VehicleFee';
import Student from '@/models/Student';
import { Types } from 'mongoose';
import { getTokenPayload, getTeacherClassFilter, isTeacherAuthorizedForStudent } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    let query: any = { category: 'vehicle', adminId };

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      const students = await Student.find({ adminId, ...classFilter }).select('_id');
      const studentIds = students.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    const fees = await VehicleFee.find(query).populate('studentId', 'name rollNumber').lean();
    // Filter out records where studentId populated to null (e.g. deleted students)
    const filteredFees = fees.filter((f: any) => f.studentId);
    return NextResponse.json(filteredFees);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch vehicle fees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    const body = await request.json();

    const student = await Student.findOne({ _id: body.studentId, adminId });
    if (!student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.teacherId);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized to add vehicle fee for this student' }, { status: 403 });
      }
    }

    const newFee = new VehicleFee({
      ...body,
      category: 'vehicle',
      adminId,
      studentId:
        typeof body.studentId === 'string'
          ? new Types.ObjectId(body.studentId)
          : body.studentId,
    });

    if (body.status === 'Paid' && !body.paidDate) {
      newFee.paidDate = new Date();
    }

    await newFee.save();

    // Trigger notification
    if (student.parentContact) {
      let messageText = '';
      if (newFee.status === 'Paid') {
        const dateStr = newFee.paidDate
          ? new Date(newFee.paidDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
          : new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });
        messageText = `Vehicle Fee Received: Dear Parent, vehicle transport fee of Rs. ${newFee.amount} for ${newFee.month} for your child ${student.name} has been received on ${dateStr}. Thank you!`;
      } else {
        messageText = `Vehicle Fee Due: Dear Parent, vehicle transport fee of Rs. ${newFee.amount} for ${newFee.month} is pending for your child ${student.name}. Please pay at the earliest.`;
      }
      await sendNotification({
        adminId,
        studentId: student._id.toString(),
        type: 'Both',
        category: 'VehicleFee',
        message: messageText
      }).catch(err => console.error('Vehicle fee save notification error:', err));
    }

    return NextResponse.json(newFee.toJSON(), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create vehicle fee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Missing id' }, { status: 400 });
    }

    const fee = await VehicleFee.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Vehicle fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student) {
        return NextResponse.json({ message: 'Unauthorized to delete this vehicle fee record' }, { status: 403 });
      }
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.teacherId);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized to delete this vehicle fee record' }, { status: 403 });
      }
    }

    await VehicleFee.deleteOne({ _id: id, adminId });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete vehicle fee' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: 'Missing id' }, { status: 400 });
    }

    const fee = await VehicleFee.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Vehicle fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student) {
        return NextResponse.json({ message: 'Unauthorized to update this vehicle fee record' }, { status: 403 });
      }
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.teacherId);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized to update this vehicle fee record' }, { status: 403 });
      }
    }

    const body = await request.json();

    if (body.status === 'Paid' && !body.paidDate) {
      body.paidDate = new Date();
    } else if (body.status === 'Pending') {
      body.paidDate = null;
    }
    // this 
    delete body._id;
    const updated = await VehicleFee.findOneAndUpdate({ _id: id, adminId }, { $set: body }, { new: true }).populate('studentId').lean();
    if (updated) {
      const studentIdObj = updated.studentId as any;
      const student = await Student.findById(studentIdObj?._id || studentIdObj);
      if (student?.parentContact) {
        let messageText = '';
        if (updated.status === 'Paid') {
          const dateStr = updated.paidDate
            ? new Date(updated.paidDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
            : new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });
          messageText = `Vehicle Fee Received: Dear Parent, vehicle transport fee of Rs. ${updated.amount} for ${updated.month} for your child ${student.name} has been received on ${dateStr}. Thank you!`;
        } else {
          messageText = `Vehicle Fee Reminder: Dear Parent, vehicle transport fee of Rs. ${updated.amount} for ${updated.month} is pending for your child ${student.name}. Please pay at the earliest.`;
        }
        await sendNotification({
          adminId,
          studentId: student._id.toString(),
          type: 'Both',
          category: 'VehicleFee',
          message: messageText
        }).catch(err => console.error('Vehicle fee update notification error:', err));
      }
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to update vehicle fee' }, { status: 500 });
  }
}

