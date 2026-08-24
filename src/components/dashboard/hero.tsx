'use client';

import { CalendarClock, Globe2, Languages, MapPin, Phone, Ruler, Users, Clock, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CountryStatic } from '@/lib/types';
import { CountryGlobe } from './country-globe';

/**
 * Top hero: flag, name, tagline, metadata chips, and a small decorative
 * globe (desktop only) that marks the country's capital location.
 *
 * The globe is positioned absolutely on the right; on mobile it's hidden to
 * keep the hero compact and readable. The flag watermark stays as a subtle
 * texture, but the globe is the new "world" centerpiece tying into the
 * neural-noise backdrop.
 */
export function CountryHero({ country }: { country: CountryStatic }) {
  const languages = country.languages.slice(0, 4);
  const currencies = country.currencies.slice(0, 3);
  const population = country.population ? Number(country.population).toLocaleString('en-US') : null;
  const area = country.area ? Number(country.area).toLocaleString('en-US') : null;
  const hasCoords = country.latitude != null && country.longitude != null;

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-6 shadow-sm shadow-black/[0.03] backdrop-blur-xl sm:p-8">
      {/* Faint giant flag watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 select-none text-[12rem] leading-none opacity-[0.05]"
      >
        {country.flagEmoji ?? '🏳️'}
      </div>

      {/* 2-column layout on desktop: content left, decorative globe right. */}
      <div className="relative grid gap-6 lg:grid-cols-[1fr_minmax(0,260px)] lg:items-start lg:gap-8">
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
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {country.name}
              </h1>
              {country.officialName && country.officialName !== country.name ? (
                <p className="truncate text-sm text-muted-foreground">{country.officialName}</p>
              ) : null}
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
                Best time to visit: {country.content.bestTimeToVisit}
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Decorative globe marking the country's location (desktop only). */}
        {hasCoords ? (
          <div className="pointer-events-none relative mx-auto hidden aspect-square w-full max-w-[260px] lg:block">
            <CountryGlobe lat={country.latitude!} lng={country.longitude!} className="!max-w-none" />
            {/* radial vignette to fade globe edges into the card */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_55%,var(--card)_82%)]" />
          </div>
        ) : null}
      </div>

      {/* Metadata chips grid */}
      <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {country.region ? (
          <Meta icon={<Globe2 className="size-4" />} label="Region" value={[country.region, country.subregion].filter(Boolean).join(' · ')} />
        ) : null}
        {country.capital ? (
          <Meta icon={<MapPin className="size-4" />} label="Capital" value={country.capital} />
        ) : null}
        {population ? (
          <Meta icon={<Users className="size-4" />} label="Population" value={population} />
        ) : null}
        {area ? (
          <Meta icon={<Ruler className="size-4" />} label="Area" value={`${area} km²`} />
        ) : null}
        {languages.length ? (
          <Meta
            icon={<Languages className="size-4" />}
            label="Languages"
            value={languages.map((l) => l.name).join(', ')}
          />
        ) : null}
        {currencies.length ? (
          <Meta
            icon={<Coins className="size-4" />}
            label="Currency"
            value={currencies.map((c) => `${c.code} (${c.symbol ?? c.name})`).join(', ')}
          />
        ) : null}
        {country.callingCodes.length ? (
          <Meta icon={<Phone className="size-4" />} label="Calling code" value={country.callingCodes.join(', ')} />
        ) : null}
        {country.timezones.length ? (
          <Meta
            icon={<Clock className="size-4" />}
            label="Timezone"
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
