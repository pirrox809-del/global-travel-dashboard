'use client';

/**
 * Passport — collect a stamp for every country you visit. 100% offline:
 * stamps live in localStorage (see src/lib/passport.ts), the 250-tile grid
 * is rendered from the country list the app already loads.
 *
 * Clicking a visited (or unvisited) tile teleports there via onVisit —
 * collecting stamps IS the navigation.
 */

import * as React from 'react';
import { Check, Copy, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/components/language-provider';
import { useCountryList } from '@/hooks/use-country';
import { getVisits } from '@/lib/passport';

export function Passport({ onVisit }: { onVisit?: (code: string) => void }) {
  const t = useT();
  const { data } = useCountryList();
  const countries = data?.countries ?? [];
  const [visits, setVisits] = React.useState<Record<string, string>>({});
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setVisits(getVisits());
  }, []);

  const visitedCount = countries.filter((c) => visits[c.code]).length;
  const total = countries.length || 250;
  // 1/250 is 0.4% — showing "0%" with a stamp in hand feels broken,
  // so any visited country shows at least 1%.
  const percent = visitedCount === 0 ? 0 : Math.max(1, Math.round((visitedCount / total) * 100));

  const regions = new Set(countries.filter((c) => visits[c.code] && c.region).map((c) => c.region as string));
  const allRegions = new Set(countries.map((c) => c.region).filter(Boolean) as string[]);

  const share = () => {
    const text = `🛂 ${t('passport.shareText', { count: visitedCount, total })}\nglobal-travel-dashboard.vercel.app`;
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* progress header */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Stamp className="size-4 text-amber-500" />
            {t('passport.progress', { count: visitedCount, total })}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {t('passport.regions', { count: regions.size, total: allRegions.size })}
          </p>
        </div>
        <span className="shrink-0 text-2xl font-bold tabular-nums text-amber-500">{percent}%</span>
      </div>

      {/* progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <Button size="sm" variant="outline" onClick={share} className="mx-auto gap-1.5">
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        {copied ? t('common.copied') : t('passport.share')}
      </Button>

      {/* 250-tile grid */}
      <div className="max-h-[46vh] overflow-y-auto rounded-xl border border-border/40 p-2.5">
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {countries.map((c) => {
            const visited = Boolean(visits[c.code]);
            return (
              <button
                key={c.code}
                type="button"
                title={c.name}
                onClick={() => onVisit?.(c.code)}
                className={
                  'flex aspect-square items-center justify-center rounded-md text-lg transition-all hover:scale-110 hover:ring-2 hover:ring-amber-400/60 ' +
                  (visited ? 'bg-amber-400/15 ring-1 ring-amber-400/40' : 'bg-muted/40 opacity-35 grayscale')
                }
              >
                <span className="leading-none">{c.flagEmoji ?? '🏳️'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">{t('passport.hint')}</p>
    </div>
  );
}
