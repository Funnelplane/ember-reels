import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

const BASE_SYSTEM_PROMPT = `You are EMBER, an expert Instagram Reel scriptwriter for a high-performance entrepreneur and business operator. Your content space is business, sales, money, mindset, real estate, and wealth-building. You write for operators — people building companies, managing teams, closing deals. Not lifestyle influencers. Your scripts are direct, specific, and confident. No fluff. No filler. Every word earns its place. You write hooks that stop the scroll in 3 seconds, bodies that deliver one clear insight, and CTAs that feel natural not salesy.

Always output valid JSON only. No explanation, no markdown, no preamble. Return an array of 3 script objects (or 2 for Original mode), each with these exact keys:
{
  "hook": string,
  "body": string,
  "cta": string,
  "pillar": "Mindset" | "Sales" | "Money" | "Real Estate" | "Operations" | "Other",
  "confidence_score": integer 1-10,
  "confidence_reason": string (one sentence)
}`;

function getEnergyPrompt(energy: number): string {
  if (energy <= 3) return 'Energy level: Keep the tone calm, measured, and educational. Let the insight do the work.';
  if (energy <= 6) return 'Energy level: Moderate energy. Confident and clear but not over the top.';
  return 'Energy level: High intensity. Urgent, bold, aggressive. Every line hits hard.';
}

export interface ScriptResult {
  hook: string;
  body: string;
  cta: string;
  pillar: string;
  confidence_score: number;
  confidence_reason: string;
}

export interface GenerateParams {
  mode: 'youtube' | 'original' | 'remix';
  transcript?: string;
  voiceModifier: string;
  energyLevel: number;
  trendText?: string;
  savedScripts?: string;
  graveyardSummary?: string;
  originalScript?: { hook: string; body: string; cta: string };
  customVoice?: string;
}

export async function generateScripts(params: GenerateParams): Promise<ScriptResult[]> {
  const client = getClient();

  let systemPrompt = BASE_SYSTEM_PROMPT;
  systemPrompt += `\n\nVoice style: ${params.voiceModifier}`;
  systemPrompt += `\n\n${getEnergyPrompt(params.energyLevel)}`;

  if (params.customVoice) {
    systemPrompt += `\n\nPersonal voice overlay: ${params.customVoice}`;
  }

  let userMessage = '';

  if (params.mode === 'youtube' && params.transcript) {
    userMessage = `Generate 3 Instagram Reel scripts based on this YouTube transcript:\n\n${params.transcript}`;
  } else if (params.mode === 'original') {
    userMessage = `Generate 2 original Instagram Reel scripts on topics this creator hasn't recently covered.`;
    if (params.savedScripts) {
      userMessage += `\n\nSaved/liked scripts for style reference:\n${params.savedScripts}`;
    }
    if (params.graveyardSummary) {
      userMessage += `\n\nAvoid these patterns (from rejected scripts): ${params.graveyardSummary}`;
    }
  } else if (params.mode === 'remix' && params.originalScript) {
    userMessage = `Rewrite this script with a completely different hook angle and narrative approach. Keep the same general topic but make it feel fresh. Return same JSON array format.\n\nOriginal script:\nHook: ${params.originalScript.hook}\nBody: ${params.originalScript.body}\nCTA: ${params.originalScript.cta}`;
    systemPrompt = systemPrompt.replace('Return an array of 3 script objects (or 2 for Original mode)', 'Return an array with 1 script object');
  }

  if (params.trendText) {
    userMessage += `\n\nAngle this script around the following current trend or topic: ${params.trendText}`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export interface HookStressTestResult {
  psychological_trigger: string;
  target_audience: string;
  strength_score: number;
  improvement_suggestion: string;
}

export async function stressTestHook(hook: string): Promise<HookStressTestResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: 'You are an expert short-form video strategist. Analyze the following Instagram Reel hook and return JSON with these keys: { "psychological_trigger": string, "target_audience": string, "strength_score": integer 1-10, "improvement_suggestion": string }. Output valid JSON only, no explanation.',
    messages: [{ role: 'user', content: `Analyze this hook: "${hook}"` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
}

export async function generateCaption(script: { hook: string; body: string; cta: string }): Promise<CaptionResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: 'You are an Instagram caption writer for a business and entrepreneurship account. Given the following Reel script, write a punchy Instagram caption (2-4 sentences max) and generate 15-20 relevant hashtags. Return JSON with keys: { "caption": string, "hashtags": string[] }. Output valid JSON only.',
    messages: [{
      role: 'user',
      content: `Script:\nHook: ${script.hook}\nBody: ${script.body}\nCTA: ${script.cta}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export interface StyleProfile {
  top_pillars: string[];
  preferred_energy: string;
  common_hook_patterns: string[];
  topics_to_explore: string[];
  patterns_to_avoid: string[];
}

export async function generateStyleProfile(scripts: Array<{ hook: string; body: string; cta: string; pillar: string; voice: string }>): Promise<StyleProfile> {
  const client = getClient();

  const scriptsText = scripts.map((s, i) =>
    `Script ${i + 1} [${s.pillar} / ${s.voice}]:\nHook: ${s.hook}\nBody: ${s.body}\nCTA: ${s.cta}`
  ).join('\n\n---\n\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: 'You are a content strategist. Based on the following collection of Instagram Reel scripts that this creator has saved and liked, generate a style profile. Return JSON with keys: { "top_pillars": string[], "preferred_energy": string, "common_hook_patterns": string[], "topics_to_explore": string[], "patterns_to_avoid": string[] }. Output valid JSON only.',
    messages: [{ role: 'user', content: `Analyze these scripts and generate a style profile:\n\n${scriptsText}` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}

export async function analyzeCreatorStyle(scriptText: string): Promise<{
  hook_type: string;
  body_format: string;
  cta_style: string;
  energy_signature: string;
  prompt_modifier: string;
}> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: 'You are a content strategist who reverse-engineers script structure. Analyze the given Reel script or transcript and return JSON with keys: { "hook_type": string, "body_format": string, "cta_style": string, "energy_signature": string, "prompt_modifier": string (a Claude prompt instruction to replicate this style) }. Output valid JSON only.',
    messages: [{ role: 'user', content: `Analyze this script/transcript:\n\n${scriptText}` }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text);
}
