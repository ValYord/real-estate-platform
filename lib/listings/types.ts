/**
 * TypeScript types for the listing wizard.
 * These are client-safe types used in wizard components and hooks.
 */

import type { Step1Data, Step2Data, Step3Data, Step5Data, Step6Data, MediaItem } from './schemas'

/** The shape stored in `react-hook-form` across all 6 steps. */
export interface WizardFormData {
  // Step 1
  dealType: Step1Data['dealType']
  propertyType: Step1Data['propertyType']
  // Step 2
  country: Step2Data['country']
  city: Step2Data['city']
  district?: Step2Data['district']
  address?: Step2Data['address']
  buildingApt?: Step2Data['buildingApt']
  lat?: number
  lng?: number
  hideExact: boolean
  // Step 3
  areaM2?: number
  rooms?: number
  bedrooms?: number
  bathrooms?: number
  floor?: number
  floorsTotal?: number
  yearBuilt?: number
  condition?: Step3Data['condition']
  heating: boolean
  balcony: boolean
  parking: boolean
  elevator: boolean
  amenities: string[]
  title: { hy: string; ru?: string; en?: string }
  description: { hy: string; ru?: string; en?: string }
  // Step 4
  media: MediaItem[]
  videoUrl?: string
  tour360Url?: string
  // Step 5
  price?: number
  currency?: Step5Data['currency']
  negotiable: boolean
  utilitiesIncluded: boolean
  deposit?: number
  minRentTermMonths?: number
  // Step 6
  contactName?: string
  contactPhone?: string
  contactPreference: Step6Data['contactPreference']
  termsAccepted?: true
}

/** Auto-save badge states */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** Per-file upload states for Step 4 */
export interface UploadFile {
  /** Local temp id for tracking before mediaId is returned */
  tempId: string
  /** Returned by the signed-URL endpoint */
  mediaId?: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  /** Permanent CDN URL returned after confirmation */
  url?: string
  thumb?: string
  order: number
  errorMessage?: string
}

/** Payload from limit-reached API error */
export interface LimitReachedPayload {
  error: 'limit_reached'
  limit: number
  active: number
}

/** Payload from publish incomplete API error */
export interface IncompletePayload {
  error: 'incomplete'
  missing: string[]
}

/** Draft data returned by GET /api/listings/[id] */
export interface ListingDraft {
  id: string
  status: 'draft' | 'active' | 'pending' | 'archived' | 'sold'
  dealType?: WizardFormData['dealType']
  propertyType?: WizardFormData['propertyType']
  country?: string
  city?: string
  district?: string
  address?: string
  buildingApt?: string
  lat?: number | null
  lng?: number | null
  hideExact?: boolean
  areaM2?: number | null
  rooms?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  floor?: number | null
  floorsTotal?: number | null
  yearBuilt?: number | null
  condition?: string | null
  heating?: boolean
  balcony?: boolean
  parking?: boolean
  elevator?: boolean
  amenities?: string[]
  title?: { hy?: string; ru?: string; en?: string }
  description?: { hy?: string; ru?: string; en?: string }
  media?: MediaItem[]
  videoUrl?: string | null
  tour360Url?: string | null
  price?: number | null
  currency?: WizardFormData['currency']
  negotiable?: boolean
  utilitiesIncluded?: boolean
  deposit?: number | null
  minRentTermMonths?: number | null
  contactName?: string | null
  contactPhone?: string | null
  contactPreference?: 'phone_and_chat' | 'chat_only'
  savedAt?: string
}
