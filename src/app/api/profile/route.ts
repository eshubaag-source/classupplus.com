import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Admin from '@/models/Admin';
import { Teacher } from '@/models/Teacher';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; username: string; role?: string; adminId?: string };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const role = userPayload.role || 'admin';

    if (role === 'admin') {
      const admin = await Admin.findById(userPayload.id).select('-password');
      if (!admin) return NextResponse.json({ message: 'Admin not found' }, { status: 404 });

      return NextResponse.json({
        role: 'admin',
        username: admin.username,
        schoolName: admin.schoolName || '',
        email: admin.email || '',
        mobileNumber: admin.mobileNumber || '',
        fast2smsApiKey: admin.fast2smsApiKey || '',
        fast2smsWabaPhoneId: admin.fast2smsWabaPhoneId || '',
        smsEnabled: admin.smsEnabled !== false,
        whatsappEnabled: admin.whatsappEnabled !== false,
      });
    } else {
      const teacher = await Teacher.findById(userPayload.id).select('-password');
      if (!teacher) return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });

      return NextResponse.json({
        role: 'teacher',
        username: teacher.email, // using email as primary identifier
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        grade: teacher.grade || '',
        section: teacher.section || '',
        assignedClasses: teacher.assignedClasses || [],
        schoolName: teacher.schoolName || '',
        aadhaarNumber: teacher.aadhaarNumber || '',
        qualification: teacher.qualification || '',
        subject: teacher.subject || '',
      });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const role = userPayload.role || 'admin';
    const body = await req.json();

    if (role === 'admin') {
      if (body.email) {
        const existingEmail = await Admin.findOne({ email: body.email, _id: { $ne: userPayload.id } });
        const existingTeacherEmail = await Teacher.findOne({ email: body.email });
        if (existingEmail || existingTeacherEmail) {
          return NextResponse.json({ message: 'Email is already registered.' }, { status: 400 });
        }
      }
      
      if (body.mobileNumber) {
        const existingMobile = await Admin.findOne({ mobileNumber: body.mobileNumber, _id: { $ne: userPayload.id } });
        const existingTeacherPhone = await Teacher.findOne({ phone: body.mobileNumber });
        if (existingMobile || existingTeacherPhone) {
          return NextResponse.json({ message: 'Mobile number is already registered.' }, { status: 400 });
        }
      }

      const admin = await Admin.findByIdAndUpdate(
        userPayload.id,
        {
          schoolName: body.schoolName,
          email: body.email,
          mobileNumber: body.mobileNumber,
          fast2smsApiKey: body.fast2smsApiKey,
          fast2smsWabaPhoneId: body.fast2smsWabaPhoneId,
          smsEnabled: body.smsEnabled,
          whatsappEnabled: body.whatsappEnabled,
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!admin) return NextResponse.json({ message: 'Admin not found' }, { status: 404 });

      return NextResponse.json({
        role: 'admin',
        username: admin.username,
        schoolName: admin.schoolName || '',
        email: admin.email || '',
        mobileNumber: admin.mobileNumber || '',
        fast2smsApiKey: admin.fast2smsApiKey || '',
        fast2smsWabaPhoneId: admin.fast2smsWabaPhoneId || '',
        smsEnabled: admin.smsEnabled !== false,
        whatsappEnabled: admin.whatsappEnabled !== false,
      });
    } else {
      if (body.email) {
        const existingEmail = await Teacher.findOne({ email: body.email, _id: { $ne: userPayload.id } });
        const existingAdminEmail = await Admin.findOne({ email: body.email });
        if (existingEmail || existingAdminEmail) {
          return NextResponse.json({ message: 'Email is already registered.' }, { status: 400 });
        }
      }
      
      if (body.phone) {
        const existingPhone = await Teacher.findOne({ phone: body.phone, _id: { $ne: userPayload.id } });
        const existingAdminPhone = await Admin.findOne({ mobileNumber: body.phone });
        if (existingPhone || existingAdminPhone) {
          return NextResponse.json({ message: 'Phone number is already registered.' }, { status: 400 });
        }
      }

      const teacher = await Teacher.findByIdAndUpdate(
        userPayload.id,
        {
          name: body.name,
          email: body.email,
          phone: body.phone,
          grade: body.grade,
          section: body.section,
          schoolName: body.schoolName,
          aadhaarNumber: body.aadhaarNumber,
          qualification: body.qualification,
          subject: body.subject,
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!teacher) return NextResponse.json({ message: 'Teacher not found' }, { status: 404 });

      return NextResponse.json({
        role: 'teacher',
        username: teacher.email,
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        grade: teacher.grade || '',
        section: teacher.section || '',
        schoolName: teacher.schoolName || '',
        aadhaarNumber: teacher.aadhaarNumber || '',
        qualification: teacher.qualification || '',
        subject: teacher.subject || '',
      });
    }
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Email already in use.' }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

