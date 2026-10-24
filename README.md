# Global Travel Dashboard

A travel dashboard for 189 countries. Live weather, exchange rates, travel advisories, earthquakes and economic data on one page, next to a short AI-written brief — overview, culture, food, places, prices — generated the first time you open a country and stored in the database after that.

**[Live demo](https://global-travel-dashboard.vercel.app)** · [MIT license](LICENSE)

![Global Travel Dashboard](docs/screenshots/02-globe.png)

## What it does

- Pick a country by search, or spin the 3D globe
- Live data for the selection: weather with 7-day forecast (Open-Meteo), ECB exchange rates (Frankfurter), US State Department advisory levels, recent earthquakes (USGS), World Bank GDP figures, Wikipedia photos, local clock
- An LLM writes the slow-moving parts — country overview, culture, unwritten rules, safety notes, typical food, places worth visiting, hotel and flight price estimates. Written once, persisted afterwards, so it loads instantly on every later visit
- UI in English, Spanish, Italian and French; other locales can be translated on the fly by the same LLM and cached
- Light and dark theme, responsive layout, voice input for the AI chat

## Data sources

| Category | Source | Updated |
|---|---|---|
| Weather + 7-day forecast | Open-Meteo (fallback wttr.in) | Real-time |
| Exchange rates | Frankfurter / ECB | Daily |
| Travel advisories (levels 1–4) | US State Dept | Daily |
| GDP, GDP per capita | World Bank | Annual |
| Earthquakes | USGS | Real-time |
| Photos | Wikipedia | Stable |
| Local time | IANA tz database | Real-time |
| Briefs, food, places, prices | LLM, generated once and persisted | First visit |

## Screenshots

![Country view — Japan](docs/screenshots/03-country.png)

![Live data cards](docs/screenshots/04-live-data.png)

![Dark mode](docs/screenshots/05-dark.png)

## Running locally

```bash
git clone https://github.com/pirrox809-del/global-travel-dashboard.git
cd global-travel-dashboard
bun install            # or npm install
cp .env.example .env
bun run db:generate    # the SQLite DB is pre-populated, no seed needed
bun run dev            # http://localhost:3000
```

Next.js 16 (App Router), TypeScript 5, Tailwind CSS 4, shadcn/ui, Prisma + SQLite, Framer Motion, react-globe.gl/cobe.

## Deploying

Vercel works without configuration: import the repository and deploy. The pre-populated SQLite database ships inside the serverless function and is copied to a writable path at runtime, so the API answers from the first request.

Two things worth knowing:

- The AI generator reads credentials from `.z-ai-config` (any OpenAI-compatible endpoint). Without credentials nothing breaks — live data and pre-generated briefs keep working, only new generation is skipped.
- On serverless, writes are per-instance and ephemeral. If you want generated briefs to survive restarts, host on Railway or Render with a persistent disk and set `DATABASE_URL=file:/data/custom.db`.

## Project structure

```
src/
├── app/                  # App Router: page, layout, API routes
│   └── api/countries/    # Countries aggregation endpoint
├── components/
│   ├── ui/               # shadcn/ui + custom (globe, cursor, animations)
│   └── dashboard/        # Dashboard sections (weather, economy, culture…)
├── lib/
│   ├── external/         # External API clients (World Bank, USGS, Open-Meteo…)
│   ├── cache.ts          # In-memory cache with TTL
│   ├── db.ts             # Prisma client + serverless-aware DB resolution
│   └── i18n.ts           # UI translations (EN/ES/IT/FR)
└── prisma/schema.prisma  # Data model
db/custom.db              # Pre-populated SQLite database
```

## Credits

[mledoze/countries](https://github.com/mledoze/countries) · [Open-Meteo](https://open-meteo.com) · [Frankfurter](https://frankfurter.dev) · [US State Dept](https://travel.state.gov) · [World Bank](https://data.worldbank.org) · [USGS](https://earthquake.usgs.gov) · [Wikipedia](https://wikipedia.org) · [shadcn/ui](https://ui.shadcn.com)

Each data source remains subject to its own terms of use.

## License

[MIT](LICENSE)

---

<details>
<summary><b>Documentazione in italiano</b></summary>

### Global Travel Dashboard

Dashboard di viaggio per 189 paesi: meteo live, tassi di cambio, avvisi di viaggio, terremoti e dati economici in una sola pagina, insieme a una breve guida scritta dall'AI — panoramica, cultura, cibo, luoghi, prezzi — generata al primo accesso e salvata nel database.

**[Demo live](https://global-travel-dashboard.vercel.app)** — senza registrazione né configurazione.

### Fonti dei dati

| Categoria | Fonte | Aggiornamento |
|---|---|---|
| Meteo + previsioni 7 giorni | Open-Meteo (fallback wttr.in) | Tempo reale |
| Tassi di cambio | Frankfurter / BCE | Quotidiano |
| Avvisi di viaggio (livelli 1–4) | US State Dept | Quotidiano |
| PIL, PIL pro capite | World Bank | Annuale |
| Terremoti | USGS | Tempo reale |
| Foto | Wikipedia | Stabile |
| Ora locale | IANA tz database | Tempo reale |
| Brief, cibo, luoghi, prezzi | LLM, generato una volta e persistito | Primo accesso |

### Avvio locale

```bash
git clone https://github.com/pirrox809-del/global-travel-dashboard.git
cd global-travel-dashboard
bun install            # oppure npm install
cp .env.example .env
bun run db:generate    # il DB SQLite è già pre-popolato
bun run dev            # http://localhost:3000
```

### Pubblicazione

Su Vercel funziona senza alcuna configurazione: importa la repository e fai deploy. Il database SQLite pre-popolato viene incluso nella funzione serverless e copiato in un percorso scrivibile all'avvio, quindi l'API risponde già alla prima richiesta.

Due cose da sapere:

- Il generatore AI legge le credenziali da `.z-ai-config` (qualsiasi endpoint OpenAI-compatibile). Senza credenziali nulla si rompe: i dati live e i brief pre-generati continuano a funzionare, viene saltata solo la generazione di nuovi contenuti.
- Su serverless le scritture sono per-istanza ed effimere. Per conservare i brief generati, usa Railway o Render con disco persistente e `DATABASE_URL=file:/data/custom.db`.

</details>
