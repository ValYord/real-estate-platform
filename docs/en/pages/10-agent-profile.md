# Page 10 — Agent / Agency Profile 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/agent/[slug]` — for example, `/en/agent/anna-petrosyan-yerevan`; for an agency: `/en/agency/[slug]`
**Roles.** Everyone (Guest, User, Agent, Admin) can view; writing a review / making contact requires login (Guest → login modal with `?next`); edit controls: only the profile owner (`agent.user_id == current_user.id`).
**Primary goal (conversion).** Get the visitor to trust the agent and **make contact** — write a message, reveal the phone number, or send a request. Every element of the page builds trust and drives toward this single action.

---

## 0. Overview

This is the agent's **public storefront** and the central page of the lead-generation funnel. From the "Find an Agent" page (11), the property detail contact card (03), and search results, people arrive here to decide whether to trust this professional. Therefore the page must: (1) instantly show the trust signals (avatar, ✓ Verified, ⭐ rating, years of experience), (2) prove expertise (active listings grid + statistics + reviews), and (3) keep the **"Contact"** action within reach at all times (sticky contact card on desktop, fixed bottom bar on mobile).

The page has **two modes**.
- **Visitor view** — someone else's profile (default). The contact card sits in the right column.
- **Owner view** — the visitor's own profile (`agent.user_id == current_user.id`). Instead of the contact card: a management bar (edit / preview / Pro Dashboard / promote).

The page renders via **SSR** (Server Component) for SEO and fast first paint; the interactive sections (listings grid filter, review modal, contact form, share) are client components.

---

## 1. User scenarios

**Scenario A — Buyer Suren (mobile).** Suren tapped the agent's name on a property detail page. The profile opens on his phone. He sees the avatar, "✓ Verified", ⭐ 4.8 (37), and "6 years in business." Scrolling, he sees 24 active listings and reads 2-3 reviews. From the bottom fixed bar he taps **"📞 Call"**, and the number opens in the dialer. → A lead was recorded (`agent_phone_revealed` event).

**Scenario B — Seller Lilit (desktop).** Lilit wants to sell her apartment and is looking for an agent. She reads the bio and sees the "Apartments" and "New construction" specialty chips. From the right-hand contact card she clicks **[📋 Send a request]**, and in the modal notes: "Sale · Apartment · Yerevan · 2 bdrm." → An `agent_leads` record was created, an email went to the agent, and Lilit saw the toast "Your request has been sent."

**Scenario C — Agent Anna (owner view).** Anna opens her own profile to check how it looks. Instead of the contact card she sees a management bar: **[✏️ Edit]**, **[👁 Preview]**, **[📊 Pro Dashboard]**. She notices a new review, clicks **[Reply]**, and writes a thank-you reply that appears beneath the review.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — two columns

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10, text-sm, text-gray-500)                  │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN COLUMN (≈64%, max-w-760)  │ ► SIDEBAR (≈36%, w-360)  │
│                                   │                          │
│ ┌── Profile header (card) ──┐    │ ┌── Contact card ──┐     │
│ │ avatar 96px · name · ✓    │    │ │ (sticky top-20)   │     │
│ │ agency · ⭐4.8 (37) · 6 y. │    │ │ avatar + name     │     │
│ │ 🇦🇲🇷🇺🇬🇧 · Yerevan·Kotayk │    │ │ [💬 Message]      │     │
│ │ [Pro] [Top Agent] badges  │    │ │ [📞 Phone]        │     │
│ └───────────────────────────┘    │ │ [📋 Request]      │     │
│ ── About (bio) ──                │ │ [⤴ Share]         │     │
│ ── Stats row (4 KPI cards) ──    │ │ anti-spam note    │     │
│ ── Active listings ──            │ └──────────────────┘     │
│   [All][For sale][For rent]+sort │                          │
│   PropertyCard grid (2-col)      │  (card sticky until       │
│ ── Reviews ──                    │   reaching reviews)       │
│   ⭐4.8 · breakdown · [Write]    │                          │
│   review list                    │                          │
├──────────────────────────────────┴─────────────────────────┤
│ Other agents (carousel, full-width)                         │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — single column

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ Profile header           │
│ avatar 80px · name · ✓   │
│ ⭐4.8 (37) · 6 years     │
│ 🇦🇲🇷🇺🇬🇧 · badges       │
├──────────────────────────┤
│ About (bio)              │
│ Stats (2×2 grid)         │
│ Listings                 │
│  tabs + sort             │
│  PropertyCard (1-col)    │
│ Reviews                  │
│ Other agents (scroll)    │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BOTTOM BAR (h-18)  │
│ [💬 Message] [📞 Call] ⤴ │
└──────────────────────────┘
```

- The profile header is a full-width card (`bg-white border border-gray-200 rounded-xl p-6`).
- The contact card does **not** stick on mobile; instead there is a **fixed bottom bar** (`h-18 / 72px`, `bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`): `[💬 Message] [📞 Call]` + ⤴.
- All sections stack at full width (`space-y-6`).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Avatar (header) | `w-24 h-24 rounded-full ring-2 ring-white shadow-md` (mobile: `w-20 h-20`) |
| Name (H1) | `text-2xl font-semibold text-gray-900 leading-tight` |
| Agency name | `text-base text-gray-500 hover:text-primary` |
| Rating | `text-amber-500` stars + `text-gray-900 font-medium` number + `text-gray-400` "(37)" |
| Verified badge | `bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md` + ✓ |
| Tier badge (Pro) | `bg-violet-100 text-violet-700`; Premium: `bg-amber-100 text-amber-700` |
| Top Agent badge | `bg-green-100 text-green-700` |
| Specialty chip | `bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full` |
| Language chip | `bg-gray-50 border border-gray-200 text-sm px-2 py-0.5 rounded` |
| KPI card | `bg-gray-50 rounded-lg p-4 text-center`; number: `text-2xl font-bold`, label: `text-sm text-gray-500` |
| Section heading (H2) | `text-xl font-semibold`, above it `border-t border-gray-200 pt-6 mt-6` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full hover:bg-primary/5` |
| Contact card | `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20` |
| Rating bar (breakdown) | `bg-gray-200 h-2 rounded`, fill: `bg-amber-400` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Breadcrumbs

- **Appearance.** `text-sm text-gray-500`, separator `›` (`text-gray-300`), hover: `text-primary underline`.
- **Content.** `Home › Find an Agent › Yerevan › Anna Petrosyan`
- **Behavior.** Each segment is a link (`/agents`, `/agents?city=yerevan`). The last segment (current agent): `text-gray-700`, non-clickable.
- **Mobile.** Only a "‹ Agents" link.
- **Tech.** `BreadcrumbList` structured data (schema.org).

### 3.2 Profile header

- **Avatar.** `w-24 h-24 rounded-full`. If there is no image: placeholder with initials (`bg-primary/10 text-primary text-2xl font-semibold`, e.g. "AP").
- **Name (H1).** `text-2xl font-semibold`. Beside it: **✓ Verified badge** (hover tooltip: "Identity and license verified").
- **Agency.** Below the name: agency name → link `/agency/[slug]` (if present).
- **Rating.** ⭐ icons (5 stars, filled by rating) + numeric "4.8" + "(37 reviews)" → anchor smooth-scroll to the reviews section.
- **Years active.** "6 years in business" (`now() - agent.created_at`).
- **Scope.** Service areas: "Yerevan · Kotayk" (📍 icon).
- **Languages.** Flag/chips: 🇦🇲 🇷🇺 🇬🇧 (`agent.languages[]`).
- **Badges row.** Tier badge (Pro / Premium) · "Top Agent" (if ranking ≤ top 5% in the city) · "Fast responder" (if `avg_response_time < 2h`).
- **State.** Unverified agent: no Verified badge; instead a gray tag "Verification in progress" (only above the Pro tier).

### 3.3 Bio (About)

- **Appearance.** `text-gray-700 leading-relaxed whitespace-pre-line`, in the selected language (`bio[locale]`). Max 4 lines collapsed → "Read more ▾" / "Hide ▴" toggle.
- **Specialty chips.** Below the bio: `flex flex-wrap gap-2`: "Apartments" · "New construction" · "Commercial" · "Rentals".
- **Fallback.** If the bio is empty: the whole section is skipped (visitor view); in owner view: an inline prompt "➕ Add your about text".

### 3.4 Stats row (numeric metrics)

- **Appearance.** 4-5 KPI cards: `grid grid-cols-4 md:grid-cols-5 gap-3` (mobile: `grid-cols-2`). Each card: a large number (`text-2xl font-bold`) + label (`text-sm text-gray-500`).
- **Metrics.**
  - **Active listings** — `listings_active_count` (e.g. 24)
  - **Sold / closed** — "112" (if we track deal-close; otherwise hidden)
  - **Average response** — "~2 h"
  - **Languages** — "3"
  - **Member since** — "2020"
- Null metrics are skipped (not displayed as 0).

### 3.5 Active listings grid

- **Filter mini-bar.** At the top: tabs `[All] [For sale] [For rent]` (active: `border-b-2 border-primary text-primary`) + sort dropdown (Newest / Price ↑ / Price ↓). Changing tab/sort re-fetches (client, React Query) via URL hash (`#listings?deal=sale`).
- **Grid.** The same **PropertyCard** component as in search/03: image (slider), price, ♡, rooms/area/floor, address, badge (NEW/REDUCED/FEATURED). `grid grid-cols-1 md:grid-cols-2 gap-4`.
- **Pagination.** "See all 24 listings" → `/search?agent=[id]` (full search experience with filters).
- **Card click** → `/property/[id]/[slug]`.
- **Empty state.** "No active listings at the moment" with an illustration; the contact card remains available.

### 3.6 Reviews section

- **Summary header.** ⭐ 4.8 (large: `text-3xl font-bold`) · "37 reviews" · rating breakdown bars (5★→1★, each row: star + horizontal bar + count).
- **[✍️ Write a review] CTA.** For a logged-in user (non-owner). Click → review modal:
  - **Star rating** (1-5 selectable, hover preview, required)
  - **Textarea** (min 10 / max 1000 characters, counter)
  - **[Publish]** → `POST /api/agents/[id]/reviews`
  - **Guard.** 1 review/author/agent (if one already exists: "Edit my review"); Guest → login modal; the owner does not see the CTA on their own page.
- **Review list.** Each item: avatar, name, ⭐ rating, date (`text-gray-400`), text.
  - **Agent reply** (optional): indented block `bg-gray-50 border-l-2 border-primary pl-3`, with an "Agent reply" label.
  - **⚑ Report** on a review (spam/abuse) → report modal → admin moderation queue (`POST /api/reports`).
- **Sort.** Newest / Highest rating / Lowest rating.
- **Pagination.** "Show more" (load more, page-by-page).
- **Empty state.** "No reviews yet — be the first" + write-review CTA.

### 3.7 Contact card (sidebar) — **the conversion core**

- **Appearance.** `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20`.
- **Header.** Avatar (`w-12 h-12 rounded-full`) + name + ✓ Verified + ⭐ 4.8 (37).
- **CTA buttons.**
  - **[💬 Send a message]** primary `h-12`. Guest → login modal (`?next`). Logged-in → opens a thread with the agent (independent of any property), prefilled "Hi, I'm interested in your services." → `POST /api/conversations` (with `agentId` payload).
  - **[📞 Show phone]** secondary. Click → reveal `+374 XX XXX XXX` + `tel:` link + `agent_phone_revealed` event (lead++). Anonymous visitor: captcha once per session.
  - **[📋 Send a request]** outline. Modal form: what I'm looking for (buy/sell/rent radio · property type · city · price range + currency · rooms), name, phone, message → **[Send]** → `POST /api/agent-leads`. Success: green "Your request has been sent — the agent will get in touch."
  - **[⤴ Share]** ghost. Share modal: link copy (toast "Link copied"), Facebook, Telegram, WhatsApp, Email.
- **Anti-spam.** Rate-limit (5 messages/hour/user), captcha for Guest, honeypot hidden field, server-side dedupe.

### 3.8 Owner manage bar (owner view)

- Instead of the contact card (`agent.user_id == current_user`): `shadow-sm border rounded-xl p-5`.
- **Buttons.** **[✏️ Edit profile]** (→ `/settings/agent` — avatar, bio, specialties, languages, scope, agency) · **[👁 Preview]** (visitor view simulation) · **[📊 Pro Dashboard]** (→ `/pro/dashboard`) · **[⭐ Promote]** (→ `/pro`, if the tier does not allow it).
- **Inline edit.** A pencil icon (on hover) on the bio and specialties, for direct editing.
- **Reply** button below each review (`POST /api/agents/[id]/reviews/[reviewId]/reply`).

### 3.9 Other agents (bottom)

- **"Other agents"** — horizontal carousel, 4 agent cards, ←/→ arrows. Algorithm: same city + same/similar specialty, limit 8 → agent card → `/agent/[slug]`.

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton: header card outline + bio bars + stats cards + listings grid blocks + sidebar card (shimmer) |
| **Loaded (visitor)** | Full profile + contact card on the right / fixed bottom bar on mobile |
| **Loaded (owner)** | Owner manage bar instead of the contact card + inline edit controls |
| **Unverified agent** | No Verified badge; "Verification in progress" tag |
| **0 listings** | "No active listings at the moment" + contact remains |
| **0 reviews** | "No reviews yet — be the first" + write-review CTA |
| **404 / not found** | "This profile was not found" illustration + [Find an Agent] |
| **Suspended / deleted** | "This profile is no longer available" + Find an agent link |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<AgentProfilePage> (Server Component, SSR)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <AgentHeader agent={Agent} isVerified />
 ├─ <AgentBio text={string} specialties={string[]} locale />
 ├─ <AgentStats stats={Stat[]} />
 ├─ <AgentListings agentId initialDeal="all" />     (client, React Query)
 │   └─ <PropertyCard property={PropertyCardData} />
 ├─ <AgentReviews agentId summary={ReviewSummary} /> (client)
 │   ├─ <WriteReviewModal agentId />                 (client, lazy)
 │   └─ <ReviewItem review={Review} canReply={isOwner} />
 ├─ <AgentContactCard agent={Agent} />               (client)
 │   ├─ <RequestModal agentId />                     (client, lazy)
 │   └─ <OwnerManageBar agent={Agent} />             (conditional: isOwner)
 └─ <OtherAgents agentId city specialty />           (client, React Query)
```

### Data fields used (Agent entity — see 00-SPEC §7)

`agent: { user_id, agency_name, license_no, bio{hy,ru,en}, specialties[], languages[], scope[], rating, reviews_count, verified, subscription_tier, avg_response_time, listings_active_count, deals_closed_count, created_at }`
`user: { id, name, avatar_url, phone, email }`
`review: { id, agent_id, author_id, author_name, author_avatar, rating, text, reply, created_at }`

### API contracts

**`GET /api/agents/[slug]`**
```jsonc
// 200 OK
{
  "id": 12,
  "slug": "anna-petrosyan-yerevan",
  "name": "Anna Petrosyan",
  "avatar": "https://...",
  "agencyName": "X Realty",
  "agencySlug": "x-realty",
  "verified": true,
  "tier": "pro",
  "rating": 4.8,
  "reviewsCount": 37,
  "bio": { "hy": "...", "ru": "...", "en": "..." },
  "specialties": ["apartments", "new_construction", "rent"],
  "languages": ["hy", "ru", "en"],
  "scope": ["Yerevan", "Kotayk"],
  "stats": {
    "listingsActive": 24, "dealsClosed": 112,
    "avgResponseHours": 2, "memberSince": "2020"
  },
  "badges": ["top_agent", "fast_responder"],
  "isOwner": false
}
// 404 { "error": "not_found" }
// 410 { "error": "suspended" }   → "No longer available"
```

**`GET /api/agents/[id]/listings?deal=sale|rent|all&sort=new&page=1`**
```jsonc
// 200 { "items": PropertyCard[], "total": 24, "page": 1, "pageSize": 12 }
```

**`POST /api/agents/[id]/reviews`**
```jsonc
// request  { "rating": 5, "text": "Very professional, helped quickly." }
// 201      { "reviewId": 902 }
// 401      { "error": "auth_required" }       → login modal
// 409      { "error": "already_reviewed" }    → "You've already written a review"
// 422      { "error": "self_review_forbidden" }
```

**`POST /api/agent-leads`** (request form)
```jsonc
// request
{ "agentId": 12, "dealType": "sell", "propertyType": "apartment",
  "city": "Yerevan", "budgetMin": 40000000, "budgetMax": 60000000,
  "currency": "AMD", "rooms": 2, "name": "Lilit", "phone": "+374...",
  "message": "I want to sell my apartment" }
// 201  { "leadId": 4410 }
// 429  { "error": "rate_limited" }   → toast "Too many requests"
```

**`POST /api/conversations`** → `{ "agentId": 12, "message": "..." }` → `201 { "conversationId": 612 }`

**`POST /api/reports`** → `{ "targetType": "review", "targetId": 902, "reason": "spam" }` → `202 Accepted`

### Validation (zod)

```ts
const reviewSchema = z.object({
  rating: z.number().int().min(1, "Rating is required").max(5),
  text: z.string().min(10, "Review is too short").max(1000),
});

const requestSchema = z.object({
  dealType: z.enum(["buy", "sell", "rent"]),
  propertyType: z.string().min(1),
  city: z.string().min(2),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  name: z.string().min(2, "Name is required").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  message: z.string().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});
```

- Review/request/conversation: all require auth (401 → login modal with `?next`).
- Self-review server-side block (`author_id == agent.user_id` → 422).
- View count: +1 server-side, unique by `session_id + agent_id` (24h dedupe).

---

## 6. Responsive

- **≥1024px (lg).** Two-column layout, sticky contact card (`top-20`); listings grid 2-col; stats 5-col.
- **768–1023px (md).** Single column; the contact card sits inline after the header (not sticky) + fixed bottom bar; listings grid 2-col.
- **<768px (sm).** All sections stack; listings grid 1-col; stats 2×2 grid; **fixed bottom bar** (💬 / 📞 / ⤴); breadcrumbs collapsed to "‹ Agents".

---

## 7. Accessibility

- Alt text for the avatar (`{name} — real estate agent`); placeholder avatar: `aria-hidden` with initials.
- All icon-only buttons: `aria-label` (⤴ = "Share", ⚑ = "Report review").
- The star rating input: `role="radiogroup"`, each star: `aria-label="{n} stars"`, keyboard ←/→ navigation.
- The rating breakdown bars: `aria-label="5 stars — 28 reviews"`.
- Status/success messages: `role="status"`; errors: `role="alert"`.
- Contrast ≥ 4.5:1; touch target ≥ 44px (CTAs are `h-12`).
- The modals (review/request/share): focus trap + ESC to close.

---

## 8. SEO & meta

- `<title>` = "Anna Petrosyan — real estate agent in Yerevan · ⭐ 4.8 | {brand}".
- `<meta name="description">` = first 155 characters of the bio + "{N} active listings · {N} reviews".
- OG image: avatar + name + rating overlay (dynamic `/api/og?agent=12`).
- Structured data (JSON-LD): `RealEstateAgent` (extends `Person`) + `aggregateRating` (rating, reviewCount) + `review[]` + `BreadcrumbList`.
- `hreflang` (hy/ru/en), `canonical` (by slug: `/agent/12/...` or by slug).
- Indexable; agent pages are included in the sitemap. Suspended/deleted: `noindex`.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `agent_profile_view` | Page load (dedupe 24h) | `agent_id` |
| `agent_message_sent` | Conversation created | `agent_id, conversation_id` |
| `agent_phone_revealed` | Phone revealed | `agent_id` |
| `agent_request_sent` | Request form submit | `agent_id, deal_type` |
| `agent_review_submitted` | Review published | `agent_id, rating` |
| `agent_review_reported` | ⚑ Report | `agent_id, review_id` |
| `agent_share_clicked` | Share modal action | `agent_id, channel` |
| `agent_listing_clicked` | Listings grid card click | `agent_id, property_id` |
| `other_agent_clicked` | Carousel card click | `agent_id, target_agent_id` |
