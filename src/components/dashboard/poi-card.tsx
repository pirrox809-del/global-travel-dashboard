'use client';

import { Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CountryStatic } from '@/lib/types';
import { SourceBadge } from './source-badge';

const CATEGORY_ICON: Record<string, string> = {
  historic: '🏛️',
  nature: '🏔️',
  museum: '🖼️',
  beach: '🏖️',
  religious: '⛩️',
  modern: '🏙️',
};

/** Must-see points of interest. */
export function PoiCard({ pois }: { pois: CountryStatic['pois'] }) {
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Landmark className="size-4 text-indigo-500" />
          Must-See Places
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        {pois.length === 0 ? (
          <p className="text-sm text-muted-foreground">No points of interest recorded.</p>
        ) : (
          <ul className="space-y-2.5 max-h-72 overflow-y-auto scroll-soft pr-1">
            {pois.map((p) => (
              <li key={p.id} className="flex gap-3 border-b last:border-0 pb-2.5 last:pb-0">
                <span className="text-lg leading-none mt-0.5">
                  {p.category ? CATEGORY_ICON[p.category] ?? '📍' : '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{p.name}</span>
                    {p.city ? (
                      <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                        {p.city}
                      </Badge>
                    ) : null}
                  </div>
                  {p.description ? (
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{p.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
