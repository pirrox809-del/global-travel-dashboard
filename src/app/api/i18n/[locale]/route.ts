/**
 * GET /api/i18n/[locale] — returns the translated UI strings for the
 * requested locale. If the locale is one of the 4 manually-translated
 * ones (en/es/it/fr), returns those directly. Otherwise, uses the z-ai
 * LLM to translate the English dictionary on-the-fly, caches the result
 * in the server-side in-memory cache so subsequent requests are instant.
 *
 * The client-side language provider also caches the result in localStorage,
 * so a returning user gets instant translations without any network round-trip.
 *
 * Response: { locale: string, messages: Record<string, string> }
 */
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { MESSAGES_EN, getLLMLanguageName, type MessageKey } from '@/lib/i18n';
import { cache, TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale?.toLowerCase();

  if (!locale) {
    return NextResponse.json(
      { error: 'Missing locale parameter' },
      { status: 400 },
    );
  }

  // Check server-side cache first.
  const cacheKey = `i18n:${locale}`;
  const cached = cache.get<Record<string, string>>(cacheKey);
  if (cached) {
    return NextResponse.json({ locale, messages: cached });
  }

  // Use the z-ai LLM to translate the English dictionary.
  try {
    const zai = await ZAI.create();
    const languageName = getLLMLanguageName(locale);
    const entries = Object.entries(MESSAGES_EN);

    // Build the prompt — ask the LLM to translate all English values.
    // Group them into a JSON object and ask for the same JSON back,
    // translated. Keep keys + {placeholder} patterns unchanged.
    const sourceJson = JSON.stringify(
      Object.fromEntries(entries.map(([k, v]) => [k, v])),
    );

    const prompt = `You are a professional UI translator. Translate the following JSON object's VALUES into ${languageName}. Rules:
1. Keep ALL keys unchanged.
2. Preserve any {placeholder} patterns like {value}, {rank}, {total} — do NOT translate the text inside curly braces.
3. Preserve the meaning and tone — concise, natural, user-friendly UI text.
4. Return ONLY a valid JSON object. No explanation, no markdown code fences, no backticks.
5. Translate EVERY value — do not leave any in English.

${sourceJson}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a JSON translation API. You output ONLY valid JSON.' },
        { role: 'user', content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? '';

    // Extract the JSON from the response (in case the LLM wrapped it
    // in code fences despite being told not to).
    let translated: Record<string, string>;
    try {
      // Try direct parse first.
      translated = JSON.parse(raw);
    } catch {
      // Fallback: extract the first { ... } block.
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('LLM response did not contain valid JSON');
      }
      translated = JSON.parse(match[0]);
    }

    // Ensure all keys are present (the LLM might have missed some).
    const result: Record<string, string> = {};
    for (const key of Object.keys(MESSAGES_EN)) {
      const val = translated[key];
      if (val && typeof val === 'string' && val.trim()) {
        result[key] = val;
      } else {
        // Fall back to English for any missing keys.
        result[key] = MESSAGES_EN[key as MessageKey];
      }
    }

    // Cache in server-side memory (long TTL — translations don't change).
    cache.set(cacheKey, result, TTL.i18n);

    return NextResponse.json({ locale, messages: result });
  } catch (err) {
    console.error(`[i18n] Translation failed for locale "${locale}":`, err);
    // Return English as fallback — the client will use it.
    return NextResponse.json(
      { locale, messages: MESSAGES_EN, error: 'Translation failed, using English' },
      { status: 200 }, // 200 so the client doesn't crash
    );
  }
}
