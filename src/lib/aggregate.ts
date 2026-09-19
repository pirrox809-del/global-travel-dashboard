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

/**
 * Return the static, DB-sourced payload for a country (with LLM content).
 *
 * `locale` drives the LANGUAGE of the generated content. We persist
 * `contentLanguage` on the row; if the cached content's language doesn't
 * match the requested locale, we regenerate in the new language (one LLM
 * call) and persist it. This means switching language costs one generation
 * per country, then it's cached again.
 */
async function loadStatic(
  code: string,
  locale: Locale,
): Promise<{ staticData: CountryStatic; justGenerated: boolean } | null> {
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

  let justGenerated = false;
  // Lazy LLM generation: generate if no content yet OR if the cached content
  // is in a different language than the one requested now.
  const needsGeneration =
    !country.content || (country.content.contentLanguage ?? 'en') !== locale;
  if (needsGeneration) {
    const payload = await generateCountryPayload(country, LOCALE_NATIVE[locale]);
    await persistCountryPayload(country.code, payload, locale);
    justGenerated = true;
    // Re-read so the returned payload includes the freshly generated rows.
    const refreshed = await db.country.findUnique({
      where: { code: country.code },
      include: { content: true, foods: true, pois: true, priceEstimate: true },
    });
    if (!refreshed) return null;
    return { staticData: toDto(refreshed), justGenerated };
  }

  return { staticData: toDto(country), justGenerated };
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

  // 1. Load static data (DB). May trigger a one-time LLM generation
  //    (or a re-generation if the cached content's language differs).
  const staticResult = await loadStatic(upper, locale);
  if (!staticResult) return null;
  const { staticData, justGenerated } = staticResult;

  // 2. Resolve the country's primary currency code (first in the map).
  const primaryCurrency = staticData.currencies[0]?.code ?? null;

  // 3. PARALLEL FETCH of all dynamic sources.
  //    Use Promise.allSettled so a single failure doesn't poison the rest.
  const [weatherRes, exchangeRes, advisoryRes] = await Promise.allSettled([
    staticData.latitude != null && staticData.longitude != null
      ? getWeather(staticData.latitude, staticData.longitude)
      : Promise.reject(new Error('No coordinates for country')),
    primaryCurrency ? convertCurrency(primaryCurrency) : Promise.reject(new Error('No currency code')),
    getAdvisory(upper),
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

  // 5. Assemble final payload.
  return {
    country: staticData,
    dynamic: { weather, exchange, advisory },
    meta: {
      generatedAt: new Date().toISOString(),
      cache: cache.stats(),
      sources: { weather: 'open-meteo', exchange: 'frankfurter-ecb', advisory: 'us-state-dept' },
      staticContentGenerated: justGenerated,
    },
  };
}
