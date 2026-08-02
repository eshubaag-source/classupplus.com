import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getAdminId, getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function GET() {
  try {
    const adminId = await getAdminId();
    const payload = await getTokenPayload();
    if (!adminId || !payload) throw new Error('Unauthorized');

    await dbConnect();
    
    let query: any = { adminId };
    if (payload.role === 'teacher') {
      const teacherFilter = await getTeacherClassFilter(payload);
      if (teacherFilter) {
        query = { ...query, ...teacherFilter };
      }
    }

    const students = await Student.find(query).lean().exec();
    
    const admin = await Admin.findById(adminId).lean().exec();
    const schoolName = admin?.schoolName || '';

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([842, 595]); // A4 Landscape
    const { height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Title
      const titleText = schoolName ? `${schoolName} - Class Paper Report` : 'Class Paper Report';
    currentPage.drawText(titleText, {
      x: 30,
      y: height - 40,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0.8),
    });


    const dateText = `Date: ${new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
    const dtW = fontBold.widthOfTextAtSize(dateText, 12);
    currentPage.drawText(dateText, {
      x: 842 - 30 - dtW,
      y: height - 40,
      size: 12,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });

    const startY = height - 80;
    const lineHeight = 16;
    let y = startY;

    const header = ['Roll No', 'Name', 'Class/Sec', 'Parent Contact', 'Subject', 'Date', 'Total No', 'Paper No'];
    const colWidths = [60, 140, 80, 100, 100, 70, 70, 70];
    let x = 30;
    
    header.forEach((text, i) => {
      currentPage.drawText(text, { x, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });

    y -= lineHeight;
    students.forEach((s: any) => {
      let marks = s.classPaperMarks || [];
      if (marks.length === 0 && (s.subject || s.totalNumber || s.subjectPaperNumber)) {
        marks = [{ subject: s.subject, totalNumber: s.totalNumber, subjectPaperNumber: s.subjectPaperNumber, date: '' }];
      }
      if (marks.length === 0) {
        marks = [{ subject: '-', totalNumber: '-', subjectPaperNumber: '-', date: '-' }];
      }

      marks.forEach((mark: any, index: number) => {
        x = 30;
        const row = [
          index === 0 ? (s.rollNumber || '-').substring(0, 12) : '',
          index === 0 ? (s.name || '-').substring(0, 25) : '',
          index === 0 ? `${s.grade || '-'} ${s.section || ''}`.substring(0, 12) : '',
          index === 0 ? (s.parentContact || '-').substring(0, 15) : '',
          (mark.subject || '-').substring(0, 18),
          (mark.date || '-').substring(0, 12),
          mark.totalNumber ? mark.totalNumber.toString() : '-',
          mark.subjectPaperNumber ? mark.subjectPaperNumber.toString() : '-',
        ];
        row.forEach((cell, i) => {
          currentPage.drawText(cell, { x, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
          x += colWidths[i];
        });
        y -= lineHeight;
        if (y < 40) {
          currentPage = pdfDoc.addPage([842, 595]);
          y = height - 40;
        }
      });
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="class-papers.pdf"',
      },
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
