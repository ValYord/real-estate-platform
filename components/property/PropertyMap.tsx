'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PropertyMapProps {
  lat: number
  lng: number
  hideExact?: boolean
  title?: string
}

/**
 * Embedded Mapbox map showing the property location.
 * If hideExact is true, shows a ~300 m radius circle instead of an exact pin.
 * Falls back gracefully when the Mapbox token is missing.
 */
export default function PropertyMap({ lat, lng, hideExact, title }: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('mapbox-gl').Map | null>(null)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token === 'pk.your-mapbox-public-token-here') {
      setMapError(true)
      return
    }

    let cancelled = false

    import('mapbox-gl')
      .then((mod) => {
        if (cancelled || !containerRef.current) return
        const mapboxgl = mod.default
        mapboxgl.accessToken = token

        try {
          const map = new mapboxgl.Map({
            container: containerRef.current!,
            style: 'mapbox://styles/mapbox/light-v11',
            center: [lng, lat],
            zoom: 15,
          })

          mapRef.current = map

          map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')

          map.on('load', () => {
            if (cancelled) return

            if (hideExact) {
              // Draw a circle around the approximate location
              map.addSource('approx-location', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: { type: 'Point', coordinates: [lng, lat] },
                },
              })
              map.addLayer({
                id: 'approx-circle',
                type: 'circle',
                source: 'approx-location',
                paint: {
                  'circle-radius': 80,
                  'circle-color': '#2563eb',
                  'circle-opacity': 0.15,
                  'circle-stroke-color': '#2563eb',
                  'circle-stroke-width': 2,
                  'circle-stroke-opacity': 0.4,
                },
              })
            } else {
              // Exact pin
              new mapboxgl.Marker({ color: '#2563eb' })
                .setLngLat([lng, lat])
                .addTo(map)
            }
          })

          map.on('error', () => setMapError(true))
        } catch {
          setMapError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setMapError(true)
      })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [lat, lng, hideExact])

  const googleMapsHref = `https://www.google.com/maps?q=${lat},${lng}`

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h2 id="property-map" className="text-xl font-semibold text-gray-900 mb-4">
        Map
      </h2>
      {mapError ? (
        <div className="h-[360px] bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-3">
          <p className="text-gray-500 font-medium">Map unavailable</p>
          <a
            href={googleMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Open in Google Maps
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden h-[360px] md:h-[360px]">
          <div
            ref={containerRef}
            className="w-full h-full"
            aria-label={title ? `Map showing location of ${title}` : 'Property location map'}
            role="application"
          />
          <a
            href={googleMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 left-3 bg-white shadow rounded-lg px-3 py-1.5 text-xs text-gray-700 flex items-center gap-1 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Open in Google Maps
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  )
}
