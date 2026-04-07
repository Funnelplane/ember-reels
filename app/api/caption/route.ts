import { NextRequest, NextResponse } from 'next/server';
import { generateCaption } from '@/lib/claude';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { scriptId, hook, body, cta } = await req.json();
    const result = await generateCaption({ hook, body, cta });

    if (scriptId) {
      const db = getDb();
      db.prepare('UPDATE scripts SET caption = ?, hashtags = ? WHERE id = ?').run(
        result.caption,
        JSON.stringify(result.hashtags),
        scriptId
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Caption error:', err);
    return NextResponse.json({ error: 'Caption generation failed' }, { status: 500 });
  }
}
