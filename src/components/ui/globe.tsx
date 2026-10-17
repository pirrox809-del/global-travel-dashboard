"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * Globe — an animated rotating globe with a real world map.
 *
 * Primary: loads a world map texture (Wikimedia equirectangular) and scrolls
 * it horizontally to simulate rotation.
 * Fallback: if the image fails to load (rate-limit, offline), shows a CSS
 * gradient sphere with rotating "cloud" layers — still animated and visible.
 *
 * No WebGL required — works in ALL browsers.
 */

const MARKERS = [
  { name: "Manila", left: 83.1, top: 55.4 },
  { name: "Mumbai", left: 65.4, top: 46.7 },
  { name: "Cairo", left: 58.7, top: 39.6 },
  { name: "Beijing", left: 74.4, top: 32.2 },
  { name: "São Paulo", left: 33.9, top: 68.7 },
  { name: "New York", left: 28.9, top: 38.1 },
  { name: "Tokyo", left: 80.4, top: 40.6 },
  { name: "Istanbul", left: 58.3, top: 47.7 },
]

const MAP_SOURCES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1280px-Equirectangular_projection_SW.jpg",
  "https://images.unsplash.com/photo-1451187580459-9543f7047a51?w=1280&q=80",
]

export function Globe({ className }: { className?: string; config?: unknown }) {
  const [mapUrl, setMapUrl] = useState<string | null>(MAP_SOURCES[0])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Try to load the map image; if it fails, try fallback sources.
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
        @keyframes globe-spin-map {
          from { background-position: 0% 50%; }
          to { background-position: -200% 50%; }
        }
        @keyframes globe-spin-clouds {
          from { transform: translateX(0%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes globe-marker-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
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
            "inset -25px -10px 50px rgba(0,0,0,0.45), inset 10px 5px 30px rgba(120,180,255,0.15), 0 0 50px rgba(80,160,255,0.2)",
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
              animation: "globe-spin-map 30s linear infinite",
              opacity: 0.8,
              mixBlendMode: "screen",
            }}
          />
        ) : (
          /* Fallback: CSS "cloud" layers that rotate — looks like a planet */
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 40% 30% at 20% 40%, rgba(100,200,150,0.15) 0%, transparent 60%)," +
                  "radial-gradient(ellipse 50% 25% at 70% 30%, rgba(80,160,200,0.12) 0%, transparent 50%)," +
                  "radial-gradient(ellipse 30% 40% at 50% 70%, rgba(120,180,100,0.1) 0%, transparent 50%)," +
                  "radial-gradient(ellipse 35% 20% at 85% 60%, rgba(100,150,80,0.08) 0%, transparent 50%)",
                animation: "globe-spin-clouds 40s linear infinite",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 25% 35% at 60% 50%, rgba(255,255,255,0.06) 0%, transparent 50%)," +
                  "radial-gradient(ellipse 30% 20% at 25% 65%, rgba(255,255,255,0.04) 0%, transparent 50%)",
                animation: "globe-spin-clouds 25s linear infinite reverse",
              }}
            />
          </>
        )}

        {/* Day/night shadow (right side darker) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 35%, rgba(0,0,10,0.2) 65%, rgba(0,0,10,0.4) 100%)",
          }}
        />

        {/* City markers */}
        {MARKERS.map((m) => (
          <div
            key={m.name}
            className="absolute"
            style={{ left: `${m.left}%`, top: `${m.top}%` }}
          >
            <div
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "rgb(251, 146, 60)",
                boxShadow: "0 0 8px rgba(251, 146, 60, 0.8)",
                animation: "globe-marker-pulse 2s ease-in-out infinite",
                position: "absolute",
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Glow halo */}
      <div
        className="absolute inset-0 rounded-full -z-10"
        style={{
          background: "radial-gradient(circle, rgba(100,180,255,0.12) 0%, transparent 70%)",
          transform: "scale(1.4)",
        }}
      />
    </div>
  )
}
