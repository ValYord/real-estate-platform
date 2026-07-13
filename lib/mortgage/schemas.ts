import { z } from 'zod'
import {
  PRICE_MAX,
  RATE_MAX,
  RATE_MIN,
  TERM_MAX,
  TERM_MIN,
} from '@/lib/mortgage/constants'

/**
 * Client-side validation for the Monthly Payment calculator form.
 * There is no server boundary for this MVP (no save/share, no API route —
 * see docs/design/13-mortgage-calc-handoff.md §7), so this schema's only
 * enforcement point is the form itself, wired via
 * `useForm({ resolver: zodResolver(paymentInputSchema), mode: 'onChange' })`.
 */
export const paymentInputSchema = z
  .object({
    currency: z.enum(['AMD', 'RUB', 'USD', 'EUR'], {
      errorMap: () => ({ message: 'Please select a currency' }),
    }),
    price: z.coerce
      .number({ invalid_type_error: 'Home price is required' })
      .positive('Home price is required')
      .max(PRICE_MAX, 'Home price is too large'),
    downPayment: z.coerce
      .number({ invalid_type_error: 'Down payment is required' })
      .min(0, 'Down payment cannot be negative'),
    ratePct: z.coerce
      .number({ invalid_type_error: 'Interest rate is required' })
      .min(RATE_MIN, 'The rate cannot be negative')
      .max(RATE_MAX, 'Enter a realistic interest rate'),
    termYears: z.coerce
      .number({ invalid_type_error: 'Term is required' })
      .int('Term must be a whole number of years')
      .min(TERM_MIN, 'Term is required')
      .max(TERM_MAX, 'Term is too long'),
  })
  .refine((v) => v.downPayment < v.price, {
    message: 'Down payment must be less than the home price',
    path: ['downPayment'],
  })

export type PaymentInput = z.infer<typeof paymentInputSchema>
