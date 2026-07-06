'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'

interface DraggablePinMapProps {
  lat: number | undefined
  lng: number | undefined
  onMove: (lat: number, lng: number) => void
  className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

/**
 * Mapbox GL map with a draggable pin marker.
 * Falls back to a coordinate-input UI when NEXT_PUBLIC_MAPBOX_TOKEN is absent.
 */
export default function DraggablePinMap({ lat, lng, onMove, className = 'h-[300px]' }: DraggablePinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const markerRef = useRef<MapboxMarker | null>(null)
  const [mapError, setMapError] = useState(false)

  const defaultLat = lat ?? 40.1872
  const defaultLng = lng ?? 44.5152

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) return

    let cancelled = false

    import('mapbox-gl')
      .then((module) => {
        if (cancelled || !mapContainerRef.current) return

        // mapbox-gl v3 ships its own types; the namespace is the default export.
        // Using `as` here because the dynamic-import module type and the static
        // import type are structurally identical but TypeScript cannot prove it
        // across the async boundary — this is intentional, not a bypass.
        const mapboxgl = module.default
        mapboxgl.accessToken = MAPBOX_TOKEN!

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [defaultLng, defaultLat],
          zoom: lat != null ? 14 : 10,
        })

        mapRef.current = map as MapboxMap

        const marker = new mapboxgl.Marker({ draggable: true })
          .setLngLat([defaultLng, defaultLat])
          .addTo(map)

        markerRef.current = marker as MapboxMarker

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          onMove(lngLat.lat, lngLat.lng)
        })

        map.on('click', (e) => {
          marker.setLngLat([e.lngLat.lng, e.lngLat.lat])
          onMove(e.lngLat.lat, e.lngLat.lng)
        })
      })
      .catch(() => {
        if (!cancelled) setMapError(true)
      })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
    // onMove intentionally excluded to avoid re-initialising the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external lat/lng changes into the marker (e.g. from geocoding)
  useEffect(() => {
    if (markerRef.current && lat != null && lng != null) {
      markerRef.current.setLngLat([lng, lat])
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 })
    }
  }, [lat, lng])

  if (!MAPBOX_TOKEN || mapError) {
    return <CoordinateFallback lat={lat} lng={lng} onMove={onMove} className={className} />
  }

  return (
    <div className="space-y-2">
      <div
        ref={mapContainerRef}
        className={`${className} rounded-xl overflow-hidden border border-gray-200`}
        aria-label="Map: drag the pin to the property location"
      />
      <p className="text-xs text-gray-500">
        <MapPin className="inline w-3 h-3 mr-1" aria-hidden="true" />
        Drag the marker or click on the map to set the exact location.
      </p>
    </div>
  )
}

/** Fallback when Mapbox token is absent or map fails to load */
function CoordinateFallback({
  lat,
  lng,
  onMove,
  className,
}: DraggablePinMapProps & { className: string }) {
  return (
    <div
      className={`${className} rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-4 p-6`}
    >
      <MapPin className="w-8 h-8 text-gray-400" aria-hidden="true" />
      <p className="text-sm text-gray-500 text-center">
        Enter the coordinates manually (Mapbox not configured).
      </p>
      <div className="flex gap-3 w-full max-w-xs">
        <div className="flex-1">
          <label htmlFor="coord-lat" className="text-xs text-gray-500 mb-1 block">
            Latitude
          </label>
          <input
            id="coord-lat"
            type="number"
            step="0.000001"
            defaultValue={lat ?? ''}
            placeholder="40.1872"
            className="h-9 w-full border border-gray-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => {
              const newLat = parseFloat(e.target.value)
              if (!isNaN(newLat)) onMove(newLat, lng ?? 44.5152)
            }}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="coord-lng" className="text-xs text-gray-500 mb-1 block">
            Longitude
          </label>
          <input
            id="coord-lng"
            type="number"
            step="0.000001"
            defaultValue={lng ?? ''}
            placeholder="44.5152"
            className="h-9 w-full border border-gray-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            onChange={(e) => {
              const newLng = parseFloat(e.target.value)
              if (!isNaN(newLng)) onMove(lat ?? 40.1872, newLng)
            }}
          />
        </div>
      </div>
    </div>
  )
}
