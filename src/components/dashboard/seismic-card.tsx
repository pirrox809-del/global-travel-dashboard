'use client';

import { Activity, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryDynamic, CountryStatic } from '@/lib/types';
import { useLanguage, type TFn } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type Earthquakes = CountryDynamic['earthquakes'];
type Content = NonNullable<CountryStatic['content']>;
type QuakeEvent = { magnitude: number; place: string; date: string };
type Fmt = ReturnType<typeof useLanguage>['fmt'];

/**
 * Seismic card — combines REAL USGS earthquake data with an LLM natural-disaster
 * risk paragraph. Carries two source badges: "usgs · real" for the data section,
 * "curated" for the risk paragraph. The card is skipped entirely when the USGS
 * feed errored AND no risk paragraph is available.
 */
export function SeismicCard({
  earthquakes,
  naturalDisasterRisk,
}: {
  earthquakes: Earthquakes;
  naturalDisasterRisk: Content['naturalDisasterRisk'];
}) {
  const { t, fmt } = useLanguage();

  const hasQuakeData = !('error' in earthquakes);
  const hasRisk = !!naturalDisasterRisk;

  // Per spec: if earthquakes is in error AND naturalDisasterRisk is null, skip.
  if (!hasQuakeData && !hasRisk) return null;

  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Activity className="size-4 text-amber-600" />
          {t('card.seismic')}
        </CardTitle>
        {hasQuakeData ? <SourceBadge source="usgs" /> : <SourceBadge source="curated" />}
      </CardHeader>
      <CardContent className="space-y-4">
        {hasQuakeData ? <QuakeDataSection earthquakes={earthquakes} fmt={fmt} t={t} /> : null}

        {hasRisk ? (
          <div className={hasQuakeData ? 'border-t pt-3' : ''}>
            <div className="mb-1.5 flex items-center justify-end">
              <SourceBadge source="curated" />
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{naturalDisasterRisk}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuakeDataSection({
  earthquakes,
  fmt,
  t,
}: {
  earthquakes: Exclude<Earthquakes, { error: string }>;
  fmt: Fmt;
  t: TFn;
}) {
  // No notable events → render the green positive message.
  if (earthquakes.notableEvents.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="size-4 shrink-0" />
        <span className="text-sm font-medium">{t('seismic.noneActive')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Recent count summary */}
      <div className="text-sm">
        <span className="font-medium tabular-nums">
          {t('seismic.recentCount', { n: earthquakes.recentCount })}
        </span>
      </div>

      {/* Largest + most recent — 2 columns on sm+ */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {earthquakes.largestEvent ? (
          <EventBox
            label={t('seismic.largest')}
            ev={earthquakes.largestEvent}
            date={fmt.dateLong(earthquakes.largestEvent.date)}
            tone="rose"
          />
        ) : null}
        {earthquakes.mostRecent ? (
          <EventBox
            label={t('seismic.recent')}
            ev={earthquakes.mostRecent}
            date={fmt.dateLong(earthquakes.mostRecent.date)}
            tone="amber"
          />
        ) : null}
      </div>

      {/* Notable events list */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('seismic.notable')}
        </div>
        <ul className="space-y-1">
          {earthquakes.notableEvents.map((ev, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-medium tabular-nums text-amber-700 dark:text-amber-300">
                {fmtMag(ev.magnitude)}
              </span>
              <span className="truncate text-muted-foreground">{ev.place}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{fmt.dateLong(ev.date)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EventBox({
  label,
  ev,
  date,
  tone,
}: {
  label: string;
  ev: QuakeEvent;
  date: string;
  tone: 'rose' | 'amber';
}) {
  const tones: Record<string, string> = {
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  };
  return (
    <div className={`rounded-md px-2.5 py-1.5 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 text-base font-bold tabular-nums">{fmtMag(ev.magnitude)}</div>
      <div className="truncate text-[11px] opacity-90">{ev.place}</div>
      <div className="text-[10px] opacity-70">{date}</div>
    </div>
  );
}

/** Format a magnitude value: M5.0. */
function fmtMag(m: number): string {
  return `M${m.toFixed(1)}`;
}
