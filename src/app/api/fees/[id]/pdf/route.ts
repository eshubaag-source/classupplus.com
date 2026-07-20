import { NextResponse } from 'next/server';
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
    const fee = await Fees.findOne({ _id: id, adminId }).populate({ path: 'studentId', model: Student }).lean().exec();
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
    const schoolName = (admin?.schoolName || "Classupplus").toUpperCase();

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

    const dateStr = fee.paidDate
      ? new Date(fee.paidDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
      : new Date((fee as any).createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' });

    const receiptNo = `#${id.toString().substring(18).toUpperCase()}`;

    const lastYearVal = (fee as any).lastyear || (fee as any).lastyeae;
    const hasLastYear = lastYearVal && lastYearVal !== '—' && String(lastYearVal).trim() !== '' && String(lastYearVal).trim() !== '0';

    const statusColor = fee.status === 'Paid' ? '#10b981' : '#f59e0b';
    const statusBg = fee.status === 'Paid' ? '#ecfdf5' : '#fffbeb';
    const stampBorder = fee.status === 'Paid' ? '#10b981' : '#f59e0b';
    const stampText = fee.status === 'Paid' ? 'PAID' : 'PENDING';

    const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fee Receipt - ${receiptNo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body {
      font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
      background: #f3f4f6;
      display: flex;
      justify-content: center;
      padding: 32px 16px;
      min-height: 100vh;
    }
    .receipt {
      background: #fff;
      border-radius: 16px;
      border: 1.5px solid #6366f1;
      width: 480px;
      max-width: 100%;
      box-shadow: 0 8px 40px rgba(99,102,241,0.1);
      overflow: hidden;
    }
    .header {
      background: #6366f1 linear-gradient(135deg, #6366f1, #818cf8) !important;
      padding: 28px 24px 22px;
      text-align: center;
      color: #fff !important;
    }
    .header h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 0.8rem; opacity: 0.85; margin-top: 4px; letter-spacing: 0.5px; }
    .meta {
      display: flex;
      justify-content: space-between;
      padding: 12px 24px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 14px 24px 8px;
    }
    .info-card {
      margin: 0 20px 12px;
      background: #f9fafb;
      border: 0.5px solid #e5e7eb;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
    }
    .info-row label {
      font-size: 0.73rem;
      font-weight: 600;
      color: #6b7280;
      display: block;
      margin-bottom: 2px;
    }
    .info-row span {
      font-size: 0.87rem;
      color: #111827;
      font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;
    }
    .divider { height: 1px; background: #e5e7eb; margin: 2px 24px; }
    table {
      width: calc(100% - 40px);
      margin: 0 20px 8px;
      border-collapse: collapse;
      font-size: 0.82rem;
    }
    thead tr { border-bottom: 1.5px solid #9ca3af; }
    thead th {
      padding: 7px 6px;
      text-align: left;
      font-weight: 700;
      color: #4b5563;
      font-size: 0.78rem;
    }
    tbody tr { border-bottom: 1px solid #f3f4f6; }
    tbody td { padding: 7px 6px; color: #111827; }
    tbody td.amt { font-weight: 700; }
    tbody td.red { color: #dc2626; font-weight: 700; }
    .total-row {
      margin: 4px 20px 16px;
      background: #eef2ff;
      border: 0.5px solid #c7d2fe;
      border-radius: 8px;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-row span { font-size: 0.82rem; font-weight: 600; color: #4b5563; }
    .total-row strong { font-size: 1rem; font-weight: 700; color: #6366f1; }
    .bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 12px 24px 20px;
    }
    .signature { text-align: center; }
    .signature .line { width: 130px; height: 1px; background: #9ca3af; margin: 0 auto 4px; }
    .signature p { font-size: 0.73rem; color: #6b7280; }
    .stamp {
      border: 2.5px solid ${stampBorder} !important;
      background: ${statusBg} !important;
      color: ${statusColor} !important;
      font-weight: 800;
      font-size: 1.1rem;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 2px;
      transform: rotate(-12deg);
      display: inline-block;
    }
    .footer {
      text-align: center;
      font-size: 0.7rem;
      color: #9ca3af;
      font-style: italic;
      padding: 0 24px 14px;
    }
    .print-btn {
      display: block;
      margin: 20px auto 0;
      padding: 10px 32px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    @media print {
      body { background: #fff; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .header { box-shadow: inset 0 0 0 1000px #6366f1 !important; color: #fff !important; }
      .stamp { box-shadow: inset 0 0 0 1000px ${statusBg} !important; color: ${statusColor} !important; }
      .receipt { box-shadow: none; border-radius: 0; border: 1.5px solid #6366f1; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="receipt">
      <div class="header">
        <h1>${schoolName}</h1>
        <p>FEES PAYMENT RECEIPT</p>
      </div>

      <div class="meta">
        <span>Receipt No: ${receiptNo}</span>
        <span>Date: ${dateStr}</span>
      </div>

      <div class="section-title">Student Information</div>
      <div class="info-card">
        <div class="info-grid">
          <div class="info-row">
            <label>Student Name</label>
            <span>${student.name || '—'}</span>
          </div>
          <div class="info-row">
            <label>Class / Grade</label>
            <span>${student.grade || '—'}${student.section ? ` (Sec: ${student.section})` : ''}</span>
          </div>
          <div class="info-row">
            <label>Father's Name</label>
            <span>${student.fatherName || '—'}</span>
          </div>
          <div class="info-row">
            <label>UTR</label>
            <span>${(fee as any).utr || '—'}</span>
          </div>
          <div class="info-row">
            <label>Roll Number</label>
            <span>${student.rollNumber || '—'}</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="section-title">Payment Particulars</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Month</th>
            <th>Class Fee</th>
            <th>Paid Amt</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>School Fees</td>
            <td>${(fee as any).month || '—'}</td>
            <td>${classAmount > 0 ? `Rs. ${classAmount}` : '—'}</td>
            <td class="amt">Rs. ${fee.amount}</td>
            <td class="red">Rs. ${balance}</td>
          </tr>
          ${hasLastYear ? `<tr>
            <td>Last Year Fees</td>
            <td>—</td>
            <td>Pending</td>
            <td class="amt">—</td>
            <td class="amt">Rs. ${lastYearVal}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <div class="total-row">
        <span>Total Paid:</span>
        <strong>Rs. ${fee.amount}</strong>
      </div>

      <div class="bottom">
        <div class="signature">
          <div class="line"></div>
          <p>Authorized Signature</p>
        </div>
        <div class="stamp">${stampText}</div>
      </div>

      <div class="footer">This is a computer generated receipt. Thank you for your payment.</div>
    </div>

    <button class="print-btn" onclick="printPdf()">🖨️ Print / Save as PDF</button>
    <script>
      function printPdf() {
        const u = window.location.href;
        window.history.replaceState({}, '', '/');
        window.print();
        window.history.replaceState({}, '', u);
      }
    </script>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to generate receipt' }, { status: 500 });
  }
}
