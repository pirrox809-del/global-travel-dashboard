"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-ping rounded-full bg-sky-400/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-sky-500/50" />
      </div>
    </div>
  ),
}) as React.ComponentType<
  GlobeProps & { ref?: React.MutableRefObject<GlobeMethods | undefined> }
>;

export type GlobeLocation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  email: string;
};

const DEFAULT_LOCATIONS: GlobeLocation[] = [
  {
    id: "1",
    name: "Milan",
    lat: 45.4642,
    lng: 9.19,
    address: "123 Via Milano, Milan 20121, IT",
    email: "hello@nexus-ui.com",
  },
  {
    id: "2",
    name: "Cape Town",
    lat: -33.9249,
    lng: 18.4241,
    address: "456 Table Mountain Rd, Cape Town 8001, ZA",
    email: "hello@nexus-ui.com",
  },
  {
    id: "3",
    name: "New York",
    lat: 40.7128,
    lng: -74.006,
    address: "789 Broadway, New York NY 10003, US",
    email: "hello@nexus-ui.com",
  },
  {
    id: "4",
    name: "London",
    lat: 51.5074,
    lng: -0.1278,
    address: "2 Bedford Gardens, London W8 7EH, UK",
    email: "hello@nexus-ui.com",
  },
  {
    id: "5",
    name: "Johannesburg",
    lat: -26.2041,
    lng: 28.0473,
    address: "321 Nelson Mandela Square, Johannesburg 2196, ZA",
    email: "hello@nexus-ui.com",
  },
  {
    id: "6",
    name: "Tokyo",
    lat: 35.6762,
    lng: 139.6503,
    address: "1-1-1 Shibuya, Tokyo 150-0002, JP",
    email: "hello@nexus-ui.com",
  },
  {
    id: "7",
    name: "Paris",
    lat: 48.8566,
    lng: 2.3522,
    address: "5 Avenue des Champs-Elysees, Paris 75008, FR",
    email: "hello@nexus-ui.com",
  },
  {
    id: "8",
    name: "Sydney",
    lat: -33.8688,
    lng: 151.2093,
    address: "100 George Street, Sydney NSW 2000, AU",
    email: "hello@nexus-ui.com",
  },
  {
    id: "9",
    name: "Dubai",
    lat: 25.2048,
    lng: 55.2708,
    address: "Sheikh Zayed Road, Dubai, AE",
    email: "hello@nexus-ui.com",
  },
  {
    id: "10",
    name: "Singapore",
    lat: 1.3521,
    lng: 103.8198,
    address: "1 Marina Boulevard, Singapore 018989, SG",
    email: "hello@nexus-ui.com",
  },
  {
    id: "11",
    name: "Mumbai",
    lat: 19.076,
    lng: 72.8777,
    address: "Nariman Point, Mumbai 400021, IN",
    email: "hello@nexus-ui.com",
  },
  {
    id: "12",
    name: "Sao Paulo",
    lat: -23.5505,
    lng: -46.6333,
    address: "Avenida Paulista, Sao Paulo 01310-100, BR",
    email: "hello@nexus-ui.com",
  },
  {
    id: "13",
    name: "Toronto",
    lat: 43.6532,
    lng: -79.3832,
    address: "100 Queen Street, Toronto ON M5H 2N2, CA",
    email: "hello@nexus-ui.com",
  },
  {
    id: "14",
    name: "Berlin",
    lat: 52.52,
    lng: 13.405,
    address: "Unter den Linden 77, Berlin 10117, DE",
    email: "hello@nexus-ui.com",
  },
  {
    id: "15",
    name: "Hong Kong",
    lat: 22.3193,
    lng: 114.1694,
    address: "1 Harbour Road, Hong Kong, HK",
    email: "hello@nexus-ui.com",
  },
  {
    id: "16",
    name: "Los Angeles",
    lat: 34.0522,
    lng: -118.2437,
    address: "100 Wilshire Blvd, Los Angeles CA 90012, US",
    email: "hello@nexus-ui.com",
  },
  {
    id: "17",
    name: "Barcelona",
    lat: 41.3851,
    lng: 2.1734,
    address: "Passeig de Gracia, Barcelona 08007, ES",
    email: "hello@nexus-ui.com",
  },
  {
    id: "18",
    name: "Amsterdam",
    lat: 52.3676,
    lng: 4.9041,
    address: "Dam Square 1, Amsterdam 1012 JS, NL",
    email: "hello@nexus-ui.com",
  },
  {
    id: "19",
    name: "Seoul",
    lat: 37.5665,
    lng: 126.978,
    address: "Gangnam-gu, Seoul 06236, KR",
    email: "hello@nexus-ui.com",
  },
  {
    id: "20",
    name: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    address: "Taksim Square, Istanbul 34437, TR",
    email: "hello@nexus-ui.com",
  },
];

export type InteractiveGlobeExplorerProps = {
  locations?: GlobeLocation[];
  initialLocationId?: string;
  globeTextureUrl?: string;
  className?: string;
};

type TooltipPosition = {
  x: number;
  y: number;
  mobile: boolean;
};

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState(420);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = Math.min(el.clientWidth, el.clientHeight, 560);
      setSize(Math.max(280, next || 420));
    };

    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();

    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function InteractiveGlobeExplorer({
  locations = DEFAULT_LOCATIONS,
  initialLocationId,
  globeTextureUrl = "https://cdn.21st.dev/assets/localized/228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01.jpg",
  className,
}: InteractiveGlobeExplorerProps) {
  const initialLocation =
    locations.find((location) => location.id === initialLocationId) ??
    locations[3] ??
    locations[0];

  const globeRef = React.useRef<GlobeMethods | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const locationRefs = React.useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const isScrollingProgrammatically = React.useRef(false);
  const globeSize = useElementSize(containerRef);

  const [selectedLocation, setSelectedLocation] =
    React.useState<GlobeLocation | null>(null);
  const [activeLocationId, setActiveLocationId] = React.useState(
    initialLocation.id,
  );
  const [tooltipPosition, setTooltipPosition] = React.useState<TooltipPosition>(
    { x: 0, y: 0, mobile: false },
  );
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const focusGlobe = React.useCallback((location: GlobeLocation, ms = 800) => {
    globeRef.current?.pointOfView(
      { lat: location.lat, lng: location.lng, altitude: 2.5 },
      ms,
    );
  }, []);

  const handleGlobeReady = React.useCallback(() => {
    focusGlobe(initialLocation, 1000);
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.enableZoom = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
    }
  }, [focusGlobe, initialLocation]);

  const handleLocationClick = React.useCallback(
    (location: GlobeLocation, event: React.MouseEvent<HTMLElement>) => {
      setActiveLocationId(location.id);
      setSelectedLocation(location);
      setCopiedField(null);

      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 320;
      const mobile = viewportWidth < 768;
      let x = rect.right + 16;

      if (x + tooltipWidth > viewportWidth - 20) {
        x = rect.left - tooltipWidth - 16;
      }

      setTooltipPosition({
        x: Math.max(20, x),
        y: rect.top + rect.height / 2,
        mobile,
      });

      focusGlobe(location, 1000);
    },
    [focusGlobe],
  );

  const handlePointClick = React.useCallback(
    (point: object) => {
      const location = locations.find(
        (item) => item.id === (point as GlobeLocation).id,
      );
      if (!location) return;

      setActiveLocationId(location.id);
      setSelectedLocation(null);
      focusGlobe(location, 800);

      isScrollingProgrammatically.current = true;
      locationRefs.current[location.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 1000);
    },
    [focusGlobe, locations],
  );

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (isScrollingProgrammatically.current || !container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = container.clientHeight / 2;
    let closestLocation: GlobeLocation | null = null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const location of locations) {
      const element = locationRefs.current[location.id];
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const elementCenter = rect.top - containerRect.top + rect.height / 2;
      const distance = Math.abs(elementCenter - containerCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    if (closestLocation && closestLocation.id !== activeLocationId) {
      setActiveLocationId(closestLocation.id);
      setSelectedLocation(null);
      focusGlobe(closestLocation, 500);
    }
  }, [activeLocationId, focusGlobe, locations]);

  const copyToClipboard = React.useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
    });
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-[680px] w-full overflow-hidden rounded-3xl border border-border bg-background text-foreground shadow-[0_30px_120px_-80px_rgba(14,165,233,0.7)] dark:bg-zinc-950",
        className,
      )}
    >
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative z-10 flex w-[42%] min-w-[220px] max-w-[500px] flex-col items-start justify-start overflow-y-auto px-5 py-[310px] [scrollbar-width:none] sm:px-8 md:min-w-[280px] md:px-12 lg:px-16 [&::-webkit-scrollbar]:hidden"
      >
        {locations.map((location) => {
          const isActive = activeLocationId === location.id;
          const isSelected = selectedLocation?.id === location.id;

          return (
            <button
              key={location.id}
              ref={(el) => {
                locationRefs.current[location.id] = el;
              }}
              type="button"
              onClick={(event) => handleLocationClick(location, event)}
              className={cn(
                "relative py-2 text-left text-2xl font-medium tracking-tight transition-all duration-500 ease-out md:py-3 md:text-3xl lg:text-4xl",
                isActive
                  ? "translate-x-1 text-sky-500"
                  : "text-zinc-300 hover:text-zinc-500 dark:text-white/20 dark:hover:text-white/40",
              )}
            >
              <span className="relative flex items-center gap-3">
                {location.name}
                {isActive && isSelected && (
                  <span className="flex items-center text-sky-500">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="-ml-3"
                      aria-hidden
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center md:relative md:flex-1"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent md:hidden dark:from-zinc-950 dark:via-zinc-950/90" />
        <div className="pointer-events-auto relative">
          <div className="absolute inset-0 -z-10 blur-3xl">
            <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-500/10" />
          </div>
          <Globe
            ref={globeRef}
            width={globeSize}
            height={globeSize}
            globeImageUrl={globeTextureUrl}
            backgroundColor="rgba(0,0,0,0)"
            pointsData={locations}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => "#0ea5e9"}
            pointAltitude={0.01}
            pointRadius={0.5}
            pointLabel={() => ""}
            onGlobeReady={handleGlobeReady}
            onPointClick={handlePointClick}
            enablePointerInteraction
            animateIn
          />
        </div>
      </div>

      {selectedLocation && (
        <>
          <button
            type="button"
            aria-label="Close location details"
            className="fixed inset-0 z-40 cursor-default bg-black/5 backdrop-blur-[1px]"
            onClick={() => setSelectedLocation(null)}
          />

          <div
            className={cn(
              "fixed z-50 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-zinc-900 md:w-80",
              tooltipPosition.mobile && "left-1/2 top-auto bottom-5",
            )}
            style={
              tooltipPosition.mobile
                ? { transform: "translateX(-50%)" }
                : {
                    left: `${tooltipPosition.x}px`,
                    top: `${tooltipPosition.y}px`,
                    transform: "translateY(-50%)",
                  }
            }
          >
            {!tooltipPosition.mobile && (
              <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900" />
            )}
            <LocationDetailRow
              value={selectedLocation.address}
              copied={copiedField === "address"}
              onCopy={() =>
                copyToClipboard(selectedLocation.address, "address")
              }
            />
            <LocationDetailRow
              value={selectedLocation.email}
              copied={copiedField === "email-1"}
              accent
              onCopy={() => copyToClipboard(selectedLocation.email, "email-1")}
            />
            <LocationDetailRow
              value={selectedLocation.email}
              copied={copiedField === "email-2"}
              accent
              onCopy={() => copyToClipboard(selectedLocation.email, "email-2")}
            />
          </div>
        </>
      )}
    </div>
  );
}

function LocationDetailRow({
  value,
  copied,
  accent,
  onCopy,
}: {
  value: string;
  copied: boolean;
  accent?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-zinc-100 p-4 first:border-t-0 dark:border-white/10">
      <span
        className={cn(
          "text-sm leading-relaxed text-zinc-700 dark:text-zinc-200",
          accent && "text-sky-500 dark:text-sky-300",
        )}
      >
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={onCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default InteractiveGlobeExplorer;
