# Page 06 — User Dashboard (Personal Panel) 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard. Includes: overview, scenarios, layout/sizing/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/dashboard` (My listings: `/dashboard/listings`, deep-link tab: `?tab=active`)
**Roles.** User+ (for Agent, the same dashboard + cross-link to the Pro Dashboard, see `18-pro-dashboard.md`). Guest → redirect `/auth/login?next=/dashboard`.
**Primary goal.** The user's "home base": see their activity at a glance (listings, views, messages, favorites) and **quickly move to action** (new listing, profile, messages, listing management).

---

## 0. Overview

The dashboard is the first page after login (default `next`). It is **not** a marketing page but a **toolset** — the user comes here with a concrete task: see their listing's stats, reply to a new message, post a new property, or edit the price. Hence the page priorities: (1) **status at a glance** — the overview cards at the top show the most important numbers (active listings, views, unread, favorites) in a single scan; (2) **My listings management** — the heart of the page, with edit/promote/stats/delete at hand for each listing; (3) **quick actions** — "Add a listing" is always prominent.

The layout is a **persistent left sidebar** + content area (in the Zillow/Realtor dashboard style). The sidebar is a navigation hub for all account pages (favorites, messages, settings). The page renders via **SSR** for the initial overview, but the counters and the My listings tab are client-side (React Query) for optimistic updates and realtime badges.

For the Agent role it is the same dashboard, but the overview adds a rating/reviews card and the sidebar adds a link to the Pro Dashboard.

---

## 1. User scenarios

**Scenario A — Seller Hasmik (manage listing, desktop).** After login Hasmik lands on the dashboard. From the overview cards she sees "1 listing · 340 views · 2 unread messages". She taps the messages card → `/messages`. Then she returns, taps [📊 Statistics] from the My listings tab → in a modal she sees the views chart over a 30-day window.

**Scenario B — Landlord Tigran (deactivate, mobile).** Tigran's apartment has already been rented out. He opens the dashboard on his phone, doesn't use the hamburger drawer — from the overview he scrolls to My listings, and from the listing card's [•••] menu he taps **[⏸ Deactivate]** → the status immediately (optimistic) becomes "Archived" and the badge grays out. The listing is no longer public.

**Scenario C — New user Ani (empty state).** Ani just registered. The dashboard is empty: every card in the overview shows "0", and the recent activity shows "No activity yet". In the center a big **[+ Post your first listing]** button → `/sell/new` (listing wizard).

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + content

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────┬─────────────────────────────────────────────┤
│ SIDEBAR      │ CONTENT                                       │
│ (w-64,       │  «Hi, Hasmik 👋»  [avatar] [User badge]      │
│  sticky      │                                               │
│  top-16)     │  ┌── Overview cards (grid-cols-4 gap-4) ──┐  │
│              │  │ [🏠 1] [👁 340] [💬 2] [♡ 5]           │  │
│ 📊 Overview  │  └──────────────────────────────────────┘  │
│ 🏠 My list.  │                                               │
│ ♡ Favorites  │  Quick actions:                              │
│ 💬 Messages•2│  [+ Add listing] [✏️ Profile]                │
│ 🔔 Notif. •3 │                                               │
│ 🔍 Saved     │  ── My listings ──                           │
│ ⚙️ Settings  │  [Active][Draft][Pending][Archived]          │
│ ──────────   │  ┌── listing row ──────────────────────┐    │
│ ↪ Sign out   │  │ [img] Title · price · badge          │    │
│              │  │ 👁340 ♡5 💬2   [✏️][📊][•••]          │    │
│              │  └──────────────────────────────────────┘    │
│              │  ── Recent activity ──                       │
│              │  · «5 people viewed...»  · «New message...»  │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px) — drawer + stacked

```
┌──────────────────────────┐
│ HEADER (h-14)  [☰]       │
├──────────────────────────┤
│ «Hi, Hasmik 👋»          │
│ [avatar] [User badge]    │
│                           │
│ Overview (grid-cols-2):  │
│ [🏠 1]  [👁 340]         │
│ [💬 2]  [♡ 5]           │
│                           │
│ [+ Add listing]          │
│                           │
│ My listings              │
│ [Active][Draft][Arch.]   │
│ ┌── listing card ──┐     │
│ │ [img] Title       │     │
│ │ price · badge     │     │
│ │ 👁340 ♡5 💬2 [•••]│     │
│ └──────────────────┘     │
│ Recent activity          │
└──────────────────────────┘
  (☰ → drawer: sidebar nav)
```

- On mobile the sidebar becomes a **hamburger drawer** (slide-in from the left, `bg-white w-72 shadow-xl`, overlay `bg-black/40`).
- Overview cards: desktop 4 columns, tablet 2, mobile 2 (`grid grid-cols-2 lg:grid-cols-4`).

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| Sidebar | `w-64 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)]` |
| Sidebar nav item | `flex items-center gap-3 px-4 h-11 rounded-lg text-gray-700 hover:bg-gray-50` |
| Sidebar active | `bg-primary/10 text-primary font-medium` |
| Sidebar badge | `ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 text-center` |
| Greeting | `text-2xl font-semibold text-gray-900` |
| Role badge | `text-xs px-2 py-0.5 rounded-md` (User `bg-gray-100`, Agent `bg-blue-50 text-blue-600`, Verified `+✓`) |
| Overview card | `bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm cursor-pointer` |
| Card number | `text-2xl font-bold text-gray-900` |
| Card label | `text-sm text-gray-500` |
| Primary CTA | `bg-primary text-white h-11 rounded-lg px-4 font-medium hover:bg-primary/90` |
| Listing row | `flex gap-4 p-3 border border-gray-200 rounded-xl hover:shadow-sm` |
| Status badge active | `bg-green-100 text-green-700` |
| Status badge draft | `bg-gray-100 text-gray-600` |
| Status badge pending | `bg-yellow-100 text-yellow-700` |
| Status badge archived | `bg-gray-200 text-gray-500` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Greeting header

- **Appearance.** "Hi, {name} 👋" (`text-2xl font-semibold`) + avatar (`w-10 h-10 rounded-full`) + role badge.
- **Role badge.** User → `bg-gray-100` "User"; Agent → `bg-blue-50 text-blue-600` "Agent"; verified agent → + ✓ "Verified".
- **Phone unverified warning.** If `phone_verified == false`: a yellow inline banner "Verify your phone to post a listing" + **[Verify]** → `/auth/verify`.

### 3.2 Left sidebar nav

Links (with active state, current page: `bg-primary/10 text-primary`):
- **📊 Overview** → `/dashboard`
- **🏠 My listings** → `/dashboard/listings`
- **♡ Favorites** → `/favorites` (see `07-favorites.md`)
- **💬 Messages** → `/messages`, badge: unread count (realtime, see `09-messages.md`)
- **🔔 Notifications** → `/notifications`, badge (see `22-notifications.md`)
- **🔍 Saved searches** → `/saved-searches` (Phase 2, see `08-saved-searches.md`)
- **⚙️ Settings** → `/settings` (see `21-settings.md`)
- **(Agent only) 📈 Pro Dashboard** → `/pro/dashboard`
- **↪ Sign out** — no confirm; end session → redirect Home + toast "You've signed out".

**Behavior.** Hover: `bg-gray-50`; badge: `9+` overflow above 9; on mobile the same list inside the drawer, and after a selection the drawer closes.

### 3.3 Overview cards

Each card: a number (`text-2xl font-bold`) + label + click → target. Grid `grid-cols-2 lg:grid-cols-4 gap-4`.

| Card | Data | Click → |
|------|-------|---------|
| **🏠 My listings** | active listings count | My listings (Active tab) |
| **👁 Total views** | Σ `views_count` | My listings sorted by views |
| **💬 Unread** | unread messages count | `/messages` |
| **♡ Favorites** | saved properties count | `/favorites` |
| **🔍 Saved searches** | (Agent/Phase 2) saved count | `/saved-searches` |
| **⭐ Rating** (Agent only) | rating + reviews | `/agent/[slug]#reviews` |

**States.** *Loading*: a skeleton bar instead of the number; *0*: shows "0" (not empty, not "—"); *hover*: `shadow-sm`; *click*: navigate.

### 3.4 Quick actions

- **[+ Add listing]** (primary, prominent) → `/sell/new` (listing wizard, see `04-listing-wizard.md`).
  - **Limit guard.** If the user has reached the active listing limit (e.g. 3 free) → the button shows an upsell tooltip "You've reached the free limit. Switch to Pro" (Phase 2).
- **[✏️ Edit profile]** (secondary) → `/settings` (Profile tab).
- **(Agent) [⭐ Promote listing]** → pricing (Phase 2).

### 3.5 My listings tab (the heart of the page)

**Sub-tabs** (filter by status, deep-link `?tab=`):
- **[Active]** — `status = active` (approved, public)
- **[Draft]** — `status = draft` (unfinished wizard)
- **[Pending]** — awaiting moderation (Phase 2)
- **[Archived]** — `status = archived` / sold / expired

**Listing row/card composition.** Thumbnail (`w-24 h-20 rounded-lg`), title, price, status badge, key stats (👁 views · ♡ favorites · 💬 messages).

**Per-listing actions** (desktop: inline buttons + `[•••]` overflow; mobile: `[•••]` menu):
- **[✏️ Edit]** → `/listing/[id]/edit`
- **[⏸ Deactivate]** / **[▶️ Activate]** → toggle `status` active↔archived (instant, optimistic UI; on failure rollback + toast)
- **[📊 Statistics]** → modal: views line chart over time (7/30/90 days), favorites, messages, leads
- **[🗑 Delete]** → **confirm modal** "Are you sure you want to delete "{title}"? This is irreversible" → [Cancel] / [Delete (red)] → `DELETE`
- **[⭐ Promote]** → promote flow (Phase 2)
- **(Draft) [Continue editing]** → wizard from the same step (`step` is stored in the draft)

**Expiring soon.** A listing near its expiry → badge "Expires in 3 days" (`bg-orange-100 text-orange-700`) + **[Extend]**.

**Empty states.**
- *Active tab empty* → "You don't have any active listings yet" + **[+ Add listing]**.
- *Draft tab empty* → "No drafts".
- *Archived empty* → "Archive is empty".

### 3.6 Recent activity feed

A chronological feed of recent events (`text-sm`, icon + text + relative time):
- "👁 {X} people viewed your "{listing title}""
- "💬 New message from {name}" → `/messages/[id]`
- "✅ Your "{title}" listing was approved" → `/property/[id]`
- "⛔ "{title}" was rejected — see the reason" → `/listing/[id]/edit`
- "♡ {name} favorited your property"
- "🔍 Saved search match: 3 new properties" (Phase 2)
- **Empty** → "No activity yet. Post your first listing".
- Pagination: "See more" / infinite scroll (limit 20/page).

---

## 4. Full list of states

| State | What is shown |
|-------|-------------------|
| **Loading** | Sidebar render + overview card skeleton + listing rows skeleton |
| **Loaded (User)** | Overview + quick actions + My listings + activity feed |
| **Loaded (Agent)** | + rating card + Pro Dashboard sidebar link |
| **Empty (new user)** | All cards "0" + central [+ Post your first listing] |
| **Listing limit reached** | [+ Add listing] shows upsell tooltip "Switch to Pro" |
| **Phone unverified** | Yellow banner at the top + [Verify] |
| **Optimistic toggle** | Status badge changes immediately, rollback on failure |
| **Delete confirm** | Modal "irreversible" + [Cancel]/[Delete] |
| **Error (API fail)** | "Failed to load" + [Retry] |
| **Realtime update** | Messages/Notifications badge +1 without reload |

---

## 5. Technical depth

### Component tree

```
<DashboardLayout> (Server Component, SSR shell)
 ├─ <Sidebar nav active />            (client: active state + badge)
 │   └─ <SidebarBadge channel="messages|notifications" />  (realtime)
 └─ <DashboardContent>
     ├─ <GreetingHeader user />
     ├─ <OverviewCards data={Counts} />          (client, React Query)
     ├─ <QuickActions canCreate limitReached />
     ├─ <MyListings>                              (client)
     │   ├─ <ListingTabs active onChange />
     │   ├─ <ListingRow property actions /> ×N
     │   │   └─ <ListingActionsMenu onEdit onToggle onStats onDelete />
     │   ├─ <StatsModal listingId />              (lazy)
     │   └─ <DeleteConfirmModal />
     └─ <RecentActivity items paginated />        (client)
```

Props (key): `<OverviewCards data: { listings, views, unread, favorites, savedSearches } />`; `<ListingRow property: Property, onToggleStatus, onDelete, onPromote />`; `<SidebarBadge channel, userId />` (Supabase Realtime subscribe).

### Data fields (properties + users — see 00-SPEC §7)

`properties: id, owner_id, title{hy,ru,en}, deal_type, status, property_type, price, currency, area_m2, rooms, views_count, is_featured, created_at, expires_at(config)`
Overview counts: aggregate queries (active listings count, Σ views, unread messages, favorites count).

### API contracts

**`GET /api/dashboard/overview`**
```jsonc
// 200 OK
{ "listings": 1, "views": 340, "unread": 2, "favorites": 5,
  "savedSearches": 0,
  "agent": { "rating": 4.8, "reviews": 12 }   // null if not an agent
}
```

**`GET /api/dashboard/activity?cursor=...`**
```jsonc
// 200 { "items": [ { "type": "view", "listingId": 8423, "count": 5,
//                    "title": "...", "at": "2026-06-22T10:00:00Z" } ],
//       "nextCursor": "..." }
```

**`GET /api/listings/mine?status=active|draft|pending|archived`**
```jsonc
// 200 { "items": [ { "id": 8423, "title": {...}, "price": 52000000,
//                    "currency": "AMD", "status": "active",
//                    "stats": { "views": 340, "favorites": 5, "messages": 2 },
//                    "thumbnail": "...", "expiresAt": "..." } ] }
```

**`PATCH /api/listings/[id]`** → `{ "status": "archived" }` → `200 { "status": "archived" }` · `403 { "error": "not_owner" }`

**`DELETE /api/listings/[id]`** → `200 { "deleted": true }` · `404`

**`GET /api/listings/[id]/stats?range=30d`** → `200 { "viewsSeries": [...], "favorites": 5, "messages": 2, "leads": 1 }`

### Validation & rules

- **Ownership (RLS).** All mine/stats/patch/delete queries: `owner_id == auth.uid()`; otherwise `403`.
- **Status transition.** Allowed: `active ↔ archived`, `draft → active` (only if the listing is complete, wizard validation passes). `sold/pending` → admin/system-driven.
- **Optimistic update.** React Query `onMutate` → cache update; `onError` → rollback + toast "Failed, please try again".
- **Realtime.** Supabase Realtime channel `dashboard:{user_id}` → messages/notifications counter update.

---

## 6. Responsive

- **≥1024px (lg).** Persistent sidebar (`w-64`) + content; overview 4 columns; listings in row layout with inline actions.
- **768–1023px (md).** Sidebar can collapse (icon-only `w-16`) or drawer; overview 2 columns.
- **<768px (sm).** Sidebar → hamburger drawer; overview 2 columns; listings in card layout with `[•••]` menu; quick actions full-width stacked.

---

## 7. Accessibility

- Sidebar: `<nav aria-label="Personal panel">`, active item: `aria-current="page"`.
- Badges: `aria-label="{n} unread"` (not color only).
- Overview cards: `role="link"` / `<a>`, focus-visible ring; keyboard accessible.
- `[•••]` menu: keyboard navigation (↑↓, Enter, Esc), focus trap while open.
- Delete confirm modal: focus trap, `role="dialog"`, Esc to close, destructive button: not default focus.
- Touch target ≥ 44px; contrast ≥ 4.5:1; status badges: text + color (not color only).

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated).
- `<title>` = "Personal panel — {brand}".
- No canonical; excluded from the sitemap.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `dashboard_view` | Page load | `role` |
| `overview_card_click` | Overview card click | `card` |
| `quick_action_create` | [+ Add listing] click | `limit_reached` |
| `listing_tab_change` | Sub-tab change | `tab` |
| `listing_edit_click` | [✏️ Edit] | `listing_id` |
| `listing_status_toggle` | Activate/deactivate | `listing_id, to_status` |
| `listing_stats_open` | [📊] modal open | `listing_id` |
| `listing_delete` | Confirm delete | `listing_id` |
| `listing_promote_click` | [⭐ Promote] | `listing_id` |
| `activity_load_more` | Feed pagination | `cursor` |
| `upsell_pro_shown` | Limit upsell tooltip | — |
