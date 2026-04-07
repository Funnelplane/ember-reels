import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const voiceProfile = db.prepare('SELECT * FROM voice_profiles WHERE is_active = 1 LIMIT 1').get() as {
      id: number; name: string; base_prompt: string;
    } | undefined;

    const creators = db.prepare('SELECT * FROM creator_styles WHERE is_preset = 0').all();
    const recentTrends = db.prepare('SELECT * FROM trend_injections ORDER BY last_used DESC LIMIT 10').all();

    return NextResponse.json({
      customVoice: voiceProfile?.base_prompt || '',
      creators,
      recentTrends,
    });
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { action, customVoice, creatorName, creatorDescription } = await req.json();

    if (action === 'save-voice') {
      db.prepare('UPDATE voice_profiles SET is_active = 0').run();
      const existing = db.prepare('SELECT id FROM voice_profiles WHERE is_active = 0 LIMIT 1').get() as { id: number } | undefined;

      if (existing) {
        db.prepare('UPDATE voice_profiles SET base_prompt = ?, is_active = 1 WHERE id = ?').run(customVoice, existing.id);
      } else {
        db.prepare('INSERT INTO voice_profiles (name, base_prompt, is_active) VALUES (?, ?, 1)').run('Custom Voice', customVoice);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'add-creator') {
      const result = db.prepare(`
        INSERT INTO creator_styles (creator_name, description, prompt_modifier, category, is_preset)
        VALUES (?, ?, ?, 'Custom', 0)
      `).run(creatorName, creatorDescription, `Write in the style of ${creatorName}: ${creatorDescription}`);
      return NextResponse.json({ id: result.lastInsertRowid });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Settings POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
