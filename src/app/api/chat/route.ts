/**
 * /api/chat — Travel AI chatbot endpoint.
 *
 * POST { locale: 'en'|'es'|'it'|'fr', messages: {role:'user'|'assistant', content:string}[] }
 * → { reply: string }
 *
 * Uses z-ai-web-dev-sdk (backend only) with a system prompt that teaches
 * the model what the Global Travel Dashboard contains, so it can answer
 * questions about the site AND about countries/travel. Kept deliberately
 * light: short context, no tools, no streaming, in-memory rate limiting.
 */
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// Reuse a single SDK instance (recommended by the skill docs).
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

const VALID_LOCALES = new Set(['en', 'es', 'it', 'fr']);
const LANG_NAME: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
};
const MAX_MESSAGES = 12;
const MAX_CHARS = 1500;

// --- In-memory sliding-window rate limit (per IP): 20 req / 60 s ---
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateMap = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  rateMap.set(ip, hits);
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (rateMap.size > 500) {
    for (const [key, times] of rateMap) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) rateMap.delete(key);
    }
  }
  return hits.length > RATE_LIMIT;
}

function systemPrompt(locale: string): string {
  const lang = LANG_NAME[locale] ?? 'English';
  return [
    'You are Travel AI, the friendly in-app assistant of the "Global Travel Dashboard" website.',
    '',
    'THE WEBSITE (know this well):',
    '- It is a travel dashboard covering 189 countries: pick a country (search bar or the interactive 3D globe) and its full dashboard opens.',
    '- Every country page shows: live weather + 24h/7-day forecast (Open-Meteo), current local time, currency exchange rates vs EUR (ECB),',
    '  travel advisory level 1-4 (US State Dept) plus an AI safety brief with crime notes, dangerous animals and emergency numbers,',
    '  economy stats - GDP, GDP per capita, inflation, unemployment (World Bank), recent nearby earthquakes (USGS),',
    '  population density, form of government, head of state and head of government (verified October 2026),',
    '  an AI-curated travel brief: overview, culture, unwritten etiquette rules, best time to visit, signature foods, must-see places,',
    '  price estimates for hotels/flights/meals, quality of life, taxes, clothing advice, internet quality, natural-disaster risk,',
    '  TV channels and famous people, plus a photo carousel.',
    '- Site-wide: you can star/favourite countries, compare countries in the world rankings card, switch UI language (English, Spanish, Italian, French),',
    '  toggle dark mode, replay the title animation. Data sources are listed in the footer.',
    '',
    'YOUR JOB:',
    `- Always answer in ${lang}.`,
    '- Help users understand and use the website: explain what each card shows, how to find a country, favourite it, compare it, what the data sources are.',
    '- Answer general travel questions about countries (culture, food, safety, when to go, what to see).',
    '- Be concise: at most ~120 words. Short paragraphs or a few bullet points. No markdown headers, no links.',
    '- You have NO live data access: never invent precise live values (exact weather, exact rates). Instead say the live number is on that country page card.',
    '- If a question is unrelated to travel or the website, politely steer back to travel topics.',
    '- If you do not know something, say so briefly and suggest checking the relevant card on the country page.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'local';
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests — slow down a little.' },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const locale = typeof body.locale === 'string' && VALID_LOCALES.has(body.locale) ? body.locale : 'en';
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const messages = rawMessages
      .filter(
        (m: unknown): m is { role: 'user' | 'assistant'; content: string } =>
          !!m &&
          typeof m === 'object' &&
          ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
          typeof (m as { content?: unknown }).content === 'string',
      )
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({
        role: m.role,
        content: m.content.trim().slice(0, MAX_CHARS),
      }))
      .filter((m: { content: string }) => m.content.length > 0)
      .slice(-MAX_MESSAGES);

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'No user message' }, { status: 400 });
    }

    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt(locale) },
        ...messages,
      ],
      thinking: { type: 'disabled' },
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ error: 'Empty reply' }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[api/chat] failed:', err);
    return NextResponse.json({ error: 'Travel AI is unavailable right now.' }, { status: 500 });
  }
}
