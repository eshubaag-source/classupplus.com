export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/db';
import { Session } from '@/models/Session';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; username: string; role?: string; adminId?: string; sessionId?: string };
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
    const sessions = await Session.find({ userId: userPayload.id }).sort({ lastActive: -1 });

    return NextResponse.json(sessions, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userPayload = await getUserFromToken();
    if (!userPayload) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ message: 'Session ID is required' }, { status: 400 });
    }

    await dbConnect();

    // Make sure the user is only deleting their own session
    const deletedSession = await Session.findOneAndDelete({ _id: sessionId, userId: userPayload.id });

    if (!deletedSession) {
      return NextResponse.json({ message: 'Session not found or already deleted' }, { status: 404 });
    }

    // If the deleted session is the current one, optionally clear the cookie.
    // However, the client will likely handle redirecting to login.
    const response = NextResponse.json({ message: 'Session deleted successfully' }, { status: 200 });

    if (userPayload.sessionId === sessionId) {
      response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
