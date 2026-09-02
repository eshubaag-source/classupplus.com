import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const grade = searchParams.get('grade');
    const section = searchParams.get('section');
    
    if (!dateStr) {
      return new NextResponse('Date parameter is required', { status: 400 });
    }

    const payload = await getTokenPayload();
    if (!payload) return new NextResponse('Unauthorized', { status: 401 });

    const adminId = payload.adminId;

    // Fetch school name
    const adminDoc = await Admin.findById(adminId).select('schoolName').lean().exec();
    const schoolName = (adminDoc as any)?.schoolName || 'School';

    // Determine the month range based on the selected date
    const selectedDate = new Date(dateStr);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let studentQuery: any = { adminId };
    if (grade) studentQuery.grade = grade;
    if (section) studentQuery.section = section;
    
    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return new NextResponse('Teacher profile not found', { status: 404 });
      studentQuery = { ...studentQuery, ...classFilter };
    }

    const students = await Student.find(studentQuery).lean().exec();
    const studentIds = students.map(s => s._id);

    const attendanceRecords = await Attendance.find({
      adminId,
      studentId: { $in: studentIds },
      date: { $gte: startDate, $lte: endDate }
    }).lean().exec();

    const daysInMonth = endDate.getDate();

    // Aggregate attendance
    const attendanceMap = new Map();
    students.forEach((s: any) => {
      attendanceMap.set(s._id.toString(), {
        rollNumber: s.rollNumber,
        name: s.name,
        grade: `${s.grade} - ${s.section}`,
        daily: {} as Record<number, string>,
        present: 0,
        absent: 0
      });
    });

    attendanceRecords.forEach((record: any) => {
      const sid = record.studentId.toString();
      const stats = attendanceMap.get(sid);
      if (stats) {
        const recordDay = new Date(record.date).getDate();
        if (record.status === 'Present') {
          stats.present += 1;
          stats.daily[recordDay] = 'P';
        } else if (record.status === 'Absent') {
          stats.absent += 1;
          stats.daily[recordDay] = 'A';
        }
      }
    });

    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([842, 595]); // Landscape A4
    const { width, height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const sanitizePdfText = (text: string) => {
      if (!text) return '';
      // Replace non-printable and non-ASCII characters with '?' to avoid WinAnsi encoding errors in pdf-lib
      return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
    };

    // School Name Header
    currentPage.drawText(sanitizePdfText(schoolName.toUpperCase()), {
      x: 30,
      y: height - 40,
      size: 20,
      font: fontBold,
      color: rgb(0.09, 0.05, 0.4),
    });

    // Report subtitle
    currentPage.drawText(`Monthly Attendance Report - ${sanitizePdfText(monthName)}`, {
      x: 30,
      y: height - 60,
      size: 13,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.45),
    });

    const startY = height - 90;
    const lineHeight = 16;
    let y = startY;

    // Header Columns
    const startX = 30;
    let x = startX;
    
    // Widths
    const nameWidth = 140;
    const classWidth = 70;
    const dayWidth = 16;
    const totalWidth = 35;

    // Draw Headers
    currentPage.drawText('Name', { x, y, size: 9, font: fontBold });
    x += nameWidth;
    currentPage.drawText('Class/Sec', { x, y, size: 9, font: fontBold });
    x += classWidth;

    for (let i = 1; i <= daysInMonth; i++) {
      currentPage.drawText(i.toString(), { x, y, size: 9, font: fontBold });
      x += dayWidth;
    }

    currentPage.drawText('P', { x, y, size: 9, font: fontBold });
    x += totalWidth;
    currentPage.drawText('A', { x, y, size: 9, font: fontBold });

    y -= lineHeight;
    
    const rows = Array.from(attendanceMap.values());
    
    rows.forEach((row: any) => {
      x = startX;
      
      const safeName = sanitizePdfText(row.name || '-').substring(0, 25);
      currentPage.drawText(safeName, { x, y, size: 8, font: fontRegular });
      x += nameWidth;
      
      const safeGrade = sanitizePdfText(row.grade || '-').substring(0, 15);
      currentPage.drawText(safeGrade, { x, y, size: 8, font: fontRegular });
      x += classWidth;

      for (let i = 1; i <= daysInMonth; i++) {
        const val = row.daily[i] || '-';
        currentPage.drawText(val, { x, y, size: 8, font: fontRegular });
        x += dayWidth;
      }

      currentPage.drawText(row.present.toString(), { x, y, size: 8, font: fontRegular });
      x += totalWidth;
      currentPage.drawText(row.absent.toString(), { x, y, size: 8, font: fontRegular });

      y -= lineHeight;
      if (y < 40) {
        currentPage = pdfDoc.addPage([842, 595]);
        y = height - 50;
      }
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="attendance-${monthName.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
