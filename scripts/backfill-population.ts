/**
 * One-shot backfill: population from World Bank SP.POP.TOTL into Country.population.
 * Run: bun scripts/backfill-population.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

type WBRow = { countryiso3code?: string; value: number | null; date: string };

async function main() {
  const url = 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=500';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`World Bank fetch failed: ${res.status}`);
  const j = (await res.json()) as [unknown, WBRow[] | null];
  const pops = new Map<string, { value: number; year: number }>();
  for (const row of j[1] ?? []) {
    if (!row?.countryiso3code || row.value == null) continue;
    pops.set(row.countryiso3code.toUpperCase(), { value: row.value, year: Number(row.date) || 0 });
  }
  console.log(`World Bank returned ${pops.size} entries`);

  const countries = await db.country.findMany({ select: { code: true, code3: true, population: true } });
  let updated = 0;
  let missed: string[] = [];
  for (const c of countries) {
    const iso3 = c.code3?.toUpperCase();
    if (!iso3) { missed.push(c.code); continue; }
    const entry = pops.get(iso3);
    if (!entry) { missed.push(c.code); continue; }
    await db.country.update({
      where: { code: c.code },
      data: { population: BigInt(Math.round(entry.value)) },
    });
    updated++;
  }
  console.log(`Updated population for ${updated} countries`);
  console.log(`No WB data for ${missed.length}: ${missed.join(', ')}`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
