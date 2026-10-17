'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryDynamic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type Economy = CountryDynamic['economy'];

/** Economy card — REAL World Bank macro indicators. */
export function EconomyCard({ economy }: { economy: Economy }) {
  const t = useT();

  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="size-4 text-emerald-600" />
          {t('card.economy')}
        </CardTitle>
        <SourceBadge source="world-bank" />
      </CardHeader>
      <CardContent>
        {'error' in economy ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('economy.noData')}</p>
        ) : (
          <div className="space-y-1.5">
            <Row label={t('economy.gdp')} value={fmtGdp(economy.gdpUsd)} tone="emerald" />
            <Row label={t('economy.gdpPerCapita')} value={fmtPerCap(economy.gdpPerCapitaUsd)} tone="cyan" />
            <Row label={t('economy.inflation')} value={fmtPct(economy.inflationRate)} tone="amber" />
            <Row label={t('economy.unemployment')} value={fmtPct(economy.unemploymentRate)} tone="rose" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'amber' | 'rose' | 'cyan' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}

/** Format GDP value: $X.XT if ≥ 1T, $X.XB if ≥ 1B, $XXXM else. */
function fmtGdp(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
}

/** Format GDP per capita: $XX,XXX with thousands separators. */
function fmtPerCap(v: number | null): string {
  if (v == null) return '—';
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

/** Format a percentage: X.X%. */
function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(1)}%`;
}
