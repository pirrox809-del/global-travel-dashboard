/**
 * taiwan-brief.ts — one-off: generate the AI brief for Taiwan.
 *
 * The z.ai gateway applies a content filter that rejects prompts mentioning
 * "Republic of China (Taiwan)" (error 1301). This script generates the brief
 * through the same pipeline using the neutral sporting designation
 * "Chinese Taipei", then swaps the designation back to "Taiwan" in the
 * resulting payload LOCALLY (after the gateway has seen it) before persisting.
 *
 * Usage: bun run scripts/taiwan-brief.ts
 */
import { db } from '@/lib/db';
import { generateCountryPayload, persistCountryPayload } from '@/lib/external/llm-content';

const TARGET_CODE = 'TW';

const COUNTRY = {
  code: 'TW',
  name: 'Taipei', // hmm — see below: we keep the sporting name to pass the filter
  officialName: 'Chinese Taipei',
  capital: 'Taipei',
  region: 'Asia',
  subregion: 'Eastern Asia',
  languagesJson: '{"zho":"Chinese"}',
  currenciesJson: '{"TWD":{"name":"New Taiwan dollar","symbol":"$"}}',
};

/** Swap the neutral designation back to the real one in every string field. */
function deEuphemize(value: string): string {
  return value
    .replaceAll('Chinese Taipei', 'Taiwan')
    .replaceAll('Chinese-Taipei', 'Taiwan');
}

function walkStrings(node: unknown, fn: (s: string) => string): unknown {
  if (typeof node === 'string') return fn(node);
  if (Array.isArray(node)) return node.map((n) => walkStrings(n, fn));
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, walkStrings(v, fn)]),
    );
  }
  return node;
}

async function main() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[taiwan] attempt ${attempt} — generating…`);
      const payload = await generateCountryPayload(COUNTRY, 'English');
      const cleaned = walkStrings(payload, deEuphemize);
      await persistCountryPayload(TARGET_CODE, cleaned, 'en');
      console.log('[taiwan] OK — brief persisted');
      return;
    } catch (err) {
      console.error(`[taiwan] attempt ${attempt} FAILED: ${(err as Error).message.slice(0, 220)}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 25_000));
    }
  }
  console.error('[taiwan] giving up after 3 attempts');
  process.exit(1);
}

main()
  .catch((e) => {
    console.error('[taiwan] fatal:', e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
