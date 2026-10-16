'use client';

import { motion } from 'framer-motion';

/**
 * GlobeLogo — a hand-drawn minimalist line-art globe mark.
 *
 * Design: a circle (the globe) with two curved lines (equator + prime
 * meridian) rendered in `currentColor` with thin, rounded strokes.
 * Monochrome, no gradient, no fill — an editorial / magazine aesthetic
 * that reads as intentional design rather than generic "AI" output.
 *
 * Props:
 *  - size      : pixel size (default 32)
 *  - animated  : slowly rotates the meridian curve (for the intro hero)
 *  - className : extra classes (e.g. text-foreground)
 */
export function GlobeLogo({
  size = 32,
  animated = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      {/* Globe outline */}
      <circle cx="20" cy="20" r="15" />
      {/* Equator — a flat ellipse giving 3D volume */}
      <ellipse cx="20" cy="20" rx="15" ry="6" />
      {/* Prime meridian — a vertical curve; animated group for the intro */}
      {animated ? (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '20px 20px' }}
        >
          <path d="M20 5 C12 12, 12 28, 20 35" />
          <path d="M20 5 C28 12, 28 28, 20 35" />
        </motion.g>
      ) : (
        <>
          <path d="M20 5 C12 12, 12 28, 20 35" />
          <path d="M20 5 C28 12, 28 28, 20 35" />
        </>
      )}
    </svg>
  );
}
