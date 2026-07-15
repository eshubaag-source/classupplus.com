import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
import { sendNotification } from '@/lib/notifications';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;
    const query: any = date ? { date: new Date(date), adminId } : { adminId };

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      // Get students in teacher's class
      const students = await Student.find({ adminId, ...classFilter }).select('_id');
      const studentIds = students.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    const attendance = await Attendance.find(query).populate('studentId');
    // Filter out records where studentId populated to null (e.g. deleted students)
    const filteredAttendance = attendance.filter((a: any) => a.studentId);
    return NextResponse.json(filteredAttendance);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { studentId, status, date } = body;
    
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const adminId = payload.adminId;

    const student = await Student.findOne({ _id: studentId, adminId });
    if (!student) return NextResponse.json({ message: 'Student not found' }, { status: 404 });

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to record attendance for this student' }, { status: 403 });
      }
    }

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date: new Date(date), adminId },
      { status, adminId },
      { upsert: true, new: true }
    );

    // Send notification if contact number is available
    if (student.parentContact) {
      const formattedDate = new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' });
      const messageText = `Attendance Alert: Your child ${student.name} has been marked ${status} on ${formattedDate}.`;
      sendNotification({
        adminId,
        studentId: studentId.toString(),
        type: 'Both',
        category: 'Attendance',
        message: messageText
      }).catch(err => console.error('Attendance notify error:', err));
    }
    
    return NextResponse.json(attendance);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
