'use client';

import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { HeroFuturistic } from '@/components/ui/hero-futuristic';
import { useLanguage } from '@/components/language-provider';

/**
 * IntroScreen — the landing / hero screen shown on first visit.
 *
 * Visual centerpiece: the HeroFuturistic 3D scene — a displacement-mapped
 * surface with an animated red scan-line + bloom post-processing (WebGPU).
 * Overlaid: the product title (glitch-in word by word), subtitle, and a
 * floating "explore" CTA wired to reveal the dashboard.
 *
 * Fallbacks:
 *  - If WebGPU is unsupported, the 3D canvas is skipped entirely; the text
 *    overlay + CTA still render on top of the ambient NeuralNoise backdrop.
 *  - If the 3D scene throws at runtime (texture failure, TSL error…), an
 *    error boundary inside HeroFuturistic swallows it and the text remains.
 *  - Language + theme controls stay top-right regardless.
 */
export function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const { t } = useLanguage();
  // Title split into words for the staggered glitch-in animation.
  // Uses intro.title1 + intro.title2 combined (e.g. "Global Travel Dashboard").
  const titleWords = `${t('intro.title1')} ${t('intro.title2')}`.split(' ').filter(Boolean);

  return (
    <div className="relative h-svh w-full overflow-hidden">
      {/* 3D hero scene + text overlay + CTA (all inside HeroFuturistic) */}
      <HeroFuturistic
        titleWords={titleWords}
        subtitle={t('intro.subtitle')}
        ctaLabel={t('intro.cta')}
        onEnter={onEnter}
      />

      {/* Floating controls top-right (language + theme) */}
      <div className="absolute right-4 top-4 z-[80] flex items-center gap-2 sm:right-6 sm:top-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
