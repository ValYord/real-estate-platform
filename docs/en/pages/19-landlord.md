# Page 19 — Landlord Tools (Landlord tools) 🔵 Phase 3

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, sub-tool-by-sub-tool behavior and states, microcopy (English), technical part (components, props, API, validation), responsive, accessibility, SEO, analytics.

**URL.** `/landlord` (hub) + sub-tools: `/landlord/rentals`, `/landlord/screening`, `/landlord/lease`, `/landlord/rent`, `/landlord/list`
**Roles.** User+ (login required for all tools); some functions: Pro (`/pro`).
**Primary goal.** Gather the rental management tools in one place for the landlord: a units dashboard, tenant screening, lease generation, online rent collection, listing shortcut. Retention + Pro upsell.

> ⚠️ **Legal/licensing.** Screening (background check), the legal force of the lease, and online rent collection are **heavily country-dependent** (Armenia vs Russia vs other CIS). Rent collection requires local payment licensing → **Phase 3+**, per-country rollout. All templates carry an "advisory, not legal advice" disclaimer.

---

## 0. Overview

This is the **retention + Pro upsell tool suite** for users who own rental property. The listing marketplace brings them a tenant, but landlord tools keep them on the platform — to manage units, screen tenants, create leases, and (where legal) collect rent. The more tools they use, the higher the Pro subscription conversion.

A critical constraint: **the platform is a catalog, not escrow** (00-SPEC §1). Rent collection never **holds money** on the platform — the payment goes directly to the landlord's account via the payment provider. Screening **does not do an automatic background pull** (the infrastructure is limited in CIS, and the legal aspect is sensitive): initially only application + self-declaration + manual review.

The hub is a marketing landing page (**SSR, indexable**); the sub-tool dashboards are **login-gated, noindex, RLS owner-scoped** (the user sees only their own units/applications/leases).

---

## 1. User scenarios

**Scenario A — Landlord Karen (desktop).** Karen has 3 rental apartments. He opens `/landlord`, and in the hub sees quick stats "3 active · 1,200,000 ֏/mo · 1 overdue". He goes to **Manage rentals** → a unit's detail → the Payments tab: he sees that one tenant is late. He clicks **[💬 Message the tenant]** → messages thread. → engagement (`ll_message_tenant`).

**Scenario B — New landlord Ani (mobile).** Ani is renting out an apartment for the first time. The hub is empty: she sees onboarding "Add your first rental property". She goes to **Create a lease** → selects an Armenian template, long-term → fills in the parties, rent 250,000 ֏, deposit, rules → **[Generate / Preview]** → PDF preview → **[⬇️ Download PDF]**. → activation (`ll_lease_generated`).

**Scenario C — Tenant David (screening link).** David receives the landlord's share link. He opens it, fills the application form (name, employment, income, references), checks the **consent checkbox**, submits. In the landlord's inbox a "New" application appears. The landlord reviews it, **[Approve]** → moves on to lease creation, with tenant data prefilled. → funnel (`ll_application_submitted` → `ll_application_approved`).

---

## 2. Layout & visual structure

### Hub desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Landlord tools»  subtitle                              │
│ ┌── QUICK STATS (if has units) ───────────────────────────┐│
│ │ 3 active │ 1.2M ֏/mo │ 2 open apps │ 1 overdue          ││
│ └──────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ ┌─ TOOL CARDS GRID (grid-cols-3 gap-4) ───────────────────┐│
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐                     ││
│ │ │🏢 Manage│ │👤 Screen│ │📄 Lease │                     ││
│ │ │ rentals │ │ tenants │ │ generate│                     ││
│ │ │ [Open]  │ │ [Open]  │ │ [Open]  │                     ││
│ │ └─────────┘ └─────────┘ └─────────┘                     ││
│ │ ┌─────────┐ ┌─────────┐                                 ││
│ │ │💳 Collect│ │➕ List   │  (Collect rent: country-gated)││
│ │ │ rent     │ │ rental  │                                 ││
│ │ └─────────┘ └─────────┘                                 ││
│ └──────────────────────────────────────────────────────────┘│
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Sub-tool desktop (e.g. Manage rentals — sidebar nav + content)

```
┌──────────────┬─────────────────────────────────────────────┐
│ SUB-NAV      │ CONTENT                                      │
│ (w-56)       │ Units grid / unit detail (tabs)             │
│ ▸ Rentals    │ ┌── Unit card ──┐ ┌── Unit card ──┐         │
│ ▸ Screening  │ │ photo·address │ │ Occupied      │         │
│ ▸ Lease      │ │ Vacant badge  │ │ rent·tenant   │         │
│ ▸ Rent       │ └───────────────┘ └───────────────┘         │
│ ▸ List       │ [+ Add unit]                                │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 + quick stats (wrap)  │
│ ── Tool cards (stack) ── │
│ 🏢 Manage rentals [Open] │
│ 👤 Screen tenants        │
│ 📄 Create a lease        │
│ 💳 Collect rent (gated)  │
│ ➕ List your rental      │
├──────────────────────────┤
│ FOOTER                   │
└──────────────────────────┘
(in sub-tools sub-nav → top tabs / dropdown)
```

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` |
| Quick stat | `text-2xl font-bold` + label `text-xs text-gray-500` |
| Tool card | `shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md` |
| Tool icon | `w-10 h-10 text-primary` |
| Status Occupied | `bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded` |
| Status Vacant | `bg-gray-100 text-gray-600` |
| Status Listed | `bg-blue-50 text-blue-600` |
| Payment Overdue | `bg-red-100 text-red-700` |
| Payment Paid | `bg-green-100 text-green-700` |
| App status New | `bg-blue-50 text-blue-600`, Approved `bg-green-100 text-green-700`, Rejected `bg-gray-100 text-gray-500` |
| Disclaimer | `text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-3` |
| Country-gated badge | `bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded` ("Coming soon") |
| Primary CTA | `bg-primary text-white h-11 rounded-lg px-5 font-medium hover:bg-primary/90` |

---

## 3. Section-by-section

### 3.1 Hub (`/landlord`)

- **Header / intro.** H1 "Landlord tools" + subtitle "Manage your rental property in one place".
- **Quick stats** (if has units): active rentals, monthly income, open applications, overdue payments.
- **Tool cards (4–5 grid).** Each card: icon + name + 1 line + [Open]:
  1. **Manage rentals** → `/landlord/rentals`
  2. **Screen tenants** → `/landlord/screening`
  3. **Create a lease** → `/landlord/lease`
  4. **Collect rent online** → `/landlord/rent` *(Phase 3+, country-gated: "Coming soon" badge + disabled in an unsupported country)*
  5. **List your rental** → `/sell/new?dealType=rent`
- **Onboarding (empty).** "Get started: add your first rental property" → CTA.

### 3.2 Sub-tool 1 — Manage Rentals (`/landlord/rentals`)

- **Purpose.** A dashboard of your rental units.
- **Units list/grid.** Each unit: photo, address, status (Occupied / Vacant / Listed), current rent, tenant, lease end.
- **[+ Add unit]** → form (address, type, m², rent, currency) or import from an existing listing.
- **Unit detail (click).**
  - **Tabs.** Overview · Tenant · Lease · Payments · Documents.
  - **Tenant card.** Name, contact, lease term.
  - **Payment status.** Paid/overdue badge, next payment date (link → rent collection).
  - **Actions.** `[✏️ Edit]` · `[📄 Lease]` · `[💬 Message the tenant]` · `[📊 Income report]`.
- **Income overview.** Monthly income (Recharts bar chart), occupancy rate, overdue payments.
- **Data.** `rental_units`, `leases`, `rent_payments`.

### 3.3 Sub-tool 2 — Screen Tenants (`/landlord/screening`)

- **Purpose.** Tenant application + check (legal-limited per country).

> ⚠️ Background/credit checks are **limited or prohibited in many countries** without consent. In Armenia/CIS the full credit-check infrastructure is limited → initially only **application + self-declaration + manual review by the landlord**, no automatic background pull.

- **Create application link.** The landlord creates an application for a unit → a shareable link/QR for the tenant.
- **Application form (filled by the tenant).** Name, contact, ID (optional), employment/income, current residence, references, self-declaration, **consent checkbox**.
- **Applications inbox (landlord).** Received applications by unit: status (New / Reviewing / Approved / Rejected).
- **Application detail.** Data + attached document + **[Approve]** / **[Reject]** + notes. Approve → move to lease creation (prefill tenant data).
- **Background check (Phase 3+, country-gated).** Only where legal + a provider exists; with consent; an explicit "per-country availability" note.
- **Data.** `tenant_applications`.
- **Disclaimer.** "Follow local law; discrimination is prohibited; screening requires the tenant's consent".

### 3.4 Sub-tool 3 — Create a Lease (`/landlord/lease`)

- **Purpose.** A rental agreement template/generator with fillable fields.
- **Template select.** By country/language (hy/ru/en) + deal type (long-term / short-term).
- **Lease form (fields → document).**
  - Parties: landlord (name, ID) + tenant (prefill from screening).
  - Property: address, m², description.
  - Term: start/end date, renewal condition.
  - Rent: amount + currency + payment day + late penalty.
  - Deposit (security deposit) amount.
  - Utilities: who pays (list).
  - Rules: pets, subletting, smoking, repair responsibility.
  - Signature block.
- **[Generate / Preview]** → render the lease document (PDF preview).
  - **Output.** Fields → template merge → PDF (`leases` + Supabase Storage).
- **Actions.** `[⬇️ Download PDF]` · `[✉️ Send to the tenant for signing]` (e-sign: Phase 3+, provider-dependent) · `[💾 Save draft]`.
- **Data.** `lease_templates` (per country/lang), `leases`.
- **Disclaimer.** "The template is advisory, not legal advice; check compliance with local law".

### 3.5 Sub-tool 4 — Collect Rent Online (`/landlord/rent`) — Phase 3+

- **Purpose.** Online rent collection with payment provider integration.

> ⚠️ **Country-gated.** Depends on local payment licensing and the provider (e.g. local acquiring / bank transfer). Available only in supported countries; elsewhere: "Coming soon" + manual tracking only.

- **Setup.** The landlord connects a payout account (provider onboarding/KYC).
- **Rent schedule per unit.** Amount, currency, due day, recurring → creates invoices.
- **Tenant payment.** The tenant receives a link/reminder → pays (card/transfer depending on the provider).
- **Dashboard.** Paid/pending/overdue, history, receipts, auto-reminder (email/notification).
- **Manual fallback.** Where online is unavailable: the landlord manually marks "paid" + receipt upload (tracking only, no money movement).
- **Data.** `rent_payments`.
- **Disclaimer.** The platform **does not hold money / does not do escrow** (consistent with the product model); the payment goes to the landlord's account directly via the provider.

### 3.6 Sub-tool 5 — List Your Rental (shortcut)

- **What it does.** A quick link to the listing wizard in rent mode.
- **[List your rental]** → `/sell/new?dealType=rent` (prefill unit data if opened from rentals).

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **Hub (empty)** | Onboarding CTA "Add your first rental property", stats hidden |
| **Hub (with units)** | Quick stats + tool cards grid |
| **Rentals loading** | Unit card skeleton grid (shimmer) |
| **Rentals empty** | "You don't have any units yet" + [+ Add unit] |
| **Screening inbox empty** | "No applications yet" + [Create application link] |
| **Lease draft** | Live PDF preview next to the form |
| **Rent (gated country)** | "Coming soon in your country" + manual tracking only banner |
| **Country unsupported (tool)** | Tool card disabled "Coming soon" + waitlist |
| **Pro-gated feature** | "Available with Pro" + [Upgrade to Pro] (`/pro`) |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<LandlordHub> (Server Component, SSR — marketing landing)
 ├─ <LandlordQuickStats stats />               (client, auth)
 └─ <ToolCardGrid cards countryGated />

<RentalsPage> (login-gated, RLS)
 ├─ <UnitGrid units onAdd />                    (client, React Query)
 └─ <UnitDetail tabs={Overview|Tenant|Lease|Payments|Documents} />
     └─ <IncomeChart data />                    (Recharts)

<ScreeningPage>
 ├─ <ApplicationLinkGenerator unitId />
 └─ <ApplicationsInbox status />  └─ <ApplicationDetail onApprove onReject />

<LeasePage>
 ├─ <TemplateSelect country lang dealType />
 └─ <LeaseForm fields /> ──► <LeasePdfPreview />   (rhf+zod)

<RentCollectionPage> (Phase 3+, country-gated)
 ├─ <PayoutSetup /> · <RentSchedule unitId /> · <PaymentsDashboard />
```

### Data fields used (new entities, see 00-SPEC §7)

`rental_units: id, owner_id, property_id?, address, type, area_m2, rent, currency, status(occupied/vacant/listed), tenant_id?, created_at`
`tenant_applications: id, unit_id, applicant_name, contact, employment, income, references, declaration, status(new/reviewing/approved/rejected), consent, documents[], created_at`
`lease_templates: id, country, lang, deal_type, body`
`leases: id, unit_id, fields(json), pdf_url, status(draft/sent/signed), created_at`
`rent_payments: id, unit_id, period, amount, currency, status(paid/pending/overdue), provider_ref?, paid_at`

### API contracts

**`GET /api/landlord/rentals`** (login, RLS)
```jsonc
// 200 OK
{ "units": [
  { "id": 14, "address": "Arabkir, Komitas 12", "status": "occupied",
    "rent": 250000, "currency": "AMD", "tenantName": "David",
    "leaseEnds": "2026-12-01", "paymentStatus": "paid" }
] }
// 401 { "error": "auth_required" }
```

**`POST /api/landlord/applications`** (create link) → `{ "unitId": 14 }` → `201 { "applicationLink": "https://.../apply/abc123" }`
**`GET /api/landlord/applications?unit=14`** → `200 { "items": Application[] }`
**`PATCH /api/landlord/applications/[id]`** → `{ "status": "approved", "notes": "..." }` → `200`

**`POST /api/landlord/leases`**
```jsonc
// request { "unitId": 14, "templateId": 2, "fields": { "rent": 250000, "deposit": 250000, ... } }
// 201     { "leaseId": 77, "pdfUrl": "https://.../leases/77.pdf" }
// 422     { "error": "invalid_input", "field": "endDate" }
```
**`GET /api/landlord/leases/[id]/pdf`** → `200` (PDF stream)

**`POST /api/landlord/rent/setup`** / **`POST /api/landlord/rent/invoice`** *(Phase 3+, provider, country-gated)* → `403 { "error": "country_unsupported" }` where there is no licensing.

### Validation (zod)

```ts
const applicationSchema = z.object({
  applicantName: z.string().min(2, "Name is required").max(80),
  contact: z.string().min(5, "Contact is required"),
  employment: z.string().max(200).optional(),
  income: z.number().nonnegative().optional(),
  declaration: z.string().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});

const leaseSchema = z.object({
  unitId: z.number(),
  templateId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rent: z.number().positive("Rent is required"),
  deposit: z.number().nonnegative(),
}).refine(v => v.endDate > v.startDate, {
  message: "The end must be after the start", path: ["endDate"],
});
```

- **RLS owner-scoped.** The landlord sees only their own units/applications/leases (Supabase RLS policy `owner_id = auth.uid()`).
- **Consent gating.** Screening/background: without tenant consent → blocked (422).
- **No money escrow.** Rent collection never holds money on the platform; via the provider directly to the landlord account.
- **Country gating.** Rent/screening provider features: `403 country_unsupported` where there is no licensing → UI "Coming soon".

---

## 6. Responsive

- **≥1024px (lg).** Hub: tool cards 3 columns; sub-tool: sidebar nav (`w-56`) + content; unit grid 3 columns; lease form with live PDF preview alongside.
- **768–1023px (md).** Tool cards 2 columns; sub-nav → top tabs; unit grid 2 columns; PDF preview below the form.
- **<768px (sm).** Tool cards stack; sub-nav → dropdown; unit grid 1 column; lease preview full-width modal; charts via `ResponsiveContainer`.

---

## 7. Accessibility

- Unit/application cards: structured headings; status badges in text (not by color alone).
- Tabs (`Overview/Tenant/Lease/Payments`): `role="tablist"`/`tab`/`tabpanel`, keyboard ←/→.
- Lease form: all fields with a `<label>`; inline error `role="alert"`; consent checkbox required, error clear.
- For the PDF preview: a "Download PDF" textual fallback (the preview is decorative, not the only access).
- Data table fallback for the income chart; touch target ≥ 44px; contrast ≥ 4.5:1.
- Application link generator: a copy-able URL next to the QR (not only the QR).

---

## 8. SEO & meta

- **Hub** (`/landlord`): indexable marketing landing: `<title>` = "Landlord tools — lease, screening, rent | {brand}"; description: a summary of the tools.
- The sub-tool dashboards (`/landlord/rentals` etc.): **noindex** (private, login-gated, RLS).
- Structured data: `FAQPage` (the hub's "How it works" section) + `Service` (tool).
- `hreflang` (hy/ru/en) for the hub/marketing pages; OG image: generic landlord banner.
- Country-unsupported tools are visible on the hub, but the sub-pages: `noindex`.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `ll_hub_viewed` | Hub load | `has_units` |
| `ll_tool_opened` | Tool card [Open] | `tool` |
| `ll_unit_added` | [+ Add unit] success | `unit_id` |
| `ll_message_tenant` | [💬 Message the tenant] | `unit_id` |
| `ll_app_link_created` | Application link created | `unit_id` |
| `ll_application_submitted` | Tenant application submit | `unit_id` |
| `ll_application_approved` | [Approve] | `application_id` |
| `ll_lease_generated` | [Generate / Preview] | `lease_id, country` |
| `ll_lease_downloaded` | [⬇️ Download PDF] | `lease_id` |
| `ll_rent_setup` | Payout account setup | `country` |
| `ll_country_gated` | Country-gated tool seen | `tool, country` |
| `ll_pro_upsell_clicked` | [Upgrade to Pro] | `feature` |
