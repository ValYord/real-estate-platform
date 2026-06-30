# Page 07 — Favorites / Saved Listings 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard structure.

**URL.** `/favorites` — example: `/hy/favorites?sort=price_drop`
**Roles.** User+ (login required). Guest → login wall (when opening `/favorites` directly) or login modal (when tapping ♡ from another page).
**Primary goal (re-engagement).** Bring the user back to properties they previously liked and nudge them toward **action** (make contact, compare) — especially when the price has dropped or the status has changed. This is the key page for retention and repeat visits.

---

## 0. Overview

Favorites is the user's **personal shortlist**. The ♡ on a property card or property page collects everything here. The page's value is twofold: (1) **convenience** — the user sees the properties that matter to them in one place without searching again, and (2) **conversion trigger** — we show on the cards what has changed since they saved an item (price dropped, reserved, removed), so the user returns and acts.

The page is rendered with **SSR** inside an auth-gated layout (session from cookie). The card grid is a client component with React Query, for optimistic ♡ remove, undo, and header counter sync. The data core is `favorites` join `properties` join `property_media`, plus `saved_price` (the price at the moment of saving) to compute the price drop.

In Phase 1: a single flat list, sort, price-drop/status indicators. In Phase 2: collections/folders and a compare checkbox.

---

## 1. User scenarios

**Scenario A — Tenant Maria (desktop).** Maria has saved 9 apartments with ♡ over the week. She opens `/favorites`, sets sort to "Price drop" to bring the cheaper ones to the top. She sees a red chip on the Arabkir apartment: "🔻 −5%". She clicks the card → property page → writes to the seller. → The price-drop indicator generated a lead.

**Scenario B — Buyer Aram (mobile).** Aram has saved 4 properties over the month. He opens favorites and sees one is grayscaled: "No longer available". He taps **[View similar]** → search with the same criteria. He accidentally taps the ♡ on another card and restores it via the toast's **[Undo]**.

**Scenario C — Investor David (Phase 2, collections).** David has saved 20+ properties. He creates two lists — "For investment" and "For family" — and moves cards into the matching list from the card's "⋯". He filters with the top chips to show only "For investment".

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Favorites                              │
│ H1 "Favorites"  12 properties                               │
├────────────────────────────────────────────────────────────┤
│ TOOLBAR                                                     │
│ [All·Arabkir·Investment] (P2 chips)   [Sort ▾] [⚖][🔔]      │
├────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ Card   │ │ Card   │ │ Card   │ │ Card   │  (lg: 3-4 col) │
│ │ 🔻−5%  │ │        │ │ Reserv.│ │        │               │
│ └────────┘ └────────┘ └────────┘ └────────┘               │
│ ┌────────┐ ┌────────┐ …                                    │
│ └────────┘ └────────┘                                      │
│ [Show more]  (or infinite scroll)                          │
│ FOOTER                                                      │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ ‹ Back   Favorites (12)  │
│ [Sort ▾]  [⚖] [🔔]       │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Card (full-width)    │ │
│ │ 🔻 −5%               │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Card                 │ │
│ └──────────────────────┘ │
│ …                        │
│ FOOTER                   │
└──────────────────────────┘
```

- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`.
- Toolbar: sticky `top-16` on desktop (`bg-white/95 backdrop-blur border-b`).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 heading | `text-2xl font-semibold text-gray-900` |
| Count | `text-base text-gray-500 ml-2` |
| Toolbar | `flex items-center justify-between h-14` |
| Sort dropdown | `border border-gray-200 rounded-lg h-10 px-3 text-sm` |
| Price-drop chip | `bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded-md` |
| Price-up chip | `bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md` |
| Status badge "Reserved" | `bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md` |
| Unavailable overlay | `grayscale opacity-60` + `bg-black/40` banner |
| Card | `shadow-sm border border-gray-200 rounded-xl overflow-hidden` |
| ♡ filled | `text-red-500 fill-red-500` |
| Empty illustration | `w-32 h-32 text-gray-300 mx-auto` |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-72` |

---

## 3. Section-by-section

### 3.1 Page header

- **Breadcrumbs.** `Home › Favorites` (`text-sm text-gray-500`, separator `›`).
- **H1.** "Favorites" + count: "Favorites 12 properties". Count 0 → subtitle hidden, empty state shown.
- **Subtitle** (if ≥1): "Your saved properties" (`text-gray-500 text-sm`).

### 3.2 Toolbar

- **Sort dropdown `[Sort ▾]`.** The selection is stored in the URL query (`?sort=`) — shareable and back-button-friendly. Options:
  - Recently added (`?sort=recent`, default, `favorites.created_at desc`)
  - Price: low to high (`?sort=price_asc`)
  - Price: high to low (`?sort=price_desc`)
  - Price drop (`?sort=price_drop`, items with a price drop first, then by drop %)
  - **States.** default (label "Sort"), open (panel `shadow-lg rounded-lg`), selected (✓ next to the chosen one, `text-primary`).
- **Currency note.** Prices are shown in the currency selected in the header (live rate); secondary: original currency if different.
- **[⚖ Compare selected]** (Phase 2): disabled (`text-gray-300`) until ≥2 compare checkboxes are checked; active → `/compare?ids=...`.
- **[🔔 Saved searches]** cross-link → `/saved-searches` (`08-saved-searches.md`).

### 3.3 Grid of saved property cards

- Each card = standard **PropertyCard** (image slider, price, ♡, 🛏/📐/🏢, address, badge). Click the card body → `/property/[id]/[slug]`.
- **♡ toggle (filled heart by default here).** Click → optimistic remove (card fade-out `transition-opacity`) → `DELETE /api/favorites/[propertyId]`.
  - Success: card disappears + **Toast** "Removed from favorites" + **[Undo]** (5-second countdown).
  - Undo click → `POST /api/favorites` restore + card returns to its place.
  - Error: rollback (card returns) + toast "Something went wrong, please try again".
- **Compare checkbox** (Phase 2): in the card's top-left corner `absolute top-2 left-2`, adds/removes from the comparison.
- **States per card.** default · hover (`shadow-md scale-[1.01]`) · removing (fade) · unavailable (grayscale, see below).

### 3.4 Indicators on saved items (important)

A badge/ribbon on the card shows what has changed **for this property since you saved it**:

- **🔻 Price dropped** — chip "−5%" or "−2,000,000 ֏" (`bg-red-50 text-red-600`). Computed from `saved_price` (at save time) vs current `price`. Threshold: we don't show changes < 1%.
- **🔺 Price increased** — chip "+3%" (subtle gray, not red).
- **Status change.**
  - `pending` → badge "Reserved" (amber).
  - `sold` / `rented` → grayscale overlay + banner "No longer available" + **[Remove]** / **[View similar]** (→ `/search` with the same criteria).
  - `archived` / deleted → placeholder card "Removed from listings" + **[Remove]** (auto-removable).
- The indicator data comes from `favorites.saved_price` + the property's current state, with the diff computed server-side.

### 3.5 Collections / Folders (🟡 Phase 2)

- **[+ New list]** — the user groups favorites (e.g. "Arabkir", "For investment", "For parents").
- Tabs/chips at the top: "All · Arabkir · Investment …" (active chip `bg-primary text-white`).
- The card's "⋯" menu → **[Move to list ▾]**.
- Data: `favorite_collections(id, user_id, name)` + `favorites.collection_id`.
- *In Phase 1: a single flat list, collections come later.*

### 3.6 Empty state

When 0 saved properties:
- Icon (empty heart `w-32 h-32 text-gray-300`) + heading "You haven't saved anything yet".
- Text: "Tap ♡ on any property to save it here".
- **[Search properties]** primary → `/search`.
- Cross-link: "Or create a **saved search** to get notified about new properties" → `/saved-searches`.

### 3.7 Guest state (login wall)

- The guest opens `/favorites` directly → **login wall** card (centered, `max-w-md`).
- Text: "Sign in to see your favorites".
- **[Sign in]** → `/auth/login?redirect=/favorites` · **[Sign up]** → `/auth/register`.
- **Guest ♡ on other pages.** When tapping ♡ on a property card/page: login modal (`/auth/login?redirect=…&fav=[id]`). After login, the intent is performed automatically (the property is saved). Optional: store the guest's ♡ in `localStorage` and sync after login.

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------------|
| **Loading** | Grid skeleton (8–12 gray card shimmer) + toolbar disabled |
| **Loaded (≥1)** | Card grid + toolbar (sort, count) |
| **Empty (0)** | Empty-heart illustration + "You haven't saved anything yet" + [Search properties] |
| **Guest** | Login wall card: [Sign in] / [Sign up] |
| **Card removing** | Optimistic fade-out + toast "Removed from favorites" + [Undo] |
| **Card unavailable** | Grayscale overlay "No longer available" + [View similar] |
| **Card deleted** | Placeholder "Removed from listings" + [Remove] |
| **Error (API fail)** | "Something went wrong" + [Try again] |
| **Loading more** | Spinner / skeleton row at the bottom (infinite scroll / "Show more") |

---

## 5. Technical depth

### Component tree

```
<FavoritesPage> (Server Component, SSR, auth-gated)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <FavoritesHeader count={number} />
 ├─ <FavoritesToolbar sort onSortChange collections />   (client)
 ├─ <CollectionTabs collections active />                 (P2, client)
 ├─ <FavoritesGrid>                                       (client, React Query)
 │   └─ <PropertyCard property indicator onUnfavorite />  (×N)
 │       ├─ <PriceDropChip saved current />
 │       └─ <StatusBadge status />
 ├─ <LoadMore /> | infinite scroll sentinel
 ├─ <EmptyFavorites />      (conditional: count===0)
 └─ <FavoritesLoginWall />  (conditional: guest)
```

### Data fields used

`favorites(user_id, property_id, saved_price, collection_id, created_at)` join `properties(id, slug, title{}, price, currency, status, deal_type, property_type, area_m2, rooms, floor, floors_total, city, district, address)` join `property_media(url, order)`. Computed field: `price_change_pct = (price - saved_price) / saved_price`.

### API contracts

**`GET /api/favorites?sort=price_drop&collection=&page=1`**
```jsonc
// 200 OK
{
  "items": [
    {
      "propertyId": 8423,
      "slug": "yerevan-arabkir-2-senyak-bnakaran",
      "title": { "hy": "2 սենյականոց բնակարան" },
      "price": 49400000, "currency": "AMD",
      "savedPrice": 52000000,
      "priceChangePct": -0.05,
      "status": "active",
      "media": [{ "url": "...", "order": 0 }],
      "rooms": 2, "area": 75, "floor": 4, "floorsTotal": 9,
      "city": "Yerevan", "district": "Arabkir"
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 24
}
// 401 { "error": "auth_required" }   → login wall
```

**`POST /api/favorites`** → `{ "propertyId": 8423 }` → `200 { "favorited": true }`

**`DELETE /api/favorites/[propertyId]`** → `200 { "favorited": false }` (undo = POST again)

**(P2) `POST /api/favorite-collections`** → `{ "name": "For investment" }` → `201 { "id": 7 }`

**(P2) `PATCH /api/favorites/[propertyId]`** → `{ "collectionId": 7 }` → `200`

### Validation & logic (zod)

```ts
const sortSchema = z.enum(["recent","price_asc","price_desc","price_drop"]).default("recent");
const collectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(40),
});
```

- Price drop: we show it only if `|price_change_pct| ≥ 0.01`.
- ♡ remove: optimistic; error → rollback + toast.
- Header favorites counter: shared React Query cache, invalidated after every toggle (sync across every page).
- Pagination: page size 24, infinite scroll (`IntersectionObserver` sentinel) or "Show more".

---

## 6. Responsive

- **≥1280px (xl).** Grid 4 columns; toolbar sticky `top-16`.
- **1024–1279px (lg).** Grid 3 columns.
- **768–1023px (md).** Grid 2 columns; toolbar wraps.
- **<768px (sm).** Grid 1 column full-width; breadcrumbs collapsed to "‹ Back"; sort via bottom-sheet modal.

---

## 7. Accessibility

- ♡ button: `aria-label="Remove from favorites"` (filled state), `aria-pressed="true"`.
- Toast undo: `role="status"`, **[Undo]** focusable, the countdown is not read by `aria-live="polite"` every second (only on appearance).
- Card grid: `<ul>/<li>` semantics, each card keyboard-accessible (Enter = open).
- Sort dropdown: ARIA listbox pattern, ←/→/Enter navigation.
- Status overlay banner: `role="status"`; contrast ≥ 4.5:1; touch target ≥ 44px.

---

## 8. SEO & meta

- **noindex, nofollow** — personal, auth-gated page (`robots: noindex, nofollow`).
- `<title>` = "Favorites | {brand}" (for UX, not SEO).
- No structured data, no OG image (private).
- Sort query (`?sort=`): `canonical` to base `/favorites`.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `favorites_view` | Page load | `count` |
| `favorite_remove` | ♡ toggle off | `property_id` |
| `favorite_undo` | Toast [Undo] | `property_id` |
| `favorites_sort_changed` | Sort dropdown | `sort` |
| `favorite_card_click` | Card → property | `property_id` |
| `price_drop_shown` | Price-drop chip render | `property_id, pct` |
| `unavailable_similar_click` | [View similar] | `property_id` |
| `compare_select` (P2) | Compare checkbox | `property_id` |
| `collection_create` (P2) | [+ New list] | `name` |
