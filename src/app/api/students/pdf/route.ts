import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';
interface StudentRecord {
  _id: string;
  name: string;
  fatherName: string;
  rollNumber: string;
  grade: string;
  section: string;
  parentContact: string;
  note: string;
  schoolFees: number;
  lastFeesAmount: number;
}

// Real function to fetch all students from DB
async function getAllStudents(req: Request) {
  const payload = await getTokenPayload();
  if (!payload) throw new Error('Unauthorized');

  const adminId = payload.adminId;
  await dbConnect();

  // Fetch school name
  const adminDoc = await Admin.findById(adminId).select('schoolName').lean().exec();
  const schoolName = (adminDoc as any)?.schoolName || 'School';

  let query: any = { adminId };
  
  const { searchParams } = new URL(req.url);
  const cls = searchParams.get('class');
  const sec = searchParams.get('section');
  
  if (cls) query.grade = cls;
  if (sec) query.section = sec;

  if (payload.role === 'teacher') {
    const classFilter = await getTeacherClassFilter(payload);
    if (!classFilter) throw new Error('Teacher profile not found');
    query = { ...query, ...classFilter };
  }

  // Select only required fields
  const students = await Student.find(query)
    .select('name fatherName rollNumber grade section parentContact note  ')
    .lean()
    .exec();
  // Normalize to the shape expected by PDF generator
  const records = (students as any).map((s: any) => ({
    _id: s._id?.toString(),
    name: s.name,
    fatherName: s.fatherName,
    rollNumber: s.rollNumber,
    grade: s.grade,
    section: s.section,
    parentContact: s.parentContact || '',
    note: s.note || '',
   
  }));
  return { students: records, schoolName };
}

export async function GET(req: Request) {
  try {
    const { students, schoolName } = await getAllStudents(req);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // School Name Header
    page.drawText(schoolName.toUpperCase(), {
      x: 30,
      y: height - 38,
      size: 14,
      font: fontBold,
      color: rgb(0.09, 0.05, 0.4),
    });

    // Report subtitle
    page.drawText('All Students Record', {
      x: 30,
      y: height - 62,
      size: 13,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.45),
    });

    const startY = height - 90;
    const lineHeight = 14;
    let y = startY;

    const header = ['Name', 'Father', 'Roll', 'Class', 'Sec', 'Contact',  'Note'];
    const colWidths =  [180,     180,       135,     140,  45,    80,  100];
    let x = 30;
    header.forEach((text, i) => {
      page.drawText(text, { x, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });

    y -= lineHeight;
    students.forEach((s: StudentRecord) => {
      x = 30;
      const row = [
        s.name,
        s.fatherName,
        s.rollNumber,
        s.grade,
        s.section,
        s.parentContact,
        s.note
      ];
      row.forEach((cell, i) => {
        page.drawText(String(cell ?? ''), { x, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
        x += colWidths[i];
      });
      y -= lineHeight;
      if (y < 50) {
        // add new page if needed
        page = pdfDoc.addPage([600, 800]);
        y = height - 40;
        
        // Optionally redraw headers on new page
        let hX = 30;
        header.forEach((text, i) => {
          page.drawText(text, { x: hX, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
          hX += colWidths[i];
        });
        y -= lineHeight;
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
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
