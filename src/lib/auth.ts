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

/**
 * Returns a MongoDB query filter object based on the teacher's class (grade and section).
 * Returns an empty object for admins.
 * Returns null if teacher profile is not found.
 */
export async function getTeacherClassFilter(payload: TokenPayload): Promise<any> {
  if (payload.role !== 'teacher') return {};

  await dbConnect();
  const teacher = await Teacher.findById(payload.id);
  if (!teacher) return null;

  const orConditions = [];

  // Check legacy grade/section
  if (teacher.grade && teacher.section) {
    orConditions.push({
      grade: { $regex: new RegExp(`^\\s*${escapeRegExp(teacher.grade.trim())}\\s*$`, 'i') },
      section: { $regex: new RegExp(`^\\s*${escapeRegExp(teacher.section.trim())}\\s*$`, 'i') }
    });
  }

  // Check assignedClasses array
  if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    for (const cls of teacher.assignedClasses) {
      if (cls.grade && cls.section) {
        orConditions.push({
          grade: { $regex: new RegExp(`^\\s*${escapeRegExp(cls.grade.trim())}\\s*$`, 'i') },
          section: { $regex: new RegExp(`^\\s*${escapeRegExp(cls.section.trim())}\\s*$`, 'i') }
        });
      }
    }
  }

  // Check Timetable periods
  const timetables = await Timetable.find({ teacherId: teacher._id });
  if (timetables && timetables.length > 0) {
    for (const tt of timetables) {
      if (tt.grade && tt.section) {
        orConditions.push({
          grade: { $regex: new RegExp(`^\\s*${escapeRegExp(tt.grade.trim())}\\s*$`, 'i') },
          section: { $regex: new RegExp(`^\\s*${escapeRegExp(tt.section.trim())}\\s*$`, 'i') }
        });
      }
    }
  }

  if (orConditions.length === 0) {
    return { _id: null }; // No classes assigned, match no students
  }

  return { $or: orConditions };
}

/**
 * Checks if a teacher is authorized to access/modify a specific student's data.
 * Returns true if the user is an admin or if the student's grade/section matches the teacher's assigned classes.
 */
export async function isTeacherAuthorizedForStudent(payload: TokenPayload, studentGrade: string, studentSection: string): Promise<boolean> {
  if (payload.role !== 'teacher') return true;

  await dbConnect();
  const teacher = await Teacher.findById(payload.id);
  if (!teacher) return false;

  const sGrade = studentGrade || '';
  const sSection = studentSection || '';

  if (teacher.grade && teacher.section) {
    const gradeRegex = new RegExp(`^\\s*${escapeRegExp(teacher.grade.trim())}\\s*$`, 'i');
    const sectionRegex = new RegExp(`^\\s*${escapeRegExp(teacher.section.trim())}\\s*$`, 'i');
    if (gradeRegex.test(sGrade) && sectionRegex.test(sSection)) {
      return true;
    }
  }

  if (teacher.assignedClasses && teacher.assignedClasses.length > 0) {
    for (const cls of teacher.assignedClasses) {
      if (cls.grade && cls.section) {
        const gradeRegex = new RegExp(`^\\s*${escapeRegExp(cls.grade.trim())}\\s*$`, 'i');
        const sectionRegex = new RegExp(`^\\s*${escapeRegExp(cls.section.trim())}\\s*$`, 'i');
        if (gradeRegex.test(sGrade) && sectionRegex.test(sSection)) {
          return true;
        }
      }
    }
  }

  const timetables = await Timetable.find({ teacherId: teacher._id });
  if (timetables && timetables.length > 0) {
    for (const tt of timetables) {
      if (tt.grade && tt.section) {
        const gradeRegex = new RegExp(`^\\s*${escapeRegExp(tt.grade.trim())}\\s*$`, 'i');
        const sectionRegex = new RegExp(`^\\s*${escapeRegExp(tt.section.trim())}\\s*$`, 'i');
        if (gradeRegex.test(sGrade) && sectionRegex.test(sSection)) {
          return true;
        }
      }
    }
  }

  return false;
}

