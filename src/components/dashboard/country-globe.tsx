'use client';

import { useMemo } from 'react';
import { Globe } from '@/components/ui/globe';
import type { COBEOptions } from 'cobe';

/**
 * A small, decorative globe for the dashboard hero that highlights the
 * selected country with a marker (and a larger glow marker at its capital).
 *
 * The globe auto-rotates slowly; the user can drag to spin it. We DON'T try
 * to lock rotation onto the country — that would fight cobe's autorotate and
 * feel jittery. Instead we just add a prominent marker so the country is
 * clearly visible as the globe turns.
 *
 * `lat`/`lng` come from the country's capital (REST Countries latlng field).
 */
export function CountryGlobe({
  lat,
  lng,
  className,
}: {
  lat: number | null;
  lng: number | null;
  className?: string;
}) {
  const config = useMemo<COBEOptions>(() => {
    // Default world markers (a few iconic cities) for visual richness, plus
    // the selected country as a bigger, brighter marker.
    const baseMarkers = [
      { location: [40.7128, -74.006], size: 0.04 },
      { location: [35.6762, 139.6503], size: 0.04 },
      { location: [51.5074, -0.1278], size: 0.04 },
      { location: [-33.8688, 151.2093], size: 0.04 },
      { location: [-22.9068, -43.1729], size: 0.04 },
    ];
    const countryMarker =
      lat != null && lng != null
        ? [{ location: [lat, lng], size: 0.1 }]
        : [];
    return {
      width: 800,
      height: 800,
      onRender: () => {},
      devicePixelRatio: 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [1, 1, 1],
      markerColor: [251 / 255, 100 / 255, 21 / 255],
      glowColor: [1, 0.85, 0.6],
      markers: [...baseMarkers, ...countryMarker],
    } as COBEOptions;
  }, [lat, lng]);

  return <Globe className={className} config={config} />;
}
