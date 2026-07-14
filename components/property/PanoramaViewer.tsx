'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, Minimize, ZoomIn, ZoomOut, RotateCw, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  supportsDeviceOrientation,
  needsDeviceOrientationPermission,
  prefersReducedMotion,
} from '@/lib/tour360/featureDetect'

interface PanoramaViewerProps {
  /** Equirectangular panorama image URL (MVP: single scene — see D3 in the design handoff). */
  panoramaUrl: string
  title: string
  /** Controls sizing: mobile hides zoom buttons/shrinks pills, desktop shows them. */
  mobile?: boolean
  /** Called once the texture has decoded and the first frame has rendered. */
  onReady: () => void
  /** Called when the texture fails to load (network error, 404, ...). */
  onError: () => void
}

const MIN_FOV = 30
const MAX_FOV = 90
const DEFAULT_FOV = 75
const ZOOM_STEP = 10
const AUTO_ROTATE_DEG_PER_FRAME = 0.03

/**
 * Imperative three.js panorama renderer, mounted into a plain `ref` div —
 * same shape as PropertyMap.tsx's `import('mapbox-gl').then(...)` pattern
 * (per the design handoff's explicit instruction to copy it). Only mounted
 * by <Tour360Tab> once: WebGL support has already been feature-detected,
 * and the user has tapped past the "Tap to load" placeholder.
 */
export default function PanoramaViewer({
  panoramaUrl,
  title,
  mobile = false,
  onReady,
  onError,
}: PanoramaViewerProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<HTMLDivElement>(null)

  // Mutable per-frame state kept out of React state so drags don't re-render.
  const lonRef = useRef(0)
  const latRef = useRef(0)
  const autoRotateRef = useRef(!prefersReducedMotion())
  const dragRef = useRef<{ active: boolean; x: number; y: number; lon: number; lat: number }>({
    active: false,
    x: 0,
    y: 0,
    lon: 0,
    lat: 0,
  })
  const cameraRef = useRef<import('three').PerspectiveCamera | null>(null)
  const pinchDistRef = useRef<number | null>(null)

  const [autoRotate, setAutoRotate] = useState(autoRotateRef.current)
  const [fullscreen, setFullscreen] = useState(false)
  const [showGyroBanner, setShowGyroBanner] = useState(false)
  const [gyroActive, setGyroActive] = useState(false)

  // ── Mount three.js scene ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let frameId = 0
    const container = mountRef.current
    if (!container) return

    // Dynamically imported so `three` never lands in the initial page bundle
    // or even in the tour360 tab's own chunk unless a panorama is actually
    // being rendered (embed/video listings never pull this in).
    import('three').then((THREE) => {
      if (cancelled || !container) return

      const width = container.clientWidth || 1
      const height = container.clientHeight || 1

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, width / height, 1, 1100)
      cameraRef.current = camera

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height)
      container.appendChild(renderer.domElement)

      const geometry = new THREE.SphereGeometry(500, 60, 40)
      // Flip the sphere inside-out so the texture is visible from the inside.
      geometry.scale(-1, 1, 1)

      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        panoramaUrl,
        (texture) => {
          if (cancelled) return
          if ('colorSpace' in texture) {
            texture.colorSpace = THREE.SRGBColorSpace
          }
          const material = new THREE.MeshBasicMaterial({ map: texture })
          const mesh = new THREE.Mesh(geometry, material)
          scene.add(mesh)
          onReady()
        },
        undefined,
        () => {
          if (!cancelled) onError()
        },
      )

      const render = () => {
        if (cancelled) return
        if (autoRotateRef.current) {
          lonRef.current += AUTO_ROTATE_DEG_PER_FRAME
        }
        const lat = Math.max(-85, Math.min(85, latRef.current))
        const phi = THREE.MathUtils.degToRad(90 - lat)
        const theta = THREE.MathUtils.degToRad(lonRef.current)
        camera.lookAt(
          500 * Math.sin(phi) * Math.cos(theta),
          500 * Math.cos(phi),
          500 * Math.sin(phi) * Math.sin(theta),
        )
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(render)
      }
      frameId = requestAnimationFrame(render)

      const handleResize = () => {
        if (!container) return
        const w = container.clientWidth || 1
        const h = container.clientHeight || 1
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', handleResize)

      // Store the cleanup closure on the effect's own scope via a ref-free
      // pattern: the outer `return` below reaches these via closure.
      ;(container as unknown as { __cleanup?: () => void }).__cleanup = () => {
        window.removeEventListener('resize', handleResize)
        cancelAnimationFrame(frameId)
        renderer.dispose()
        geometry.dispose()
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement)
        }
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      const cleanup = (container as unknown as { __cleanup?: () => void }).__cleanup
      cleanup?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panoramaUrl])

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === outerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      outerRef.current?.requestFullscreen().catch(() => {})
    }
  }, [])

  // ── Gyroscope banner (mobile + DeviceOrientationEvent only) ────────────────
  useEffect(() => {
    setShowGyroBanner(mobile && supportsDeviceOrientation())
  }, [mobile])

  const handleDeviceOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.alpha == null || e.beta == null) return
    autoRotateRef.current = false
    setAutoRotate(false)
    lonRef.current = e.alpha
    latRef.current = Math.max(-85, Math.min(85, 90 - e.beta))
  }, [])

  useEffect(() => {
    if (!gyroActive) return
    window.addEventListener('deviceorientation', handleDeviceOrientation)
    return () => window.removeEventListener('deviceorientation', handleDeviceOrientation)
  }, [gyroActive, handleDeviceOrientation])

  const activateGyro = useCallback(() => {
    setShowGyroBanner(false)
    if (needsDeviceOrientationPermission()) {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission: () => Promise<'granted' | 'denied'>
      }
      DOE.requestPermission()
        .then((state) => {
          if (state === 'granted') setGyroActive(true)
        })
        .catch(() => {
          // Permission denied/unavailable — drag/swipe navigation still works.
        })
    } else if (supportsDeviceOrientation()) {
      setGyroActive(true)
    }
  }, [])

  // ── Drag / touch rotation + first-interaction auto-rotate stop ─────────────
  const stopAutoRotate = useCallback(() => {
    if (autoRotateRef.current) {
      autoRotateRef.current = false
      setAutoRotate(false)
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      stopAutoRotate()
      dragRef.current = { active: true, x: e.clientX, y: e.clientY, lon: lonRef.current, lat: latRef.current }
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [stopAutoRotate],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    lonRef.current = dragRef.current.lon - dx * 0.15
    latRef.current = Math.max(-85, Math.min(85, dragRef.current.lat + dy * 0.15))
  }, [])

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false
  }, [])

  // Two-finger pinch zoom (touch only — mouse wheel handled separately below).
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      pinchDistRef.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchDistRef.current == null || !cameraRef.current) return
    const [a, b] = [e.touches[0], e.touches[1]]
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const delta = dist - pinchDistRef.current
    pinchDistRef.current = dist
    const camera = cameraRef.current
    camera.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov - delta * 0.1))
    camera.updateProjectionMatrix()
  }, [])

  const zoom = useCallback((delta: number) => {
    const camera = cameraRef.current
    if (!camera) return
    camera.fov = Math.max(MIN_FOV, Math.min(MAX_FOV, camera.fov + delta))
    camera.updateProjectionMatrix()
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (mobile) return
      zoom(e.deltaY * 0.05)
    },
    [mobile, zoom],
  )

  // ── Keyboard accessibility (arrow keys pan, +/- zoom) ───────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const STEP = 5
      switch (e.key) {
        case 'ArrowLeft':
          stopAutoRotate()
          lonRef.current -= STEP
          break
        case 'ArrowRight':
          stopAutoRotate()
          lonRef.current += STEP
          break
        case 'ArrowUp':
          stopAutoRotate()
          latRef.current = Math.min(85, latRef.current + STEP)
          break
        case 'ArrowDown':
          stopAutoRotate()
          latRef.current = Math.max(-85, latRef.current - STEP)
          break
        case '+':
        case '=':
          zoom(-ZOOM_STEP)
          break
        case '-':
          zoom(ZOOM_STEP)
          break
        default:
          return
      }
      e.preventDefault()
    },
    [stopAutoRotate, zoom],
  )

  const toggleAutoRotate = useCallback(() => {
    autoRotateRef.current = !autoRotateRef.current
    setAutoRotate(autoRotateRef.current)
  }, [])

  const pillSize = mobile ? 'w-8 h-8' : 'w-10 h-10'
  const controlsPos = mobile ? 'bottom-3 right-3 gap-1.5' : 'bottom-4 right-4 gap-2'

  return (
    <div
      ref={outerRef}
      role="application"
      aria-label={`360-degree tour — ${title}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
    >
      <div
        ref={mountRef}
        className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
      />

      {/* Control cluster — bottom-right (see D5: top-right is reserved for Save/Share/Report) */}
      <div className={cn('absolute flex items-center', controlsPos)}>
        {!mobile && (
          <>
            <button
              type="button"
              onClick={() => zoom(ZOOM_STEP)}
              aria-label="Zoom out"
              className={cn(
                pillSize,
                'flex rounded-full bg-black/50 backdrop-blur text-white items-center justify-center transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              )}
            >
              <ZoomOut className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => zoom(-ZOOM_STEP)}
              aria-label="Zoom in"
              className={cn(
                pillSize,
                'flex rounded-full bg-black/50 backdrop-blur text-white items-center justify-center transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              )}
            >
              <ZoomIn className="w-4 h-4" aria-hidden="true" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={toggleAutoRotate}
          aria-label="Toggle auto-rotate"
          aria-pressed={autoRotate}
          className={cn(
            pillSize,
            'rounded-full bg-black/50 backdrop-blur flex items-center justify-center transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            autoRotate ? 'text-primary' : 'text-white',
          )}
        >
          <RotateCw className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className={cn(
            pillSize,
            'rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
          )}
        >
          {fullscreen ? (
            <Minimize className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Maximize className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Gyroscope prompt — mobile + DeviceOrientationEvent only, one-shot */}
      {showGyroBanner && (
        <div
          role="status"
          className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-sm text-center py-2 px-4"
        >
          <button type="button" onClick={activateGyro} className="inline-flex items-center">
            <Compass className="w-4 h-4 inline mr-1.5" aria-hidden="true" />
            Tilt your device to look around
          </button>
        </div>
      )}
    </div>
  )
}
