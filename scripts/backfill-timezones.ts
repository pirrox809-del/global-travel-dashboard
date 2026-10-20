/**
 * One-time backfill: populate `timezonesJson` for all existing Country rows
 * using the `countries-and-timezones` package.
 *
 * Run with: `bun run scripts/backfill-timezones.ts`
 */
import { db } from '../src/lib/db';
import ct from 'countries-and-timezones';

async function main() {
  const countries = await db.country.findMany({ select: { code: true, name: true } });
  console.log(`Backfilling timezones for ${countries.length} countries…`);

  let updated = 0;
  let skipped = 0;
  for (const c of countries) {
    try {
      const tzCountry = ct.getCountry(c.code);
      const timezones = tzCountry?.timezones ?? [];
      if (timezones.length === 0) {
        skipped++;
        continue;
      }
      await db.country.update({
        where: { code: c.code },
        data: { timezonesJson: JSON.stringify(timezones) },
      });
      updated++;
      if (updated % 25 === 0) console.log(`  …${updated} updated`);
    } catch (err) {
      console.warn(`  ✗ ${c.code} (${c.name}):`, (err as Error).message);
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped (no timezones in package).`);
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
