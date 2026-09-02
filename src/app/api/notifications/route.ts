import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { NotificationLog } from '@/models/NotificationLog';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter, isTeacherAuthorizedForStudent } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const query: any = { adminId };

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) {
        return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
      }

      // Get students in teacher's class
      const students = await Student.find({ adminId, ...classFilter }).select('_id');
      const studentIds = students.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    const logs = await NotificationLog.find(query)
      .populate('studentId', 'name rollNumber grade section')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const body = await req.json();
    const { studentId, type, category, message } = body;

    if (!studentId || !type || !category || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Verify student exists and belongs to this admin
    const student = await Student.findOne({ _id: studentId, adminId });
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // If teacher, check if student is in teacher's class
    if (payload.role === 'teacher') {
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student.teacherId);
      if (!isAuthorized) {
        return NextResponse.json({ message: 'Unauthorized for this student' }, { status: 403 });
      }
    }

    const result = await sendNotification({
      adminId,
      studentId,
      type,
      category,
      message
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ message: result.error || 'Failed to send notification' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
