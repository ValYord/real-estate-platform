import type { PropertyDetail, SimilarProperty } from './types'

/** Default mock photos for the gallery. */
const MOCK_PHOTOS = [
  {
    id: 'm1',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
    order: 0,
  },
  {
    id: 'm2',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
    order: 1,
  },
  {
    id: 'm3',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=800&fit=crop',
    order: 2,
  },
  {
    id: 'm4',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=800&fit=crop',
    order: 3,
  },
  {
    id: 'm5',
    type: 'photo' as const,
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=800&fit=crop',
    order: 4,
  },
]

/** Seed data keyed by property ID for the mock detail endpoint. */
export const MOCK_PROPERTIES: Record<string, PropertyDetail> = {
  '1': {
    id: '1',
    slug: 'yerevan-arabkir-2-bedroom-apartment',
    dealType: 'sale',
    status: 'active',
    price: 52000000,
    currency: 'AMD',
    title: {
      hy: '2 սենյականոց բնակարան Արաբկիրում',
      ru: '2-комнатная квартира в Арабкире',
      en: '2-bedroom apartment in Arabkir',
    },
    description: {
      hy: 'Գեղեցիկ 2 սենյականոց բնակարան Արաբկիր թաղամասում: Վերանորոգված է 2021 թ., ունի արևոտ կողմնորոշում: Հարևանությամբ կան դպրոցներ, խանութներ և հանրային փոխադրամիջոցներ:',
      ru: 'Красивая 2-комнатная квартира в районе Арабкир. Отремонтирована в 2021 году, солнечная ориентация. Рядом школы, магазины и общественный транспорт.',
      en: 'Beautiful 2-bedroom apartment in the Arabkir district. Renovated in 2021, sunny orientation. Nearby schools, shops and public transport. The apartment features a modern kitchen, spacious living room and a balcony with city views.',
    },
    area: 75,
    rooms: 2,
    bedrooms: 2,
    bathrooms: 1,
    floor: 4,
    floorsTotal: 9,
    yearBuilt: 2018,
    propertyType: 'apartment',
    location: {
      city: 'Yerevan',
      district: 'Arabkir',
      address: 'Bagrevand Street 14',
      lat: 40.2001,
      lng: 44.4893,
      hideExact: false,
    },
    amenities: ['parking', 'elevator', 'furniture', 'air_conditioning', 'balcony', 'internet'],
    heating: 'central',
    condition: 'renovated',
    media: MOCK_PHOTOS,
    // Page 26 — this listing has a 360° panorama tour, so the [🌐 360°] tab
    // renders for it; property '2' below has no tour data, so its tab is
    // absent entirely (the "no tour" fixture used by tests).
    tourType: 'panorama',
    tourData: {
      panoramaUrls: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=4096&h=2048&fit=crop',
      ],
      sizeMB: 8,
    },
    owner: {
      id: '12',
      name: 'Davit Hakobyan',
      avatar: null,
      phone: '+374 55 123 456',
      role: 'agent',
      agent: { agency: 'X Realty', verified: true, rating: 4.8, reviews: 12 },
    },
    viewsCount: 1240,
    favoritesCount: 18,
    isFeatured: true,
    isNew: false,
    isOwner: false,
    isFavorited: false,
  },
  '2': {
    id: '2',
    slug: 'yerevan-kentron-3-bedroom-apartment',
    dealType: 'sale',
    status: 'active',
    price: 85000000,
    currency: 'AMD',
    title: {
      hy: '3 սենյականոց բնակարան Կենտրոնում',
      ru: '3-комнатная квартира в Центре',
      en: '3-bedroom apartment in Kentron',
    },
    description: {
      hy: 'Ընդարձակ 3 սենյականոց բնակարան Կենտրոն թաղամասում:',
      ru: 'Просторная 3-комнатная квартира в центральном районе.',
      en: 'Spacious 3-bedroom apartment in the central Kentron district.',
    },
    area: 110,
    rooms: 3,
    bedrooms: 3,
    bathrooms: 2,
    floor: 7,
    floorsTotal: 12,
    yearBuilt: 2015,
    propertyType: 'apartment',
    location: {
      city: 'Yerevan',
      district: 'Kentron',
      address: 'Abovyan Street 25',
      lat: 40.1872,
      lng: 44.5152,
      hideExact: false,
    },
    amenities: ['parking', 'elevator', 'security', 'balcony', 'internet'],
    heating: 'central',
    condition: 'good',
    media: MOCK_PHOTOS,
    // No tour data on this listing — the [🌐 360°] tab must not render at all.
    tourType: null,
    tourData: null,
    owner: {
      id: '13',
      name: 'Anna Grigoryan',
      avatar: null,
      phone: '+374 77 987 654',
      role: 'agent',
      agent: { agency: 'Prime Realty', verified: true, rating: 4.5, reviews: 8 },
    },
    viewsCount: 850,
    favoritesCount: 12,
    isFeatured: true,
    isNew: false,
    isOwner: false,
    isFavorited: false,
  },
}

export const MOCK_SIMILAR: SimilarProperty[] = [
  {
    id: '2',
    slug: 'yerevan-kentron-3-bedroom-apartment',
    title: { hy: '3 սենյականոց բնակարան', en: '3-bedroom apartment in Kentron', ru: '3-комнатная квартира' },
    price: 85000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 110,
    bedrooms: 3,
    bathrooms: 2,
    city: 'Yerevan',
    district: 'Kentron',
    cover: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
    status: 'active',
  },
  {
    id: '3',
    slug: 'yerevan-nor-norq-1-bedroom-apartment',
    title: { hy: '1 սենյականոց բնակարան', en: '1-bedroom apartment in Nor Norq', ru: '1-комнатная квартира' },
    price: 28000000,
    currency: 'AMD',
    dealType: 'sale',
    area: 45,
    bedrooms: 1,
    bathrooms: 1,
    city: 'Yerevan',
    district: 'Nor Norq',
    cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
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
    bedrooms: 4,
    bathrooms: 2,
    city: 'Yerevan',
    district: 'Shengavit',
    cover: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=300&fit=crop',
    status: 'active',
  },
]

/**
 * Look up a mock property by id (or slug).
 * Returns undefined when the id is not in the seed data.
 */
export function getMockPropertyDetail(id: string): PropertyDetail | undefined {
  return MOCK_PROPERTIES[id]
}

export function getMockSimilarProperties(): SimilarProperty[] {
  return MOCK_SIMILAR
}
