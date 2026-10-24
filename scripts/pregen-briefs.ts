/**
 * pregen-briefs.ts — one-off maintenance script: pre-generate the AI travel
 * briefs for every country that doesn't have them yet, and persist them to
 * the SQLite database (db/custom.db).
 *
 * Why: on serverless hosts the LLM credentials may be absent, so countries
 * nobody has visited yet ship without their brief. Running this locally
 * (where credentials exist) and committing the database makes the deployed
 * site complete for ALL countries from the first request.
 *
 * Usage:
 *   bun run scripts/pregen-briefs.ts            # generate everything missing (en)
 *
 * Safe to re-run: countries whose content already exists are skipped.
 * Concurrency is capped to stay gentle on the LLM gateway.
 */
import { db } from '@/lib/db';
import { generateCountryPayload, persistCountryPayload } from '@/lib/external/llm-content';
import { LOCALE_NATIVE } from '@/lib/i18n';

const LANGUAGE = 'en' as const;
const CONCURRENCY = 1;
const RETRIES = 4;
const RETRY_BASE_DELAY_MS = 60_000;
const INTER_COUNTRY_DELAY_MS = Number(process.env.INTER_COUNTRY_DELAY_MS ?? 15_000);
// When set (>0), the worker exits cleanly between countries once the budget
// is exceeded — lets us run the script in bounded foreground chunks.
const MAX_MINUTES = Number(process.env.MAX_MINUTES ?? 0);

async function main() {
  const countries = await db.country.findMany({
    where: { content: null },
    select: {
      code: true,
      name: true,
      officialName: true,
      capital: true,
      region: true,
      subregion: true,
      languagesJson: true,
      currenciesJson: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`[pregen] ${countries.length} countries missing briefs — starting (concurrency ${CONCURRENCY})`);
  const queue = [...countries];
  let done = 0;
  const failed: string[] = [];
  const startedAt = Date.now();

  async function worker() {
    while (queue.length > 0) {
      if (MAX_MINUTES > 0 && (Date.now() - startedAt) / 60000 >= MAX_MINUTES) {
        console.log(`[pregen] time budget ${MAX_MINUTES}min reached, exiting cleanly (${queue.length} left)`);
        return;
      }
      const country = queue.shift();
      if (!country) return;

      let ok = false;
      for (let attempt = 1; attempt <= RETRIES && !ok; attempt++) {
        try {
          const payload = await generateCountryPayload(country, LOCALE_NATIVE[LANGUAGE]);
          await persistCountryPayload(country.code, payload, LANGUAGE);
          ok = true;
          done++;
          const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
          console.log(`[pregen] ${done}/${countries.length} OK ${country.code} ${country.name} (${mins} min elapsed, ${queue.length} left)`);
        } catch (err) {
          console.error(`[pregen] attempt ${attempt} FAILED ${country.code} ${country.name}: ${(err as Error).message}`);
          if (attempt < RETRIES) {
            // Exponential-ish backoff — the gateway rate-limits bursts (429).
            await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * attempt));
          } else {
            failed.push(country.code);
          }
        }
      }
      // Small pause between countries so two workers don't fire four
      // requests back-to-back and trip the gateway rate limit.
      await new Promise((r) => setTimeout(r, INTER_COUNTRY_DELAY_MS));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`[pregen] FINISHED ok=${done} failed=${failed.length} in ${((Date.now() - startedAt) / 60000).toFixed(1)} min`);
  if (failed.length) console.log(`[pregen] failed codes: ${failed.join(',')}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error('[pregen] fatal:', e);
  process.exit(1);
});
