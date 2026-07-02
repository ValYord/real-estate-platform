import type { PropertyListItem, MapPin, PropertiesResponse } from './types'
import type { Filters } from './filtersSchema'

const SEED_PROPERTIES: PropertyListItem[] = [
  {
    id: '1',
    slug: 'yerevan-arabkir-2-bedroom-apartment',
    title: { hy: '2 սենյականոց բնակարան', en: '2-bedroom apartment in Arabkir', ru: '2-комнатная квартира в Арабкире' },
    price: 52000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 75,
    rooms: 2,
    bedrooms: 2,
    bathrooms: 1,
    floor: 4,
    floorsTotal: 9,
    city: 'Yerevan',
    district: 'Arabkir',
    lat: 40.2001,
    lng: 44.4893,
    cover: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    badges: ['new'],
    isFavorited: false,
    isNew: true,
    isFeatured: false,
    status: 'active',
  },
  {
    id: '2',
    slug: 'yerevan-kentron-3-bedroom-apartment',
    title: { hy: '3 սենյականոց բնակարան', en: '3-bedroom apartment in Kentron', ru: '3-комнатная квартира в Кентроне' },
    price: 85000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 110,
    rooms: 3,
    bedrooms: 3,
    bathrooms: 2,
    floor: 7,
    floorsTotal: 12,
    city: 'Yerevan',
    district: 'Kentron',
    lat: 40.1872,
    lng: 44.5152,
    cover: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
    badges: ['featured'],
    isFavorited: false,
    isNew: false,
    isFeatured: true,
    status: 'active',
  },
  {
    id: '3',
    slug: 'yerevan-nor-norq-1-bedroom-apartment',
    title: { hy: '1 սենյականոց բնակարան', en: '1-bedroom apartment in Nor Norq', ru: '1-комнатная квартира в Нор Норке' },
    price: 28000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 45,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    floorsTotal: 5,
    city: 'Yerevan',
    district: 'Nor Norq',
    lat: 40.1780,
    lng: 44.5620,
    cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
    badges: ['reduced'],
    isFavorited: false,
    isNew: false,
    isFeatured: false,
    status: 'active',
  },
  {
    id: '4',
    slug: 'yerevan-shengavit-house-for-sale',
    title: { hy: 'Տուն Շենգավիթում', en: 'House in Shengavit', ru: 'Дом в Шенгавите' },
    price: 150000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 200,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    floor: 1,
    floorsTotal: 2,
    city: 'Yerevan',
    district: 'Shengavit',
    lat: 40.1612,
    lng: 44.5018,
    cover: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
    badges: [],
    isFavorited: false,
    isNew: false,
    isFeatured: false,
    status: 'active',
  },
  {
    id: '5',
    slug: 'yerevan-malatia-2-bedroom-rent',
    title: { hy: '2 սենյականոց վարձով', en: '2-bedroom for rent in Malatia', ru: '2-комнатная в аренду в Малатии' },
    price: 280000,
    currency: 'AMD',
    dealType: 'rent',
    area: 65,
    rooms: 2,
    bedrooms: 2,
    bathrooms: 1,
    floor: 3,
    floorsTotal: 9,
    city: 'Yerevan',
    district: 'Malatia',
    lat: 40.1645,
    lng: 44.4795,
    cover: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop',
    badges: ['new'],
    isFavorited: false,
    isNew: true,
    isFeatured: false,
    status: 'active',
  },
  {
    id: '6',
    slug: 'yerevan-davtashen-studio-rent',
    title: { hy: 'Ստուդիո բնակարան', en: 'Studio apartment for rent in Davtashen', ru: 'Студия в аренду в Давташене' },
    price: 150000,
    currency: 'AMD',
    dealType: 'rent',
    area: 35,
    rooms: 1,
    bedrooms: 0,
    bathrooms: 1,
    floor: 5,
    floorsTotal: 9,
    city: 'Yerevan',
    district: 'Davtashen',
    lat: 40.2089,
    lng: 44.4620,
    cover: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=300&fit=crop',
    badges: [],
    isFavorited: false,
    isNew: false,
    isFeatured: false,
    status: 'active',
  },
]

function applyFilters(props: PropertyListItem[], filters: Filters): PropertyListItem[] {
  return props.filter((p) => {
    if (filters.deal && p.dealType !== filters.deal) return false
    if (filters.city && p.city.toLowerCase() !== filters.city.toLowerCase()) return false
    if (filters.district && p.district?.toLowerCase() !== filters.district.toLowerCase()) return false
    if (filters.priceMin && p.price < filters.priceMin) return false
    if (filters.priceMax && p.price > filters.priceMax) return false
    if (filters.beds !== undefined && filters.beds > 0 && (p.bedrooms ?? 0) < filters.beds) return false
    if (filters.baths !== undefined && filters.baths > 0 && (p.bathrooms ?? 0) < filters.baths) return false
    if (filters.areaMin && (p.area ?? 0) < filters.areaMin) return false
    return true
  })
}

function sortProperties(props: PropertyListItem[], sort: string): PropertyListItem[] {
  const sorted = [...props]
  switch (sort) {
    case 'price_asc': return sorted.sort((a, b) => a.price - b.price)
    case 'price_desc': return sorted.sort((a, b) => b.price - a.price)
    case 'area_desc': return sorted.sort((a, b) => (b.area ?? 0) - (a.area ?? 0))
    default: return sorted
  }
}

export function getMockPropertiesResponse(filters: Filters): PropertiesResponse {
  const PAGE_SIZE = 20
  const filtered = applyFilters(SEED_PROPERTIES, filters)
  const sorted = sortProperties(filtered, filters.sort)
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(filters.page, totalPages)
  const items = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const mapPins: MapPin[] = items
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({
      id: p.id,
      lat: p.lat!,
      lng: p.lng!,
      price: p.price,
      currency: p.currency,
    }))

  return { items, total, page, pageSize: PAGE_SIZE, totalPages, mapPins }
}
