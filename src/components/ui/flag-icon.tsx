'use client';

import { useId } from 'react';
import type { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Inline SVG flags for the four supported UI languages.
 *
 * Rendered as vector graphics instead of emoji characters because Windows
 * has no color font for regional-indicator emoji (e.g. 🇮🇹 renders as the
 * plain letters "IT"), while these SVGs display identically on every
 * platform and browser.
 */
export function FlagIcon({ locale, className }: { locale: Locale; className?: string }) {
  // Sanitize useId so it is safe inside url(#...) SVG references.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <span
      className={cn(
        'inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/15 dark:ring-white/20',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 60 40"
        preserveAspectRatio="none"
        className="block h-full w-full"
        focusable="false"
      >
        {locale === 'en' && (
          <>
            <clipPath id={`uk-s-${uid}`}>
              <path d="M0,0 v40 h60 v-40 z" />
            </clipPath>
            <clipPath id={`uk-t-${uid}`}>
              <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
            </clipPath>
            <g clipPath={`url(#uk-s-${uid})`}>
              {/* Union Jack: official construction, scaled to a 60x40 canvas */}
              <path d="M0,0 v40 h60 v-40 z" fill="#012169" />
              <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="6" />
              <path
                d="M0,0 L60,40 M60,0 L0,40"
                clipPath={`url(#uk-t-${uid})`}
                stroke="#C8102E"
                strokeWidth="4"
              />
              <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="10" />
              <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="6" />
            </g>
          </>
        )}
        {locale === 'es' && (
          <>
            <rect width="60" height="40" fill="#AA151B" />
            <rect y="10" width="60" height="20" fill="#F1BF00" />
          </>
        )}
        {locale === 'it' && (
          <>
            <rect width="20" height="40" fill="#009246" />
            <rect x="20" width="20" height="40" fill="#fff" />
            <rect x="40" width="20" height="40" fill="#CE2B37" />
          </>
        )}
        {locale === 'fr' && (
          <>
            <rect width="20" height="40" fill="#0055A4" />
            <rect x="20" width="20" height="40" fill="#fff" />
            <rect x="40" width="20" height="40" fill="#EF4135" />
          </>
        )}
      </svg>
    </span>
  );
}
