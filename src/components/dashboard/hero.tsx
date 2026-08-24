'use client';

import { CalendarClock, Globe2, Languages, MapPin, Phone, Ruler, Users, Clock, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CountryStatic } from '@/lib/types';

/** Top hero: flag, name, tagline, and a grid of metadata chips. */
export function CountryHero({ country }: { country: CountryStatic }) {
  const languages = country.languages.slice(0, 4);
  const currencies = country.currencies.slice(0, 3);
  const population = country.population ? Number(country.population).toLocaleString('en-US') : null;
  const area = country.area ? Number(country.area).toLocaleString('en-US') : null;

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
      {/* Faint giant flag watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 text-[12rem] leading-none opacity-[0.06] select-none"
      >
        {country.flagEmoji ?? '🏳️'}
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {country.flagUrl ? (
              <img
                src={country.flagUrl}
                alt={`Flag of ${country.name}`}
                className="size-14 rounded-lg object-cover shadow-sm ring-1 ring-border sm:size-16"
              />
            ) : (
              <span className="text-5xl sm:text-6xl">{country.flagEmoji ?? '🏳️'}</span>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl truncate">
                {country.name}
              </h1>
              {country.officialName && country.officialName !== country.name ? (
                <p className="text-sm text-muted-foreground truncate">{country.officialName}</p>
              ) : null}
            </div>
          </div>

          {country.content?.tagline ? (
            <p className="mt-4 max-w-2xl text-lg text-foreground/80 italic">
              “{country.content.tagline}”
            </p>
          ) : null}

          {country.content?.bestTimeToVisit ? (
            <div className="mt-4">
              <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/15">
                <CalendarClock className="size-3.5" />
                Best time to visit: {country.content.bestTimeToVisit}
              </Badge>
            </div>
          ) : null}
        </div>
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
    <div className="rounded-lg border bg-background/60 p-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug line-clamp-2">{value}</dd>
    </div>
  );
}
