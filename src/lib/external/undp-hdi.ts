/**
 * undp-hdi.ts — Real Human Development Index (HDI) data from UNDP,
 * retrieved via the Our World in Data API (which mirrors UNDP's data).
 *
 * UNDP (United Nations Development Programme) publishes HDI annually
 * in the Human Development Report. UNDP's own website doesn't expose
 * a clean REST API, so we use Our World in Data's mirror of UNDP data
 * (CC-BY-licensed). OWID's `/v1/indicators/1032439.data.json`
 * endpoint returns the full HDI time series for every country.
 *
 * HDI is a composite index (0–1) of:
 *  - Life expectancy at birth
 *  - Expected + mean years of schooling
 *  - Gross National Income per capita
 *
 * Higher value = higher human development. Updates annually.
 *
 * Cache 7 days — data changes once per year.
 */
import { cache, TTL } from '@/lib/cache';

const DATA_URL = 'https://api.ourworldindata.org/v1/indicators/1032439.data.json';
const META_URL = 'https://api.ourworldindata.org/v1/indicators/1032439.metadata.json';

export type HdiPoint = {
  iso3: string;
  value: number;
  year: number;
};

/** OWID data JSON shape: 3 parallel arrays of equal length. */
type OwidData = {
  values: number[];
  years: number[];
  entities: number[]; // entity IDs (need to be mapped to iso3 via metadata)
};

/** OWID metadata JSON shape (only the fields we care about). */
type OwidMetadata = {
  dimensions?: {
    entities?: {
      values: Array<{ id: number; name: string; code: string }>;
    };
  };
};

/**
 * Fetch the most recent HDI value for every country UNDP tracks.
 * Returns an array of `{ iso3, value, year }`. Filters out regional
 * aggregates (entries whose `code` starts with `OWID_`).
 *
 * Cached 7 days — data updates once a year.
 */
export async function getAllHdi(): Promise<HdiPoint[]> {
  const cacheKey = 'undp:hdi:all';
  return cache.wrap(cacheKey, TTL.countryMeta, async () => {
    try {
      const [dataRes, metaRes] = await Promise.all([
        fetch(DATA_URL, { next: { revalidate: TTL.countryMeta } }),
        fetch(META_URL, { next: { revalidate: TTL.countryMeta } }),
      ]);
      if (!dataRes.ok || !metaRes.ok) return [];
      const data = (await dataRes.json()) as OwidData;
      const meta = (await metaRes.json()) as OwidMetadata;

      // Build the entity-id → iso3 map (skip aggregates like "OWID_AFR").
      const entityToIso3 = new Map<number, string>();
      for (const e of meta.dimensions?.entities?.values ?? []) {
        if (e.code && !e.code.startsWith('OWID_')) {
          entityToIso3.set(e.id, e.code);
        }
      }

      // For each entity, keep the most recent (year, value) pair.
      const latestByEntity = new Map<number, { year: number; value: number }>();
      for (let i = 0; i < data.values.length; i++) {
        const ent = data.entities[i];
        const yr = data.years[i];
        const val = data.values[i];
        if (val === null || val === undefined) continue;
        const cur = latestByEntity.get(ent);
        if (!cur || yr > cur.year) {
          latestByEntity.set(ent, { year: yr, value: val });
        }
      }

      const out: HdiPoint[] = [];
      for (const [entId, { year, value }] of latestByEntity) {
        const iso3 = entityToIso3.get(entId);
        if (iso3) out.push({ iso3, value, year });
      }
      return out;
    } catch {
      return [];
    }
  }) as Promise<HdiPoint[]>;
}
