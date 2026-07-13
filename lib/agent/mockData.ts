import type {
  AgentProfile,
  AgentReview,
  AgentReviewsResponse,
  OtherAgentCard,
  ReviewBreakdown,
} from './types'
import type { PropertyListItem } from '@/lib/search/types'

/**
 * Mock data used as a fallback when Supabase is not configured (mirrors
 * lib/property/mockData.ts). Keyed by slug for the profile lookup and by
 * agent id for listings/reviews sub-resources.
 */

const MOCK_AGENT_ID = 'a1000000-0000-4000-8000-000000000001'

export const MOCK_AGENT: AgentProfile = {
  id: MOCK_AGENT_ID,
  slug: 'anna-petrosyan-yerevan',
  name: 'Anna Petrosyan',
  avatar: null,
  phone: '+374 55 123 456',
  agencyName: 'X Realty',
  agencySlug: null,
  verified: true,
  status: 'active',
  tier: 'pro',
  rating: 4.8,
  reviewsCount: 37,
  bio: {
    en: 'Helping families in Yerevan find their next home for over 6 years. I specialize in apartments and new construction, and I speak Armenian, Russian, and English fluently. My goal is to make every transaction transparent and stress-free.',
    ru: 'Помогаю семьям в Ереване найти новый дом уже более 6 лет. Специализируюсь на квартирах и новостройках.',
    hy: 'Օգնում եմ Երևանի ընտանիքներին գտնել իրենց նոր տունը 6 տարուց ավել:',
  },
  specialties: ['apartments', 'new_construction', 'commercial', 'rentals'],
  languages: ['hy', 'ru', 'en'],
  scope: ['Yerevan', 'Kotayk'],
  stats: {
    listingsActive: 24,
    dealsClosed: 112,
    avgResponseHours: 2,
    memberSince: '2020',
  },
  badges: ['top_agent', 'fast_responder'],
  createdAt: '2020-03-01T00:00:00Z',
  isOwner: false,
}

export const MOCK_OTHER_AGENTS: OtherAgentCard[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    slug: 'davit-hakobyan-yerevan',
    name: 'Davit Hakobyan',
    avatar: null,
    agencyName: 'X Realty',
    rating: 4.6,
    reviewsCount: 21,
    verified: true,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    slug: 'lilit-sargsyan-yerevan',
    name: 'Lilit Sargsyan',
    avatar: null,
    agencyName: null,
    rating: 4.9,
    reviewsCount: 54,
    verified: true,
  },
]

export const MOCK_AGENT_LISTINGS: PropertyListItem[] = [
  {
    id: '1',
    slug: 'yerevan-arabkir-2-bedroom-apartment',
    title: { en: '2-bedroom apartment in Arabkir' },
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
    lat: null,
    lng: null,
    cover: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    badges: ['featured'],
    isFavorited: false,
    isNew: false,
    isFeatured: true,
    status: 'active',
  },
  {
    id: '2',
    slug: 'yerevan-kentron-3-bedroom-apartment',
    title: { en: '3-bedroom apartment in Kentron' },
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
    lat: null,
    lng: null,
    cover: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    badges: ['new'],
    isFavorited: false,
    isNew: true,
    isFeatured: false,
    status: 'active',
  },
  {
    id: '3',
    slug: 'yerevan-malatia-1-bedroom-rental',
    title: { en: '1-bedroom apartment for rent in Malatia' },
    price: 250000,
    currency: 'AMD',
    dealType: 'rent',
    area: 45,
    rooms: 1,
    bedrooms: 1,
    bathrooms: 1,
    floor: 2,
    floorsTotal: 5,
    city: 'Yerevan',
    district: 'Malatia-Sebastia',
    lat: null,
    lng: null,
    cover: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop',
    badges: [],
    isFavorited: false,
    isNew: false,
    isFeatured: false,
    status: 'active',
  },
]

export const MOCK_AGENT_REVIEWS: AgentReview[] = [
  {
    id: 'r1000000-0000-4000-8000-000000000001',
    agentId: MOCK_AGENT_ID,
    authorId: 'u1000000-0000-4000-8000-000000000001',
    authorName: 'Suren M.',
    authorAvatar: null,
    rating: 5,
    text: 'Very professional, helped us find an apartment in less than two weeks.',
    reply: 'Thank you, Suren — it was a pleasure working with you!',
    repliedAt: '2026-05-02T10:00:00Z',
    createdAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'r1000000-0000-4000-8000-000000000002',
    agentId: MOCK_AGENT_ID,
    authorId: 'u1000000-0000-4000-8000-000000000002',
    authorName: 'Lilit K.',
    authorAvatar: null,
    rating: 4,
    text: 'Good communication throughout the sale process.',
    reply: null,
    repliedAt: null,
    createdAt: '2026-04-20T09:00:00Z',
  },
]

export function getMockReviewSummary(): AgentReviewsResponse['summary'] {
  const breakdown: ReviewBreakdown = { '1': 0, '2': 1, '3': 2, '4': 8, '5': 26 }
  return { average: 4.8, count: 37, breakdown }
}

/** Look up the mock agent by slug (only the seed profile is available). */
export function getMockAgentBySlug(slug: string): AgentProfile | null {
  return MOCK_AGENT.slug === slug ? MOCK_AGENT : null
}

export function getMockAgentById(id: string): AgentProfile | null {
  return MOCK_AGENT.id === id ? MOCK_AGENT : null
}
