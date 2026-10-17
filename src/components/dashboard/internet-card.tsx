'use client';

import { Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Internet card — short paragraph on broadband/4G/5G coverage (LLM-curated). */
export function InternetCard({ internetQuality }: { internetQuality: string }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Wifi className="size-4 text-cyan-600" />
          {t('card.internet')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{internetQuality}</p>
      </CardContent>
    </Card>
  );
}
