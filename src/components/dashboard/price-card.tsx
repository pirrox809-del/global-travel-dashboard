'use client';

import { Hotel, Plane, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CountryStatic } from '@/lib/types';
import { SourceBadge } from './source-badge';

/**
 * Price estimates card.
 *
 * NOTE: There is NO free live hotel/flight API. These ranges are
 * LLM-generated regional estimates, persisted in our DB. They are clearly
 * labelled "estimates" in the UI to set correct expectations.
 */
export function PriceCard({ estimate }: { estimate: NonNullable<CountryStatic['priceEstimate']> }) {
  return (
    <Card className="animate-card-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Hotel className="size-4 text-cyan-600" />
          Price Estimates
        </CardTitle>
        <SourceBadge source="llm · estimate" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Section icon={<Hotel className="size-3.5" />} label="Hotels (per night)">
          <Row label="Budget" value={`${estimate.budgetHotelEur} €`} tone="emerald" />
          <Row label="Mid-range" value={`${estimate.midHotelEur} €`} tone="amber" />
          <Row label="Luxury" value={`${estimate.luxuryHotelEur} €`} tone="rose" />
        </Section>
        <Section icon={<Plane className="size-3.5" />} label="Flights">
          <Row label="Round-trip from EU" value={`${estimate.flightFromEuEur} €`} tone="cyan" />
        </Section>
        <Section icon={<UtensilsCrossed className="size-3.5" />} label="Meals">
          <Row label="Street / budget" value={`${estimate.mealBudgetEur} €`} tone="emerald" />
          <Row label="Mid restaurant" value={`${estimate.mealMidEur} €`} tone="amber" />
        </Section>
        {estimate.notes ? (
          <p className="text-xs text-muted-foreground italic border-t pt-2">{estimate.notes}</p>
        ) : null}
        <p className="text-[10px] text-muted-foreground/70">
          Ranges are regional estimates (LLM-generated), not live booking data.
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
