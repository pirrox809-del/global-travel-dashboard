'use client';

import { Hotel, Plane, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { useT } from '@/components/language-provider';
import { SourceBadge } from './source-badge';

/** Price estimates card. Ranges are LLM-generated regional estimates. */
export function PriceCard({ estimate }: { estimate: NonNullable<CountryStatic['priceEstimate']> }) {
  const t = useT();
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Hotel className="size-4 text-cyan-600" />
          {t('card.price')}
        </CardTitle>
        <SourceBadge source="llm · estimate" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Section icon={<Hotel className="size-3.5" />} label={t('price.hotelsPerNight')}>
          <Row label={t('price.budget')} value={`${estimate.budgetHotelEur} €`} tone="emerald" />
          <Row label={t('price.midRange')} value={`${estimate.midHotelEur} €`} tone="amber" />
          <Row label={t('price.luxury')} value={`${estimate.luxuryHotelEur} €`} tone="rose" />
        </Section>
        <Section icon={<Plane className="size-3.5" />} label={t('price.flights')}>
          <Row label={t('price.roundTripEu')} value={`${estimate.flightFromEuEur} €`} tone="cyan" />
        </Section>
        <Section icon={<UtensilsCrossed className="size-3.5" />} label={t('price.meals')}>
          <Row label={t('price.streetBudget')} value={`${estimate.mealBudgetEur} €`} tone="emerald" />
          <Row label={t('price.midRestaurant')} value={`${estimate.mealMidEur} €`} tone="amber" />
        </Section>
        {estimate.notes ? (
          <p className="text-xs text-muted-foreground italic border-t pt-2">{estimate.notes}</p>
        ) : null}
        <p className="text-[10px] text-muted-foreground/70">
          {t('price.disclaimer')}
        </p>
      </CardContent>
    </Card>
  );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {icon}
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'amber' | 'rose' | 'cyan' }) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  );
}
