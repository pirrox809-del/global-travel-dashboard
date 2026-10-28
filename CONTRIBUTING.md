# Contributing to Global Travel Dashboard

First of all — **thank you**! 🌍 This project started as a fun way to learn web development, and every kind of contribution makes it better.

## Ways to help

- 🐛 **Bug reports** — open an issue using the bug template
- 💡 **Feature ideas** — open an issue using the feature template
- 🌐 **Translations** — the UI ships in EN / ES / IT / FR; new locales are welcome
- 🔧 **Code** — pick an open issue (look for `good first issue`), comment that you're on it, and open a pull request

## Running locally

See the [README quick start](README.md#running-locally) — it's four commands with [Bun](https://bun.sh) (or npm):

```bash
bun install
cp .env.example .env
bun run db:generate
bun run dev
```

The SQLite database (`db/custom.db`) ships pre-populated, so the site works immediately without an LLM key. Adding `ZAI_BASE_URL` + `ZAI_API_KEY` enables the AI chat.

## Ground rules

- **TypeScript strict** — no `any` escapes unless there's a very good reason
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `chore:`… (e.g. `fix(data): correct inverted exchange-rate conversion`)
- Run `bun run lint` before opening a PR
- Keep PRs small: one feature or one fix per PR
- Be kind. Everyone was a beginner once.

## Project map

| Path | What lives there |
|---|---|
| `src/app/api/` | API routes (aggregate endpoint, cron refresh, chat) |
| `src/components/dashboard/` | Country dashboard sections |
| `src/components/playground/` | Globe quiz + country duel |
| `src/lib/external/` | External API clients (weather, FX, advisories…) |
| `src/lib/aggregate.ts` | The "one endpoint" that assembles a country page |
| `db/custom.db` | Pre-populated SQLite (250/250 AI briefs) |
| `scripts/` | Maintenance scripts (brief pre-generation…) |

## A note on the cron loop

The daily Vercel Cron refreshes the oldest AI briefs and commits the updated SQLite file straight back to this repository — that's why you'll see `chore(data): … [cron]` commits appear on their own. Please don't fight them; they're the site's immune system. 🙂
