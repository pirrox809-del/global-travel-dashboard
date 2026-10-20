'use client';

import { AlertCircle, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountry } from '@/hooks/use-country';
import { useT } from '@/components/language-provider';
import type { AggregatedCountry } from '@/lib/types';

import { CountryHero } from './hero';
import { WeatherCard } from './weather-card';
import { ExchangeCard } from './exchange-card';
import { AdvisoryCard } from './advisory-card';
import { OverviewCard } from './overview-card';
import { CultureCard } from './culture-card';
import { CountryLocationGlobe } from './country-location-globe';
import { FoodCard } from './food-card';
import { PoiCard } from './poi-card';
import { PriceCard } from './price-card';
import { PhotoCarouselCard } from './photo-carousel-card';
import { EmergencyCard } from './emergency-card';
import { EconomyCard } from './economy-card';
import { SafetyCard } from './safety-card';
import { QualityOfLifeCard } from './quality-of-life-card';
import { ClothingCard } from './clothing-card';
import { SeismicCard } from './seismic-card';
import { InternetCard } from './internet-card';
import { MediaCard } from './media-card';
import { FamousPeopleCard } from './famous-people-card';
import { DashboardSearch } from './dashboard-search';
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
  const generating = meta.contentGenerating;
  const hasContent = !!country.content;
  return (
    <div className="space-y-6">
      {/* Generating banner — shown while LLM content is being created */}
      {generating ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <Loader2 className="size-4 animate-spin text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-300">
            Generating travel brief…
          </AlertTitle>
          <AlertDescription className="text-xs">
            Live data is ready below. Local info (culture, food, safety, etc.) is being compiled and will appear automatically in ~15s.
          </AlertDescription>
        </Alert>
      ) : meta.staticContentGenerated ? (
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

      {/* Mini category search bar — sticky under the header + country
          selector so it stays accessible while scrolling the dashboard.
          Type a category name (e.g. "weather", "emergency") and click
          to jump straight to that section — no manual scrolling needed. */}
      <div className="sticky top-[108px] z-30 pb-1">
        <DashboardSearch />
      </div>

      {/* Real photos from Wikipedia — polaroid carousel */}
      <div data-card="photos">
        <PhotoCarouselCard photos={dynamic.photos} />
      </div>

      {/* Live data row (3 cards) — always available immediately */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div data-card="weather"><WeatherCard weather={dynamic.weather} /></div>
        <div data-card="exchange"><ExchangeCard exchange={dynamic.exchange} /></div>
        <div data-card="advisory"><AdvisoryCard advisory={dynamic.advisory} /></div>
      </div>

      {/* Overview full width */}
      <div data-card="overview">
        {hasContent && country.content ? <OverviewCard content={country.content} /> : generating ? <ContentSkeleton height="h-32" /> : null}
      </div>

      {/* Culture + unwritten rules (2 columns) */}
      <div data-card="culture">
        {hasContent && country.content ? <CultureCard content={country.content} /> : generating ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ContentSkeleton height="h-48" />
            <ContentSkeleton height="h-48" />
          </div>
        ) : null}
      </div>

      {/* Food + POI + Price (3 columns) */}
      <div data-card="food">
        {hasContent ? (
          <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FoodCard foods={country.foods} />
            <PoiCard pois={country.pois} />
            {country.priceEstimate ? <PriceCard estimate={country.priceEstimate} /> : null}
          </div>
        ) : generating ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ContentSkeleton height="h-64" />
            <ContentSkeleton height="h-64" />
            <ContentSkeleton height="h-64" />
          </div>
        ) : null}
      </div>

      {/* Interactive globe — shows the country's location as a
          pulsing/blinking amber dot. Centred around the middle of the
          dashboard. No other UI — just the globe + the blinking marker. */}
      <div data-card="globe">
        {country.latitude != null && country.longitude != null ? (
          <div className="flex justify-center py-1">
            <CountryLocationGlobe
              lat={country.latitude}
              lng={country.longitude}
              countryName={country.name}
            />
          </div>
        ) : null}
      </div>

      {/* Emergency + Economy + Safety (3 columns) — Economy is always real */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div data-card="emergency">
          {hasContent && country.content?.emergencyNumbers ? (
            <EmergencyCard numbers={country.content.emergencyNumbers} />
          ) : generating ? <ContentSkeleton height="h-40" /> : null}
        </div>
        <div data-card="economy"><EconomyCard economy={dynamic.economy} /></div>
        <div data-card="safety">
          {hasContent && country.content?.crimeBrief ? (
            <SafetyCard crimeBrief={country.content.crimeBrief} dangerousAnimals={country.content.dangerousAnimals} />
          ) : generating ? <ContentSkeleton height="h-40" /> : null}
        </div>
      </div>

      {/* Quality of life + Clothing (2 columns) */}
      <div className="stagger grid gap-4 md:grid-cols-2">
        <div data-card="qualityOfLife">
          {hasContent && country.content?.qualityOfLife ? (
            <QualityOfLifeCard qualityOfLife={country.content.qualityOfLife} />
          ) : generating ? <ContentSkeleton height="h-32" /> : null}
        </div>
        <div data-card="clothing">
          {hasContent && country.content?.clothingAdvice ? (
            <ClothingCard clothingAdvice={country.content.clothingAdvice} taxes={country.content.taxes} />
          ) : generating ? <ContentSkeleton height="h-32" /> : null}
        </div>
      </div>

      {/* Seismic + Internet + Media (3 columns) — Seismic is always real */}
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div data-card="seismic">
          {!('error' in dynamic.earthquakes) || country.content?.naturalDisasterRisk ? (
            <SeismicCard
              earthquakes={dynamic.earthquakes}
              naturalDisasterRisk={country.content?.naturalDisasterRisk ?? null}
            />
          ) : generating ? <ContentSkeleton height="h-48" /> : null}
        </div>
        <div data-card="internet">
          {hasContent && country.content?.internetQuality ? (
            <InternetCard internetQuality={country.content.internetQuality} />
          ) : generating ? <ContentSkeleton height="h-48" /> : null}
        </div>
        <div data-card="media">
          {hasContent && country.content?.tvChannels?.length ? (
            <MediaCard channels={country.content.tvChannels} />
          ) : generating ? <ContentSkeleton height="h-48" /> : null}
        </div>
      </div>

      {/* Famous people — full width below */}
      <div data-card="famousPeople">
        {hasContent && country.content?.famousPeople?.length ? (
          <FamousPeopleCard people={country.content.famousPeople} />
        ) : generating ? <ContentSkeleton height="h-40" /> : null}
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

/** Skeleton placeholder for LLM-content cards while they're being generated. */
function ContentSkeleton({ height = 'h-40' }: { height?: string }) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`${height} w-full rounded-lg`} />
      </CardContent>
    </Card>
  );
}
