import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import dbConnect from '@/lib/db';
import { VehicleFee } from '@/models/VehicleFee';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    const adminId = payload.adminId;
    await dbConnect();

    // 1. Resolve query based on user role (teacher vs admin) and selected IDs
    let query: any = { category: 'vehicle', adminId };
    if (idsParam) {
      const selectedIds = idsParam.split(',').filter(Boolean);
      query._id = { $in: selectedIds };
    }
    
    if (payload.role === 'teacher') {
      const classFilter = await getTeacherClassFilter(payload);
      if (!classFilter) {
        return NextResponse.json({ message: 'Teacher profile not found' }, { status: 404 });
      }

      const students = await Student.find({ adminId, ...classFilter }).select('_id');
      const studentIds = students.map(s => s._id);
      query.studentId = { $in: studentIds };
    }

    // 2. Fetch vehicle fee records, and admin/school profile
    const fees = await VehicleFee.find(query)
      .populate('studentId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const admin = await Admin.findById(adminId).select('schoolName').lean().exec();
    const schoolName = admin?.schoolName || "E'School";

    // Filter out records where student population failed/missing
    const validFees = fees.filter((f: any) => f.studentId);

    if (!idsParam) {
      // GENERATE TABULAR LIST
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage([850, 800]);
      const { height } = page.getSize();
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('All Vehicle Fees Record', {
        x: 30,
        y: height - 40,
        size: 24,
        font: fontBold,
        color: rgb(0, 0, 0.8),
      });

      let y = height - 80;
      const lineHeight = 16;
      
      const header = ['Student', 'Class/Sec', 'Bus No', 'City', 'Utr', 'Month', 'Paid Amt', 'Status'];
      const colWidths = [120, 70, 80, 90, 120, 100, 80, 70];
      let x = 30;
      header.forEach((text, i) => {
        page.drawText(text, { x, y, size: 12, font: fontBold, color: rgb(0, 0, 0) });
        x += colWidths[i];
      });

      y -= lineHeight;
      validFees.forEach((fee: any) => {
        x = 30;
        const student = fee.studentId || {};
        const row = [
          (student.name || '-').substring(0, 18),
          `${student.grade || '-'} ${student.section || ''}`.substring(0, 10),
          (fee.busNumber || '-').substring(0, 10),
          (fee.city || '-').substring(0, 12),
          (fee.utr || '-').substring(0, 18),
          (fee.month || '-').substring(0, 15),
          `Rs. ${fee.amount || 0}`,
          (fee.status || 'Pending')
        ];
        
        row.forEach((cell, i) => {
          page.drawText(cell, { x, y, size: 11, font: fontRegular, color: rgb(0, 0, 0) });
          x += colWidths[i];
        });
        
        y -= lineHeight;
        if (y < 40) {
          page = pdfDoc.addPage([850, 800]);
          y = height - 40;
        }
      });

      const pdfBytes = await pdfDoc.save();
      return new NextResponse(new Uint8Array(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="all-vehicle-fees-list.pdf"',
        },
      });
    }

    // 3. Setup A4 multi-page document settings
    const PAGE_W = 595;
    const PAGE_H = 842;
    const COLS = 2;
    const ROWS = 2;
    const GAP = 6;
    const MARGIN = 12;

    const cellW = (PAGE_W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
    const cellH = (PAGE_H - MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const totalRecords = validFees.length;
    const recordsPerPage = 4;
    const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));

    // Draw one receipt on a specific page
    const drawReceipt = (page: any, fee: any, ox: number, oy: number, w: number, h: number) => {
      const student = fee.studentId;
      const totalFees = fee.totalFees || 0;
      const balance = Math.max(0, totalFees - fee.amount);

      const dateStr = fee.paidDate
        ? new Date(fee.paidDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : new Date(fee.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' });

      const receiptNo = `#${fee._id.toString().substring(18).toUpperCase()}`;

      const indigo = rgb(99 / 255, 102 / 255, 241 / 255);
      const white  = rgb(1, 1, 1);
      const gray1  = rgb(75 / 255, 85 / 255, 99 / 255);
      const gray2  = rgb(107 / 255, 114 / 255, 128 / 255);
      const gray3  = rgb(229 / 255, 231 / 255, 235 / 255);
      const gray4  = rgb(249 / 255, 250 / 255, 251 / 255);
      const dark   = rgb(17 / 255, 24 / 255, 39 / 255);
      const red    = rgb(220 / 255, 38 / 255, 38 / 255);

      const s = Math.min(w / 450, h / 600);
      const sc = (v: number) => v * s;

      // Outer border
      page.drawRectangle({
        x: ox, y: oy, width: w, height: h,
        borderWidth: 1.2,
        borderColor: indigo,
        color: rgb(253 / 255, 254 / 255, 255 / 255),
      });

      // Header band
      const hdrH = sc(80);
      page.drawRectangle({ x: ox, y: oy + h - hdrH, width: w, height: hdrH, color: indigo });

      // Centered header text helper
      const centered = (text: string, yAbs: number, size: number, font: any, color: any) => {
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: ox + (w - tw) / 2, y: yAbs, size, font, color });
      };

      const hdrTop = oy + h - hdrH;
      centered(schoolName.toUpperCase(),       hdrTop + sc(55), sc(14), fontBold, white);
      centered('VEHICLE TRANSPORT RECEIPT',   hdrTop + sc(36), sc(9),  fontBold, rgb(0.85, 0.88, 1));

      // Receipt No & Date
      const metaY = oy + h - hdrH - sc(22);
      page.drawText(`Receipt No: ${receiptNo}`, { x: ox + sc(18), y: metaY, size: sc(8), font: fontBold, color: gray1 });
      const dateText = `Date: ${dateStr}`;
      const dtW = fontBold.widthOfTextAtSize(dateText, sc(8));
      page.drawText(dateText, { x: ox + w - sc(18) - dtW, y: metaY, size: sc(8), font: fontBold, color: gray1 });

      // Separator
      page.drawLine({ start: { x: ox + sc(15), y: metaY - sc(8) }, end: { x: ox + w - sc(15), y: metaY - sc(8) }, thickness: 0.5, color: gray3 });

      // Student & Vehicle Info label
      const siLabelY = metaY - sc(22);
      page.drawText('STUDENT & VEHICLE INFORMATION', { x: ox + sc(18), y: siLabelY, size: sc(8.5), font: fontBold, color: indigo });

      // Student/Route Info card bg
      const cardH = sc(95);
      const cardY = siLabelY - sc(12) - cardH;
      page.drawRectangle({ x: ox + sc(15), y: cardY, width: w - sc(30), height: cardH, color: gray4, borderWidth: 0.4, borderColor: gray3 });

      const sf = (label: string, val: string, fx: number, fy: number) => {
        page.drawText(label, { x: ox + fx, y: fy, size: sc(8), font: fontBold, color: gray2 });
        page.drawText(val,   { x: ox + fx + sc(75), y: fy, size: sc(8), font: fontRegular, color: dark });
      };

      const row1Y = cardY + cardH - sc(17);
      const row2Y = row1Y - sc(18);
      const row3Y = row2Y - sc(18);
      const row4Y = row3Y - sc(18);

      sf('Student Name:', student.name || '—',                                    sc(28), row1Y);
      sf('Father Name:', fee.fatherName || student.fatherName || student.fatheName || '—', sc(28), row2Y);
      sf('Roll Number:',  student.rollNumber || '—',                               sc(28), row3Y);
      sf('Class:', `${student.grade || '—'} (${student.section || '—'})`,          sc(28), row4Y);
      
      sf('Vehicle/Bus:', fee.busNumber || '—',                                     sc(200), row1Y);
      sf('City:',  fee.city || '—',                                                sc(200), row2Y);
      sf('UTR:',  fee.utr || '—',                                                  sc(200), row3Y);

      // Separator
      const sep2Y = cardY - sc(10);
      page.drawLine({ start: { x: ox + sc(15), y: sep2Y }, end: { x: ox + w - sc(15), y: sep2Y }, thickness: 0.5, color: gray3 });

      // Payment Particulars
      const ppY = sep2Y - sc(16);
      page.drawText('PAYMENT PARTICULARS', { x: ox + sc(18), y: ppY, size: sc(8.5), font: fontBold, color: indigo });

      // Table headers
      const thY = ppY - sc(18);
      const cols = [sc(25), sc(118), sc(182), sc(245), sc(308)];
      const headers = ['Description', 'Month', 'Route Fee', 'Paid Amt', 'Balance'];
      headers.forEach((h2, i) => page.drawText(h2, { x: ox + cols[i], y: thY, size: sc(7.5), font: fontBold, color: gray1 }));

      page.drawLine({ start: { x: ox + sc(15), y: thY - sc(7) }, end: { x: ox + w - sc(15), y: thY - sc(7) }, thickness: 0.6, color: rgb(156 / 255, 163 / 255, 175 / 255) });

      const rowDataY = thY - sc(18);
      const vals = [
        'Vehicle Transport',
        fee.month,
        totalFees > 0 ? `Rs. ${totalFees}` : '—',
        `Rs. ${fee.amount}`,
        `Rs. ${balance}`,
      ];
      vals.forEach((v, i) => {
        const isAmt = i >= 3;
        page.drawText(v, { x: ox + cols[i], y: rowDataY, size: sc(7.5), font: isAmt ? fontBold : fontRegular, color: i === 4 ? red : dark });
      });

      page.drawLine({ start: { x: ox + sc(15), y: rowDataY - sc(10) }, end: { x: ox + w - sc(15), y: rowDataY - sc(10) }, thickness: 0.5, color: gray3 });

      // Total row
      const totalY = rowDataY - sc(22);
      const totalLabel = 'Total Paid:';
      const totalLabelW = fontBold.widthOfTextAtSize(totalLabel, sc(8.5));
      page.drawText(totalLabel,        { x: ox + w - sc(18) - totalLabelW - sc(40), y: totalY, size: sc(8.5), font: fontBold, color: gray1 });
      page.drawText(`Rs. ${fee.amount}`, { x: ox + w - sc(18) - sc(38), y: totalY, size: sc(8.5), font: fontBold, color: indigo });

      // Stamp
      const stampX = ox + w - sc(90);
      const stampY2 = oy + sc(50);
      if (fee.status === 'Paid') {
        page.drawRectangle({ x: stampX, y: stampY2, width: sc(65), height: sc(26), borderWidth: 1.5, borderColor: rgb(16 / 255, 185 / 255, 129 / 255), color: rgb(240 / 255, 253 / 255, 250 / 255), rotate: degrees(-12) });
        page.drawText('PAID', { x: stampX + sc(14), y: stampY2 + sc(6), size: sc(13), font: fontBold, color: rgb(16 / 255, 185 / 255, 129 / 255), rotate: degrees(-12) });
      } else {
        page.drawRectangle({ x: stampX, y: stampY2, width: sc(75), height: sc(26), borderWidth: 1.5, borderColor: rgb(245 / 255, 158 / 255, 11 / 255), color: rgb(254 / 255, 243 / 255, 199 / 255), rotate: degrees(-12) });
        page.drawText('PENDING', { x: stampX + sc(6), y: stampY2 + sc(7), size: sc(10), font: fontBold, color: rgb(245 / 255, 158 / 255, 11 / 255), rotate: degrees(-12) });
      }

      // Signature line
      page.drawLine({ start: { x: ox + sc(28), y: oy + sc(52) }, end: { x: ox + sc(115), y: oy + sc(52) }, thickness: 0.5, color: gray2 });
      page.drawText('Authorized Signature', { x: ox + sc(35), y: oy + sc(40), size: sc(7), font: fontRegular, color: gray2 });

      // Footer
      const footer = 'Computer generated receipt. Thank you!';
      const ftW = fontOblique.widthOfTextAtSize(footer, sc(6.5));
      page.drawText(footer, { x: ox + (w - ftW) / 2, y: oy + sc(24), size: sc(6.5), font: fontOblique, color: gray3 });
    };

    // 4. Generate pages with 4-up different receipts
    for (let p = 0; p < totalPages; p++) {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

      // Draw dashed cut guides
      const dashColor = rgb(180 / 255, 180 / 255, 180 / 255);
      const cutX = MARGIN + cellW + GAP / 2;
      for (let y = 0; y < PAGE_H; y += 10) {
        page.drawLine({ start: { x: cutX, y }, end: { x: cutX, y: y + 5 }, thickness: 0.5, color: dashColor });
      }
      const cutY = MARGIN + cellH + GAP / 2;
      for (let x = 0; x < PAGE_W; x += 10) {
        page.drawLine({ start: { x, y: cutY }, end: { x: x + 5, y: cutY }, thickness: 0.5, color: dashColor });
      }

      // Draw receipts for the 4 slots on this page
      for (let slot = 0; slot < recordsPerPage; slot++) {
        const recordIndex = p * recordsPerPage + slot;
        if (recordIndex >= totalRecords) break;

        const fee = validFees[recordIndex];

        const col = slot % 2;
        const row = 1 - Math.floor(slot / 2);

        const ox = MARGIN + col * (cellW + GAP);
        const oy = MARGIN + row * (cellH + GAP);

        drawReceipt(page, fee, ox, oy, cellW, cellH);
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="all-vehicle-receipts.pdf"',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
  }
}
