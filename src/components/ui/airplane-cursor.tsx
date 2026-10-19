'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AirplaneCursor — replaces the default OS arrow cursor with a small
 * SVG airplane that follows the pointer with ZERO lag.
 *
 * KEY DESIGN DECISIONS (all user-requested):
 *
 * 1. **Zero-lag tracking** — the transform is written DIRECTLY inside
 *    the `pointermove` event handler. No requestAnimationFrame loop,
 *    no lerp, no transition. The airplane position updates at the
 *    pointer-event rate (60-120Hz) and is always at the exact
 *    pointer coordinates. This makes it feel identical to the OS
 *    cursor.
 *
 * 2. **Fixed -20° tilt** — the airplane is permanently tilted 20°
 *    counter-clockwise (to the left), matching the orientation of
 *    the Windows arrow cursor. No movement-based rotation (the
 *    Windows cursor doesn't rotate either).
 *
 * 3. **Nose hotspot** — the transform-origin is set to the airplane's
 *    nose (50% width, 5% height). Combined with the correct
 *    margin offset, the nose sits exactly at the pointer position
 *    so clicks register precisely at the visual cursor tip — same
 *    behaviour as the Windows arrow cursor.
 *
 * 4. **No drop-shadow filter** — CSS `filter: drop-shadow` forces the
 *    browser to re-rasterize the element on every transform change,
 *    causing 5-10ms of lag per frame. Removed entirely; visibility
 *    on light/dark backgrounds is handled by the SVG's dark stroke
 *    (`#451a03`) on every path.
 *
 * 5. **36px size** (was 43px) — slightly smaller as requested.
 *
 * 6. **Single cursor** — the OS cursor is hidden via CSS
 *    (`cursor: none !important` on all elements inside `@media
 *    (pointer: fine)` in globals.css). When the pointer leaves the
 *    document, the airplane fades out and the OS cursor returns
 *    automatically (since the CSS only applies inside the site).
 */
export function AirplaneCursor() {
  const planeRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // The fixed tilt angle (20° counter-clockwise = "to the left").
    // Applied once, never changes — no rAF, no lerp, no delay.
    const TILT_DEG = -20;

    // Write the transform directly. Called from pointermove — no rAF.
    const writeTransform = (x: number, y: number) => {
      if (planeRef.current) {
        planeRef.current.style.transform =
          `translate3d(${x}px, ${y}px, 0) rotate(${TILT_DEG}deg)`;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      writeTransform(e.clientX, e.clientY);
      setVisible(true);
    };

    const onPointerLeave = () => setVisible(false);
    const onPointerEnter = () => setVisible(true);
    const onPointerDown = () => setVisible(true);

    // pointermove on window — fires at the display refresh rate.
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('pointerenter', onPointerEnter);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('pointerenter', onPointerEnter);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        // Only transition the opacity (for fade in/out when the pointer
        // enters/leaves the document). Do NOT transition the transform —
        // that would add lag to the cursor tracking.
        transition: 'opacity 150ms ease-out',
      }}
    >
      <div
        ref={planeRef}
        style={{
          // The SVG is 36×36px. The nose is at viewBox (20, 2) which
          // maps to rendered px (18, 1.8) — i.e. 50% of width, 5% of
          // height from the SVG's top-left corner.
          //
          // transform-origin at (50%, 5%) = the nose. This means:
          //   - Rotation pivots around the nose (not the center).
          //   - After rotation, the nose stays at the same point.
          //
          // marginLeft/marginTop offset the SVG so the nose lands
          // exactly at the pointer coordinates written by
          // `writeTransform(clientX, clientY)`:
          //   marginLeft: -18  →  SVG's left edge is 18px left of pointer
          //   marginTop: -1.8  →  SVG's top edge is 1.8px above pointer
          //   →  nose at (left + 18, top + 1.8) = (pointer.x, pointer.y) ✓
          marginLeft: -18,
          marginTop: -1.8,
          transformOrigin: '50% 5%',
          willChange: 'transform',
          // No drop-shadow filter — it causes re-rasterization lag.
          // The SVG's dark stroke (#451a03) provides visibility.
        }}
      >
        <AirplaneSvg />
      </div>
    </div>
  );
}

/**
 * Detailed commercial-jet top-view SVG, 36×36px rendered (40×40 viewBox),
 * nose pointing UP (north). The -20° tilt is applied by the parent
 * div's transform, not inside the SVG — so the SVG itself is "north-up".
 *
 * Drawn back-to-front so the fuselage overlaps the wing roots.
 */
function AirplaneSvg() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ac-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ac-wing" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="ac-engine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
      </defs>

      {/* Vertical fin at the tail */}
      <path
        d="M19 38 L20 31 L21 38 Z"
        fill="url(#ac-body)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Horizontal stabilizers */}
      <path
        d="M11 34 L19 31 L21 31 L29 34 L21 35.5 L19 35.5 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Left main wing + winglet */}
      <path
        d="M2 23 L18 14 L20 14 L20 22 L4 25 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      <path
        d="M2 23 L4 22 L4 25 Z"
        fill="#92400e"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Right main wing + winglet */}
      <path
        d="M38 23 L22 14 L20 14 L20 22 L36 25 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      <path
        d="M38 23 L36 22 L36 25 Z"
        fill="#92400e"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Left engine nacelle */}
      <ellipse cx="9" cy="23" rx="3.4" ry="1.6"
        fill="url(#ac-engine)" stroke="#1c0a02" strokeWidth="0.35" />
      <ellipse cx="6.5" cy="23" rx="0.8" ry="1.2" fill="#0c1320" />
      {/* Right engine nacelle */}
      <ellipse cx="31" cy="23" rx="3.4" ry="1.6"
        fill="url(#ac-engine)" stroke="#1c0a02" strokeWidth="0.35" />
      <ellipse cx="33.5" cy="23" rx="0.8" ry="1.2" fill="#0c1320" />
      {/* Main fuselage */}
      <path
        d="M20 2 C 21.8 4, 22 6, 21.5 10 L 21.5 32 C 21.5 35, 20.8 37, 20 38.5 C 19.2 37, 18.5 35, 18.5 32 L 18.5 10 C 18 6, 18.2 4, 20 2 Z"
        fill="url(#ac-body)"
        stroke="#451a03"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />
      {/* Cockpit window */}
      <path
        d="M19 5 L21 5 L20.6 7.5 L19.4 7.5 Z"
        fill="#0c1320"
        stroke="#1c0a02"
        strokeWidth="0.15"
      />
      {/* Passenger windows */}
      <g fill="#0c1320">
        <circle cx="19.5" cy="10.5" r="0.7" />
        <circle cx="19.5" cy="12.2" r="0.7" />
        <circle cx="19.5" cy="13.9" r="0.7" />
        <circle cx="19.5" cy="15.6" r="0.7" />
        <circle cx="19.5" cy="17.3" r="0.7" />
        <circle cx="19.5" cy="19.0" r="0.7" />
        <circle cx="19.5" cy="20.7" r="0.7" />
        <circle cx="19.5" cy="22.4" r="0.7" />
        <circle cx="19.5" cy="24.1" r="0.7" />
        <circle cx="19.5" cy="25.8" r="0.7" />
        <circle cx="19.5" cy="27.5" r="0.7" />
        <circle cx="19.5" cy="29.2" r="0.7" />
      </g>
      {/* Nose highlight */}
      <circle cx="20" cy="3.5" r="0.5" fill="#fef3c7" opacity="0.9" />
    </svg>
  );
}
