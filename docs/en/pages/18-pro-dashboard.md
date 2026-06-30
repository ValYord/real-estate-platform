# Page 18 — Pro Dashboard + Analytics 🔵 Phase 3

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/pro/dashboard` — sub-routes: `/pro/dashboard/analytics`, `/leads`, `/promoted`, `/upload`, `/team`, `/billing`.
**Roles.** Agent / Pro (Pro or Premium tier). Free tier: limited preview (blurred widgets + upgrade CTA). Auth-gated, `noindex`.
**Primary goal.** The agent's management **hub**: analytics, leads, billing, promoted listings, bulk upload, team. This is where the value of the Pro tier "materializes": the more the agent comes here, the lower the churn.

---

## 0. Overview

This is the **retention page** — the place where the Pro/Premium agent logs in every day to see their leads, their listings' performance, and to manage their subscription. The page must: (1) show the most important things at a glance (KPI overview: views, leads, conversion), (2) provide deep analytics (Recharts charts: views/favorites/contact-clicks/leads over time), and (3) centralize all actions (lead inbox, promote, bulk upload, team, billing) in a single sidebar nav.

The page is **client-heavy** (interactive charts, realtime leads, filters): the shell is SSR (auth + tier check + sidebar), the data fetched via React Query (date-range-aware). The lead inbox + KPIs live-update (Supabase Realtime / refetch). For the Free tier the widgets are locked, for the upgrade funnel. Charts: Recharts; server state: React Query (00-SPEC §4).

---

## 1. User scenarios

**Scenario A — Agent Hovhannes (desktop, daily check).** In the morning Hovhannes opens the dashboard. In the Overview he sees "↑ 12% views vs last week", a new lead badge "3". He goes to Leads, sees a new request, clicks **[💬 Reply]**, writes, and sets the status to "Contacted". → Lead progress updated, the charts recalculated.

**Scenario B — Premium Anna (bulk upload).** Anna has 24 apartments from a new construction. In the Bulk Upload section she downloads the CSV template, fills it in, and uploads it. In the preview table 22 rows are green and valid, 2 rows red ("Invalid price"). She fixes them inline and clicks **[Publish 24 listings]**. Progress bar → "24 created".

**Scenario C — Free tier Davit (upgrade funnel).** Davit is on Free and opens `/pro/dashboard`. The Overview is locked/blurred with an "Upgrade to Pro" overlay. Analytics is basic only. He tries Promote → an inline "Pro and above" CTA → `/pro`. He clicks **[Upgrade to Pro]**, checks out, and returns to an unlocked dashboard.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + content

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────┬─────────────────────────────────────────────┤
│ SIDEBAR w-60 │ TOPBAR: [Pro badge] · plan · [📅 30d ▾]     │
│ ▸ Overview   ├─────────────────────────────────────────────┤
│ ▸ Analytics  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ (KPI cards) │
│ ▸ Leads ③    │ │Views│ │Favs │ │Leads│ │Conv.│             │
│ ▸ Promoted   │ │1,240│ │ 86  │ │ 18  │ │1.4% │             │
│ ▸ Bulk Upload│ │↑12% │ │↑4%  │ │↓2%  │ │ —   │             │
│ ▸ Team       │ └─────┘ └─────┘ └─────┘ └─────┘             │
│ ▸ Billing    │ ┌─── Views over time (line chart) ───┐     │
│              │ │  Recharts · property selector       │     │
│ [Upgrade]    │ └─────────────────────────────────────┘     │
│ (if Pro)     │ ┌─ Top performing listings (table) ──┐     │
│              │ └─────────────────────────────────────┘     │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px) — bottom/hamburger nav

```
┌──────────────────────────┐
│ HEADER (h-14) ☰          │
├──────────────────────────┤
│ [Pro] · [📅 30d ▾]       │
├──────────────────────────┤
│ ┌────────┐ ┌────────┐    │
│ │ Views  │ │ Leads  │    │  (KPI 2×2)
│ │ 1,240  │ │  18    │    │
│ └────────┘ └────────┘    │
│ ┌────────┐ ┌────────┐    │
│ │ Favs   │ │ Conv.  │    │
│ └────────┘ └────────┘    │
│ ── Chart (full-width) ── │
│ ── Top listings ──       │
├──────────────────────────┤
│ [Overview][Leads][Charts]│  ← bottom tab nav
│ [More ▾]                 │
└──────────────────────────┘
```

- On desktop a **left sidebar nav** (`w-60`, sticky): Overview · Analytics · Leads · Promoted · Bulk Upload · Team · Billing. Active item: `bg-primary/10 text-primary`. Leads: an unread count badge.
- On mobile the sidebar: a hamburger drawer; or a bottom tab-bar for the 3-4 main sections, the rest under "More".
- In the topbar: tier badge + plan + **date-range picker** (7d / 30d / 90d / custom). All widgets respect the selected range.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Sidebar | `w-60 bg-white border-r border-gray-200`, item: `h-10 px-3 rounded-md text-sm` |
| Sidebar active | `bg-primary/10 text-primary font-medium` |
| Sidebar badge | `bg-red-500 text-white text-xs rounded-full px-1.5` |
| Topbar | `h-14 border-b border-gray-200 flex items-center justify-between px-6` |
| Tier badge | Pro: `bg-violet-100 text-violet-700`; Premium: `bg-amber-100 text-amber-700` |
| Date-range picker | `h-9 text-sm border border-gray-300 rounded-md` |
| KPI card | `bg-white border border-gray-200 rounded-xl p-4` |
| KPI number | `text-2xl font-bold text-gray-900` |
| KPI trend ↑ | `text-green-600 text-sm`; ↓: `text-red-500` |
| Chart container | `bg-white border rounded-xl p-4`, height `h-72` |
| Chart line | `stroke-primary`; area fill: `fill-primary/10` |
| Table | row hover: `bg-gray-50`, header: `text-xs uppercase text-gray-500` |
| Lead status chip | New: `bg-blue-100 text-blue-700`; Won: `bg-green-100 text-green-700`; Lost: `bg-gray-100 text-gray-500` |
| Locked overlay (Free) | `backdrop-blur-sm bg-white/60` + centered "Upgrade" CTA |
| Progress bar | `bg-gray-200 h-2 rounded`, fill: `bg-primary` |

---

## 3. Section-by-section

### 3.1 Overview (main)

- **KPI cards.** `grid grid-cols-2 lg:grid-cols-6 gap-3`: **Total views** · **Favorites** · **Contact clicks** · **New leads** · **Active listings** · **Conversion rate** (views→leads). Each card: a large number + ↑/↓ % vs the previous period + mini sparkline.
- **Quick links.** "See leads" · "Promote listing" (shortcut buttons).
- **Date range.** Follows the topbar picker; changing it re-fetches all KPIs.

### 3.2 Analytics (Listing performance charts)

With Recharts:
- **Views over time** — line chart (day/week), property selector (all / one).
- **Favorites over time** — line / area chart.
- **Contact clicks** — bar chart.
- **Leads over time** — line chart + **funnel** (views → contacts → leads).
- **Top performing listings** — table: listing · views · favorites · clicks · leads · CTR → row click → `/property/[id]`.
- **Traffic sources** (Premium) — pie chart (search / agent profile / direct / share).
- **[Export CSV]** (Premium) → `GET /api/pro/analytics/export`.
- **Filters.** Date range · property · deal type.
- **Empty state.** "Not enough data yet — listings start collecting statistics after they're published".

### 3.3 Lead inbox

A central place: all the leads (property contacts, agent requests, compare-proposals).
- **List / table.** Name · contact · source (property / request) · message preview · status · date.
- **Status.** New · Contacted · In progress · Won · Lost (changeable via dropdown).
- **Row click** → lead detail panel (drawer): full message · contact info · related property · notes.
- **Actions.** **[💬 Reply]** (→ messages thread) · **[📞 Call]** (reveal) · **[🏷 Status]** · **[📝 Note]** · **[Respond proposal]** (in the case of a compare-flow request → sends a proposal).
- **Filters.** Status · source · date · unread.
- **Notification.** An unread count badge on the sidebar "Leads"; on a new lead: realtime update + toast.

### 3.4 Subscription / Billing management

- **Current plan card.** Tier · price · billing cycle · next charge date · payment method ("•••• 4242").
- **Actions.** **[Upgrade]** → `/pro` checkout · **[Downgrade]** / **[Cancel]** → confirm modal → Stripe portal · **[Update payment method]** → Stripe Customer Portal (`POST /api/billing/portal`).
- **Usage.** Progress bars: "Listings: 18/25" · "Featured: 1/2 this month" · "Team: 4/10".
- **Invoices.** Table: date · amount · status (Paid) · **[⬇ PDF]** (Stripe invoice URL).
- **Cancel.** "Active until {date}", then auto-downgrade to Free; extra listings → archived.

### 3.5 Promoted listings manager

- **Active promotions.** Table: listing · type (Featured / Top) · start–end · days remaining · performance (extra views) · **[⏹ Stop]**.
- **[+ Promote listing]** → modal: choose a listing → choose a placement (Featured home / Search top / Category top) → duration → cost (quota from tier or payment) → **[Confirm]**.
- **Quota indicator.** From the tier: "2/mo Pro"; once exhausted: pay-per-promote or upgrade CTA.

### 3.6 Bulk listing upload (CSV / multi)

A Premium tool: many properties at once.
- **[⬇ Download CSV template]** — with a column explanation (title, price, currency, city, rooms, area, ...).
- **[⬆ Upload CSV]** → parse → **preview table** (validation: green valid / red error rows, inline error message on each wrong field).
- **Media.** Multi-image upload or URL column; geocode from the address (Mapbox).
- **[Fix & retry]** for the errored rows (inline edit).
- **[Publish N listings]** → bulk create (draft or active) → progress bar → summary "24 created, 2 skipped".

### 3.7 Team member management

- **Members table.** Avatar · name · email · role (Owner / Manager / Agent) · listings count · status.
- **[+ Invite member]** → email + role → `POST /api/pro/team/invite` (invite email → join).
- **Per-member.** Change role (dropdown) · **[Remove]** (confirm) · seat usage "4/10 Premium".
- **Permissions.** Owner = billing + team; Manager = listings + leads; Agent = only their own listings.
- **Listing assignment.** Who is responsible for a given listing.

### 3.8 Footer / help

- Help center link · "Contact priority support" (Pro = email, Premium = email + phone).

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton: sidebar + KPI card placeholders + chart shimmer |
| **Loaded (Pro)** | Full dashboard, the Premium-only widgets locked with a "Premium" tag |
| **Loaded (Premium)** | All widgets unlocked + export + traffic sources |
| **Free tier** | Blurred widgets + "Upgrade to Pro" overlay; analytics: basic only |
| **Empty (new agent)** | "No data yet" empty state + "Post your first listing" |
| **New lead (realtime)** | Sidebar badge ++ + toast "New request from {name}" |
| **Bulk upload errors** | Red error rows + downloadable error report + partial publish |
| **Quota reached** | Inline "Upgrade" CTA (not a hard error) |
| **Cancel mid-cycle** | "Active until {date}", then a downgrade banner |
| **Error (API fail)** | At the widget level "Couldn't load" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<ProDashboardLayout> (Server Component — auth + tier check)
 ├─ <ProSidebar items={NavItem[]} tier unreadLeads />
 ├─ <ProTopbar tier plan dateRange onRangeChange />   (client)
 └─ {children}  ── per-route content
     ├─ /overview   <OverviewKpis range />            (client, React Query)
     ├─ /analytics  <AnalyticsCharts range property /> (client, Recharts)
     │   ├─ <ViewsLineChart /> <FavoritesAreaChart />
     │   ├─ <ContactClicksBarChart /> <LeadsFunnel />
     │   ├─ <TopListingsTable /> <TrafficSourcesPie /> (Premium)
     │   └─ <ExportCsvButton />                        (Premium)
     ├─ /leads      <LeadInbox filters />             (client, realtime)
     │   └─ <LeadDetailDrawer lead />
     ├─ /promoted   <PromotionsManager />             (client)
     │   └─ <PromoteModal />
     ├─ /upload     <BulkUpload />                     (Premium, client)
     │   └─ <CsvPreviewTable rows={ParsedRow[]} />
     ├─ /team       <TeamManager seats />             (client)
     └─ /billing    <BillingPanel subscription invoices /> (client)
 └─ <UpgradeOverlay />  (conditional: tier === "free")
```

### Data fields used (see 00-SPEC §7)

`overview: { views, favorites, contactClicks, newLeads, activeListings, conversionRate, trends{...}, sparklines{...} }`
`lead: { id, name, contact{phone,email}, source(property/request/proposal), property_id, message, status, note, created_at }`
`promotion: { id, listing_id, type(featured/top), placement, starts_at, ends_at, extra_views, status }`
`subscription: { tier, cycle, price, current_period_end, payment_method, usage{listings, featured, seats} }`
`team_member: { id, name, email, role(owner/manager/agent), listings_count, status }`

### API contracts

**`GET /api/pro/overview?range=30d`**
```jsonc
// 200 OK
{
  "views": { "value": 1240, "trend": 0.12 },
  "favorites": { "value": 86, "trend": 0.04 },
  "contactClicks": { "value": 54, "trend": -0.03 },
  "newLeads": { "value": 18, "trend": -0.02 },
  "activeListings": { "value": 24 },
  "conversionRate": { "value": 0.0145 },
  "sparklines": { "views": [/* daily */], "leads": [/* daily */] }
}
// 403 { "error": "tier_insufficient" }  → upgrade overlay
```

**`GET /api/pro/analytics?range=30d&property=all&metric=views`**
```jsonc
// 200 { "series": [ { "date": "2026-06-01", "value": 42 }, ... ],
//        "funnel": { "views": 1240, "contacts": 54, "leads": 18 } }
```

**`GET /api/pro/analytics/export?range=30d`** (Premium) → `200` CSV file (`Content-Type: text/csv`)

**`GET /api/pro/leads?status=new&source=&page=1`** → `200 { "items": Lead[], "total": ... }`
**`PATCH /api/pro/leads/[id]`** → `{ "status": "contacted", "note": "..." }` → `200`
**`POST /api/agent-requests/[id]/respond`** → `{ "proposal": "..." }` → `201`

**`GET|POST|DELETE /api/pro/promotions`** → list / create (`{ listingId, placement, days }`) / cancel

**`POST /api/pro/listings/bulk`** (validate)
```jsonc
// request  { "rows": [ { /* parsed CSV row */ } ] }
// 200      { "valid": [/* rowIndex */], "errors": [ { "row": 3, "field": "price", "msg": "Invalid price" } ] }
```
**`POST /api/pro/listings/bulk/commit`** → `{ "rows": [...], "status": "active" }` → `202 { "created": 24, "skipped": 2 }`

**`GET /api/billing/subscription`**, **`GET /api/billing/invoices`**, **`POST /api/billing/portal`**
**`GET|POST|PATCH|DELETE /api/pro/team`** (+ `/invite`)

### Validation (zod)

```ts
const leadUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "in_progress", "won", "lost"]).optional(),
  note: z.string().max(2000).optional(),
});

const promoteSchema = z.object({
  listingId: z.number().int().positive(),
  placement: z.enum(["featured_home", "search_top", "category_top"]),
  days: z.number().int().min(1).max(90),
});

const teamInviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["manager", "agent"]),
});

const bulkRowSchema = z.object({
  title: z.string().min(5, "Title is too short").max(120),
  price: z.number().positive("Invalid price"),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  city: z.string().min(2),
  rooms: z.number().int().min(0).max(20).optional(),
  area: z.number().positive().optional(),
});
```

- **Tier gating.** Server-side check on each endpoint (`tier_insufficient` → 403, in the UI: upgrade overlay). Premium-only: export, bulk upload, traffic sources, team > 1 seat.
- **Realtime.** Lead inbox + KPI badge: Supabase Realtime subscription (`pro_leads` channel) or React Query `refetchInterval`.
- **Bulk.** Partial success allowed; error rows: downloadable report; commit is idempotent by the upload session id.
- **Multi-country / currency.** Analytics amounts in the selected currency (display conversion); billing: in the Stripe settlement currency.

---

## 6. Responsive

- **≥1024px (lg).** Left sidebar (`w-60`, sticky) + content; KPI 6-col; charts full-width; tables horizontal.
- **768–1023px (md).** Sidebar: collapsible / icon-only; KPI 3-col; charts full-width; tables horizontal scroll.
- **<768px (sm).** Sidebar: hamburger drawer or bottom tab-bar (Overview / Leads / Charts / More); KPI 2×2; charts full-width: scroll-x; lead detail: full-screen drawer; tables: card-list fallback.

---

## 7. Accessibility

- Sidebar nav: `<nav aria-label="Pro dashboard">`, active item: `aria-current="page"`; unread badge: `aria-label="3 new requests"`.
- Charts (Recharts): have an accessible data table fallback (`<table>` sr-only) + `aria-label` for each chart; tooltips: keyboard-focusable data points.
- KPI trends: not by color alone (↑/↓ icon + "+12%" text), for color blindness.
- Date-range picker, status dropdowns: keyboard-navigable, `aria-expanded`.
- Lead detail drawer / promote modal: focus trap + ESC; realtime toasts: `role="status"`, non-disruptive.
- Locked overlay (Free): `aria-disabled` on the content + a clear upgrade link (not just blur).
- Contrast ≥ 4.5:1; touch target ≥ 44px (mobile nav).

---

## 8. SEO & meta

- **Noindex.** The entire `/pro/dashboard/*` is auth-gated and private → `<meta name="robots" content="noindex, nofollow">`; not in the sitemap.
- `<title>` = "Pro dashboard | {brand}" (for the internal UI only, not SEO).
- Structured data: not applied (private app).
- Auth redirect: not-logged / non-Pro → `/pro` (pricing) or login with `?next`.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `pro_dashboard_view` | Page load | `tier, section` |
| `date_range_changed` | Range picker change | `range` |
| `analytics_property_filtered` | Property selector | `property_id` |
| `analytics_export` | [Export CSV] (Premium) | `range` |
| `lead_status_changed` | Status dropdown | `lead_id, from, to` |
| `lead_replied` | [💬 Reply] | `lead_id` |
| `proposal_responded` | Respond proposal | `request_id` |
| `promotion_created` | [Promote] confirm | `listing_id, placement, days` |
| `bulk_upload_committed` | Bulk publish | `created, skipped` |
| `team_member_invited` | Invite member | `role` |
| `upgrade_cta_clicked` | Free overlay / quota CTA | `source` |
