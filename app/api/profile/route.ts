import { NextRequest, NextResponse } from 'next/server';
import { generateStyleProfile, analyzeCreatorStyle } from '@/lib/claude';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const profile = db.prepare('SELECT * FROM style_learnings ORDER BY generated_at DESC LIMIT 1').get() as {
      id: number; profile_summary: string; top_pillars: string; preferred_voices: string;
      avoid_patterns: string; generated_at: string; script_count_at_generation: number;
    } | undefined;

    const creators = db.prepare('SELECT * FROM creator_styles ORDER BY category, creator_name').all();
    const series = db.prepare(`
      SELECT cs.*, GROUP_CONCAT(ss.script_id || ':' || ss.position) as script_positions
      FROM content_series cs
      LEFT JOIN series_scripts ss ON cs.id = ss.series_id
      GROUP BY cs.id
      ORDER BY cs.created_at DESC
    `).all();

    const seriesWithScripts = (series as Array<{
      id: number; title: string; description: string; created_at: string; script_positions: string;
    }>).map(s => {
      const positions = s.script_positions
        ? s.script_positions.split(',').map((p: string) => {
            const [scriptId, position] = p.split(':');
            return { scriptId: parseInt(scriptId), position: parseInt(position) };
          })
        : [];
      const scriptIds = positions.sort((a, b) => a.position - b.position).map(p => p.scriptId);
      const scripts = scriptIds.length
        ? db.prepare(`SELECT * FROM scripts WHERE id IN (${scriptIds.map(() => '?').join(',')}) `).all(...scriptIds)
        : [];
      return { ...s, scripts };
    });

    return NextResponse.json({ profile, creators, series: seriesWithScripts });
  } catch (err) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { action, text, name, description } = await req.json();

    if (action === 'regenerate') {
      const scripts = db.prepare(
        'SELECT hook, body, cta, pillar, voice FROM scripts WHERE liked = 1 OR status = ? ORDER BY created_at DESC LIMIT 50'
      ).all('saved') as Array<{ hook: string; body: string; cta: string; pillar: string; voice: string }>;

      if (scripts.length === 0) {
        return NextResponse.json({ error: 'No scripts saved yet' }, { status: 400 });
      }

      const profile = await generateStyleProfile(scripts);

      db.prepare(`
        INSERT INTO style_learnings (profile_summary, top_pillars, preferred_voices, avoid_patterns, script_count_at_generation)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        JSON.stringify(profile),
        JSON.stringify(profile.top_pillars),
        JSON.stringify(profile.common_hook_patterns),
        JSON.stringify(profile.patterns_to_avoid),
        scripts.length
      );

      return NextResponse.json({ profile });
    }

    if (action === 'analyze-creator') {
      if (!text) return NextResponse.json({ error: 'Script text required' }, { status: 400 });
      const analysis = await analyzeCreatorStyle(text);

      // Save as creator style
      const result = db.prepare(`
        INSERT INTO creator_styles (creator_name, description, prompt_modifier, category, is_preset)
        VALUES (?, ?, ?, ?, 0)
      `).run(name || 'Custom Style', description || '', analysis.prompt_modifier, 'Custom');

      return NextResponse.json({ analysis, id: result.lastInsertRowid });
    }

    if (action === 'create-series') {
      const result = db.prepare('INSERT INTO content_series (title, description) VALUES (?, ?)').run(name, description || null);
      return NextResponse.json({ id: result.lastInsertRowid });
    }

    if (action === 'add-to-series') {
      const { seriesId, scriptId, position } = await req.json();
      db.prepare('INSERT OR REPLACE INTO series_scripts (series_id, script_id, position) VALUES (?, ?, ?)').run(seriesId, scriptId, position);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Profile POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
