/**
 * GET /api/countries — list all countries (lightweight items for the selector).
 *
 * On first ever call, the DB is empty: we transparently sync the full list
 * from the REST Countries API (~250 entries). In production you'd wire this
 * to a daily cron, but lazy-sync-on-empty is robust enough for the demo and
 * keeps the app self-bootstrapping.
 *
 * Response (200):
 *   { countries: CountryListItem[], synced: boolean, count: number }
 */
import { NextResponse } from 'next/server';
import { db, getDbDiagnostics } from '@/lib/db';
import { syncCountriesToDb, syncPopulationsToDb } from '@/lib/external/rest-countries';
import type { CountryListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Lazy population refresh: the World Bank backfill runs at most once every
 * 24h per server instance, fire-and-forget (never blocks the response).
 * First run populates the NULL population column; later runs are no-ops
 * unless WB published newer data.
 */
const POP_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const globalScope = globalThis as unknown as { __popSyncAt?: number };
function maybeRefreshPopulations() {
  const now = Date.now();
  if (globalScope.__popSyncAt && now - globalScope.__popSyncAt < POP_SYNC_INTERVAL_MS) return;
  globalScope.__popSyncAt = now;
  void syncPopulationsToDb()
    .then((n) => {
      if (n > 0) console.log(`[countries] population backfilled for ${n} countries (World Bank)`);
    })
    .catch((e) => console.error('[countries] population sync failed:', (e as Error).message));
}

export async function GET() {
  // Fire-and-forget World Bank population backfill (max once / 24h).
  maybeRefreshPopulations();

  try {
    return await listCountries();
  } catch (err) {
    // Never leak an empty 500 — always report the root cause so failures on
    // serverless platforms (no logs access) can be diagnosed from the body.
    console.error('[countries] GET failed:', err);
    return NextResponse.json(
      {
        error: 'Failed to load countries',
        detail: String((err as Error).message ?? err),
        db: getDbDiagnostics(),
      },
      { status: 500 },
    );
  }
}

async function listCountries() {
  let countries = await db.country.findMany({
    orderBy: [{ region: 'asc' }, { name: 'asc' }],
    select: {
      code: true,
      name: true,
      region: true,
      capital: true,
      flagEmoji: true,
      flagUrl: true,
      independent: true,
    },
  });

  let synced = false;
  if (countries.length === 0) {
    try {
      const count = await syncCountriesToDb();
      synced = true;
      countries = await db.country.findMany({
        orderBy: [{ region: 'asc' }, { name: 'asc' }],
        select: {
          code: true,
          name: true,
          region: true,
          capital: true,
          flagEmoji: true,
          flagUrl: true,
          independent: true,
        },
      });
      console.log(`[countries] synced ${count} countries from REST Countries`);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to sync country list', detail: String((err as Error).message) },
        { status: 502 },
      );
    }
  }

  const items: CountryListItem[] = countries.map((c) => ({
    code: c.code,
    name: c.name,
    region: c.region,
    capital: c.capital,
    flagEmoji: c.flagEmoji,
    flagUrl: c.flagUrl,
  }));

  return NextResponse.json({ countries: items, synced, count: items.length });
}
