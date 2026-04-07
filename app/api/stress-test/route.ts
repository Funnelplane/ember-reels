import { NextRequest, NextResponse } from 'next/server';
import { stressTestHook } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const { hook } = await req.json();
    if (!hook) return NextResponse.json({ error: 'Hook required' }, { status: 400 });
    const result = await stressTestHook(hook);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Stress test error:', err);
    return NextResponse.json({ error: 'Stress test failed' }, { status: 500 });
  }
}
