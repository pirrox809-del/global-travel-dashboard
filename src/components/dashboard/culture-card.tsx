'use client';

import { Sparkles, ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Culture + Unwritten rules side by side (or stacked on mobile). */
export function CultureCard({ content }: { content: NonNullable<CountryStatic['content']> }) {
  const t = useT();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="animate-card-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-violet-500" />
            {t('card.culture')}
          </CardTitle>
          <SourceBadge source="curated" />
        </CardHeader>
        <CardContent>
          <BulletList markdown={content.culture} accent="violet" />
        </CardContent>
      </Card>

      <Card className="animate-card-in border-amber-500/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <ScrollText className="size-4 text-amber-500" />
            {t('card.unwrittenRules')}
          </CardTitle>
          <SourceBadge source="curated" />
        </CardHeader>
        <CardContent>
          <BulletList markdown={content.unwrittenRules} accent="amber" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Render a "- bullet\n- bullet" markdown string as a styled list. */
function BulletList({ markdown, accent }: { markdown: string; accent: 'violet' | 'amber' }) {
  const bullets = markdown
    .split('\n')
    .map((l) => l.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean);
  const dot = accent === 'violet' ? 'bg-violet-500' : 'bg-amber-500';
  return (
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="text-foreground/90">{b}</span>
        </li>
      ))}
    </ul>
  );
}
