'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { AmbientLight, DirectionalLight } from 'three';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

const Globe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 w-full items-center justify-center">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-sky-500/50" />
      </div>
    </div>
  ),
}) as React.ComponentType<
  GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }
>;

type CountryMarker = {
  lat: number;
  lng: number;
  size: number;
  color: string;
};

/**
 * CountryLocationGlobe — compact globe showing ONLY the country's
 * position with a pulsing/blinking marker. No other UI (no list,
 * no tooltip, no copy buttons) — just the globe + the blinking dot.
 *
 * Texture + globe style match the `InteractiveGlobeExplorer` UI
 * component (`/components/ui/interactive-globe-explorer.tsx`) — uses
 * the same blue-marble texture URL hosted on cdn.21st.dev.
 *
 * The "blinking" effect is implemented via react-globe.gl's
 * `ringsData` API: a ring expands outward from the country's
 * location, repeating every 1100ms — looks like a pulsing radar
 * blip. A static amber dot sits at the centre of the ring as the
 * persistent marker.
 *
 * Performance: the globe's internal rAF is paused when the globe is
 * scrolled offscreen via `pauseAnimation()` (saves ~16ms/frame of
 * main-thread work when the user is at the top or bottom of the
 * dashboard).
 */
export function CountryLocationGlobe({
  lat,
  lng,
  countryName,
}: {
  lat: number;
  lng: number;
  countryName: string;
}) {
  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState(300);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.min(el.clientWidth - 16, 360);
      setSize(Math.max(260, w));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  // Single static marker dot at the country's location.
  const markers: CountryMarker[] = [
    { lat, lng, size: 0.5, color: '#f59e0b' },
  ];

  // Pulsing ring — expands outward from the country's location,
  // repeating every 1100ms. This is the "blinking" effect.
  const ringsData = [
    {
      lat,
      lng,
      maxR: 4,
      propagationSpeed: 2.5,
      repeatPeriod: 1100,
      color: '#fbbf24',
    },
  ];

  const handleGlobeReady = React.useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Bright lighting — same 3-light setup as the previous CountryGlobe
    // so the blue-marble texture appears luminous instead of dim.
    globe.lights([
      new AmbientLight(0xffffff, 1.2),
      new DirectionalLight(0xffffff, 1.5),
      new DirectionalLight(0xfff5e6, 0.6),
    ]);

    globe.pointOfView({ lat, lng, altitude: 2.0 }, 1200);
    const controls = globe.controls();
    if (controls) {
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
    }

    // Pause the globe's internal rAF when offscreen — saves CPU when
    // the user is at the top or bottom of the dashboard.
    const container = containerRef.current;
    if (container && 'IntersectionObserver' in window) {
      const visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          const g = globeRef.current;
          if (!g) return;
          if (entry.isIntersecting) {
            g.resumeAnimation();
          } else {
            g.pauseAnimation();
          }
        },
        { threshold: 0, rootMargin: '50px' },
      );
      visibilityObserver.observe(container);
    }

    // Also pause when the tab is hidden.
    const onVisibilityChange = () => {
      const g = globeRef.current;
      if (!g) return;
      if (document.hidden) {
        g.pauseAnimation();
      } else {
        const rect = containerRef.current?.getBoundingClientRect();
        const inViewport = rect
          ? rect.bottom > 0 && rect.top < window.innerHeight
          : false;
        if (inViewport) g.resumeAnimation();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="relative flex w-full justify-center overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm py-2"
    >
      <div className="pointer-events-auto relative" style={{ width: size, height: size }}>
        {/* Soft sky-blue glow halo behind the globe. */}
        <div className="absolute inset-0 -z-10 blur-2xl">
          <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/15" />
        </div>
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          // Same texture URL as the InteractiveGlobeExplorer UI component.
          globeImageUrl="https://cdn.21st.dev/assets/localized/228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          // Amber atmospheric halo — matches the dashboard accent.
          atmosphereColor="#f59e0b"
          atmosphereAltitude={0.22}
          // Static marker dot at the country's location.
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.02}
          pointRadius="size"
          pointLabel={() => ''}
          // Pulsing ring — the "blinking" effect.
          ringsData={ringsData}
          ringColor="color"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          onGlobeReady={handleGlobeReady}
          enablePointerInteraction
          animateIn
        />
      </div>
    </div>
  );
}
