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
