import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const trends = db.prepare('SELECT * FROM trend_injections ORDER BY last_used DESC, created_at DESC LIMIT 10').all();
    return NextResponse.json({ trends });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
