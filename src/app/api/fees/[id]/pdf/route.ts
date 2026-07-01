import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import dbConnect from '@/lib/db';
import Fees from '@/models/Fees';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { ClassFee } from '@/models/ClassFee';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const adminId = payload.adminId;
    const { id } = await params;
    await dbConnect();

    // Fetch the single fee record scoped by admin
    const fee = await Fees.findOne({ _id: id, adminId }).populate('studentId').lean().exec();
    if (!fee) {
      return NextResponse.json({ message: 'Fee record not found' }, { status: 404 });
    }

    const student = fee.studentId as any;
    if (!student) {
      return NextResponse.json({ message: 'Student record not found for this fee' }, { status: 404 });
    }

    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });

      if (!classFilter.grade.$regex.test(student.grade) || !classFilter.section.$regex.test(student.section)) {
        return NextResponse.json({ message: 'Unauthorized to view this fee record' }, { status: 403 });
      }
    }

    // Get school name from admin details
    const admin = await Admin.findById(adminId).lean().exec();
    const schoolName = admin?.schoolName || 'E\'School';

    // Calculate class fee and balance
    let classAmount = 0;
    if (student.grade) {
      const allClassFees = await ClassFee.find({ adminId }).lean().exec();
      const normalizeGrade = (g: string) =>
        g.trim().toLowerCase().replace(/^class\s+/i, '').replace(/(th|st|nd|rd)$/i, '').trim();
      
      const gradeNorm = normalizeGrade(student.grade);
      const subjectNorm = (student.subject || '').trim().toLowerCase();
      
      let match = allClassFees.find(cf => 
        normalizeGrade(cf.grade) === gradeNorm && 
        (cf.subject || '').trim().toLowerCase() === subjectNorm
      );
      
      if (!match) {
        match = allClassFees.find(cf => 
          normalizeGrade(cf.grade) === gradeNorm && 
          (cf.subject || '') === ''
        );
      }
      
      if (match) {
        classAmount = match.amount;
      }
    }
    // Fallback: use the classFee stored on the fee record itself
    if (classAmount === 0 && (fee as any).classFee) {
      classAmount = Number((fee as any).classFee) || 0;
    }
    const balance = Math.max(0, classAmount - fee.amount);

    // Create a compact PDF receipt
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([450, 600]);
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // 1. Draw border
    page.drawRectangle({
      x: 15,
      y: 15,
      width: width - 30,
      height: height - 30,
      borderWidth: 1.5,
      borderColor: rgb(99 / 255, 102 / 255, 241 / 255), // Indigo
      color: rgb(253 / 255, 254 / 255, 255 / 255), // Light tint bg
    });

    // 2. Draw top header block
    page.drawRectangle({
      x: 15,
      y: 505,
      width: width - 30,
      height: 80,
      color: rgb(99 / 255, 102 / 255, 241 / 255),
    });

    // Helper: draw centered text
    const drawTextCentered = (text: string, y: number, size: number, font: any, color: any) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: y,
        size: size,
        font: font,
        color: color,
      });
    };

    // School Name & Subtitle
    drawTextCentered(schoolName.toUpperCase(), 545, 18, fontBold, rgb(1, 1, 1));
    drawTextCentered('FEES PAYMENT RECEIPT', 522, 11, fontBold, rgb(0.85, 0.88, 1));

    // 3. Receipt details meta
    const dateStr = fee.paidDate 
      ? new Date(fee.paidDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
      : new Date(fee.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' });

    page.drawText(`Receipt No: #${fee._id.toString().substring(18).toUpperCase()}`, {
      x: 35,
      y: 475,
      size: 9.5,
      font: fontBold,
      color: rgb(75 / 255, 85 / 255, 99 / 255),
    });

    page.drawText(`Date: ${dateStr}`, {
      x: width - 150,
      y: 475,
      size: 9.5,
      font: fontBold,
      color: rgb(75 / 255, 85 / 255, 99 / 255),
    });

    // Separator line
    page.drawLine({
      start: { x: 30, y: 460 },
      end: { x: width - 30, y: 460 },
      thickness: 1,
      color: rgb(229 / 255, 231 / 255, 235 / 255),
    });

    // 4. Student Information Block
    page.drawText('STUDENT INFORMATION', {
      x: 35,
      y: 440,
      size: 10.5,
      font: fontBold,
      color: rgb(99 / 255, 102 / 255, 241 / 255),
    });

    // Gray card background for Student Info
    page.drawRectangle({
      x: 30,
      y: 340,
      width: width - 60,
      height: 85,
      color: rgb(249 / 255, 250 / 255, 251 / 255),
      borderWidth: 0.5,
      borderColor: rgb(229 / 255, 231 / 255, 235 / 255),
    });

    // Draw Student fields
    const drawStudentField = (label: string, val: string, x: number, y: number) => {
      page.drawText(label, { x, y, size: 9.5, font: fontBold, color: rgb(107 / 255, 114 / 255, 128 / 255) });
      page.drawText(val, { x: x + 85, y, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    };

    drawStudentField('Student Name:', student.name, 45, 395);
    drawStudentField("Father's Name:", student.fatherName || '—', 45, 370);
    drawStudentField('Roll Number:', student.rollNumber || '—', 45, 350);
    drawStudentField('Class/Grade:', `${student.grade || '—'} (Sec: ${student.section || '—'})`, 235, 395);
    drawStudentField('UTR:', fee.utr || '—', 235, 370);

    // Separator line
    page.drawLine({
      start: { x: 30, y: 320 },
      end: { x: width - 30, y: 320 },
      thickness: 1,
      color: rgb(229 / 255, 231 / 255, 235 / 255),
    });

    // 5. Payment details table
    page.drawText('PAYMENT PARTICULARS', {
      x: 35,
      y: 300,
      size: 10.5,
      font: fontBold,
      color: rgb(99 / 255, 102 / 255, 241 / 255),
    });

    // Table headers
    const drawTableHeader = (text: string, x: number, y: number) => {
      page.drawText(text, { x, y, size: 9.5, font: fontBold, color: rgb(75 / 255, 85 / 255, 99 / 255) });
    };

    const headerY = 275;
    drawTableHeader('Description', 40, headerY);
    drawTableHeader('Month', 170, headerY);
    drawTableHeader('Class Fee', 250, headerY);
    drawTableHeader('Paid Amt', 315, headerY);
    drawTableHeader('Balance', 380, headerY);

    // Header line
    page.drawLine({
      start: { x: 30, y: 265 },
      end: { x: width - 30, y: 265 },
      thickness: 1,
      color: rgb(156 / 255, 163 / 255, 175 / 255),
    });

    const lastYearVal = fee.lastyear || (fee as any).lastyeae;
    const hasLastYear = lastYearVal && lastYearVal !== '—' && lastYearVal.trim() !== '';
    const totalPaid = fee.amount ;

    // Table rows
    let currentY = 245;
    page.drawText('Tuition Fees', { x: 40, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    page.drawText(fee.month, { x: 170, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    page.drawText(classAmount > 0 ? `Rs. ${classAmount}` : '—', { x: 250, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    page.drawText(`Rs. ${fee.amount}`, { x: 315, y: currentY, size: 9.5, font: fontBold, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    page.drawText(`Rs. ${balance}`, { x: 380, y: currentY, size: 9.5, font: fontBold, color: rgb(220 / 255, 38 / 255, 38 / 255) });

    if (hasLastYear) {
      currentY -= 20;
      page.drawText('Last Year Fees', { x: 40, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
      page.drawText('—', { x: 170, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
      page.drawText('Pending', { x: 250, y: currentY, size: 9.5, font: fontRegular, color: rgb(17 / 255, 24 / 255, 39 / 255) });
      page.drawText('—', { x: 315, y: currentY, size: 9.5, font: fontBold, color: rgb(17 / 255, 24 / 255, 39 / 255) });
      page.drawText(`Rs. ${lastYearVal}`, { x: 380, y: currentY, size: 9.5, font: fontBold, color: rgb(17 / 255, 24 / 255, 39 / 255) });
    }

    const tableBottomY = currentY - 15;
    // Table bottom border
    page.drawLine({
      start: { x: 30, y: tableBottomY },
      end: { x: width - 30, y: tableBottomY },
      thickness: 1,
      color: rgb(229 / 255, 231 / 255, 235 / 255),
    });

    const totalRowY = tableBottomY - 25;
    // Draw total row
    page.drawText('Total Paid Amount:', {
      x: width - 200,
      y: totalRowY,
      size: 10.5,
      font: fontBold,
      color: rgb(75 / 255, 85 / 255, 99 / 255),
    });
    page.drawText(`Rs. ${totalPaid}`, {
      x: width - 75,
      y: totalRowY,
      size: 11,
      font: fontBold,
      color: rgb(99 / 255, 102 / 255, 241 / 255),
    });

    // 6. Draw stamp
    if (fee.status === 'Paid') {
      page.drawRectangle({
        x: 300,
        y: 100,
        width: 100,
        height: 40,
        borderWidth: 2,
        borderColor: rgb(16 / 255, 185 / 255, 129 / 255), // Emerald Green
        color: rgb(240 / 255, 253 / 255, 250 / 255),
        rotate: degrees(-12),
      });
      page.drawText('PAID', {
        x: 328,
        y: 112,
        size: 18,
        font: fontBold,
        color: rgb(16 / 255, 185 / 255, 129 / 255),
        rotate: degrees(-12),
      });
    } else {
      page.drawRectangle({
        x: 300,
        y: 100,
        width: 100,
        height: 40,
        borderWidth: 2,
        borderColor: rgb(245 / 255, 158 / 255, 11 / 255), // Amber
        color: rgb(254 / 255, 243 / 255, 199 / 255),
        rotate: degrees(-12),
      });
      page.drawText('PENDING', {
        x: 312,
        y: 114,
        size: 14,
        font: fontBold,
        color: rgb(245 / 255, 158 / 255, 11 / 255),
        rotate: degrees(-12),
      });
    }

    // 7. Signature area
    page.drawLine({
      start: { x: 45, y: 105 },
      end: { x: 175, y: 105 },
      thickness: 0.75,
      color: rgb(156 / 255, 163 / 255, 175 / 255),
    });
    page.drawText('Authorized Signature', {
      x: 60,
      y: 90,
      size: 8.5,
      font: fontRegular,
      color: rgb(107 / 255, 114 / 255, 128 / 255),
    });

    // 8. Footer note
    drawTextCentered('This is a computer generated receipt. Thank you for your payment.', 45, 8.5, fontOblique, rgb(156 / 255, 163 / 255, 175 / 255));

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Uint8Array(pdfBytes);

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="receipt-' + fee._id + '.pdf"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
