import { z } from 'zod'

/**
 * Accepts common international phone formats (E.164-ish):
 *   +374XXXXXXXX  (Armenia)
 *   +7XXXXXXXXXX  (Russia)
 *   +XXXXXXXXXX   (generic)
 */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

/**
 * Validation schema for the `/contact` page form (Page 23).
 * Mirrors the contract documented in docs/en/pages/23-static.md §5.
 *
 * Distinct from `lib/property/schemas.ts#contactSchema`, which validates the
 * short "quick message to the seller" form on the property detail page.
 */
export const contactPageSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(50),
  email: z.string().trim().email('Invalid email address'),
  phone: z
    .string()
    .trim()
    .regex(E164_PHONE, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  subject: z.enum(['general', 'support', 'partnership', 'complaint'], {
    errorMap: () => ({ message: 'Please choose a topic' }),
  }),
  message: z.string().trim().min(10, 'Message is too short').max(2000),
  /** Honeypot — must stay empty. Real users never see or fill this field. */
  website: z.string().max(0, 'Spam detected').optional(),
})

export type ContactPageFormValues = z.infer<typeof contactPageSchema>

export const CONTACT_SUBJECTS = ['general', 'support', 'partnership', 'complaint'] as const
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]
