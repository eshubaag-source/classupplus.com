import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const body = await req.json();
    const { studentIds, type, category, message } = body;

    if (!studentIds || !Array.isArray(studentIds) || !type || !category) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ message: 'Message content is required' }, { status: 400 });
    }

    if (studentIds.length === 0) {
      return NextResponse.json({ message: 'No students selected' }, { status: 400 });
    }

    let classFilter = null;
    if (payload.role === 'teacher') {
      classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) {
        return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
      }
    }

    const query: any = { _id: { $in: studentIds }, adminId };
    if (payload.role === 'teacher' && classFilter) {
      query.$and = [classFilter];
    }

    // Verify all students exist and belong to this admin
    const students = await Student.find(query);
    if (students.length !== studentIds.length) {
      return NextResponse.json({ message: 'Some students not found or unauthorized' }, { status: 404 });
    }

    const results = [];
    for (const student of students) {
      const studentMessage = typeof message === 'string' ? message : (message[student._id.toString()] || '');
      if (!studentMessage) {
        results.push({ studentId: student._id, success: false, error: 'No message provided for this student' });
        continue;
      }

      const result = await sendNotification({
        adminId,
        studentId: student._id.toString(),
        type,
        category,
        message: studentMessage
      });
      results.push({ studentId: student._id, success: result.success, error: result.error });
    }

    const successful = results.filter(r => r.success).length;
    return NextResponse.json({ 
      message: `Successfully sent ${successful} out of ${students.length} messages.`,
      results 
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
