/**
 * travel-advisory.ts — US Department of State travel advisories.
 *
 * Why this API:
 *  - 100% free public API (no key) at https://traveladvisory.state.gov
 *  - Returns advisories for ~200 countries in a single JSON document.
 *  - Each country gets a "level" from 1 (Exercise normal precautions) to 4
 *    (Do not travel) plus a textual description.
 *
 * Limitations:
 *  - US-centric wording (we surface it as "US State Dept advisory").
 *  - For a truly multi-source advisory, you'd layer UK FCDO + Canada + AU
 *    Smartraveller RSS feeds on top.
 *
 * Cached 12 hours: advisories change a few times per week at most.
 */
import { cache, TTL } from '@/lib/cache';

const API = 'https://traveladvisory.state.gov/_/api';

export type AdvisoryLevel = 1 | 2 | 3 | 4;

export type Advisory = {
  countryCode: string; // ISO-3166 alpha-2
  level: AdvisoryLevel;
  levelName: string;
  message: string;
  updatedAt: string | null;
};

type RawAdvisoryResponse = {
  data?: Record<
    string,
    {
      advisory: {
        'country-iso-code'?: string;
        'country-name'?: string;
        'advisory-state'?: string;
        'advisory-state-color'?: string;
        'advisory-text'?: string;
        'advisory-updated'?: string;
      };
    }
  >;
};

const LEVEL_NAMES: Record<AdvisoryLevel, string> = {
  1: 'Exercise Normal Precautions',
  2: 'Exercise Increased Caution',
  3: 'Reconsider Travel',
  4: 'Do Not Travel',
};

/** Fetch the full advisory map from the US State Dept. Cached 12h. */
export async function getAllAdvisories(): Promise<Record<string, Advisory>> {
  return cache.wrap('advisory:us-state:all', TTL.advisory, async () => {
    const res = await fetch(API, { next: { revalidate: TTL.advisory } });
    if (!res.ok) throw new Error(`US State Dept advisory ${res.status}`);
    const json = (await res.json()) as RawAdvisoryResponse;
    const out: Record<string, Advisory> = {};
    for (const [, entry] of Object.entries(json.data ?? {})) {
      const a = entry.advisory;
      const code = (a['country-iso-code'] || '').toUpperCase();
      if (!code) continue;
      const level = Number(a['advisory-state']) as AdvisoryLevel;
      if (!level || level < 1 || level > 4) continue;
      out[code] = {
        countryCode: code,
        level,
        levelName: LEVEL_NAMES[level],
        message: a['advisory-text'] ?? '',
        updatedAt: a['advisory-updated'] ?? null,
      };
    }
    return out;
  });
}

/** Get the advisory for one country (or null if no data). */
export async function getAdvisory(countryCode: string): Promise<Advisory | null> {
  const all = await getAllAdvisories();
  return all[countryCode.toUpperCase()] ?? null;
}
