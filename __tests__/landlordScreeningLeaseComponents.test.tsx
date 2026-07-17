// @vitest-environment jsdom
/**
 * Rendering tests for the Page 19 (Screening + Lease Generation) client
 * components — one per sub-tool page (`ScreeningDashboard` for
 * /landlord/screening, `LeaseDashboard` for /landlord/lease) plus the public
 * `ApplicationForm` (/apply/[token]), per the acceptance criteria ("a
 * rendering test for each page"). Also covers the client-side halves of the
 * two acceptance-criteria validation rules that have a server-side
 * counterpart already tested in __tests__/landlordApplicationsApiRoutes.test.ts
 * and __tests__/landlordLeaseApiRoutes.test.ts: the required consent
 * checkbox, and `endDate <= startDate`.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ScreeningDashboard from '@/components/landlord/ScreeningDashboard'
import LeaseDashboard from '@/components/landlord/LeaseDashboard'
import ApplicationForm from '@/components/landlord/ApplicationForm'
import type { LandlordUnitOption, LeaseTemplateSummary, TenantApplicationSummary } from '@/lib/landlord/types'

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used by
// the FadeIn/SlideIn/Stagger wrappers these components render) needs one —
// same polyfill as __tests__/motion.test.tsx.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

const UNIT: LandlordUnitOption = { id: '330e8400-e29b-41d4-a716-446655440000', address: 'Arabkir, Komitas 12' }
const TEMPLATE: LeaseTemplateSummary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  country: 'AM',
  lang: 'en',
  dealType: 'long_term',
  name: 'Standard residential lease (English)',
}

// ────────────────────────────────────────────────────────────────────────────
// /landlord/screening → <ScreeningDashboard>
// ────────────────────────────────────────────────────────────────────────────
describe('<ScreeningDashboard> (/landlord/screening)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] as TenantApplicationSummary[] }),
    } as Response)
  })

  it('shows the spec-verbatim consent/local-law disclaimer copy', () => {
    renderWithQueryClient(<ScreeningDashboard units={[UNIT]} initialApplications={[]} />)
    expect(
      screen.getByText(/Follow local law; discrimination is prohibited; screening requires the tenant's consent\./),
    ).toBeDefined()
    expect(screen.getByText(/no automatic background pull/)).toBeDefined()
  })

  it('renders the unit picker and the "Create application link" action', () => {
    renderWithQueryClient(<ScreeningDashboard units={[UNIT]} initialApplications={[]} />)
    // The unit address is offered in two places (the link generator's own
    // unit picker and the inbox's unit filter) — assert at least one exists
    // rather than assuming uniqueness.
    expect(screen.getAllByText('Arabkir, Komitas 12').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Create application link' })).toBeDefined()
  })

  it('prompts to add a unit first when the landlord has none yet', () => {
    renderWithQueryClient(<ScreeningDashboard units={[]} initialApplications={[]} />)
    expect(screen.getByText(/Add a rental unit first/)).toBeDefined()
  })

  it('shows the empty inbox state when there are no applications', async () => {
    renderWithQueryClient(<ScreeningDashboard units={[UNIT]} initialApplications={[]} />)
    expect(await screen.findByText('No applications yet')).toBeDefined()
  })

  it('renders a submitted application with its status badge in the inbox', async () => {
    const application: TenantApplicationSummary = {
      id: '440e8400-e29b-41d4-a716-446655440000',
      unitId: UNIT.id,
      unitAddress: UNIT.address,
      applicantName: 'David Sargsyan',
      contact: 'david@example.com',
      employment: null,
      income: null,
      residence: null,
      references: null,
      declaration: null,
      consent: true,
      status: 'new',
      notes: null,
      createdAt: '2026-07-01T00:00:00.000Z',
    }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [application] }),
    } as Response)
    renderWithQueryClient(<ScreeningDashboard units={[UNIT]} initialApplications={[application]} />)
    expect(await screen.findByText('David Sargsyan')).toBeDefined()
    // "New" also appears as a <option> in the status-filter Select — assert
    // the status Badge specifically, not just any element with that text.
    const row = screen.getByText('David Sargsyan').closest('[role="listitem"]') as HTMLElement
    expect(row).not.toBeNull()
    expect(within(row).getByText('New')).toBeDefined()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// /landlord/lease → <LeaseDashboard>
// ────────────────────────────────────────────────────────────────────────────
describe('<LeaseDashboard> (/landlord/lease)', () => {
  it('shows the spec-verbatim "advisory, not legal advice" disclaimer', () => {
    render(<LeaseDashboard units={[UNIT]} templates={[TEMPLATE]} approvedApplications={[]} />)
    expect(screen.getByText(/advisory, not legal advice/)).toBeDefined()
  })

  it('prompts to add a unit first when the landlord has none yet', () => {
    render(<LeaseDashboard units={[]} templates={[TEMPLATE]} approvedApplications={[]} />)
    expect(screen.getByText(/Add a rental unit first/)).toBeDefined()
  })

  function fillMinimalRequiredFields(startDate: string, endDate: string) {
    fireEvent.change(screen.getByLabelText('Landlord name'), { target: { value: 'Karen Avetisyan' } })
    fireEvent.change(screen.getByLabelText('Landlord contact'), { target: { value: 'karen@example.com' } })
    fireEvent.change(screen.getByLabelText('Tenant name'), { target: { value: 'David Sargsyan' } })
    fireEvent.change(screen.getByLabelText('Tenant contact'), { target: { value: 'david@example.com' } })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Arabkir, Komitas 12' } })
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDate } })
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: endDate } })
    fireEvent.change(screen.getByLabelText('Rent'), { target: { value: '250000' } })
  }

  it('rejects endDate <= startDate client-side with the spec-verbatim message on End date, and does not render a preview', async () => {
    render(<LeaseDashboard units={[UNIT]} templates={[TEMPLATE]} approvedApplications={[]} />)
    fillMinimalRequiredFields('2026-08-01', '2026-08-01')
    fireEvent.click(screen.getByRole('button', { name: 'Generate / Preview' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('The end must be after the start')
    expect(screen.queryByTestId('lease-preview')).toBeNull()
  })

  it('renders a live document preview reflecting the entered fields once the form is valid', async () => {
    render(<LeaseDashboard units={[UNIT]} templates={[TEMPLATE]} approvedApplications={[]} />)
    fillMinimalRequiredFields('2026-08-01', '2027-08-01')
    fireEvent.click(screen.getByRole('button', { name: 'Generate / Preview' }))

    const preview = await screen.findByTestId('lease-preview')
    expect(preview.textContent).toContain('Karen Avetisyan')
    expect(preview.textContent).toContain('David Sargsyan')
    expect(preview.textContent).toContain('Arabkir, Komitas 12')
    expect(preview.textContent).toContain('250,000 AMD / month')
  })

  it('prefills the tenant fields when an approved application is selected (D8 hand-off)', () => {
    const application: TenantApplicationSummary = {
      id: '440e8400-e29b-41d4-a716-446655440000',
      unitId: UNIT.id,
      unitAddress: UNIT.address,
      applicantName: 'David Sargsyan',
      contact: 'david@example.com',
      employment: null,
      income: null,
      residence: null,
      references: null,
      declaration: null,
      consent: true,
      status: 'approved',
      notes: null,
      createdAt: '2026-07-01T00:00:00.000Z',
    }
    render(
      <LeaseDashboard
        units={[UNIT]}
        templates={[TEMPLATE]}
        approvedApplications={[application]}
        initialUnitId={UNIT.id}
        initialApplicationId={application.id}
      />,
    )
    expect((screen.getByLabelText('Tenant name') as HTMLInputElement).value).toBe('David Sargsyan')
    expect((screen.getByLabelText('Tenant contact') as HTMLInputElement).value).toBe('david@example.com')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// /apply/[token] → <ApplicationForm> (public, unauthenticated)
// ────────────────────────────────────────────────────────────────────────────
describe('<ApplicationForm> (/apply/[token], public)', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('shows the disclaimer copy and applying-for line', () => {
    render(<ApplicationForm token="tok123" unitAddress="Arabkir, Komitas 12" />)
    expect(screen.getByText(/Applying for: Arabkir, Komitas 12/)).toBeDefined()
    expect(screen.getByText(/No automatic background or credit check is performed/)).toBeDefined()
  })

  it('blocks submission and shows "Consent is required" when the checkbox is unchecked', async () => {
    render(<ApplicationForm token="tok123" unitAddress="Arabkir, Komitas 12" />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'David Sargsyan' } })
    fireEvent.change(screen.getByLabelText('Contact (phone or email)'), { target: { value: 'david@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Consent is required')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('submits and shows the "Application sent" confirmation once consent is given', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ status: 201 } as Response)
    render(<ApplicationForm token="tok123" unitAddress="Arabkir, Komitas 12" />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'David Sargsyan' } })
    fireEvent.change(screen.getByLabelText('Contact (phone or email)'), { target: { value: 'david@example.com' } })
    fireEvent.click(screen.getByLabelText(/I consent to the landlord reviewing/))
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Application sent')).toBeDefined()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/apply/tok123',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
