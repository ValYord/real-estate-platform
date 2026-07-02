import { z } from 'zod'

/**
 * Accepts common phone formats:
 *   +374XXXXXXXX  (Armenia)
 *   +7XXXXXXXXXX  (Russia)
 *   +XXXXXXXXXX   (generic E.164)
 */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(50),
  phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
  message: z.string().min(5, 'The message is too short').max(1000),
  /** Honeypot — must stay empty to pass spam filter */
  website: z.string().max(0, 'Spam detected').optional(),
})

export type ContactFormValues = z.infer<typeof contactSchema>

export const conversationSchema = z.object({
  propertyId: z.string().uuid('propertyId must be a UUID'),
  message: z.string().min(1).max(2000),
})

export type ConversationInput = z.infer<typeof conversationSchema>

export const favoritesSchema = z.object({
  propertyId: z.string().uuid('propertyId must be a UUID'),
})

export type FavoritesInput = z.infer<typeof favoritesSchema>

export const reportSchema = z.object({
  reason: z.enum(['fake', 'sold', 'incorrect', 'spam'], {
    errorMap: () => ({ message: 'Invalid reason' }),
  }),
  note: z.string().max(500).optional(),
})

export type ReportInput = z.infer<typeof reportSchema>
