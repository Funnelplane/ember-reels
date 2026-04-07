import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'saved';
    const pillar = searchParams.get('pillar');
    const voice = searchParams.get('voice');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM scripts WHERE status = ?';
    const params: (string | number)[] = [status];

    if (pillar) { query += ' AND pillar = ?'; params.push(pillar); }
    if (voice) { query += ' AND voice = ?'; params.push(voice); }
    if (source) { query += ' AND source_type = ?'; params.push(source); }
    if (search) { query += ' AND (hook LIKE ? OR body LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    query += ' ORDER BY created_at DESC';

    const scripts = db.prepare(query).all(...params);
    return NextResponse.json({ scripts });
  } catch (err) {
    console.error('Library GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();
    const { id, updates } = await req.json();

    const allowed = ['status', 'pillar', 'liked', 'caption', 'hashtags'];
    const fields = Object.keys(updates).filter(k => allowed.includes(k));
    if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const set = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    db.prepare(`UPDATE scripts SET ${set} WHERE id = ?`).run(...values, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Library PATCH error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { id } = await req.json();
    db.prepare('DELETE FROM scripts WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Library DELETE error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
