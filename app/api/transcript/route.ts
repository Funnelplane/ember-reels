import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // Extract video ID
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const videoId = match[1];

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const fullText = transcript.map(t => t.text).join(' ');

    // Try to get title via oEmbed
    let title = '';
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || '';
      }
    } catch {
      // title remains empty
    }

    return NextResponse.json({
      transcript: fullText.slice(0, 8000), // cap at 8k chars
      title,
      videoId,
    });
  } catch (err) {
    console.error('Transcript error:', err);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}
