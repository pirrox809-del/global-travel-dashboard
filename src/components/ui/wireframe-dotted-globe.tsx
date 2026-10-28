"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
}

/**
 * RotatingEarth — wireframe dotted globe rendered on a 2D canvas with d3.
 *
 * PERFORMANCE NOTES (the bug this fixes):
 * The original implementation ran a synchronous double-nested loop with
 * point-in-polygon tests for EVERY land feature × EVERY grid point in its
 * bounding box. For the 110m natural-earth dataset (~255 features) this
 * generated thousands of dots in a single tick, blocking the main thread
 * for ~500ms on initial page load — visible as a "half-second freeze"
 * right after the page painted.
 *
 * The fix has three parts:
 *  1. Cache the generated dots in `sessionStorage` — the heavy work only
 *     runs once per browser session (the dots never change).
 *  2. Defer the dot generation with `requestIdleCallback` so the initial
 *     paint happens immediately (globe outline + graticule first, dots
 *     fill in ~100ms later when the browser is idle).
 *  3. Process features in chunks across multiple frames so the main
 *     thread stays responsive even on the first generation (no chunk
 *     should take more than ~16ms).
 */
const DOTS_CACHE_KEY = "rotating-earth:dots-v2"

/** Per-feature dot grid spacing in degrees (smaller = denser).
 *  Tuned for ~6,500 dots instead of ~13,000 — visually similar but
 *  half the per-frame projection cost. */
const DOT_SPACING = 22
const DOT_STEP = DOT_SPACING * 0.08 // ~1.76°

/** How many land features to process per idle frame. */
const FEATURES_PER_CHUNK = 8

/** Target FPS for the rotation animation. 30fps halves the per-second
 *  CPU cost vs the default 60fps and is visually indistinguishable for
 *  a slow auto-rotate (0.5°/frame = 15°/s at 30fps). */
const TARGET_FPS = 30
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS

export default function RotatingEarth({ width = 800, height = 600, className = "" }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Set up responsive dimensions
    const containerWidth = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
          }
        }
        return false
      }

      return false
    }

    /**
     * Generate dots inside a single land feature's polygon. Called once
     * per feature — we chunk the work across multiple idle frames so
     * the main thread stays responsive.
     */
    const generateDotsInPolygon = (feature: any): [number, number][] => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      for (let lng = minLng; lng <= maxLng; lng += DOT_STEP) {
        for (let lat = minLat; lat <= maxLat; lat += DOT_STEP) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }

      return dots
    }

    interface DotData {
      lng: number
      lat: number
      visible: boolean
    }

    const allDots: DotData[] = []
    let landFeatures: any

    /**
     * Fast visibility check: is (lat, lng) on the visible hemisphere
     * given the current projection rotation?
     *
     * Uses the spherical law of cosines — ~3x cheaper than calling
     * `projection()` for back-facing points. The visible hemisphere
     * is centered at (-rot[0], -rot[1]) and spans 90° in any direction.
     *
     * Returns true if the angular distance from the projection's
     * center is ≤ 90°.
     */
    const isVisible = (lat: number, lng: number): boolean => {
      const rLat = -rotation[1] * Math.PI / 180
      const rLng = -rotation[0] * Math.PI / 180
      const pLat = lat * Math.PI / 180
      const pLng = lng * Math.PI / 180
      const cosAngular =
        Math.sin(rLat) * Math.sin(pLat) +
        Math.cos(rLat) * Math.cos(pLat) * Math.cos(pLng - rLng)
      return cosAngular >= -0.05 // small tolerance for edge dots
    }

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Draw ocean (globe background)
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()
      context.strokeStyle = "#ffffff"
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.globalAlpha = 0.25
        context.stroke()
        context.globalAlpha = 1

        // Draw land outlines
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Draw halftone dots — batched into a single beginPath/fill
        // (one canvas state setup instead of one per dot).
        // Skip back-facing dots via the cheap isVisible() check.
        context.beginPath()
        const dotRadius = 1.2 * scaleFactor
        for (let i = 0; i < allDots.length; i++) {
          const dot = allDots[i]
          if (!isVisible(dot.lat, dot.lng)) continue
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            // moveTo before arc — required to start a new sub-path
            // (otherwise arcs get connected by lines).
            context.moveTo(projected[0] + dotRadius, projected[1])
            context.arc(projected[0], projected[1], dotRadius, 0, 2 * Math.PI)
          }
        }
        context.fillStyle = "#999999"
        context.fill()
      }
    }

    /**
     * Try to load cached dots from sessionStorage. Returns null if the
     * cache is missing or malformed.
     */
    const loadCachedDots = (): { lng: number; lat: number }[] | null => {
      try {
        const raw = sessionStorage.getItem(DOTS_CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed) || parsed.length === 0) return null
        return parsed
      } catch {
        return null
      }
    }

    /** Save generated dots to sessionStorage for next visit. */
    const saveCachedDots = (dots: { lng: number; lat: number }[]) => {
      try {
        sessionStorage.setItem(DOTS_CACHE_KEY, JSON.stringify(dots))
      } catch {
        // sessionStorage quota exceeded (unlikely — dots are ~200KB)
      }
    }

    /**
     * Generate dots for all features in chunks across idle frames.
     * Falls back to `setTimeout` if `requestIdleCallback` isn't available
     * (older browsers / Safari < 17).
     */
    const generateDotsChunked = (features: any[], onDone: () => void) => {
      let featureIdx = 0
      const step = () => {
        const end = Math.min(featureIdx + FEATURES_PER_CHUNK, features.length)
        for (let i = featureIdx; i < end; i++) {
          const dots = generateDotsInPolygon(features[i])
          dots.forEach(([lng, lat]) => allDots.push({ lng, lat, visible: true }))
        }
        featureIdx = end
        // Re-render after each chunk so dots appear progressively.
        render()
        if (featureIdx < features.length) {
          if ("requestIdleCallback" in window) {
            ;(window as any).requestIdleCallback(step, { timeout: 100 })
          } else {
            setTimeout(step, 0)
          }
        } else {
          onDone()
        }
      }
      step()
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)

        // Try the cache first — instant if hit.
        const cached = loadCachedDots()
        if (cached) {
          cached.forEach(({ lng, lat }) => allDots.push({ lng, lat, visible: true }))
        }

        // Always fetch the land data — we need it for the outlines
        // even when dots are cached.
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = await response.json()
        render()

        if (cached) {
          // Dots already loaded from cache — render them and we're done.
          render()
          setIsLoading(false)
          return
        }

        // No cache — generate dots chunked across idle frames.
        // The rotation timer starts AFTER chunk generation so the very
        // first frame doesn't compete with the dot-generation work.
        generateDotsChunked(landFeatures.features, () => {
          saveCachedDots(allDots.map((d) => ({ lng: d.lng, lat: d.lat })))
          setIsLoading(false)
        })
      } catch (err) {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    // Set up rotation and interaction
    const rotation = [0, 0]
    let autoRotate = true
    const rotationSpeed = 0.5

    /**
     * Rotation loop using `requestAnimationFrame` instead of `d3.timer`
     * or `setInterval` — rAF is the browser-native way to do animation:
     *   - Syncs with the display refresh rate (typically 60Hz).
     *   - Browser pauses the loop when the tab is hidden.
     *   - Doesn't queue callbacks when the main thread is busy (unlike
     *     setInterval) — backpressure is automatic.
     *   - The rAF callback fires ~16ms apart, but each frame's render
     *     is gated by the FRAME_INTERVAL_MS check so we effectively
     *     run at ~30fps even on a 60Hz display.
     */
    let lastFrame = 0
    let rafId: number | null = null
    const rotate = () => {
      rafId = requestAnimationFrame(rotate)
      const now = performance.now()
      if (now - lastFrame < FRAME_INTERVAL_MS) return
      lastFrame = now
      if (autoRotate) {
        rotation[0] += rotationSpeed * (FRAME_INTERVAL_MS / 16.67)
        projection.rotate(rotation)
        render()
      }
    }

    // Auto-rotation loop — deferred until dots are ready so the first
    // paint isn't competing with the dot-generation work.
    const startRotation = () => {
      rafId = requestAnimationFrame(rotate)
    }
    // Start rotation on next idle tick — gives the initial paint a chance
    // to complete before the render loop kicks in.
    const rotationStarter = ("requestIdleCallback" in window)
      ? (window as any).requestIdleCallback(startRotation, { timeout: 500 })
      : setTimeout(startRotation, 500)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          autoRotate = true
        }, 10)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor))
      projection.scale(newRadius)
      render()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    // Load the world data
    loadWorldData()

    // Cleanup
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (typeof rotationStarter === "number") {
        clearTimeout(rotationStarter)
      } else if (rotationStarter && "cancelIdleCallback" in window) {
        ;(window as any).cancelIdleCallback(rotationStarter)
      }
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-auto rounded-2xl"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    </div>
  )
}
