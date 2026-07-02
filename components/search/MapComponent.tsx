'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MapPin } from '@/lib/search/types'

interface MapComponentProps {
  pins: MapPin[]
  hoveredPinId: string | null
  onPinHover: (id: string | null) => void
  onBoundsChange: (bounds: string) => void
  className?: string
}

function formatPinPrice(price: number, currency: string): string {
  if (currency === 'AMD') {
    if (price >= 1_000_000) return `${Math.round(price / 1_000_000)}M`
    return `${Math.round(price / 1_000)}K`
  }
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₽'
  if (price >= 1_000) return `${symbol}${Math.round(price / 1_000)}K`
  return `${symbol}${price}`
}

type MarkerEntry = { marker: { remove: () => void }; el: HTMLElement }

export default function MapComponent({
  pins,
  hoveredPinId,
  onPinHover,
  onBoundsChange,
  className,
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('mapbox-gl').Map | null>(null)
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map())
  const [mapError, setMapError] = useState(false)
  const [showSearchArea, setShowSearchArea] = useState(false)
  const boundsChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [popupPin, setPopupPin] = useState<MapPin | null>(null)
  const visitedRef = useRef<Set<string>>(new Set())

  // Load visited pins from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('visitedPins')
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        parsed.forEach((id) => visitedRef.current.add(id))
      }
    } catch {
      // ignore
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token === 'pk.your-mapbox-public-token-here') {
      setMapError(true)
      return
    }

    let cancelled = false

    import('mapbox-gl').then((mapboxModule) => {
      if (cancelled || !containerRef.current) return
      const mapboxgl = mapboxModule.default

      mapboxgl.accessToken = token

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current!,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [44.515, 40.183], // Yerevan
          zoom: 12,
        })

        mapRef.current = map

        map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
        map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }), 'bottom-right')

        map.on('moveend', () => {
          setShowSearchArea(true)
          if (boundsChangeTimer.current) clearTimeout(boundsChangeTimer.current)
          boundsChangeTimer.current = setTimeout(() => {
            const b = map.getBounds()
            if (b) {
              const boundsStr = `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`
              onBoundsChange(boundsStr)
            }
          }, 500)
        })

        map.on('error', () => setMapError(true))
      } catch {
        setMapError(true)
      }
    }).catch(() => {
      if (!cancelled) setMapError(true)
    })

    return () => {
      cancelled = true
      if (boundsChangeTimer.current) clearTimeout(boundsChangeTimer.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync pins whenever they change
  useEffect(() => {
    const map = mapRef.current
    if (!map || mapError) return

    // Remove stale markers
    markersRef.current.forEach((_, id) => {
      if (!pins.find((p) => p.id === id)) {
        markersRef.current.get(id)?.marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Add/update markers
    pins.forEach((pin) => {
      if (!markersRef.current.has(pin.id)) {
        const el = document.createElement('div')
        el.className = 'price-pin'
        el.innerHTML = `<span>${formatPinPrice(pin.price, pin.currency)}</span>`
        el.style.cssText = `
          background: white; border: 1.5px solid #d1d5db; border-radius: 9999px;
          padding: 2px 8px; font-size: 12px; font-weight: 600; cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15); white-space: nowrap;
          transition: transform 0.15s, background 0.15s, color 0.15s;
        `
        if (visitedRef.current.has(pin.id)) {
          el.style.background = '#f3f4f6'
          el.style.color = '#6b7280'
        }

        el.addEventListener('mouseenter', () => onPinHover(pin.id))
        el.addEventListener('mouseleave', () => onPinHover(null))
        el.addEventListener('click', () => {
          setPopupPin(pin)
          visitedRef.current.add(pin.id)
          try {
            localStorage.setItem('visitedPins', JSON.stringify([...visitedRef.current]))
          } catch {
            // ignore
          }
          el.style.background = '#f3f4f6'
          el.style.color = '#6b7280'
        })

        import('mapbox-gl').then((mod) => {
          const marker = new mod.default.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([pin.lng, pin.lat])
            .addTo(map as Parameters<typeof marker.addTo>[0])
          markersRef.current.set(pin.id, { marker, el })
        }).catch(() => {})
      }
    })
  }, [pins, mapError, onPinHover])

  // Sync hover state
  useEffect(() => {
    markersRef.current.forEach(({ el }, id) => {
      const isVisited = visitedRef.current.has(id)
      if (id === hoveredPinId) {
        el.style.background = 'var(--color-primary, #2563eb)'
        el.style.color = 'white'
        el.style.borderColor = 'var(--color-primary, #2563eb)'
        el.style.transform = 'scale(1.15)'
        el.style.zIndex = '10'
      } else if (isVisited) {
        el.style.background = '#f3f4f6'
        el.style.color = '#6b7280'
        el.style.borderColor = '#d1d5db'
        el.style.transform = 'scale(1)'
        el.style.zIndex = '1'
      } else {
        el.style.background = 'white'
        el.style.color = '#111827'
        el.style.borderColor = '#d1d5db'
        el.style.transform = 'scale(1)'
        el.style.zIndex = '1'
      }
    })
  }, [hoveredPinId])

  const handleSearchThisArea = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const b = map.getBounds()
    if (b) {
      const boundsStr = `${b.getWest().toFixed(4)},${b.getSouth().toFixed(4)},${b.getEast().toFixed(4)},${b.getNorth().toFixed(4)}`
      onBoundsChange(boundsStr)
    }
    setShowSearchArea(false)
  }, [onBoundsChange])

  if (mapError) {
    return (
      <div className={cn('flex flex-col items-center justify-center bg-gray-100', className)}>
        <p className="text-gray-500 font-medium">Map unavailable</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Search this area button */}
      {showSearchArea && (
        <button
          onClick={handleSearchThisArea}
          className="bg-white shadow-md rounded-full px-4 h-10 text-sm font-medium absolute top-4 left-1/2 -translate-x-1/2 hover:bg-gray-50 transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Search this area
        </button>
      )}

      {/* Mini popup card */}
      {popupPin && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-20">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-gray-900">
                {formatPinPrice(popupPin.price, popupPin.currency)} {popupPin.currency}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Click to view property</p>
            </div>
            <button
              onClick={() => setPopupPin(null)}
              aria-label="Close popup"
              className="text-gray-400 hover:text-gray-600 text-lg leading-none focus-visible:outline-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
