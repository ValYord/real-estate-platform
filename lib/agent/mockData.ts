import type {
  AgentCardData,
  AgentProfile,
  AgentReview,
  AgentReviewsResponse,
  AgentsListResponse,
  OtherAgentCard,
  ReviewBreakdown,
} from './types'
import { AGENTS_PAGE_SIZE } from './types'
import type { AgentsQueryInput } from './schemas'
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

// ── Directory / Find an Agent (Page 11, MVP) ────────────────────────────────

interface MockAgentCardRow extends AgentCardData {
  /** Mirrors `agents.status` — a 'suspended' row must never reach the response. */
  status: 'active' | 'suspended'
  /** Mirrors `profiles.agent_slug IS NOT NULL` — unpublished agents are hidden too. */
  published: boolean
}

/**
 * Seed dataset for the `/agents` directory mock fallback. Includes one
 * suspended and one unpublished agent so the exclusion logic in
 * `getMockAgentsResponse` (mirroring the Supabase query filters in
 * app/api/agents/route.ts) has something real to filter out.
 */
const ALL_MOCK_AGENT_CARD_ROWS: MockAgentCardRow[] = [
  {
    id: 'a2000000-0000-4000-8000-000000000001',
    slug: 'anna-petrosyan-yerevan',
    name: 'Anna Petrosyan',
    avatar: null,
    agencyName: 'X Realty',
    verified: true,
    tier: 'pro',
    rating: 4.8,
    reviewsCount: 37,
    languages: ['hy', 'ru', 'en'],
    scope: ['Yerevan', 'Kotayk'],
    specialties: ['apartments', 'new_construction', 'commercial', 'rentals'],
    listingsActive: 24,
    avgResponseHours: 2,
    createdAt: '2020-03-01T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000002',
    slug: 'davit-hakobyan-yerevan',
    name: 'Davit Hakobyan',
    avatar: null,
    agencyName: 'X Realty',
    verified: true,
    tier: 'free',
    rating: 4.6,
    reviewsCount: 21,
    languages: ['hy', 'en'],
    scope: ['Yerevan'],
    specialties: ['houses', 'land'],
    listingsActive: 9,
    avgResponseHours: 4,
    createdAt: '2021-06-15T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000003',
    slug: 'lilit-sargsyan-yerevan',
    name: 'Lilit Sargsyan',
    avatar: null,
    agencyName: null,
    verified: true,
    tier: 'premium',
    rating: 4.9,
    reviewsCount: 54,
    languages: ['hy', 'ru'],
    scope: ['Yerevan'],
    specialties: ['apartments', 'commercial'],
    listingsActive: 31,
    avgResponseHours: 1,
    createdAt: '2019-01-10T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000004',
    slug: 'karen-avetisyan-gyumri',
    name: 'Karen Avetisyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 3.9,
    reviewsCount: 6,
    languages: ['hy'],
    scope: ['Gyumri'],
    specialties: ['apartments', 'rentals'],
    listingsActive: 3,
    avgResponseHours: 12,
    createdAt: '2024-02-20T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000005',
    slug: 'mane-ghukasyan-gyumri',
    name: 'Mane Ghukasyan',
    avatar: null,
    agencyName: 'North Realty',
    verified: true,
    tier: 'free',
    rating: 4.2,
    reviewsCount: 12,
    languages: ['hy', 'ru'],
    scope: ['Gyumri'],
    specialties: ['houses', 'land'],
    listingsActive: 5,
    avgResponseHours: 6,
    createdAt: '2023-08-05T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000006',
    slug: 'suren-manukyan-vanadzor',
    name: 'Suren Manukyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 4.0,
    reviewsCount: 4,
    languages: ['hy'],
    scope: ['Vanadzor'],
    specialties: ['commercial', 'land'],
    listingsActive: 1,
    avgResponseHours: 24,
    createdAt: '2025-01-01T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000007',
    slug: 'gohar-petrosyan-yerevan',
    name: 'Gohar Petrosyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 3.6,
    reviewsCount: 3,
    languages: ['ru', 'en'],
    scope: ['Yerevan'],
    specialties: ['rentals'],
    listingsActive: 2,
    avgResponseHours: 8,
    createdAt: '2026-06-01T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000008',
    slug: 'ruben-tovmasyan-yerevan',
    name: 'Ruben Tovmasyan',
    avatar: null,
    agencyName: 'X Realty',
    verified: true,
    tier: 'pro',
    rating: 4.4,
    reviewsCount: 18,
    languages: ['hy', 'en'],
    scope: ['Yerevan'],
    specialties: ['apartments', 'new_construction'],
    listingsActive: 14,
    avgResponseHours: 3,
    createdAt: '2022-04-11T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000009',
    slug: 'nare-hovhannisyan-yerevan',
    name: 'Nare Hovhannisyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 4.1,
    reviewsCount: 9,
    languages: ['hy', 'ru'],
    scope: ['Yerevan'],
    specialties: ['apartments'],
    listingsActive: 6,
    avgResponseHours: 5,
    createdAt: '2023-11-30T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000010',
    slug: 'armine-babayan-gyumri',
    name: 'Armine Babayan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 3.8,
    reviewsCount: 5,
    languages: ['hy'],
    scope: ['Gyumri'],
    specialties: ['rentals', 'apartments'],
    listingsActive: 4,
    avgResponseHours: 10,
    createdAt: '2024-09-14T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000011',
    slug: 'vahan-grigoryan-yerevan',
    name: 'Vahan Grigoryan',
    avatar: null,
    agencyName: 'X Realty',
    verified: true,
    tier: 'pro',
    rating: 4.7,
    reviewsCount: 29,
    languages: ['hy', 'ru', 'en'],
    scope: ['Yerevan'],
    specialties: ['commercial', 'apartments'],
    listingsActive: 19,
    avgResponseHours: 2,
    createdAt: '2021-01-20T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000012',
    slug: 'sofya-melkonyan-vanadzor',
    name: 'Sofya Melkonyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 3.5,
    reviewsCount: 2,
    languages: ['hy'],
    scope: ['Vanadzor'],
    specialties: ['land'],
    listingsActive: 1,
    avgResponseHours: 20,
    createdAt: '2026-01-05T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000013',
    slug: 'tigran-oganesyan-yerevan',
    name: 'Tigran Oganesyan',
    avatar: null,
    agencyName: 'North Realty',
    verified: true,
    tier: 'free',
    rating: 4.3,
    reviewsCount: 15,
    languages: ['hy', 'en'],
    scope: ['Yerevan'],
    specialties: ['houses', 'commercial'],
    listingsActive: 7,
    avgResponseHours: 5,
    createdAt: '2022-10-02T00:00:00Z',
    status: 'active',
    published: true,
  },
  {
    id: 'a2000000-0000-4000-8000-000000000014',
    slug: 'anahit-sahakyan-gyumri',
    name: 'Anahit Sahakyan',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 4.0,
    reviewsCount: 7,
    languages: ['hy', 'ru'],
    scope: ['Gyumri'],
    specialties: ['apartments', 'commercial'],
    listingsActive: 2,
    avgResponseHours: 9,
    createdAt: '2023-03-18T00:00:00Z',
    status: 'active',
    published: true,
  },
  // Suspended — must never appear in the directory response (enforced at the
  // query level in app/api/agents/route.ts, not just filtered client-side).
  {
    id: 'a2000000-0000-4000-8000-000000000099',
    slug: 'vardan-suspended-yerevan',
    name: 'Vardan Suspended',
    avatar: null,
    agencyName: null,
    verified: true,
    tier: 'free',
    rating: 4.5,
    reviewsCount: 10,
    languages: ['hy'],
    scope: ['Yerevan'],
    specialties: ['apartments'],
    listingsActive: 5,
    avgResponseHours: 3,
    createdAt: '2021-05-01T00:00:00Z',
    status: 'suspended',
    published: true,
  },
  // Unpublished (no public agent_slug yet) — also excluded.
  {
    id: 'a2000000-0000-4000-8000-000000000098',
    slug: 'nare-unpublished-yerevan',
    name: 'Nare Unpublished',
    avatar: null,
    agencyName: null,
    verified: false,
    tier: 'free',
    rating: 4.0,
    reviewsCount: 1,
    languages: ['hy'],
    scope: ['Yerevan'],
    specialties: ['apartments'],
    listingsActive: 0,
    avgResponseHours: null,
    createdAt: '2026-05-01T00:00:00Z',
    status: 'active',
    published: false,
  },
]

function toAgentCardData(row: MockAgentCardRow): AgentCardData {
  const { status, published, ...card } = row
  void status
  void published
  return card
}

/** Only active + published rows, in their seed order (no ranking applied). */
export const MOCK_AGENT_CARDS: AgentCardData[] = ALL_MOCK_AGENT_CARD_ROWS
  .filter((row) => row.status === 'active' && row.published)
  .map(toAgentCardData)

/**
 * Applies the same filter/sort/paginate semantics as the Supabase-backed
 * branch of GET /api/agents (docs/en/pages/11-find-agent.md §5) over the
 * mock dataset. Used both as the dev/CI fallback and directly in tests.
 */
export function getMockAgentsResponse(query: AgentsQueryInput): AgentsListResponse {
  let items = MOCK_AGENT_CARDS.slice()

  if (query.city) {
    const city = query.city.toLowerCase()
    items = items.filter((a) => a.scope.some((s) => s.toLowerCase() === city))
  }
  if (query.specialty) {
    items = items.filter((a) => a.specialties.includes(query.specialty as string))
  }
  if (query.lang) {
    items = items.filter((a) => a.languages.includes(query.lang as string))
  }
  if (query.minRating !== undefined) {
    items = items.filter((a) => a.rating >= (query.minRating as number))
  }

  switch (query.sort) {
    case 'newest':
      items = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'listings':
      items = items.sort((a, b) => b.listingsActive - a.listingsActive)
      break
    default:
      items = items.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
  }

  const total = items.length
  const start = (query.page - 1) * AGENTS_PAGE_SIZE
  const paged = items.slice(start, start + AGENTS_PAGE_SIZE)

  return { items: paged, total, page: query.page, pageSize: AGENTS_PAGE_SIZE }
}
