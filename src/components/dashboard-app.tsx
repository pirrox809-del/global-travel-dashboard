'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe2, Compass, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountrySelector } from '@/components/country-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Dashboard } from '@/components/dashboard/dashboard';
import { NeuralNoise } from '@/components/ui/neural-noise';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/components/language-provider';

/** Quick-pick shortcuts shown on the empty state. */
const FEATURED = [
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'BR', name: 'Brazil' },
  { code: 'EG', name: 'Egypt' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
];

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
  const [selected, setSelected] = useState<string | null>(params.get('c')?.toUpperCase() ?? null);

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
      {/* Ambient animated backdrop — warm amber neural-noise shader. */}
      <NeuralNoise color={[0.95, 0.5, 0.18]} opacity={0.55} speed={0.0008} />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Sticky header — refined glass */}
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
                <Compass className="size-5" />
              </div>
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
              <ThemeToggle />
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
      </div>
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
      {/* Iconic centerpiece: a rotating compass medallion over the neural backdrop. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-8 grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-2xl shadow-amber-500/25"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <Compass className="size-12" />
        </motion.div>
        {/* soft glow */}
        <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-amber-500/40 to-rose-500/40 blur-2xl" />
      </motion.div>

      <Badge variant="outline" className="mb-4 gap-1.5 bg-background/60 backdrop-blur-md">
        <Sparkles className="size-3 text-amber-500" />
        {t('empty.badge')}
      </Badge>
      <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
        {t('empty.title1')}
        <br />
        <span className="bg-gradient-to-r from-amber-600 via-rose-500 to-amber-600 bg-clip-text text-transparent">
          {t('empty.title2')}
        </span>
      </h2>
      <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
        {t('empty.body')}
      </p>
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
              className="gap-1.5 border-border/50 bg-background/50 backdrop-blur-md transition-all hover:border-amber-500/40 hover:bg-background/80"
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
