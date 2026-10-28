/**
 * rankings.ts — Compute a country's global rank for several
 * dimensions: GDP per capita (World Bank), HDI (UNDP via OWID),
 * population (World Bank SP.POP.TOTL — the mledoze dataset doesn't
 * include population), area (DB).
 *
 * All rankings are 1-based: rank 1 = highest value.
 *
 * Data is cached 7 days because every source publishes annually.
 */
import { db } from '@/lib/db';
import { getAllGdpPerCapita, getAllPopulation } from '@/lib/external/worldbank';
import { getAllHdi } from '@/lib/external/undp-hdi';
import { cache, TTL } from '@/lib/cache';

export type RankDimension = {
  /** 1-based rank (1 = highest value). */
  rank: number | null;
  /** Total number of countries in the dataset. */
  total: number;
  /** The country's raw value for this dimension. */
  value: number | null;
  /** Year the value was published. */
  year: number | null;
};

export type ClassificationData = {
  gdpPerCapita: RankDimension;
  population: RankDimension;
  area: RankDimension;
  hdi: RankDimension | null; // null when the country isn't in UNDP's dataset
};

/**
 * Get a country's global ranks across all dimensions.
 * `code` is the ISO alpha-2 code, `code3` is the alpha-3 code
 * (required for World Bank + UNDP lookups).
 *
 * Returns a stable object suitable for direct serialization in the
 * API response. All dimensions degrade gracefully — `rank: null`
 * when the country isn't in the source's dataset.
 */
export async function getCountryClassification(
  code: string,
  code3: string | null,
): Promise<ClassificationData> {
  const cacheKey = `classification:${code}`;
  return cache.wrap(cacheKey, TTL.countryMeta, async () => {
    const [gdpPoints, popPoints, hdiPoints, allCountries] = await Promise.all([
      getAllGdpPerCapita(),
      getAllPopulation(),
      getAllHdi(),
      // Area still comes from the DB — the mledoze dataset does include it.
      db.country.findMany({
        where: { area: { not: null } },
        select: { code: true, area: true },
      }),
    ]);

    // --- GDP per capita rank (World Bank, by iso3) ---
    const sortedGdp = [...gdpPoints].sort((a, b) => b.value - a.value);
    const gdpTotal = sortedGdp.length;
    let gdpRank: number | null = null;
    let gdpValue: number | null = null;
    let gdpYear: number | null = null;
    if (code3) {
      const idx = sortedGdp.findIndex((p) => p.iso3 === code3);
      if (idx >= 0) {
        gdpRank = idx + 1;
        gdpValue = sortedGdp[idx].value;
        gdpYear = sortedGdp[idx].year;
      }
    }

    // --- Population rank (World Bank SP.POP.TOTL, by iso3) ---
    const sortedPop = [...popPoints].sort((a, b) => b.value - a.value);
    const popTotal = sortedPop.length;
    let popRank: number | null = null;
    let popValue: number | null = null;
    let popYear: number | null = null;
    if (code3) {
      const idx = sortedPop.findIndex((p) => p.iso3 === code3);
      if (idx >= 0) {
        popRank = idx + 1;
        popValue = sortedPop[idx].value;
        popYear = sortedPop[idx].year;
      }
    }

    // --- HDI rank (UNDP via OWID, by iso3) ---
    const sortedHdi = [...hdiPoints].sort((a, b) => b.value - a.value);
    const hdiTotal = sortedHdi.length;
    let hdi: RankDimension | null = null;
    if (code3) {
      const idx = sortedHdi.findIndex((p) => p.iso3 === code3);
      if (idx >= 0) {
        hdi = {
          rank: idx + 1,
          total: hdiTotal,
          value: sortedHdi[idx].value,
          year: sortedHdi[idx].year,
        };
      }
    }

    // --- Area rank (DB, by alpha-2 code) ---
    const sortedByArea = [...allCountries].sort((a, b) => (b.area ?? 0) - (a.area ?? 0));
    const areaTotal = sortedByArea.length;
    const areaIdx = sortedByArea.findIndex((c) => c.code === code);
    let areaRank: number | null = null;
    let areaValue: number | null = null;
    if (areaIdx >= 0) {
      areaRank = areaIdx + 1;
      areaValue = sortedByArea[areaIdx].area;
    }

    return {
      gdpPerCapita: {
        rank: gdpRank,
        total: gdpTotal,
        value: gdpValue,
        year: gdpYear,
      },
      population: {
        rank: popRank,
        total: popTotal,
        value: popValue,
        year: popYear, // World Bank SP.POP.TOTL provides the publication year.
      },
      area: {
        rank: areaRank,
        total: areaTotal,
        value: areaValue,
        year: null, // area in DB has no year field; source dataset is mledoze/countries.
      },
      hdi,
    };
  }) as Promise<ClassificationData>;
}
