# Էջ 18 — Pro Dashboard + Analytics (Pro վահանակ) 🔵 Phase 3

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/pro/dashboard` — sub-routes՝ `/pro/dashboard/analytics`, `/leads`, `/promoted`, `/upload`, `/team`, `/billing`։
**Roles.** Agent / Pro (Pro կամ Premium tier)։ Free tier՝ սահմանափակ preview (blurred widgets + upgrade CTA)։ Auth-gated, `noindex`։
**Primary goal.** Գործակալի կառավարման **կենտրոնը**՝ analytics, lead-եր, billing, promoted listings, bulk upload, թիմ։ Pro tier-ի արժեքն այստեղ է «նյութականանում»՝ ինչքան շատ է գործակալը գալիս այստեղ, այնքան քիչ է churn-ը։

---

## 0. Ակնարկ (Overview)

Սա **retention էջն է** — այն տեղն է, որտեղ Pro/Premium գործակալն ամեն օր մտնում է՝ տեսնելու իր lead-երը, հայտարարությունների performance-ը, և կառավարելու բաժանորդագրությունը։ Էջը պետք է՝ (1) մեկ հայացքով ցույց տա ամենակարևորը (KPI overview՝ դիտումներ, leads, conversion), (2) տա խորը analytics (Recharts գրաֆիկներ՝ views/favorites/contact-clicks/leads over time), և (3) կենտրոնացնի բոլոր գործողությունները (lead inbox, promote, bulk upload, team, billing) մեկ sidebar nav-ով։

Էջը **client-heavy** է (interactive charts, realtime leads, filters)՝ shell-ը SSR (auth + tier check + sidebar), data-ն React Query-ով fetch (date-range-aware)։ Lead inbox-ը + KPI-ները live update են (Supabase Realtime / refetch)։ Free tier-ի համար widget-ները locked են՝ upgrade funnel-ի համար։ Charts՝ Recharts; server state՝ React Query (00-SPEC §4)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գործակալ Հովհաննեսը (desktop, daily check).** Հովհաննեսը առավոտյան բացում է dashboard-ը։ Overview-ում տեսնում «↑ 12% դիտումներ vs անցյալ շաբաթ», նոր lead badge «3»։ Անցնում Leads, տեսնում նոր հարցում, սեղմում **[💬 Պատասխանել]**, գրում, status-ը դնում «Contacted»։ → Lead progress թարմացվեց, charts-ը հաշվեց։

**Սցենար Բ — Premium Աննան (bulk upload).** Աննան նոր կառուցապատումից 24 բնակարան ունի։ Bulk Upload բաժնում ներբեռնում է CSV template, լրացնում, upload-ում։ Preview table-ում 22 row կանաչ valid, 2 row կարմիր («Անվավեր գին»)։ Ուղղում է inline, սեղմում **[Հրապարակել 24 հայտարարություն]**։ Progress bar → «24 ստեղծվեց»։

**Սցենար Գ — Free tier Դավիթը (upgrade funnel).** Դավիթը Free է, բացում է `/pro/dashboard`։ Overview-ը locked/blurred է «Upgrade to Pro» overlay-ով։ Analytics-ը հիմնական է միայն։ Promote-ը փորձում է → inline «Pro-ից վեր» CTA → `/pro`։ Սեղմում **[Անցնել Pro]**, checkout, վերադառնում unlock-ված dashboard։

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

- Desktop-ում **left sidebar nav** (`w-60`, sticky)՝ Overview · Analytics · Leads · Promoted · Bulk Upload · Team · Billing։ Active item՝ `bg-primary/10 text-primary`։ Leads-ին՝ unread count badge։
- Mobile-ում sidebar՝ hamburger drawer; կամ bottom tab-bar հիմնական 3-4 բաժնի համար, մնացածը «More»-ում։
- Topbar-ում՝ tier badge + plan + **date-range picker** (7d / 30d / 90d / custom)։ Բոլոր widget-ները հարգում են ընտրած range-ը։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Sidebar | `w-60 bg-white border-r border-gray-200`, item՝ `h-10 px-3 rounded-md text-sm` |
| Sidebar active | `bg-primary/10 text-primary font-medium` |
| Sidebar badge | `bg-red-500 text-white text-xs rounded-full px-1.5` |
| Topbar | `h-14 border-b border-gray-200 flex items-center justify-between px-6` |
| Tier badge | Pro՝ `bg-violet-100 text-violet-700`; Premium՝ `bg-amber-100 text-amber-700` |
| Date-range picker | `h-9 text-sm border border-gray-300 rounded-md` |
| KPI card | `bg-white border border-gray-200 rounded-xl p-4` |
| KPI number | `text-2xl font-bold text-gray-900` |
| KPI trend ↑ | `text-green-600 text-sm`; ↓՝ `text-red-500` |
| Chart container | `bg-white border rounded-xl p-4`, height `h-72` |
| Chart line | `stroke-primary`; area fill՝ `fill-primary/10` |
| Table | row hover՝ `bg-gray-50`, header՝ `text-xs uppercase text-gray-500` |
| Lead status chip | New՝ `bg-blue-100 text-blue-700`; Won՝ `bg-green-100 text-green-700`; Lost՝ `bg-gray-100 text-gray-500` |
| Locked overlay (Free) | `backdrop-blur-sm bg-white/60` + centered «Upgrade» CTA |
| Progress bar | `bg-gray-200 h-2 rounded`, fill՝ `bg-primary` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Overview (գլխավոր)

- **KPI քարտեր.** `grid grid-cols-2 lg:grid-cols-6 gap-3`՝ **Ընդ. դիտումներ** · **Favorites** · **Contact clicks** · **Նոր leads** · **Ակտիվ listings** · **Conversion rate** (views→leads)։ Ամ քարտ՝ մեծ թիվ + ↑/↓ % vs նախորդ period + mini sparkline։
- **Quick links.** «Տեսնել leads» · «Promote listing» (shortcut կոճակներ)։
- **Date range.** Topbar-ի picker-ին հետևում է; փոխելը re-fetch անում է բոլոր KPI-ները։

### 3.2 Analytics (Listing performance charts)

Recharts-ով՝
- **Views over time** — line chart (օր/շաբ), property selector (բոլորը / մեկը)։
- **Favorites over time** — line / area chart։
- **Contact clicks** — bar chart։
- **Leads over time** — line chart + **funnel** (դիտումներ → contacts → leads)։
- **Top performing listings** — աղյուսակ՝ listing · views · favorites · clicks · leads · CTR → row click → `/property/[id]`։
- **Traffic sources** (Premium) — pie chart (search / agent profile / direct / share)։
- **[Export CSV]** (Premium) → `GET /api/pro/analytics/export`։
- **Filters.** Date range · property · deal type։
- **Empty state.** «Դեռ բավարար տվյալ չկա — հայտարարությունները սկսում են հավաքել վիճակագրություն հրապարակումից հետո»։

### 3.3 Lead inbox

Կենտրոնական տեղ՝ բոլոր lead-երը (property contact-ներ, agent request-ներ, compare-proposal-ներ)։
- **List / table.** Անուն · contact · source (property / request) · message preview · status · ամսաթիվ։
- **Status.** New · Contacted · In progress · Won · Lost (dropdown-ով փոխվող)։
- **Row click** → lead detail panel (drawer)՝ ամբողջ հաղորդագրություն · contact info · related property · notes։
- **Actions.** **[💬 Պատասխանել]** (→ messages thread) · **[📞 Զանգ]** (reveal) · **[🏷 Status]** · **[📝 Note]** · **[Respond proposal]** (compare-flow request-ի դեպքում → ուղարկում proposal)։
- **Filters.** Status · source · date · unread։
- **Notification.** Sidebar-ի «Leads»-ին unread count badge; նոր lead-ի դեպքում realtime update + toast։

### 3.4 Subscription / Billing management

- **Current plan card.** Tier · գին · billing cycle · հաջորդ գանձման ամսաթիվ · payment method («•••• 4242»)։
- **Actions.** **[Upgrade]** → `/pro` checkout · **[Downgrade]** / **[Cancel]** → confirm modal → Stripe portal · **[Update payment method]** → Stripe Customer Portal (`POST /api/billing/portal`)։
- **Usage.** Progress bar-եր՝ «Հայտարարություններ՝ 18/25» · «Featured՝ 1/2 այս ամիս» · «Team՝ 4/10»։
- **Invoices.** Աղյուսակ՝ ամսաթիվ · գումար · status (Paid) · **[⬇ PDF]** (Stripe invoice URL)։
- **Cancel.** «Active մինչ {date}», ապա auto-downgrade Free; ավելորդ listings → archived։

### 3.5 Promoted listings manager

- **Active promotions.** Աղյուսակ՝ listing · type (Featured / Top) · սկիզբ–ավարտ · օրեր մնացած · performance (extra views) · **[⏹ Կանգնեցնել]**։
- **[+ Promote listing]** → modal՝ ընտրել listing → ընտրել placement (Featured home / Search top / Category top) → տևողություն → cost (tier-ից quota կամ վճար) → **[Հաստատել]**։
- **Quota indicator.** Tier-ից՝ «2/ամիս Pro»; սպառվելուց հետո՝ pay-per-promote կամ upgrade CTA։

### 3.6 Bulk listing upload (CSV / multi)

Premium գործիք՝ շատ գույք միանգամից։
- **[⬇ Ներբեռնել CSV template]** — columns բացատրությամբ (title, price, currency, city, rooms, area, ...)։
- **[⬆ Upload CSV]** → parse → **preview table** (validation՝ կանաչ valid / կարմիր error rows, inline error message ամ սխալ դաշտի վրա)։
- **Media.** Multi-image upload կամ URL column; հասցեից geocode (Mapbox)։
- **[Ուղղել & կրկնել]** errored rows-ի համար (inline edit)։
- **[Հրապարակել N հայտարարություն]** → bulk create (draft կամ active) → progress bar → ամփոփ «24 ստեղծվեց, 2 բաց թողնվեց»։

### 3.7 Team member management

- **Members table.** Avatar · անուն · email · role (Owner / Manager / Agent) · listings count · status։
- **[+ Հրավիրել անդամ]** → email + role → `POST /api/pro/team/invite` (invite email → join)։
- **Per-member.** Role փոխել (dropdown) · **[Հեռացնել]** (confirm) · seat usage «4/10 Premium»։
- **Permissions.** Owner = billing + team; Manager = listings + leads; Agent = միայն իր listings։
- **Listing assignment.** Ով է responsible տվյալ հայտարարության համար։

### 3.8 Footer / help

- Help center link · «Կապ priority support-ի հետ» (Pro = email, Premium = email + հեռախոս)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton՝ sidebar + KPI card placeholder + chart shimmer |
| **Loaded (Pro)** | Լրիվ dashboard, Premium-only widget-ները՝ «Premium» tag-ով locked |
| **Loaded (Premium)** | Բոլոր widget-ները unlocked + export + traffic sources |
| **Free tier** | Blurred widget-ներ + «Upgrade to Pro» overlay; analytics՝ հիմնական միայն |
| **Empty (new agent)** | «Դեռ տվյալ չկա» empty state + «Տեղադրիր առաջին հայտարարությունը» |
| **New lead (realtime)** | Sidebar badge ++ + toast «Նոր հարցում {name}-ից» |
| **Bulk upload errors** | Error rows կարմիր + download-ելի error report + partial publish |
| **Quota reached** | Inline «Upgrade» CTA (ոչ hard error) |
| **Cancel mid-cycle** | «Active մինչ {date}», ապա downgrade banner |
| **Error (API fail)** | Widget-ի մակարդակում «Չհաջողվեց բեռնել» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

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
 └─ <UpgradeOverlay />  (պայմանով՝ tier === "free")
```

### Data fields used (տես 00-SPEC §7)

`overview: { views, favorites, contactClicks, newLeads, activeListings, conversionRate, trends{...}, sparklines{...} }`
`lead: { id, name, contact{phone,email}, source(property/request/proposal), property_id, message, status, note, created_at }`
`promotion: { id, listing_id, type(featured/top), placement, starts_at, ends_at, extra_views, status }`
`subscription: { tier, cycle, price, current_period_end, payment_method, usage{listings, featured, seats} }`
`team_member: { id, name, email, role(owner/manager/agent), listings_count, status }`

### API contract-ներ

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
// 200      { "valid": [/* rowIndex */], "errors": [ { "row": 3, "field": "price", "msg": "Անվավեր գին" } ] }
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
  email: z.string().email("Անվավեր email"),
  role: z.enum(["manager", "agent"]),
});

const bulkRowSchema = z.object({
  title: z.string().min(5, "Վերնագիրը կարճ է").max(120),
  price: z.number().positive("Անվավեր գին"),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  city: z.string().min(2),
  rooms: z.number().int().min(0).max(20).optional(),
  area: z.number().positive().optional(),
});
```

- **Tier gating.** Server-side check ամ endpoint-ին (`tier_insufficient` → 403, UI-ում՝ upgrade overlay)։ Premium-only՝ export, bulk upload, traffic sources, team > 1 seat։
- **Realtime.** Lead inbox + KPI badge՝ Supabase Realtime subscription (`pro_leads` channel) կամ React Query `refetchInterval`։
- **Bulk.** Partial success թույլատրված; error rows՝ download-ելի report; commit-ը idempotent ըստ upload session id-ի։
- **Multi-country / currency.** Analytics գումարները ընտրած currency-ով (display conversion); billing՝ Stripe settlement currency-ով։

---

## 6. Responsive

- **≥1024px (lg).** Left sidebar (`w-60`, sticky) + content; KPI 6-col; charts full-width; tables horizontal։
- **768–1023px (md).** Sidebar՝ collapsible / icon-only; KPI 3-col; charts full-width; tables horizontal scroll։
- **<768px (sm).** Sidebar՝ hamburger drawer կամ bottom tab-bar (Overview / Leads / Charts / More); KPI 2×2; charts full-width՝ scroll-x; lead detail՝ full-screen drawer; tables՝ card-list fallback։

---

## 7. Accessibility

- Sidebar nav՝ `<nav aria-label="Pro վահանակ">`, active item՝ `aria-current="page"`; unread badge՝ `aria-label="3 նոր հարցում"`։
- Charts (Recharts)՝ ունեն accessible data table fallback (`<table>` sr-only) + `aria-label` ամ գրաֆիկի համար; tooltip-ները՝ keyboard-focusable data point-երով։
- KPI trend-ները՝ ոչ միայն գույնով (↑/↓ icon + «+12%» text), գունային կուրության համար։
- Date-range picker, status dropdown-ները՝ keyboard-navigable, `aria-expanded`։
- Lead detail drawer / promote modal՝ focus trap + ESC; realtime toast-ները՝ `role="status"`, ոչ-disruptive։
- Locked overlay (Free)՝ `aria-disabled` content-ի վրա + հստակ upgrade link (ոչ միայն blur)։
- Contrast ≥ 4.5:1; touch target ≥ 44px (mobile nav)։

---

## 8. SEO & meta

- **Noindex.** Ամբողջ `/pro/dashboard/*`-ը auth-gated private է → `<meta name="robots" content="noindex, nofollow">`; sitemap-ում չկա։
- `<title>` = «Pro վահանակ | {brand}» (միայն ներքին UI-ի համար, ոչ SEO)։
- Structured data՝ չի կիրառվում (private app)։
- Auth redirect՝ չ-logged / non-Pro → `/pro` (pricing) կամ login `?next`-ով։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `pro_dashboard_view` | Էջի load | `tier, section` |
| `date_range_changed` | Range picker փոփ. | `range` |
| `analytics_property_filtered` | Property selector | `property_id` |
| `analytics_export` | [Export CSV] (Premium) | `range` |
| `lead_status_changed` | Status dropdown | `lead_id, from, to` |
| `lead_replied` | [💬 Պատասխանել] | `lead_id` |
| `proposal_responded` | Respond proposal | `request_id` |
| `promotion_created` | [Promote] հաստատում | `listing_id, placement, days` |
| `bulk_upload_committed` | Bulk publish | `created, skipped` |
| `team_member_invited` | Հրավիրել անդամ | `role` |
| `upgrade_cta_clicked` | Free overlay / quota CTA | `source` |
