import type {
  Currency,
  LeaseDealType,
  LeaseStatus,
  Locale,
  RentalPaymentStatus,
  RentalUnitStatus,
  RentalUnitType,
  TenantApplicationStatus,
} from '@/types/database'
import type { LeaseFieldsInput } from './schemas'

/**
 * Public API item shape — `GET /api/landlord/rentals` `units[]`
 * (docs/en/pages/19-landlord.md §5 "API contracts", camelCase mapped from
 * the `rental_units` row).
 */
export interface RentalUnitSummary {
  id: string
  address: string
  type: RentalUnitType
  areaM2: number | null
  rent: number
  currency: Currency
  status: RentalUnitStatus
  photoUrl: string | null
  tenantName: string | null
  tenantContact: string | null
  leaseEnd: string | null
  paymentStatus: RentalPaymentStatus | null
  nextPaymentDue: string | null
  createdAt: string
}

export interface RentalUnitsResponse {
  units: RentalUnitSummary[]
}

/** Quick-stats row shown on the `/landlord` hub when the user already has units (§3.1). */
export interface LandlordQuickStats {
  activeCount: number
  monthlyIncome: number
  /** Null when units span more than one currency — the hub then omits the income figure. */
  monthlyIncomeCurrency: Currency | null
  overdueCount: number
}

// ─────────────────────────────────────────────────────────────────────────
// Screen Tenants (§3.3)
// ─────────────────────────────────────────────────────────────────────────

/** A unit summary used by the sub-tool pickers on /landlord/screening and /landlord/lease. */
export interface LandlordUnitOption {
  id: string
  address: string
}

/** `POST /api/landlord/applications` response (§5 API contract). */
export interface ApplicationLinkResponse {
  applicationLink: string
}

/** `GET /api/landlord/applications` item shape — camelCase mapped from `tenant_applications`. */
export interface TenantApplicationSummary {
  id: string
  unitId: string
  unitAddress: string
  applicantName: string
  contact: string
  employment: string | null
  income: number | null
  residence: string | null
  references: string | null
  declaration: string | null
  consent: boolean
  status: TenantApplicationStatus
  notes: string | null
  createdAt: string
}

export interface ApplicationsResponse {
  items: TenantApplicationSummary[]
}

// ─────────────────────────────────────────────────────────────────────────
// Create a Lease (§3.4)
// ─────────────────────────────────────────────────────────────────────────

export interface LeaseTemplateSummary {
  id: string
  country: string
  lang: Locale
  dealType: LeaseDealType
  name: string
}

export interface LeaseTemplatesResponse {
  items: LeaseTemplateSummary[]
}

/** `POST /api/landlord/leases` response (§5 API contract). */
export interface CreateLeaseResponse {
  leaseId: string
  pdfUrl: string
}

export interface LeaseSummary {
  id: string
  unitId: string
  templateId: string | null
  applicationId: string | null
  fields: LeaseFieldsInput
  status: LeaseStatus
  createdAt: string
}
