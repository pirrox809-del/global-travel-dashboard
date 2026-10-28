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
        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-amber-500/50" />
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
 * CountryGlobe — compact interactive globe showing the country's position.
 * Smaller footprint, bigger marker, auto-rotates and centers on the country.
 *
 * Brightness fix: the previous implementation tried to use non-standard
 * props (`mapBrightness`, `diffuse`, `glowColor`, `glowCoefficient`,
 * `glowPower`, `glowRadiusScale`) — these are silently ignored by
 * react-globe.gl because they don't exist on the Globe component
 * (they belong to the lower-level `three-globe` package's GlowMesh).
 *
 * The actual brightness control in react-globe.gl happens via THREE.js
 * lights, accessed via `globeRef.current.lights(lightsArray)`. The
 * defaults are an AmbientLight + DirectionalLight both at ~50%
 * intensity — that's why the globe appeared dark even with the bright
 * blue-marble texture. Below we replace them with full-intensity lights
 * for a luminous, colorful globe.
 */
export function CountryGlobe({
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
      const w = Math.min(el.clientWidth - 16, 320);
      setSize(Math.max(240, w));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    return () => observer.disconnect();
  }, []);

  // Bigger marker + a pulsing ring marker for visibility.
  const markers: CountryMarker[] = [
    { lat, lng, size: 1.8, color: '#f59e0b' },
  ];

  const ringsData = [
    { lat, lng, maxR: 3, propagationSpeed: 2, repeatPeriod: 1200, color: '#f59e0b' },
  ];

  const handleGlobeReady = React.useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Boost lighting: replace the default dim 50% lights with
    // full-intensity ambient + directional lights, plus a second
    // directional light from a different angle to fill shadows.
    // This makes the blue-marble texture appear vibrant and luminous.
    globe.lights([
      new AmbientLight(0xffffff, 1.2), // bright overall fill
      new DirectionalLight(0xffffff, 1.5), // strong "sun" from front-top-right
      new DirectionalLight(0xfff5e6, 0.6), // warm fill from opposite side
    ]);

    globe.pointOfView({ lat, lng, altitude: 2.0 }, 1200);
    const controls = globe.controls();
    if (controls) {
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.35;
    }

    // Pause the globe's internal rAF loop when the globe is scrolled
    // offscreen. react-globe.gl renders at 60fps by default — that's
    // ~16ms/frame of main-thread work (drawing ~6.9k projected dots +
    // 255 land feature paths + graticule). When the user is at the top
    // of the dashboard (hero, photos, weather, overview, culture,
    // classification, food), the globe is offscreen but still burning
    // CPU. Pausing it via `pauseAnimation()` stops the rAF entirely
    // until the globe scrolls back into view.
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
        // Threshold 0 = trigger as soon as ANY part of the globe enters/leaves
        { threshold: 0, rootMargin: '50px' },
      );
      visibilityObserver.observe(container);
      // Cleanup is handled in the parent useEffect return.
    }

    // Also pause when the tab is hidden — saves CPU when the user
    // switches to another window.
    const onVisibilityChange = () => {
      const g = globeRef.current;
      if (!g) return;
      if (document.hidden) {
        g.pauseAnimation();
      } else {
        // Only resume if the globe is also visible on screen.
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
        <div className="absolute inset-0 -z-10 blur-2xl">
          <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/25" />
        </div>
        <Globe
          ref={globeRef}
          width={size}
          height={size}
          // Blue Marble: NASA's full-color daytime Earth texture —
          // bright blue oceans, green/brown continents, white clouds.
          // Much more luminous than the previous `earth-night.jpg`
          // (which is mostly black with city lights).
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          // Atmosphere halo — standard react-globe.gl props (the
          // previous `glowColor`/`glowCoefficient` were ignored).
          // Amber accent matches the dashboard theme; thicker halo
          // (0.25 vs default 0.15) for a more visible luminous ring.
          atmosphereColor="#f59e0b"
          atmosphereAltitude={0.22}
          pointsData={markers}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.02}
          pointRadius="size"
          pointLabel={() => ''}
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
