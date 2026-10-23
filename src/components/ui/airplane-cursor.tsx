'use client';

import { useEffect, useRef } from 'react';

/**
 * AirplaneCursor — replaces the default OS arrow cursor with a small
 * SVG airplane that follows the pointer with ZERO lag and ZERO jank.
 *
 * WHY THIS IS FLUID (the "no stutter" architecture):
 *
 * 1. **Zero React renders on pointer activity.** The component renders
 *    exactly once. Every visual update (position, visibility, press
 *    feedback) is a direct `style` write via refs — no setState in any
 *    pointer event handler. React re-renders (live clock, globes,
 *    framer-motion) can never delay the cursor.
 *
 * 2. **Two compositor layers with separate jobs:**
 *      - outer layer: ONLY `translate3d(x, y, 0)` — pure GPU translation
 *        written directly in the pointermove handler (no rAF loop, no
 *        lerp → the plane is always at the exact pointer coordinates).
 *      - inner layer: the static `rotate(-20deg)` tilt, set once at
 *        mount. Its rotated bitmap is cached by the compositor, so
 *        moving the cursor never re-rasterizes the airplane.
 *
 * 3. `will-change: transform` + `translate3d` keep both layers promoted
 *    to the GPU. No `filter`, no `box-shadow`, no backdrop effects —
 *    nothing that forces re-rasterization per frame.
 *
 * 4. **Clean in every state:**
 *      - hidden until the first pointer move (no plane stuck in a corner)
 *      - fades out when the pointer leaves the document or the window
 *        loses focus
 *      - fades out over text fields (input/textarea/contenteditable) so
 *        the native I-beam takes over — no double cursor over text
 *      - subtle press feedback (scales down while the button is held)
 *
 * 5. **Nose hotspot** — margins + transform-origin place the airplane's
 *    nose exactly at the pointer coordinates, so clicks register at the
 *    visual cursor tip.
 *
 * 6. Touch devices are ignored entirely (`pointer: fine` guard).
 */

/** Elements over which the native text cursor takes precedence. */
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Static tilt of the airplane, baked once onto the inner layer. */
const PLANE_TRANSFORM = 'rotate(-20deg)';

export function AirplaneCursor() {
  const rootRef = useRef<HTMLDivElement>(null); // position layer
  const planeRef = useRef<HTMLDivElement>(null); // tilted plane layer

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Skip touch-primary devices (phones/tablets): no hover cursor there.
    // Note: this is NOT a strict `pointer: fine` check — environments that
    // report `pointer: none` (headless browsers, some remote desktops) still
    // have a working pointer, and on them the cursor must work too.
    if (
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return;
    }

    const root = rootRef.current;
    const plane = planeRef.current;
    if (!root || !plane) return;

    // ── Visibility (direct style writes — no React) ─────────────────
    const show = () => {
      root.style.opacity = '1';
    };
    const hide = () => {
      root.style.opacity = '0';
    };

    // ── Position (the only thing written on every move) ─────────────
    // Written straight into the event handler: Chrome rAF-aligns
    // pointermove, so this is applied on the very next frame with the
    // exact pointer coordinates — identical to the OS cursor feel.
    const onPointerMove = (e: PointerEvent) => {
      root.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      // Over text fields the native I-beam is shown instead (the CSS in
      // globals.css re-enables it there) — hide the plane to avoid a
      // double cursor. Cheapest possible check, runs once per frame.
      const target = e.target as Element | null;
      if (target?.closest?.(EDITABLE_SELECTOR)) hide();
      else show();
    };

    // ── Press feedback ──────────────────────────────────────────────
    const onPointerDown = () => {
      plane.style.transform = `${PLANE_TRANSFORM} scale(0.85)`;
    };
    const onPointerUp = () => {
      plane.style.transform = PLANE_TRANSFORM;
    };

    // ── Window/document edges ───────────────────────────────────────
    const onDocLeave = () => hide();
    const onDocEnter = () => show();
    const onWindowBlur = () => hide();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('blur', onWindowBlur);
    document.documentElement.addEventListener('pointerleave', onDocLeave);
    document.documentElement.addEventListener('pointerenter', onDocEnter);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('blur', onWindowBlur);
      document.documentElement.removeEventListener('pointerleave', onDocLeave);
      document.documentElement.removeEventListener('pointerenter', onDocEnter);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        // Hidden until the first pointer move; fades in/out on the GPU.
        opacity: 0,
        transition: 'opacity 150ms ease-out',
        // Position layer: promoted, only ever translated.
        willChange: 'transform',
        // Start offscreen so the plane is never visible in a corner
        // before the first pointermove arrives.
        transform: 'translate3d(-100px, -100px, 0)',
      }}
    >
      <div
        ref={planeRef}
        style={{
          // The SVG is 36×36px with the nose at viewBox (20, 2) →
          // rendered px (18, 1.8). These margins put the nose exactly on
          // the parent origin (= the pointer coordinates).
          marginLeft: -18,
          marginTop: -1.8,
          // Tilt layer: baked ONCE — the rotated bitmap stays cached on
          // its own compositor layer while the parent translates.
          transform: PLANE_TRANSFORM,
          transformOrigin: '50% 5%',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        <AirplaneSvg />
      </div>
    </div>
  );
}

/**
 * Detailed commercial-jet top-view SVG, 36×36px rendered (40×40 viewBox),
 * nose pointing UP (north). The -20° tilt is applied by the parent div's
 * transform, not inside the SVG — so the SVG itself is "north-up".
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
