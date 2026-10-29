/**
 * passport.ts — tiny localStorage helpers for the "Play & explore" games.
 *
 * Everything here is 100% client-side and offline-safe: no network, no
 * APIs, no external data. Visited-country stamps and daily-challenge
 * results live in the browser only (localStorage), with graceful
 * degradation in private mode / SSR (all reads return empty defaults).
 *
 * Keys (one namespace, easy to reset):
 *   gtd.passport.visits   → { [countryCode]: ISO date of first visit }
 *   gtd.daily.<dayIndex>  → { score, grid } result of that day's challenge
 *   gtd.daily.streak      → { last: dayIndex, count: n }
 */

const VISITS_KEY = 'gtd.passport.visits';
const STREAK_KEY = 'gtd.daily.streak';

/** UTC day index — the same one the daily-challenge API uses. */
export function todayIndex(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — ignore, games still work this session */
  }
}

/* ----------------------------- Passport ----------------------------- */

export function getVisits(): Record<string, string> {
  try {
    return JSON.parse(safeGet(VISITS_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Stamp the passport — first visit only keeps the earliest date. */
export function recordVisit(code: string): void {
  if (!code) return;
  const visits = getVisits();
  const key = code.toUpperCase();
  if (visits[key]) return;
  visits[key] = new Date().toISOString();
  safeSet(VISITS_KEY, JSON.stringify(visits));
}

/* -------------------------- Daily challenge -------------------------- */

export interface DailyResult {
  /** 1..5 hints used on a win, 0 on a loss. */
  score: number;
  /** One emoji per attempt: 🟩 win, 🟥 wrong, ⬜ unused. */
  grid: string;
  won: boolean;
}

export function getDailyResult(day: number): DailyResult | null {
  try {
    const raw = safeGet(`gtd.daily.${day}`);
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

export function setDailyResult(day: number, result: DailyResult): void {
  safeSet(`gtd.daily.${day}`, JSON.stringify(result));
  const streak = getStreak();
  const count = streak.last === day - 1 || streak.last === day ? streak.count + 1 : 1;
  safeSet(STREAK_KEY, JSON.stringify({ last: day, count }));
}

export function getStreak(): { last: number; count: number } {
  try {
    return JSON.parse(safeGet(STREAK_KEY) ?? '{"last":0,"count":0}') as { last: number; count: number };
  } catch {
    return { last: 0, count: 0 };
  }
}

/** ms until the next UTC day — for the "new challenge in…" countdown. */
export function msUntilNextDay(): number {
  const now = Date.now();
  return 86_400_000 - (now % 86_400_000);
}
