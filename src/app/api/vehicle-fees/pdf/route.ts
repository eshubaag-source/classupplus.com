import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { VehicleFee } from '@/models/VehicleFee';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import Fees from '@/models/Fees';
import { ClassFee } from '@/models/ClassFee';
import { getTokenPayload, getTeacherClassFilter } from '@/lib/auth';

const normalizeGrade = (g: string) =>
  g.trim().toLowerCase().replace(/^class\s+/i, '').replace(/(th|st|nd|rd)$/i, '').trim();

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
      const studentIds = students.map((s: any) => s._id);
      query.studentId = { $in: studentIds };
    }

    const fees = await VehicleFee.find(query)
      .populate('studentId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const admin = await Admin.findById(adminId).select('schoolName').lean().exec();
    const schoolName = (admin?.schoolName || 'Classupplus').toUpperCase();
    const classFees = await ClassFee.find({ adminId }).lean().exec();

    const validFees = fees.filter((f: any) => f.studentId);

    const e = (s: any) => String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // ── NO ids: tabular list HTML ─────────────────────────────────────────
    if (!idsParam) {
      const rows = validFees.map((fee: any) => {
        const student = fee.studentId || {};
        const receiptNo = fee._id ? `#${fee._id.toString().substring(18).toUpperCase()}` : '-';
        const dateStr = fee.paidDate
          ? new Date(fee.paidDate).toLocaleDateString('en-IN')
          : fee.createdAt ? new Date(fee.createdAt).toLocaleDateString('en-IN') : '—';
        return `<tr>
          <td>${e(receiptNo)}</td>
          <td class="hindi">${e(student.name)}</td>
          <td class="hindi">${e(student.fatherName || fee.fatherName)}</td>
          <td>${e(student.grade)}${student.section ? ` (${e(student.section)})` : ''}</td>
          <td>${e(fee.busNumber)}</td>
          <td>${e(fee.city)}</td>
          <td>${e(fee.utr)}</td>
          <td>${e(fee.month)}</td>
          <td><strong>Rs. ${e(fee.amount)}</strong></td>
          <td>${fee.lastyear ? `Rs. ${e(fee.lastyear)}` : '—'}</td>
          <td><span class="badge ${fee.status === 'Paid' ? 'paid' : 'pend'}">${e(fee.status)}</span></td>
          <td>${e(dateStr)}</td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8"/>
  <title>All Vehicle Fees — ${e(schoolName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
    body{font-family:'Inter','Noto Sans Devanagari',sans-serif;background:#f3f4f6;padding:24px}
    .card{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden}
    .top{background:#f59e0b linear-gradient(135deg,#f59e0b,#d97706) !important;color:#fff !important;padding:20px 28px}
    .top h1{font-size:1.4rem;font-weight:700;letter-spacing:1px}
    .top p{font-size:0.82rem;opacity:0.85;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:0.82rem}
    thead{background:#f9fafb}
    th{padding:10px 12px;text-align:left;font-weight:700;color:#4b5563;border-bottom:2px solid #e5e7eb;white-space:nowrap}
    td{padding:9px 12px;color:#111827;border-bottom:1px solid #f3f4f6;vertical-align:middle}
    tr:hover td{background:#fffbeb}
    .hindi{font-family:'Noto Sans Devanagari','Inter',sans-serif}
    .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700}
    .paid{background:#ecfdf5 !important;color:#059669 !important}
    .pend{background:#fffbeb !important;color:#d97706 !important}
    .print-btn{display:block;margin:20px auto;padding:10px 32px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit}
    @media print{
      body{background:#fff;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
      .top { box-shadow: inset 0 0 0 1000px #f59e0b !important; color: #fff !important; }
      .stamp-paid, .paid { box-shadow: inset 0 0 0 1000px #ecfdf5 !important; color: #10b981 !important; }
      .stamp-pend, .pend { box-shadow: inset 0 0 0 1000px #fffbeb !important; color: #f59e0b !important; }
      .print-btn{display:none!important}
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <h1>${e(schoolName)}</h1>
      <p>All Vehicle Fees Record &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Receipt No</th><th>Student</th><th>Father Name</th><th>Class/Sec</th>
          <th>Bus No</th><th>City</th><th>UTR</th><th>Month</th>
          <th>Paid Amt</th><th>Last Year</th><th>Status</th><th>Date</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="12" style="text-align:center;padding:32px;color:#6b7280">No records found.</td></tr>'}</tbody>
    </table>
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── With ids: 4-up receipt HTML ────────────────────────────────────────
    const receiptCards = await Promise.all(validFees.map(async (fee: any) => {
      const student = fee.studentId || {};
      const isVehicleFee = fee.category === 'vehicle';

      let schoolFeeRecord: any = null;
      let vehicleFeeRecord: any = null;

      if (isVehicleFee) {
        vehicleFeeRecord = fee;
        schoolFeeRecord = await Fees.findOne({ adminId, studentId: student._id, month: fee.month }).lean().exec();
      } else {
        schoolFeeRecord = fee;
        vehicleFeeRecord = await VehicleFee.findOne({ adminId, studentId: student._id, month: fee.month }).lean().exec();
      }

      // Calculate class fee
      let classAmount = 0;
      if (student.grade) {
        const gradeNorm = normalizeGrade(student.grade);
        const subjectNorm = (student.subject || '').trim().toLowerCase();
        let match = classFees.find((cf: any) =>
          normalizeGrade(cf.grade) === gradeNorm && (cf.subject || '').trim().toLowerCase() === subjectNorm
        );
        if (!match) {
          match = classFees.find((cf: any) =>
            normalizeGrade(cf.grade) === gradeNorm && (cf.subject || '') === ''
          );
        }
        if (match) classAmount = (match as any).amount;
      }
      if (classAmount === 0 && schoolFeeRecord?.classFee) {
        classAmount = Number(schoolFeeRecord.classFee) || 0;
      }

      const transportAmount = vehicleFeeRecord ? vehicleFeeRecord.amount : 0;
      const transportTotal = vehicleFeeRecord ? (vehicleFeeRecord.totalFees ?? 0) : 0;
      const grandPaid = (schoolFeeRecord ? schoolFeeRecord.amount : 0) + (vehicleFeeRecord ? vehicleFeeRecord.amount : 0);
      const isPaid = (schoolFeeRecord ? schoolFeeRecord.status === 'Paid' : true) && (vehicleFeeRecord ? vehicleFeeRecord.status === 'Paid' : true);

      const dateStr = fee.paidDate
        ? new Date(fee.paidDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
        : fee.createdAt ? new Date(fee.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';
      const receiptNo = `#${fee._id.toString().substring(18).toUpperCase()}`;
      const utrStr = schoolFeeRecord?.utr || vehicleFeeRecord?.utr || '—';
      const fatherName = fee.fatherName || student.fatherName || student.fatheName || '—';

      const schoolRow = schoolFeeRecord ? `<tr>
        <td>School Fees</td>
        <td>${e(schoolFeeRecord.month)}</td>
        <td>${classAmount > 0 ? `Rs. ${classAmount}` : '—'}</td>
        <td><strong>Rs. ${e(schoolFeeRecord.amount)}</strong></td>
        <td class="red">Rs. ${Math.max(0, classAmount - schoolFeeRecord.amount)}</td>
      </tr>` : '';

      const vehicleRow = vehicleFeeRecord ? `<tr>
        <td>Transport Fee</td>
        <td>${e(vehicleFeeRecord.month)}</td>
        <td>${transportTotal > 0 ? `Rs. ${transportTotal}` : '—'}</td>
        <td><strong>Rs. ${e(vehicleFeeRecord.amount)}</strong></td>
        <td class="red">Rs. ${Math.max(0, transportTotal - vehicleFeeRecord.amount)}</td>
      </tr>` : '';

      return `<div class="receipt">
  <div class="r-header">
    <div class="r-school">${e(schoolName)}</div>
    <div class="r-sub">VEHICLE TRANSPORT RECEIPT</div>
  </div>
  <div class="r-meta">
    <span>Receipt: ${e(receiptNo)}</span>
    <span>Date: ${e(dateStr)}</span>
  </div>
  <div class="r-sep"></div>
  <div class="r-section-title">STUDENT &amp; VEHICLE INFORMATION</div>
  <div class="r-card">
    <div class="r-grid">
      <div class="r-field"><label>Student Name</label><span class="hindi">${e(student.name)}</span></div>
      <div class="r-field"><label>Vehicle / Bus No.</label><span>${e(fee.busNumber)}</span></div>
      <div class="r-field"><label>Father's Name</label><span class="hindi">${e(fatherName)}</span></div>
      <div class="r-field"><label>City / Route</label><span>${e(fee.city)}</span></div>
      <div class="r-field"><label>Class / Grade</label><span>${e(student.grade || '—')}${student.section ? ` (${e(student.section)})` : ''}</span></div>
      <div class="r-field"><label>UTR</label><span>${e(utrStr)}</span></div>
    </div>
  </div>
  <div class="r-sep"></div>
  <div class="r-section-title">PAYMENT PARTICULARS</div>
  <table class="r-table">
    <thead><tr><th>Description</th><th>Month</th><th>Total Fee</th><th>Paid Amt</th><th>Balance</th></tr></thead>
    <tbody>
      ${schoolRow}
      ${vehicleRow}
    </tbody>
  </table>
  <div class="r-total">
    <span>Total Paid:</span>
    <strong>Rs. ${grandPaid}</strong>
  </div>
  <div class="r-bottom">
    <div class="r-sig"><div class="r-line"></div><p>Authorized Signature</p></div>
    <div class="stamp ${isPaid ? 'stamp-paid' : 'stamp-pend'}">${isPaid ? 'PAID' : 'PENDING'}</div>
  </div>
  <div class="r-footer">Computer generated receipt. Thank you!</div>
</div>`;
    }));

    const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8"/>
  <title>Vehicle Receipts — ${e(schoolName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
    body{font-family:'Inter','Noto Sans Devanagari',sans-serif;background:#e5e7eb;padding:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:1100px;margin:0 auto}
    .receipt{background:#fff;border:1.5px solid #f59e0b;border-radius:12px;overflow:hidden;font-size:0.78rem;display:flex;flex-direction:column}
    .r-header{background:#f59e0b linear-gradient(135deg,#f59e0b,#d97706) !important;color:#fff !important;text-align:center;padding:14px 10px 10px}
    .r-school{font-size:1rem;font-weight:800;letter-spacing:1px}
    .r-sub{font-size:0.7rem;opacity:0.88;margin-top:3px;letter-spacing:0.5px}
    .r-meta{display:flex;justify-content:space-between;padding:8px 14px;font-size:0.73rem;font-weight:600;color:#4b5563;background:#f9fafb;border-bottom:1px solid #e5e7eb}
    .r-sep{height:1px;background:#e5e7eb;margin:0 14px}
    .r-section-title{font-size:0.65rem;font-weight:800;color:#d97706;text-transform:uppercase;letter-spacing:0.08em;padding:8px 14px 4px}
    .r-card{background:#f9fafb;border:0.5px solid #e5e7eb;border-radius:8px;margin:0 10px 6px;padding:8px 10px}
    .r-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px}
    .r-field label{font-size:0.65rem;font-weight:600;color:#6b7280;display:block;margin-bottom:1px}
    .r-field span{font-size:0.8rem;color:#111827;font-family:'Inter','Noto Sans Devanagari',sans-serif}
    .hindi{font-family:'Noto Sans Devanagari','Inter',sans-serif!important}
    .r-table{width:calc(100% - 20px);margin:0 10px 4px;border-collapse:collapse;font-size:0.72rem}
    .r-table thead tr{border-bottom:1.5px solid #9ca3af}
    .r-table th{padding:5px 4px;text-align:left;font-weight:700;color:#4b5563}
    .r-table td{padding:5px 4px;color:#111827;border-bottom:1px solid #f3f4f6}
    .red{color:#dc2626;font-weight:700}
    .r-total{display:flex;justify-content:space-between;align-items:center;margin:4px 10px 6px;background:#fffbeb;border:0.5px solid #fde68a;border-radius:6px;padding:6px 10px;font-size:0.73rem}
    .r-total span{font-weight:600;color:#4b5563}
    .r-total strong{font-weight:800;color:#d97706;font-size:0.85rem}
    .r-bottom{display:flex;justify-content:space-between;align-items:flex-end;padding:6px 14px 8px}
    .r-sig{text-align:center}
    .r-line{width:90px;height:1px;background:#9ca3af;margin:0 auto 3px}
    .r-sig p{font-size:0.62rem;color:#6b7280}
    .stamp{border:2px solid;font-weight:800;font-size:0.85rem;padding:4px 10px;border-radius:5px;letter-spacing:2px;transform:rotate(-12deg);display:inline-block}
    .stamp-paid{border-color:#10b981;background:#ecfdf5;color:#10b981}
    .stamp-pend{border-color:#f59e0b;background:#fffbeb;color:#f59e0b}
    .r-footer{text-align:center;font-size:0.6rem;color:#9ca3af;font-style:italic;padding:0 10px 8px}
    .print-btn{display:block;margin:16px auto 0;padding:10px 32px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;font-family:inherit}
    @media print{
      body{background:#fff;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
      .top, .r-header { box-shadow: inset 0 0 0 1000px #f59e0b !important; color: #fff !important; }
      .stamp-paid, .paid { box-shadow: inset 0 0 0 1000px #ecfdf5 !important; color: #10b981 !important; }
      .stamp-pend, .pend { box-shadow: inset 0 0 0 1000px #fffbeb !important; color: #f59e0b !important; }
      .print-btn{display:none!important}
      .grid{gap:0;page-break-inside:avoid}
      .receipt{border-radius:0;border:1px solid #f59e0b}
    }
  </style>
</head>
<body>
  <div class="grid">
    ${receiptCards.join('') || '<div style="padding:40px;text-align:center;color:#6b7280;grid-column:span 2">No receipts found.</div>'}
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to generate receipts' }, { status: 500 });
  }
}
