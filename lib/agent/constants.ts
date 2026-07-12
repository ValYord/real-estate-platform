/**
 * Shared display constants for the agent directory (Page 11) filters and
 * cards. Kept separate from lib/agent/schemas.ts (validation) and
 * lib/agent/types.ts (data shapes) — this file is presentation-only and safe
 * to import from client components.
 */

export const SPECIALTY_OPTIONS = [
  'apartments',
  'houses',
  'commercial',
  'land',
  'new_construction',
  'rentals',
] as const

export const SPECIALTY_LABEL: Record<string, string> = {
  apartments: 'Apartments',
  houses: 'Houses',
  commercial: 'Commercial',
  land: 'Land',
  new_construction: 'New construction',
  rentals: 'Rentals',
}

export const LANGUAGE_OPTIONS = ['hy', 'ru', 'en'] as const

export const LANGUAGE_LABEL: Record<string, string> = {
  hy: 'Armenian',
  ru: 'Russian',
  en: 'English',
}

export const MIN_RATING_OPTIONS = [4, 4.5] as const

export const SORT_LABEL: Record<string, string> = {
  rating: 'Top rated',
  listings: 'Most listings',
  newest: 'Newest',
}
