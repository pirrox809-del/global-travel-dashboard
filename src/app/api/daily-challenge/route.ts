import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * /api/daily-challenge — "Globe Daily": one mystery country per day,
 * identical for every visitor (deterministic from the UTC date).
 *
 * Design guarantees (why this is 100% offline-safe):
 *   - Every hint is computed from the STATIC country database that ships
 *     with the app (region, population, currencies, languages, capital).
 *   - No external API is called. No LLM is called. No database write.
 *   - The answer never leaves the server before it is revealed: the client
 *     only receives hints and the 4 candidate options per attempt.
 *
 * Flow (stateless server):
 *   POST { action: 'start' }                        → day, hint #1 (structured), 4 options
 *   POST { action: 'guess', guess, attempts }       → correct? win+reveal : next hint+options
 *
 * The deterministic pick: dayIndex = floor(UTC ms / 86400000), then
 * countries sorted by name → countries[dayIndex % count]. Stable as long
 * as the 250-country dataset is stable (it is — mledoze/countries).
 */

export const dynamic = 'force-dynamic';

interface Candidate {
  code: string;
  name: string;
  flagEmoji: string | null;
}

interface CountryRow extends Candidate {
  region: string | null;
  subregion: string | null;
  population: bigint | null;
  area: number | null;
  currenciesJson: string | null;
  languagesJson: string | null;
  capital: string | null;
}

type StructuredHint =
  | { kind: 'region'; region: string; subregion: string }
  | { kind: 'population'; bracket: string }
  | { kind: 'currency'; name: string; symbol: string }
  | { kind: 'language'; name: string; count: number }
  | { kind: 'capital'; capital: string; initial: string };

const MAX_ATTEMPTS = 5;

let cache: { rows: CountryRow[]; at: number } | null = null;

async function loadCountries(): Promise<CountryRow[]> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.rows;
  const raw = await db.country.findMany({
    select: {
      code: true,
      name: true,
      flagEmoji: true,
      region: true,
      subregion: true,
      population: true,
      area: true,
      currenciesJson: true,
      languagesJson: true,
      capital: true,
    },
    orderBy: { name: 'asc' },
  });
  cache = { rows: raw, at: Date.now() };
  return cache.rows;
}

/** Deterministic PRNG (mulberry32) — same options for everyone, all day. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Population bracket label — coarse buckets keep the hint fair. */
function populationBracket(pop: bigint | null): string | null {
  if (!pop) return null;
  const n = Number(pop);
  if (n >= 1_000_000_000) return '1B+';
  if (n >= 100_000_000) return '100M-1B';
  if (n >= 50_000_000) return '50M-100M';
  if (n >= 10_000_000) return '10M-50M';
  if (n >= 1_000_000) return '1M-10M';
  if (n >= 100_000) return '100K-1M';
  return '<100K';
}

function buildHints(c: CountryRow): StructuredHint[] {
  const hints: StructuredHint[] = [];
  if (c.region) hints.push({ kind: 'region', region: c.region, subregion: c.subregion ?? '' });

  const bracket = populationBracket(c.population);
  if (bracket) hints.push({ kind: 'population', bracket });

  if (c.currenciesJson) {
    try {
      const cur = Object.values(JSON.parse(c.currenciesJson) as Record<string, { name?: string; symbol?: string }>);
      const first = cur.find((x) => x?.name);
      if (first?.name) hints.push({ kind: 'currency', name: first.name, symbol: first.symbol ?? '' });
    } catch { /* skip hint on malformed data */ }
  }

  if (c.languagesJson) {
    try {
      const langs = Object.values(JSON.parse(c.languagesJson) as Record<string, string>).filter(Boolean);
      if (langs.length > 0) hints.push({ kind: 'language', name: langs[0], count: langs.length });
    } catch { /* skip hint on malformed data */ }
  }

  if (c.capital) hints.push({ kind: 'capital', capital: c.capital, initial: c.name.charAt(0) });
  return hints.slice(0, MAX_ATTEMPTS);
}

/** 3 deterministic distractors: same region first (harder), then anywhere. */
function buildOptions(rows: CountryRow[], target: CountryRow, dayIndex: number, attempt: number): Candidate[] {
  const rand = rng(dayIndex * 97 + attempt * 31 + 7);
  const sameRegion = rows.filter((r) => r.code !== target.code && r.region === target.region);
  const others = rows.filter((r) => r.code !== target.code && r.region !== target.region);
  const picked: Candidate[] = [];
  const pool = [...sameRegion, ...others];
  while (picked.length < 3 && pool.length > 0) {
    const i = Math.floor(rand() * pool.length);
    picked.push({ code: pool[i].code, name: pool[i].name, flagEmoji: pool[i].flagEmoji });
    pool.splice(i, 1);
  }
  const options = [...picked, { code: target.code, name: target.name, flagEmoji: target.flagEmoji }];
  // Deterministic shuffle so the answer is not always last.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

function revealOf(c: CountryRow) {
  return { code: c.code, name: c.name, flagEmoji: c.flagEmoji, capital: c.capital, region: c.region };
}

export async function POST(req: NextRequest) {
  let body: { action?: string; guess?: string; attempts?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const rows = await loadCountries();
  if (rows.length === 0) {
    return NextResponse.json({ error: 'no countries' }, { status: 500 });
  }

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const target = rows[dayIndex % rows.length];
  const hints = buildHints(target);
  const attempts = Math.max(0, Math.min(Number(body.attempts ?? 0), MAX_ATTEMPTS));

  if (body.action === 'start') {
    return NextResponse.json({
      day: dayIndex,
      total: rows.length,
      maxAttempts: MAX_ATTEMPTS,
      attempts: 0,
      hint: hints[0] ?? null,
      options: buildOptions(rows, target, dayIndex, 0),
      over: false,
    });
  }

  // action: 'guess'
  const guess = (body.guess ?? '').toUpperCase();
  if (!guess) return NextResponse.json({ error: 'missing guess' }, { status: 400 });

  if (guess === target.code) {
    return NextResponse.json({
      day: dayIndex,
      correct: true,
      attempts,
      score: attempts + 1,
      reveal: revealOf(target),
    });
  }

  const next = attempts + 1;
  const over = next >= MAX_ATTEMPTS;
  return NextResponse.json({
    day: dayIndex,
    correct: false,
    attempts: next,
    over,
    hint: over ? null : (hints[next] ?? null),
    options: over ? null : buildOptions(rows, target, dayIndex, next),
    reveal: over ? revealOf(target) : undefined,
  });
}
