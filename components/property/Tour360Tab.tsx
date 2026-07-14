'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Globe, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseTourData } from '@/lib/tour360/schemas'
import { supportsWebGL } from '@/lib/tour360/featureDetect'

// The panorama renderer statically imports `three` — dynamically importing
// *it* (not just this file) keeps three.js out of the bundle entirely for
// embed/video-only listings, where it would never be used.
const PanoramaViewer = dynamic(() => import('./PanoramaViewer'), { ssr: false })

interface Tour360TabProps {
  tourType: 'panorama' | 'embed_url' | 'video'
  /** Raw jsonb from the API — validated here with zod before it's ever rendered. */
  tourData: unknown
  title: string
  city: string
  /** Selects the mobile sizing/control-density variant (see PropertyGallery.tsx). */
  mobile?: boolean
}

type Phase = 'idle' | 'loading' | 'ready' | 'error'

const EMBED_TIMEOUT_MS = 8000

/**
 * Page 26 — 360° Virtual Tour Viewer (Part A).
 * Lazy-loaded from PropertyGallery via `next/dynamic(..., { ssr: false })` —
 * this module (and everything it imports) is only fetched once the user
 * clicks the [🌐 360°] tab, never on the property page's initial load.
 *
 * MVP scope note: a tour is a single scene (one panorama / one embed / one
 * video) — no multi-room hotspot navigation. See D3 in
 * docs/design/26-virtual-tour-viewer-handoff.md for why: this codebase has
 * no multi-room authoring format yet (that's Part B, out of scope here).
 */
export default function Tour360Tab({ tourType, tourData, title, city, mobile = false }: Tour360TabProps) {
  const parsed = useMemo(() => parseTourData(tourType, tourData), [tourType, tourData])
  // Safe to call during render: this component is dynamically imported with
  // `ssr: false`, so it only ever mounts in the browser.
  const [webglOk] = useState(() => supportsWebGL())

  const malformed = parsed == null
  const webglUnavailable = !malformed && parsed.type === 'panorama' && !webglOk

  const [phase, setPhase] = useState<Phase>('idle')
  const [retryKey, setRetryKey] = useState(0)
  const embedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const heightClass = mobile ? 'h-[280px]' : 'h-[480px] md:h-[480px]'
  const roundedClass = mobile ? '' : 'rounded-xl'
  const containerClass = cn(heightClass, roundedClass, 'relative overflow-hidden bg-gray-900')
  const fallbackClass = cn(
    heightClass,
    roundedClass,
    'bg-gray-100 flex flex-col items-center justify-center gap-3 text-center px-6',
  )

  const handleTapToLoad = useCallback(() => setPhase('loading'), [])
  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1)
    setPhase('loading')
  }, [])
  const handleReady = useCallback(() => setPhase('ready'), [])
  const handleError = useCallback(() => setPhase('error'), [])

  // Video has nothing async to await before the <video> tag itself can
  // mount — it manages its own buffering UI once the user presses play, and
  // preload="none" means nothing is actually fetched until then either way.
  useEffect(() => {
    if (phase === 'loading' && !malformed && !webglUnavailable && parsed.type === 'video') {
      setPhase('ready')
    }
  }, [phase, malformed, webglUnavailable, parsed])

  // Broken-embed heuristic: if the iframe hasn't fired `onLoad` within
  // EMBED_TIMEOUT_MS of tapping to load, treat it as unavailable.
  useEffect(() => {
    if (phase !== 'loading' || malformed || parsed.type !== 'embed_url') return
    embedTimerRef.current = setTimeout(() => setPhase('error'), EMBED_TIMEOUT_MS)
    return () => {
      if (embedTimerRef.current) clearTimeout(embedTimerRef.current)
    }
  }, [phase, malformed, parsed, retryKey])

  const handleEmbedLoad = useCallback(() => {
    if (embedTimerRef.current) clearTimeout(embedTimerRef.current)
    setPhase('ready')
  }, [])

  // ── Malformed tour_data — rare/theoretical (a corrupt DB row); no retry. ───
  if (malformed) {
    return (
      <div role="alert" className={fallbackClass}>
        <AlertTriangle className="w-10 h-10 text-gray-400" aria-hidden="true" />
        <p className="text-gray-600 font-medium">This tour couldn&apos;t be loaded</p>
      </div>
    )
  }

  // ── No WebGL — static wide image, no interactive controls. ─────────────────
  if (webglUnavailable && parsed.type === 'panorama') {
    return (
      <div className={containerClass}>
        <Image
          src={parsed.data.panoramaUrls[0]}
          alt={`${title} — ${city}, 360° panorama (static preview)`}
          fill
          sizes="(max-width: 1280px) 100vw, 760px"
          className="object-cover"
        />
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
          Your browser doesn&apos;t support 360° view
        </div>
      </div>
    )
  }

  // ── Runtime failure (broken embed / panorama asset failed to load). ────────
  if (phase === 'error') {
    return (
      <div role="alert" className={fallbackClass}>
        <AlertTriangle className="w-10 h-10 text-gray-400" aria-hidden="true" />
        <p className="text-gray-600 font-medium">The tour is unavailable</p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Tap-to-load placeholder — gates the heavy panorama/embed/video asset. ──
  if (phase === 'idle') {
    const sizeHint = parsed.type === 'panorama' ? parsed.data.sizeMB : undefined
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleTapToLoad}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleTapToLoad()
          }
        }}
        className={cn(fallbackClass, 'cursor-pointer hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset')}
      >
        <Globe className="w-10 h-10 text-gray-400" aria-hidden="true" />
        <p className="text-gray-600 font-medium">Tap to load 360° tour</p>
        {sizeHint != null && (
          <p className="text-sm text-gray-400">~{sizeHint} MB · uses mobile data</p>
        )}
      </div>
    )
  }

  // phase is 'loading' or 'ready' from here on — the real asset mounts once
  // (on entering 'loading') and stays mounted through 'ready', fading in via
  // opacity so the loading → ready swap doesn't pop (§3.4 of the design doc).
  const showLoadingOverlay = phase === 'loading'

  if (parsed.type === 'panorama') {
    return (
      <div className={containerClass}>
        {showLoadingOverlay && (
          <>
            <Image
              src={parsed.data.panoramaUrls[0]}
              alt=""
              fill
              aria-hidden="true"
              className="object-cover blur-xl scale-110 opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
              <p role="status" className="text-white text-sm mt-2">
                Loading 360° tour…
              </p>
            </div>
          </>
        )}
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-300',
            phase === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
        >
          <PanoramaViewer
            key={retryKey}
            panoramaUrl={parsed.data.panoramaUrls[0]}
            title={title}
            mobile={mobile}
            onReady={handleReady}
            onError={handleError}
          />
        </div>
      </div>
    )
  }

  if (parsed.type === 'embed_url') {
    return (
      <div className={containerClass}>
        {showLoadingOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin" aria-hidden="true" />
            <p role="status" className="text-white text-sm mt-2">
              Loading 360° tour…
            </p>
          </div>
        )}
        <iframe
          key={retryKey}
          src={parsed.data.embedUrl}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
          className={cn(
            'w-full h-full border-0 transition-opacity duration-300',
            phase === 'ready' ? 'opacity-100' : 'opacity-0',
          )}
          title={`360° virtual tour — ${title}`}
          onLoad={handleEmbedLoad}
        />
      </div>
    )
  }

  // video — jumps straight from 'loading' to 'ready' (see the effect above).
  return (
    <div className={containerClass}>
      <video
        src={parsed.data.videoUrl}
        controls
        playsInline
        preload="none"
        className="w-full h-full object-contain"
        aria-label={`${title} — 360° video walkthrough`}
      />
    </div>
  )
}
