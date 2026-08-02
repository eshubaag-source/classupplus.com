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

    // Aggregate attendance
    const attendanceMap = new Map();
    students.forEach((s: any) => {
      attendanceMap.set(s._id.toString(), {
        rollNumber: s.rollNumber,
        name: s.name,
        grade: `${s.grade} - ${s.section}`,
        present: 0,
        absent: 0
      });
    });

    attendanceRecords.forEach((record: any) => {
      const sid = record.studentId.toString();
      const stats = attendanceMap.get(sid);
      if (stats) {
        if (record.status === 'Present') stats.present += 1;
        if (record.status === 'Absent') stats.absent += 1;
      }
    });

    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([600, 800]); 
    const { height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // School Name Header
    currentPage.drawText(schoolName.toUpperCase(), {
      x: 50,
      y: height - 40,
      size: 20,
      font: fontBold,
      color: rgb(0.09, 0.05, 0.4),
    });

    // Report subtitle
    currentPage.drawText(`Monthly Attendance Report - ${monthName}`, {
      x: 50,
      y: height - 65,
      size: 13,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.45),
    });

    const startY = height - 105;
    const lineHeight = 20;
    let y = startY;

    const header = ['Roll No', 'Name', 'Class/Sec', 'Total Present', 'Total Absent'];
    const colWidths = [80, 180, 100, 90, 90];
    let x = 50;
    
    header.forEach((text, i) => {
      currentPage.drawText(text, { x, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });

    y -= lineHeight + 5;
    
    const rows = Array.from(attendanceMap.values());
    
    rows.forEach((row: any) => {
      x = 50;
      const rowData = [
        (row.rollNumber || '-').substring(0, 10),
        (row.name || '-').substring(0, 30),
        (row.grade || '-').substring(0, 15),
        row.present.toString(),
        row.absent.toString()
      ];

      rowData.forEach((cell, i) => {
        currentPage.drawText(cell, { x, y, size: 10, font: fontRegular, color: rgb(0, 0, 0) });
        x += colWidths[i];
      });
      y -= lineHeight;
      if (y < 40) {
        currentPage = pdfDoc.addPage([600, 800]);
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
