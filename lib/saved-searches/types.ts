/**
 * Type definitions for the Saved Searches + Alerts page (Page 08).
 */

import type { Filters } from '@/lib/search/filtersSchema'

export const ALERT_FREQUENCIES = ['off', 'instant', 'daily', 'weekly'] as const
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number]

/** A saved search as returned by GET /api/saved-searches. */
export interface SavedSearchItem {
  id: string
  name: string
  filters: Filters
  alertFrequency: AlertFrequency
  newMatchCount: number
  lastAlertedAt: string | null
  createdAt: string
}

export interface SavedSearchesResponse {
  items: SavedSearchItem[]
  total: number
}

export interface CreateSavedSearchResponse {
  id: string
}

export interface UpdateSavedSearchResponse {
  updated: true
}

export interface DeleteSavedSearchResponse {
  deleted: true
}
