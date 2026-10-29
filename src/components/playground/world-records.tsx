'use client';

/**
 * WorldRecords — "Supplativi del mondo": superlatives computed from the
 * static 250-country database via /api/records (no external APIs, no LLM).
 *
 * Each record shows a small podium (top 3). Clicking an entry teleports
 * the user to that country via onVisit.
 */

import * as React from 'react';
import { Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/language-provider';

type Entry = { code: string; name: string; flagEmoji: string | null; value: number };
type RecordDef = { key: string; top: Entry[] };

/** Format a record value according to its key. */
function formatValue(key: string, value: number): string {
  switch (key) {
    case 'largestArea':
    case 'smallestArea':
      // Micro-states keep one decimal so "0.49 km²" doesn't round to "0".
      return value < 10
        ? `${value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km²`
        : `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })} km²`;
    case 'mostPopulous':
    case 'leastPopulous':
      return value >= 1_000_000
        ? `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`
        : value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case 'mostTimezones':
    case 'mostLanguages':
    case 'mostCurrencies':
      return String(value);
    case 'northernmost':
    case 'southernmost':
      return `${Math.abs(value).toFixed(1)}°${value >= 0 ? 'N' : 'S'}`;
    case 'densest':
      return `${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}/km²`;
    default:
      return String(value);
  }
}

export function WorldRecords({ onVisit }: { onVisit?: (code: string) => void }) {
  const t = useT();
  const [records, setRecords] = React.useState<RecordDef[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    fetch('/api/records')
      .then((r) => r.json() as Promise<{ records: RecordDef[] }>)
      .then((j) => alive && setRecords(j.records))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('records.error')}</p>;
  }
  if (!records) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t('records.loading')}</p>;
  }

  return (
    <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-1 pr-1">
      {records.map((rec) => (
        <div key={rec.key} className="rounded-xl border border-border/50 bg-muted/20 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500/90">
            <Medal className="size-3.5" />
            {t(`records.${rec.key}`)}
          </p>
          <div className="flex flex-col gap-1.5">
            {rec.top.map((entry, i) => (
              <div key={entry.code} className="flex items-center gap-2">
                <span
                  className={
                    'w-5 shrink-0 text-center text-xs font-bold ' + (i === 0 ? 'text-amber-500' : 'text-muted-foreground/70')
                  }
                >
                  {i + 1}
                </span>
                <span className="w-6 shrink-0 text-lg leading-none">{entry.flagEmoji ?? '🏳️'}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatValue(rec.key, entry.value)}
                </span>
                {onVisit ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => onVisit(entry.code)}
                  >
                    {t('records.visit')}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
