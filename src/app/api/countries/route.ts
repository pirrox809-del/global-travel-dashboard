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
import { db } from '@/lib/db';
import { syncCountriesToDb } from '@/lib/external/rest-countries';
import type { CountryListItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
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
