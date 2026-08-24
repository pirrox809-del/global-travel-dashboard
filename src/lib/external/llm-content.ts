/**
 * llm-content.ts — LLM-powered generator for curated country content.
 *
 * ---------------------------------------------------------------------
 * THE KEY IDEA (covers "the vast majority of 189 states")
 * ---------------------------------------------------------------------
 * Truly free flight/hotel/safety APIs don't exist, and writing curated
 * content for 189 countries by hand is infeasible. So we use the LLM
 * (z-ai-web-dev-sdk — free in this environment) to generate, on first
 * request for a country, a SINGLE structured JSON blob containing:
 *
 *   - overview (short paragraph)
 *   - culture (bullet list)
 *   - unwrittenRules (bullet list — etiquette, taboos)
 *   - tagline, bestTimeToVisit
 *   - foods[] (signature dishes)
 *   - pois[] (must-see places)
 *   - priceEstimate (hotel ranges, flight range, meal ranges in EUR)
 *
 * That blob is persisted into CountryContent / Food / PointOfInterest /
 * TravelPriceEstimate. So the SECOND request for the same country is a
 * pure DB read — zero LLM cost, zero latency.
 *
 * This is the "permanent cache layer": the only TTL is "regenerate on
 * demand" (admin button or cron), which is why the dynamic data is NOT
 * generated here — that comes from real APIs (weather/fx/advisory).
 */
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

// Reuse a single SDK instance (recommended by the skill docs).
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/** The shape we ask the LLM to produce. */
export type LlmCountryPayload = {
  tagline: string;
  bestTimeToVisit: string;
  overview: string;
  culture: string[]; // bullet strings
  unwrittenRules: string[]; // bullet strings
  /// General safety brief paragraph. Used as a fallback when the live US State
  /// Dept advisory API is unreachable. Clearly labelled "AI safety brief" in UI.
  safetyBrief: string;
  foods: { name: string; description: string; category: 'main' | 'dessert' | 'street' | 'drink' }[];
  pois: {
    name: string;
    description: string;
    category: 'historic' | 'nature' | 'museum' | 'beach' | 'religious' | 'modern';
    city?: string;
  }[];
  priceEstimate: {
    budgetHotelEur: string; // "40-90"
    midHotelEur: string; // "90-180"
    luxuryHotelEur: string; // "180-400"
    flightFromEuEur: string; // "120-300"
    mealBudgetEur: string; // "8-15"
    mealMidEur: string; // "20-40"
    notes: string;
  };
};

const SYSTEM_PROMPT = `You are a senior travel editor and encyclopedist. You produce concise, accurate, well-structured travel briefs for any country on Earth. You always reply with a SINGLE valid JSON object and NOTHING ELSE — no markdown fences, no commentary.`;

function buildUserPrompt(
  country: {
    name: string;
    officialName?: string | null;
    capital?: string | null;
    region?: string | null;
    subregion?: string | null;
    languagesJson?: string | null;
    currenciesJson?: string | null;
  },
  languageName: string,
): string {
  const languages = safeParse<Record<string, string>>(country.languagesJson);
  const currencies = safeParse<Record<string, { name: string; symbol?: string }>>(country.currenciesJson);
  const langList = languages ? Object.values(languages).slice(0, 5).join(', ') : 'n/a';
  const curList = currencies
    ? Object.entries(currencies)
        .map(([c, v]) => `${c} (${v.name})`)
        .slice(0, 3)
        .join(', ')
    : 'n/a';

  return `Produce a travel brief for the country "${country.name}" (official: ${country.officialName ?? country.name}, capital: ${country.capital ?? 'n/a'}, region: ${country.region ?? 'n/a'} / ${country.subregion ?? 'n/a'}, languages: ${langList}, currencies: ${curList}).

IMPORTANT: Write ALL human-readable text (tagline, bestTimeToVisit, overview, culture bullets, unwrittenRules bullets, safetyBrief, food names+descriptions, POI names+descriptions, price notes) in ${languageName}. Keep field names, category values, and currency ranges exactly as specified.

Return STRICT JSON with EXACTLY this shape and field names:

{
  "tagline": "a vivid one-liner, <= 90 chars",
  "bestTimeToVisit": "e.g. 'Apr-Jun, Sep-Oct' (months when weather is best)",
  "overview": "a single paragraph, 120-180 words, factual, mentioning geography, history highlights, and what the country is famous for",
  "culture": ["bullet", "bullet", ...]  // 5-7 bullets on language, religion, social customs, arts
  "unwrittenRules": ["bullet", ...]  // 5-7 bullets on etiquette / taboos / what surprises foreigners
  "safetyBrief": "a single paragraph, 60-100 words, on general safety for travelers: typical crime risks, areas to avoid, health/sanitation notes, and a sober overall risk assessment. Be factual and balanced, not alarmist.",
  "foods": [
    { "name": "...", "description": "<= 25 words", "category": "main|dessert|street|drink" }
  ]  // 4-6 signature dishes
  "pois": [
    { "name": "...", "description": "<= 25 words", "category": "historic|nature|museum|beach|religious|modern", "city": "optional city name" }
  ]  // 4-6 must-see points of interest
  "priceEstimate": {
    "budgetHotelEur": "40-90",        // per-night EUR range, cheap guesthostel/hostel
    "midHotelEur": "90-180",          // 3-4 star
    "luxuryHotelEur": "180-500",      // 5 star
    "flightFromEuEur": "120-400",     // round-trip from a major EU hub
    "mealBudgetEur": "8-15",           // cheap local meal
    "mealMidEur": "20-45",             // mid restaurant
    "notes": "one sentence on cost of living / value-for-money"
  }
}

Rules:
- Output ONLY the JSON. No backticks, no "Here is...".
- All ranges are inclusive, use a hyphen, no spaces around it, integers in EUR.
- Be specific and accurate; do not invent places that don't exist.
- Keep proper nouns (place names, dish names) in their original form when that is the local convention, but write all descriptive text in ${languageName}.`;
}

function safeParse<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** Extract the first {...} JSON object from a possibly-noisy LLM string. */
function extractJson(raw: string): string {
  const trimmed = raw.trim();
  // Strip ```json fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  // Grab the outermost braces-balanced object.
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in LLM output');
  }
  return candidate.slice(start, end + 1);
}

/** Run a single LLM call to produce the structured payload for a country.
 *  `languageName` is the native name of the target language (e.g. "Italian"). */
export async function generateCountryPayload(
  country: {
    name: string;
    officialName?: string | null;
    capital?: string | null;
    region?: string | null;
    subregion?: string | null;
    languagesJson?: string | null;
    currenciesJson?: string | null;
  },
  languageName: string = 'English',
): Promise<LlmCountryPayload> {
  const zai = await getZai();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(country, languageName) },
    ],
    // Structured JSON: disable thinking for speed and determinism.
    thinking: { type: 'disabled' },
  });
  const raw = completion.choices[0]?.message?.content ?? '';
  const jsonStr = extractJson(raw);
  const payload = JSON.parse(jsonStr) as LlmCountryPayload;
  // Minimal validation — throw if a critical field is missing so the
  // aggregator can fall back to a partial-content response.
  if (!payload.overview || !Array.isArray(payload.culture) || !Array.isArray(payload.foods)) {
    throw new Error('LLM payload missing required fields');
  }
  return payload;
}

/**
 * Persist an LLM payload into the DB (Content + Foods + POIs + PriceEstimate).
 * Idempotent: wipes previous generated rows first so we can re-generate cleanly.
 * `language` is stored on the content row so we know which language the cached
 * text is in (and regenerate when the user switches language).
 */
export async function persistCountryPayload(
  countryCode: string,
  p: LlmCountryPayload,
  language: string = 'en',
) {
  // Wipe previously-generated child rows (kept separate from Country metadata).
  await db.food.deleteMany({ where: { countryCode } });
  await db.pointOfInterest.deleteMany({ where: { countryCode } });

  await db.countryContent.upsert({
    where: { countryCode },
    update: {
      overview: p.overview,
      culture: p.culture.map((s) => `- ${s}`).join('\n'),
      unwrittenRules: p.unwrittenRules.map((s) => `- ${s}`).join('\n'),
      safetyBrief: p.safetyBrief ?? null,
      contentLanguage: language,
      tagline: p.tagline,
      bestTimeToVisit: p.bestTimeToVisit,
    },
    create: {
      countryCode,
      overview: p.overview,
      culture: p.culture.map((s) => `- ${s}`).join('\n'),
      unwrittenRules: p.unwrittenRules.map((s) => `- ${s}`).join('\n'),
      safetyBrief: p.safetyBrief ?? null,
      contentLanguage: language,
      tagline: p.tagline,
      bestTimeToVisit: p.bestTimeToVisit,
    },
  });

  if (p.foods.length) {
    await db.food.createMany({
      data: p.foods.map((f) => ({
        countryCode,
        name: f.name,
        description: f.description,
        category: f.category,
      })),
    });
  }
  if (p.pois.length) {
    await db.pointOfInterest.createMany({
      data: p.pois.map((poi) => ({
        countryCode,
        name: poi.name,
        description: poi.description,
        category: poi.category,
        city: poi.city ?? null,
      })),
    });
  }

  await db.travelPriceEstimate.upsert({
    where: { countryCode },
    update: {
      budgetHotelEur: p.priceEstimate.budgetHotelEur,
      midHotelEur: p.priceEstimate.midHotelEur,
      luxuryHotelEur: p.priceEstimate.luxuryHotelEur,
      flightFromEuEur: p.priceEstimate.flightFromEuEur,
      mealBudgetEur: p.priceEstimate.mealBudgetEur,
      mealMidEur: p.priceEstimate.mealMidEur,
      notes: p.priceEstimate.notes,
    },
    create: {
      countryCode,
      budgetHotelEur: p.priceEstimate.budgetHotelEur,
      midHotelEur: p.priceEstimate.midHotelEur,
      luxuryHotelEur: p.priceEstimate.luxuryHotelEur,
      flightFromEuEur: p.priceEstimate.flightFromEuEur,
      mealBudgetEur: p.priceEstimate.mealBudgetEur,
      mealMidEur: p.priceEstimate.mealMidEur,
      notes: p.priceEstimate.notes,
    },
  });
}
