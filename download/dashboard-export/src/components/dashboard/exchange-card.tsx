'use client';

import { Euro } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CountryDynamic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Live ECB exchange-rate card (Frankfurter API). */
export function ExchangeCard({ exchange }: { exchange: CountryDynamic['exchange'] }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Euro className="size-4 text-emerald-600" />
          {t('card.exchange')}
        </CardTitle>
        <SourceBadge source="frankfurter · ECB" />
      </CardHeader>
      <CardContent>
        {'error' in exchange ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-3xl">💱</span>
            <p className="mt-2 text-sm text-muted-foreground">
              {exchange.currency ? t('exchange.notOnList', { currency: exchange.currency }) : t('exchange.unavailable')}
            </p>
            <Badge variant="outline" className="mt-2 text-[10px] font-normal opacity-70 max-w-full truncate">
              {exchange.error}
            </Badge>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">1 {exchange.currency}</span>
              <span className="text-sm text-muted-foreground">=</span>
            </div>
            <div className="mt-3 space-y-2">
              <RateRow base="EUR" amount={exchange.perEur} />
              <RateRow base="USD" amount={exchange.perUsd} />
              <RateRow base="GBP" amount={exchange.perGbp} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t('exchange.ecbRate', { date: exchange.date })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RateRow({ base, amount }: { base: string; amount: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5">
      <span className="text-sm font-medium">{base}</span>
      <span className="text-sm tabular-nums">
        {amount.toLocaleString('en-US', { maximumFractionDigits: amount < 1 ? 4 : 2 })}
      </span>
    </div>
  );
}
