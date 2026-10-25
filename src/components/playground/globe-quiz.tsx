'use client';

/**
 * GlobeQuiz — "Find the country on the globe" mini-game.
 *
 * A react-globe.gl globe shows one amber dot per country (capital coords).
 * Each round the player must find a named country and click it:
 *  - correct on first try  → +1 point, green pulse ring, streak++
 *  - correct after misses  → 0 points, green pulse ring, streak reset
 *  - wrong click           → red pulse ring + "that's {name}!" hint
 *
 * 8 rounds, then a summary with the final score and a Play Again button.
 * The target never gets a special colour/size — the player has to look.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, RotateCcw, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/language-provider';
import { useCountryList } from '@/hooks/use-country';
import type { CountryListItem } from '@/lib/types';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-amber-500/50" />
      </div>
    </div>
  ),
}) as React.ComponentType<
  GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }
>;

const ROUNDS = 8;

type QuizPoint = {
  code: string;
  name: string;
  flagEmoji: string | null;
  lat: number;
  lng: number;
  color: string;
  size: number;
};

type Feedback =
  | { kind: 'idle' }
  | { kind: 'correct'; firstTry: boolean }
  | { kind: 'wrong'; clicked: string };

export function GlobeQuiz() {
  const t = useT();
  const { data, isLoading } = useCountryList();

  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const nextRoundTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [size, setSize] = React.useState(320);

  const [round, setRound] = React.useState(1);
  const [score, setScore] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [target, setTarget] = React.useState<CountryListItem | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback>({ kind: 'idle' });
  const [firstTry, setFirstTry] = React.useState(true);
  const [finished, setFinished] = React.useState(false);
  const [ring, setRing] = React.useState<{ lat: number; lng: number; color: string } | null>(null);

  // Countries with known capital coordinates become clickable points.
  const points: QuizPoint[] = React.useMemo(() => {
    const list = data?.countries ?? [];
    return list
      .filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number')
      .map((c) => ({
        code: c.code,
        name: c.name,
        flagEmoji: c.flagEmoji,
        lat: c.latitude as number,
        lng: c.longitude as number,
        color: '#f59e0b',
        size: 0.42,
      }));
  }, [data]);

  // Start a round: pick a random target (never the same as before).
  const startRound = React.useCallback(() => {
    if (points.length === 0) return;
    setTarget((prev) => {
      for (let i = 0; i < 20; i++) {
        const candidate = points[Math.floor(Math.random() * points.length)];
        if (!prev || candidate.code !== prev.code) {
          return {
            code: candidate.code,
            name: candidate.name,
            region: null,
            capital: null,
            flagEmoji: candidate.flagEmoji,
            flagUrl: null,
            latitude: candidate.lat,
            longitude: candidate.lng,
          };
        }
      }
      return prev;
    });
    setFeedback({ kind: 'idle' });
    setFirstTry(true);
    setRing(null);
  }, [points]);

  // Kick off round 1 once the list is available.
  React.useEffect(() => {
    if (target === null && points.length > 0 && !finished) startRound();
  }, [points, target, finished, startRound]);

  // Responsive globe sizing.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(el.clientWidth - 8, el.clientHeight - 8, 560);
      setSize(Math.max(260, s));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  // Cleanup pending timers.
  React.useEffect(
    () => () => {
      if (nextRoundTimer.current) clearTimeout(nextRoundTimer.current);
    },
    [],
  );

  const handlePointClick = (point: object) => {
    const p = point as QuizPoint;
    if (!target || feedback.kind !== 'idle') return;

    if (p.code === target.code) {
      // Correct — green pulse, score, next round.
      setFeedback({ kind: 'correct', firstTry });
      setRing({ lat: p.lat, lng: p.lng, color: '#22c55e' });
      if (firstTry) {
        setScore((s) => s + 1);
        setStreak((s) => {
          const next = s + 1;
          setBestStreak((b) => Math.max(b, next));
          return next;
        });
      } else {
        setStreak(0);
      }
      nextRoundTimer.current = setTimeout(() => {
        if (round + 1 > ROUNDS) {
          setFinished(true);
        } else {
          setRound((r) => r + 1);
          startRound();
        }
      }, 1500);
    } else {
      // Wrong — red pulse + hint, same target stays.
      setFeedback({ kind: 'wrong', clicked: p.name });
      setRing({ lat: p.lat, lng: p.lng, color: '#ef4444' });
      setFirstTry(false);
      nextRoundTimer.current = setTimeout(() => {
        setFeedback({ kind: 'idle' });
        setRing(null);
      }, 1100);
    }
  };

  const playAgain = () => {
    setRound(1);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setFinished(false);
    setTarget(null);
    setFeedback({ kind: 'idle' });
    setFirstTry(true);
    setRing(null);
    startRound();
  };

  if (isLoading || points.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        {t('quiz.loading')}
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Trophy className="size-12 text-amber-500" />
        <h3 className="text-2xl font-bold">{t('quiz.finish.title')}</h3>
        <p className="text-4xl font-extrabold tabular-nums">
          {score}
          <span className="text-xl font-medium text-muted-foreground"> / {ROUNDS}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t('quiz.finish.streak', { value: String(bestStreak) })}
        </p>
        <Button onClick={playAgain} className="mt-2 gap-2">
          <RotateCcw className="size-4" />
          {t('quiz.playAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[60vh] flex-col sm:h-[64vh]">
      {/* Top bar: round + score */}
      <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 font-medium">
          {t('quiz.round', { value: String(round), total: String(ROUNDS) })}
        </span>
        <span className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 font-medium tabular-nums">
          {t('quiz.score', { value: String(score) })}
        </span>
      </div>

      {/* Question banner */}
      <div className="flex min-h-[52px] items-center justify-center px-2 pb-2">
        <AnimatePresence mode="wait">
          {feedback.kind === 'correct' ? (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400"
            >
              <Check className="size-4" />
              {feedback.firstTry ? t('quiz.correct') : t('quiz.correctLate')}
            </motion.div>
          ) : feedback.kind === 'wrong' ? (
            <motion.div
              key="no"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400"
            >
              <X className="size-4" />
              {t('quiz.wrong', { name: feedback.clicked })}
            </motion.div>
          ) : (
            <motion.div
              key="q"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-bold"
            >
              <MapPin className="size-4 text-amber-500" />
              {target ? (
                <span>
                  {t('quiz.find')}{' '}
                  <span className="text-amber-600 dark:text-amber-400">
                    {target.flagEmoji ?? ''} {target.name}
                  </span>
                </span>
              ) : (
                t('quiz.loading')
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The globe */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden rounded-2xl border border-border/50 bg-card/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <Globe
            ref={globeRef}
            width={size}
            height={size}
            globeImageUrl="https://cdn.21st.dev/assets/localized/228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01.jpg"
            bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#f59e0b"
            atmosphereAltitude={0.2}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.015}
            pointRadius="size"
            pointLabel={(d: object) => {
              const p = d as QuizPoint;
              return `<div style="background:rgba(10,15,25,.85);color:#fff;padding:6px 10px;border-radius:8px;font-size:12px">${p.flagEmoji ?? ''} ${p.name}</div>`;
            }}
            ringsData={ring ? [ring] : []}
            ringColor="color"
            ringMaxRadius={5}
            ringPropagationSpeed={2.8}
            ringRepeatPeriod={0}
            onPointClick={handlePointClick}
            onGlobeReady={() => {
              const globe = globeRef.current;
              if (!globe) return;
              globe.pointOfView({ lat: 15, lng: 0, altitude: 2.7 }, 0);
              const controls = globe.controls();
              if (controls) {
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.5;
                controls.enableZoom = true;
              }
            }}
            enablePointerInteraction
            animateIn={false}
          />
        </div>
        {/* Hint */}
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur">
          {t('quiz.hint')}
        </p>
      </div>
    </div>
  );
}
