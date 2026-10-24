/**
 * GET /api/countries/[code]?lang=en — the aggregated dashboard payload.
 *
 * `lang` query param (optional, default "en") controls the language of
 * LLM-generated content. Valid values: en, es, it, fr.
 *
 * Runs the aggregator: parallel fetch over DB + weather + fx + advisory.
 * The first request for a country (or a language switch) triggers a one-time
 * LLM content generation (~5-15s); subsequent requests in the same language
 * are DB-fast.
 *
 * Response (200): AggregatedCountry
 * Response (400): invalid code
 * Response (404): country not found in DB
 * Response (500): aggregator threw unexpectedly
 */
import { NextResponse } from 'next/server';
import { aggregateCountry } from '@/lib/aggregate';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n';

// First-visit LLM generation can take 25-50s (two parallel calls + retry).
export const maxDuration = 60;

export const dynamic = 'force-dynamic';

const VALID_LOCALES: Locale[] = ['en', 'es', 'it', 'fr'];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!code || code.length < 2 || code.length > 3) {
    return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
  }

  // Read the requested language from the ?lang= query param.
  const url = new URL(req.url);
  const langParam = url.searchParams.get('lang')?.toLowerCase() as Locale | null;
  const locale: Locale =
    langParam && VALID_LOCALES.includes(langParam) ? langParam : DEFAULT_LOCALE;

  try {
    const payload = await aggregateCountry(code, locale);
    if (!payload) {
      return NextResponse.json(
        { error: `Country '${code.toUpperCase()}' not found` },
        { status: 404 },
      );
    }
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[country aggregate] failed', err);
    return NextResponse.json(
      { error: 'Aggregation failed', detail: String((err as Error).message) },
      { status: 500 },
    );
  }
}
