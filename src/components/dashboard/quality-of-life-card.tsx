'use client';

import { HeartPulse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Quality of life card — short paragraph (LLM-curated). */
export function QualityOfLifeCard({ qualityOfLife }: { qualityOfLife: string }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <HeartPulse className="size-4 text-rose-500" />
          {t('card.qualityOfLife')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{qualityOfLife}</p>
      </CardContent>
    </Card>
  );
}
