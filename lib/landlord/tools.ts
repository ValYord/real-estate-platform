/**
 * The five landlord tool cards, shared by the `/landlord` hub grid and the
 * `/landlord/rentals` (etc.) sub-nav (docs/en/pages/19-landlord.md §3.1 —
 * "same disabled-state convention" on both). Single source of truth so the
 * hub and the sub-tool pages can never drift on which tools are live.
 *
 * Scope: `rentals`, `screening`, `lease`, and `list` are live (Page 19 MVP
 * — Hub + Manage Rentals, then Screening + Lease Generation). `rent` is out
 * of scope entirely (Phase 3+, country-gated per spec §3.5) and stays
 * `comingSoon` regardless of what else ships.
 */
export type LandlordToolId = 'rentals' | 'screening' | 'lease' | 'rent' | 'list'

export interface LandlordTool {
  id: LandlordToolId
  name: string
  description: string
  href: string
  state: 'live' | 'comingSoon'
  /** Shown on the disabled badge — the country-gated copy differs from the generic "Coming soon". */
  comingSoonLabel?: string
}

export const LANDLORD_TOOLS: LandlordTool[] = [
  {
    id: 'rentals',
    name: 'Manage rentals',
    description: 'A dashboard of your rental units, tenants, and payment status.',
    href: '/landlord/rentals',
    state: 'live',
  },
  {
    id: 'screening',
    name: 'Screen tenants',
    description: 'Tenant application, self-declaration, and manual review.',
    href: '/landlord/screening',
    state: 'live',
  },
  {
    id: 'lease',
    name: 'Create a lease',
    description: 'A rental agreement template with fillable fields and PDF export.',
    href: '/landlord/lease',
    state: 'live',
  },
  {
    id: 'rent',
    name: 'Collect rent online',
    description: 'Online rent collection with a payment provider — money never touches the platform.',
    href: '/landlord/rent',
    state: 'comingSoon',
    comingSoonLabel: 'Coming soon in your country',
  },
  {
    id: 'list',
    name: 'List your rental',
    description: 'Jump straight into the listing wizard, pre-set to a rental deal.',
    href: '/sell/new?dealType=rent',
    state: 'live',
  },
]
