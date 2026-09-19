'use client';

import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Overview paragraph (LLM-generated, persisted in DB). */
export function OverviewCard({ content }: { content: NonNullable<CountryStatic['content']> }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BookOpen className="size-4 text-teal-600" />
          {t('card.overview')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{content.overview}</p>
      </CardContent>
    </Card>
  );
}
