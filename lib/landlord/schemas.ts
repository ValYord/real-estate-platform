import { z } from 'zod'

/** Mirrors the `type` CHECK constraint on `rental_units` (0014_landlord_rentals.sql). */
export const RENTAL_UNIT_TYPES = ['apartment', 'house', 'studio', 'commercial', 'other'] as const

/** Mirrors the `currency` CHECK constraint on `rental_units`. */
export const RENTAL_UNIT_CURRENCIES = ['AMD', 'USD', 'EUR', 'RUB'] as const

/**
 * An optional, positive numeric field left blank by an uncontrolled RHF
 * `<input type="number">` register submits `''` (not `undefined`) —
 * `z.coerce.number()` would coerce `''` to `0`, which then fails
 * `.positive()` even though the field is optional. Preprocessing blank
 * input to `undefined` first lets `.optional()` actually take effect.
 */
const optionalPositiveNumber = (message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().positive(message).optional(),
  )

/**
 * Body for `POST /api/landlord/rentals` — the `[+ Add unit]` form
 * (docs/en/pages/19-landlord.md §3.2: "address, type, m², rent, currency").
 */
export const createRentalUnitSchema = z.object({
  address: z.string().trim().min(1, 'Address is required').max(200, 'Address must be 200 characters or fewer'),
  type: z.enum(RENTAL_UNIT_TYPES, { errorMap: () => ({ message: 'Select a property type' }) }),
  areaM2: optionalPositiveNumber('Area must be greater than 0'),
  rent: z.coerce.number().nonnegative('Rent must be 0 or greater'),
  currency: z.enum(RENTAL_UNIT_CURRENCIES, { errorMap: () => ({ message: 'Select a currency' }) }),
})

export type CreateRentalUnitInput = z.infer<typeof createRentalUnitSchema>

// ─────────────────────────────────────────────────────────────────────────
// Screen Tenants (§3.3)
// ─────────────────────────────────────────────────────────────────────────

/** Mirrors the `status` CHECK constraint on `tenant_applications` (0015_landlord_screening_lease.sql). */
export const TENANT_APPLICATION_STATUSES = ['new', 'reviewing', 'approved', 'rejected'] as const

/** Body for `POST /api/landlord/applications` — creates/reuses a unit's shareable application link. */
export const createApplicationLinkSchema = z.object({
  unitId: z.string().uuid('Select a unit'),
})
export type CreateApplicationLinkInput = z.infer<typeof createApplicationLinkSchema>

/**
 * The public tenant-facing application form (§3.3, §5 — verbatim shape from
 * the spec's own zod snippet, extended with the optional fields the form
 * copy also calls for: residence, references).
 */
export const applicationSchema = z.object({
  applicantName: z.string().trim().min(2, 'Name is required').max(80, 'Name must be 80 characters or fewer'),
  contact: z.string().trim().min(5, 'Contact is required').max(120, 'Contact must be 120 characters or fewer'),
  employment: z.string().trim().max(200, 'Employment must be 200 characters or fewer').optional().or(z.literal('')),
  income: z.coerce.number().nonnegative('Income must be 0 or greater').optional(),
  residence: z.string().trim().max(200, 'Current residence must be 200 characters or fewer').optional().or(z.literal('')),
  references: z.string().trim().max(500, 'References must be 500 characters or fewer').optional().or(z.literal('')),
  declaration: z.string().trim().max(2000, 'Declaration must be 2000 characters or fewer').optional().or(z.literal('')),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
})
export type ApplicationInput = z.infer<typeof applicationSchema>

/** Body for `PATCH /api/landlord/applications/[id]` — Approve/Reject + notes (§3.3). */
export const applicationPatchSchema = z.object({
  status: z.enum(TENANT_APPLICATION_STATUSES, { errorMap: () => ({ message: 'Select a status' }) }),
  notes: z.string().trim().max(2000, 'Notes must be 2000 characters or fewer').optional().or(z.literal('')),
})
export type ApplicationPatchInput = z.infer<typeof applicationPatchSchema>

// ─────────────────────────────────────────────────────────────────────────
// Create a Lease (§3.4)
// ─────────────────────────────────────────────────────────────────────────

/** Mirrors the `deal_type` / `lang` CHECK constraints on `lease_templates`. */
export const LEASE_DEAL_TYPES = ['long_term', 'short_term'] as const
export const LEASE_LANGS = ['hy', 'ru', 'en'] as const
export const LEASE_PET_POLICIES = ['allowed', 'not_allowed', 'case_by_case'] as const
export const LEASE_YES_NO = ['allowed', 'not_allowed'] as const

/**
 * The `/landlord/lease` form fields (§3.4 "Lease form (fields → document)":
 * parties, property, term, rent, deposit, utilities, rules). Mirrors the
 * spec's own `leaseSchema` zod snippet (§5) for `startDate`/`endDate`/`rent`/
 * `deposit`, extended with the rest of the fields the form copy calls for.
 */
export const leaseFieldsSchema = z
  .object({
    landlordName: z.string().trim().min(2, 'Landlord name is required').max(100),
    landlordContact: z.string().trim().min(5, 'Landlord contact is required').max(120),
    tenantName: z.string().trim().min(2, 'Tenant name is required').max(100),
    tenantContact: z.string().trim().min(5, 'Tenant contact is required').max(120),
    propertyAddress: z.string().trim().min(1, 'Property address is required').max(200),
    propertyAreaM2: optionalPositiveNumber('Area must be greater than 0'),
    propertyDescription: z.string().trim().max(1000).optional().or(z.literal('')),
    startDate: z.coerce.date({ errorMap: () => ({ message: 'Start date is required' }) }),
    endDate: z.coerce.date({ errorMap: () => ({ message: 'End date is required' }) }),
    renewalCondition: z.string().trim().max(300).optional().or(z.literal('')),
    rent: z.coerce.number().positive('Rent is required'),
    currency: z.enum(RENTAL_UNIT_CURRENCIES, { errorMap: () => ({ message: 'Select a currency' }) }),
    paymentDay: z.coerce
      .number()
      .int('Payment day must be a whole number')
      .min(1, 'Payment day must be between 1 and 31')
      .max(31, 'Payment day must be between 1 and 31'),
    latePenalty: z.string().trim().max(300).optional().or(z.literal('')),
    deposit: z.coerce.number().nonnegative('Deposit must be 0 or greater'),
    utilities: z.string().trim().max(500).optional().or(z.literal('')),
    pets: z.enum(LEASE_PET_POLICIES, { errorMap: () => ({ message: 'Select a pets policy' }) }),
    subletting: z.enum(LEASE_YES_NO, { errorMap: () => ({ message: 'Select a subletting policy' }) }),
    smoking: z.enum(LEASE_YES_NO, { errorMap: () => ({ message: 'Select a smoking policy' }) }),
    repairResponsibility: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: 'The end must be after the start',
    path: ['endDate'],
  })
export type LeaseFieldsInput = z.infer<typeof leaseFieldsSchema>

/** Body for `POST /api/landlord/leases` (§5 API contract). */
export const createLeaseSchema = z.object({
  unitId: z.string().uuid('Select a unit'),
  templateId: z.string().uuid('Select a template'),
  applicationId: z.string().uuid().optional(),
  fields: leaseFieldsSchema,
})
export type CreateLeaseInput = z.infer<typeof createLeaseSchema>
