/**
 * rest-countries.ts — Country metadata source.
 *
 * ---------------------------------------------------------------------
 * Why this source (updated):
 * ---------------------------------------------------------------------
 * The original REST Countries API (restcountries.com) has been deprecated
 * across ALL versions (v3.1, v5) — every endpoint now 301-redirects to a
 * "legacy.json" file that returns a deprecation error. So we switched to
 * the canonical upstream dataset hosted on GitHub:
 *
 *   https://raw.githubusercontent.com/mledoze/countries/master/countries.json
 *
 * This is the EXACT same JSON shape the old API served (it's the source
 * repo). It's 100% free, versioned, and never rate-limits. We sync it into
 * our DB once (cache 24h at the fetch layer + permanent rows in the DB),
 * so the app keeps working even if GitHub is down.
 *
 * In production you could also subscribe to the repo's releases for updates.
 */
import { db } from '@/lib/db';
import { cache, TTL } from '@/lib/cache';
import { fetchWorldPopulations } from './worldbank';

const COUNTRIES_JSON_URL =
  'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';

export type RestCountry = {
  name: { common: string; official: string };
  cca2: string;
  cca3?: string;
  ccn3?: string;
  independent?: boolean;
  unMember?: boolean;
  status?: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
  idd?: { root?: string; suffixes?: string[] };
  callingCodes?: string[];
  timezones?: string[];
  latlng?: [number, number];
  area?: number;
  population?: number;
  flags?: { png?: string; svg?: string; alt?: string };
  flag?: string; // emoji
};

/** Fetch the full country dataset (cached 24h at the cache layer). */
export async function fetchAllCountries(): Promise<RestCountry[]> {
  return cache.wrap<string, RestCountry[]>('countries:source:all', TTL.countryList, async () => {
    const res = await fetch(COUNTRIES_JSON_URL, {
      next: { revalidate: TTL.countryList },
    });
    if (!res.ok) throw new Error(`Country source fetch failed: ${res.status}`);
    const data = (await res.json()) as RestCountry[];
    return data;
  });
}

/**
 * Upsert the full country list into our DB. This is our "sync" operation.
 * Called lazily on first request when the DB is empty, and could be wired
 * to a daily cron in production.
 *
 * Flag images: the source dataset only carries the emoji, so we resolve the
 * SVG URL via flagcdn (https://flagcdn.com) — a free, fast, CDN-backed flag
 * service with no API key.
 */
export async function syncCountriesToDb(): Promise<number> {
  const all = await fetchAllCountries();
  const candidates = all.filter((c) => c.cca2 && c.name?.common && c.status !== 'assigned');

  let upserted = 0;
  for (const c of candidates) {
    const code = c.cca2;
    if (!code) continue;
    // Normalise calling codes: prefer idd.root+suffixes, fall back to callingCodes.
    const callingCodes: string[] = [];
    if (c.idd?.root && c.idd.suffixes?.length) {
      callingCodes.push(...c.idd.suffixes.map((s) => `${c.idd!.root}${s}`));
    } else if (c.callingCodes?.length) {
      callingCodes.push(...c.callingCodes);
    }

    const languagesJson = c.languages ? JSON.stringify(c.languages) : null;
    const currenciesJson = c.currencies ? JSON.stringify(c.currencies) : null;
    const callingCodesJson = callingCodes.length ? JSON.stringify(callingCodes) : null;
    const timezonesJson = c.timezones ? JSON.stringify(c.timezones) : null;
    // flagcdn serves per-country SVGs at a stable URL (free, no key).
    const flagUrl = `https://flagcdn.com/${code.toLowerCase()}.svg`;

    await db.country.upsert({
      where: { code },
      update: {
        code3: c.cca3 ?? null,
        name: c.name.common,
        officialName: c.name.official ?? null,
        capital: c.capital?.[0] ?? null,
        region: c.region ?? null,
        subregion: c.subregion ?? null,
        independent: c.independent ?? null,
        unMember: c.unMember ?? null,
        languagesJson,
        currenciesJson,
        callingCodesJson,
        timezonesJson,
        latitude: c.latlng?.[0] ?? null,
        longitude: c.latlng?.[1] ?? null,
        area: c.area ?? null,
        population: c.population ? BigInt(c.population) : null,
        flagEmoji: c.flag ?? null,
        flagUrl,
      },
      create: {
        code,
        code3: c.cca3 ?? null,
        name: c.name.common,
        officialName: c.name.official ?? null,
        capital: c.capital?.[0] ?? null,
        region: c.region ?? null,
        subregion: c.subregion ?? null,
        independent: c.independent ?? null,
        unMember: c.unMember ?? null,
        languagesJson,
        currenciesJson,
        callingCodesJson,
        timezonesJson,
        latitude: c.latlng?.[0] ?? null,
        longitude: c.latlng?.[1] ?? null,
        area: c.area ?? null,
        population: c.population ? BigInt(c.population) : null,
        flagEmoji: c.flag ?? null,
        flagUrl,
      },
    });
    upserted++;
  }
  return upserted;
}

/**
 * Backfill / refresh the `population` column from the World Bank.
 *
 * The mledoze dataset does NOT carry population (the old REST Countries API
 * did), so the column would stay NULL forever without this step. The World
 * Bank's SP.POP.TOTL indicator covers every UN member + most territories;
 * one request fetches the latest value for all of them (see
 * `fetchWorldPopulations`). Rows without a WB entry (e.g. Taiwan, Vatican)
 * are simply left untouched — the UI hides population/density for them.
 *
 * Called lazily (non-blocking) by the countries API at most once per day.
 */
export async function syncPopulationsToDb(): Promise<number> {
  const pops = await fetchWorldPopulations();
  if (pops.size === 0) return 0;

  const countries = await db.country.findMany({
    select: { code: true, code3: true, population: true },
  });

  let updated = 0;
  for (const c of countries) {
    const iso3 = c.code3?.toUpperCase();
    if (!iso3) continue;
    const entry = pops.get(iso3);
    if (!entry) continue;
    const current = c.population ? c.population.toString() : null;
    const next = String(Math.round(entry.value));
    if (current === next) continue; // no change → skip the write
    await db.country.update({
      where: { code: c.code },
      data: { population: BigInt(next) },
    });
    updated++;
  }
  return updated;
}
