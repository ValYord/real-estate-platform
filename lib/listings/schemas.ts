import { z } from 'zod'

/** E.164-ish phone – same pattern used by auth schemas */
const E164_REGEX = /^\+[1-9]\d{6,14}$/

// ── Step 1: Deal & Property type ────────────────────────────────────────────

export const step1Schema = z.object({
  dealType: z.enum(['sale', 'rent'], {
    errorMap: () => ({ message: 'Please select a deal type' }),
  }),
  propertyType: z.enum(
    ['apartment', 'house', 'land', 'commercial', 'newdev', 'garage'],
    { errorMap: () => ({ message: 'Please select a property type' }) },
  ),
})

// ── Step 2: Location ─────────────────────────────────────────────────────────

export const step2Schema = z.object({
  country: z.string().default('AM'),
  city: z.string().min(1, 'City is required'),
  district: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
  buildingApt: z.string().max(50).optional(),
  lat: z.number({ required_error: 'Map pin is required' }),
  lng: z.number({ required_error: 'Map pin is required' }),
  hideExact: z.boolean().default(false),
})

// ── Step 3: Details ──────────────────────────────────────────────────────────

export const step3Schema = z.object({
  areaM2: z.coerce.number().positive('Area must be greater than 0'),
  rooms: z.coerce.number().int().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  floor: z.coerce.number().int().optional(),
  floorsTotal: z.coerce.number().int().min(1).optional(),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).optional(),
  condition: z
    .enum(['new', 'renovated', 'good', 'needs_renovation'])
    .optional(),
  heating: z.boolean().default(false),
  balcony: z.boolean().default(false),
  parking: z.boolean().default(false),
  elevator: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  title: z.object({
    hy: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(120, 'Title must be at most 120 characters'),
    ru: z.string().max(120).optional(),
    en: z.string().max(120).optional(),
  }),
  description: z.object({
    hy: z
      .string()
      .min(30, 'Description must be at least 30 characters')
      .max(5000, 'Description must be at most 5000 characters'),
    ru: z.string().max(5000).optional(),
    en: z.string().max(5000).optional(),
  }),
})

// ── Step 4: Media ─────────────────────────────────────────────────────────────

export const mediaItemSchema = z.object({
  mediaId: z.string().uuid(),
  url: z.string().url(),
  thumb: z.string().url().optional(),
  order: z.number().int().min(0),
})

export const step4Schema = z.object({
  media: z
    .array(mediaItemSchema)
    .min(1, 'Add at least 1 photo')
    .max(30, 'Maximum 30 photos'),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  tour360Url: z
    .string()
    .url('Invalid 360° URL')
    .optional()
    .or(z.literal('')),
})

// ── Step 5: Price ─────────────────────────────────────────────────────────────

export const step5Schema = z.object({
  price: z.coerce.number().positive('Price is required'),
  currency: z.enum(['AMD', 'RUB', 'USD', 'EUR'], {
    errorMap: () => ({ message: 'Please select a currency' }),
  }),
  negotiable: z.boolean().default(false),
  utilitiesIncluded: z.boolean().default(false),
  deposit: z.coerce.number().min(0).optional(),
  minRentTermMonths: z.coerce.number().int().min(1).optional(),
})

// ── Step 6: Contact & Publish ─────────────────────────────────────────────────

export const step6Schema = z.object({
  contactName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50),
  contactPhone: z
    .string()
    .regex(E164_REGEX, 'Invalid phone number — use international format (+374…)'),
  contactPreference: z.enum(['phone_and_chat', 'chat_only']).default('phone_and_chat'),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms to publish' }),
  }),
})

// ── Full publish schema (all steps merged) ───────────────────────────────────

export const publishSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema)

// ── Auto-save (partial patch) schema ─────────────────────────────────────────

export const patchListingSchema = publishSchema.partial()

// ── PATCH response ────────────────────────────────────────────────────────────

export const patchResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'active', 'pending', 'archived', 'sold']),
  savedAt: z.string(),
})

// ── Publish response ──────────────────────────────────────────────────────────

export const publishResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'pending']),
  slug: z.string(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type Step3Data = z.infer<typeof step3Schema>
export type Step4Data = z.infer<typeof step4Schema>
export type Step5Data = z.infer<typeof step5Schema>
export type Step6Data = z.infer<typeof step6Schema>
export type PublishData = z.infer<typeof publishSchema>
export type PatchListingData = z.infer<typeof patchListingSchema>
export type MediaItem = z.infer<typeof mediaItemSchema>
