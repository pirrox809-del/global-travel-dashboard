# Global Travel Dashboard

Dashboard che aggrega, per ciascuno dei 189 paesi del mondo, dati statici (cultura, cibo, POI, usanze, stime di prezzo) generati via LLM e dati dinamici live (meteo, cambi valuta, travel advisory).

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite
- **State**: TanStack Query (server), Zustand (client), Framer Motion (animazioni)
- **i18n**: 4 lingue (EN/ES/IT/FR), sistema custom context-based
- **AI**: z-ai-web-dev-sdk (LLM per contenuti curati)

## API esterne (tutte gratuite, no API key)

| Dato | Fonte | Note |
|---|---|---|
| Metadati paese (250 paesi) | `mledoze/countries` (GitHub) | Nome, capitale, lingue, valute, coordinate, bandiera |
| Meteo live | Open-Meteo | Condizioni attuali + 7 giorni, 10k chiamate/giorno |
| Cambi valuta | Frankfurter (BCE) | Tassi di riferimento ECB, refresh giornaliero |
| Travel advisory | US State Dept | Livello 1-4 per ~200 paesi |
| Bandiere | flagcdn.com | SVG per-country |
| Contenuti curati | z-ai-web-dev-sdk LLM | Generati una volta, persistiti in DB |

## Setup

```bash
# 1. Installa dipendenze
bun install

# 2. Crea il file .env
echo 'DATABASE_URL="file:./db/custom.db"' > .env

# 3. Pusha lo schema Prisma
bun run db:push

# 4. Avvia il dev server
bun run dev
```

Apri http://localhost:3000 — il primo avvio popola il DB con 250 paesi dalla fonte GitHub (~2 secondi).

## Architettura

```
prisma/schema.prisma                 # Country + CountryContent + Food + POI + TravelPriceEstimate
src/lib/
  ├─ cache.ts                        # Cache in-memory TTL+LRU (mimica Redis, swappable)
  ├─ types.ts                        # Tipi condivisi frontend/backend
  ├─ aggregate.ts                    # L'AGGREGATOR: Promise.allSettled su DB + 3 API
  └─ external/
      ├─ rest-countries.ts           # Sync 250 paesi → DB
      ├─ open-meteo.ts                # Meteo live (TTL 20min)
      ├─ frankfurter.ts               # Cambi BCE (TTL 6h)
      ├─ travel-advisory.ts           # US State Dept (TTL 12h)
      └─ llm-content.ts               # Generatore LLM + persistenza DB
src/app/api/countries/
  ├─ route.ts                        # GET /api/countries → lista
  └─ [code]/route.ts                 # GET /api/countries/[code]?lang=XX → aggregator
src/components/
  ├─ dashboard-app.tsx               # Shell: intro gate + header + selector + footer
  ├─ intro-screen.tsx                # Landing hero (compass + features + CTA)
  ├─ country-selector.tsx            # Combobox searchable, raggruppato per regione
  ├─ language-provider.tsx            # Context i18n + useT() hook
  ├─ language-switcher.tsx           # Switcher 4 lingue
  ├─ theme-toggle.tsx                # Dark/light
  ├─ ui/neural-noise.tsx             # Sfondo WebGL shader animato
  └─ dashboard/                      # Hero + 9 card + skeleton
      ├─ hero.tsx                     # Bandiera + tagline + metadata chips
      ├─ weather-card.tsx             # Meteo + sparkline 24h + forecast 7gg
      ├─ exchange-card.tsx            # Cambio ECB
      ├─ advisory-card.tsx            # Advisory (live / AI fallback / error)
      ├─ overview-card.tsx            # Paragrafo LLM
      ├─ culture-card.tsx             # Cultura + regole non scritte
      ├─ food-card.tsx                # Piatti tipici
      ├─ poi-card.tsx                 # Luoghi da visitare
      ├─ price-card.tsx               # Stime hotel/voli/pasti
      ├─ source-badge.tsx             # Badge fonte dati
      └─ skeletons.tsx                # Loading states
src/lib/i18n.ts                      # Dizionario 4 lingue (~90 stringhe per locale)
src/hooks/use-country.ts             # TanStack Query hooks (lista + dettaglio)
```

## Caching

**Due strati:**
1. **In-memory TTL** (cache.ts): meteo 20min, cambi 6h, advisory 12h, lista paesi 24h
2. **DB permanente**: contenuti LLM generati una volta, poi letture pure dal DB

Prima chiamata a un paese: ~15-30s (generazione LLM). Seconda chiamata: ~0.04s (750x più veloce, solo DB + cache).

## Graceful degradation

Ogni fonte esterna è wrappata in `Promise.allSettled`. Se Open-Meteo è down, cambi e advisory funzionano comunque. Se l'advisory live non è raggiungibile, fallback su "AI Safety Brief" (etichettato). Se una valuta non è nei tassi BCE (es. EGP), la card mostra "not on ECB list".

## Licenza

Tutte le API usate sono gratuite. I contenuti LLM sono generati on-demand. Nessuna API key richiesta.
