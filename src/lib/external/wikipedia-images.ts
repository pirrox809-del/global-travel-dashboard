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
const MEDIA_LIST_API = 'https://en.wikipedia.org/api/rest_v1/page/media-list';

const WIKI_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'GlobalTravelDashboard/1.0 (contact@example.com)',
};

/**
 * Fetch the media-list for a Wikipedia article (e.g. a capital city).
 * Returns MANY more photos than the summary endpoint (5-15 per city).
 * Filters out SVGs, maps, flags, logos — only real JPG/PNG photos.
 */
async function fetchMediaListPhotos(articleTitle: string, maxPhotos = 6): Promise<CountryPhoto[]> {
  if (!articleTitle) return [];
  const key = `wiki:media:${articleTitle.replace(/\s+/g, '_')}`;
  return cache.wrap(key, TTL.countryMeta, async () => {
    try {
      const res = await fetch(
        `${MEDIA_LIST_API}/${encodeURIComponent(articleTitle.replace(/\s+/g, '_'))}`,
        { headers: WIKI_HEADERS, next: { revalidate: TTL.countryMeta } },
      );
      if (!res.ok) return [];
      const j = await res.json();
      const items = (j.items ?? []) as Array<{
        title?: string;
        type: string;
        srcset?: Array<{ src: string; scale: string }>;
      }>;
      const exclude = /flag|coat|seal|locator|map|diagram|chart|graph|symbol|emble|svg|logo|icon|commons|\.gif/i;
      const photos: CountryPhoto[] = [];
      for (const it of items) {
        if (it.type !== 'image' || !it.srcset?.length) continue;
        if (exclude.test(it.title ?? '')) continue;
        const src = it.srcset[0]?.src; // smallest — faster to load (260px display needs only ~320px)
        if (!src || /\.svg/i.test(src) || /\.gif/i.test(src)) continue;
        let url = src.startsWith('//') ? 'https:' + src : src;
        photos.push({
          image: url,
          title: (it.title ?? '').replace('File:', '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim(),
          caption: articleTitle,
        });
        if (photos.length >= maxPhotos) break;
      }
      return photos;
    } catch {
      return [];
    }
  }) as Promise<CountryPhoto[]>;
}

/**
 * Wikimedia Commons category/keyword search — a real-photos fallback for small
 * countries whose Wikipedia article media-list is thin (e.g. tiny territories,
 * islands). Searches the Commons repository by country name and returns real
 * JPG/PNG images, skipping SVGs/maps/flags/logos just like the other sources.
 */
async function fetchCommonsPhotos(query: string, max = 6): Promise<CountryPhoto[]> {
  if (!query) return [];
  const key = `wiki:commons:${query}`;
  return cache.wrap(key, TTL.countryMeta, async () => {
    try {
      const url =
        'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
        '&generator=search&gsrnamespace=6&gsrlimit=' + (max + 6) +
        '&gsrsearch=' + encodeURIComponent(`${query} landscape OR city OR landmark`) +
        '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640';
      const res = await fetch(url, { headers: WIKI_HEADERS, next: { revalidate: TTL.countryMeta } });
      if (!res.ok) return [];
      const j = await res.json() as {
        query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ url: string; extmetadata?: { ImageDescription?: { value: string } } }> }> };
      };
      const pages = Object.values(j.query?.pages ?? {});
      const exclude = /flag|coat|seal|locator|map|diagram|chart|graph|symbol|emble|svg|gif|logo|icon|commons|location|orthophot|relief/i;
      const photos: CountryPhoto[] = [];
      for (const p of pages) {
        const ii = p.imageinfo?.[0];
        if (!ii?.url) continue;
        if (/\.(svg|gif)$/i.test(ii.url)) continue;
        if (exclude.test(p.title ?? '')) continue;
        photos.push({
          image: ii.url,
          title: (p.title ?? '').replace('File:', '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim(),
          caption: ii.extmetadata?.ImageDescription?.value?.replace(/<[^>]+>/g, '').slice(0, 120) || query,
        });
        if (photos.length >= max) break;
      }
      return photos;
    } catch {
      return [];
    }
  }) as Promise<CountryPhoto[]>;
}

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
      if (!res.ok) return null;
      const j = (await res.json()) as WikiSummary;
      // Prefer the thumbnail (typically 320-400px, fast to load) over the
      // original (full-res, can be 5-10MB). The carousel displays at 260px,
      // so a 320px thumbnail is more than enough.
      // Do NOT modify the URL — Wikimedia thumb URLs are hash-validated and
      // changing the width in the path breaks them (HTTP 400).
      let src = j.thumbnail?.source ?? j.originalimage?.source ?? '';
      if (!src) return null;
      if (/\.svg/i.test(src)) return null; // skip flags/logos
      if (src.startsWith('//')) src = 'https:' + src;
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
  countryName: string,
  capital: string | null,
  pois: { name: string; city?: string | null }[],
  maxPhotos = 8,
): Promise<CountryPhoto[]> {
  // Strategy: combine THREE sources for maximum coverage:
  //  1. POI summary images (landmark-specific — best quality)
  //  2. Capital city media-list (5-10 cityscape photos)
  //  3. Country article media-list (landscape/culture photos — fallback)
  const poiTitles: string[] = [];
  for (const poi of pois) {
    if (poi.name) poiTitles.push(poi.name);
    if (poi.city && !poiTitles.includes(poi.city)) poiTitles.push(poi.city);
  }

  // Country article lead image is a strong single-photo source for tiny
  // territories whose media-list is sparse (e.g. Tuvalu, Niue).
  const [poiResults, capitalPhotos, countryPhotos, countryLead] = await Promise.all([
    Promise.all(poiTitles.map(fetchWikiImage)),
    capital ? fetchMediaListPhotos(capital, maxPhotos) : Promise.resolve([]),
    fetchMediaListPhotos(countryName, maxPhotos),
    fetchWikiImage(countryName),
  ]);

  // Combine: POI photos first, then capital, then country article, then lead.
  const allPhotos = [
    ...poiResults.filter(Boolean),
    ...capitalPhotos,
    ...countryPhotos,
    ...(countryLead ? [countryLead] : []),
  ];

  // Dedupe by image URL, cap at maxPhotos.
  const seen = new Set<string>();
  const photos: CountryPhoto[] = [];
  for (const p of allPhotos) {
    if (!p || seen.has(p.image)) continue;
    seen.add(p.image);
    photos.push(p);
    if (photos.length >= maxPhotos) break;
  }

  // Fallback: small countries often still have too few photos — search
  // Wikimedia Commons directly by country name (and capital) to fill the rest.
  if (photos.length < maxPhotos) {
    const queries = [countryName, capital].filter(Boolean) as string[];
    for (const q of queries) {
      if (photos.length >= maxPhotos) break;
      const commons = await fetchCommonsPhotos(q, maxPhotos - photos.length);
      for (const p of commons) {
        if (seen.has(p.image)) continue;
        seen.add(p.image);
        photos.push(p);
        if (photos.length >= maxPhotos) break;
      }
    }
  }

  return photos;
}
