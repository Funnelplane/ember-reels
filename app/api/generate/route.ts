import { NextRequest, NextResponse } from 'next/server';
import { generateScripts } from '@/lib/claude';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,
      transcript,
      voice,
      voiceModifier,
      energyLevel,
      trendText,
      sourceUrl,
      youtubeTitle,
    } = body;

    const db = getDb();

    // Get custom voice from settings
    const voiceProfile = db.prepare('SELECT base_prompt FROM voice_profiles WHERE is_active = 1 LIMIT 1').get() as { base_prompt: string } | undefined;

    // Get saved scripts for context (original mode)
    let savedScripts: string | undefined;
    let graveyardSummary: string | undefined;

    if (mode === 'original') {
      const saved = db.prepare(
        'SELECT hook, body, cta, pillar, voice FROM scripts WHERE status = ? AND liked = 1 ORDER BY created_at DESC LIMIT 20'
      ).all('saved') as Array<{ hook: string; body: string; cta: string; pillar: string; voice: string }>;

      if (saved.length > 0) {
        savedScripts = saved.map((s, i) =>
          `[${i + 1}] Hook: ${s.hook}\nBody: ${s.body}\nCTA: ${s.cta}\nPillar: ${s.pillar}`
        ).join('\n\n');
      }

      const graveyard = db.prepare(
        'SELECT hook FROM scripts WHERE status = ? ORDER BY created_at DESC LIMIT 10'
      ).all('graveyard') as Array<{ hook: string }>;

      if (graveyard.length > 0) {
        graveyardSummary = graveyard.map(s => s.hook).join('; ');
      }
    }

    // Save trend if provided
    if (trendText) {
      const existing = db.prepare('SELECT id FROM trend_injections WHERE trend_text = ?').get(trendText) as { id: number } | undefined;
      if (existing) {
        db.prepare('UPDATE trend_injections SET used_count = used_count + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      } else {
        db.prepare('INSERT INTO trend_injections (trend_text) VALUES (?)').run(trendText);
      }
    }

    const scripts = await generateScripts({
      mode,
      transcript,
      voiceModifier,
      energyLevel,
      trendText,
      savedScripts,
      graveyardSummary,
      customVoice: voiceProfile?.base_prompt,
    });

    // Save scripts to DB
    const insert = db.prepare(`
      INSERT INTO scripts (source_type, source_url, youtube_title, transcript_snippet, voice, energy_level, hook, body, cta, pillar, confidence_score, confidence_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const savedIds: number[] = [];
    for (const s of scripts) {
      const result = insert.run(
        mode === 'youtube' ? 'youtube' : 'original',
        sourceUrl || null,
        youtubeTitle || null,
        transcript ? transcript.slice(0, 500) : null,
        voice,
        energyLevel,
        s.hook,
        s.body,
        s.cta,
        s.pillar,
        s.confidence_score,
        s.confidence_reason
      );
      savedIds.push(result.lastInsertRowid as number);
    }

    return NextResponse.json({ scripts: scripts.map((s, i) => ({ ...s, id: savedIds[i] })) });
  } catch (err) {
    console.error('Generate error:', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
