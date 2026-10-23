'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe2, Sparkles, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CountrySelector } from '@/components/country-selector';
import { SunMoonThemeToggle } from '@/components/ui/sun-moon-theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Dashboard } from '@/components/dashboard/dashboard';
import { NeuralNoise } from '@/components/ui/neural-noise';
import { AirplaneCursor } from '@/components/ui/airplane-cursor';
import { IntroScreen } from '@/components/intro-screen';
import { GlobeCdn } from '@/components/ui/cobe-globe-cdn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT, useLanguage } from '@/components/language-provider';
import { useFavorites } from '@/components/favorites-provider';
import { useCountryList } from '@/hooks/use-country';
import HeroShutterText from '@/components/ui/hero-shutter-text';

/** Quick-pick shortcuts shown on the empty state. */
const FEATURED = [
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
];

/** sessionStorage key: once the user has entered, skip the intro for the
 *  rest of the session (but show it again on a fresh session/new tab). */
const ENTERED_KEY = 'gtd-entered';

export function DashboardApp() {
  return (
    <Suspense fallback={null}>
      <DashboardAppInner />
    </Suspense>
  );
}

function DashboardAppInner() {
  const params = useSearchParams();
  const t = useT();
  const initialCountry = params.get('c')?.toUpperCase() ?? null;
  const [selected, setSelected] = useState<string | null>(initialCountry);

  // Intro gate: show the landing screen on the first visit of a session,
  // UNLESS the URL already carries a country (?c=XX) — deep-links skip the
  // intro — OR the user has already entered this session (sessionStorage).
  // We compute the initial value lazily (no setState-in-effect) by reading
  // sessionStorage during useState initialization.
  const [entered, setEntered] = useState<boolean>(() => {
    if (initialCountry) return true; // deep-link → straight to dashboard
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(ENTERED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleEnter = () => {
    setEntered(true);
    try {
      sessionStorage.setItem(ENTERED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  // Keep URL in sync with selection (shareable links).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set('c', selected);
    else url.searchParams.delete('c');
    window.history.replaceState(null, '', url.toString());
  }, [selected]);

  // React to back/forward navigation.
  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setSelected(p.get('c')?.toUpperCase() ?? null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient animated backdrop — warm amber neural-noise shader.
          Rendered once at the root so it persists across the intro→dashboard
          transition (no shader restart flicker). */}
      <NeuralNoise color={[0.95, 0.5, 0.18]} opacity={0.55} speed={0.0008} />

      {/* Custom airplane cursor — replaces the default OS arrow cursor
          with a small amber airplane that follows the pointer and
          rotates to face the direction of movement. */}
      <AirplaneCursor />

      <AnimatePresence mode="wait">
        {!entered ? (
          <IntroScreen key="intro" onEnter={handleEnter} />
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex min-h-screen flex-col"
          >
        {/* Sticky header — refined glass */}
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="leading-tight">
                <h1 className="text-base font-bold tracking-tight sm:text-lg">{t('app.title')}</h1>
                <p className="hidden text-[11px] text-muted-foreground sm:block">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="hidden md:flex gap-1.5 bg-background/50 backdrop-blur">
                <Sparkles className="size-3 text-amber-500" />
                {t('app.aiCurated')}
              </Badge>
              <LanguageSwitcher />
              <SunMoonThemeToggle size={36} />
            </div>
          </div>
        </header>

        {/* Selector bar */}
        <div className="sticky top-[57px] z-30 border-b border-border/40 bg-background/50 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <CountrySelector value={selected} onChange={setSelected} />
          </div>
        </div>

        {/* Main content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {selected ? (
            <Dashboard key={selected} code={selected} />
          ) : (
            <EmptyState onPick={setSelected} />
          )}
        </main>

        {/* Sticky footer — refined glass */}
        <footer className="mt-auto border-t border-border/40 bg-background/50 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Globe2 className="size-3.5" />
                  {t('footer.sources')}
                </span>
                <a className="hover:text-foreground hover:underline transition-colors" href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">mledoze/countries</a>
                <a className="hover:text-foreground hover:underline transition-colors" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
                <a className="hover:text-foreground hover:underline transition-colors" href="https://frankfurter.dev" target="_blank" rel="noreferrer">Frankfurter · ECB</a>
                <a className="hover:text-foreground hover:underline transition-colors" href="https://traveladvisory.state.gov" target="_blank" rel="noreferrer">US State Dept</a>
              </div>
              <p className="text-[11px] text-muted-foreground/80">
                {t('footer.disclaimer')}
              </p>
            </div>
          </div>
        </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (code: string) => void }) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto flex min-h-[calc(100vh-220px)] max-w-2xl flex-col items-center justify-center py-10 text-center"
    >
      {/* Interactive 3D globe (cobe) — CDN markers + arcs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8 h-64 w-64 sm:h-80 sm:w-80"
      >
        <GlobeCdn />
      </motion.div>

      <Badge variant="outline" className="mb-4 gap-1.5 bg-background/60 backdrop-blur-md">
        <Sparkles className="size-3 text-amber-500" />
        {t('empty.badge')}
      </Badge>
      <HeroShutterText
        headingLevel={2}
        lines={[
          { text: t('empty.title1'), className: 'text-foreground' },
          { text: t('empty.title2'), className: 'text-muted-foreground' },
        ]}
        charClassName="text-[clamp(1.875rem,5vw,3rem)]"
        replayLabel={t('intro.replay')}
      />
      <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
        {t('empty.body')}
      </p>
      {/* Favourites section — shows the user's starred countries first */}
      <FavoritesSection onPick={onPick} />
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {FEATURED.map((f, i) => (
          <motion.div
            key={f.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPick(f.code)}
              className="gap-1.5 border-border/50 bg-background/50 backdrop-blur-md transition-all hover:border-foreground/30 hover:bg-foreground/5"
            >
              <Sparkles className="size-3 text-amber-500" />
              {f.name}
            </Button>
          </motion.div>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground/80">
        {t('empty.hint')}
      </p>
    </motion.div>
  );
}

/** Favourites quick-pick section — shows the user's starred countries
 *  as buttons at the top of the empty state, before the featured picks.
 *  Skipped entirely when no favourites are set. */
function FavoritesSection({ onPick }: { onPick: (code: string) => void }) {
  const { favorites } = useFavorites();
  // Hooks must be called unconditionally (before any early returns).
  const { data } = useCountryList();

  if (favorites.length === 0) return null;
  if (!data) return null;

  // Look up the country data (flag + name) for each favourite.
  const favCountries = favorites
    .map((code) => data.countries.find((c) => c.code === code))
    .filter(Boolean) as { code: string; name: string; flagEmoji: string | null }[];

  if (favCountries.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-500/80">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        Favorites
      </span>
      <div className="flex flex-wrap justify-center gap-2">
        {favCountries.map((f, i) => (
          <motion.div
            key={f.code}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease: 'easeOut' }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPick(f.code)}
              className="gap-1.5 border-amber-500/30 bg-amber-500/5 backdrop-blur-md transition-all hover:border-amber-500/50 hover:bg-amber-500/10"
            >
              <span>{f.flagEmoji ?? '🏳️'}</span>
              {f.name}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
