# Task 4 — dashboard-cards (Z.ai Code)

## Task
Create 5 new dashboard card components (Emergency / Safety / Economy / QualityOfLife / Clothing) + add their i18n strings + add them to the dashboard layout. The aggregator already returns `dynamic.economy` (REAL World Bank data) and `country.content` new fields (`emergencyNumbers`, `crimeBrief`, `dangerousAnimals`, `qualityOfLife`, `taxes`, `clothingAdvice`) — surface them in the UI.

## Files created
- `src/components/dashboard/emergency-card.tsx` — 3 stat boxes (Police / Ambulance / Fire), icons `Phone`/`Heart`/`Flame`, source badge "curated", italic "Verify locally" disclaimer.
- `src/components/dashboard/safety-card.tsx` — `ShieldAlert` title, crimeBrief paragraph + dangerousAnimals list (PawPrint bullets), source badge "curated".
- `src/components/dashboard/economy-card.tsx` — `BarChart3` title, 4 stat rows (GDP $X.XT/$X.XB/$XXXM, GDP/cap $XX,XXX, inflation X.X%, unemployment X.X%), source badge "world-bank" → "world-bank · real". Null-safety: "—" on null, "Economic data unavailable" on error.
- `src/components/dashboard/quality-of-life-card.tsx` — `HeartPulse` title, single paragraph, source badge "curated".
- `src/components/dashboard/clothing-card.tsx` — `Shirt` title, clothingAdvice paragraph (curated) + taxes sub-section with inline "llm · estimate" badge, 3 tax rows (VAT/Corporate/Income).

## Files modified
- `src/components/dashboard/source-badge.tsx` — added `'world-bank': 'source.worldBank'` to keyMap.
- `src/lib/i18n.ts` — added 15 strings × 4 locales (en/es/it/fr) = 60 new entries: 5 card titles + 4 emergency labels + 5 economy labels + 1 source badge label.
- `src/components/dashboard/dashboard.tsx` — imported 5 new cards, added 2 new staggered grids after the existing "Food + POI + Price" grid:
  1. 3-col grid (lg): EmergencyCard, EconomyCard, SafetyCard.
  2. 2-col grid (md): QualityOfLifeCard, ClothingCard.
  Each card conditionally rendered via `{country.content?.FIELD ? <Card .../> : null}` pattern, except EconomyCard which always renders (its internal logic handles errors).

## Verification
- `bun run lint` clean.
- `bunx tsc --noEmit` clean for all 5 new files (pre-existing errors elsewhere are unrelated).
- Backend pipeline already in place: `aggregate.ts` `toDto()` maps all new content fields, `llm-content.ts` prompt generates them, `persistCountryPayload` writes them.
- Discovered a runtime bug: the dev server's Prisma client singleton was stale (didn't know about the new fields for the upsert write path), so cached content couldn't be regenerated. Fixed via `bunx prisma generate` + dev server restart.
- End-to-end verified on France (`GET /api/countries/FR?lang=en` after fresh regen):
  - emergencyNumbers: `{ police: "17", ambulance: "15", fire: "18", general: "112" }`
  - crimeBrief: populated paragraph
  - dangerousAnimals: 3 items (Adder, Wild Boar, Brown Bear)
  - qualityOfLife: populated paragraph
  - taxes: `{ vatRate: "20%", corporateTax: "25%", incomeTax: "0-45% progressive" }`
  - clothingAdvice: populated paragraph
  - economy (REAL World Bank): gdpUsd $3.37T, gdpPerCapitaUsd $48,986, inflation 0.9%, unemployment 7.5%

## Notes for next agent
- The dev server was restarted (PID may have changed from the original). If you don't see it running, start it with: `cd /home/z/my-project && (setsid bash -c 'exec bun run dev' > /home/z/my-project/dev.log 2>&1 < /dev/null &)`.
- All 5 new cards use the existing glass-card pattern (`animate-card-in`, `CardHeader` with icon + title + `SourceBadge`, `CardContent`).
- The EconomyCard is the ONLY one with REAL data — clearly labelled "world-bank · real". All others are AI-curated (labelled "curated", with the ClothingCard's taxes sub-section labelled "llm · estimate").
- Number formatting helpers (`fmtGdp`, `fmtPerCap`, `fmtPct`) are local to economy-card.tsx and reusable if needed elsewhere.
