import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Timetable } from '@/models/Timetable';
import { getTokenPayload } from '@/lib/auth';

const DAYS_ORDER: Record<string, number> = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

export async function GET(request: Request) {
  try { 
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let query: any = {};
    if (payload.role === 'admin') {
      const { searchParams } = new URL(request.url);
      const teacherId = searchParams.get('teacherId');
      if (!teacherId) {
        return NextResponse.json({ message: 'teacherId parameter is required for admin' }, { status: 400 });
      }
      query = { adminId: payload.adminId, teacherId };
    } else {
      // Teacher sees their own timetable
      query = { teacherId: payload.id };
    }

    const items = await Timetable.find(query).lean();

    // Sort items by day order, then by periodNumber or startTime
    items.sort((a: any, b: any) => {
      const dayA = DAYS_ORDER[a.day] || 99;
      const dayB = DAYS_ORDER[b.day] || 99;
      if (dayA !== dayB) return dayA - dayB;
      
      // Secondary sort by startTime
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch timetable' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden. Only admin can modify timetable.' }, { status: 403 });
    }

    await dbConnect();

    const { teacherId, periods } = await request.json();

    if (!teacherId) {
      return NextResponse.json({ message: 'teacherId is required' }, { status: 400 });
    }

    if (!Array.isArray(periods)) {
      return NextResponse.json({ message: 'periods must be an array' }, { status: 400 });
    }

    // 1. Delete all existing timetable entries for this teacher
    await Timetable.deleteMany({ adminId: payload.adminId, teacherId });

    // 2. Insert new periods
    const periodsToInsert = periods.map((p: any) => ({
      adminId: payload.adminId,
      teacherId,
      day: p.day,
      periodNumber: p.periodNumber,
      subject: p.subject,
      grade: p.grade,
      section: p.section,
      startTime: p.startTime,
      endTime: p.endTime,
      roomNumber: p.roomNumber || '',
    }));

    let inserted: any[] = [];
    if (periodsToInsert.length > 0) {
      inserted = await Timetable.insertMany(periodsToInsert);
    }

    return NextResponse.json({
      message: 'Timetable saved successfully',
      count: inserted.length,
      data: inserted
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to save timetable' }, { status: 500 });
  }
}
