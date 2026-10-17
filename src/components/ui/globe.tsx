"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * Globe — a clean animated rotating globe.
 *
 * Primary: world map texture that scrolls horizontally (seamless, via
 *   background-position — no transforms, no seams).
 * Fallback: a smooth gradient sphere with a subtle glow pulse — no lines,
 *   no seams, no markers. Just a beautiful planet.
 *
 * No WebGL, no markers, no day/night shadow (that caused the vertical line).
 */

const MAP_SOURCES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg",
]

export function Globe({ className }: { className?: string; config?: unknown }) {
  const [mapUrl, setMapUrl] = useState<string | null>(MAP_SOURCES[0])
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const tryLoad = (index: number) => {
      if (cancelled || index >= MAP_SOURCES.length) return
      const img = new Image()
      img.onload = () => {
        if (!cancelled) {
          setMapUrl(MAP_SOURCES[index])
          setMapLoaded(true)
        }
      }
      img.onerror = () => {
        if (!cancelled) tryLoad(index + 1)
      }
      img.src = MAP_SOURCES[index]
    }
    tryLoad(0)
    return () => { cancelled = true }
  }, [])

  return (
    <div className={cn("relative aspect-square w-full max-w-[300px] mx-auto", className)}>
      <style>{`
        @keyframes globe-spin {
          from { background-position: 0% 50%; }
          to { background-position: -200% 50%; }
        }
        @keyframes globe-glow-pulse {
          0%, 100% { opacity: 0.12; transform: scale(1.4); }
          50% { opacity: 0.18; transform: scale(1.5); }
        }
      `}</style>

      {/* Sphere */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          background:
            mapLoaded
              ? "radial-gradient(circle at 30% 30%, #4a9adb 0%, #1e5588 45%, #0a2640 100%)"
              : "radial-gradient(circle at 30% 30%, #5ea7e8 0%, #2a5a8a 50%, #0d2944 100%)",
          boxShadow:
            "inset -20px -8px 40px rgba(0,0,0,0.4), inset 8px 4px 25px rgba(120,180,255,0.12), 0 0 50px rgba(80,160,255,0.15)",
        }}
      >
        {/* World map layer (scrolls to simulate rotation) */}
        {mapLoaded && mapUrl ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${mapUrl})`,
              backgroundSize: "200% 100%",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "0% 50%",
              animation: "globe-spin 30s linear infinite",
              opacity: 0.75,
              mixBlendMode: "screen",
            }}
          />
        ) : null}
      </div>

      {/* Glow halo — subtle pulse */}
      <div
        className="absolute inset-0 rounded-full -z-10"
        style={{
          background: "radial-gradient(circle, rgba(100,180,255,0.12) 0%, transparent 70%)",
          animation: "globe-glow-pulse 6s ease-in-out infinite",
        }}
      />
    </div>
  )
}
