/**
 * llm-content.ts — LLM-powered generator for curated country content.
 *
 * ---------------------------------------------------------------------
 * THE KEY IDEA (covers "the vast majority of world states")
 * ---------------------------------------------------------------------
 * Truly free flight/hotel/safety APIs don't exist, and writing curated
 * content for every country by hand is infeasible. So we use the LLM
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
import { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import { getZai, zaiModel, type ZaiClient } from '@/lib/zai';

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
  /// Internet quality: fiber/5G coverage, urban vs rural. ~50 words.
  internetQuality: string;
  /// Natural disaster risk: earthquakes, tsunamis, hurricanes, monsoons, volcanoes. ~60 words.
  naturalDisasterRisk: string;
  /// Major TV channels. 3-5 entries.
  tvChannels: { name: string; type: 'public' | 'private' | 'news' | 'sports' | 'entertainment' }[];
  /// Famous people from this country. 3-5 entries.
  famousPeople: { name: string; profession: string }[];
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
  "internetQuality": "a single paragraph, 40-60 words, on internet quality: typical broadband/mobile speeds, fiber availability in cities vs rural areas, 4G/5G coverage, and whether tourists can easily get SIM cards or public WiFi.",
  "naturalDisasterRisk": "a single paragraph, 50-70 words, on natural disaster risks specific to this country: seismic activity, tsunami risk if coastal, hurricane/cyclone/monsoon seasons, volcanic activity, flooding or drought. Be factual and proportionate.",
  "tvChannels": [
    { "name": "...", "type": "public|private|news|sports|entertainment" }
  ]  // 3-5 major national TV channels
  "famousPeople": [
    { "name": "...", "profession": "e.g. 'footballer', 'actress', 'politician', 'singer', 'writer'" }
  ]  // 3-5 famous people born in or strongly associated with this country
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

/** Build the CORE prompt: tagline, overview, culture, foods, POIs, prices, safety.
 *  This is the "travel essentials" half — runs in parallel with buildExtendedPrompt. */
function buildCorePrompt(
  country: Parameters<typeof buildUserPrompt>[0],
  languageName: string,
): string {
  const ctx = buildContextLine(country);
  return `${ctx}
Write ALL text in ${languageName}. Return STRICT JSON with these fields:

{
  "tagline": "vivid one-liner, <= 90 chars",
  "bestTimeToVisit": "e.g. 'Apr-Jun, Sep-Oct'",
  "overview": "single paragraph, 120-180 words, factual: geography, history, what it's famous for",
  "culture": ["5-7 bullets on language, religion, customs, arts"],
  "unwrittenRules": ["5-7 bullets on etiquette / taboos"],
  "safetyBrief": "60-100 words: crime risks, areas to avoid, health notes, sober risk assessment",
  "foods": [{"name":"...","description":"<= 25 words","category":"main|dessert|street|drink"}],
  "pois": [{"name":"...","description":"<= 25 words","category":"historic|nature|museum|beach|religious|modern","city":"optional"}],
  "priceEstimate": {"budgetHotelEur":"40-90","midHotelEur":"90-180","luxuryHotelEur":"180-500","flightFromEuEur":"120-400","mealBudgetEur":"8-15","mealMidEur":"20-45","notes":"one sentence"}
}

Rules: Output ONLY JSON. No backticks. No trailing commas. Be specific and accurate.`;
}

/** Build the EXTENDED prompt: emergency, crime, animals, quality of life, taxes,
 *  clothing, internet, disasters, TV, famous people. Runs in parallel with core. */
function buildExtendedPrompt(
  country: Parameters<typeof buildUserPrompt>[0],
  languageName: string,
): string {
  const ctx = buildContextLine(country);
  return `${ctx}
Write ALL text in ${languageName}. Return STRICT JSON with these fields:

{
  "emergencyNumbers": {"police":"e.g. 17","ambulance":"e.g. 15","fire":"e.g. 18","general":"universal number or null"},
  "crimeBrief": "60-90 words: common scams, pickpocket hotspots, areas to avoid at night, safety tip",
  "dangerousAnimals": [{"name":"...","description":"<= 20 words: where found, what risk"}],
  "qualityOfLife": "60-90 words: healthcare, education, safety, inequality, work-life balance",
  "taxes": {"vatRate":"e.g. 20%","corporateTax":"e.g. 25%","incomeTax":"e.g. 0-45% progressive","notes":"one sentence"},
  "clothingAdvice": "50-80 words: clothing by season, cultural dress considerations, climate gear",
  "internetQuality": "40-60 words: broadband/mobile speeds, fiber vs rural, 4G/5G, SIM cards for tourists",
  "naturalDisasterRisk": "50-70 words: seismic activity, tsunami, hurricanes, monsoons, volcanoes. Factual.",
  "tvChannels": [{"name":"...","type":"public|private|news|sports|entertainment"}],
  "famousPeople": [{"name":"...","profession":"e.g. footballer, actress, politician"}]
}

Rules: Output ONLY JSON. No backticks. No trailing commas. 3-5 entries for arrays. Be factual.`;
}

/** Shared context line for both prompts. */
function buildContextLine(country: Parameters<typeof buildUserPrompt>[0]): string {
  const languages = safeParse<Record<string, string>>(country.languagesJson);
  const currencies = safeParse<Record<string, { name: string; symbol?: string }>>(country.currenciesJson);
  const langList = languages ? Object.values(languages).slice(0, 5).join(', ') : 'n/a';
  const curList = currencies
    ? Object.entries(currencies).map(([c, v]) => `${c} (${v.name})`).slice(0, 3).join(', ')
    : 'n/a';
  return `Produce a travel brief for "${country.name}" (official: ${country.officialName ?? country.name}, capital: ${country.capital ?? 'n/a'}, region: ${country.region ?? 'n/a'} / ${country.subregion ?? 'n/a'}, languages: ${langList}, currencies: ${curList}).`;
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

function validatePayload(p: LlmCountryPayload, rawPreview = '') {
  const missing: string[] = [];
  if (!p.overview) missing.push('overview');
  if (!Array.isArray(p.culture)) missing.push('culture');
  if (!Array.isArray(p.foods)) missing.push('foods');
  if (missing.length > 0) {
    throw new Error(
      `LLM payload missing required fields: [${missing.join(', ')}] — response preview: ${rawPreview.slice(0, 200)}`,
    );
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
  if (!p.internetQuality) p.internetQuality = '';
  if (!p.naturalDisasterRisk) p.naturalDisasterRisk = '';
  if (!Array.isArray(p.tvChannels)) p.tvChannels = [];
  if (!Array.isArray(p.famousPeople)) p.famousPeople = [];
  if (!p.taxes) {
    p.taxes = { vatRate: '', corporateTax: '', incomeTax: '', notes: '' };
  }
}

/**
 * Run TWO LLM calls IN PARALLEL to produce the full payload:
 *  - Call A (core): tagline, overview, culture, foods, pois, price — the travel essentials.
 *  - Call B (extended): emergency, crime, animals, qualityOfLife, taxes, clothing,
 *    internet, disasterRisk, tvChannels, famousPeople — the extended info.
 *
 * Running in parallel halves the total generation time (~25s instead of ~50s).
 * Each call produces a partial JSON object; we merge them into one payload.
 * Each call has its own retry-on-bad-JSON logic.
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
  if (!zai) {
    throw new Error('LLM not configured on this deployment (no ZAI_* env vars, no .z-ai-config file)');
  }

  // Run both LLM calls. Parallel by default; serialized when LLM_SERIAL=1
  // (used by the bulk pre-generation script to stay under gateway rate limits).
  const runOne = (which: 'core' | 'extended') =>
    llmCallWithRetry(zai, country, languageName, which)
      .then((value) => ({ status: 'fulfilled' as const, value }))
      .catch((reason) => ({ status: 'rejected' as const, reason }));
  const [coreResult, extResult] =
    process.env.LLM_SERIAL === '1'
      ? await (async () => [await runOne('core'), await runOne('extended')])()
      : await Promise.allSettled([
          llmCallWithRetry(zai, country, languageName, 'core'),
          llmCallWithRetry(zai, country, languageName, 'extended'),
        ]);

  // If both failed, throw with the REAL reasons (not a generic message).
  if (coreResult.status === 'rejected' && extResult.status === 'rejected') {
    throw new Error(
      `Both LLM calls failed for ${country.name} — core: ${(coreResult.reason as Error).message} | ` +
      `extended: ${(extResult.reason as Error).message}`,
    );
  }
  if (coreResult.status === 'rejected') {
    throw new Error(`Core LLM call failed for ${country.name}: ${(coreResult.reason as Error).message}`);
  }

  const core = coreResult.status === 'fulfilled' ? coreResult.value : {} as Partial<LlmCountryPayload>;
  const ext = extResult.status === 'fulfilled' ? extResult.value : {} as Partial<LlmCountryPayload>;

  // Merge: core provides overview/culture/foods/pois, extended provides the rest.
  const merged: LlmCountryPayload = {
    tagline: core.tagline ?? ext.tagline ?? '',
    bestTimeToVisit: core.bestTimeToVisit ?? ext.bestTimeToVisit ?? '',
    overview: core.overview ?? ext.overview ?? '',
    culture: core.culture ?? ext.culture ?? [],
    unwrittenRules: core.unwrittenRules ?? ext.unwrittenRules ?? [],
    safetyBrief: core.safetyBrief ?? ext.safetyBrief ?? '',
    emergencyNumbers: ext.emergencyNumbers ?? core.emergencyNumbers ?? { police: '112', ambulance: '112', fire: '112' },
    crimeBrief: ext.crimeBrief ?? core.crimeBrief ?? '',
    dangerousAnimals: ext.dangerousAnimals ?? core.dangerousAnimals ?? [],
    qualityOfLife: ext.qualityOfLife ?? core.qualityOfLife ?? '',
    taxes: ext.taxes ?? core.taxes ?? { vatRate: '', corporateTax: '', incomeTax: '', notes: '' },
    clothingAdvice: ext.clothingAdvice ?? core.clothingAdvice ?? '',
    internetQuality: ext.internetQuality ?? core.internetQuality ?? '',
    naturalDisasterRisk: ext.naturalDisasterRisk ?? core.naturalDisasterRisk ?? '',
    tvChannels: ext.tvChannels ?? core.tvChannels ?? [],
    famousPeople: ext.famousPeople ?? core.famousPeople ?? [],
    foods: core.foods ?? ext.foods ?? [],
    pois: core.pois ?? ext.pois ?? [],
    priceEstimate: core.priceEstimate ?? ext.priceEstimate ?? {
      budgetHotelEur: '40-90', midHotelEur: '90-180', luxuryHotelEur: '180-500',
      flightFromEuEur: '120-400', mealBudgetEur: '8-15', mealMidEur: '20-45', notes: '',
    },
  };

  validatePayload(merged);
  return merged;
}

/** Make a single LLM call with the appropriate prompt, with JSON retry. */
async function llmCallWithRetry(
  zai: ZaiClient,
  country: Parameters<typeof buildUserPrompt>[0],
  languageName: string,
  which: 'core' | 'extended',
): Promise<Partial<LlmCountryPayload>> {
  const prompt = which === 'core' ? buildCorePrompt(country, languageName) : buildExtendedPrompt(country, languageName);

  // Attempt 1: standard prompt.
  const completion1 = await zai.chat.completions.create({
    model: zaiModel(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  });
  const raw1 = completion1.choices[0]?.message?.content ?? '';
  try {
    return parsePartialPayload(raw1);
  } catch (e1) {
    console.warn(`[llm] ${country.name} (${which}): parse failed, retrying:`, (e1 as Error).message);
  }

  // Attempt 2: stricter prompt.
  const completion2 = await zai.chat.completions.create({
    model: zaiModel(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
      { role: 'assistant', content: raw1 },
      {
        role: 'user',
        content: 'Your previous response was NOT valid JSON. Regenerate the COMPLETE JSON. ' +
          'Rules: (1) Use ONLY straight double quotes. (2) NO trailing commas. ' +
          '(3) NO newlines inside string values. (4) Output ONLY the JSON object.',
      },
    ],
    thinking: { type: 'disabled' },
  });
  const raw2 = completion2.choices[0]?.message?.content ?? '';
  return parsePartialPayload(raw2);
}

/** Parse a partial JSON payload (from either the core or extended call). */
function parsePartialPayload(raw: string): Partial<LlmCountryPayload> {
  const jsonStr = extractJson(raw);
  try {
    const p = JSON.parse(jsonStr) as Partial<LlmCountryPayload>;
    // Sanitize any strings (fix smart quotes, etc.).
    return p;
  } catch {
    const p = JSON.parse(sanitizeJson(jsonStr)) as Partial<LlmCountryPayload>;
    return p;
  }
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
  // Optional Prisma client override — lets the cron route persist into a
  // disposable /tmp copy of the SQLite database on serverless hosts.
  client: PrismaClient = db,
) {
  // Wipe previously-generated child rows (kept separate from Country metadata).
  await client.food.deleteMany({ where: { countryCode } });
  await client.pointOfInterest.deleteMany({ where: { countryCode } });

  // Serialize the new JSON fields.
  const emergencyJson = p.emergencyNumbers ? JSON.stringify(p.emergencyNumbers) : null;
  const animalsJson = p.dangerousAnimals?.length ? JSON.stringify(p.dangerousAnimals) : null;
  const taxesJson = p.taxes ? JSON.stringify(p.taxes) : null;
  const tvJson = p.tvChannels?.length ? JSON.stringify(p.tvChannels) : null;
  const peopleJson = p.famousPeople?.length ? JSON.stringify(p.famousPeople) : null;

  await client.countryContent.upsert({
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
      internetQuality: p.internetQuality ?? null,
      naturalDisasterRisk: p.naturalDisasterRisk ?? null,
      tvChannelsJson: tvJson,
      famousPeopleJson: peopleJson,
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
      internetQuality: p.internetQuality ?? null,
      naturalDisasterRisk: p.naturalDisasterRisk ?? null,
      tvChannelsJson: tvJson,
      famousPeopleJson: peopleJson,
      tagline: p.tagline,
      bestTimeToVisit: p.bestTimeToVisit,
    },
  });

  if (p.foods.length) {
    await client.food.createMany({
      data: p.foods.map((f) => ({
        countryCode,
        name: f.name,
        description: f.description,
        category: f.category,
      })),
    });
  }
  if (p.pois.length) {
    await client.pointOfInterest.createMany({
      data: p.pois.map((poi) => ({
        countryCode,
        name: poi.name,
        description: poi.description,
        category: poi.category,
        city: poi.city ?? null,
      })),
    });
  }

  await client.travelPriceEstimate.upsert({
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
