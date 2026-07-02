/**
 * Property detail types — used by the API response and UI components.
 */

export interface PropertyOwner {
  id: string
  name: string
  avatar: string | null
  phone: string | null
  role: 'user' | 'agent' | 'admin'
  agent?: {
    agency: string
    verified: boolean
    rating: number
    reviews: number
  }
}

export interface PropertyMedia {
  id: string
  /** 'photo' maps to image, 'video', 'tour360' = virtual tour, 'floorplan', 'map' */
  type: 'photo' | 'video' | 'tour360' | 'floorplan' | 'map'
  url: string
  order: number
}

export interface PropertyLocation {
  city: string
  district: string | null
  address: string | null
  lat: number | null
  lng: number | null
  hideExact: boolean
}

export interface PropertyDetail {
  id: string
  slug: string
  dealType: 'sale' | 'rent'
  status: 'active' | 'draft' | 'pending' | 'archived' | 'sold'
  price: number
  currency: 'AMD' | 'USD' | 'EUR' | 'RUB'
  title: { hy?: string; ru?: string; en?: string }
  description: { hy?: string; ru?: string; en?: string }
  area: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floorsTotal: number | null
  yearBuilt: number | null
  propertyType: 'apartment' | 'house' | 'commercial' | 'land' | 'garage'
  location: PropertyLocation
  amenities: string[]
  heating: string | null
  condition: string | null
  media: PropertyMedia[]
  owner: PropertyOwner
  viewsCount: number
  favoritesCount: number
  isFeatured: boolean
  isNew: boolean
  isOwner: boolean
  isFavorited: boolean
}

/** Lightweight card shape returned by the similar properties endpoint. */
export interface SimilarProperty {
  id: string
  slug: string
  title: { hy?: string; ru?: string; en?: string }
  price: number
  currency: 'AMD' | 'USD' | 'EUR' | 'RUB'
  dealType: 'sale' | 'rent'
  area: number | null
  bedrooms: number | null
  bathrooms: number | null
  city: string
  district: string | null
  cover: string | null
  status: string
}
