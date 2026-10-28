/**
 * translate-content.ts — Translate existing English content to any language.
 *
 * KEY INSIGHT: The z-ai LLM doesn't follow "write about France in German"
 * reliably — but it DOES follow "translate this English text to German"
 * perfectly. Translation is a simpler, more structured task for the LLM.
 *
 * So instead of regenerating content from scratch when a user switches
 * language, we TRANSLATE the existing English content. This:
 *  - Works for 100+ languages (the LLM translates reliably)
 *  - Only needs 1 LLM call (not 2 parallel)
 *  - Reuses existing English content (no re-generation of country facts)
 *  - Is cached per-language in the DB
 */
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';
import { getLLMLanguageName } from '@/lib/i18n';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

/**
 * Take the English content from the DB, translate all text fields to the
 * target language, and persist the translated version.
 *
 * `countryCode`: the country to translate
 * `targetLanguage`: e.g. "German", "Japanese", "العربية"
 * `locale`: the ISO code, e.g. "de", "ja", "ar"
 */
export async function translateCountryContent(
  countryCode: string,
  locale: string,
): Promise<boolean> {
  // Load the English content from the DB.
  const content = await db.countryContent.findUnique({
    where: { countryCode },
  });
  if (!content || !content.overview) {
    // No English content to translate — can't proceed.
    return false;
  }

  const languageName = getLLMLanguageName(locale);

  // Build a JSON object with all the text fields to translate.
  const toTranslate = {
    tagline: content.tagline ?? '',
    bestTimeToVisit: content.bestTimeToVisit ?? '',
    overview: content.overview,
    culture: content.culture,
    unwrittenRules: content.unwrittenRules,
    safetyBrief: content.safetyBrief ?? '',
    crimeBrief: content.crimeBrief ?? '',
    qualityOfLife: content.qualityOfLife ?? '',
    clothingAdvice: content.clothingAdvice ?? '',
    internetQuality: content.internetQuality ?? '',
    naturalDisasterRisk: content.naturalDisasterRisk ?? '',
    emergencyNumbers: JSON.parse(content.emergencyNumbersJson ?? '{}'),
    taxes: JSON.parse(content.taxesJson ?? '{}'),
    dangerousAnimals: JSON.parse(content.dangerousAnimalsJson ?? '[]'),
    tvChannels: JSON.parse(content.tvChannelsJson ?? '[]'),
    famousPeople: JSON.parse(content.famousPeopleJson ?? '[]'),
    foods: [] as any[], // Foods are separate table rows
    pois: [] as any[], // POIs are separate table rows
  };

  // Load foods and POIs to translate their names/descriptions.
  const foods = await db.food.findMany({ where: { countryCode } });
  toTranslate.foods = foods.map(f => ({ name: f.name, description: f.description ?? '' }));

  const pois = await db.pointOfInterest.findMany({ where: { countryCode } });
  toTranslate.pois = pois.map(p => ({ name: p.name, description: p.description ?? '' }));

  const zai = await getZai();

  // Send to LLM for translation.
  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are a professional translator. You translate JSON values while keeping JSON keys in English. You always reply with a SINGLE valid JSON object and NOTHING ELSE.',
      },
      {
        role: 'user',
        content: `Translate ALL text values in this JSON to ${languageName}. Keep JSON keys in English. Translate every string value, including array items and nested object values. Return ONLY the translated JSON:\n\n${JSON.stringify(toTranslate)}`,
      },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  // Extract and parse the translated JSON.
  const jsonStr = extractJson(raw);
  const translated = JSON.parse(jsonStr);

  // Persist the translated content.
  await db.food.deleteMany({ where: { countryCode } });
  await db.pointOfInterest.deleteMany({ where: { countryCode } });

  await db.countryContent.update({
    where: { countryCode },
    data: {
      overview: translated.overview ?? content.overview,
      culture: Array.isArray(translated.culture) ? translated.culture.map((s: string) => `- ${s}`).join('\n') : content.culture,
      unwrittenRules: Array.isArray(translated.unwrittenRules) ? translated.unwrittenRules.map((s: string) => `- ${s}`).join('\n') : content.unwrittenRules,
      tagline: translated.tagline ?? content.tagline,
      bestTimeToVisit: translated.bestTimeToVisit ?? content.bestTimeToVisit,
      safetyBrief: translated.safetyBrief ?? content.safetyBrief,
      crimeBrief: translated.crimeBrief ?? content.crimeBrief,
      qualityOfLife: translated.qualityOfLife ?? content.qualityOfLife,
      clothingAdvice: translated.clothingAdvice ?? content.clothingAdvice,
      internetQuality: translated.internetQuality ?? content.internetQuality,
      naturalDisasterRisk: translated.naturalDisasterRisk ?? content.naturalDisasterRisk,
      emergencyNumbersJson: translated.emergencyNumbers ? JSON.stringify(translated.emergencyNumbers) : content.emergencyNumbersJson,
      taxesJson: translated.taxes ? JSON.stringify(translated.taxes) : content.taxesJson,
      dangerousAnimalsJson: translated.dangerousAnimals ? JSON.stringify(translated.dangerousAnimals) : content.dangerousAnimalsJson,
      tvChannelsJson: translated.tvChannels ? JSON.stringify(translated.tvChannels) : content.tvChannelsJson,
      famousPeopleJson: translated.famousPeople ? JSON.stringify(translated.famousPeople) : content.famousPeopleJson,
      contentLanguage: locale,
    },
  });

  // Re-create foods and POIs with translated names/descriptions.
  if (Array.isArray(translated.foods) && translated.foods.length > 0) {
    await db.food.createMany({
      data: translated.foods.map((f: any, i: number) => ({
        countryCode,
        name: f.name ?? foods[i]?.name ?? '',
        description: f.description ?? foods[i]?.description ?? null,
        category: foods[i]?.category ?? null,
      })),
    });
  }

  if (Array.isArray(translated.pois) && translated.pois.length > 0) {
    await db.pointOfInterest.createMany({
      data: translated.pois.map((p: any, i: number) => ({
        countryCode,
        name: p.name ?? pois[i]?.name ?? '',
        description: p.description ?? pois[i]?.description ?? null,
        category: pois[i]?.category ?? null,
        city: pois[i]?.city ?? null,
      })),
    });
  }

  console.log(`[translate] ${countryCode} → ${locale} done`);
  return true;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON found in translation response');
  }
  return candidate.slice(start, end + 1);
}
