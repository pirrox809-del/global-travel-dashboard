'use client';

import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type FamousPerson = NonNullable<NonNullable<CountryStatic['content']>['famousPeople']>[number];

/** Famous-people card — clean 2-column grid of name + profession (LLM-curated).
 *  Collapses to a single column on mobile; scrolls if more than 5 people. */
export function FamousPeopleCard({ people }: { people: FamousPerson[] }) {
  const t = useT();
  if (!people || people.length === 0) return null;

  const needsScroll = people.length > 5;

  const list = (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {people.map((p, i) => (
        <li key={i} className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{p.name}</span>
          <span className="text-xs text-muted-foreground">{p.profession}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Star className="size-4 text-amber-500" />
          {t('card.famousPeople')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        {needsScroll ? <div className="max-h-80 overflow-y-auto scroll-soft">{list}</div> : list}
      </CardContent>
    </Card>
  );
}
