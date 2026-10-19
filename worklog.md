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

---
Task ID: 16
Agent: main (Z.ai Code)
Task: Add the InteractiveGlobeExplorer's globe animation to the middle of each country's dashboard, showing only the country's location as a pulsing/blinking amber dot — no other info, no list, no tooltip. Don't touch the home screen or language/theme functions.

Work Log:
- Discovered that the existing `country-globe-explorer.tsx` file was MISSING from the filesystem (same filesystem sync issue that previously lost airplane-cursor.tsx). The dashboard.tsx no longer imported any globe component, so the dashboard had no globe at all. This means the task is to ADD a new globe, not modify an existing one.
- Verified the InteractiveGlobeExplorer's texture URL (`https://cdn.21st.dev/assets/localized/228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01.jpg`) works and is actually a mirror of the NASA Blue Marble texture (same MD5 hash `8ec81bb437b68fdb4bd46604ff698736` as `https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg`).

Files created/modified:
1. **`src/components/ui/interactive-globe-explorer.tsx`** — copied the provided component verbatim (no modifications). This is the full version with the scrolling city list, tooltip, copy-to-clipboard buttons. Kept in the UI library for future use, but NOT used in the dashboard per the user's "e basta, non aggiungere informazioni e nient'altro" requirement.
2. **`src/components/dashboard/country-location-globe.tsx`** (NEW) — a simplified version of the InteractiveGlobeExplorer that shows ONLY:
   - The 3D globe (react-globe.gl) with the InteractiveGlobeExplorer's blue-marble texture URL
   - ONE static amber marker dot at the country's lat/lng (`#f59e0b`)
   - ONE pulsing amber ring at the country's lat/lng (`#fbbf24`) — this is the "blinking dot" effect. Ring expands outward with `propagationSpeed: 2.5`, repeating every 1100ms.
   - Amber atmosphere halo (matches dashboard accent)
   - Same 3-light bright lighting setup from Task 10 (AmbientLight 1.2 + DirectionalLight 1.5 + warm fill 0.6)
   - IntersectionObserver pauses the globe's internal rAF when scrolled offscreen (saves ~16ms/frame when the user is at the top/bottom of the dashboard)
   - `visibilitychange` listener pauses the globe when the tab is hidden
   - Auto-rotates at speed 0.35, centered on the country's coordinates
3. **`src/components/dashboard/dashboard.tsx`** — added `import { CountryLocationGlobe } from './country-location-globe'` and inserted the component between the Food/POI/Price section and the Emergency/Economy/Safety section. This positions the globe around the MIDDLE of each country's dashboard, as the user requested ("circa a meta").
4. Installed `react-globe.gl@2.38.0` (was missing from node_modules — had to reinstall).

Verification:
- Lint: clean (no errors, no warnings).
- 🇫🇷 France dashboard: VLM confirmed "3D globe visible with a pulsing, amber-colored marker dot. The dot appears to be located over the continent of Europe, specifically near France." ✓
- 🇯🇵 Japan dashboard: VLM confirmed "3D globe with a pulsing amber marker dot. The dot is located in East Asia, specifically on the island of Japan near Tokyo." ✓
- 🏠 Home screen: VLM confirmed it still has the cobe CDN globe with pyramid markers (iad1, arn1, gru1, sf01) and arcs — NOT touched, as the user requested.
- The country marker correctly tracks the country's lat/lng coordinates (verified on 2 different countries in 2 different continents — Europe for France, East Asia for Japan).

Stage Summary:
- Every country's dashboard now shows a 3D globe around the middle, with a pulsing/blinking amber marker dot at the country's exact location.
- The globe uses the InteractiveGlobeExplorer's texture URL (blue-marble, mirrored on cdn.21st.dev).
- The "blinking" effect is implemented via react-globe.gl's `ringsData` API (an expanding ring that repeats every 1100ms — looks like a radar blip).
- NO other UI added (no list, no tooltip, no copy buttons) — just the globe + the blinking dot, as the user explicitly requested ("e basta, non aggiungere informazioni e nient'altro").
- Home screen and language/theme switchers NOT touched (verified by VLM).
- The full InteractiveGlobeExplorer component was copied to `/components/ui/` as instructed by the task, for future use.

---
Task ID: 17
Agent: main (Z.ai Code)
Task: Add a mini search bar at the beginning of each country's dashboard so users can find a category instantly (e.g. type "weather" and jump to the Weather section) instead of scrolling.

Work Log:
- Discovered that the `dashboard-search.tsx` file AND the import in dashboard.tsx were both MISSING from the filesystem (same filesystem sync issue that previously lost airplane-cursor.tsx, country-globe-explorer.tsx). Also the `data-card="..."` attributes that the previous DashboardSearch relied on were not present in the current dashboard.tsx — so I had to add them all back too.

Files created/modified:
1. **`src/components/dashboard/dashboard.tsx`** — added `data-card="..."` attributes to ALL 19 sections so the search component can find them via `document.querySelector('[data-card="..."]')`. The sections are: photos, weather, exchange, advisory, overview, culture, food, globe, emergency, economy, safety, qualityOfLife, clothing, seismic, internet, media, famousPeople. (Food's inner 3-col grid had FoodCard + PoiCard + PriceCard but no separate data-cards — kept as a single "food" wrapper since the user can search "food" / "poi" / "price" / "cost" / "budget" and jump to the same section.)
2. **`src/components/dashboard/dashboard-search.tsx`** (NEW) — the mini search bar component:
   - 28px-tall input with magnifying-glass icon on the left, clear (X) button on the right when there's a query
   - Filters 19 categories by their localized label AND extra keywords (e.g., typing "GDP" matches "Economy", typing "112"/"911" matches "Emergency Numbers", typing "wifi" matches "Internet", typing "where"/"map" matches "Location on Globe")
   - Dropdown shows matching categories as clickable buttons with an arrow-down icon on the right
   - Clicking a result smooth-scrolls to that section with a 140px top offset (so the sticky header + country selector + this search bar don't cover the target section)
   - Briefly highlights the target section with an amber ring (1.5s) so the user sees what was found
   - Keyboard navigation: ArrowUp/Down to move the highlight, Enter to select, Escape to close
   - Closes the dropdown when clicking outside (mousedown listener)
   - "No categories found" message when the query doesn't match anything
   - Sticky positioning at `top-[108px]` so the bar stays accessible while scrolling through the long dashboard (under the 56px header + 52px country selector bar)
3. **`src/components/dashboard/dashboard.tsx`** — added `import { DashboardSearch }` and rendered it right after `<CountryHero>` inside a `sticky top-[108px] z-30` wrapper.
4. **`src/lib/i18n.ts`** — added 23 new keys × 4 locales = 92 new i18n entries: `search.placeholder`, `search.ariaLabel`, `search.clear`, `search.noResults`, and 19 `search.cat.*` keys (one per category). All localized for en, es, it, fr.
5. Lint fix: initial implementation had `useEffect(() => setHighlightIndex(0), [query])` which triggered the `react-hooks/set-state-in-effect` lint rule. Moved the highlight reset to the `onChange` handler of the input instead (cleaner — no effect, no extra render).

Verification with Agent Browser (3 tests):
1. **Typing "emer"** → dropdown shows "Emergency Numbers" button → click → smooth-scroll from scrollY=341 to scrollY=2926, Emergency card now at rect.top=140 (just under the sticky header). ✓
2. **Typing "wea"** → dropdown shows "Weather" button → click (from scrollY=0) → smooth-scroll to scrollY=983, Weather card at rect.top=140. ✓
3. **Keyboard navigation**: typed "food" → pressed ArrowDown once (highlighted "Food") → pressed Enter → smooth-scroll to scrollY=2048, Food card at rect.top=140. ✓

Home screen intact (verified by VLM): "Yes, this is the home/intro screen featuring a 3D globe with CDN markers (pyramids) and a 'Begin exploration' button." — NOT touched.

Stage Summary:
- Every country's dashboard now has a mini search bar at the top (sticky under the header + country selector bar).
- Users can type any category name (or related keyword like "GDP", "wifi", "112", "where") and click/Enter to jump straight to that section — no manual scrolling needed.
- The target section is briefly highlighted with an amber ring so the user sees what was found.
- 19 categories are searchable, all with localized labels in en/es/it/fr.
- Keyboard navigation (ArrowUp/Down + Enter + Escape) works for accessibility.
- Home screen, language switcher, dark/light mode toggle NOT touched (verified by VLM).
- Lint clean, no console errors.
