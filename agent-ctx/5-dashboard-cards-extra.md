# Task 5 — dashboard-cards-extra (Z.ai Code)

## Task
Create 4 new dashboard card components (Seismic / Internet / Media / FamousPeople) + add their i18n strings + wire them into the dashboard layout. The aggregator now returns `dynamic.earthquakes` (REAL USGS data) and 4 new `country.content` fields (`internetQuality`, `naturalDisasterRisk`, `tvChannels`, `famousPeople`) — surface them in the UI.

## Previous agents' work referenced
- `src/components/dashboard/weather-card.tsx` — canonical glass-card pattern (`animate-card-in`, CardHeader w/ icon + title + SourceBadge, CardContent).
- `src/components/dashboard/economy-card.tsx` — REAL-data card pattern with `{ error }` union handling, tone-coloured stat rows, local number formatters.
- `src/components/dashboard/clothing-card.tsx` — two-section card pattern (top paragraph + bottom `border-t` divider with inline `SourceBadge` next to the sub-section header).
- `src/components/dashboard/source-badge.tsx` — keyMap approach for source labels (added `'usgs'`).
- `src/lib/i18n.ts` — 4-locale dictionary; inserted new keys right after `card.clothing` per task instructions.
- `src/components/language-provider.tsx` — `useLanguage()` returns `{ t, fmt, ... }`; `fmt.dateLong(d)` formats with `year: numeric, month: short, day: numeric` per locale.

## Files created
- `src/components/dashboard/seismic-card.tsx` — MIXED card (USGS real + LLM paragraph).
  - Header: `Activity` icon (amber-600) + `card.seismic` title. Header `SourceBadge` is "usgs" when earthquakes has data, else "curated".
  - Top section (USGS data): recentCount line (interpolated via `seismic.recentCount`), 2-col grid with `Largest recorded` (rose tone) + `Most recent` (amber tone) — each shows `M{magnitude.toFixed(1)}` + place + `fmt.dateLong(date)`. Below: `Notable events` list with amber pill `M{mag}` + place (truncate) + `fmt.dateLong(date)`.
  - When `notableEvents.length === 0`: render the green positive message `seismic.noneActive` with `ShieldCheck` icon (instead of the data section).
  - Bottom section (LLM paragraph): `border-t pt-3` divider + right-aligned `SourceBadge source="curated"` + paragraph.
  - Skips entirely when earthquakes is in error AND `naturalDisasterRisk` is null (returns null).
- `src/components/dashboard/internet-card.tsx` — single paragraph card. `Wifi` icon (cyan-600), `card.internet` title, "curated" badge. Skips if `internetQuality` is null.
- `src/components/dashboard/media-card.tsx` — TV channels list. `Tv` icon (fuchsia-600), `card.media` title, "curated" badge. Each row: channel name (truncate) + colour-coded `Badge` for type. Type colour map: public=teal, private=violet, news=amber, sports=rose, entertainment=cyan (custom classes via `bg-{color}-500/10 text-{color}-700 dark:text-{color}-300`). Unknown types fall back to muted. List wrapped in `max-h-80 overflow-y-auto scroll-soft`. Skips if channels is null or empty.
- `src/components/dashboard/famous-people-card.tsx` — 2-col grid of name (bold) + profession (muted). `Star` icon (amber-500), `card.famousPeople` title, "curated" badge. `grid-cols-1 sm:grid-cols-2` layout; if more than 5 people, wrapped in `max-h-80 overflow-y-auto scroll-soft`. Skips if list is null or empty.

## Files modified
- `src/components/dashboard/source-badge.tsx` — added `usgs: 'source.usgs'` to keyMap.
- `src/components/language-provider.tsx` — exported `TFn` type (was internal). Used by `seismic-card.tsx`'s `QuakeDataSection` helper to type the `t` parameter cleanly.
- `src/lib/i18n.ts` — added 15 strings × 4 locales = 60 new entries to all 4 dictionaries, inserted right after `card.clothing` (per task instructions):
  - 4 card titles (`card.seismic`, `card.internet`, `card.media`, `card.famousPeople`).
  - 5 seismic labels (`seismic.recentCount` w/ `{n}` interpolation, `seismic.largest`, `seismic.recent`, `seismic.notable`, `seismic.noneActive`).
  - 5 TV type labels (`tv.public`, `tv.private`, `tv.news`, `tv.sports`, `tv.entertainment`).
  - 1 source badge label (`source.usgs`).
- `src/components/dashboard/dashboard.tsx` — imported 4 new cards, added 1 new staggered grid + 1 full-width card right after the existing Quality/Clothing grid:
  1. `stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3` with: SeismicCard, InternetCard, MediaCard.
  2. FamousPeopleCard full-width (root level, no grid).
  Conditional rendering:
  - SeismicCard: rendered when earthquakes has data OR `naturalDisasterRisk` is non-null. The card itself short-circuits to `null` when earthquakes is in error AND risk is null (defensive double-check).
  - InternetCard: rendered when `country.content?.internetQuality` is truthy.
  - MediaCard: rendered when `country.content?.tvChannels?.length` is truthy.
  - FamousPeopleCard: rendered when `country.content?.famousPeople?.length` is truthy.

## Verification
- `bun run lint` clean (no errors, no warnings).
- `bunx tsc --noEmit` clean for all 4 new files + the modified dashboard.tsx + source-badge.tsx + language-provider.tsx. No new type errors introduced by this task. (Pre-existing errors in `advisory-card.tsx`, `weather-card.tsx`, `country-globe.tsx`, `ui/globe.tsx`, `ui/neural-noise.tsx`, `ui/polaroid-line-carousel.tsx`, `aggregate.ts` are unrelated.)
- Runtime verification: bumped the Prisma client (`bunx prisma generate`) so the dev server's SELECT now includes `internetQuality / naturalDisasterRisk / tvChannelsJson / famousPeopleJson` columns. Restarted the dev server to pick up the regenerated client.
- Deleted the cached content rows for FR + JP and re-requested to force a fresh LLM generation:
  - FR (no seismic activity): `earthquakes.recentCount = 0`, `notableEvents = []` → SeismicCard shows green "No significant seismic activity" message. `internetQuality` paragraph populated. `tvChannels`: 5 channels (TF1 private, France 2 public, France 24 news, Canal+ private, M6 private). `famousPeople`: 5 people (Napoleon, Marie Curie, Brigitte Bardot, Sartre, Zidane).
  - JP (active seismic): `earthquakes.recentCount = 50`, `largestMagnitude = 5.8` (M5.8 · 3 km E of Fujishiro, Japan), `mostRecent = M4.7 · 6 km ESE of Tōgane, Japan`, 3 notable events. `naturalDisasterRisk` paragraph mentions the Pacific Ring of Fire. `tvChannels`: 5 channels (NHK public, Nippon TV/TBS/Fuji TV/TV Asahi private). `famousPeople`: 5 people (Kurosawa, Miyazaki, Yoko Ono, Murakami, Sakamoto).
- Bundle inspection: client chunk `_next/static/chunks/src_3f72090f._.js` contains all 15 new i18n keys + `source.usgs` + the 4 new card component names — verifying the cards are bundled and shipped.

## Notes for next agent
- The dev server PID may have changed after my restart. If `bun run dev` isn't running, start it with: `cd /home/z/my-project && (setsid bash -c 'exec bun run dev' > /home/z/my-project/dev.log 2>&1 < /dev/null &)`.
- The Prisma client has been regenerated (`bunx prisma generate`) — all 4 new content columns are now correctly typed and selected.
- ALL cached `CountryContent` rows from previous runs have NULL values for `internetQuality / naturalDisasterRisk / tvChannelsJson / famousPeopleJson` (because the upserts were rejected by the stale client before my regen). To verify any country end-to-end, delete the row first (`bun -e "import { db } from './src/lib/db'; await db.countryContent.delete({ where: { countryCode: 'XX' } })"`) then re-request `?lang=XX` — first regen takes ~15-60s (LLM), subsequent reads return from cache in ~40ms.
- SeismicCard is the only card with TWO source badges: "usgs · real" in the header (when earthquakes has data) and "curated" inline with the risk paragraph. If earthquakes is in error but risk paragraph is available, the header badge switches to "curated" and the data section is skipped — only the paragraph renders.
- The `fmt.dateLong()` outputs a date like "Aug 22, 2026" in en (slightly more granular than the spec's "Mar 2025" example, but uses the i18n formatter as instructed).
- Magnitude formatting helper `fmtMag(m)` returns "M5.0" — local to seismic-card.tsx; reusable if needed elsewhere.
- The `TFn` type is now exported from `language-provider.tsx`. Future cards that need to pass `t` down to helper components can import it.
