import { NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth';

export async function GET() {
  try {
    const payload = await getTokenPayload();
    if (!payload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ role: payload.role, username: payload.username });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
