import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter, isTeacherAuthorizedForStudent } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) {
      return new NextResponse('Date parameter is required', { status: 400 });
    }

    const payload = await getTokenPayload();
    if (!payload) return new NextResponse('Unauthorized', { status: 401 });

    const adminId = payload.adminId;

    const selectedDate = new Date(dateStr);
    const startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);

    const studentQuery: any = { adminId };

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return new NextResponse('Teacher profile not found', { status: 404 });
      Object.assign(studentQuery, classFilter);
    }

    const students = await Student.find(studentQuery).lean().exec();
    const studentIds = students.map(s => s._id);

    const attendanceRecords = await Attendance.find({
      adminId,
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate }
    }).populate('studentId', 'name rollNumber grade section').lean().exec();

    return NextResponse.json(attendanceRecords);
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const payload = await getTokenPayload();
    if (!payload) return new NextResponse('Unauthorized', { status: 401 });
    const adminId = payload.adminId;

    const body = await req.json();
    const { studentId, status, date } = body;

    if (!studentId || !status || !date) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(12, 0, 0, 0);

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let query: any = {
      adminId,
      studentId,
      date: { $gte: startDate, $lte: endDate }
    };

    if (payload.role === 'teacher') {
      const student = await Student.findOne({ _id: studentId }).lean().exec();
      if (!student) {
        console.error('Attendance POST: Student not found for studentId:', studentId, 'adminId:', adminId);
        return new NextResponse('Student not found', { status: 404 });
      }
      const isAuthorized = await isTeacherAuthorizedForStudent(payload, student);
      if (!isAuthorized) {
        console.error('Attendance POST: Not authorized. payload.id:', payload.id, 'student:', student);
        return new NextResponse('Not authorized to mark attendance for this student', { status: 403 });
      }
    }

    let record = await Attendance.findOne(query);
    if (record) {
      record.status = status;
      await record.save();
    } else {
      record = await Attendance.create({
        adminId,
        studentId,
        status,
        date: targetDate,
        category: 'Class',
        note: ''
      });
    }

    return NextResponse.json(record);
  } catch (err: any) {
    console.error('Attendance POST Error:', err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
