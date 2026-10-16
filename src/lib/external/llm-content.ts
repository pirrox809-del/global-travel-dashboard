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
  /// Emergency numbers — well-known public numbers (112 EU, 911 US, etc.).
  emergencyNumbers: { police: string; ambulance: string; fire: string; general?: string };
  /// Crime risks, scams to watch for, areas to avoid. ~80 words.
  crimeBrief: string;
  /// Dangerous animals endemic to the country.
  dangerousAnimals: { name: string; description: string }[];
  /// Quality of life summary: healthcare, education, safety, cost of living. ~80 words.
  qualityOfLife: string;
  /// Tax summary: VAT rate, corporate tax rate, income tax bracket, notes.
  taxes: { vatRate: string; corporateTax: string; incomeTax: string; notes: string };
  /// Clothing advice by season. ~60 words.
  clothingAdvice: string;
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
  "emergencyNumbers": {
    "police": "e.g. '112' or '17'",
    "ambulance": "e.g. '112' or '15'",
    "fire": "e.g. '112' or '18'",
    "general": "the universal emergency number if one exists, else null"
  },
  "crimeBrief": "a single paragraph, 60-90 words, on crime risks for travelers: common scams, pickpocketing hotspots, areas to avoid especially at night, and a practical safety tip. Be factual.",
  "dangerousAnimals": [
    { "name": "...", "description": "<= 20 words: where found, what risk it poses" }
  ]  // 2-4 dangerous animals endemic to this country (snakes, spiders, sharks, large mammals, insects). Empty array if the country has none of note.
  "qualityOfLife": "a single paragraph, 60-90 words, on quality of life: healthcare quality and access, education, general safety, income inequality, and work-life balance. Be factual.",
  "taxes": {
    "vatRate": "e.g. '20%' (standard VAT/sales tax rate)",
    "corporateTax": "e.g. '25%' (standard corporate income tax rate)",
    "incomeTax": "e.g. '0-45% progressive' (top marginal personal income tax rate)",
    "notes": "one sentence on notable tax features (e.g. tax havens, special zones, high/low burden)"
  },
  "clothingAdvice": "a single paragraph, 50-80 words, on recommended clothing by season: what to pack for summer vs winter, any cultural dress considerations (e.g. modest attire for religious sites), and climate-specific gear (rain, sun, cold).",
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

/**
 * Sanitize common LLM JSON mistakes before parsing:
 *  - Trailing commas before ] or }
 *  - Unescaped newlines inside strings
 *  - Smart quotes → straight quotes
 *  - Missing closing brace
 * This dramatically improves parse success rate for LLM-generated JSON.
 */
function sanitizeJson(str: string): string {
  let s = str;
  // Replace smart quotes with straight quotes.
  s = s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
  // Remove trailing commas (before } or ]).
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Fix unescaped newlines inside string values (common LLM mistake).
  // We do a conservative pass: replace literal newlines that appear between
  // a quote and a closing quote+colon/comma with \\n.
  s = s.replace(/:\s*"([^"]*?)\n([^"]*?)"/g, ': "$1\\n$2"');
  // If the JSON is missing a closing brace, add one.
  const openBraces = (s.match(/{/g) ?? []).length;
  const closeBraces = (s.match(/}/g) ?? []).length;
  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
  }
  return s;
}

/**
 * Parse the LLM output into a payload, with sanitization + retry.
 * LLMs occasionally produce malformed JSON (trailing commas, smart quotes,
 * unescaped newlines). We sanitize first; if that fails, we retry the LLM
 * call once with a stricter prompt. If still failing, we throw and the
 * aggregator returns a partial-content response.
 */
async function parsePayload(raw: string): Promise<LlmCountryPayload> {
  const jsonStr = extractJson(raw);
  // First try: raw parse.
  try {
    const p = JSON.parse(jsonStr) as LlmCountryPayload;
    validatePayload(p);
    return p;
  } catch {
    // Second try: sanitized parse.
    try {
      const p = JSON.parse(sanitizeJson(jsonStr)) as LlmCountryPayload;
      validatePayload(p);
      return p;
    } catch (e) {
      throw new Error(`JSON parse failed after sanitize: ${(e as Error).message}`);
    }
  }
}

function validatePayload(p: LlmCountryPayload) {
  if (!p.overview || !Array.isArray(p.culture) || !Array.isArray(p.foods)) {
    throw new Error('LLM payload missing required fields');
  }
  // Ensure arrays exist (defensive).
  if (!Array.isArray(p.unwrittenRules)) p.unwrittenRules = [];
  if (!Array.isArray(p.pois)) p.pois = [];
  if (!Array.isArray(p.dangerousAnimals)) p.dangerousAnimals = [];
  if (!p.priceEstimate) {
    p.priceEstimate = {
      budgetHotelEur: '40-90', midHotelEur: '90-180', luxuryHotelEur: '180-500',
      flightFromEuEur: '120-400', mealBudgetEur: '8-15', mealMidEur: '20-45',
      notes: '',
    };
  }
  // Defensive defaults for the new optional fields.
  if (!p.emergencyNumbers) {
    p.emergencyNumbers = { police: '112', ambulance: '112', fire: '112' };
  }
  if (!p.crimeBrief) p.crimeBrief = '';
  if (!p.qualityOfLife) p.qualityOfLife = '';
  if (!p.clothingAdvice) p.clothingAdvice = '';
  if (!p.taxes) {
    p.taxes = { vatRate: '', corporateTax: '', incomeTax: '', notes: '' };
  }
}

/**
 * Run LLM call(s) to produce the structured payload for a country.
 * Includes automatic retry with a stricter prompt if the first call produces
 * unparseable JSON. `languageName` = native name (e.g. "Italian").
 */
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

  // Attempt 1: standard prompt.
  const completion1 = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(country, languageName) },
    ],
    thinking: { type: 'disabled' },
  });
  const raw1 = completion1.choices[0]?.message?.content ?? '';
  try {
    return await parsePayload(raw1);
  } catch (e1) {
    console.warn(`[llm] ${country.name}: first parse failed, retrying:`, (e1 as Error).message);
  }

  // Attempt 2: stricter prompt with explicit JSON reminder.
  const completion2 = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(country, languageName) },
      { role: 'assistant', content: raw1 },
      {
        role: 'user',
        content:
          'Your previous response was NOT valid JSON. Please regenerate the COMPLETE JSON object. ' +
          'Rules: (1) Use ONLY straight double quotes ". (2) NO trailing commas. ' +
          '(3) NO newlines inside string values. (4) Output ONLY the JSON object, nothing else. ' +
          `(Write all text in ${languageName}.)`,
      },
    ],
    thinking: { type: 'disabled' },
  });
  const raw2 = completion2.choices[0]?.message?.content ?? '';
  return parsePayload(raw2); // If this throws, the aggregator handles it.
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

  // Serialize the new JSON fields.
  const emergencyJson = p.emergencyNumbers ? JSON.stringify(p.emergencyNumbers) : null;
  const animalsJson = p.dangerousAnimals?.length ? JSON.stringify(p.dangerousAnimals) : null;
  const taxesJson = p.taxes ? JSON.stringify(p.taxes) : null;

  await db.countryContent.upsert({
    where: { countryCode },
    update: {
      overview: p.overview,
      culture: p.culture.map((s) => `- ${s}`).join('\n'),
      unwrittenRules: p.unwrittenRules.map((s) => `- ${s}`).join('\n'),
      safetyBrief: p.safetyBrief ?? null,
      contentLanguage: language,
      emergencyNumbersJson: emergencyJson,
      crimeBrief: p.crimeBrief ?? null,
      dangerousAnimalsJson: animalsJson,
      qualityOfLife: p.qualityOfLife ?? null,
      taxesJson,
      clothingAdvice: p.clothingAdvice ?? null,
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
      emergencyNumbersJson: emergencyJson,
      crimeBrief: p.crimeBrief ?? null,
      dangerousAnimalsJson: animalsJson,
      qualityOfLife: p.qualityOfLife ?? null,
      taxesJson,
      clothingAdvice: p.clothingAdvice ?? null,
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
