import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const creators = db.prepare('SELECT * FROM creator_styles ORDER BY category, creator_name').all();
    return NextResponse.json({ creators });
  } catch (err) {
    console.error('Creators GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch creators' }, { status: 500 });
  }
}
