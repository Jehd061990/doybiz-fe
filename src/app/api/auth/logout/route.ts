import { NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth/cookies';

export async function POST() {
  const response = NextResponse.json({ success: true });
  for (const name of [AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE]) {
    response.cookies.set(name, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
  }
  return response;
}
