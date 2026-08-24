/**
 * GET /api/countries/[code] — the aggregated dashboard payload for one country.
 *
 * Runs the aggregator: parallel fetch over DB + weather + fx + advisory.
 * The first request for a country triggers a one-time LLM content generation
 * (~5-10s); subsequent requests are DB-fast.
 *
 * We set `Cache-Control: no-store` so the browser always asks for fresh
 * dynamic data — server-side TTLs (weather 20m, fx 6h, advisory 12h) handle
 * the actual freshness. Caching the whole blob at the HTTP layer would
 * freeze weather for the user.
 *
 * Response (200): AggregatedCountry
 * Response (400): invalid code
 * Response (404): country not found in DB
 * Response (500): aggregator threw unexpectedly
 */
import { NextResponse } from 'next/server';
import { aggregateCountry } from '@/lib/aggregate';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!code || code.length < 2 || code.length > 3) {
    return NextResponse.json({ error: 'Invalid country code' }, { status: 400 });
  }

  try {
    const payload = await aggregateCountry(code);
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
