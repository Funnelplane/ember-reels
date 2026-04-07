import { NextResponse } from 'next/server';

export async function GET() {
  const isSet = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here');
  return NextResponse.json({ isSet });
}
