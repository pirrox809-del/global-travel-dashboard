/**
 * aggregate.ts — The Data Aggregator.
 *
 * This is the heart of the "Data Aggregation" pattern: a single function that
 * orchestrates MANY data sources (DB + external APIs) into ONE coherent
 * payload for the frontend.
 *
 * Key design decisions:
 *  1. PARALLEL FETCH with Promise.allSettled: every external source is
 *     hit concurrently — total latency ~= slowest source, not the sum.
 *  2. GRACEFUL DEGRADATION: each source is wrapped in try/catch. If Open-Meteo
 *     is down, we still return exchange rates + advisory + static content.
 *     The frontend renders an "unavailable" badge per-card instead of erroring.
 *  3. LAZY LLM GENERATION: if the static content (overview/foods/pois) is
 *     missing for this country, we generate it via LLM ONCE and persist it.
 *     This is the trick that lets us cover "the vast majority of 189 states"
 *     without manual data entry — generation cost is paid exactly once.
 *  4. CACHING: dynamic data is cached inside each external client (weather
 *     20m, fx 6h, advisory 12h). Static content is "cached forever" in the DB.
 *  5. The whole aggregated result is NOT cached as a blob: we want the
 *     dynamic parts to refresh at their own TTLs. This is the right
 *     granularity — caching the whole blob would freeze stale weather.
 */
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';
import { getWeather, describeWeatherCode } from '@/lib/external/open-meteo';
import { convertCurrency } from '@/lib/external/frankfurter';
import { getAdvisory } from '@/lib/external/travel-advisory';
import { generateCountryPayload, persistCountryPayload } from '@/lib/external/llm-content';
import { getCountryPhotos } from '@/lib/external/wikipedia-images';
import { getEconomyData } from '@/lib/external/worldbank';
import { getEarthquakeData } from '@/lib/external/usgs';
import { LOCALE_NATIVE, DEFAULT_LOCALE, type Locale } from '@/lib/i18n';
import type { AggregatedCountry, CountryStatic, CountryDynamic } from '@/lib/types';

/** Helper: parse the JSON-encoded language map from the Country row. */
function parseLanguages(json: string | null): { code: string; name: string }[] {
  if (!json) return [];
  try {
    const map = JSON.parse(json) as Record<string, string>;
    return Object.entries(map).map(([code, name]) => ({ code, name }));
  } catch {
    return [];
  }
}

/** Helper: parse the JSON-encoded currency map and pick fields. */
function parseCurrencies(json: string | null): { code: string; name: string; symbol: string | null }[] {
  if (!json) return [];
  try {
    const map = JSON.parse(json) as Record<string, { name: string; symbol?: string }>;
    return Object.entries(map).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol ?? null }));
  } catch {
    return [];
  }
}

function parseStringArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** Parse a JSON column field, return null on failure. */
function safeParseJson(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * In-memory lock: prevents duplicate LLM generations when multiple requests
 * for the same country arrive simultaneously (e.g. the frontend refetching
 * while the first generation is still running). Key = "code:locale".
 */
const generating = new Set<string>();

/**
 * Fire-and-forget LLM generation. Called when content doesn't exist yet.
 * The Promise runs in the background — the HTTP response is returned
 * immediately without waiting for it to finish. The frontend refetches
 * after a few seconds and by then the content is ready in the DB.
 *
 * Uses an in-memory lock so only ONE generation per country+locale runs
 * at a time; concurrent requests just skip.
 */
function triggerGeneration(country: { code: string; name: string } & Record<string, unknown>, locale: Locale) {
  const key = `${country.code}:${locale}`;
  if (generating.has(key)) return; // already generating — skip
  generating.add(key);
  console.log(`[generate] starting background LLM generation for ${country.name} (${locale})`);

  generateCountryPayload(country, LOCALE_NATIVE[locale])
    .then((payload) => persistCountryPayload(country.code, payload, locale))
    .then(() => console.log(`[generate] ${country.name} (${locale}) done`))
    .catch((e) => console.error(`[generate] ${country.name} (${locale}) failed:`, (e as Error).message))
    .finally(() => generating.delete(key));
}

/**
 * Return the static, DB-sourced payload for a country (with LLM content).
 *
 * NON-BLOCKING: if the LLM content doesn't exist yet (or is in the wrong
 * language), we DON'T wait for generation. We return immediately with
 * `content: null` and trigger the generation in the background
 * (fire-and-forget). The frontend sees `contentGenerating: true` in the
 * meta, shows skeletons for content cards, and refetches after ~10s.
 *
 * This reduces first-visit latency from ~30-40s to ~2-3s (just the
 * dynamic data fetch: weather, economy, earthquakes, photos — all in
 * parallel + cached).
 */
async function loadStatic(
  code: string,
  locale: Locale,
): Promise<{ staticData: CountryStatic; justGenerated: boolean; contentGenerating: boolean } | null> {
  const country = await db.country.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      content: true,
      foods: true,
      pois: true,
      priceEstimate: true,
    },
  });
  if (!country) return null;

  const needsGeneration =
    !country.content ||
    (country.content.contentLanguage ?? 'en') !== locale ||
    // Stale content: generated before the extended fields were added.
    // If internetQuality is null, the content is from an older prompt version
    // and needs regeneration to include ALL fields (emergency, crime, TV, etc.).
    country.content.internetQuality == null;

  if (needsGeneration) {
    // Fire-and-forget: start generation in the background, return immediately.
    triggerGeneration(country, locale);
    // Return what we have (metadata + old content if exists) WITHOUT blocking.
    // New fields will be null — the frontend shows skeletons for those cards.
    return { staticData: toDto(country), justGenerated: false, contentGenerating: true };
  }

  return { staticData: toDto(country), justGenerated: false, contentGenerating: false };
}

/** Map a Prisma country (with relations) to the client-facing DTO. */
function toDto(c: NonNullable<Awaited<ReturnType<typeof db.country.findUnique<{ include: { content: true; foods: true; pois: true; priceEstimate: true } }>>>>): CountryStatic {
  return {
    code: c.code,
    code3: c.code3,
    name: c.name,
    officialName: c.officialName,
    capital: c.capital,
    region: c.region,
    subregion: c.subregion,
    independent: c.independent,
    unMember: c.unMember,
    languages: parseLanguages(c.languagesJson),
    currencies: parseCurrencies(c.currenciesJson),
    callingCodes: parseStringArray(c.callingCodesJson),
    timezones: parseStringArray(c.timezonesJson),
    latitude: c.latitude,
    longitude: c.longitude,
    area: c.area,
    population: c.population ? c.population.toString() : null,
    flagEmoji: c.flagEmoji,
    flagUrl: c.flagUrl,
    content: c.content
      ? {
          overview: c.content.overview,
          culture: c.content.culture,
          unwrittenRules: c.content.unwrittenRules,
          safetyBrief: c.content.safetyBrief,
          emergencyNumbers: safeParseJson(c.content.emergencyNumbersJson) as { police: string; ambulance: string; fire: string; general?: string } | null,
          crimeBrief: c.content.crimeBrief,
          dangerousAnimals: safeParseJson(c.content.dangerousAnimalsJson) as { name: string; description: string }[] | null,
          qualityOfLife: c.content.qualityOfLife,
          taxes: safeParseJson(c.content.taxesJson) as { vatRate: string; corporateTax: string; incomeTax: string; notes: string } | null,
          clothingAdvice: c.content.clothingAdvice,
          internetQuality: c.content.internetQuality,
          naturalDisasterRisk: c.content.naturalDisasterRisk,
          tvChannels: safeParseJson(c.content.tvChannelsJson) as { name: string; type: string }[] | null,
          famousPeople: safeParseJson(c.content.famousPeopleJson) as { name: string; profession: string }[] | null,
          tagline: c.content.tagline,
          bestTimeToVisit: c.content.bestTimeToVisit,
        }
      : null,
    foods: c.foods.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      category: f.category,
    })),
    pois: c.pois.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      city: p.city,
    })),
    priceEstimate: c.priceEstimate
      ? {
          budgetHotelEur: c.priceEstimate.budgetHotelEur,
          midHotelEur: c.priceEstimate.midHotelEur,
          luxuryHotelEur: c.priceEstimate.luxuryHotelEur,
          flightFromEuEur: c.priceEstimate.flightFromEuEur,
          mealBudgetEur: c.priceEstimate.mealBudgetEur,
          mealMidEur: c.priceEstimate.mealMidEur,
          notes: c.priceEstimate.notes,
        }
      : null,
  };
}

/**
 * THE AGGREGATOR. Returns the full dashboard payload for one country.
 *
 * `locale` controls the language of LLM-generated content (overview, culture,
 * food, POIs, price notes, safety brief). Switching language triggers one
 * regeneration per country (then cached again in the new language).
 *
 * Note on caching: we do NOT wrap the whole call in `cache.wrap` because the
 * dynamic data has its own TTLs inside each client. Static content is cached
 * permanently in the DB. This avoids the "stale-weather" problem.
 */
export async function aggregateCountry(
  code: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<AggregatedCountry | null> {
  const upper = code.toUpperCase();

  // 1. Load static data (DB). NON-BLOCKING: if content needs generation,
  //    it's triggered fire-and-forget and contentGenerating=true is returned.
  const staticResult = await loadStatic(upper, locale);
  if (!staticResult) return null;
  const { staticData, justGenerated, contentGenerating } = staticResult;

  // 2. Resolve the country's primary currency code (first in the map).
  const primaryCurrency = staticData.currencies[0]?.code ?? null;

  // 3. PARALLEL FETCH of all dynamic sources.
  //    Use Promise.allSettled so a single failure doesn't poison the rest.
  const [weatherRes, exchangeRes, advisoryRes, photosRes, economyRes, quakeRes] = await Promise.allSettled([
    staticData.latitude != null && staticData.longitude != null
      ? getWeather(staticData.latitude, staticData.longitude)
      : Promise.reject(new Error('No coordinates for country')),
    primaryCurrency ? convertCurrency(primaryCurrency) : Promise.reject(new Error('No currency code')),
    getAdvisory(upper),
    // Real photos: country + capital + POIs from Wikipedia (cached 7 days).
    getCountryPhotos(staticData.name, staticData.capital, staticData.pois),
    // Real GDP from World Bank (official data, cached 7 days).
    getEconomyData(staticData.code3),
    // Real earthquake data from USGS (seismic events near the country, cached 7 days).
    getEarthquakeData(staticData.latitude, staticData.longitude),
  ]);

  // 4. Normalise each result into a success-or-error shape.
  const weather: CountryDynamic['weather'] =
    weatherRes.status === 'fulfilled' && weatherRes.value
      ? {
          temperature: weatherRes.value.current.temperature,
          apparentTemperature: weatherRes.value.current.apparentTemperature,
          windspeed: weatherRes.value.current.windspeed,
          weatherCode: weatherRes.value.current.weatherCode,
          weatherLabel: describeWeatherCode(weatherRes.value.current.weatherCode).label,
          weatherEmoji: describeWeatherCode(weatherRes.value.current.weatherCode).emoji,
          isDay: weatherRes.value.current.isDay,
          time: weatherRes.value.current.time,
          units: weatherRes.value.units,
          hourly: weatherRes.value.hourly,
          daily: weatherRes.value.daily,
        }
      : { error: weatherRes.status === 'rejected' ? String(weatherRes.reason?.message ?? weatherRes.reason) : 'No coordinates' };

  const exchange: CountryDynamic['exchange'] =
    exchangeRes.status === 'fulfilled' && exchangeRes.value
      ? {
          currency: primaryCurrency ?? '—',
          perEur: exchangeRes.value.perEur,
          perUsd: exchangeRes.value.perUsd,
          perGbp: exchangeRes.value.perGbp,
          date: exchangeRes.value.date,
        }
      : {
          // If we have a currency code but convertCurrency returned null,
          // the currency simply isn't on the ECB reference list (e.g. EGP, VND).
          // If we don't have a currency code at all, it's a missing-data issue.
          error:
            exchangeRes.status === 'rejected'
              ? String(exchangeRes.reason?.message ?? exchangeRes.reason)
              : primaryCurrency
                ? 'not on ECB list'
                : 'No currency code',
          currency: primaryCurrency,
        };

  const advisory: CountryDynamic['advisory'] =
    advisoryRes.status === 'fulfilled' && advisoryRes.value
      ? {
          source: 'us-state-dept',
          level: advisoryRes.value.level,
          levelName: advisoryRes.value.levelName,
          message: advisoryRes.value.message,
          updatedAt: advisoryRes.value.updatedAt,
        }
      : // Fallback: if the live US State Dept advisory API is unreachable
        // (as happens in restricted sandboxes), surface the LLM-generated
        // safety brief instead — clearly labelled "AI safety brief" in the UI.
        staticData.content?.safetyBrief
        ? { source: 'ai-brief', brief: staticData.content.safetyBrief }
        : {
            source: 'error',
            error: advisoryRes.status === 'rejected' ? String(advisoryRes.reason?.message ?? advisoryRes.reason) : 'No advisory',
          };

  const photos: CountryDynamic['photos'] =
    photosRes.status === 'fulfilled' && photosRes.value && photosRes.value.length > 0
      ? photosRes.value
      : { error: photosRes.status === 'rejected' ? String(photosRes.reason?.message ?? photosRes.reason) : 'No photos found' };

  const economy: CountryDynamic['economy'] =
    economyRes.status === 'fulfilled' && economyRes.value
      ? {
          gdpUsd: economyRes.value.gdpUsd,
          gdpPerCapitaUsd: economyRes.value.gdpPerCapitaUsd,
          gdpYear: economyRes.value.gdpYear,
          inflationRate: economyRes.value.inflationRate,
          unemploymentRate: economyRes.value.unemploymentRate,
        }
      : { error: economyRes.status === 'rejected' ? String(economyRes.reason?.message ?? economyRes.reason) : 'No economic data' };

  const earthquakes: CountryDynamic['earthquakes'] =
    quakeRes.status === 'fulfilled' && quakeRes.value
      ? {
          recentCount: quakeRes.value.recentCount,
          largestMagnitude: quakeRes.value.largestMagnitude,
          largestEvent: quakeRes.value.largestEvent,
          mostRecent: quakeRes.value.mostRecent,
          notableEvents: quakeRes.value.notableEvents,
        }
      : { error: quakeRes.status === 'rejected' ? String(quakeRes.reason?.message ?? quakeRes.reason) : 'No seismic data' };

  // 5. Assemble final payload.
  return {
    country: staticData,
    dynamic: { weather, exchange, advisory, photos, economy, earthquakes },
    meta: {
      generatedAt: new Date().toISOString(),
      cache: cache.stats(),
      sources: { weather: 'open-meteo', exchange: 'frankfurter-ecb', advisory: 'us-state-dept' },
      staticContentGenerated: justGenerated,
      contentGenerating, // true when LLM content is being generated in background
    },
  };
}
