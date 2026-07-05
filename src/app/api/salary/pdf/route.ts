import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import dbConnect from '@/lib/db';
import TeacherSalary from '@/models/TeacherSalary';
import { Teacher } from '@/models/Teacher';
import { getTokenPayload } from '@/lib/auth';

const formatMonthStr = (monthStr: string) => {
  try {
    const [year, monthNum] = monthStr.split('-');
    const dateObj = new Date(Number(year), Number(monthNum) - 1, 1);
    return dateObj.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
};

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');

    if (!month) {
      return new NextResponse('Month is required', { status: 400 });
    }

    const payload = await getTokenPayload();
    if (!payload) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (payload.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
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

    const displayMonth = formatMonthStr(month);

    // Prepare PDF
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([1100, 620]); // Landscape page
    const { height } = currentPage.getSize();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Title
    currentPage.drawText(`Teacher Salary Report - ${displayMonth}`, {
      x: 30,
      y: height - 40,
      size: 20,
      font: fontBold,
      color: rgb(0.09, 0.05, 0.4), // Indigo shade matching premium vibe
    });

    // Summary calculation
    const totalPaid = salaries
      .filter((s: any) => s.status === 'Paid')
      .reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);

    const totalBudget = teachers.reduce((sum: number, t: any) => sum + (t.monthlySalary || 0), 0);
    const totalPending = totalBudget - totalPaid;

    // Draw Summaries on PDF
    currentPage.drawText(
      `Total Monthly Budget: Rs ${totalBudget.toLocaleString('en-IN')}   |   Paid: Rs ${totalPaid.toLocaleString('en-IN')}   |   Pending: Rs ${Math.max(0, totalPending).toLocaleString('en-IN')}`,
      {
        x: 30,
        y: height - 65,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      }
    );

    // Draw Line
    currentPage.drawLine({
      start: { x: 30, y: height - 75 },
      end: { x: 1070, y: height - 75 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    const startY = height - 100;
    const lineHeight = 18;
    let y = startY;

    // Header definition
    const header = ['Teacher Name', 'Designation / Post', 'Class / Sec', 'Base Salary', 'Paid Amount', 'Status', 'Payment Mode', 'Date Paid', 'Note / Ref No.'];
    const colWidths = [180, 130, 80, 90, 90, 80, 90, 85, 210];
    
    // Draw Header
    let x = 30;
    header.forEach((text, i) => {
      currentPage.drawText(text, { x, y, size: 9, font: fontBold, color: rgb(0, 0, 0) });
      x += colWidths[i];
    });

    // Draw Header Underline
    currentPage.drawLine({
      start: { x: 30, y: y - 5 },
      end: { x: 1070, y: y - 5 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
    });

    y -= lineHeight + 5;

    // Draw rows
let receiptCount = 0;
    teachers.forEach((teacher: any) => {
      x = 30;
      const rec = salaryMap.get(teacher._id.toString());
      const isPaid = rec?.status === 'Paid';

      const baseSalaryStr = teacher.monthlySalary ? `Rs ${Number(teacher.monthlySalary).toLocaleString('en-IN')}` : 'Rs 0';
      const paidAmountStr = isPaid ? `Rs ${Number(rec.amount).toLocaleString('en-IN')}` : '-';
      const statusStr = rec?.status || 'Pending';
      const modeStr = isPaid ? (rec.paymentMode || 'Cash') : '-';
      const dateStr = isPaid && rec.paidDate ? new Date(rec.paidDate).toLocaleDateString() : '-';
      const noteStr = rec?.note || '-';

      const row = [
        (teacher.name || '-').substring(0, 30),
        (teacher.post || '-').substring(0, 20),
        teacher.grade ? `${teacher.grade} - ${teacher.section}`.substring(0, 12) : '-',
        baseSalaryStr,
        paidAmountStr,
        statusStr,
        modeStr,
        dateStr,
        noteStr.substring(0, 35)
      ];

      row.forEach((cell, i) => {
        let color = rgb(0, 0, 0);
        if (i === 5) {
          // Status styling coloring (Green for Paid, Red for Pending)
          color = cell === 'Paid' ? rgb(0.06, 0.46, 0.25) : rgb(0.78, 0.14, 0.14);
        }

        currentPage.drawText(cell, { x, y, size: 9, font: i === 5 ? fontBold : fontRegular, color });
        x += colWidths[i];
      });

      y -= lineHeight;

      // Handle page break
      if (y < 40) {
        currentPage = pdfDoc.addPage([1100, 620]);
        const { height: newHeight } = currentPage.getSize();
        y = newHeight - 40;

        // Draw header on new page
        x = 30;
        header.forEach((text, i) => {
          currentPage.drawText(text, { x, y, size: 9, font: fontBold, color: rgb(0, 0, 0) });
          x += colWidths[i];
        });

        // Draw Header Underline
        currentPage.drawLine({
          start: { x: 30, y: y - 5 },
          end: { x: 1070, y: y - 5 },
          thickness: 1,
          color: rgb(0.5, 0.5, 0.5),
        });

        y -= lineHeight + 5;
      }
    });

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="teacher-salary-${month}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error(err);
    return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
  }
}
