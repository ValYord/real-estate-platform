import type { Currency } from '@/types/database'

export interface PropertyListItem {
  id: string
  slug: string
  title: Record<string, string>
  price: number
  currency: Currency
  dealType: 'sale' | 'rent'
  area: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floorsTotal: number | null
  city: string
  district: string | null
  lat: number | null
  lng: number | null
  cover: string | null
  badges: PropertyBadge[]
  isFavorited: boolean
  isNew: boolean
  isFeatured: boolean
  status: string
}

export type PropertyBadge = 'new' | 'reduced' | 'featured' | 'sold'

export interface MapPin {
  id: string
  lat: number
  lng: number
  price: number
  currency: Currency
}

export interface PropertiesResponse {
  items: PropertyListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  mapPins: MapPin[]
}
