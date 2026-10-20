'use client';

import { useMemo, useState } from 'react';
import { Play, Pause, Gauge } from 'lucide-react';
import PolaroidLineCarousel, { type Slide, type LandPalette } from '@/components/ui/polaroid-line-carousel';
import { useT } from '@/components/language-provider';
import type { CountryDynamic } from '@/lib/types';

const PAINT_PALETTE: LandPalette[] = ['dawn', 'alpine', 'dusk', 'mist'];

/**
 * PhotoCarouselCard — displays real country photos in the PolaroidLineCarousel.
 *
 * Photos come from Wikipedia (country + capital + POIs). If a country has fewer
 * than 6 real photos, we PAD the carousel with painted landscape slides so it's
 * always full and visually consistent — no empty slots, no broken-image icons.
 *
 * AUTO-PLAY CONTROLS:
 *  - A play/pause toggle button lets the user enable/disable auto-rotation.
 *  - A speed slider lets the user adjust the auto-rotation interval (2s–12s).
 *  - The control bar is always in the same spot (below the carousel) for
 *    consistency across all countries' dashboards.
 */
export function PhotoCarouselCard({ photos }: { photos: CountryDynamic['photos'] }) {
  const t = useT();
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [autoplaySpeed, setAutoplaySpeed] = useState(6000); // ms between slides

  const slides = useMemo<Slide[]>(() => {
    if ('error' in photos) {
      return Array.from({ length: 6 }, (_, i) => ({
        palette: PAINT_PALETTE[i % PAINT_PALETTE.length],
        seed: i * 7 + 3,
      }));
    }
    const realSlides: Slide[] = photos.map((p) => ({
      image: p.image,
      title: p.title,
      caption: p.caption,
      alt: p.title,
    }));
    while (realSlides.length < 6) {
      const i = realSlides.length;
      realSlides.push({
        palette: PAINT_PALETTE[i % PAINT_PALETTE.length],
        seed: i * 13 + 5,
      });
    }
    return realSlides;
  }, [photos]);

  // Pass 0 (disabled) when autoplay is off, or the selected speed when on.
  const autoplayMs = autoplayEnabled ? autoplaySpeed : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm shadow-black/[0.03] animate-fade-up">
      <PolaroidLineCarousel
        slides={slides}
        height={420}
        cardWidth={260}
        sag={30}
        swing={0.8}
        autoplay={autoplayMs}
        background="var(--card)"
        ink="var(--foreground)"
      />
      {/* Auto-play control bar — always in the same spot (below the carousel). */}
      <div className="flex items-center gap-3 border-t border-border/50 bg-background/40 px-4 py-2.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setAutoplayEnabled((v) => !v)}
          aria-pressed={autoplayEnabled}
          aria-label={autoplayEnabled ? t('photos.autoplay.pause') : t('photos.autoplay.play')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/60 text-foreground transition-colors hover:bg-foreground/10"
        >
          {autoplayEnabled ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4 ml-0.5" />
          )}
        </button>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {t('photos.autoplay.label')}
        </span>
        {/* Speed slider */}
        <div className="flex flex-1 items-center gap-2">
          <Gauge className="size-3.5 shrink-0 text-muted-foreground/70" />
          <input
            type="range"
            min={2000}
            max={12000}
            step={1000}
            value={autoplaySpeed}
            onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
            disabled={!autoplayEnabled}
            aria-label={t('photos.autoplay.speed')}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border/60 accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground" style={{ minWidth: '3.5rem' }}>
            {(autoplaySpeed / 1000).toFixed(0)}s
          </span>
        </div>
      </div>
    </div>
  );
}
