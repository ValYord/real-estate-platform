'use client'

import dynamic from 'next/dynamic'
import type { MapPin } from '@/lib/search/types'

interface SearchMapProps {
  pins: MapPin[]
  hoveredPinId: string | null
  onPinHover: (id: string | null) => void
  onBoundsChange: (bounds: string) => void
  className?: string
}

const MapComponent = dynamic(
  () => import('./MapComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-gray-400 text-sm">Loading map…</span>
      </div>
    ),
  },
)

export function SearchMap(props: SearchMapProps) {
  return <MapComponent {...props} />
}
