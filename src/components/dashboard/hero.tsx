'use client';

import { CalendarClock, Globe2, Languages, MapPin, Phone, Ruler, Users, Clock, Coins, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CountryStatic } from '@/lib/types';
import { useLanguage } from '@/components/language-provider';
import { useFavorites } from '@/components/favorites-provider';
import { LiveClock } from './live-clock';

/**
 * Top hero: flag, name, tagline, and a grid of metadata chips.
 * Metadata labels are localized; the faint giant emoji flag stays as a
 * subtle texture watermark behind the glass card.
 */
export function CountryHero({ country }: { country: CountryStatic }) {
  const { t, trRegion } = useLanguage();
  const languages = country.languages.slice(0, 4);
  const currencies = country.currencies.slice(0, 3);
  const population = country.population ? Number(country.population).toLocaleString('en-US') : null;
  const area = country.area ? Number(country.area).toLocaleString('en-US') : null;

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm shadow-black/[0.03] backdrop-blur-xl sm:p-8">
      {/* Faint giant flag watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 select-none text-[12rem] leading-none opacity-[0.05]"
      >
        {country.flagEmoji ?? '🏳️'}
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {country.flagUrl ? (
              <img
                src={country.flagUrl}
                alt={`Flag of ${country.name}`}
                className="size-14 rounded-xl object-cover shadow-md ring-1 ring-border/60 sm:size-16"
              />
            ) : (
              <span className="text-5xl sm:text-6xl">{country.flagEmoji ?? '🏳️'}</span>
            )}
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {country.name}
                </h1>
                {country.officialName && country.officialName !== country.name ? (
                  <p className="truncate text-sm text-muted-foreground">{country.officialName}</p>
                ) : null}
              </div>
              {/* Favorite toggle — star icon, filled when favourited */}
              <FavoriteToggle code={country.code} />
            </div>
          </div>

          {country.content?.tagline ? (
            <p className="mt-4 max-w-2xl text-lg font-light italic text-foreground/80">
              &ldquo;{country.content.tagline}&rdquo;
            </p>
          ) : null}

          {country.content?.bestTimeToVisit ? (
            <div className="mt-4">
              <Badge
                variant="secondary"
                className="gap-1.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              >
                <CalendarClock className="size-3.5" />
                {t('hero.bestTime', { value: country.content.bestTimeToVisit })}
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Live local time — prominent, top-right of the hero.
            Shows HH:MM:SS (with seconds) in the country's primary
            timezone. Not a separate category — lives in the hero
            alongside the country name/flag. */}
        {country.timezones.length ? (
          <div aria-label={t('hero.localTime')} className="shrink-0 self-start">
            <LiveClock
              timezones={country.timezones}
              lat={country.latitude}
              lng={country.longitude}
              countryCode={country.code}
            />
          </div>
        ) : null}
      </div>

      {/* Metadata chips grid */}
      <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {country.region ? (
          <Meta icon={<Globe2 className="size-4" />} label={t('hero.region')} value={[trRegion(country.region), country.subregion].filter(Boolean).join(' · ')} />
        ) : null}
        {country.capital ? (
          <Meta icon={<MapPin className="size-4" />} label={t('hero.capital')} value={country.capital} />
        ) : null}
        {population ? (
          <Meta icon={<Users className="size-4" />} label={t('hero.population')} value={population} />
        ) : null}
        {area ? (
          <Meta icon={<Ruler className="size-4" />} label={t('hero.area')} value={`${area} km²`} />
        ) : null}
        {languages.length ? (
          <Meta
            icon={<Languages className="size-4" />}
            label={t('hero.languages')}
            value={languages.map((l) => l.name).join(', ')}
          />
        ) : null}
        {currencies.length ? (
          <Meta
            icon={<Coins className="size-4" />}
            label={t('hero.currency')}
            value={currencies.map((c) => `${c.code} (${c.symbol ?? c.name})`).join(', ')}
          />
        ) : null}
        {country.callingCodes.length ? (
          <Meta icon={<Phone className="size-4" />} label={t('hero.callingCode')} value={country.callingCodes.join(', ')} />
        ) : null}
        {country.timezones.length ? (
          <Meta
            icon={<Clock className="size-4" />}
            label={t('hero.timezone')}
            value={country.timezones.slice(0, 2).join(', ')}
          />
        ) : null}
      </dl>
    </section>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-3 backdrop-blur-md transition-colors hover:border-border hover:bg-background/70">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{value}</dd>
    </div>
  );
}

/** Star toggle for marking a country as favourite. Filled when favourited. */
function FavoriteToggle({ code }: { code: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(code);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(code)}
      aria-pressed={fav}
      aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
      title={fav ? 'Remove from favourites' : 'Add to favourites'}
      className="shrink-0 rounded-full p-1.5 transition-colors hover:bg-amber-500/10 focus-visible:outline-2 focus-visible:outline-amber-500"
    >
      <Star
        className={cn(
          'size-6 transition-colors',
          fav
            ? 'fill-amber-400 text-amber-400'
            : 'text-muted-foreground/40 hover:text-amber-400',
        )}
      />
    </button>
  );
}
