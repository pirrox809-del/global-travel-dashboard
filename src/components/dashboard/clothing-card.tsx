'use client';

import { Shirt, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

type Content = NonNullable<CountryStatic['content']>;

/** Clothing card — what to wear paragraph + small taxes summary. */
export function ClothingCard({
  clothingAdvice,
  taxes,
}: {
  clothingAdvice: string;
  taxes: Content['taxes'];
}) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Shirt className="size-4 text-teal-600" />
          {t('card.clothing')}
        </CardTitle>
        <SourceBadge source="curated" />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90">{clothingAdvice}</p>

        {taxes ? (
          <div className="border-t pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Landmark className="size-3.5" />
                VAT · Corporate · Income
              </div>
              <SourceBadge source="llm · estimate" />
            </div>
            <div className="space-y-1">
              <Row label="VAT" value={taxes.vatRate} tone="emerald" />
              <Row label="Corporate" value={taxes.corporateTax} tone="amber" />
              <Row label="Income" value={taxes.incomeTax} tone="rose" />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'amber' | 'rose' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}
