import { NextRequest, NextResponse } from 'next/server';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Step 1: Fetch the YouTube watch page to extract the player response
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: BROWSER_HEADERS,
  });

  if (!pageRes.ok) {
    throw new Error(`YouTube page fetch failed: ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // Step 2: Extract ytInitialPlayerResponse from the page HTML.
  // YouTube embeds it as a JS assignment; we find the start of the object and
  // walk the string counting braces to find the matching closing brace.
  const startToken = 'ytInitialPlayerResponse=';
  const tokenIdx = html.indexOf(startToken);
  if (tokenIdx === -1) {
    throw new Error('Could not locate player response in YouTube page');
  }

  const jsonStart = html.indexOf('{', tokenIdx);
  if (jsonStart === -1) {
    throw new Error('Could not locate player response JSON start');
  }

  let depth = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
  }

  let playerResponse: any;
  try {
    playerResponse = JSON.parse(html.slice(jsonStart, jsonEnd + 1));
  } catch {
    throw new Error('Failed to parse YouTube player response JSON');
  }

  // Step 3: Find available caption tracks
  const captionTracks: Array<{ baseUrl: string; languageCode: string; name?: { simpleText: string } }> =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (captionTracks.length === 0) {
    throw new Error('This video has no captions/subtitles available');
  }

  // Prefer English (en), then English auto-generated (asr), then whatever is first
  const track =
    captionTracks.find((t) => t.languageCode === 'en') ??
    captionTracks.find((t) => t.languageCode.startsWith('en')) ??
    captionTracks[0];

  // Step 4: Fetch the caption track in JSON3 format (no XML parsing needed)
  const captionUrl = `${track.baseUrl}&fmt=json3`;
  const captionRes = await fetch(captionUrl, { headers: BROWSER_HEADERS });

  if (!captionRes.ok) {
    throw new Error(`Caption fetch failed: ${captionRes.status}`);
  }

  const captionData = await captionRes.json();

  // Step 5: Flatten events → segments → text
  const text: string = (captionData.events ?? [])
    .filter((e: any) => Array.isArray(e.segs))
    .map((e: any) =>
      e.segs
        .map((s: any) => s.utf8 ?? '')
        .join('')
        .replace(/\n/g, ' '),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    throw new Error('Transcript is empty after parsing');
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const videoId = match[1];

    const transcript = await fetchYouTubeTranscript(videoId);

    // Fetch title via oEmbed (lightweight, no auth needed)
    let title = '';
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { headers: BROWSER_HEADERS },
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title ?? '';
      }
    } catch {
      // title stays empty — not critical
    }

    return NextResponse.json({
      transcript: transcript.slice(0, 8000),
      title,
      videoId,
    });
  } catch (err: any) {
    console.error('Transcript error:', err?.message ?? err);
    const message =
      err?.message?.includes('no captions')
        ? 'This video has no captions available. Try a video with subtitles enabled.'
        : err?.message ?? 'Failed to fetch transcript';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
