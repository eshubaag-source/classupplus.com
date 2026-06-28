import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Fees from '@/models/Fees';
import Student from '@/models/Student';
import { Types } from 'mongoose';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const adminId = payload.adminId;
    let query: any = { adminId };

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      // Only get fees of students in teacher's class
      const students = await Student.find({ adminId, ...classFilter }).select('_id');
      const studentIds = students.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    const fees = await Fees.find(query).populate('studentId', 'name rollNumber grade section subject').lean();
    // Filter out records where studentId populated to null (e.g. deleted students)
    const filteredFees = fees.filter((f: any) => f.studentId);
    return NextResponse.json(filteredFees);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch fees' }, { status: 500 });
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
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to add fee for this student' }, { status: 403 });
      }
    }

    const newFee = new Fees({
      ...body,
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
        messageText = `Fee Payment Received: Dear Parent, we have received a payment of Rs. ${newFee.amount} for ${newFee.month} for your child ${student.name} on ${dateStr}. Thank you!`;
      } else {
        messageText = `Fee Due: Dear Parent, a fee of Rs. ${newFee.amount} for ${newFee.month} is pending for your child ${student.name}. Please pay at the earliest.`;
      }
      sendNotification({
        adminId,
        studentId: student._id.toString(),
        type: 'Both',
        category: 'Fee',
        message: messageText
      }).catch(err => console.error('Fee save notification error:', err));
    }

    return NextResponse.json(newFee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create fee' }, { status: 500 });
  }
}
