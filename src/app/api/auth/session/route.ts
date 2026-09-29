import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth/server-session';

export async function GET() {
  return NextResponse.json(await getAuthSession());
}
