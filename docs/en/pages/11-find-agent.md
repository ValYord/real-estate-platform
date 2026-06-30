# Page 11 — Find an Agent 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/agents` — filters via query string, e.g. `/en/agents?city=yerevan&lang=ru&specialty=rent&sort=rating`; SEO landings: `/agents/yerevan`, `/agents/rent`.
**Roles.** Everyone (Guest, User, Agent, Admin) can view; request/compare flow: login encouraged, Guest allowed with captcha.
**Primary goal (conversion).** Help the visitor find the right agent and **enter the lead funnel** — open a profile, click "Contact", or send a "Compare offers" request to several agents.

---

## 0. Overview

This is the **entry point** of the lead-generation funnel. Someone who doesn't know exactly whom to approach comes here to filter by city, language, specialty, and rating, and to find a trusted professional. The page has two conversion paths: (1) **direct** — from an agent card to a profile or quick contact, and (2) **broadcast** — the "Compare offers" flow, where a single request goes to several matching agents, and the user then compares their responses side by side. The second path is the platform's main lead-gen mechanic.

The page renders via **SSR** (Server Component) for SEO and filter landing pages; the filters bar, results grid, and compare/request modals are client components (URL-synced filters, React Query).

The page has **two tabs**.
- **👤 Agents** — a list of individual agents (default).
- **🏢 Teams / Companies** — agency cards → `/agency/[slug]`.

---

## 1. User scenarios

**Scenario A — Buyer Narek (desktop).** Narek wants to buy an apartment in Arabkir and prefers a Russian-speaking agent. In the filters he selects "Yerevan" + "🇷🇺 ru" + "Apartments" + "⭐ 4.5+". The URL updates, the list re-fetches. He sees 8 agents, sorts by "Highest rating", and clicks the first one's **[Profile]**.

**Scenario B — Seller Gayane (mobile).** Gayane doesn't know whom to approach. From the hero's **[Compare offers]** button she opens a multi-step form: "Sale · Apartment · Yerevan · 40-60M ֏ · 2 bdrm" + contact. She submits. → 3 agents receive the request and respond; in `/dashboard/requests` Gayane sees 3 proposals side by side and picks one.

**Scenario C — Guest Artur.** Artur isn't registered but wants to send a request. He fills in the "Request an agent" form; on submit a captcha appears + the nudge "Sign up to track responses." After a successful submit: "Sent — check your email."

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + grid

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ HERO (h-44, bg-gray-50)                                     │
│  H1 "Find your agent" · search bar · [Search]              │
│  CTA banner: "Get 3 offers" [Compare offers]               │
├────────────────────────────────────────────────────────────┤
│ Tabs: [👤 Agents] [🏢 Teams/Companies]                     │
├──────────────────┬─────────────────────────────────────────┤
│ ◄ FILTERS (w-72) │ ► RESULTS                                │
│ City             │  sort dropdown · "37 agents"            │
│ Specialty        │  ┌────────┐ ┌────────┐                  │
│ Language ☑☑☑     │  │ agent  │ │ agent  │  (grid 2-3 col)  │
│ Rating ⭐4+/4.5+ │  │ card   │ │ card   │                  │
│ Deal [Sale][Rent]│  └────────┘ └────────┘                  │
│ ☑ Verified only  │  ┌────────┐ ┌────────┐                  │
│ ☑ Pro only       │  │ card   │ │ card   │                  │
│ [Clear]          │  └────────┘ └────────┘                  │
│                  │  Pagination / infinite scroll            │
├──────────────────┴─────────────────────────────────────────┤
│ "How it works" (3 steps) · "Are you an agent?" CTA          │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — single column

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ HERO: H1 · search        │
│ [Compare offers]         │
├──────────────────────────┤
│ Tabs [👤][🏢]            │
│ [⚙ Filters (3)] [Sort ▾] │  ← filters in a bottom-sheet
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ agent card (1-col)   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ agent card           │ │
│ └──────────────────────┘ │
│ ...load more             │
│ "How it works"          │
│ FOOTER                   │
└──────────────────────────┘
```

- On mobile the filters are a **bottom-sheet** (`[⚙ Filters]` button, with an active-count badge). After Apply it closes and re-fetches.
- Agent cards are 1-col on mobile, 2-col on md, 3-col on lg.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Hero | `bg-gray-50 py-12`, H1: `text-3xl font-bold text-gray-900` |
| Search bar | `h-12 rounded-lg border border-gray-300 px-4` + `[Search]` primary |
| Compare CTA banner | `bg-primary/5 border border-primary/20 rounded-xl p-4`, CTA: primary |
| Tab (active) | `border-b-2 border-primary text-primary font-medium` |
| Filter label | `text-sm font-medium text-gray-700` |
| Filter checkbox | shadcn `Checkbox`, accent `text-primary` |
| Sort dropdown | `h-9 text-sm border border-gray-300 rounded-md` |
| Agent card | `bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition` |
| Card avatar | `w-16 h-16 rounded-full` |
| Verified badge | `bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded` + ✓ |
| Tier badge | Pro: `bg-violet-100 text-violet-700`; Premium: `bg-amber-100 text-amber-700` |
| Language chip | `bg-gray-50 border border-gray-200 text-xs px-2 py-0.5 rounded` |
| Quick contact CTA | `border border-primary text-primary h-9 rounded-md text-sm` |
| Empty state | `text-center py-16 text-gray-500` + illustration |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-40` |

---

## 3. Section-by-section

### 3.1 Hero / heading

- **H1.** "Find your real estate agent" (`text-3xl font-bold`).
- **Subheading.** "Verified professionals in Armenia and beyond" (`text-gray-500`).
- **Search bar.** City/area input (autocomplete, `GET /api/geo/cities`) + **[Search]**. Submit → `?city=` filter.
- **Compare CTA banner.** "Get offers from 3 agents with one request" + **[Compare offers]** (opens the compare flow modal).

### 3.2 Tabs

- **Appearance.** `[👤 Agents] [🏢 Teams / Companies]`, active: `border-b-2 border-primary`.
- **Agents tab** (default) → grid of individual agent cards.
- **Teams/Companies tab** → agency cards: logo, name, agent count, aggregate rating, service cities → `/agency/[slug]`. The filters adapt (agency-level fields).

### 3.3 Filters bar

Every filter updates the URL (`router.replace`, shallow) + re-fetch (React Query, `keepPreviousData`).

- **City / area** — dropdown / autocomplete (multi-country aware: country → city cascade).
- **Specialty** — checkbox group: Apartments · Houses · Commercial · Land · New construction · Rentals (multi-select).
- **Language** — 🇦🇲 hy · 🇷🇺 ru · 🇬🇧 en (multi-select chip toggle).
- **Rating** — radio: ⭐ 4+ · ⭐ 4.5+ (min rating).
- **Deal type** — `[For sale] [For rent]` toggle (what the agent works on).
- **Verified only** — toggle.
- **Pro / Premium only** — toggle (Phase 2 monetization, alongside the ranking boost).
- **[Clear filters]** — reset URL → `/agents` (appears only when an active filter exists).
- **Active count.** A badge on the mobile `[⚙ Filters]` button: the number of active filters.

### 3.4 Sort

- **Dropdown.** Highest rating (default) · Most reviews · Most active listings · Fast responder · Newest member. → `?sort=` URL param.

### 3.5 Results / Agent cards grid

- **Header.** Sort dropdown + count "37 agents" (`text-sm text-gray-500`).
- **Agent card** (`bg-white border rounded-xl p-4`):
  - Avatar (`w-16 h-16`) + name + agency name
  - ✓ Verified badge · tier badge
  - ⭐ rating · "(N reviews)"
  - Language chips · 📍 city
  - "N active listings"
  - **[Profile]** primary → `/agent/[slug]` · **[💬 Contact]** outline → quick contact modal (message/request)
  - Whole card click → agent profile
- **Pagination.** Infinite scroll (IntersectionObserver) or "Show more" fallback.
- **Empty state.** "No agents found for these filters" + **[Clear filters]** + **[Send a general request]** (to the broadcast queue).

### 3.6 "Compare offers" flow — **the lead-gen core**

One request → several agents respond → side-by-side comparison.

- **CTA.** From the hero banner or the middle of the page. Click → multi-step form (modal on desktop, full-screen on mobile):
  1. **What you want** — buy / sell / rent (radio cards)
  2. **Property type + city** — property type + location autocomplete
  3. **Budget** — price range slider + currency (default from the header)
  4. **Details** — rooms, timeline, free-form notes (optional)
  5. **Contact** — name, phone, email (login → prefill, autofill)
  - Progress indicator at the top ("Step 3/5"). **[Back]** / **[Continue]**; at the end **[Send request]** → `POST /api/agent-requests` (broadcast to matching agents, max 5).
- **Result.** The request goes to matching agents (city + specialty + deal match). They **respond** with a proposal (message + preliminary estimate) from their Pro Dashboard lead inbox. In `/dashboard/requests` the user sees a **comparison table**: agent · rating · response time · proposal text → picks whom to continue with → a conversation thread opens.
- **Success microcopy.** "Your request has been sent to {N} agents — you'll see the responses in the 'My requests' section."

### 3.7 "Request an agent" form (Direct request)

- A lighter version of Compare: a single-step modal.
- **[Send a request]** → form (the same fields, simplified, on one page): what I'm looking for · name · phone · email · message.
- **[Send]** → `POST /api/agent-requests` (`mode: "single"` or auto-match): to 1 agent or to matching agents.

### 3.8 "How it works"

A 3-step explanation (icon + title + short text):
1. **You send a request** — or choose an agent directly
2. **Agents get in touch** — you receive offers
3. **You work together** — the deal happens off-platform

### 3.9 CTA for agents

- **Block.** "Are you an agent? Join and get leads" → **[See the plans]** → `/pro` (pricing, page 17).

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton: filter outline + 6-8 agent card placeholders (shimmer) |
| **Loaded (results)** | Agent card grid + sort + count |
| **Empty (filters)** | "No agents found for these filters" + Clear / General request |
| **Empty (region)** | "No agents in your area yet" + notify-when-available |
| **Teams tab** | Agency card grid |
| **Compare modal open** | Multi-step form, progress indicator |
| **Request submitted** | Success screen "Sent to {N} agents" |
| **Guest submit** | Captcha + "Sign up to track responses" |
| **Duplicate request** | "You've already sent this request" (rate limit) |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<FindAgentPage> (Server Component, SSR)
 ├─ <AgentSearchHero onSearch />
 │   └─ <CompareCtaBanner onOpen />
 ├─ <AgentTabs active="agents" />
 ├─ <AgentFilters value={Filters} onChange />     (client, URL-synced)
 │   └─ <FilterSheet />                            (mobile bottom-sheet)
 ├─ <AgentSortDropdown value onChange />           (client)
 ├─ <AgentResultsGrid filters sort />              (client, React Query, infinite)
 │   └─ <AgentCard agent={AgentCardData} />
 ├─ <CompareRequestModal />                        (client, lazy, multi-step)
 ├─ <RequestAgentModal />                          (client, lazy)
 ├─ <HowItWorks />
 └─ <AgentSelfCta />
```

### Data fields used (Agent / Agency / Request — see 00-SPEC §7)

`agentCard: { id, slug, name, avatar, agency_name, verified, tier, rating, reviews_count, languages[], scope[], specialties[], listings_active_count, avg_response_time }`
`agency: { id, slug, name, logo, agents_count, avg_rating, cities[] }`
`agent_request: { id, requester_id, deal_type, property_type, city, budget_min, budget_max, currency, rooms, note, contact{name,phone,email}, broadcast_to[], status, created_at }`

### API contracts

**`GET /api/agents?city=&specialty=&lang=&rating=&deal=&verified=&tier=&sort=&page=`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 12, "slug": "anna-petrosyan-yerevan",
      "name": "Anna Petrosyan", "avatar": "...",
      "agencyName": "X Realty", "verified": true, "tier": "pro",
      "rating": 4.8, "reviewsCount": 37,
      "languages": ["hy","ru","en"], "scope": ["Yerevan"],
      "specialties": ["apartments","rent"],
      "listingsActive": 24, "avgResponseHours": 2
    }
  ],
  "total": 37, "page": 1, "pageSize": 12
}
```

**`GET /api/agencies?city=&sort=&page=`** → `200 { "items": Agency[], "total": ... }`

**`POST /api/agent-requests`** (compare / single)
```jsonc
// request
{ "mode": "broadcast",
  "dealType": "sell", "propertyType": "apartment", "city": "Yerevan",
  "budgetMin": 40000000, "budgetMax": 60000000, "currency": "AMD",
  "rooms": 2, "note": "Urgent sale",
  "contact": { "name": "Gayane", "phone": "+374...", "email": "..." } }
// 201  { "requestId": 7710, "broadcastCount": 3 }
// 401  { "error": "auth_required" }    → guest captcha / login nudge
// 429  { "error": "duplicate_or_rate_limited" }
```

**`GET /api/agent-requests/[id]/proposals`** (comparison view)
```jsonc
// 200
{ "items": [
    { "agentId": 12, "agentName": "Anna", "rating": 4.8,
      "respondedAt": "2026-06-23T10:12:00Z",
      "proposal": "I can sell it in 3 weeks, I estimate ~55M ֏" }
  ] }
```

**`GET /api/geo/cities?country=AM&q=yer`** → `200 { "items": [{ "id", "name" }] }`

### Validation (zod)

```ts
const agentRequestSchema = z.object({
  mode: z.enum(["single", "broadcast"]),
  dealType: z.enum(["buy", "sell", "rent"]),
  propertyType: z.string().min(1, "Choose a property type"),
  city: z.string().min(2, "Choose a city"),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  rooms: z.number().int().min(0).max(20).optional(),
  note: z.string().max(1000).optional(),
  contact: z.object({
    name: z.string().min(2, "Name is required").max(50),
    phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
    email: z.string().email("Invalid email").optional(),
  }),
  website: z.string().max(0).optional(), // honeypot
}).refine(
  (d) => !d.budgetMax || !d.budgetMin || d.budgetMax >= d.budgetMin,
  { message: "Maximum must be greater than minimum", path: ["budgetMax"] }
);
```

- Guest requests are allowed, but with captcha + email/phone verify nudge; tracking: after login it's linked to the account.
- Privacy: the user's contact is revealed to the agent **only** after a request is sent.
- Rate-limit: the same request from the same user/IP in a short time → 429.

---

## 6. Responsive

- **≥1024px (lg).** Sidebar filters (`w-72`) + results grid 3-col; compare modal: centered dialog.
- **768–1023px (md).** Filters sidebar collapses; results grid 2-col; filters: collapsible top-bar or sheet.
- **<768px (sm).** Filters: bottom-sheet (`[⚙ Filters]` with count badge); results 1-col; compare/request modal: full-screen; sort: dropdown in the header.

---

## 7. Accessibility

- The filter checkbox/radio groups: `fieldset` + `legend` (e.g. "Language", "Specialty").
- The agent card is fully clickable, but the inner **[Profile]** / **[💬 Contact]** buttons have their own `aria-label` so they're distinguishable from the card-link via keyboard.
- The multi-step compare form: `aria-current="step"` on the current step; errors: `aria-describedby` linked to the input.
- The modals: focus trap + ESC; the bottom-sheet: `role="dialog"` + scrim click to close.
- Contrast ≥ 4.5:1; touch target ≥ 44px.
- Empty/loading: `role="status"`; error: `role="alert"`.

---

## 8. SEO & meta

- `<title>` = "Real estate agents in Yerevan — Find and compare | {brand}".
- `<meta name="description">` = "Find a verified agent by city, language, and specialty. {N}+ professionals".
- Indexable city/specialty landings: `/agents/yerevan`, `/agents/rent`, `/agents/yerevan/rent` (server-rendered, unique title/H1).
- Structured data (JSON-LD): `ItemList` of `RealEstateAgent` + `BreadcrumbList`.
- `hreflang` (hy/ru/en), `canonical` (to the filter-less base URL, so duplicates aren't indexed). Filter query strings: `noindex` (except for landing slugs).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `agents_search` | Filter / search apply | `filters` |
| `agent_card_clicked` | Agent card → profile | `agent_id, position` |
| `agent_quick_contact` | [💬 Contact] from card | `agent_id` |
| `compare_flow_started` | Compare CTA open | — |
| `compare_step_completed` | Multi-step step completed | `step` |
| `agent_request_sent` | Request submit | `mode, deal_type, broadcast_count` |
| `request_guest_captcha` | Guest captcha shown | — |
| `proposals_viewed` | Comparison view open | `request_id, proposal_count` |
| `proposal_selected` | Agent selected | `request_id, agent_id` |
| `agent_self_cta_clicked` | "Are you an agent?" → `/pro` | — |
