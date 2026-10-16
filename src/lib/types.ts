/**
 * types.ts — Shared response types for the aggregator + frontend.
 */

/** A single food item as returned to the client. */
export type FoodDto = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};

/** A single point of interest as returned to the client. */
export type PoiDto = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  city: string | null;
};

/** Static (DB-sourced) portion of the dashboard payload. */
export type CountryStatic = {
  code: string;
  code3: string | null;
  name: string;
  officialName: string | null;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  independent: boolean | null;
  unMember: boolean | null;
  languages: { code: string; name: string }[];
  currencies: { code: string; name: string; symbol: string | null }[];
  callingCodes: string[];
  timezones: string[];
  latitude: number | null;
  longitude: number | null;
  area: number | null;
  population: string | null; // BigInt serialized as string for JSON
  flagEmoji: string | null;
  flagUrl: string | null;
  content: {
    overview: string;
    culture: string; // markdown bullets
    unwrittenRules: string; // markdown bullets
    safetyBrief: string | null; // LLM-generated, used as advisory fallback
    tagline: string | null;
    bestTimeToVisit: string | null;
  } | null;
  foods: FoodDto[];
  pois: PoiDto[];
  priceEstimate: {
    budgetHotelEur: string;
    midHotelEur: string;
    luxuryHotelEur: string;
    flightFromEuEur: string;
    mealBudgetEur: string;
    mealMidEur: string;
    notes: string | null;
  } | null;
};

/** Dynamic (real-time API) portion. Each field is independently optional
 *  because each source can fail independently — the UI degrades gracefully. */
export type CountryDynamic = {
  weather:
    | {
        temperature: number;
        apparentTemperature: number;
        windspeed: number;
        weatherCode: number;
        weatherLabel: string;
        weatherEmoji: string;
        isDay: boolean;
        time: string;
        units: { temperature: string; windspeed: string };
        hourly: { time: string[]; temperature: number[] };
        daily?: {
          time: string[];
          tempMax: number[];
          tempMin: number[];
          precipitationProb: number[];
          weatherCode: number[];
        };
      }
    | { error: string };
  exchange:
    | {
        currency: string;
        perEur: number;
        perUsd: number;
        perGbp: number;
        date: string;
      }
    | { error: string; currency: string | null };
  advisory:
    | { source: 'us-state-dept'; level: number; levelName: string; message: string; updatedAt: string | null }
    | { source: 'ai-brief'; brief: string }
    | { source: 'error'; error: string };
  photos: { image: string; title: string; caption?: string }[] | { error: string };
};

/** Full aggregated payload returned by GET /api/countries/[code]. */
export type AggregatedCountry = {
  country: CountryStatic;
  dynamic: CountryDynamic;
  meta: {
    generatedAt: string;
    cache: { hits: number; misses: number; hitRate: number; size: number };
    sources: { weather: 'open-meteo'; exchange: 'frankfurter-ecb'; advisory: 'us-state-dept' };
    staticContentGenerated: boolean; // false when we just generated it on the fly
  };
};

/** Lightweight item in the country list. */
export type CountryListItem = {
  code: string;
  name: string;
  region: string | null;
  capital: string | null;
  flagEmoji: string | null;
  flagUrl: string | null;
};
