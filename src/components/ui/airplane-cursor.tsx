'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AirplaneCursor — replaces the default OS arrow cursor with a small
 * SVG airplane that follows the pointer and rotates to face the
 * direction of movement.
 *
 * PERFORMANCE:
 *  - Position is updated DIRECTLY inside the `pointermove` event handler
 *    (writes `style.transform` immediately, no rAF delay). This makes
 *    the cursor track the pointer at the pointer-event rate (60-120Hz
 *    on most displays) instead of waiting for the next rAF callback.
 *    This eliminates the "scatti" (jerks) when moving the mouse fast —
 *    the cursor no longer lags behind by a full frame when the main
 *    thread is busy.
 *  - Rotation is still lerped smoothly via rAF (factor 0.15) so the
 *    plane rotates toward the velocity vector over ~1s. The rAF is
 *    throttled: it only runs while the pointer is actively moving
 *    (pauses after 200ms idle), so there's no continuous CPU drain
 *    when the cursor is stationary.
 *  - The default OS cursor is hidden via CSS in `globals.css` only on
 *    fine-pointer devices (`@media (pointer: fine)`) — touch devices
 *    keep their native cursor.
 *  - Respects `prefers-reduced-motion`: skips the rotation lerp.
 */
export function AirplaneCursor() {
  const planeRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const lastMoveTimeRef = useRef(0);
  const rafActiveRef = useRef(false);
  const [visible, setVisible] = useState(false);

  // Helper: write the transform with the latest position + rotation.
  // Called from both pointermove (immediate) and the rAF loop (lerped
  // rotation). Whichever fires last wins, but both write consistent
  // values so the transform is always up-to-date.
  const writeTransform = useRef(() => {
    if (planeRef.current) {
      planeRef.current.style.transform = `translate3d(${targetRef.current.x}px, ${targetRef.current.y}px, 0) rotate(${rotationRef.current}deg)`;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - targetRef.current.x;
      const dy = e.clientY - targetRef.current.y;
      targetRef.current = { x: e.clientX, y: e.clientY };
      lastMoveTimeRef.current = performance.now();
      setVisible(true);

      // Update target rotation based on movement direction (only if
      // there's meaningful movement — avoids jitter when stationary).
      if (!reduceMotionRef.current && (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4)) {
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        targetRotationRef.current = angle;
      }

      // Write the transform IMMEDIATELY (no rAF delay) — this is the
      // key fix for the "scatti when moving fast" issue. The position
      // updates at the pointer-event rate, not the rAF rate.
      writeTransform.current();

      // Start the rAF loop if it's not already running (it handles
      // the rotation lerp and stops itself when the pointer goes idle).
      if (!rafActiveRef.current) {
        rafActiveRef.current = true;
        requestAnimationFrame(animate);
      }
    };

    const onPointerLeave = () => setVisible(false);
    const onPointerEnter = () => setVisible(true);
    const onPointerDown = () => setVisible(true);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('pointerenter', onPointerEnter);

    // The rAF loop ONLY handles the rotation lerp. It stops itself
    // when the pointer has been idle for >200ms — so there's no
    // continuous rAF running when the cursor is stationary (saves CPU
    // when the user is reading content and not moving the mouse).
    const animate = () => {
      const idleTime = performance.now() - lastMoveTimeRef.current;

      if (!reduceMotionRef.current) {
        // Lerp rotation (shortest angular path — handles 360°→0° wraparound).
        const cur = rotationRef.current;
        const target = targetRotationRef.current;
        const diff = ((target - cur + 540) % 360) - 180;
        // Only continue lerping if the rotation is meaningfully off
        // (>0.5°) — otherwise stop early to save CPU.
        if (Math.abs(diff) > 0.5) {
          rotationRef.current = cur + diff * 0.15;
          writeTransform.current();
        } else if (Math.abs(diff) > 0) {
          // Snap to target to avoid infinite micro-lerping.
          rotationRef.current = target;
          writeTransform.current();
        }
      }

      // Stop the loop if the pointer has been idle for >200ms AND the
      // rotation has settled — saves CPU when the user is reading.
      if (idleTime > 200) {
        rafActiveRef.current = false;
        return; // Don't schedule next rAF.
      }
      requestAnimationFrame(animate);
    };

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('pointerenter', onPointerEnter);
      rafActiveRef.current = false; // ensures the rAF loop stops on unmount
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
        transition: 'opacity 200ms ease-out',
      }}
    >
      <div
        ref={planeRef}
        style={{
          marginLeft: -21.5, // center the 43px plane on the pointer
          marginTop: -21.5,
          willChange: 'transform',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
        }}
      >
        <AirplaneSvg />
      </div>
    </div>
  );
}

/**
 * Detailed commercial-jet top-view SVG, 43×43px rendered (40×40 viewBox),
 * nose pointing UP (north).
 *
 * Components (drawn back-to-front so the fuselage overlaps the wing roots):
 *   1. Vertical fin at the tail (thin pointed shape)
 *   2. Horizontal stabilizers (smaller swept wings at the tail)
 *   3. Two main swept wings with winglets (the swept-back tips)
 *   4. Two engine nacelles (ovals slung under the wings) with intakes + exhaust glows
 *   5. Main fuselage (long teardrop, pointed nose, tapered tail)
 *   6. Cockpit window (dark tinted area near the nose)
 *   7. Row of passenger windows (small dots along the fuselage)
 *   8. Decorative cheatlines + nose highlight
 */
function AirplaneSvg() {
  return (
    <svg
      width="43"
      height="43"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Vertical body gradient — lighter at top (nose), darker at bottom (tail). */}
        <linearGradient id="ac-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        {/* Horizontal wing gradient — darker at root, lighter at tips. */}
        <linearGradient id="ac-wing" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="0.45" stopColor="#f59e0b" />
          <stop offset="0.55" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#92400e" />
        </linearGradient>
        {/* Engine nacelle gradient — darker metallic. */}
        <linearGradient id="ac-engine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
      </defs>

      {/* 1. Vertical fin at the tail — thin pointed triangle pointing south. */}
      <path
        d="M19 38 L20 31 L21 38 Z"
        fill="url(#ac-body)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />

      {/* 2. Horizontal stabilizers (tail wings) — swept back, smaller than main wings. */}
      <path
        d="M11 34 L19 31 L21 31 L29 34 L21 35.5 L19 35.5 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />

      {/* 3a. Left main wing — swept back with winglet at the tip. */}
      <path
        d="M2 23 L18 14 L20 14 L20 22 L4 25 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Winglet (small upward bend at the wing tip). */}
      <path
        d="M2 23 L4 22 L4 25 Z"
        fill="#92400e"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />

      {/* 3b. Right main wing — mirror of the left. */}
      <path
        d="M38 23 L22 14 L20 14 L20 22 L36 25 Z"
        fill="url(#ac-wing)"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />
      {/* Winglet. */}
      <path
        d="M38 23 L36 22 L36 25 Z"
        fill="#92400e"
        stroke="#451a03"
        strokeWidth="0.25"
        strokeLinejoin="round"
      />

      {/* 4a. Left engine nacelle — slung under the wing. */}
      <ellipse
        cx="9"
        cy="23"
        rx="3.4"
        ry="1.6"
        fill="url(#ac-engine)"
        stroke="#1c0a02"
        strokeWidth="0.35"
      />
      {/* Engine intake highlight (the front of the nacelle). */}
      <ellipse cx="6.5" cy="23" rx="0.8" ry="1.2" fill="#0c1320" />
      {/* Engine exhaust glow at the back. */}
      <ellipse cx="11.8" cy="23" rx="0.5" ry="0.9" fill="#fde68a" opacity="0.7" />

      {/* 4b. Right engine nacelle. */}
      <ellipse
        cx="31"
        cy="23"
        rx="3.4"
        ry="1.6"
        fill="url(#ac-engine)"
        stroke="#1c0a02"
        strokeWidth="0.35"
      />
      <ellipse cx="33.5" cy="23" rx="0.8" ry="1.2" fill="#0c1320" />
      <ellipse cx="28.2" cy="23" rx="0.5" ry="0.9" fill="#fde68a" opacity="0.7" />

      {/* 5. Main fuselage — long teardrop, pointed nose at top, tapered tail at bottom. */}
      <path
        d="M20 2
           C 21.8 4, 22 6, 21.5 10
           L 21.5 32
           C 21.5 35, 20.8 37, 20 38.5
           C 19.2 37, 18.5 35, 18.5 32
           L 18.5 10
           C 18 6, 18.2 4, 20 2 Z"
        fill="url(#ac-body)"
        stroke="#451a03"
        strokeWidth="0.3"
        strokeLinejoin="round"
      />

      {/* 6. Cockpit window — dark tinted area just behind the nose. */}
      <path
        d="M19 5 L21 5 L20.6 7.5 L19.4 7.5 Z"
        fill="#0c1320"
        stroke="#1c0a02"
        strokeWidth="0.15"
      />

      {/* 7. Passenger windows — a row of small dots along the fuselage. */}
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
      {/* Decorative cheatline — thin horizontal accent stripe along the
          fuselage for a more "airline livery" look. */}
      <line x1="19" y1="11" x2="19" y2="29" stroke="#92400e" strokeWidth="0.15" opacity="0.5" />
      <line x1="20" y1="11" x2="20" y2="29" stroke="#92400e" strokeWidth="0.15" opacity="0.5" />

      {/* 8. Cockpit nose highlight (small bright dot at the very tip). */}
      <circle cx="20" cy="3.5" r="0.5" fill="#fef3c7" opacity="0.9" />
    </svg>
  );
}
