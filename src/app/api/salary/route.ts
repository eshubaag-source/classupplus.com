import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TeacherSalary from '@/models/TeacherSalaryModel';
import { Teacher } from '@/models/Teacher';
import { getTokenPayload } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ message: 'Month is required' }, { status: 400 });
    }

    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const adminId = payload.adminId;

    // Fetch all teachers for this admin
    const teachers = await Teacher.find({ adminId }).sort({ name: 1 }).lean();

    // Fetch all salary records for this month and admin
    const salaries = await TeacherSalary.find({ adminId, month }).lean();

    // Create a map of teacherId -> salary record
    const salaryMap = new Map();
    salaries.forEach((sal: any) => {
      salaryMap.set(sal.teacherId.toString(), sal);
    });

    // Combine teachers and salary info
    const merged = teachers.map((teacher: any) => {
      const salaryRecord = salaryMap.get(teacher._id.toString());
      return {
        _id: teacher._id,
        name: teacher.name,
        post: teacher.post,
        monthlySalary: teacher.monthlySalary,
        phone: teacher.phone,
        email: teacher.email,
        grade: teacher.grade,
        section: teacher.section,
        salaryRecord: salaryRecord || {
          amount: teacher.monthlySalary || 0,
          status: 'Pending',
          month,
          paymentMode: 'Cash',
          note: '',
        },
      };
    });

    return NextResponse.json(merged);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch salaries' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const adminId = payload.adminId;
    const body = await req.json();
    const { teacherId, amount, status, month, paymentMode, paidDate, note } = body;

    if (!teacherId || !month) {
      return NextResponse.json({ message: 'Teacher ID and Month are required' }, { status: 400 });
    }

    // Verify teacher belongs to this admin
    const teacher = await Teacher.findOne({ _id: teacherId, adminId });
    if (!teacher) {
      return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });
    }

    // Upsert the salary record
    const updatedSalary = await TeacherSalary.findOneAndUpdate(
      { teacherId, month, adminId },
      {
        amount: Number(amount) || 0,
        status,
        paymentMode: paymentMode || 'Cash',
        paidDate: paidDate ? new Date(paidDate) : undefined,
        note: note || '',
        adminId,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(updatedSalary);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to update salary' }, { status: 500 });
  }
}
