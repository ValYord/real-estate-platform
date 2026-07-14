'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PropertyMapProps {
  lat: number
  lng: number
  hideExact?: boolean
  title?: string
  /** Show the "Map" heading above the embed. Defaults to `true` (property page behavior). */
  showHeading?: boolean
  /** Heading text. Defaults to "Map". */
  heading?: string
  /** Label for the fallback/error state. Defaults to "Map unavailable". */
  unavailableLabel?: string
  /** Label for the "Open in Google Maps" link. Defaults to "Open in Google Maps". */
  openInGoogleMapsLabel?: string
  /** Map embed height. Defaults to `h-[360px]` (property page size). */
  heightClassName?: string
  /** Wrapper classes (border/spacing). Defaults to the property page's section spacing. */
  containerClassName?: string
}

/**
 * Embedded Mapbox map — shows the property location on the property page, or
 * (reused, per docs/en/pages/23-static.md §3.2/§5) the office location on
 * the Contact page. If hideExact is true, shows a ~300 m radius circle
 * instead of an exact pin. Falls back gracefully when the Mapbox token is
 * missing.
 */
export default function PropertyMap({
  lat,
  lng,
  hideExact,
  title,
  showHeading = true,
  heading = 'Map',
  unavailableLabel = 'Map unavailable',
  openInGoogleMapsLabel = 'Open in Google Maps',
  heightClassName = 'h-[360px]',
  containerClassName = 'border-t border-gray-200 pt-6 mt-6',
}: PropertyMapProps) {
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
    <div className={containerClassName}>
      {showHeading && (
        <h2 id="property-map" className="text-xl font-semibold text-gray-900 mb-4">
          {heading}
        </h2>
      )}
      {mapError ? (
        <div className={`${heightClassName} bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-3`}>
          <p className="text-gray-500 font-medium">{unavailableLabel}</p>
          <a
            href={googleMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {openInGoogleMapsLabel}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className={`relative rounded-xl overflow-hidden ${heightClassName}`}>
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
            {openInGoogleMapsLabel}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  )
}
