'use client';

import { useMemo } from 'react';
import PolaroidLineCarousel, { type Slide } from '@/components/ui/polaroid-line-carousel';
import type { CountryDynamic } from '@/lib/types';

/**
 * PhotoCarouselCard — displays real country photos in the PolaroidLineCarousel.
 *
 * Photos come from Wikipedia (capital city + each POI's Wikipedia article lead
 * image). They are REAL Wikimedia Commons photos — not AI-generated, not stock.
 * Cached 7 days server-side (photo URLs are stable).
 *
 * The carousel is full-width with a fixed height (~420px) so the polaroids
 * hang at a comfortable viewing size. Drag, click, or use ←/→ arrows.
 */
export function PhotoCarouselCard({ photos }: { photos: CountryDynamic['photos'] }) {
  const slides = useMemo<Slide[]>(() => {
    if ('error' in photos) return [];
    return photos.map((p) => ({
      image: p.image,
      title: p.title,
      caption: p.caption,
      alt: p.title,
    }));
  }, [photos]);

  if ('error' in photos || slides.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl text-sm text-muted-foreground">
        📷 No photos available for this country
      </div>
    );
  }

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
