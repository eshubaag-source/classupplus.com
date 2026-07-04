import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';
import { getAdminId } from '@/lib/auth';

export async function GET() {
  try {
    const adminId = await getAdminId();
    if (!adminId) throw new Error('Unauthorized');

    await dbConnect();
    const teachers = await Teacher.find({ adminId }).lean().exec();

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([1050, 620]); // wider landscape for more columns
    const { height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Title
    currentPage.drawText('All Teachers Directory', {
      x: 30,
      y: height - 40,
      size: 24,
      font: fontBold,
      color: rgb(0, 0, 0.8),
    });

    const startY = height - 80;
    const lineHeight = 16;
    let y = startY;

    const header = ['School', 'Name', 'Email', 'Phone', 'Class/Sec', 'Subject', 'Post', 'Salary (Rs)', 'Qual.', 'Aadhaar'];
    const colWidths = [90, 130, 155, 80, 60, 70, 100, 80, 70, 90];
    let x = 30;
    
    header.forEach((text, i) => {
      currentPage.drawText(text, { x, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });

    y -= lineHeight;
    teachers.forEach((t: any) => {
      x = 30;
      const salary = t.monthlySalary ? `Rs ${Number(t.monthlySalary).toLocaleString('en-IN')}` : '-';
      const row = [
        (t.schoolName || '-').substring(0, 14),
        (t.name || '-').substring(0, 20),
        (t.email || '-').substring(0, 26),
        (t.phone || '-').substring(0, 14),
        `${t.grade || '-'} ${t.section || ''}`.substring(0, 10),
        (t.subject || '-').substring(0, 10),
        (t.post || '-').substring(0, 16),
        salary.substring(0, 14),
        (t.qualification || '-').substring(0, 10),
        (t.aadhaarNumber || '-').substring(0, 14),
      ];
      row.forEach((cell, i) => {
        currentPage.drawText(cell, { x, y, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
        x += colWidths[i];
      });
      y -= lineHeight;
      if (y < 40) {
        currentPage = pdfDoc.addPage([1050, 620]);
        y = height - 40;
      }
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="all-teachers.pdf"',
      },
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
