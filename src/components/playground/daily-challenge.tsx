'use client';

/**
 * DailyChallenge — "Globe Daily": one mystery country per day, same for
 * every visitor worldwide (deterministic from the UTC date, server-side).
 *
 * 5 progressive hints (region → population → currency → language →
 * capital), 4 options per attempt. Everything shown comes from the static
 * country database — no live APIs, no LLM, nothing that can go stale.
 *
 * Result + streak are stored client-side (localStorage). The share box
 * produces a Wordle-style emoji grid ready to paste anywhere.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/language-provider';
import { getDailyResult, getStreak, msUntilNextDay, setDailyResult, todayIndex, type DailyResult } from '@/lib/passport';

type Option = { code: string; name: string; flagEmoji: string | null };
type Hint =
  | { kind: 'region'; region: string; subregion: string }
  | { kind: 'population'; bracket: string }
  | { kind: 'currency'; name: string; symbol: string }
  | { kind: 'language'; name: string; count: number }
  | { kind: 'capital'; capital: string; initial: string };
type Reveal = { code: string; name: string; flagEmoji: string | null; capital: string | null; region: string | null };

interface StartResponse {
  day: number;
  maxAttempts: number;
  attempts: number;
  hint: Hint | null;
  options: Option[] | null;
  over: boolean;
}
interface GuessResponse {
  correct: boolean;
  attempts: number;
  over: boolean;
  hint: Hint | null;
  options: Option[] | null;
  score?: number;
  reveal?: Reveal;
}

const MAX_ATTEMPTS = 5;

export function DailyChallenge({ onVisit }: { onVisit?: (code: string) => void }) {
  const t = useT();
  const day = todayIndex();

  const [state, setState] = React.useState<
    | { phase: 'loading' }
    | { phase: 'playing'; attempts: number; hint: Hint | null; options: Option[] | null; wrong: string[] }
    | { phase: 'done'; result: DailyResult; reveal: Reveal | null }
  >({ phase: 'loading' });
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const saved = getDailyResult(day);

  // Start (or restore) the challenge.
  React.useEffect(() => {
    if (saved) {
      setState({ phase: 'done', result: saved, reveal: null });
      return;
    }
    let alive = true;
    fetch('/api/daily-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
      .then((r) => r.json() as Promise<StartResponse>)
      .then((j) => {
        if (!alive) return;
        setState({ phase: 'playing', attempts: j.attempts, hint: j.hint, options: j.options, wrong: [] });
      })
      .catch(() => alive && setError('network'));
    return () => {
      alive = false;
    };
  }, []);

  const guess = (code: string) => {
    const s = state;
    if (s.phase !== 'playing') return;
    fetch('/api/daily-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'guess', guess: code, attempts: s.attempts }),
    })
      .then((r) => r.json() as Promise<GuessResponse>)
      .then((j) => {
        if (j.correct) {
          const grid = buildGrid(s.attempts, MAX_ATTEMPTS, true);
          const result: DailyResult = { score: j.score ?? s.attempts + 1, grid, won: true };
          setDailyResult(day, result);
          setState({ phase: 'done', result, reveal: j.reveal ?? null });
        } else {
          const wrong = [...s.wrong, code];
          if (j.over) {
            const grid = buildGrid(0, MAX_ATTEMPTS, false);
            const result: DailyResult = { score: 0, grid, won: false };
            setDailyResult(day, result);
            setState({ phase: 'done', result, reveal: j.reveal ?? null });
          } else {
            setState({ phase: 'playing', attempts: j.attempts, hint: j.hint, options: j.options, wrong });
          }
        }
      })
      .catch(() => setError('network'));
  };

  const share = () => {
    if (state.phase !== 'done') return;
    const text = `🌍 Globe Daily #${day} — ${state.result.won ? `${state.result.score}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`}\n${state.result.grid}\nglobal-travel-dashboard.vercel.app`;
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  /* ---------------------------- already played ---------------------------- */
  if (state.phase === 'done' && state.result) {
    const streak = getStreak();
    const hours = Math.floor(msUntilNextDay() / 3_600_000);
    const minutes = Math.floor((msUntilNextDay() % 3_600_000) / 60_000);
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <p className="text-4xl">{state.result.won ? '🏆' : '🎯'}</p>
        <p className="text-sm font-medium">{t('daily.playedTitle')}</p>
        <div data-grid className="text-2xl tracking-widest">{state.result.grid}</div>
        <p className="text-xs text-muted-foreground">
          {state.result.won ? t('daily.won', { score: state.result.score, max: MAX_ATTEMPTS }) : t('daily.lost')}
          {' · '}
          {t('daily.streak', { count: streak.count })}
        </p>
        {state.reveal ? (
          <p className="text-sm">
            {state.reveal.flagEmoji} <span className="font-semibold">{state.reveal.name}</span>
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={share} className="gap-1.5">
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            {copied ? t('common.copied') : t('daily.share')}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('daily.backTomorrow', { time: `${hours}h ${minutes}m` })}
        </p>
      </div>
    );
  }

  /* ------------------------------- playing ------------------------------- */
  if (state.phase === 'playing') {
    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-amber-500" />
            {t('daily.title')} #{day}
          </span>
          <span>{t('daily.attempt', { n: state.attempts + 1, max: MAX_ATTEMPTS })}</span>
        </div>

        {/* hint progress dots */}
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className={
                i < state.attempts
                  ? 'size-2 rounded-full bg-rose-400'
                  : i === state.attempts
                    ? 'size-2 rounded-full bg-amber-400'
                    : 'size-2 rounded-full bg-muted'
              }
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={state.attempts}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-border/60 bg-muted/30 p-4 text-center text-sm"
          >
            {state.hint ? renderHint(state.hint, t) : t('daily.noHint')}
          </motion.div>
        </AnimatePresence>

        {error ? <p className="text-center text-xs text-rose-500">{t('daily.error')}</p> : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(state.options ?? []).map((o) => {
            const isWrong = state.wrong.includes(o.code);
            return (
              <Button
                key={o.code}
                variant="outline"
                disabled={isWrong}
                onClick={() => guess(o.code)}
                className={
                  'justify-start gap-2.5 border-border/60 bg-background/60 backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-amber-500/5' +
                  (isWrong ? ' opacity-40 line-through' : '')
                }
              >
                <span className="text-lg leading-none">{o.flagEmoji ?? '🏳️'}</span>
                <span className="truncate text-sm font-normal">{o.name}</span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return <p className="py-10 text-center text-sm text-muted-foreground">{error ? t('daily.error') : t('quiz.loading')}</p>;
}

/** Emoji grid: won → 🟩 on the winning attempt, 🟥 for earlier wrongs, ⬜ unused. Lost → 🟥×5. */
function buildGrid(attempts: number, max: number, won: boolean): string {
  if (!won) return '🟥'.repeat(max);
  return Array.from({ length: max })
    .map((_, i) => (i < attempts ? '🟥' : i === attempts ? '🟩' : '⬜'))
    .join('');
}

function renderHint(hint: Hint, t: (k: string, p?: Record<string, string | number>) => string) {
  switch (hint.kind) {
    case 'region':
      return hint.subregion
        ? t('daily.hint.region', { region: hint.subregion })
        : t('daily.hint.region', { region: hint.region });
    case 'population':
      return t('daily.hint.population', { bracket: hint.bracket });
    case 'currency':
      return t('daily.hint.currency', { name: hint.name, symbol: hint.symbol });
    case 'language':
      return t('daily.hint.language', { name: hint.name });
    case 'capital':
      return t('daily.hint.capital', { capital: hint.capital, initial: hint.initial });
  }
}
