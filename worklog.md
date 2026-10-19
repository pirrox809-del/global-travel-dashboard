# Global Travel Dashboard — Worklog

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build a complete "Global Travel Dashboard" — select 1 of 189 countries, get a unified view combining static DB data (overview, culture, food, customs, prefixes, currency, timezone) with live dynamic data (weather, FX, travel advisory, price estimates).

Work Log:
- Designed Prisma schema: `Country` (metadata) + `CountryContent` (LLM-generated overview/culture/rules/safetyBrief) + `Food` + `PointOfInterest` + `TravelPriceEstimate`. Pushed to SQLite.
- Built `src/lib/cache.ts`: in-memory TTL+LRU cache mirroring a Redis client API (get/set/wrap/invalidatePrefix + stats) so production swap is a 1-file change. TTL constants centralised (weather 20m, fx 6h, advisory 12h, country list 24h, country meta 7d).
- Built external API clients (all 100% free, no API key):
  - `rest-countries.ts` → switched to GitHub mirror `mledoze/countries` (restcountries.com is fully deprecated across v3.1 AND v5). 250 countries synced into DB on first boot. Flags resolved via flagcdn.
  - `open-meteo.ts` → current weather + 24h hourly + 7-day forecast. WMO weather-code → emoji/label map.
  - `frankfurter.ts` → updated to `.dev/v1` (old `.app` 301-redirects). ECB reference rates, cached 6h.
  - `travel-advisory.ts` → US State Dept API (unreachable in sandbox → DNS fails) so added graceful fallback.
  - `llm-content.ts` → z-ai-web-dev-sdk LLM generates ONE structured JSON blob per country (overview, culture, unwrittenRules, safetyBrief, foods[], pois[], priceEstimate). Persisted permanently in DB → first request ~15-30s, subsequent ~0.04s (750x faster).
- Built `src/lib/aggregate.ts` (the Data Aggregator): Promise.allSettled over DB + weather + fx + advisory in parallel. Each source wrapped so partial failures degrade gracefully. Advisory falls back to LLM `safetyBrief` when US State Dept unreachable (clearly labelled "AI Safety Brief").
- API routes: `/api/countries` (list, auto-syncs on empty DB) + `/api/countries/[code]` (aggregated payload).
- Frontend: TanStack Query + next-themes. Country selector (cmdk, grouped by region). Dashboard with 9 card types (hero, weather, exchange, advisory, overview, culture, unwritten rules, food, POI, price estimates). Skeleton loaders matching layout. Sticky header + sticky footer (min-h-screen flex-col + mt-auto). Warm gradient bg, emerald/amber/rose accents (no indigo/blue).
- Browser-verified golden path: France (cached, instant), Japan (live JPY=185.66), Egypt (fresh generation, "Just curated" banner, EGP gracefully flagged "not on ECB list"). Mobile 390px + desktop 1440px + dark mode all verified. Zero console errors.

Stage Summary:
- 250 countries available in DB (vs 189 requested — covers the vast majority easily).
- All external data sources 100% free, no API keys.
- Two-layer caching: TTL in-memory for dynamic data + permanent DB rows for LLM content. Measured: 33.7s first call → 0.04s second call.
- Graceful degradation proven (EGP not on ECB list, US State Dept unreachable → AI brief fallback).
- Production architecture documented inline in every file. Swap cache→Redis or SQLite→PostgreSQL is a 1-file change each.

---
Task ID: 2
Agent: main (Z.ai Code)
Task: Add multilingual support (EN/ES/IT/FR) + answer data-accuracy question.

Work Log:
- Answered accuracy question honestly: weather/FX/metadata are REAL (live APIs); culture/food/POI/prices/safety-brief are AI-curated (clearly labelled in UI).
- Built `src/lib/i18n.ts`: 4-locale dictionary (en/es/it/fr) covering ~90 UI strings + region-name translations + locale-aware date/time formatters. Custom solution (not next-intl routing) because the project constraint is single-route `/`.
- Built `LanguageProvider` context with `useSyncExternalStore` for hydration-safe locale detection (localStorage + browser language), avoiding the setState-in-effect lint rule. Exposes `t()`, `trRegion()`, `fmt` formatters.
- Built `LanguageSwitcher` (Popover + Command) with flag + ISO code, persisted to localStorage.
- Added `contentLanguage` field to `CountryContent` Prisma schema. The aggregator now regenerates LLM content when the cached language differs from the requested locale — one regeneration per language switch per country, then cached again.
- Updated LLM prompt to instruct the model to write ALL human-readable text in the target language (passed as native name: "Italian", "Spanish", etc.).
- Updated API route `/api/countries/[code]?lang=XX` to read the locale; updated `useCountry` hook to send `?lang=` + include locale in the query key (so language switches trigger refetch).
- Rewrote all 10 UI components to use `useT()`/`useLanguage()`: header, footer, selector, empty state, hero, weather/exchange/advisory/overview/culture/food/poi/price cards, source badges.
- Browser-verified: switched EN→IT (UI translated instantly, France content regenerated in Italian ~15s: "La Francia: arte, storia e gastronomia…", tagline/safety/overview/food all Italian), EN→ES (regenerated in Spanish ~15s). Zero console errors. Mobile + desktop verified.

Stage Summary:
- 4 languages fully working: English, Español, Italiano, Français.
- UI chrome translates instantly (no API call). LLM content regenerates on language switch (~15s one-time per country per language, then cached in DB).
- Country names stay in English (proper nouns, universally recognizable). Region headings localized (Europa, Afrique, África…).
- Dates/times locale-aware (lun 24, lun. 24, Mon 24).
- `contentLanguage` tracked per country so we know which language is cached and regenerate only when needed.

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Add an elegant intro/landing home screen as the dashboard's front door.

Work Log:
- Added ~16 intro i18n strings (badge, title1, title2, subtitle, body, CTA, hint, 4 feature title/desc pairs) to all 4 locales (en/es/it/fr) in src/lib/i18n.ts.
- Created `src/components/intro-screen.tsx`: full-screen editorial hero with (a) rotating compass medallion with glow, (b) badge, (c) two-line gradient title, (d) poetic subtitle, (e) 4 frosted-glass feature pills (Live Weather / Exchange Rates / Travel Advisories / AI-Curated), (f) prominent gradient CTA "Begin exploration", (g) "No sign-up · No API keys · 100% free" hint. Floating language + theme controls top-right. Staggered cascade entrance via framer-motion (badge → title → subtitle → features → CTA → hint).
- Updated `src/components/dashboard-app.tsx`: added `entered` state (lazy init from sessionStorage + deep-link detection — no setState-in-effect). Wrapped content in `<AnimatePresence mode="wait">` so intro fades out (0.4s) and dashboard fades in (0.5s) smoothly. NeuralNoise backdrop stays mounted at the root so the shader doesn't restart during the transition.
- Logic: first visit (no `?c=`, no sessionStorage flag) → intro. Click CTA → sessionStorage set + dashboard revealed. Deep-link `?c=FR` → skip intro entirely. New session → intro shows again.
- Browser-verified: intro loads with all content (badge, title, subtitle, 4 features, CTA, hint). Click "Begin exploration" → smooth fade to dashboard (header + selector + empty state). Language switch on intro translates instantly (IT: "Dashboard Viaggi Globale", "Inizia a esplorare"). Deep-link `?c=FR` bypasses intro. Mobile 390px + desktop 1440px verified. Zero console errors.

Stage Summary:
- Elegant editorial intro as the dashboard's front door, matching the amber/rose glass aesthetic.
- 4-language support on the intro itself (user can localise before entering).
- sessionStorage-based gate: shows once per session, deep-links bypass.
- Smooth AnimatePresence transition intro→dashboard, no shader flicker.
- All animations respect prefers-reduced-motion.

---
Task ID: 4
Agent: main (Z.ai Code)
Task: Integrate HeroFuturistic 3D WebGPU animation as the intro's visual centerpiece.

Work Log:
- Installed three@0.185, @react-three/fiber@9, @react-three/drei@10. Verified both external textures (postimg.cc color + depth maps) are reachable (HTTP 200).
- Created `src/components/ui/hero-futuristic.tsx` — adapted the provided component:
  - Props: `titleWords`, `subtitle`, `ctaLabel`, `onEnter` (replaces hardcoded "Build Your Dreams" text).
  - Kept the full 3D pipeline: WebGPU renderer + TSL displacement-mapped plane + dot-grid mask + red scan-line post-processing + bloom.
  - Graceful fallback: `CanvasBoundary` error boundary + `hasWebGPU()` check → if WebGPU unsupported or canvas throws, the 3D layer is silently dropped and the text overlay + CTA still render on the NeuralNoise backdrop.
  - Fixed React 19 lint compliance: TSL uniforms moved to MODULE SCOPE (avoids react-hooks/immutability + react-hooks/refs rules that flag mutating `.value` on hook-derived values); `visible` derived from `useTexture` suspension (no useState/effect); `webgpuOk` + `delays` via lazy useState (no setState-in-effect); deprecated `PostProcessing`→`RenderPipeline` and `renderAsync()`→`render()` with runtime fallback.
- Added CSS animations to globals.css: `.fade-in` (glitch-in: translateY + skewX + blur), `.fade-in-subtitle` (soft fade-up), `.explore-btn` (fixed pill button with delayed fade-in, amber glow on hover, arrow bounce), all respecting `prefers-reduced-motion`.
- Rewrote `src/components/intro-screen.tsx` to use `HeroFuturistic` as the full-screen visual layer, with language/theme toggles floating top-right (z-80). Title = `intro.title1 + intro.title2` split into words for the staggered glitch animation.
- Browser-verified: intro loads with 3D canvas (WebGL2 fallback in headless Chromium — WebGPU detected but falls back gracefully), text animates word-by-word ("GLOBAL TRAVEL DASHBOARD" → "EVERY COUNTRY ON EARTH, IN A SINGLE GLANCE."), "Begin exploration" CTA fades in at 2.2s. Click CTA → smooth fade transition to dashboard. Italian switch works ("DASHBOARD VIAGGI GLOBALE", "Inizia a esplorare"). Mobile 390px verified. Zero real errors (only three.js deprecation warnings from Clock/PostProcessing internals).

Stage Summary:
- Sci-fi 3D hero with displacement-mapped surface + animated red scan-line + bloom as the intro's visual centerpiece.
- Staggered glitch-in text animation (per-word fade + skew + blur).
- "Begin exploration" CTA pill with amber glow hover, wired to reveal dashboard.
- Full graceful degradation: WebGPU unsupported → WebGL2 fallback → error boundary → text-only on NeuralNoise. Text + CTA always functional.
- 4-language support on the intro text (title, subtitle, CTA all localized).
- All animations respect prefers-reduced-motion.

---
Task ID: 4
Agent: dashboard-cards (Z.ai Code)
Task: Create 5 new dashboard card components (Emergency / Safety / Economy / QualityOfLife / Clothing) + add their i18n strings + add them to the dashboard layout. The aggregator already returns `dynamic.economy` (REAL World Bank data) and `country.content` new fields (`emergencyNumbers`, `crimeBrief`, `dangerousAnimals`, `qualityOfLife`, `taxes`, `clothingAdvice`) — surface them in the UI.

Work Log:
- Updated `src/components/dashboard/source-badge.tsx`: added `'world-bank': 'source.worldBank'` to the keyMap (new badge → "world-bank · real").
- Updated `src/lib/i18n.ts`: added 15 new strings × 4 locales (en/es/it/fr) = 60 new translation entries, grouped cleanly after the existing `card.*` block:
  - 5 new card titles (`card.emergency`, `card.safety`, `card.economy`, `card.qualityOfLife`, `card.clothing`).
  - 4 emergency labels + disclaimer (`emergency.police/ambulance/fire/disclaimer`).
  - 5 economy labels + noData (`economy.gdp/gdpPerCapita/inflation/unemployment/noData`).
  - 1 source badge label (`source.worldBank` = "world-bank · real"/"world-bank · réel"/"world-bank · reale"/"world-bank · real").
- Created `src/components/dashboard/emergency-card.tsx`: 3 stat boxes in a row (Police / Ambulance / Fire) — each box: lucide icon (Phone / Heart / Flame) + small uppercase label + big tabular-nums number. Bottom: italic "Verify locally" disclaimer. Source badge "curated". Conditional null-safety on each number (shows "—" if missing).
- Created `src/components/dashboard/safety-card.tsx`: two-section card — (a) `crimeBrief` paragraph (top), (b) `dangerousAnimals` list with `PawPrint` icon bullet + bold name + muted description (bottom, behind a `border-t` divider). Title `ShieldAlert`. Source badge "curated".
- Created `src/components/dashboard/economy-card.tsx`: the ONLY real-data card (World Bank). 4 stat rows: GDP, GDP per capita, Inflation, Unemployment — each with tone-coloured pill (emerald / cyan / amber / rose). Number formatters:
  - `fmtGdp`: `$3.37T` (≥1T), `$X.XB` (≥1B), `$XXXM` (else).
  - `fmtPerCap`: `$XX,XXX` with `toLocaleString('en-US')` thousands separators.
  - `fmtPct`: `X.X%` one-decimal.
  - All return `—` on null input.
  - If `economy` is in error state, renders "Economic data unavailable" message. Source badge "world-bank" → "world-bank · real".
- Created `src/components/dashboard/quality-of-life-card.tsx`: single-paragraph card (mirrors OverviewCard pattern). Icon `HeartPulse`. Source badge "curated".
- Created `src/components/dashboard/clothing-card.tsx`: two-section card — (a) `clothingAdvice` paragraph (top, source "curated"), (b) taxes summary (bottom, behind `border-t` divider, with an inline `SourceBadge source="llm · estimate"` pill next to the section header). Three tone-coloured tax rows (VAT emerald, Corporate amber, Income rose). The `Landmark` icon marks the taxes section. Title `Shirt`.
- Updated `src/components/dashboard/dashboard.tsx`:
  - Added 5 new card imports.
  - Added 2 new staggered grids right after the existing "Food + POI + Price" grid (and before the cache-meta footer):
    1. 3-col grid (lg) with: EmergencyCard, EconomyCard, SafetyCard.
    2. 2-col grid (md) with: QualityOfLifeCard, ClothingCard.
  - Null-safety via optional chaining: `{country.content?.emergencyNumbers ? <EmergencyCard .../> : null}`. TypeScript narrows correctly inside the truthy branch. EconomyCard always renders (its own internal logic handles errors). Each card gracefully skips when its primary field is null.
- Lint: `bun run lint` clean (no errors, no warnings).
- TypeScript: `bunx tsc --noEmit` clean for all 5 new files (pre-existing errors elsewhere — neural-noise WebGL types, polaroid carousel matrix arity, rest-countries — are unrelated to this task).

Backend / runtime verification:
- Discovered the running dev server's Prisma client singleton was stale (didn't know about `emergencyNumbersJson` / `crimeBrief` / `dangerousAnimalsJson` / `qualityOfLife` / `taxesJson` / `clothingAdvice` for the `upsert` write path — the LLM was successfully generating them but the persist call was rejecting them as "Unknown argument"). Fixed by running `bunx prisma generate` (regenerated `@prisma/client` in `node_modules`) and restarting the dev server so the singleton picked up the new client. This is a one-time fix; fresh generations of any country now persist all the new fields correctly.
- Re-verified end-to-end on France (`GET /api/countries/FR?lang=en` after fresh regen):
  - `emergencyNumbers`: `{ police: "17", ambulance: "15", fire: "18", general: "112" }`
  - `crimeBrief`: populated paragraph about pickpocketing / scams / metro hotspots.
  - `dangerousAnimals`: 3 items (Adder, Wild Boar, Brown Bear) with descriptions.
  - `qualityOfLife`: paragraph on healthcare / education / work-life balance.
  - `taxes`: `{ vatRate: "20%", corporateTax: "25%", incomeTax: "0-45% progressive", notes: "..." }`
  - `clothingAdvice`: paragraph on layering + modest attire for religious sites.
  - `economy` (REAL World Bank data): gdpUsd $3.37T, gdpPerCapitaUsd $48,986, inflationRate 0.9%, unemploymentRate 7.5% — matches spec example exactly.

Stage Summary:
- 5 new dashboard cards added with consistent glass-card aesthetic matching the existing weather-card pattern.
- 60 new i18n entries (15 strings × 4 locales).
- The EconomyCard is the only one with REAL data (World Bank) — clearly labelled "world-bank · real". All other new cards use AI-curated content (labelled "curated", with the ClothingCard's taxes sub-section labelled "llm · estimate").
- Number formatting matches spec: GDP $3.37T, GDP/cap $48,986, inflation 0.9%, unemployment 7.5%.
- Null-safety: each card gracefully skips when its primary content field is null; the EconomyCard always renders and degrades to "Economic data unavailable" on API failure.
- Fixed a pre-existing Prisma client staleness bug that was blocking the new fields from being persisted (regenerate + restart). Verified end-to-end on FR.

---
Task ID: 5
Agent: dashboard-cards-extra (Z.ai Code)
Task: Create 4 new dashboard card components (Seismic / Internet / Media / FamousPeople) + add their i18n strings + wire them into the dashboard layout. The aggregator now returns `dynamic.earthquakes` (REAL USGS data) and 4 new `country.content` fields (`internetQuality`, `naturalDisasterRisk`, `tvChannels`, `famousPeople`) — surface them in the UI.

Work Log:
- Updated `src/components/dashboard/source-badge.tsx`: added `usgs: 'source.usgs'` to the keyMap.
- Updated `src/components/language-provider.tsx`: exported `TFn` type (was internal) so the new SeismicCard's `QuakeDataSection` helper can cleanly type the `t` parameter passed down.
- Updated `src/lib/i18n.ts`: added 15 strings × 4 locales = 60 new translation entries, inserted right after `card.clothing`:
  - 4 new card titles (`card.seismic`, `card.internet`, `card.media`, `card.famousPeople`).
  - 5 seismic labels (`seismic.recentCount` with `{n}` interpolation, `seismic.largest`, `seismic.recent`, `seismic.notable`, `seismic.noneActive`).
  - 5 TV type labels (`tv.public`, `tv.private`, `tv.news`, `tv.sports`, `tv.entertainment`).
  - 1 source badge label (`source.usgs` = "usgs · real" / "usgs · réel" / "usgs · reale" / "usgs · real").
- Created `src/components/dashboard/seismic-card.tsx` (MIXED: USGS real + LLM paragraph):
  - Header `Activity` icon (amber-600) + `card.seismic` title. The header `SourceBadge` is "usgs" when earthquakes has data; "curated" when only the risk paragraph is available (earthquakes errored).
  - Top section (USGS data): recentCount line (`seismic.recentCount` with `{n}`), 2-col grid with "Largest recorded" (rose tone) + "Most recent" (amber tone) — each shows `M{magnitude.toFixed(1)}` + place (truncate) + `fmt.dateLong(date)`. Below: "Notable events" list with amber `M{mag}` pill + place + date.
  - When `notableEvents.length === 0`: render the green positive message `seismic.noneActive` with `ShieldCheck` icon (instead of the data section).
  - Bottom section (LLM paragraph): `border-t pt-3` divider + right-aligned `SourceBadge source="curated"` + paragraph.
  - Skips entirely when earthquakes is in error AND `naturalDisasterRisk` is null (returns null).
- Created `src/components/dashboard/internet-card.tsx`: single paragraph card. `Wifi` icon (cyan-600), `card.internet` title, "curated" badge. Skips if `internetQuality` is null.
- Created `src/components/dashboard/media-card.tsx`: TV channels list. `Tv` icon (fuchsia-600), `card.media` title, "curated" badge. Each row: channel name (truncate) + colour-coded `Badge` for type. Type colour map: public=teal, private=violet, news=amber, sports=rose, entertainment=cyan (custom classes via `bg-{color}-500/10 text-{color}-700 dark:text-{color}-300`). Unknown types fall back to muted. List wrapped in `max-h-80 overflow-y-auto scroll-soft`. Skips if channels is null or empty.
- Created `src/components/dashboard/famous-people-card.tsx`: 2-col grid of name (bold) + profession (muted). `Star` icon (amber-500), `card.famousPeople` title, "curated" badge. `grid-cols-1 sm:grid-cols-2` layout; if more than 5 people, wrapped in `max-h-80 overflow-y-auto scroll-soft`. Skips if list is null or empty.
- Updated `src/components/dashboard/dashboard.tsx`: imported 4 new cards, added 1 new staggered grid + 1 full-width card right after the existing Quality/Clothing grid:
  1. `stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3` with: SeismicCard, InternetCard, MediaCard.
  2. FamousPeopleCard full-width (root level, no grid).
  Conditional rendering via optional chaining: SeismicCard renders when earthquakes has data OR `naturalDisasterRisk` is non-null; the other cards render only when their primary content field is truthy.
- Lint: `bun run lint` clean (no errors, no warnings).
- TypeScript: `bunx tsc --noEmit` clean for all 4 new files + dashboard.tsx + source-badge.tsx + language-provider.tsx. No new type errors introduced (pre-existing errors in `advisory-card.tsx`, `weather-card.tsx`, `country-globe.tsx`, `ui/globe.tsx`, `ui/neural-noise.tsx`, `ui/polaroid-line-carousel.tsx`, `aggregate.ts` are unrelated).
- Runtime: bumped the Prisma client (`bunx prisma generate`) so the dev server's SELECT now includes `internetQuality / naturalDisasterRisk / tvChannelsJson / famousPeopleJson` columns. Restarted the dev server to pick up the regenerated client.
- End-to-end verified on FR (deleted cached row → fresh regen):
  - earthquakes (REAL USGS): `recentCount = 0`, `notableEvents = []` → SeismicCard shows green "No significant seismic activity" message.
  - internetQuality: paragraph populated ("Internet is excellent in cities with widespread fiber…").
  - naturalDisasterRisk: paragraph populated ("France faces moderate seismic activity in the southeast…").
  - tvChannels: 5 channels (TF1 private, France 2 public, France 24 news, Canal+ private, M6 private).
  - famousPeople: 5 people (Napoleon/military leader, Marie Curie/scientist, Brigitte Bardot/actress, Jean-Paul Sartre/writer, Zinedine Zidane/footballer).
- End-to-end verified on JP (deleted cached row → fresh regen, took 51s after a JSON-retry):
  - earthquakes (REAL USGS): `recentCount = 50`, `largestMagnitude = 5.8` (M5.8 · "3 km E of Fujishiro, Japan" · Aug 22, 2026), `mostRecent = M4.7 · "6 km ESE of Tōgane, Japan"`, 3 notable events.
  - naturalDisasterRisk: paragraph populated ("Japan sits on the Pacific Ring of Fire…").
  - tvChannels: 5 channels (NHK public, Nippon TV/TBS/Fuji TV/TV Asahi private).
  - famousPeople: 5 people (Akira Kurosawa, Hayao Miyazaki, Yoko Ono, Haruki Murakami, Ryuichi Sakamoto).
- Bundle inspection: client chunk `_next/static/chunks/src_3f72090f._.js` contains all 15 new i18n keys + `source.usgs` + the 4 new card component names.

Stage Summary:
- 4 new dashboard cards added with consistent glass-card aesthetic matching the existing weather-card pattern.
- 60 new i18n entries (15 strings × 4 locales).
- The SeismicCard is the second card with REAL data (USGS, after the EconomyCard's World Bank). Clearly labelled "usgs · real" for the data section, with a separate "curated" badge for the natural-disaster risk paragraph. The SeismicCard is also the only card combining TWO data sources.
- Magnitude formatting matches spec: M5.8, M4.7, M5.0. Dates formatted via `fmt.dateLong()` (locale-aware, e.g. "Aug 22, 2026" in en).
- TV channel type colour-coding matches spec: public=teal, private=violet, news=amber, sports=rose, entertainment=cyan.
- Famous-people card uses a clean 2-column grid layout (not a list), collapsing to 1 column on mobile, with scroll for >5 people.
- Null-safety: each card gracefully skips when its primary content field is null/empty; the SeismicCard is the most defensive (skips when earthquakes errored AND no risk paragraph).
- Regenerated the Prisma client + restarted the dev server so the 4 new content columns are persisted + selected correctly. All cached `CountryContent` rows from before the regen still have NULL new-field values — they'll be regenerated on next `?lang=XX` request if the cached `contentLanguage` differs (or by deleting the row).


---
Task ID: 6
Agent: main (Z.ai Code)
Task: Optimize loading speed — reduce first-visit latency from 30-40s to <6s without sacrificing data precision.

Work Log:
- Identified the bottleneck: the LLM generation (30-40s) blocked the entire API response. All dynamic data (weather, economy, earthquakes, photos) was waiting behind the LLM call.
- Made the aggregator NON-BLOCKING: `loadStatic` now returns immediately with `content: null` + `contentGenerating: true` when LLM content doesn't exist. The LLM generation is triggered fire-and-forget (runs in the background, writes to DB when done).
- Added in-memory lock (`generating` Set) to prevent duplicate generations when multiple requests for the same country arrive simultaneously.
- Added `contentGenerating` flag to the `AggregatedCountry.meta` type.
- Updated `useCountry` hook with auto-refetch: when `contentGenerating === true`, the frontend polls every 8s until the content is ready (then stops).
- Updated `dashboard.tsx` with: (a) "Generating travel brief…" banner with spinner, (b) `ContentSkeleton` component for LLM-dependent cards, (c) conditional rendering that shows real data cards immediately + skeletons for content cards while generating.
- Verified with Agent Browser on Luxembourg (never-visited country):
  - First response: 5.2s (was 30-40s) — 6-8x faster
  - Real data immediately visible: weather (11.7°), economy (GDP), earthquakes (USGS), photos (Wikipedia)
  - "Generating travel brief…" banner + skeleton placeholders for content cards
  - After ~15s: content auto-filled in (Overview, Culture, Food, Emergency, Safety, etc.) — no manual refresh needed
  - Cached (2nd visit): 0.05s (instant)

Stage Summary:
- First-visit latency reduced from 30-40s → 5.2s (6-8x faster, all real data visible immediately)
- LLM content generates in background, fills in automatically after ~15s via auto-refetch
- No data precision sacrificed — all real APIs (World Bank, USGS, Open-Meteo, etc.) still fetched in parallel
- In-memory lock prevents duplicate background generations
- Skeletons + "Generating" banner give clear UX feedback

---
Task ID: 15
Agent: main (Z.ai Code)
Task: Replace the existing CSS-animated `Globe` component on the home/intro screen with the new `GlobeCdn` (cobe-based WebGL globe with CDN markers + arcs + traffic counter).

Work Log:
- Discovered the home screen was using `Globe` from `@/components/ui/globe` — a CSS-based rotating globe (background-position scroll on a flat equirectangular world map). The user wanted this replaced with the new cobe-based 3D globe that has markers, arcs, and a "traffic counter" UI.
- Installed `cobe` package (v2.0.1) — a lightweight WebGL globe library (~30KB, zero deps).
- Created `src/components/ui/cobe-globe-cdn.tsx` with the exact provided code — no modifications. The component:
  - Renders a WebGL globe via `createGlobe` from cobe
  - Has 10 default CDN markers at major world airports (iad, sfo, cdg, hnd, syd, gru, sin, arn, dub, bom)
  - Has 6 arcs connecting them (e.g., iad→cdg, sfo→hnd, cdg→sin)
  - Spinning pyramids above each marker (CSS 3D transform animation)
  - Traffic counter overlay (e.g., "420k req/s") above each arc — updates every 250ms with simulated random fluctuation
  - Drag-to-rotate interaction (pointerdown/move/up with phi/theta offset tracking)
  - Bright white base color, black markers, light cream glow — stands out beautifully against the dark amber NeuralNoise backdrop
  - ResizeObserver + delayed init to handle SSR + dynamic container sizing
  - CSS Anchor Positioning (`positionAnchor: --cobe-${id}`) for the marker/traffic overlays — modern browser feature
- Updated `src/components/intro-screen.tsx`:
  - Replaced `import { Globe } from '@/components/ui/globe'` → `import { GlobeCdn } from '@/components/ui/cobe-globe-cdn'`
  - Replaced `<Globe className="!max-w-none" />` → `<GlobeCdn />`
  - Bumped the container size from `h-48 w-48 sm:h-56 sm:w-56` → `h-64 w-64 sm:h-80 sm:w-80` (the new globe needs more space for the markers + traffic counter overlays to be visible without clipping)
- Updated `src/components/dashboard-app.tsx` EmptyState (the post-intro landing screen shown when no country is selected):
  - Same swap: `Globe` → `GlobeCdn`, same size bump
- Also noticed during this work that `AirplaneCursor` import was missing from `dashboard-app.tsx` (filesystem sync issue — the file had been lost between sessions). Re-added both `import { AirplaneCursor } from '@/components/ui/airplane-cursor'` AND `<AirplaneCursor />` at the root level (alongside NeuralNoise) — and recreated the missing `airplane-cursor.tsx` file with the full final optimized version (43px, position in pointermove, rAF pauses after 200ms idle).
- Lint: `bun run lint` clean (no errors, no warnings).
- VLM (z-ai vision) verification on the home screen: "3D globe visible with visible continents (North and South America), markers shaped like pyramids, and arcs connecting the cities. The design is bright and detailed, using a clean white and dotted aesthetic against a soft background."

Stage Summary:
- The home/intro screen now shows the new cobe-based 3D globe with CDN markers (10 airports), 6 arcs between them, spinning pyramids above each marker, and a live-updating traffic counter ("Xk req/s") above each arc.
- The previous CSS-animated flat equirectangular-projection globe has been completely replaced.
- The new globe uses WebGL (cobe) for a true 3D rotating sphere with realistic lighting (diffuse: 1.5, dark: 0 = bright mode).
- Bright white base + black markers + light cream glow stands out beautifully against the dark amber NeuralNoise backdrop.
- Drag interaction preserved — user can spin the globe manually.
- Airplane cursor restored (was missing from filesystem).
- Lint clean, no console errors, VLM-verified rendering.
