import { CheckCircle, Car, ArrowUpCircle, Sofa, Wind, Shield, LayoutGrid, Wifi, Flame } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const AMENITY_META: Record<string, { label: string; Icon: LucideIcon }> = {
  parking: { label: 'Parking', Icon: Car },
  elevator: { label: 'Elevator', Icon: ArrowUpCircle },
  furniture: { label: 'Furnished', Icon: Sofa },
  air_conditioning: { label: 'Air Conditioning', Icon: Wind },
  security: { label: 'Security', Icon: Shield },
  balcony: { label: 'Balcony', Icon: LayoutGrid },
  internet: { label: 'Internet', Icon: Wifi },
  gas: { label: 'Gas', Icon: Flame },
}

interface AmenitiesGridProps {
  amenities: string[]
}

/**
 * Icon grid of property amenities (2–4 columns).
 * Missing amenities (not in the list) are skipped.
 */
export default function AmenitiesGrid({ amenities }: AmenitiesGridProps) {
  if (amenities.length === 0) return null

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
      <ul
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
        aria-label="Property amenities"
      >
        {amenities.map((key) => {
          const meta = AMENITY_META[key]
          if (!meta) {
            return (
              <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                {key}
              </li>
            )
          }
          const { label, Icon } = meta
          return (
            <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <Icon className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden="true" />
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
