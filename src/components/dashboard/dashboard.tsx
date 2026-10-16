'use client';

import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCountry } from '@/hooks/use-country';
import { useT } from '@/components/language-provider';
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
import { PhotoCarouselCard } from './photo-carousel-card';
import { EmergencyCard } from './emergency-card';
import { EconomyCard } from './economy-card';
import { SafetyCard } from './safety-card';
import { QualityOfLifeCard } from './quality-of-life-card';
import { ClothingCard } from './clothing-card';
import { DashboardSkeleton } from './skeletons';

/**
 * Orchestrator: takes a country code, calls the aggregator, and renders
 * the full dashboard. Handles loading / error / success states cleanly.
 */
export function Dashboard({ code }: { code: string }) {
  const t = useT();
  const { data, isLoading, isError, error, refetch, isFetching } = useCountry(code);

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>{t('dash.errorTitle')}</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span className="text-sm">{(error as Error)?.message ?? t('dash.unknownError')}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="size-3.5" /> {t('dash.retry')}
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
  const t = useT();
  const { country, dynamic, meta } = data;
  return (
    <div className="space-y-6">
      {meta.staticContentGenerated ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <Sparkles className="size-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700 dark:text-emerald-300">
            {t('dash.justCurated.title')}
          </AlertTitle>
          <AlertDescription className="text-xs">
            {t('dash.justCurated.body')}
          </AlertDescription>
        </Alert>
      ) : null}

      <CountryHero country={country} />

      {/* Real photos from Wikipedia — polaroid carousel */}
      <PhotoCarouselCard photos={dynamic.photos} />

      {/* Live data row (3 cards) — staggered cascade entrance */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <WeatherCard weather={dynamic.weather} />
        <ExchangeCard exchange={dynamic.exchange} />
        <AdvisoryCard advisory={dynamic.advisory} />
      </div>

      {/* Overview full width */}
      {country.content ? <OverviewCard content={country.content} /> : null}

      {/* Culture + unwritten rules (2 columns) */}
      {country.content ? <CultureCard content={country.content} /> : null}

      {/* Food + POI + Price (3 columns) — staggered cascade entrance */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FoodCard foods={country.foods} />
        <PoiCard pois={country.pois} />
        {country.priceEstimate ? <PriceCard estimate={country.priceEstimate} /> : null}
      </div>

      {/* Emergency + Economy + Safety (3 columns) — staggered cascade entrance */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {country.content?.emergencyNumbers ? (
          <EmergencyCard numbers={country.content.emergencyNumbers} />
        ) : null}
        <EconomyCard economy={dynamic.economy} />
        {country.content?.crimeBrief ? (
          <SafetyCard crimeBrief={country.content.crimeBrief} dangerousAnimals={country.content.dangerousAnimals} />
        ) : null}
      </div>

      {/* Quality of life + Clothing (2 columns) — staggered cascade entrance */}
      <div className="stagger grid gap-4 md:grid-cols-2">
        {country.content?.qualityOfLife ? (
          <QualityOfLifeCard qualityOfLife={country.content.qualityOfLife} />
        ) : null}
        {country.content?.clothingAdvice ? (
          <ClothingCard clothingAdvice={country.content.clothingAdvice} taxes={country.content.taxes} />
        ) : null}
      </div>

      {/* Refresh + cache meta — refined glass */}
      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-4 py-2.5 text-xs text-muted-foreground backdrop-blur-xl">
        <span>
          {t('dash.generated')} {new Date(meta.generatedAt).toLocaleTimeString()} · {t('dash.cacheHits')} {meta.cache.hits} / {t('dash.cacheMisses')} {meta.cache.misses} · {meta.cache.size} {t('dash.cacheKeys')}
        </span>
        <Button size="sm" variant="ghost" onClick={onRefetch} disabled={refetching} className="h-7 gap-1.5">
          <RefreshCw className={`size-3.5 ${refetching ? 'animate-spin' : ''}`} />
          {refetching ? t('dash.refreshing') : t('dash.refresh')}
        </Button>
      </div>
    </div>
  );
}
