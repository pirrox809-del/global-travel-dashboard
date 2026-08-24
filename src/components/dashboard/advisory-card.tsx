'use client';

import { ShieldCheck, ShieldAlert, TriangleAlert, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CountryDynamic } from '@/lib/types';
import { SourceBadge } from './source-badge';

const LEVEL_STYLES: Record<number, { ring: string; badge: string; icon: React.ReactNode; text: string }> = {
  1: {
    ring: 'border-emerald-500/40',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    icon: <ShieldCheck className="size-4 text-emerald-600" />,
    text: 'Exercise normal precautions',
  },
  2: {
    ring: 'border-amber-500/40',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    icon: <ShieldAlert className="size-4 text-amber-500" />,
    text: 'Exercise increased caution',
  },
  3: {
    ring: 'border-orange-500/40',
    badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    icon: <TriangleAlert className="size-4 text-orange-500" />,
    text: 'Reconsider travel',
  },
  4: {
    ring: 'border-rose-500/50',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    icon: <TriangleAlert className="size-4 text-rose-500" />,
    text: 'Do not travel',
  },
};

/**
 * Travel advisory card. Three data sources, rendered transparently:
 *  1. us-state-dept — live official advisory with severity level 1-4.
 *  2. ai-brief      — LLM-generated safety brief, used when the live API is
 *                     unreachable. Clearly labelled so the user knows.
 *  3. error         — nothing available.
 */
export function AdvisoryCard({ advisory }: { advisory: CountryDynamic['advisory'] }) {
  const liveLevel = advisory.source === 'us-state-dept' ? advisory.level : null;
  const style = liveLevel ? LEVEL_STYLES[liveLevel] : null;

  return (
    <Card className={cn('animate-card-in', style?.ring)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="size-4 text-primary" />
          Travel Advisory
        </CardTitle>
        <SourceBadge source={advisory.source === 'us-state-dept' ? 'us-state-dept' : advisory.source === 'ai-brief' ? 'ai · curated' : 'unavailable'} />
      </CardHeader>
      <CardContent>
        {advisory.source === 'us-state-dept' && style ? (
          <div>
            <Badge className={cn('gap-1.5', style.badge)}>
              {style.icon}
              Level {advisory.level}
            </Badge>
            <p className="mt-3 text-sm font-medium">{style.text}</p>
            {advisory.message ? (
              <p className="mt-2 max-h-40 overflow-y-auto scroll-soft text-xs text-muted-foreground leading-relaxed">
                {advisory.message}
              </p>
            ) : null}
            {advisory.updatedAt ? (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Updated {new Date(advisory.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            ) : null}
          </div>
        ) : advisory.source === 'ai-brief' ? (
          <div>
            <Badge className="gap-1.5 bg-violet-500/15 text-violet-700 dark:text-violet-300">
              <Bot className="size-3.5" />
              AI Safety Brief
            </Badge>
            <p className="mt-2 text-[11px] text-muted-foreground italic">
              Live advisory API unavailable — showing curated AI brief.
            </p>
            <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{advisory.brief}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-3xl">🛂</span>
            <p className="mt-2 text-sm text-muted-foreground">No advisory data</p>
            <Badge variant="outline" className="mt-2 text-[10px] font-normal opacity-70 max-w-full truncate">
              {advisory.error}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
