# Page 19 — Landlord Tools: Screening + Lease Generation (MVP): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/19-landlord.md`](../en/pages/19-landlord.md) §3.3–3.4 — read that first
for the full scenarios, states, and generic API/validation contracts. This task builds
**only** `/landlord/screening` and `/landlord/lease` (plus the public, unauthenticated
tenant-facing application form the first one generates a link to). Rent collection
(§3.5), e-signature, a real background/credit-check provider, Team management, and the
Documents tab are explicitly out of scope and must not be built.

This spec follows **`DESIGN_SYSTEM.md`** — every section below names the exact
`components/ui` primitive and `components/motion` wrapper to use. No new tokens, no new
primitives, no hand-rolled `framer-motion`.

Audited against the current tree (the prior "Hub + Manage Rentals" task, which this one
depends on and must not regress):

- `lib/landlord/tools.ts` — the single source of truth for the 5 hub/sub-nav tool
  entries. `screening` and `lease` already have their `href` set; this task only flips
  `state: 'comingSoon'` → `'live'` and removes `comingSoonLabel` for those two entries
  (see §4.1). Do not fork `ToolCard.tsx`/`LandlordSubNav.tsx` — they already branch on
  `state === 'live'` and already map `👤`/`📄` icons for these two ids.
- `app/[locale]/landlord/rentals/page.tsx` — the exact login-gate + `noindex` +
  sub-nav-shell pattern to copy verbatim for both new pages (`redirect('/auth/login?next=…')`
  for guests, `robots: { index: false, follow: false }` metadata, `<LandlordSubNav active="…" />`
  next to a `flex-1 min-w-0` content column).
- `components/landlord/AddUnitDialog.tsx` — the RHF + `zodResolver` + `Field`/`Input`/`Select`
  + inline 422-field-error pattern to copy for the lease form and the application-review
  notes field.
- `components/landlord/RentalsDashboard.tsx` — the React Query hydrate-from-server +
  loading/error/empty states pattern to copy for the applications inbox.
- `components/landlord/UnitDetailPanel.tsx` — the `Dialog` + `Tabs` detail-view pattern,
  reused for the Application detail view.
- `components/home-value/HomeValueDisclaimer.tsx` / `components/mortgage/rates/RatesDisclaimer.tsx`
  — the plain-props, no-`'use client'` disclaimer-banner precedent. Those two predate
  `DESIGN_SYSTEM.md` and use raw `text-gray-400`/`bg-gray-100`; **this task's disclaimer
  banner must use the semantic tokens** (`text-muted`, `bg-warning/10`, `border-warning/30`)
  per the design-tokens rule, not the raw amber classes the page-spec's own table (§2)
  suggests — same intent, tokenized.
- `components/ui/{Card,Button,Badge,Input,Select,Field,Dialog,Tabs,Skeleton}.tsx` and
  `components/motion/{FadeIn,SlideIn,Stagger}.tsx` — read in full before implementing;
  every primitive used below already exists, none need to change.

---

## 1. Design decisions & scope clarifications

| # | Page-spec says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | "a shareable link/QR for the tenant" | **Copyable link only, no QR code.** A `<input readOnly>` + `[Copy]` button. | §7 Accessibility itself only requires "a copy-able URL next to the QR (not only the QR)" — the QR is decoration on top of a working copy link, not a separate requirement. No QR library exists in the repo (`package.json` audited); adding one is out of proportion to the MVP. Flag as a follow-up, don't add silently. |
| D2 | "attached document" in the application detail view | **Not built.** No file upload/storage in this task's schema (`tenant_applications` has no `documents` column). | Out of scope per the task brief (no Documents tab); the self-declaration + structured fields already satisfy the "application + manual review" model. Flagging the gap here rather than quietly shipping a `documents: Json` column nothing ever writes to. |
| D3 | "Template select. By country/language (hy/ru/en) + deal type" | **Ships with exactly one seeded template** (`country='AM'`, `lang='en'`, `deal_type='long_term'`), but `lease_templates` and the `<TemplateSelect>` UI both support N templates — the select just renders one `<option>` today. | Task brief: "can start with a single English template if others aren't ready, but the schema must support more." Do not hardcode a single-template assumption anywhere in the component. |
| D4 | "`[✉️ Send to the tenant for signing]`" (§3.4 Actions) | **Not built.** Only `[Generate / Preview]`, `[⬇️ Download PDF]`, `[💾 Save draft]` render. | Spec itself marks e-signature "Phase 3+, provider-dependent" — explicitly out of scope per the task brief. |
| D5 | "Output: Fields → template merge → PDF (`leases` + Supabase Storage)" | **No real PDF binary, no Storage upload.** `GET /api/landlord/leases/[id]/pdf` server-renders the same template-merge HTML used for the on-page preview, with `Content-Type: text/html` and `Content-Disposition: attachment; filename="lease-{id}.html"`, plus print-oriented CSS (`@media print`) so "download → open → Cmd/Ctrl+P → Save as PDF" works. `leases.pdf_url` stores this route's own path, not a Storage URL. | Task brief explicitly permits this: "a straightforward server-rendered HTML→PDF or print-friendly view is an acceptable MVP implementation — do not pull in a heavy new PDF pipeline unless one already exists in the repo." None exists (`package.json` audited: no `puppeteer`/`react-pdf`/`jspdf`/`pdfkit`). Keep the button label **"⬇️ Download PDF"** per spec microcopy regardless of the underlying file type — that's copy, not a technical claim to the user. |
| D6 | "Background check (Phase 3+, country-gated)" (§3.3) | **Not built**, not even as a disabled card — the whole sub-section is Phase 3+ per the spec's own heading. | Explicit out-of-scope callout in the task brief ("a real background-check integration"). |
| D7 | Public application form URL | **`/apply/[token]`**, top-level (outside `/landlord`, outside auth), locale-prefixed like every other route (`app/[locale]/apply/[token]/page.tsx` → `/en/apply/…`). `token` is a dedicated opaque value (see §2 migration), not the unit's own UUID. | Matches the spec's own link shape (`https://.../apply/abc123`) and keeps `rental_units.id` out of a link that gets forwarded to strangers, even though the id is already an unguessable UUID — defense in depth, and it lets a landlord regenerate/revoke a link later without touching the unit row's primary key. |
| D8 | "Approve → move to lease creation (prefill tenant data)" | Approve success in the Application detail view shows a `[Create lease for this tenant →]` button (`Button variant="secondary"`) that navigates to `/landlord/lease?unitId={unitId}&applicationId={id}`; the lease page reads those two query params server-side and prefills the tenant-party fields. | Keeps the hand-off a plain link/query-param, no client-side global state needed — mirrors the existing `?dealType=rent` query-param convention already used by the hub's "List your rental" shortcut (`lib/landlord/tools.ts`). |

---

## 2. Component inventory (new files)

```
app/[locale]/landlord/
  screening/
    page.tsx                          (NEW — Server Component: login gate + noindex, <LandlordSubNav active="screening" />, <ScreeningDashboard>)
  lease/
    page.tsx                          (NEW — Server Component: login gate + noindex, reads ?unitId/?applicationId, <LandlordSubNav active="lease" />, <LeaseWorkspace>)

app/[locale]/apply/
  [token]/
    page.tsx                          (NEW — Server Component, public, noindex, no sub-nav/dashboard chrome: resolves token → unit via admin client, renders <ApplicationForm>)
    not-found.tsx                     (NEW — invalid/expired token state, see §4.5)

components/landlord/
  ApplicationLinkGenerator.tsx        (NEW — Client; per-unit [Create application link] → copyable URL, D1)
  ApplicationsInbox.tsx               (NEW — Client; React Query list + status Tabs filter + unit filter, Stagger entrance)
  ApplicationRow.tsx                  (NEW — one row/card, Badge status)
  ApplicationDetailPanel.tsx          (NEW — Dialog + Tabs-free single view: fields, notes textarea, Approve/Reject, D8 hand-off button)
  ApplicationForm.tsx                 (NEW — Client; the *public* tenant-facing form, RHF + zod, consent checkbox)
  ScreeningDashboard.tsx              (NEW — Client; composes the unit picker + ApplicationLinkGenerator + ApplicationsInbox, owns the selected-unit state)
  LegalDisclaimerBanner.tsx           (NEW — plain props, no 'use client'; `variant: 'screening' | 'lease'`, verbatim copy per §4.9 — reused by both pages)
  TemplateSelect.tsx                  (NEW — Client; country/lang/deal-type Select, D3)
  LeaseForm.tsx                       (NEW — Client; RHF + zod, sectioned Card layout, §4.7)
  LeasePreview.tsx                    (NEW — pure props; merges LeaseForm values into the selected template's `body`, live-updates, §4.7)
  LeaseWorkspace.tsx                  (NEW — Client; composes TemplateSelect + LeaseForm + LeasePreview + action bar, owns draft/lease state)

lib/landlord/
  schemas.ts                          (EXTEND — add applicationSchema (consent: z.literal(true)), leaseFieldsSchema (endDate > startDate .refine), reviewSchema (status + notes))
  types.ts                            (EXTEND — TenantApplicationSummary, ApplicationStatus, LeaseTemplateSummary, LeaseSummary, LeaseFields)
  applicationToken.ts                 (NEW — generate/validate the opaque `application_token`, server-only)
  leaseTemplate.ts                    (NEW — `renderLeaseTemplate(body, fields)`: the placeholder-merge function shared by LeasePreview (client) and the PDF route (server) — pure string function, no DOM/Node API, importable from both)

app/api/landlord/
  applications/route.ts               (NEW — POST create link (D7 token), GET list/inbox)
  applications/[id]/route.ts          (NEW — PATCH approve/reject + notes)
  leases/route.ts                     (NEW — POST create/save draft)
  leases/[id]/route.ts                (NEW — GET single lease, e.g. for prefill-on-reload)
  leases/[id]/pdf/route.ts            (NEW — GET print-friendly HTML "PDF", D5)

app/api/apply/
  [token]/route.ts                    (NEW — public; GET resolves token → unit display info, POST submits the application via the admin client after re-validating the token + zod + consent)

supabase/migrations/
  0015_landlord_screening_lease.sql   (NEW — tenant_applications, lease_templates (+ seed row), leases; RLS; rental_units.application_token column)

types/database.ts                     (EXTEND — Row/Insert/Update/Relationships for the 3 new tables + the new rental_units column, following the exact rental_units block shape already in the file)
```

Reuse, don't fork: `components/ui/{Card,CardHeader,CardBody,CardFooter,Button,Badge,Input,
Select,Field,Dialog,DialogTitle,DialogBody,Tabs,Skeleton}`, `components/motion/{FadeIn,
SlideIn,Stagger}`, `components/landlord/LandlordSubNav.tsx`, `lib/landlord/format.ts`
(`formatMoney`, `formatDate`), `lib/supabase/{server.ts,admin.ts}`, `lib/utils.ts` (`cn`),
the React-Query-hydrated-from-server pattern in `RentalsDashboard.tsx`.

---

## 3. Wireframes

### 3.1 Screening desktop (≥1024px)

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│ SUB-NAV      │ H1 "Screen tenants"  sub-copy                            │
│ (w-56, reuse │ ┌─ LegalDisclaimerBanner (variant="screening") ─────────┐│
│ LandlordSubNav)│ "Follow local law…requires the tenant's consent."      │
│              │ └────────────────────────────────────────────────────────┘│
│ ▸ Rentals    │ Unit picker (Select, "Choose a unit…") → per-unit panel:  │
│ ▸ Screening ●│ ┌─ ApplicationLinkGenerator (Card) ───────────────────────┐│
│ ▸ Lease      │ │ [Create application link]  →  readOnly Input + [Copy]  ││
│ ▸ Rent       │ └──────────────────────────────────────────────────────────┘│
│              │ H2 "Applications"                                         │
│              │ Tabs: All / New / Reviewing / Approved / Rejected          │
│              │ ┌─ Stagger(ApplicationRow×n) ───────────────────────────┐ │
│              │ │ Card: name · unit address · Badge(status) · date       │ │
│              │ └──────────────────────────────────────────────────────────┘│
└──────────────┴─────────────────────────────────────────────────────────┘
row click → ApplicationDetailPanel (Dialog)
```

### 3.2 Lease desktop (≥1024px)

```
┌──────────────┬─────────────────────────────────────────────────────────┐
│ SUB-NAV      │ H1 "Create a lease"  sub-copy                            │
│              │ ┌─ LegalDisclaimerBanner (variant="lease") ─────────────┐│
│ ▸ Screening  │ │ "The template is advisory, not legal advice; check…" ││
│ ▸ Lease    ● │ └────────────────────────────────────────────────────────┘│
│              │ ┌── form column (lg:w-1/2) ──┐ ┌── preview column ──────┐│
│              │ │ TemplateSelect (Card)        │ │ LeasePreview           ││
│              │ │ LeaseForm sections:          │ │ (Card, sticky top-20,  ││
│              │ │  Parties · Property · Term · │ │  scrollable document-  ││
│              │ │  Rent · Deposit · Utilities · │ │  like text, live-      ││
│              │ │  Rules                        │ │  updates on every      ││
│              │ │ [Generate/Preview][⬇️ Download│ │  keystroke)            ││
│              │ │  PDF][💾 Save draft]          │ │                       ││
│              │ └──────────────────────────────┘ └────────────────────────┘│
└──────────────┴─────────────────────────────────────────────────────────┘
```

### 3.3 Mobile (<768px), both pages

```
┌──────────────────────────┐
│ Sub-nav → dropdown Select │ (LandlordSubNav's existing top-tabs/scroll pattern)
│ H1 + disclaimer banner    │
│ Screening: unit picker,   │
│ link generator, then      │
│ inbox rows stacked        │
│ Lease: form full-width,   │
│ preview renders BELOW the │
│ form (not beside it),     │
│ opened via [Preview] into │
│ a full-width Dialog on    │
│ tap for focus              │
└──────────────────────────┘
```

### 3.4 Public application form (`/apply/[token]`, all breakpoints similar — single column, max-w-lg)

```
┌──────────────────────────────────┐
│ (no header/sidebar chrome —      │
│  plain centered page, brand      │
│  wordmark only, per §4.5)        │
│                                    │
│  "Apply for {unit.address}"       │
│  landlord's display name          │
│  ┌─ LegalDisclaimerBanner ───────┐│
│  │ (variant="screening")         ││
│  └────────────────────────────────┘│
│  Field: Full name                 │
│  Field: Contact (phone/email)     │
│  Field: Employment (optional)     │
│  Field: Monthly income (optional) │
│  Field: References (optional)     │
│  Field: Self-declaration (textarea)│
│  ☐ Consent checkbox + label       │
│  [Submit application]              │
│                                    │
│  → success: "Application sent"    │
│    confirmation screen             │
└──────────────────────────────────┘
```

---

## 4. Section-by-section spec

### 4.1 Hub + sub-nav flip (prerequisite, do first)

- In `lib/landlord/tools.ts`, change the `screening` and `lease` entries' `state` from
  `'comingSoon'` to `'live'` and delete their `comingSoonLabel` lines. That is the entire
  diff needed in that file — `ToolCard.tsx` (hub grid) and `LandlordSubNav.tsx` (sub-tool
  sidebar) both already branch on `state === 'live'` vs. render the disabled
  `Badge variant="neutral"` treatment, so both surfaces flip automatically, in sync, with
  zero other code changes. Update the file's own header comment (currently: "Scope for
  this task… only `rentals` and `list` are live. `screening` and `lease` ship in the next
  task…") to reflect that all four are now live.
- No visual changes to `ToolCardGrid`/`ToolCard`/`LandlordSubNav` themselves.

### 4.2 `/landlord/screening` page shell

- `app/[locale]/landlord/screening/page.tsx`: Server Component, copy the exact auth-guard
  + metadata shape from `app/[locale]/landlord/rentals/page.tsx` verbatim (`redirect('/auth/login?next=/landlord/screening')`
  for guests; `metadata.robots = { index: false, follow: false }`). Fetch the owner's
  `rental_units` (id + address only, for the unit picker) and pass as `initialUnits` to
  `<ScreeningDashboard>`, same hydrate-then-React-Query-owns-it pattern as `RentalsDashboard`.
- Layout: `max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6 lg:space-y-0 lg:flex lg:gap-8`
  (identical wrapper to `RentalsPage`), `<LandlordSubNav active="screening" />` + `<div className="flex-1 min-w-0">`.
- `<h1 className="text-3xl font-bold text-text">Screen tenants</h1>` +
  `<p className="text-muted mt-1">Send an application link, review submissions, and approve or reject — all manually.</p>`.
- `<LegalDisclaimerBanner variant="screening" />` directly under the H1/sub-copy, wrapped in
  `<FadeIn>` (a single, once-per-page entrance — this is a compliance-critical banner, so
  it should never be the "staggered as if it were content" flourish; `FadeIn` alone, no
  delay, keeps it feeling deliberate rather than decorative).

### 4.3 `ApplicationLinkGenerator` (§3.3 "Create application link")

- Unit picker above it: `<Field label="Unit" htmlFor="screening-unit">` wrapping a
  `<Select>` of the owner's units (address as the option label); empty state (`initialUnits.length === 0`)
  replaces the whole screening content with the same "you don't have any units yet" anatomy
  `RentalsDashboard` uses, `[+ Add unit]`-style CTA pointing to `/landlord/rentals` instead
  (a `Button` linking there — screening needs at least one unit to exist first).
- Once a unit is selected, `<ApplicationLinkGenerator unitId>` renders inside a
  `Card` (`variant="default"`, `CardBody`):
  - No link yet: `Button variant="primary"` "Create application link" → `POST /api/landlord/applications { unitId }`.
  - Link exists (either just created, or the unit already had one — the endpoint is
    idempotent per D7, returning the existing token rather than minting a new one on
    every click): a `Field`-less row — `<Input readOnly value={applicationLink} className="font-mono text-sm" />`
    next to a `Button variant="secondary" size="sm"` "Copy" that writes to the clipboard
    (`navigator.clipboard.writeText`) and flips its own label to "Copied!" for ~2s
    (plain `useState` + `setTimeout`, no motion primitive needed — this is the
    "simple hover/tap feedback" case `DESIGN_SYSTEM.md` says plain Tailwind covers, not a
    `components/motion` case).
  - Loading state while the POST is in flight: `Button loading` (spinner already built
    into `Button`).
- Entrance: the whole `Card` uses `<SlideIn direction="up">` on first mount (once, on
  scroll-into-view is moot here since it's above the fold, but `SlideIn` still degrades
  correctly — it just fires immediately since the element starts in view).

### 4.4 `ApplicationsInbox` (§3.3 "Applications inbox")

- `<h2 className="text-xl font-semibold text-text mt-8">Applications</h2>`.
- Filter: `<Tabs>` (the existing `components/ui/Tabs.tsx`, same one `UnitDetailPanel` uses
  for its Overview/Tenant/Payments tabs) with options `All / New / Reviewing / Approved / Rejected`
  (`value`/`onChange` driving a client-side filter over the already-fetched list — no
  extra network round-trip per tab).
- List: React Query (`queryKey: ['landlord-applications']`), same
  loading/error/empty/loaded branching as `RentalsDashboard.tsx`:
  - Loading: 3× `<Skeleton className="h-20 w-full rounded-lg" />` stacked.
  - Error: the same "Something went wrong… [Try again]" text-link pattern.
  - Empty (`items.length === 0` for the active tab): "No applications yet" +
    sub-copy "Create an application link above and share it with a prospective tenant."
    (no CTA button here — the CTA already lives in §4.3 right above).
  - Loaded: `<Stagger gap={0.06}>` wrapping one `ApplicationRow` per item — this is
    exactly the "list appearing in sequence" case `DESIGN_SYSTEM.md` calls out for `Stagger`.
- `ApplicationRow`: `Card variant="interactive"` (the hover-shadow + pointer-cursor variant,
  same as `UnitCard`), `CardBody` with: applicant name (`text-sm font-semibold text-text`),
  unit address (`text-sm text-muted`), `Badge` for status —
  `New → variant="primary"`, `Reviewing → variant="warning"`, `Approved → variant="success"`,
  `Rejected → variant="neutral"` (this maps the page-spec's literal
  `bg-blue-50 text-blue-600` / `bg-green-100` / `bg-gray-100` swatches (§2 tokens table)
  onto the existing `Badge` variants, which already carry equivalent semantics — do not
  add new Badge variants), submitted date (`formatDate`, `text-xs text-muted`). Whole card
  is a `<button>` (same "wrap in a real button for keyboard/click" convention as `UnitCard`)
  opening `ApplicationDetailPanel`.

### 4.5 `ApplicationDetailPanel` (§3.3 "Application detail")

- `Dialog` + `DialogTitle` (applicant name) + `DialogBody` — same shell as `UnitDetailPanel`,
  `className="w-full sm:min-w-[28rem]"`.
- Body: a stack of label/value rows (reuse the exact `Row` helper pattern already private
  to `UnitDetailPanel.tsx` — copy the 6-line component, don't import a private helper
  across files; if it's needed a third time later, that's when it's worth promoting to
  `components/ui`) for: Contact, Employment, Income, References, Self-declaration.
- Status + notes: `Badge` showing current status, then a `Field label="Notes" htmlFor="app-notes"`
  wrapping a `<textarea>` styled with the same classes `Input` uses (`h-11` doesn't apply —
  use `rows={3}` and the shared border/focus-ring classes via `cn(inputLikeClasses, 'py-2 resize-y')`;
  simplest: give `Input`'s className string a `<textarea>` twin inline here rather than
  editing the shared `Input` primitive, since no other page needs a themed textarea yet).
- Actions row (`CardFooter`-style spacing, `flex justify-end gap-3 pt-4 border-t border-border`):
  `Button variant="destructive" size="sm"` "Reject" and `Button variant="primary" size="sm"`
  "Approve" — both call `PATCH /api/landlord/applications/[id]` with `{ status, notes }`,
  disable each other while a mutation is in flight (`loading` prop), and on success update
  the React Query cache in place (same `queryClient.setQueryData` pattern as
  `RentalsDashboard.handleCreated`) plus flip the panel's own Badge without a refetch.
- **On successful Approve** (D8): replace the two action buttons with a single
  `Button variant="secondary"` "Create lease for this tenant →", `Link`-styled via
  `next/navigation`'s `useRouter().push(\`/landlord/lease?unitId=${unitId}&applicationId=${id}\`)`.
- No new motion here — a `Dialog` mount/unmount has no entrance transition anywhere in this
  codebase (matches `UnitDetailPanel`'s own precedent); stay consistent, don't add one only here.

### 4.6 Public application form — `/apply/[token]` (§3.3 "Application form (filled by the tenant)")

- **No dashboard chrome.** This route sits outside `/landlord` and outside the login gate
  entirely — the Server Component only renders a brand wordmark (reuse whatever the site
  header uses for its logo/wordmark treatment) and the form, centered, `max-w-lg mx-auto px-4 py-12`.
  `metadata.robots = { index: false, follow: false }` (same mechanism as the dashboards —
  it's not marketing content, just not login-gated either).
- Invalid/expired/unknown token: Next's `notFound()` → `app/[locale]/apply/[token]/not-found.tsx`,
  same empty-state anatomy as `RentalsDashboard`'s empty state (icon/heading/sub-copy),
  heading "This application link isn't valid", sub-copy "It may have been removed by the landlord. Ask them to resend it."
- Header inside the card: "Apply for {unit.address}" (`text-2xl font-bold text-text`),
  landlord's display name below it (`text-sm text-muted`) — both server-fetched via the
  admin client (token → `rental_units` row + owner's `profiles.full_name`; this is the one
  place in this feature that legitimately needs `lib/supabase/admin.ts`, since the applicant
  has no session and RLS on `rental_units` is owner-scoped — see §5 RLS design and the
  `SECURITY NOTICE` already documented in `admin.ts` for the justification pattern to copy
  into a code comment here).
- `<LegalDisclaimerBanner variant="screening" />` (same component/copy as the landlord-side
  page — the tenant needs to read the same consent/local-law language, not a different one).
- Form (`ApplicationForm.tsx`, `'use client'`, RHF + `zodResolver(applicationSchema)`):
  `Field`+`Input` for Full name, Contact; `Field`+`Input` (optional, `hint="Optional"`) for
  Employment, Monthly income; `Field`+`<textarea>` (styled like §4.5's notes textarea) for
  References and Self-declaration.
  - **Consent checkbox** — not a themed `Switch` (that primitive is an on/off toggle
    control, semantically wrong for a legal-consent checkbox that must be a real
    `<input type="checkbox">` for form semantics/autofill/assistive tech): a plain
    `<input type="checkbox" id="consent" className="size-5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary/40" {...register('consent')} />`
    next to `<label htmlFor="consent" className="text-sm text-text">I consent to this information being reviewed by the landlord for tenant screening purposes.</label>`,
    wrapped in `<div className="flex items-start gap-3">`. Error (`errors.consent`, zod
    message "Consent is required") renders via the same `role="alert" text-sm text-danger`
    treatment `Field` uses, directly under the checkbox row (not inside `Field` itself,
    since `Field` assumes a single labeled control, not a checkbox+label pair).
  - Submit: `Button type="submit" loading={isSubmitting}` "Submit application", full-width
    (`className="w-full"`) since this is the page's single primary action.
  - 422 from the server (consent missing, or any other field) re-surfaces via
    `setError(field, { type: 'server' })`, same shape as `AddUnitDialog.onSubmit`.
- **Success state**: replace the form with a centered confirmation —
  `<FadeIn>` wrapping a checkmark-in-circle (`w-16 h-16 bg-success/15 rounded-full flex items-center justify-center text-2xl`,
  `✓`), heading "Application sent" (`text-lg font-semibold text-text`), sub-copy
  "The landlord will review your application and follow up directly." No further action —
  this is a dead-end confirmation screen, not a redirect (the applicant has no account to
  redirect into).

### 4.7 `/landlord/lease` page shell + `TemplateSelect`

- `app/[locale]/landlord/lease/page.tsx`: same auth-guard/`noindex` shell as §4.2. Reads
  `searchParams.unitId` / `searchParams.applicationId` (Next 15: `searchParams` is a Promise,
  await it same as `params` elsewhere in this codebase); if `applicationId` is present,
  server-fetch that application's `applicant_name`/`contact` (RLS-scoped — 404/ignore if it
  doesn't belong to this owner) to pass as `prefillTenant` into `<LeaseWorkspace>`.
- `<h1 className="text-3xl font-bold text-text">Create a lease</h1>` + sub-copy "Fill in the
  fields, preview the document, then download or save a draft." + `<LegalDisclaimerBanner variant="lease" />`
  (same `FadeIn`-once treatment as §4.2).
- `TemplateSelect`: `Card` (`CardBody`) containing three `Field`+`Select` in a
  `grid grid-cols-1 sm:grid-cols-3 gap-4` row: Country, Language, Deal type. Per D3, only
  one `<option>` exists per select today (`Armenia` / `English` / `Long-term`) — build the
  component to map over a `templates: LeaseTemplateSummary[]` prop rather than hardcoding,
  so adding a second seeded template is a migration-only change with zero component edits.

### 4.8 `LeaseForm` + `LeasePreview` (§3.4 "Lease form (fields → document)")

- `LeaseForm` sections, each its own `Card` with a `CardHeader` (section title) +
  `CardBody` (the fields), stacked `space-y-4`, matching the spec's own field grouping:
  1. **Parties** — Landlord name (prefilled, read-only display — it's the logged-in
     owner's `profiles.full_name`, not editable here), Tenant name + contact
     (`defaultValues` from `prefillTenant` when arriving via D8's hand-off link, otherwise
     empty and required).
  2. **Property** — Address + area (both prefilled read-only from the selected
     `rental_units` row — same "no need to re-type what's already on file" reasoning as
     the Landlord name field above), free-text description (`<textarea>`, optional).
  3. **Term** — Start date, end date (`Input type="date"`), renewal condition (`Select`:
     "Does not renew" / "Auto-renews").
  4. **Rent** — Amount + `Select` currency (reuse `RENTAL_UNIT_CURRENCIES` from
     `lib/landlord/schemas.ts`), payment day (`Input type="number" min={1} max={31}`), late
     penalty (optional, free text — e.g. "2% per day late").
  5. **Deposit** — Amount.
  6. **Utilities** — a short fixed checklist (Water, Electricity, Gas, Internet), each row
     a `Field`-less `<Select>` "Landlord / Tenant / Split" (three plain `<option>`s) —
     not a dynamic add/remove list for MVP, matches spec's "Utilities: who pays (list)"
     without over-building a repeater UI nothing in the acceptance criteria asks for.
  7. **Rules** — Pets (`Select`: Allowed / Not allowed), Subletting (Allowed / Not
     allowed), Smoking (Allowed / Not allowed), Repairs responsibility (`Select`: Landlord /
     Tenant).
  - Every `Field`'s `error` prop wires to RHF's `errors.<name>?.message`, exactly the
    `AddUnitDialog` convention. The date-order rule shows its error **on `endDate`**
    (`path: ['endDate']` in the zod `.refine`, per the spec's own validation snippet) with
    the exact message **"The end must be after the start"** — this is spec-verbatim
    copy, don't paraphrase it, since the acceptance criteria checks for it client- and
    server-side.
- `LeasePreview`: not a form control — a read-only `Card` (`className="sticky top-20 lg:top-24"`
  on desktop, per §6 responsive; static/non-sticky on mobile since preview moves below the
  form there) containing the merged document: `renderLeaseTemplate(selectedTemplate.body, watch())`
  (RHF's `watch()` feeding the shared `lib/landlord/leaseTemplate.ts` merge function on every
  keystroke — this is why that function must be framework-agnostic pure JS, so the exact
  same merge logic runs client-side here and server-side in the PDF route with zero drift).
  Render the merged string as `<div className="prose prose-sm max-w-none whitespace-pre-wrap text-text">`
  (no `prose` plugin exists in this repo per the design-system audit — use
  `whitespace-pre-wrap text-sm leading-relaxed text-text` instead, plain Tailwind, no new
  dependency). Section headings inside the merged text render as `text-sm font-semibold text-text mt-4 first:mt-0`
  if the template marks them (e.g. a leading `## `) — keep the template body itself
  Markdown-*lite* (bold/headings only) rather than pulling in a Markdown renderer library.
- **Live-preview micro-interaction**: no motion wrapper — this updates on every keystroke,
  which is exactly the "simple, continuous, not an entrance" case that stays as plain
  reactive re-render, per `DESIGN_SYSTEM.md`'s "when to use which" guidance (`FadeIn`/`SlideIn`/
  `Stagger`/`Reveal` are for one-time or scroll-driven moments, not per-keystroke content).
- **Section entrance**: wrap the six `LeaseForm` section `Card`s in a single
  `<Stagger gap={0.05}>` on initial mount of the workspace (the "list of things appearing in
  sequence" case) — the `LeasePreview` card itself is *not* part of that stagger group; give
  it its own `<SlideIn direction="left">` so the two columns feel like they arrive from their
  respective sides (form settles from below, preview slides in from the right) — a small,
  deliberate touch that reads as "modern-premium" without being gratuitous.

### 4.9 Lease actions bar (§3.4 "Actions")

- `<div className="flex flex-wrap gap-3 pt-4 border-t border-border">` under the form:
  - `Button variant="primary"` **"Generate / Preview"** — client-only action: validates
    the form (`handleSubmit`), and if valid, simply ensures the `LeasePreview` panel is
    visible/scrolled-into-view (on mobile, per §6, this opens the `Dialog` containing the
    preview — see §3.3 mobile wireframe). No network call; the preview already live-updates
    per §4.8. This button exists for discoverability/mobile ("I'm done, show me the
    result") more than as a distinct technical step.
  - `Button variant="secondary"` **"💾 Save draft"** — `POST /api/landlord/leases` with
    `status: 'draft'`, current form values as `fields`. On success, keep the returned
    `leaseId` in `LeaseWorkspace` state (so a subsequent Download reuses it rather than
    creating a second row) and show a small transient confirmation — reuse the same
    "Copied!" label-flip micro-interaction pattern from §4.3 (button label briefly becomes
    "Saved ✓" for ~2s), no toast component exists yet in this codebase for landlord tools,
    don't introduce one for a single confirmation.
  - `Button variant="secondary"` **"⬇️ Download PDF"** — if no `leaseId` yet, first performs
    the same save as above, then navigates the browser to
    `GET /api/landlord/leases/[id]/pdf` (plain `<a href>`-style navigation, e.g.
    `window.location.href = pdfUrl`, since this is a same-origin file download, not an API
    fetch the SPA needs to inspect). Server-side 422 (date-order or any other validation
    failure) surfaces the same inline field errors as Save draft, and the download never
    fires.
  - All three buttons share `disabled` while any one mutation is in flight (mirrors the
    admin panel's "lock the whole footer" precedent) so a user can't double-submit.

### 4.10 `LegalDisclaimerBanner` (shared by both pages + the public form)

Plain-props component (no `'use client'`, no hooks — same rationale as
`HomeValueDisclaimer`/`RatesDisclaimer`), rendered as:

```tsx
<div role="note" className="rounded-md border border-warning/30 bg-warning/10 p-4 text-xs text-muted leading-relaxed">
  {children}
</div>
```

(This is the tokenized translation of the page-spec's own tokens-table row
`text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-3` — same intent,
`warning`/`muted` semantic tokens instead of raw `amber`/`gray`, per `DESIGN_SYSTEM.md`'s
"tokens only" rule.)

- `variant="screening"` copy (verbatim from spec §3.3): **"Follow local law; discrimination
  is prohibited; screening requires the tenant's consent."** Directly beneath it, a second
  paragraph (`mt-2`) carries the spec's own callout from the same section verbatim:
  **"Background and credit checks are limited or prohibited in many countries without
  consent. This tool does not run an automatic background check — applications are
  reviewed manually by the landlord only."**
- `variant="lease"` copy (verbatim from spec §3.4): **"The template is advisory, not legal
  advice; check compliance with local law."**

Both landlord-side pages (§4.2, §4.7) and the public form (§4.6) render this component —
the public form always gets `variant="screening"` regardless of which page linked to it,
since the tenant is the one giving consent there.

---

## 5. Data model & RLS notes (for the developer, not a UI concern but shapes what the UI can assume)

- `tenant_applications`: RLS enabled; `SELECT`/`UPDATE` policies scoped through a join to
  `rental_units.owner_id = auth.uid()` (no direct `owner_id` column on this table — mirrors
  how `leases` should also carry a denormalized `owner_id` per the `rental_units` precedent,
  see `0014_landlord_rentals.sql`'s own header note about denormalizing for RLS simplicity).
  **No public/anon INSERT policy** — the public submission route (`POST /api/apply/[token]`)
  re-validates the token server-side and writes via `lib/supabase/admin.ts` (service role),
  exactly like `admin.ts`'s own documented use case ("call only after verifying the caller
  has admin/system privileges at the application layer"); here the "privilege" being
  verified is "possession of the correct opaque token for this unit," checked in the route
  handler before the admin-client write. This keeps the RLS default-deny posture intact for
  every other access path while still allowing the one legitimate anonymous-write flow the
  product needs.
- `lease_templates`: RLS enabled, `SELECT` open to any authenticated user (`auth.role() = 'authenticated'`) —
  templates aren't owner-scoped content, they're shared reference data. No app-facing
  insert/update UI in this task (the one seed row ships via the migration itself).
- `leases`: RLS enabled, owner-scoped exactly like `rental_units` (`owner_id = auth.uid()`
  on all four operations).
- `rental_units.application_token`: new nullable column, populated lazily by
  `POST /api/landlord/applications` (first call generates + persists it, subsequent calls
  for the same unit return the same token — idempotent per §4.3).

---

## 6. Page states (MVP subset of the spec's §4 table, scoped to this task's two sub-tools)

| State | What is displayed |
|---|---|
| Screening: no units yet | Empty state + `[+ Add unit]` → `/landlord/rentals` (§4.3) |
| Screening: link not yet created | `ApplicationLinkGenerator` shows only `[Create application link]` |
| Screening: link created | Copyable `Input` + `[Copy]`, "Copied!" label-flip on click |
| Screening inbox loading | 3× `Skeleton` rows |
| Screening inbox empty (per filter tab) | "No applications yet" text, no CTA |
| Screening inbox loaded | `Stagger` of `ApplicationRow`s |
| Application detail — pending action | Approve/Reject `Button`s, both disabled while either is `loading` |
| Application detail — approved | Buttons replaced by `[Create lease for this tenant →]` (D8) |
| Public form — invalid token | `not-found.tsx` empty state (§4.6) |
| Public form — consent unchecked, submit attempted | Inline `role="alert"` error under the checkbox, submit blocked client-side |
| Public form — submitted | Confirmation screen (§4.6), form unmounted |
| Lease: no `prefillTenant` | Tenant fields empty, required |
| Lease: arrived via D8 hand-off | Tenant name/contact prefilled from the approved application |
| Lease: `endDate <= startDate` | Inline error on the End date `Field`, exact spec copy, Generate/Preview and Download both blocked |
| Lease: draft saved | "💾 Save draft" label flips to "Saved ✓" for ~2s |
| Lease: download in flight | "⬇️ Download PDF" shows `Button loading`, whole footer disabled |
| Error (any API fetch fails) | Reuse `RentalsDashboard`'s existing "Something went wrong… [Try again]" text-link pattern verbatim |

---

## 7. Responsive

- **≥1024px (lg).** Screening: sub-nav `w-56` + content, unit picker + link generator +
  inbox stacked vertically in the content column. Lease: form column and `LeasePreview`
  side-by-side (`lg:flex lg:gap-8`, preview `lg:w-[420px] lg:flex-shrink-0`, sticky).
- **768–1023px (md).** Sub-nav becomes `LandlordSubNav`'s existing horizontal-scroll top
  strip (already responsive, no change needed). Lease preview renders **below** the form,
  full width, not sticky.
- **<768px (sm).** Screening inbox rows are already card-shaped (`ApplicationRow` doesn't
  need a separate mobile layout — `Card` reflows naturally). Lease: `[Generate / Preview]`
  opens the `LeasePreview` content inside a `Dialog` (full-width `DialogBody`) instead of
  an always-visible column, since there's no room for both side-by-side — this is the one
  place mobile diverges structurally, not just via Tailwind breakpoints.

---

## 8. Accessibility

- Status badges (`New`/`Reviewing`/`Approved`/`Rejected`) always pair the `Badge` with
  visible text, never color alone — already true of `Badge`'s own API (it always renders
  children as text).
- `Tabs` filter in the inbox reuses the existing `role="tablist"`/roving-tabindex
  implementation verbatim — no new keyboard behavior to build.
- Lease form: every field uses `Field`'s `<label htmlFor>` association; the consent
  checkbox on the public form uses an explicit `<label htmlFor="consent">` pair (§4.6) since
  it's outside `Field`'s normal shape; inline errors use `role="alert"` throughout (`Field`
  already does this; the checkbox error and the notes-textarea error must match it manually).
  Touch targets: the checkbox is `size-5` (20px) visually but wrap it and its label in a
  `min-h-[44px]` flex row so the tappable area meets the 44px target even though the visual
  box is smaller — same "small icon, large hit target" pattern `Button size="sm"` already
  guarantees via its `h-9` minimum.
  - Consent checkbox min-height wrapper: `<div className="flex items-start gap-3 min-h-11 py-1">`.
- `LeasePreview`'s "Download PDF" textual fallback requirement (spec §7: "a 'Download PDF'
  textual fallback (the preview is decorative, not the only access)") is satisfied by
  construction here — the preview `Card` is never the *only* way to get the document, the
  `[⬇️ Download PDF]` button is always present and independent of whether the preview
  rendered correctly.
- Application link generator: the copy-able `Input` (§4.3) satisfies spec §7's "a copy-able
  URL next to the QR (not only the QR)" even without a QR at all (D1) — the requirement's
  intent (don't gate access behind a QR-only affordance) is fully met.
- Contrast: `text-muted` on `bg-warning/10` and `text-warning` on `bg-warning/15` (the
  `Badge` "Reviewing" variant) are existing token pairings already used elsewhere in the
  app (e.g. any existing `Badge variant="warning"` usage) — no new contrast audit needed.

---

## 9. SEO & meta

- Both `/landlord/screening` and `/landlord/lease`: `metadata.robots = { index: false, follow: false }`,
  identical mechanism to `/landlord/rentals`.
- `/apply/[token]`: also `noindex`/`nofollow` — it's a per-tenant private link, not content
  meant to be discovered, even though it requires no login.
- Neither new route needs a sitemap entry; confirm (as `24-admin-handoff.md` did) that the
  sitemap generator only walks public marketing routes and these are absent by omission.

---

## 10. Motion summary

| Interaction | Primitive / technique |
|---|---|
| Disclaimer banner entrance (both pages + public form) | `FadeIn` (no delay), once |
| `ApplicationLinkGenerator` card entrance | `SlideIn direction="up"` |
| Applications inbox list | `Stagger gap={0.06}` wrapping `ApplicationRow`s |
| Lease form sections entrance | `Stagger gap={0.05}` wrapping the 6 section `Card`s |
| Lease preview column entrance | `SlideIn direction="left"` (independent of the form's stagger group) |
| Success confirmation (public form) | `FadeIn` wrapping the checkmark/heading/sub-copy |
| "Copy"/"Save draft" label flip (Copied!/Saved ✓) | Plain `useState` + `setTimeout`, no wrapper — matches `DESIGN_SYSTEM.md`'s "simple hover/tap feedback → plain Tailwind, no wrapper needed" guidance |
| Live document preview updates (every keystroke) | Plain reactive re-render, no wrapper — continuous, not an entrance |
| Button hover/active/disabled/loading | `Button`'s existing built-in states, unchanged |
| Card hover (`ApplicationRow`, interactive cards) | `Card variant="interactive"`'s existing `hover:shadow-md transition-shadow`, unchanged |
| `Dialog` (Application detail, mobile lease-preview) | No entrance/exit transition — matches existing `UnitDetailPanel` precedent, stay consistent |

All of the above already respect `prefers-reduced-motion` for free via
`components/motion`'s shared `useReducedMotion()` check — no extra work required in any
new component that uses `FadeIn`/`SlideIn`/`Stagger` as specified.
