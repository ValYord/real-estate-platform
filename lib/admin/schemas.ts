import { z } from 'zod'

/**
 * Reject-reason enum per docs/en/pages/24-admin.md §5 "Validation (zod)".
 * `required_error` surfaces as the inline validation message in
 * RejectReasonModal when no option is selected.
 */
export const rejectReasonEnum = z.enum(
  ['bad_photos', 'duplicate', 'suspicious_price', 'rule_violation', 'other'],
  { required_error: 'Select a reason' },
)

export const rejectSchema = z.object({
  reason: rejectReasonEnum,
  note: z.string().max(500).optional(),
})

export type RejectReason = z.infer<typeof rejectReasonEnum>
export type RejectInput = z.infer<typeof rejectSchema>
