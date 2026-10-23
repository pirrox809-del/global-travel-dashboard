/**
 * worldbank.ts — Real economic data from the World Bank API.
 *
 * 100% free, no API key. Returns OFFICIAL GDP, GDP per capita, and other
 * economic indicators for all countries. Data is sourced from the World Bank's
 * World Development Indicators database — the canonical source for economic
 * statistics used by governments and researchers worldwide.
 *
 * Cache 7 days: the data updates once a year, so caching is very safe.
 */
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://api.worldbank.org/v2/country';

export type EconomyData = {
  gdpUsd: number | null; // total GDP in current USD
  gdpPerCapitaUsd: number | null; // GDP per capita in current USD
  gdpYear: number | null; // year of the data
  inflationRate: number | null; // annual inflation %
  unemploymentRate: number | null; // % of labor force
  source: 'world-bank';
};

type WBResponse = {
  [1]: Array<{
    value: number | null;
    date: string;
    indicator?: { id: string; value: string };
  }> | null;
};

async function fetchIndicator(iso3: string, indicator: string): Promise<{ value: number | null; year: number | null }> {
  const key = `wb:${iso3}:${indicator}`;
  return cache.wrap(key, TTL.countryMeta, async () => {
    try {
      const url = `${BASE}/${iso3}/indicator/${indicator}?format=json&mostRecent=true&per_page=1`;
      const res = await fetch(url, { next: { revalidate: TTL.countryMeta } });
      if (!res.ok) return { value: null, year: null };
      const j = (await res.json()) as WBResponse;
      const item = j[1]?.[0];
      if (!item || item.value === null) return { value: null, year: null };
      return { value: item.value, year: Number(item.date) };
    } catch {
      return { value: null, year: null };
    }
  }) as Promise<{ value: number | null; year: number | null }>;
}

/**
 * Fetch real economic data for a country from the World Bank.
 * `iso3` is the ISO 3166-1 alpha-3 code (e.g. "FRA" for France).
 * Returns null fields for any indicator that's unavailable.
 */
export async function getEconomyData(iso3: string | null): Promise<EconomyData | null> {
  if (!iso3) return null;
  const cacheKey = `wb:economy:${iso3}`;
  return cache.wrap(cacheKey, TTL.countryMeta, async () => {
    // Fetch all indicators in parallel.
    const [gdp, gdpPc, inflation, unemployment] = await Promise.all([
      fetchIndicator(iso3, 'NY.GDP.MKTP.CD'), // GDP (current USD)
      fetchIndicator(iso3, 'NY.GDP.PCAP.CD'), // GDP per capita (current USD)
      fetchIndicator(iso3, 'FP.CPI.TOTL.ZG'), // Inflation, consumer prices %
      fetchIndicator(iso3, 'SL.UEM.TOTL.ZS'), // Unemployment % of total labor force
    ]);

    return {
      gdpUsd: gdp.value,
      gdpPerCapitaUsd: gdpPc.value,
      gdpYear: gdp.year ?? gdpPc.year,
      inflationRate: inflation.value,
      unemploymentRate: unemployment.value,
      source: 'world-bank',
    };
  }) as Promise<EconomyData | null>;
}

export type PopulationEntry = { value: number; year: number };

/**
 * Fetch the latest population for ALL countries in ONE World Bank request.
 *
 * `mrnev=1` (most recent non-empty value) collapses the per-year series to a
 * single entry per entity, so one request (~300 lines) covers every country
 * the World Bank tracks — including small states (Monaco, Andorra...) and
 * many territories. Aggregates (WLD, EUU...) come back too but their codes
 * never collide with real ISO-3 country codes, so they are simply ignored
 * at lookup time.
 *
 * Cached 24h — population updates once a year at most.
 */
export async function fetchWorldPopulations(): Promise<Map<string, PopulationEntry>> {
  return cache.wrap('wb:population:all', TTL.countryList, async () => {
    const out = new Map<string, PopulationEntry>();
    try {
      const url = `${BASE}/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=500`;
      const res = await fetch(url, { next: { revalidate: TTL.countryList } });
      if (!res.ok) return out;
      const j = (await res.json()) as Array<null | Array<{ countryiso3code?: string; value: number | null; date: string }>>;
      for (const row of j[1] ?? []) {
        if (!row?.countryiso3code || row.value === null || row.value === undefined) continue;
        out.set(row.countryiso3code.toUpperCase(), { value: row.value, year: Number(row.date) || 0 });
      }
    } catch {
      // network failure → empty map; callers degrade gracefully
    }
    return out;
  }) as Promise<Map<string, PopulationEntry>>;
}
