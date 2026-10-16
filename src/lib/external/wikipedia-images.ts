/**
 * wikipedia-images.ts — Fetches REAL photos for each country from Wikipedia.
 *
 * Strategy:
 *  - For each PointOfInterest the LLM generated (e.g. "Eiffel Tower", "Louvre"),
 *    fetch the Wikipedia page/summary → its lead image (a real Wikimedia Commons photo).
 *  - Also fetch the capital city's Wikipedia summary → cityscape photo.
 *  - Filter out SVGs (flags/logos/diagrams) — only keep JPG/PNG photos.
 *  - Cache the photo URLs for 7 days (photos don't change; Wikipedia URLs are
 *    stable thumb.wikimedia.org paths).
 *
 * This gives 5-8 real, high-quality photos per country, tied to the actual
 * landmarks the LLM mentions. 100% free, no API key.
 */
import { cache, TTL } from '@/lib/cache';

const SUMMARY_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

export type CountryPhoto = {
  image: string;
  title: string;
  caption?: string;
};

type WikiSummary = {
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string };
  title?: string;
  description?: string;
  extract?: string;
};

/**
 * Fetch a single Wikipedia summary (cached 7 days).
 * Returns the thumbnail OR original image URL, filtering out SVGs.
 */
async function fetchWikiImage(articleTitle: string): Promise<CountryPhoto | null> {
  if (!articleTitle) return null;
  const key = `wiki:img:${articleTitle.replace(/\s+/g, '_')}`;
  return cache.wrap(key, TTL.countryMeta, async () => {
    try {
      const articleUrl = `${SUMMARY_API}/${encodeURIComponent(articleTitle.replace(/\s+/g, '_'))}`;
      const res = await fetch(articleUrl, {
        headers: {
          'Accept': 'application/json',
          // Wikipedia REST API REQUIRES a descriptive User-Agent.
          'User-Agent': 'GlobalTravelDashboard/1.0 (contact@example.com)',
        },
        next: { revalidate: TTL.countryMeta },
      });
      if (!res.ok) {
        console.warn(`[wiki] ${articleTitle}: HTTP ${res.status}`);
        return null;
      }
      const j = (await res.json()) as WikiSummary;
      let src = j.originalimage?.source ?? j.thumbnail?.source ?? '';
      if (!src) {
        console.warn(`[wiki] ${articleTitle}: no image (title=${j.title})`);
        return null;
      }
      if (/\.svg/i.test(src)) {
        console.warn(`[wiki] ${articleTitle}: SVG skipped`);
        return null;
      }
      if (src.startsWith('//')) src = 'https:' + src;
      src = src.replace(/\/\d+px-/, '/800px-');
      return {
        image: src,
        title: j.title ?? articleTitle,
        caption: j.description ?? undefined,
      };
    } catch (err) {
      console.warn(`[wiki] ${articleTitle} fetch error:`, (err as Error).message);
      return null;
    }
  }) as Promise<CountryPhoto | null>;
}

/**
 * Fetch real photos for a country: its capital + each POI from the LLM.
 * Returns up to `maxPhotos` (default 8) photos, all real Wikimedia Commons images.
 * Degrades gracefully — if a POI has no Wikipedia article, it's simply skipped.
 */
export async function getCountryPhotos(
  capital: string | null,
  pois: { name: string; city?: string | null }[],
  maxPhotos = 8,
): Promise<CountryPhoto[]> {
  // Build the list of article titles to fetch: capital first, then POIs.
  const titles: string[] = [];
  if (capital) titles.push(capital);
  for (const poi of pois) {
    if (poi.name) titles.push(poi.name);
    // Also try the POI's city if we still need more photos.
    if (poi.city && !titles.includes(poi.city)) titles.push(poi.city);
  }
  // Fetch all summaries in parallel (Wikipedia handles this fine).
  const results = await Promise.all(titles.map(fetchWikiImage));

  // Filter nulls, dedupe by image URL, cap at maxPhotos.
  const seen = new Set<string>();
  const photos: CountryPhoto[] = [];
  for (const p of results) {
    if (!p || seen.has(p.image)) continue;
    seen.add(p.image);
    photos.push(p);
    if (photos.length >= maxPhotos) break;
  }

  return photos;
}
