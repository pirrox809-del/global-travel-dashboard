'use client';

import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCountry } from '@/hooks/use-country';
import type { AggregatedCountry } from '@/lib/types';

import { CountryHero } from './hero';
import { WeatherCard } from './weather-card';
import { ExchangeCard } from './exchange-card';
import { AdvisoryCard } from './advisory-card';
import { OverviewCard } from './overview-card';
import { CultureCard } from './culture-card';
import { FoodCard } from './food-card';
import { PoiCard } from './poi-card';
import { PriceCard } from './price-card';
import { DashboardSkeleton } from './skeletons';

/**
 * Orchestrator: takes a country code, calls the aggregator, and renders
 * the full dashboard. Handles loading / error / success states cleanly.
 *
 * The "first-time generation" banner is shown when `meta.staticContentGenerated`
 * is true — meaning we just paid the one-time LLM cost for this country.
 */
export function Dashboard({ code }: { code: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useCountry(code);

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Couldn’t load this country</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span className="text-sm">{(error as Error)?.message ?? 'Unknown error'}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <DashboardContent data={data} refetching={isFetching} onRefetch={() => refetch()} />;
}

function DashboardContent({
  data,
  refetching,
  onRefetch,
}: {
  data: AggregatedCountry;
  refetching: boolean;
  onRefetch: () => void;
}) {
  const { country, dynamic, meta } = data;
  return (
    <div className="space-y-6">
      {meta.staticContentGenerated ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <Sparkles className="size-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700 dark:text-emerald-300">
            Just curated for you
          </AlertTitle>
          <AlertDescription className="text-xs">
            This country&apos;s travel brief was generated on-the-fly and cached. Future visits will be instant.
          </AlertDescription>
        </Alert>
      ) : null}

      <CountryHero country={country} />

      {/* Live data row (3 cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <WeatherCard weather={dynamic.weather} />
        <ExchangeCard exchange={dynamic.exchange} />
        <AdvisoryCard advisory={dynamic.advisory} />
      </div>

      {/* Overview full width */}
      {country.content ? <OverviewCard content={country.content} /> : null}

      {/* Culture + unwritten rules (2 columns) */}
      {country.content ? <CultureCard content={country.content} /> : null}

      {/* Food + POI + Price (3 columns) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FoodCard foods={country.foods} />
        <PoiCard pois={country.pois} />
        {country.priceEstimate ? <PriceCard estimate={country.priceEstimate} /> : null}
      </div>

      {/* Refresh + cache meta */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          Generated {new Date(meta.generatedAt).toLocaleTimeString('en-US')} · cache {meta.cache.hits} hits / {meta.cache.misses} misses · {meta.cache.size} keys
        </span>
        <Button size="sm" variant="ghost" onClick={onRefetch} disabled={refetching} className="h-7 gap-1.5">
          <RefreshCw className={`size-3.5 ${refetching ? 'animate-spin' : ''}`} />
          {refetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}
