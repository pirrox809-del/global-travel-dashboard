'use client';

import { useSyncExternalStore } from 'react';
import { Clock } from 'lucide-react';
import * as tzLookup from 'tz-lookup';

/**
 * LiveClock — displays the current time in the country's primary
 * timezone, with seconds (HH:MM:SS format). Updates every 1 second.
 *
 * Uses `useSyncExternalStore` so the snapshot is a primitive string
 * (referentially stable for the same value) — avoids hydration
 * mismatches and infinite re-render loops. Within the same second,
 * the same string is returned, so React skips re-rendering.
 *
 * Timezone selection strategy (most → least precise):
 *  0. CAPITAL_TIMEZONE_OVERRIDES — hardcoded for major multi-timezone
 *     countries whose centroid lands far from the capital (e.g.
 *     Russia → Europe/Moscow, US → America/New_York).
 *  1. tzLookup(lat, lng) — the IANA zone at the country's centroid.
 *  2. First IANA zone in the country's list.
 *  3. First UTC-offset string (e.g. "UTC+03:00").
 */
export function LiveClock({
  timezones,
  lat,
  lng,
  countryCode,
}: {
  timezones: string[];
  lat?: number | null;
  lng?: number | null;
  countryCode?: string;
}) {
  const zone = resolveZone(timezones, lat, lng, countryCode);
  const zoneLabel = zone.label;
  const ianaZone = zone.iana;
  const offsetZone = zone.offset;

  // The snapshot is the formatted time string ("14:32:05") — a primitive,
  // so `Object.is` compares by value. Within the same second the same
  // string is returned, so React skips re-rendering.
  const time = useSyncExternalStore(
    subscribe,
    () => formatTime(new Date(), ianaZone, offsetZone),
    () => '--:--:--',
  );

  if (!zoneLabel) return null;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={zoneLabel ? `Local time, ${zoneLabel}` : 'Local time'}
      className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-2 backdrop-blur-md"
    >
      <Clock className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="flex flex-col leading-none">
        <span className="font-mono text-lg font-bold tabular-nums tracking-tight">
          {time}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {zoneLabel}
        </span>
      </div>
    </div>
  );
}

type ResolvedZone = { iana?: string; offset?: string; label: string | null };

/**
 * For multi-timezone countries whose geographic centroid lands in a
 * sparsely-populated region (e.g. Russia → Siberia, Australia → outback),
 * prefer the timezone of the capital city instead.
 */
const CAPITAL_TIMEZONE_OVERRIDES: Record<string, string> = {
  RU: 'Europe/Moscow',
  US: 'America/New_York',
  CA: 'America/Toronto',
  AU: 'Australia/Sydney',
  MX: 'America/Mexico_City',
  BR: 'America/Sao_Paulo',
  CN: 'Asia/Shanghai',
  IN: 'Asia/Kolkata',
  ID: 'Asia/Jakarta',
  KZ: 'Asia/Almaty',
  CD: 'Africa/Kinshasa',
};

function resolveZone(
  timezones: string[],
  lat?: number | null,
  lng?: number | null,
  countryCode?: string,
): ResolvedZone {
  // 0. Capital override for specific multi-timezone countries.
  if (countryCode && CAPITAL_TIMEZONE_OVERRIDES[countryCode]) {
    const override = CAPITAL_TIMEZONE_OVERRIDES[countryCode];
    if (timezones.includes(override)) {
      return { iana: override, label: override };
    }
  }
  // 1. Geo-lookup from the country's centroid.
  if (typeof lat === 'number' && typeof lng === 'number') {
    try {
      const zone = tzLookup(lat, lng);
      if (zone) return { iana: zone, label: zone };
    } catch {
      // Fall through to the next strategy.
    }
  }
  // 2. First IANA zone in the country's list.
  const ianaZone = timezones.find((tz) => tz.includes('/'));
  if (ianaZone) return { iana: ianaZone, label: ianaZone };
  // 3. First UTC-offset string.
  const offsetZone = timezones.find((tz) => /^UTC[+-]\d/.test(tz));
  if (offsetZone) return { offset: offsetZone, label: offsetZone };
  return { label: null };
}

/** Subscribe to a 1-second tick — calls back whenever the second changes. */
function subscribe(callback: () => void): () => void {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

/**
 * Format `now` as `HH:MM:SS` in the given timezone. Returns '--:--:--'
 * when no usable timezone/offset is provided or on a formatting error.
 */
function formatTime(now: Date, ianaZone?: string, offsetZone?: string): string {
  try {
    if (ianaZone) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: ianaZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
    }
    if (offsetZone) {
      const m = /^UTC([+-])(\d{1,2}):?(\d{2})?$/.exec(offsetZone);
      if (m) {
        const sign = m[1] === '+' ? 1 : -1;
        const hours = parseInt(m[2], 10);
        const minutes = m[3] ? parseInt(m[3], 10) : 0;
        const offsetMs = sign * (hours * 60 + minutes) * 60_000;
        const shifted = new Date(now.getTime() + offsetMs);
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(shifted);
      }
    }
  } catch {
    // Fall through to placeholder.
  }
  return '--:--:--';
}
