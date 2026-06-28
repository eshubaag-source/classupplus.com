import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import { Teacher } from '@/models/Teacher';

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

  const gradePattern = new RegExp(`^\\s*${escapeRegExp(teacher.grade.trim())}\\s*$`, 'i');
  const sectionPattern = new RegExp(`^\\s*${escapeRegExp(teacher.section.trim())}\\s*$`, 'i');

  return {
    grade: { $regex: gradePattern },
    section: { $regex: sectionPattern }
  };
}

