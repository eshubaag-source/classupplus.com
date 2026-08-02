import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getAdminId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await getAdminId();
    if (!adminId) throw new Error('Unauthorized');

    const { id } = await params;

    await dbConnect();
    const student = await Student.findOne({ _id: id, adminId }).lean().exec();
    if (!student) {
      return new NextResponse('Student not found', { status: 404 });
    }

    const admin = await Admin.findById(adminId).lean().exec();
    const schoolName = admin?.schoolName || 'School Report';

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([595, 842]); // A4 Portrait
    const { width, height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Centered School Name
    const schoolNameSize = 14;
    const snWidth = fontBold.widthOfTextAtSize(schoolName, schoolNameSize);
    currentPage.drawText(schoolName, {
      x: (width - snWidth) / 2,
      y: height - 60,
      size: schoolNameSize,
      font: fontBold,
      color: rgb(0, 0, 0.8),
    });

    const reportTitle = 'Class Paper Report';
    const rtWidth = fontBold.widthOfTextAtSize(reportTitle, 16);
    currentPage.drawText(reportTitle, {
      x: (width - rtWidth) / 2,
      y: height - 90,
      size: 16,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Student Info
    const startY = height - 140;
    const lineHeight = 20;

    currentPage.drawText(`Name: ${student.name}`, { x: 50, y: startY, size: 12, font: fontRegular });
    currentPage.drawText(`Roll No: ${student.rollNumber}`, { x: 50, y: startY - lineHeight, size: 12, font: fontRegular });
    currentPage.drawText(`Class: ${student.grade || '-'} ${student.section || ''}`, { x: width / 2, y: startY, size: 12, font: fontRegular });
    currentPage.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: width / 2, y: startY - lineHeight, size: 12, font: fontRegular });

    // Table Header
    let y = startY - lineHeight * 3;
    const header = ['Subject', 'Date', 'Total Marks', 'Obtained Marks'];
    const colWidths = [180, 100, 100, 100];
    let x = 50;
    
    header.forEach((text, i) => {
      currentPage.drawText(text, { x, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });
    
    y -= 5;
    currentPage.drawLine({
      start: { x: 50, y },
      end: { x: 50 + colWidths.reduce((a, b) => a + b, 0), y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    y -= lineHeight;

    let marks = student.classPaperMarks || [];
    if (marks.length === 0 && (student.subject || student.totalNumber || student.subjectPaperNumber)) {
      marks = [{ subject: student.subject, totalNumber: student.totalNumber, subjectPaperNumber: student.subjectPaperNumber, date: '' }];
    }

    if (marks.length === 0) {
      currentPage.drawText('No marks recorded.', { x: 50, y, size: 12, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    } else {
      marks.forEach((mark: any) => {
        x = 50;
        const row = [
          (mark.subject || '-').substring(0, 25),
          (mark.date || '-').substring(0, 12),
          mark.totalNumber ? mark.totalNumber.toString() : '-',
          mark.subjectPaperNumber ? mark.subjectPaperNumber.toString() : '-',
        ];
        row.forEach((cell, i) => {
          currentPage.drawText(cell, { x, y, size: 11, font: fontRegular, color: rgb(0, 0, 0) });
          x += colWidths[i];
        });
        y -= lineHeight;
        if (y < 50) {
          currentPage = pdfDoc.addPage([595, 842]);
          y = height - 50;
        }
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${student.name}-class-paper.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
