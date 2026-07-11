import 'server-only'
import type { ConversationPeer, ConversationProperty } from './types'

/**
 * Shared server-side row → API-shape mappers for the conversations routes
 * (list + detail), kept in one place so "verified" / title-fallback logic
 * can't drift between the two endpoints.
 */

export interface ProfileRef {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'agent' | 'admin'
  agent_slug: string | null
}

export interface PropertyRef {
  id: string
  slug: string
  title: Record<string, string>
  price: number
  currency: string
  status: string
  property_media: Array<{ url: string; sort_order: number }> | null
}

/** Supabase returns embedded relations as an object or, sometimes, a 1-item array. */
export function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function mapPeer(profile: ProfileRef | null, fallbackId: string): ConversationPeer {
  return {
    id: profile?.id ?? fallbackId,
    name: profile?.full_name ?? 'Unknown',
    avatar: profile?.avatar_url ?? null,
    role: profile?.role ?? 'user',
    verified: Boolean(profile?.role === 'agent' && profile?.agent_slug),
  }
}

export function mapProperty(property: PropertyRef | null): ConversationProperty | null {
  if (!property) return null

  const media = (property.property_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
  const title = property.title.en ?? Object.values(property.title)[0] ?? ''

  return {
    id: property.id,
    thumb: media[0]?.url ?? null,
    price: property.price,
    currency: property.currency,
    title,
    status: property.status,
  }
}
