import { NextRequest, NextResponse } from 'next/server';
import { generateScripts } from '@/lib/claude';
import getDb from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { scriptId, voiceModifier, energyLevel, voice } = await req.json();
    const db = getDb();

    const original = db.prepare('SELECT * FROM scripts WHERE id = ?').get(scriptId) as {
      id: number; hook: string; body: string; cta: string; voice: string; energy_level: number;
      pillar: string; source_type: string;
    } | undefined;

    if (!original) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

    const [remixed] = await generateScripts({
      mode: 'remix',
      voiceModifier: voiceModifier || original.voice,
      energyLevel: energyLevel || original.energy_level,
      originalScript: { hook: original.hook, body: original.body, cta: original.cta },
    });

    const result = db.prepare(`
      INSERT INTO scripts (source_type, voice, energy_level, hook, body, cta, pillar, confidence_score, confidence_reason, remix_parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      original.source_type,
      voice || original.voice,
      energyLevel || original.energy_level,
      remixed.hook,
      remixed.body,
      remixed.cta,
      remixed.pillar,
      remixed.confidence_score,
      remixed.confidence_reason,
      scriptId
    );

    return NextResponse.json({ script: { ...remixed, id: result.lastInsertRowid } });
  } catch (err) {
    console.error('Remix error:', err);
    return NextResponse.json({ error: 'Remix failed' }, { status: 500 });
  }
}
