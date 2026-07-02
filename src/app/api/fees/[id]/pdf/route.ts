import dbConnect from '@/lib/db';
import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Student from '@/models/Student';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getTokenPayload();
    if (!payload) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const student = await Student.findOne({ _id: id, adminId: payload.adminId }).lean().exec();
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to view this student' }, { status: 403 });
      }
    }

    // Create a PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const title = `${student.name} - Student Record`;
    page.drawText(title, {
      x: 30,
      y: height - 50,
      size: 20,
      font,
      color: rgb(0, 0, 0.8),
    });

    const content = `
Name: ${student.name}
Father Name: ${student.fatherName}
Roll No: ${student.rollNumber}
Grade: ${student.grade}
Section: ${student.section}
Parent Contact: ${student.parentContact || 'N/A'}
`;
    page.drawText(content, {
      x: 30,
      y: height - 100,
      size: 12,
      font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      color: rgb(0, 0, 0),
      lineHeight: 14,
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="student-${id}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
