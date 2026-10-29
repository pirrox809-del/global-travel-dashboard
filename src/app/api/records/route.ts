import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * /api/records — "World records": superlatives computed from the STATIC
 * country database that ships with the app. No external API, no LLM, no
 * writes — the whole payload is derived from the 250-country dataset and
 * cached in memory per serverless instance.
 *
 * Each record returns its top 3 so the UI can show a small podium.
 */

export const dynamic = 'force-dynamic';

interface RecordEntry {
  code: string;
  name: string;
  flagEmoji: string | null;
  /** Raw value — the client formats it per record type. */
  value: number;
}

interface RecordDef {
  key: string;
  top: RecordEntry[];
}

let cache: { at: number; records: RecordDef[] } | null = null;

/** Wrapper for JSON-stringified list/map columns. */
function jsonLen(json: string | null): number {
  if (!json) return 0;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
  } catch {
    return 0;
  }
}

function fmt(rows: { code: string; name: string; flagEmoji: string | null; value: number }[]): RecordEntry[] {
  return rows.slice(0, 3).map((r) => ({ code: r.code, name: r.name, flagEmoji: r.flagEmoji, value: r.value }));
}

async function computeRecords(): Promise<RecordDef[]> {
  const countries = await db.country.findMany({
    select: {
      code: true,
      name: true,
      flagEmoji: true,
      area: true,
      population: true,
      latitude: true,
      timezonesJson: true,
      languagesJson: true,
      currenciesJson: true,
      capital: true,
    },
  });

  const withArea = countries.filter((c) => c.area && c.area > 0);
  const withPop = countries.filter((c) => c.population && c.population > 0n);
  const withCapital = countries.filter((c) => c.latitude !== null && c.capital);
  const withBoth = countries.filter((c) => c.area && c.area > 0 && c.population && c.population > 0n);

  const largest = [...withArea].sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
  const smallest = [...withArea].sort((a, b) => (a.area ?? 0) - (b.area ?? 0));
  const mostPopulous = [...withPop].sort((a, b) => Number(b.population ?? 0n) - Number(a.population ?? 0n));
  const leastPopulous = [...withPop].sort((a, b) => Number(a.population ?? 0n) - Number(b.population ?? 0n));
  const mostTimezones = [...countries].sort((a, b) => jsonLen(b.timezonesJson) - jsonLen(a.timezonesJson));
  const mostLanguages = [...countries].sort((a, b) => jsonLen(b.languagesJson) - jsonLen(a.languagesJson));
  const mostCurrencies = [...countries].sort((a, b) => jsonLen(b.currenciesJson) - jsonLen(a.currenciesJson));
  const northernmost = [...withCapital].sort((a, b) => (b.latitude ?? -90) - (a.latitude ?? -90));
  const southernmost = [...withCapital].sort((a, b) => (a.latitude ?? 90) - (b.latitude ?? 90));
  const densest = [...withBoth].sort(
    (a, b) => Number(b.population ?? 0n) / (b.area ?? 1) - Number(a.population ?? 0n) / (a.area ?? 1),
  );

  return [
    { key: 'largestArea', top: fmt(largest.map((c) => ({ ...c, value: c.area ?? 0 }))) },
    { key: 'smallestArea', top: fmt(smallest.map((c) => ({ ...c, value: c.area ?? 0 }))) },
    { key: 'mostPopulous', top: fmt(mostPopulous.map((c) => ({ ...c, value: Number(c.population ?? 0n) }))) },
    { key: 'leastPopulous', top: fmt(leastPopulous.map((c) => ({ ...c, value: Number(c.population ?? 0n) }))) },
    { key: 'mostTimezones', top: fmt(mostTimezones.map((c) => ({ ...c, value: jsonLen(c.timezonesJson) }))) },
    { key: 'mostLanguages', top: fmt(mostLanguages.map((c) => ({ ...c, value: jsonLen(c.languagesJson) }))) },
    { key: 'mostCurrencies', top: fmt(mostCurrencies.map((c) => ({ ...c, value: jsonLen(c.currenciesJson) }))) },
    { key: 'northernmost', top: fmt(northernmost.map((c) => ({ ...c, value: c.latitude ?? 0 }))) },
    { key: 'southernmost', top: fmt(southernmost.map((c) => ({ ...c, value: c.latitude ?? 0 }))) },
    { key: 'densest', top: fmt(densest.map((c) => ({ ...c, value: Number(c.population ?? 0n) / (c.area ?? 1) }))) },
  ].filter((r) => r.top.length > 0);
}

export async function GET() {
  // The dataset changes at most once a day (nightly cron) — a 10-minute
  // in-memory cache is plenty and keeps this endpoint instant.
  if (cache && Date.now() - cache.at < 10 * 60_000) {
    return NextResponse.json({ records: cache.records });
  }
  const records = await computeRecords();
  cache = { at: Date.now(), records };
  return NextResponse.json({ records });
}
