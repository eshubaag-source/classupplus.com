import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';
import { Timetable } from '@/models/Timetable';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface TokenPayload {
  id: string;
  username: string;
  role: 'admin' | 'teacher';
  adminId: string;
}

/**
 * Extracts and verifies the JWT from the cookie.
 * Returns the token payload or null if missing/invalid.
 */
export async function getTokenPayload(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Returns the admin's ObjectId (used to scope all data queries).
 * - If the logged-in user is an admin, returns their own id.
 * - If the logged-in user is a teacher, returns null (teachers
 *   do not directly own data in this system).
 * Returns null if unauthenticated.
 */
export async function getAdminId(): Promise<string | null> {
  const payload = await getTokenPayload();
  if (!payload) return null;
  return payload.adminId || null;
}

/**
 * Escapes regex characters in a string.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getTeacherClassFilter(payload: TokenPayload): Promise<any> {
  if (payload.role !== 'teacher') return {};
  
  const teacher = await Teacher.findById(payload.id).lean();
  if (!teacher) return { _id: null }; // Force no results

  const conditions = [];
  if (teacher.grade && teacher.section) {
    conditions.push({ grade: teacher.grade, section: teacher.section });
  }
  
  if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    for (const cls of teacher.assignedClasses) {
      if (cls.grade && cls.section) {
        conditions.push({ grade: cls.grade, section: cls.section });
      }
    }
  }

  if (conditions.length > 0) {
    return { $or: conditions };
  }
  
  return { teacherId: payload.id };
}

/**
 * Checks if a teacher is authorized to access/modify a specific student's data.
 * Returns true if the user is an admin or if the student's grade/section matches the teacher's classes.
 */
export async function isTeacherAuthorizedForStudent(payload: TokenPayload, student: any): Promise<boolean> {
  if (payload.role !== 'teacher') return true;
  if (!student) return false;

  const stu = student.toObject ? student.toObject() : student;

  const teacher = await Teacher.findById(payload.id).lean();
  if (!teacher) return false;

  if (teacher.grade && teacher.section && stu.grade === teacher.grade && stu.section === teacher.section) {
    return true;
  }

  if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    for (const cls of teacher.assignedClasses) {
      if (cls.grade === stu.grade && cls.section === stu.section) {
        return true;
      }
    } 
  }

  // Fallback to teacherId
  if (stu.teacherId && stu.teacherId.toString() === payload.id) {
    return true;
  }

  console.error('isTeacherAuthorizedForStudent failed for:', { teacherId: payload.id, studentId: stu._id, teacherClasses: teacher.assignedClasses, teacherGrade: teacher.grade, studentGrade: stu.grade });
  return false;
}

