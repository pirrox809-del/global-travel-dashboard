'use client';

/**
 * CountryDuel — head-to-head comparison of two countries.
 *
 * Pick country A and country B, then compare five live metrics:
 *   population · area · GDP per capita · safety level · temperature now
 * Each row crowns a winner (trophy badge); the footer counts total wins.
 *
 * Data comes straight from the existing aggregate endpoint via useCountry,
 * so every number is the same one shown on the country dashboards.
 */

import * as React from 'react';
import { Loader2, Swords, Trophy } from 'lucide-react';
import { CountrySelector } from '@/components/country-selector';
import { useLanguage, useT } from '@/components/language-provider';
import { useCountry } from '@/hooks/use-country';
import type { AggregatedCountry } from '@/lib/types';

type Side = 'a' | 'b';

type DuelRow = {
  key: string;
  label: string;
  valueA: string;
  valueB: string;
  winner: Side | null;
  note?: string;
};

function fmtCompact(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function fmtInt(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
}

/** Extract comparable numbers from one side's aggregate data. */
function sideNumbers(data: AggregatedCountry | undefined) {
  if (!data) return null;
  const pop = data.country.population ? Number(data.country.population) : null;
  const area = data.country.area ?? null;
  const gdp =
    data.dynamic.economy && !('error' in data.dynamic.economy)
      ? data.dynamic.economy.gdpPerCapitaUsd
      : null;
  const safety =
    data.dynamic.advisory && data.dynamic.advisory.source === 'us-state-dept'
      ? data.dynamic.advisory.level
      : null;
  const temp =
    data.dynamic.weather && !('error' in data.dynamic.weather)
      ? data.dynamic.weather.temperature
      : null;
  return { pop, area, gdp, safety, temp };
}

export function CountryDuel() {
  const t = useT();
  const { locale } = useLanguage();
  const [codeA, setCodeA] = React.useState<string | null>(null);
  const [codeB, setCodeB] = React.useState<string | null>(null);

  const queryA = useCountry(codeA);
  const queryB = useCountry(codeB);

  const loading = (codeA && queryA.isLoading) || (codeB && queryB.isLoading);
  const dataA = queryA.data;
  const dataB = queryB.data;
  const numsA = sideNumbers(dataA);
  const numsB = sideNumbers(dataB);

  // Higher-is-better helper: null-safe comparison.
  const higher = (a: number | null, b: number | null): Side | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (a === b) return null;
    return a > b ? 'a' : 'b';
  };
  const lower = (a: number | null, b: number | null): Side | null => {
    if (a === null && b === null) return null;
    if (a === null) return 'b';
    if (b === null) return 'a';
    if (a === b) return null;
    return a < b ? 'a' : 'b';
  };

  const rows: DuelRow[] = [];
  if (numsA && numsB) {
    rows.push({
      key: 'population',
      label: t('duel.population'),
      valueA: numsA.pop !== null ? fmtInt(numsA.pop, locale) : '—',
      valueB: numsB.pop !== null ? fmtInt(numsB.pop, locale) : '—',
      winner: higher(numsA.pop, numsB.pop),
    });
    rows.push({
      key: 'area',
      label: t('duel.area'),
      valueA: numsA.area !== null ? `${fmtInt(numsA.area, locale)} km²` : '—',
      valueB: numsB.area !== null ? `${fmtInt(numsB.area, locale)} km²` : '—',
      winner: higher(numsA.area, numsB.area),
    });
    rows.push({
      key: 'gdp',
      label: t('duel.gdp'),
      valueA: numsA.gdp !== null ? `$${fmtCompact(numsA.gdp, locale)}` : '—',
      valueB: numsB.gdp !== null ? `$${fmtCompact(numsB.gdp, locale)}` : '—',
      winner: higher(numsA.gdp, numsB.gdp),
    });
    rows.push({
      key: 'safety',
      label: t('duel.safety'),
      valueA:
        numsA.safety !== null
          ? t('duel.level', { value: String(numsA.safety) })
          : t('duel.unavailable'),
      valueB:
        numsB.safety !== null
          ? t('duel.level', { value: String(numsB.safety) })
          : t('duel.unavailable'),
      winner: lower(numsA.safety, numsB.safety),
      note: t('duel.safetyNote'),
    });
    rows.push({
      key: 'temp',
      label: t('duel.temperature'),
      valueA: numsA.temp !== null ? `${Math.round(numsA.temp)}°C` : '—',
      valueB: numsB.temp !== null ? `${Math.round(numsB.temp)}°C` : '—',
      winner: higher(numsA.temp, numsB.temp),
      note: t('duel.tempNote'),
    });
  }

  const winsA = rows.filter((r) => r.winner === 'a').length;
  const winsB = rows.filter((r) => r.winner === 'b').length;

  return (
    <div className="flex flex-col gap-4">
      {/* Pickers */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <CountrySelector value={codeA} onChange={setCodeA} />
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10">
          <Swords className="size-4 text-amber-500" />
        </div>
        <CountrySelector value={codeB} onChange={setCodeB} />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('duel.loading')}
        </div>
      )}

      {!loading && (!dataA || !dataB) && (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('duel.pick')}</p>
      )}

      {/* Comparison table */}
      {dataA && dataB && numsA && numsB && (
        <div className="overflow-hidden rounded-2xl border border-border/50">
          {/* Headers with flags */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border/50 bg-card/40 px-3 py-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="text-lg">{dataA.country.flagEmoji ?? '🏳️'}</span>
              <span className="truncate">{dataA.country.name}</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t('duel.vs')}
            </span>
            <div className="flex items-center justify-end gap-2 text-right text-sm font-bold">
              <span className="truncate">{dataB.country.name}</span>
              <span className="text-lg">{dataB.country.flagEmoji ?? '🏳️'}</span>
            </div>
          </div>

          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border/30 px-3 py-2.5 last:border-b-0"
            >
              {/* A value */}
              <div
                className={`flex items-center gap-1.5 text-sm tabular-nums ${
                  row.winner === 'a' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                }`}
              >
                {row.winner === 'a' && <Trophy className="size-3.5 shrink-0 text-amber-500" />}
                <span className="truncate">{row.valueA}</span>
              </div>
              {/* Metric label */}
              <div className="max-w-[130px] text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {row.label}
                {row.note && <div className="mt-0.5 text-[10px] normal-case opacity-70">{row.note}</div>}
              </div>
              {/* B value */}
              <div
                className={`flex items-center justify-end gap-1.5 text-right text-sm tabular-nums ${
                  row.winner === 'b' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                }`}
              >
                <span className="truncate">{row.valueB}</span>
                {row.winner === 'b' && <Trophy className="size-3.5 shrink-0 text-amber-500" />}
              </div>
            </div>
          ))}

          {/* Score footer */}
          <div className="bg-card/40 px-3 py-3 text-center text-sm font-bold">
            <span className="text-amber-600 dark:text-amber-400">{winsA}</span>
            <span className="mx-2 text-muted-foreground">—</span>
            <span className="text-amber-600 dark:text-amber-400">{winsB}</span>
          </div>
        </div>
      )}
    </div>
  );
}
