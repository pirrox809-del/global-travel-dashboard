"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShutterLine {
  /** Line text — animated one character at a time. */
  text: string;
  /** Text colour classes for this line's characters. */
  className?: string;
}

interface HeroShutterTextProps {
  /** One entry per visual line of the title. */
  lines: ShutterLine[];
  /** Responsive typography applied to every character. */
  charClassName?: string;
  /** Heading level for semantics — the animated text itself is decorative. */
  headingLevel?: 1 | 2;
  /** Show the small replay control under the title. */
  showReplay?: boolean;
  /** Accessible label for the replay control. */
  replayLabel?: string;
  className?: string;
}

/** The three horizontal slices that sweep across each character. */
const SLICES = [
  { clipPath: "polygon(0 0, 100% 0, 100% 35%, 0 35%)", from: "-100%", to: "100%", delay: 0 },
  { clipPath: "polygon(0 35%, 100% 35%, 100% 65%, 0 65%)", from: "100%", to: "-100%", delay: 0.1 },
  { clipPath: "polygon(0 65%, 100% 65%, 100% 100%, 0 100%)", from: "-100%", to: "100%", delay: 0.2 },
] as const;

/** Accent colour for the outer slices — matches the site's amber palette. */
const ACCENT = "text-amber-600 dark:text-amber-400";

/**
 * HeroShutterText — shutter-blinds title animation.
 *
 * Each character blurs in while three horizontal slices (top / middle /
 * bottom) sweep across it in alternating directions, creating a
 * "camera shutter" scan effect. Click the refresh control to replay.
 */
export default function HeroShutterText({
  lines,
  charClassName = "text-[clamp(2.75rem,9vw,6rem)]",
  headingLevel = 1,
  showReplay = true,
  replayLabel = "Replay",
  className,
}: HeroShutterTextProps) {
  const [count, setCount] = React.useState(0);
  const prefersReducedMotion = !!useReducedMotion();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const fullText = lines.map((l) => l.text).join(" ");

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={prefersReducedMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.25 } }}
          className="flex flex-col items-center"
        >
          {/* Real heading for screen readers / SEO; the animated text is decorative. */}
          <Heading className="sr-only">{fullText}</Heading>

          <span aria-hidden="true" className="flex flex-col items-center">
            {lines.map((line, li) => {
              // Offset so the reveal wave flows across consecutive lines.
              const start = lines.slice(0, li).reduce((acc, l) => acc + l.text.length, 0);
              return (
                <span key={li} className="flex flex-wrap justify-center">
                  {line.text.split("").map((char, ci) => (
                    <span
                      key={ci}
                      className="relative -mb-[0.12em] inline-block overflow-hidden px-[0.02em] pb-[0.12em] align-top"
                    >
                      {/* Main character — blur reveal */}
                      <motion.span
                        className={cn(
                          "inline-block font-black leading-[1.05] tracking-tighter",
                          charClassName,
                          line.className
                        )}
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, filter: "blur(10px)" }
                        }
                        animate={
                          prefersReducedMotion
                            ? { opacity: 1 }
                            : { opacity: 1, filter: "blur(0px)" }
                        }
                        transition={{ delay: (start + ci) * 0.04 + 0.3, duration: 0.8 }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </motion.span>

                      {/* Shutter slices — skipped for reduced motion */}
                      {!prefersReducedMotion &&
                        SLICES.map((slice, si) => (
                          <motion.span
                            key={si}
                            className={cn(
                              "pointer-events-none absolute inset-0 z-10 font-black leading-[1.05] tracking-tighter",
                              charClassName,
                              si === 1 ? line.className : ACCENT
                            )}
                            initial={{ x: slice.from, opacity: 0 }}
                            animate={{ x: slice.to, opacity: [0, 1, 0] }}
                            transition={{
                              duration: 0.7,
                              delay: (start + ci) * 0.04 + slice.delay,
                              ease: "easeInOut",
                            }}
                            style={{ clipPath: slice.clipPath }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </motion.span>
                        ))}
                    </span>
                  ))}
                </span>
              );
            })}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Replay control */}
      {showReplay && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCount((c) => c + 1)}
          aria-label={replayLabel}
          title={replayLabel}
          className="mt-4 grid size-8 place-items-center rounded-full border border-border/50 bg-background/60 text-muted-foreground backdrop-blur-md transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{replayLabel}</span>
        </motion.button>
      )}
    </div>
  );
}
