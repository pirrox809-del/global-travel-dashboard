'use client';

import { Trophy, DollarSign, Users, Ruler, HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from './source-badge';
import { useT } from '@/components/language-provider';
import type { CountryDynamic } from '@/lib/types';

/**
 * Global classification card — shows the country's world rank across
 * 4 dimensions: GDP per capita (World Bank), Population (World Bank),
 * Area (rest-countries DB), HDI (UNDP via OWID).
 *
 * Each row shows:
 *   - icon + label
 *   - the country's value (formatted, e.g. "$44,700" or "67M" or "551k km²")
 *   - world rank as "#1 / 248" or similar
 *   - source badge (per-row, hardcoded since each dimension's source
 *     is statically known)
 *
 * All data is fetched in aggregate.ts and degrades gracefully:
 *   - If the whole classification fetch fails → render `{ error }` message.
 *   - If the country isn't in a specific source's dataset → that row
 *     shows "Not ranked" with the source badge still visible.
 */
export function ClassificationCard({ classification }: { classification: CountryDynamic['classification'] }) {
  const t = useT();

  // Whole-fetch failure: degrade to a clean error message.
  if ('error' in classification) {
    return (
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4 text-amber-500" />
              {t('card.classification')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('classification.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const { gdpPerCapita, population, area, hdi } = classification;

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="size-4 text-amber-500" />
            {t('card.classification')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5 sm:grid-cols-2">
        <Row
          icon={<DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />}
          label={t('classification.gdpPerCapita')}
          value={formatGdpPerCapita(gdpPerCapita.value)}
          rank={gdpPerCapita.rank}
          total={gdpPerCapita.total}
          year={gdpPerCapita.year}
          source="world-bank"
        />
        <Row
          icon={<HeartPulse className="size-4 text-rose-600 dark:text-rose-400" />}
          label={t('classification.hdi')}
          value={hdi ? formatHdi(hdi.value) : null}
          rank={hdi?.rank ?? null}
          total={hdi?.total ?? 0}
          year={hdi?.year ?? null}
          source="undp"
          notRankedText={hdi ? null : t('classification.hdiNone')}
        />
        <Row
          icon={<Users className="size-4 text-cyan-600 dark:text-cyan-400" />}
          label={t('classification.population')}
          value={formatPopulation(population.value)}
          rank={population.rank}
          total={population.total}
          year={population.year}
          source="world-bank"
        />
        <Row
          icon={<Ruler className="size-4 text-violet-600 dark:text-violet-400" />}
          label={t('classification.area')}
          value={formatArea(area.value)}
          rank={area.rank}
          total={area.total}
          year={area.year}
          source="rest-countries"
        />
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
  rank,
  total,
  year,
  source,
  notRankedText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  rank: number | null;
  total: number;
  year: number | null;
  source: string;
  notRankedText?: string | null;
}) {
  const t = useT();
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          {label}
        </div>
        <SourceBadge source={source} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        {value !== null ? (
          <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
        ) : (
          <span className="text-xs italic text-muted-foreground/70">
            {notRankedText ?? t('classification.notRanked')}
          </span>
        )}
        {rank !== null && total > 0 ? (
          <Badge
            variant="secondary"
            className="ml-auto gap-1 px-1.5 py-0 text-[10px] tabular-nums text-amber-700 dark:text-amber-300"
          >
            #{rank}
            <span className="text-muted-foreground">/ {total}</span>
          </Badge>
        ) : null}
      </div>
      {year !== null ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground/60">{year}</div>
      ) : null}
    </div>
  );
}

/** Format GDP per capita: $44,700 */
function formatGdpPerCapita(v: number | null): string | null {
  if (v === null) return null;
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

/** Format HDI: 0.901 → "0.901" (3 decimals, the standard HDI precision). */
function formatHdi(v: number | null): string | null {
  if (v === null) return null;
  return v.toFixed(3);
}

/** Format population: 67300000 → "67.3M" or 6700000 → "6.7M" */
function formatPopulation(v: number | null): string | null {
  if (v === null) return null;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

/** Format area: 551695 → "551,695 km²" or smaller values without separators. */
function formatArea(v: number | null): string | null {
  if (v === null) return null;
  return `${Math.round(v).toLocaleString('en-US')} km²`;
}
