/**
 * usgs.ts — Real earthquake data from the USGS (US Geological Survey) API.
 *
 * 100% free, no API key. Returns ACTUAL earthquake events (magnitude, location,
 * date) within a radius of the country's coordinates. This is real seismic
 * data recorded by the USGS worldwide network — not AI-generated.
 *
 * We query M3+ events within 300km of the capital in the last 12 months to
 * assess the country's seismic activity level. Cache 7 days.
 */
import { cache, TTL } from '@/lib/cache';

const BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export type EarthquakeEvent = {
  magnitude: number;
  place: string;
  date: string; // ISO date
};

export type EarthquakeData = {
  recentCount: number; // M3+ events in last 12 months within 300km
  largestMagnitude: number | null;
  largestEvent: EarthquakeEvent | null;
  mostRecent: EarthquakeEvent | null;
  notableEvents: EarthquakeEvent[]; // top 3 by magnitude
  source: 'usgs';
};

type USGSFeature = {
  properties: {
    mag: number;
    place: string;
    time: number; // epoch ms
  };
};

type USGSResponse = {
  features: USGSFeature[];
  metadata: { count: number };
};

/**
 * Fetch real earthquake data near the given coordinates.
 * Returns recent M3+ events within 300km in the last 12 months.
 */
export async function getEarthquakeData(
  lat: number | null,
  lon: number | null,
): Promise<EarthquakeData | null> {
  if (lat == null || lon == null) return null;
  const key = `usgs:${lat.toFixed(1)},${lon.toFixed(1)}`;
  return cache.wrap(key, TTL.countryMeta, async () => {
    try {
      // Query: M3+, within 300km, last 12 months, ordered by magnitude.
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = new Date().toISOString().slice(0, 10);

      const url =
        `${BASE}?format=geojson` +
        `&latitude=${lat}&longitude=${lon}` +
        `&maxradiuskm=300&minmagnitude=3` +
        `&starttime=${startStr}&endtime=${endStr}` +
        `&orderby=magnitude&limit=50`;

      const res = await fetch(url, { next: { revalidate: TTL.countryMeta } });
      if (!res.ok) return null;
      const j = (await res.json()) as USGSResponse;

      const features = (j.features || []).filter((f) => f.properties?.mag != null);
      if (features.length === 0) {
        return {
          recentCount: 0,
          largestMagnitude: null,
          largestEvent: null,
          mostRecent: null,
          notableEvents: [],
          source: 'usgs',
        };
      }

      // Sort by magnitude descending for "notable" events.
      const sorted = [...features].sort((a, b) => b.properties.mag - a.properties.mag);
      // Sort by time for "most recent".
      const byTime = [...features].sort((a, b) => b.properties.time - a.properties.time);

      const toEvent = (f: USGSFeature): EarthquakeEvent => ({
        magnitude: f.properties.mag,
        place: f.properties.place || 'Unknown',
        date: new Date(f.properties.time).toISOString(),
      });

      return {
        recentCount: features.length,
        largestMagnitude: sorted[0].properties.mag,
        largestEvent: toEvent(sorted[0]),
        mostRecent: toEvent(byTime[0]),
        notableEvents: sorted.slice(0, 3).map(toEvent),
        source: 'usgs',
      };
    } catch {
      return null;
    }
  }) as Promise<EarthquakeData | null>;
}
