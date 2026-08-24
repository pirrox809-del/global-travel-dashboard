'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe2, Compass, Sparkles } from 'lucide-react';
import { CountrySelector } from '@/components/country-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { Dashboard } from '@/components/dashboard/dashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
              <Compass className="size-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight sm:text-lg">Global Travel Dashboard</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                189 countries · live weather, FX &amp; advisories
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:flex gap-1.5">
              <Sparkles className="size-3 text-emerald-500" />
              AI-curated
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Selector bar */}
      <div className="sticky top-[57px] z-30 border-b bg-background/70 backdrop-blur-md">
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

      {/* Sticky footer */}
      <footer className="mt-auto border-t bg-card/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Globe2 className="size-3.5" />
                Data sources:
              </span>
              <a className="hover:text-foreground hover:underline" href="https://restcountries.com" target="_blank" rel="noreferrer">REST Countries</a>
              <a className="hover:text-foreground hover:underline" href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
              <a className="hover:text-foreground hover:underline" href="https://frankfurter.app" target="_blank" rel="noreferrer">Frankfurter · ECB</a>
              <a className="hover:text-foreground hover:underline" href="https://traveladvisory.state.gov" target="_blank" rel="noreferrer">US State Dept</a>
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              Hotel &amp; flight ranges are LLM-generated estimates · not live booking data.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (code: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center sm:py-20">
      <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
        <Globe2 className="size-8" />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Pick a country, see everything.
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Live weather, ECB exchange rates, US State Dept advisories, AI-curated culture, food,
        must-see places and price estimates — aggregated in one dashboard for any of the 189 countries.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {FEATURED.map((f) => (
          <Button key={f.code} variant="outline" size="sm" onClick={() => onPick(f.code)} className="gap-1.5">
            <Sparkles className="size-3 text-emerald-500" />
            {f.name}
          </Button>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Or search the dropdown above. First visit to each country takes ~5s to generate its travel brief.
      </p>
    </div>
  );
}
