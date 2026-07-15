import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Fees from '@/models/Fees';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function PUT(
  
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    // If status is updated to Paid, make sure paidDate is set if not already present.
    // If updated to Pending, clear paidDate.
    if (body.status === 'Paid' && !body.paidDate) {
      body.paidDate = new Date();
    } else if (body.status === 'Pending') {
      body.paidDate = null;
    }

    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;

    const fee = await Fees.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student || !classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to manage this fee record' }, { status: 403 });
      }
    }

    const updatedFee = await Fees.findOneAndUpdate(
      { _id: id, adminId },
      { $set: body },
      { new: true, runValidators: true }
    ).populate('studentId');

    if (!updatedFee) {
      return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });
    }

    // Trigger notification on update
    const student = updatedFee.studentId;
    if (student && student.parentContact) {
      let messageText = '';
      if (updatedFee.status === 'Paid') {
        const dateStr = updatedFee.paidDate 
          ? new Date(updatedFee.paidDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
          : new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });
        messageText = `Fee Payment Received: Dear Parent, we have received a payment of Rs. ${updatedFee.amount} for ${updatedFee.month} for your child ${student.name} on ${dateStr}. Thank you!`;
      } else {
        messageText = `Fee Reminder: Dear Parent, a fee of Rs. ${updatedFee.amount} for ${updatedFee.month} is pending for your child ${student.name}. Please pay at the earliest.`;
      }
      sendNotification({
        adminId,
        studentId: student._id.toString(),
        type: 'Both',
        category: 'Fee',
        message: messageText
      }).catch(err => console.error('Fee update notification error:', err));
    }

    return NextResponse.json(updatedFee);
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

    const fee = await Fees.findOne({ _id: id, adminId });
    if (!fee) return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      const student = await Student.findOne({ _id: fee.studentId, adminId });
      if (!student || !classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to manage this fee record' }, { status: 403 });
      }
    }

    const deletedFee = await Fees.findOneAndDelete({ _id: id, adminId });
    if (!deletedFee) {
      return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Fee record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
