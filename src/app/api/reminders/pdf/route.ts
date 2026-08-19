import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Fees from '@/models/Fees';
import { VehicleFee } from '@/models/VehicleFee';
import Student from '@/models/Student';
import Admin from '@/models/Admin';
import { getTokenPayload } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const messageParam = searchParams.get('message');

    if (!idsParam) {
      return new NextResponse('Missing student IDs', { status: 400 });
    }

    const adminId = payload.adminId;
    await dbConnect();

    const selectedIds = idsParam.split(',').filter(Boolean);

    // Fetch the school name
    const admin = await Admin.findById(adminId).select('schoolName').lean().exec();
    const schoolName = (admin?.schoolName || 'Classupplus').toUpperCase();

    // Fetch students
    const students = await Student.find({ _id: { $in: selectedIds }, adminId }).lean().exec();
    if (!students || students.length === 0) {
      return new NextResponse('No valid students found', { status: 404 });
    }

    // Fetch pending fees
    const pendingFees = await Fees.find({ studentId: { $in: selectedIds }, adminId, status: 'Pending' }).lean().exec();
    
    // Fetch pending vehicle fees (Pending or Overdue)
    const pendingVehicleFees = await VehicleFee.find({ 
      studentId: { $in: selectedIds }, 
      adminId, 
      status: { $in: ['Pending', 'Overdue'] }
    }).lean().exec();

    // Group fees by student
    const studentDataMap = new Map();
    students.forEach((s: any) => {
      studentDataMap.set(s._id.toString(), {
        student: s,
        schoolFees: [],
        vehicleFees: []
      });
    });

    pendingFees.forEach((fee: any) => {
      const entry = studentDataMap.get(fee.studentId.toString());
      if (entry) entry.schoolFees.push(fee);
    });

    pendingVehicleFees.forEach((fee: any) => {
      const entry = studentDataMap.get(fee.studentId.toString());
      if (entry) entry.vehicleFees.push(fee);
    });

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    // Generate HTML for each student
    const noticesHtml = Array.from(studentDataMap.values()).map((data: any) => {
      const { student, schoolFees, vehicleFees } = data;
      
      const totalSchoolFee = schoolFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
      const totalVehicleFee = vehicleFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
      const grandTotal = totalSchoolFee + totalVehicleFee;

      let feeDetailsRows = '';
      if (schoolFees.length > 0) {
        feeDetailsRows += `
          <tr>
            <td colspan="2" style="background:#f9fafb; font-weight:bold; padding:8px 12px; border-bottom:1px solid #e5e7eb;">School Fees</td>
          </tr>
        `;
        schoolFees.forEach((f: any) => {
          feeDetailsRows += `
            <tr>
              <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6;">${f.month || 'N/A'} - ${f.category || 'Class'}</td>
              <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; text-align:right;">₹${f.amount}</td>
            </tr>
          `;
        });
      }

      if (vehicleFees.length > 0) {
        feeDetailsRows += `
          <tr>
            <td colspan="2" style="background:#f9fafb; font-weight:bold; padding:8px 12px; border-bottom:1px solid #e5e7eb;">Vehicle Fees</td>
          </tr>
        `;
        vehicleFees.forEach((f: any) => {
          feeDetailsRows += `
            <tr>
              <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6;">${f.month || 'N/A'}</td>
              <td style="padding:8px 12px; border-bottom:1px solid #f3f4f6; text-align:right;">₹${f.amount}</td>
            </tr>
          `;
        });
      }

      if (grandTotal === 0) {
        feeDetailsRows += `
          <tr>
            <td colspan="2" style="padding:16px; text-align:center; color:#10b981; font-weight:bold;">No pending fees!</td>
          </tr>
        `;
      }

      return `
        <div class="notice">
          <div class="header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="notice-title">FEE REMINDER</div>
            <div style="font-size: 0.9rem; color: #4b5563; margin-top:4px;">Date: ${currentDate}</div>
          </div>
          
          <div class="student-info">
            <div class="info-row"><span>Student Name:</span> <strong>${student.name}</strong></div>
            <div class="info-row"><span>Father's Name:</span> <strong>${student.fatherName || 'N/A'}</strong></div>
            <div class="info-row"><span>Class/Section:</span> <strong>${student.grade} - ${student.section}</strong></div>
            <div class="info-row"><span>Roll No:</span> <strong>${student.rollNumber}</strong></div>
          </div>

          <div class="content">
            ${messageParam 
              ? `<p>${messageParam.replace(/\[Student Name\]/gi, student.name).replace(/\n/g, '<br/>')}</p>`
              : `
            <p>Dear Parent,</p>
            <p>This is a gentle reminder regarding the outstanding fees for your ward. Please find the details below. We request you to kindly clear the dues at your earliest convenience.</p>
            `}
          </div>

          <table class="fee-table">
            <thead>
              <tr>
                <th style="text-align:left; padding:10px 12px; border-bottom:2px solid #e5e7eb; color:#374151;">Particulars</th>
                <th style="text-align:right; padding:10px 12px; border-bottom:2px solid #e5e7eb; color:#374151;">Amount Due</th>
              </tr>
            </thead>
            <tbody>
              ${feeDetailsRows}
            </tbody>
            <tfoot>
              <tr>
                <td style="text-align:right; padding:12px; font-weight:bold; font-size:1.1rem; border-top:2px solid #e5e7eb;">Grand Total:</td>
                <td style="text-align:right; padding:12px; font-weight:bold; font-size:1.1rem; border-top:2px solid #e5e7eb; color:#ef4444;">₹${grandTotal}</td>
              </tr>
            </tfoot>
          </table>
          
          <div class="footer">
            <p>Thank you for your cooperation.</p>
            <p style="margin-top:24px; font-weight:bold;">Principal / Administration</p>
            <p style="font-size:0.8rem; margin-top:4px; color:#6b7280;">${schoolName}</p>
          </div>
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fee Reminders</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      background: #f3f4f6;
      margin: 0; padding: 40px 20px;
      color: #1f2937;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }
    .notice {
      background: #fff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      border: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .school-name {
      margin: 0 0 8px 0;
      color: #6366f1;
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .notice-title {
      background: #6366f1;
      color: #fff;
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.1em;
    }
    .student-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #f3f4f6;
      margin-bottom: 30px;
    }
    .info-row { font-size: 0.95rem; }
    .info-row span { color: #6b7280; margin-right: 8px; }
    .content {
      line-height: 1.6;
      font-size: 1rem;
      margin-bottom: 30px;
    }
    .fee-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .footer {
      text-align: right;
      margin-top: 40px;
    }
    .print-btn {
      display: block;
      margin: 0 auto 30px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99,102,241,0.3);
    }
    @media print {
      @page { margin: 0; }
      body { background: #fff; padding: 1.5cm; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .container { max-width: 100%; gap: 0; display: block; }
      .notice { border: none; box-shadow: none; padding: 0; margin-bottom: 0; border-radius: 0; page-break-after: always; position: relative; }
      .notice:last-child { page-break-after: avoid; }
      .print-btn { display: none !important; }
      .header { border-bottom-color: #6366f1 !important; }
      .notice-title { box-shadow: inset 0 0 0 1000px #6366f1 !important; color: #fff !important; }
      .custom-footer {
        position: fixed;
        bottom: 0.5cm;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
      }
    }
    @media screen {
      .custom-footer { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="custom-footer">https://www.classupplus.com</div>
  <div class="container">
    ${noticesHtml}
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('PDF Reminder error:', error);
    return NextResponse.json({ message: error.message || 'Failed to generate reminders' }, { status: 500 });
  }
}
