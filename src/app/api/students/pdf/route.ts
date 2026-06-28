import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
interface StudentRecord {
  _id: string;
  name: string;
  fatherName: string;
  rollNumber: string;
  grade: string;
  section: string;
  parentContact: string;
}

// Real function to fetch all students from DB
async function getAllStudents() {
  const payload = await getTokenPayload();
  if (!payload) throw new Error('Unauthorized');

  const adminId = payload.adminId;
  await dbConnect();

  let query: any = { adminId };
  if (payload.role === 'teacher') {
    const classFilter = await getTeacherClassFilter(payload);
    if (!classFilter) throw new Error('Teacher profile not found');
    query = { ...query, ...classFilter };
  }

  // Select only required fields
  const students = await Student.find(query)
    .select('name fatherName rollNumber grade section parentContact')
    .lean()
    .exec();
  // Normalize to the shape expected by PDF generator
  return (students as any).map((s: any) => ({
    _id: s._id?.toString(),
    name: s.name,
    fatherName: s.fatherName,
    rollNumber: s.rollNumber,
    grade: s.grade,
    section: s.section,
    parentContact: s.parentContact || '',
  }));
}

export async function GET() {
  const students = await getAllStudents();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { height } = page.getSize();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Title
  page.drawText('All Students Record', {
    x: 30,
    y: height - 40,
    size: 24,
    font: fontBold,
    color: rgb(0, 0, 0.8),
  });

  const startY = height - 80;
  const lineHeight = 14;
  let y = startY;

  const header = ['Name', 'Father', 'Roll', 'Grade', 'Section', 'Contact'];
  const colWidths = [100, 100, 60, 50, 50, 100];
  let x = 30;
  header.forEach((text, i) => {
    page.drawText(text, { x, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    x += colWidths[i];
  });

  y -= lineHeight;
  students.forEach((s: StudentRecord) => {
    x = 30;
    const row = [s.name, s.fatherName, s.rollNumber, s.grade, s.section, s.parentContact];
    row.forEach((cell, i) => {
      page.drawText(cell, { x, y, size: 11, font: fontRegular, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });
    y -= lineHeight;
    if (y < 50) {
      // add new page if needed (simple handling)
      const newPage = pdfDoc.addPage([600, 800]);
      y = height - 40;
    }
  });

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Uint8Array(pdfBytes);

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="all-students.pdf"',
    },
  });
}
