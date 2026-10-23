# 🌍 Global Travel Dashboard

Ogni paese, una pagina. Dashboard completa per **189+ paesi** con dati ufficiali in tempo reale e contenuti di viaggio curati.

> **Demo locale** — progetto sviluppato con Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui e Prisma (SQLite).

## ✨ Cosa contiene ogni dashboard

| Categoria | Fonte | Aggiornamento |
|---|---|---|
| 🌦️ Meteo live + previsioni 7 giorni | Open-Meteo (fallback wttr.in) | Tempo reale |
| 💱 Tassi di cambio | Frankfurter · BCE | Quotidiano |
| 🚨 Avvisi di viaggio (livelli 1–4) | US State Dept | Quotidiano |
| 💰 Economia (PIL, PIL pro capite) | World Bank | Annuale (ultimo anno disponibile) |
| 🌍 Terremoti recenti | USGS | Tempo reale |
| 📷 Foto autentiche | Wikipedia | Stabile |
| 🕐 Ora locale con secondi | IANA tz database | Tempo reale |
| 📝 Panoramica, cultura, regole non scritte, sicurezza | LLM (generato al primo accesso, poi persistito) | Una tantum |
| 🍝 Cibi tipici, luoghi da visitare, stime prezzi | LLM + normalizzazione DB | Una tantum |
| 👥 Personaggi famosi, canali TV, qualità internet | LLM | Una tantum |

## 🛠️ Stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + Lucide icons
- **Prisma ORM** + SQLite
- **Framer Motion** (transizioni, animazione titolo "shutter")
- react-globe.gl / cobe (globo 3D interattivo)

## 🚀 Avvio locale

```bash
# 1. Clona e installa
git clone https://github.com/<TUO-UTENTE>/global-travel-dashboard.git
cd global-travel-dashboard
bun install        # oppure: npm install

# 2. Configura l'ambiente
cp .env.example .env

# 3. Crea/aggiorna il database (già pre-popolato con 250 paesi)
bun run db:generate
bun run db:push

# 4. Avvia
bun run dev        # http://localhost:3000
```

## ☁️ Pubblicazione online

Il sito **non è un file HTML statico**: è un'app full-stack (frontend + API routes + database), quindi serve un hosting per applicazioni — GitHub per il codice, la piattaforma di hosting per il sito.

### 1) Carica il codice su GitHub

```bash
git remote add origin https://github.com/<TUO-UTENTE>/global-travel-dashboard.git
git push -u origin main
```

> Crea prima il repository vuoto su https://github.com/new (senza README iniziale).

### 2) Scegli l'hosting

#### Opzione A — Vercel (la più semplice per Next.js)

1. Vai su https://vercel.com → **Add New → Project** → importa il repo GitHub.
2. Vercel rileva Next.js automaticamente → **Deploy**.
3. ⚠️ **Importante — database**: il filesystem di Vercel è *read-only*, quindi SQLite non può scrivere. Due strade:
   - **Turso (consigliato, gratuito)**: crea un DB su https://turso.tech, cambia `provider = "turso"` in `prisma/schema.prisma`, imposta `DATABASE_URL` e `DATABASE_AUTH_TOKEN` nelle variabili d'ambiente Vercel. Migrazione dei dati: `turso db shell` o script di seed.
   - **Workaround rapido**: copiare il DB in `/tmp` all'avvio (funziona in sola lettura sui contenuti già generati).
4. ⚠️ **Contenuti LLM**: la generazione testuale usa `z-ai-web-dev-sdk`, che legge le credenziali da un file `.z-ai-config` (`{"baseUrl": "...", "apiKey": "..."}`). Su Vercel puoi includerla come variabile d'ambiente o passare a un endpoint OpenAI-compatibile tuo. Senza credenziali, tutte le sezioni con **dati live continuano a funzionare**; solo i testi LLM non si rigenerano (quelli pre-generati nel DB restano visibili).

#### Opzione B — Railway / Render (Zero modifiche al codice)

Questi host offrono un **filesystem persistente** (o disco montabile): SQLite funziona così com'è.

1. **Railway**: https://railway.com → New Project → Deploy from GitHub.
   - Comandi: `bun run db:generate && bun run build` (build), `bun run start` (avvio).
   - Monta un Volume su `/data` e imposta `DATABASE_URL=file:/data/custom.db`.
2. **Render**: https://render.com → New Web Service (runtime Bun/Node), disco persistente opzionale.

### Riepilogo cosa funziona dove

| Funzionalità | Vercel | Railway/Render (volume) |
|---|---|---|
| Frontend + UI + globo 3D | ✅ | ✅ |
| Meteo / cambi / advisory / terremoti / PIL / foto (API pubbliche) | ✅ | ✅ |
| Lettura contenuti dal DB pre-popolato | ⚠️ (via /tmp o Turso) | ✅ |
| Generazione nuovi contenuti LLM | ⚠️ serve `.z-ai-config`/API key | ⚠️ serve `.z-ai-config`/API key |

## 📁 Struttura del progetto

```
src/
├── app/                  # App Router: page.tsx, layout, API routes
│   └── api/countries/    # Endpoint aggregazione dati per paese
├── components/
│   ├── ui/               # Componenti shadcn/ui + custom (globi, cursore, animazioni)
│   └── dashboard/        # Sezioni dashboard (meteo, economia, cultura…)
├── lib/
│   ├── external/         # Client API esterne (World Bank, USGS, Open-Meteo…)
│   ├── cache.ts          # Cache in memoria con TTL
│   └── i18n.ts           # Traduzioni (EN/ES/IT/FR)
└── prisma/schema.prisma  # Modello dati
db/custom.db              # Database SQLite pre-popolato
```

## 📄 Licenza

Uso personale/dimostrativo. I dati provengono da API pubbliche citate nella sezione tabella (ringraziamenti a Open-Meteo, Frankfurter/ECB, USGS, World Bank, US State Dept, Wikipedia, mledoze/countries).
