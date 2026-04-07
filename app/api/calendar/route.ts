import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');

    let entries;
    if (weekStart) {
      entries = db.prepare(`
        SELECT ce.*, s.hook, s.body, s.cta, s.pillar, s.voice, s.confidence_score
        FROM calendar_entries ce
        JOIN scripts s ON ce.script_id = s.id
        WHERE ce.scheduled_date >= ? AND ce.scheduled_date < date(?, '+7 days')
        ORDER BY ce.scheduled_date, ce.day_slot
      `).all(weekStart, weekStart);
    } else {
      entries = db.prepare(`
        SELECT ce.*, s.hook, s.body, s.cta, s.pillar, s.voice, s.confidence_score
        FROM calendar_entries ce
        JOIN scripts s ON ce.script_id = s.id
        ORDER BY ce.scheduled_date, ce.day_slot
      `).all();
    }

    const unscheduled = db.prepare(`
      SELECT * FROM scripts
      WHERE status = 'saved'
      AND id NOT IN (SELECT script_id FROM calendar_entries)
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json({ entries, unscheduled });
  } catch (err) {
    console.error('Calendar GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch calendar' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { scriptId, scheduledDate, notes } = await req.json();

    // Remove existing calendar entry for this script
    db.prepare('DELETE FROM calendar_entries WHERE script_id = ?').run(scriptId);

    const result = db.prepare(
      'INSERT INTO calendar_entries (script_id, scheduled_date, notes) VALUES (?, ?, ?)'
    ).run(scriptId, scheduledDate, notes || null);

    // Update script status
    db.prepare('UPDATE scripts SET status = ? WHERE id = ?').run('scheduled', scriptId);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error('Calendar POST error:', err);
    return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { entryId, scheduledDate, notes } = await req.json();
    db.prepare('UPDATE calendar_entries SET scheduled_date = ?, notes = ? WHERE id = ?')
      .run(scheduledDate, notes ?? null, entryId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Calendar PATCH error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { entryId, scriptId } = await req.json();
    db.prepare('DELETE FROM calendar_entries WHERE id = ?').run(entryId);
    if (scriptId) {
      db.prepare('UPDATE scripts SET status = ? WHERE id = ?').run('saved', scriptId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Calendar DELETE error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
