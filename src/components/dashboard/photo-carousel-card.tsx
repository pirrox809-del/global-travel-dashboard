'use client';

import { useMemo } from 'react';
import PolaroidLineCarousel, { type Slide, type LandPalette } from '@/components/ui/polaroid-line-carousel';
import type { CountryDynamic } from '@/lib/types';

const PAINT_PALETTE: LandPalette[] = ['dawn', 'alpine', 'dusk', 'mist'];

/**
 * PhotoCarouselCard — displays real country photos in the PolaroidLineCarousel.
 *
 * Photos come from Wikipedia (country + capital + POIs). If a country has fewer
 * than 6 real photos, we PAD the carousel with painted landscape slides so it's
 * always full and visually consistent — no empty slots, no broken-image icons.
 */
export function PhotoCarouselCard({ photos }: { photos: CountryDynamic['photos'] }) {
  const slides = useMemo<Slide[]>(() => {
    if ('error' in photos) {
      // All-painted fallback: 6 landscapes with different palettes/seeds.
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
    // Pad to at least 6 slides with painted landscapes if we have too few.
    while (realSlides.length < 6) {
      const i = realSlides.length;
      realSlides.push({
        palette: PAINT_PALETTE[i % PAINT_PALETTE.length],
        seed: i * 13 + 5,
      });
    }
    return realSlides;
  }, [photos]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm shadow-black/[0.03] animate-fade-up">
      <PolaroidLineCarousel
        slides={slides}
        height={420}
        cardWidth={260}
        sag={30}
        swing={0.8}
        autoplay={6000}
        background="var(--card)"
        ink="var(--foreground)"
      />
    </div>
  );
}
