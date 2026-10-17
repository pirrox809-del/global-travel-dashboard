'use client';

import { ShieldAlert, PawPrint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type Content = NonNullable<CountryStatic['content']>;

/** Safety card — crime brief paragraph + dangerous wildlife list. */
export function SafetyCard({
  crimeBrief,
  dangerousAnimals,
}: {
  crimeBrief: string;
  dangerousAnimals: Content['dangerousAnimals'];
}) {
  const t = useT();
  const animals = dangerousAnimals ?? [];
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldAlert className="size-4 text-rose-600" />
          {t('card.safety')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90">{crimeBrief}</p>

        {animals.length > 0 ? (
          <div className="border-t pt-3">
            <ul className="space-y-2">
              {animals.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug">
                  <PawPrint className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                  <span>
                    <span className="font-semibold text-foreground">{a.name}</span>
                    <span className="text-muted-foreground"> — {a.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
