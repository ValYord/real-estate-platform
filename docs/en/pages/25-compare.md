# Page 25 — Compare Properties 🟡 Phase 2

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard structure.

**URL.** `/compare` (shareable: `/compare?ids=12,45,78`) — example: `/hy/compare?ids=8423,8501,8677`
**Roles.** Everyone (a guest can compare too; saving/writing requires login).
**Primary goal (decision support).** Up to 4 properties side by side in a table, so the user quickly sees the **differences** (price, area, rooms, floor, amenities, location) and decides which property to pursue. Highlighting differences reduces cognitive load: the user doesn't deal with the "same" columns and sees only where they differ.

---

## 0. Overview

Compare is a **decision-support** tool at the end of the search funnel. The user already has 2–4 candidates (from favorites or search) and wants to place them side by side. The table has a sticky row-labels column on the left, then each property in its own column (max 4). The Highlight toggle marks where values differ, and in numeric rows it marks the best value in green (cheapest price, largest area).

The selection state is stored client-side (Zustand + URL `?ids=`). The URL is **shareable**: the recipient (even a guest) opens the same comparison without login. Data is batch-fetched via `GET /api/properties?ids=...`, then rendered SSR/CSR hybrid (page shell SSR for the SEO landing, table client for interactivity).

A guest can compare and share; to ♡ save or 💬 write, a login modal appears.

---

## 1. User scenarios

**Scenario A — Tenant Maria (desktop).** Maria checked 3 apartments in favorites with the "⚖ Compare" checkbox and tapped **[Compare →]** from the floating compare bar. In the table she turns on **[Highlight differences]** and sees that one is 5 m² larger but 1 floor up. From the green marking she sees the cheapest price and taps that column's **[💬 Write]**.

**Scenario B — Buyer Aram (share).** Aram is comparing 4 houses and wants his wife's opinion. He taps **[⤴ Share]** → copy link `/compare?ids=...`, sends it via WhatsApp. His wife (guest) opens the link on her phone and views the columns with horizontal scroll.

**Scenario C — Investor David (max + sold).** David tries to add a 5th property → toast "You can compare a maximum of 4 properties". In one column he sees "No longer available" (sold), taps **[✕ Remove]**, then adds a new one from the modal via **[+ Add]**.

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Compare                                │
│ H1 "Compare" 3/4   [+Add][⤴Share][🖨][Highlight◉]          │
├──────────┬─────────────┬─────────────┬─────────────────────┤
│ (sticky) │ 🖼 [✕][♡][💬]│ 🖼 [✕][♡][💬]│ 🖼 [✕][♡][💬]      │
│ labels   │ Apt. Arabkir │ Apt. Kentron│ Apt. Ajapnyak       │
├──────────┼─────────────┼─────────────┼─────────────────────┤
│ Price    │ 52,000,000 ֏│ 58,000,000 ֏│ 47,000,000 ֏ ✓cheap │
│ Price/m² │ 693K ֏      │ 725K ֏      │ 626K ֏              │
│ Area     │ 75 m²       │ 80 m² ✓big  │ 75 m²              │
│ Rooms    │ 2           │ 3           │ 2                  │
│ Floor    │ 4/9         │ 6/12        │ 2/5                │
│ Year     │ 2018        │ 2021        │ 2009              │
│ Furniture│ ✓           │ ✓           │ —                  │
│ Elevator │ ✓           │ ✓           │ —                  │
│ Parking  │ —           │ ✓           │ ✓                  │
│ District │ Arabkir     │ Kentron     │ Ajapnyak           │
│ FOOTER                                                      │
└──────────┴─────────────┴─────────────┴─────────────────────┘
```

### Mobile (<768px) — horizontal scroll

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ ‹ Back  Compare 3/4      │
│ [+][⤴][Highlight ◉]      │
├────────┬─────────────────┤
│(sticky)│ 🖼[✕][♡][💬]→→→ │ ← swipe columns
│ labels │ Apt. Arabkir    │
├────────┼─────────────────┤
│ Price  │ 52M ֏           │
│ Area   │ 75 m²           │
│ Rooms  │ 2               │
│ Furn.  │ ✓               │
│ …      │ …               │
│ FOOTER                   │
└────────┴─────────────────┘
```

- The row-labels column is `sticky left-0 bg-white z-10`; columns: horizontal scroll (`overflow-x-auto`).
- On mobile the labels column is narrow (`w-24`), each property column `min-w-[160px]`.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-2xl font-semibold text-gray-900` |
| Count "3/4" | `text-base text-gray-500 ml-2` |
| Table | `w-full border-collapse` |
| Label cell | `sticky left-0 bg-white text-sm text-gray-500 font-medium p-3 border-b` |
| Value cell | `text-sm text-gray-900 p-3 border-b text-center` |
| Column header | `p-3 border-b align-top min-w-[200px]` |
| Photo | `w-full h-28 rounded-lg object-cover cursor-pointer` |
| [✕ Remove] | `text-gray-400 hover:text-red-500 text-xs` |
| [♡] / [💬] | `h-8 rounded-lg border text-xs px-2` |
| Diff highlight | `bg-amber-50` (the cell that differs) |
| Same (dim) | `text-gray-400` |
| Best value | `text-green-600 font-medium` + ✓ |
| ✓ amenity | `text-green-600` · `—` missing `text-gray-300` |
| Highlight toggle | `inline-flex items-center gap-2 text-sm` + switch |
| Empty illustration | `w-32 h-32 text-gray-300` (⚖) |
| Compare bar (floating) | `fixed bottom-4 inset-x-4 bg-gray-900 text-white rounded-xl p-3 shadow-lg` |

---

## 3. Section-by-section

### 3.1 Page header

- **Breadcrumbs.** `Home › Compare`.
- **H1.** "Compare" + count of selected properties: "Compare 3/4".
- **[+ Add property]** (if < 4): modal to search/select from favorites or search.
- **[⤴ Share]** → copy link `/compare?ids=...` (FB, Telegram, WhatsApp, email).
- **[🖨 Print / Export]** → print-friendly view / PDF.
- **[Highlight differences]** toggle (see 3.4).

### 3.2 Comparison table (main body)

- **Layout.** Left: sticky row-labels column; each property: its own column (max 4). Columns horizontal scroll on mobile; labels sticky on the left.
- **Column header (per property).**
  - **Photo** (first image) → click → `/property/[id]`.
  - Title + address (truncate).
  - **[✕ Remove]** from the column (removes from the comparison, updates `?ids=`).
  - **[♡ Save]** favorite toggle (guest → login).
  - **[💬 Write]** → conversation start (`09-messages.md`, guest → login).
- **Rows (compared fields).**
  - **Price** (in the selected currency; rent: "/month").
  - **Price / m²** (computed: `price / area_m2`).
  - **Area** (m²).
  - **Rooms** (rooms).
  - **Bedrooms** (bedrooms).
  - **Bathrooms** (bathrooms).
  - **Floor** (floor / floors_total).
  - **Year built** (year_built).
  - **Property type** (apartment/house/…).
  - **Condition / Deal type** (sale/rent, status).
  - **Amenities.** ✓/— for each amenity (parking, elevator, furniture, air conditioning, balcony…).
  - **Location / District** (city, region).
  - **Distance** (Phase 3): from a chosen reference point (e.g. center, metro) — optional mini map row.
- Missing value: "—".

### 3.3 Add properties (how they get added)

- **Compare checkbox.** On the property card (search results `02-search.md` and favorites `07-favorites.md`): a "⚖ Compare" checkbox.
  - On check: a floating **compare bar** appears (bottom of the page): "2 selected · [Compare →]".
  - The compare bar's **[Compare]** → `/compare?ids=...`.
- **[+ Add]** from `/compare` → modal (favorites list + search input).
- Selection state is stored client-side (Zustand + localStorage) + URL `?ids=`.

### 3.4 Highlight differences toggle

- **On** → in rows where values differ, the cells are highlighted (`bg-amber-50`); equal values are dimmed (`text-gray-400`).
- In numeric rows: the best value (cheapest price, largest area) gets a green marking + ✓ (optional).
- **Off** → a regular table.
- Toggle state: URL/local persist.

### 3.5 Empty / partial states

- **0 properties** selected: icon (⚖ `w-32 h-32`) + "No properties selected to compare".
  - Text: "Select properties from search or favorites by checking '⚖ Compare'".
  - **[Search properties]** → `/search` · **[My favorites]** → `/favorites`.
- **1 property** only: column + placeholder "Add one more property to compare" + **[+ Add]**.

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------------|
| **Loading** | Table skeleton (labels + N column shimmer) |
| **Loaded (2–4)** | Full comparison table |
| **1 property** | Column + "Add one more" placeholder |
| **Empty (0)** | ⚖ illustration + [Search properties] / [My favorites] |
| **Highlight on** | Diff cells `bg-amber-50`, same dimmed, best value green |
| **Column sold/deleted** | "No longer available" + [✕ Remove] (auto-removable) |
| **Max reached (4)** | [+ Add] disabled + toast "Maximum 4 properties" |
| **Mixed deal type** | Notice "Sale and rent are mixed — prices in different units" |
| **Add modal open** | Favorites list + search → checkbox select |
| **Share copied** | Toast "Link copied" |
| **Error (batch fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<ComparePage> (Server shell SSR landing; table client)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <CompareHeader count max onAdd onShare onPrint highlight />
 ├─ <CompareTable properties={Property[]} highlight>   (client)
 │   ├─ <CompareColumnHeader property onRemove onFav onMessage /> (×N)
 │   └─ <CompareRow label values diffHighlight bestIndex />        (×rows)
 ├─ <AddPropertyModal favorites searchResults onSelect />          (lazy)
 ├─ <ShareModal url channels />                                     (lazy)
 ├─ <CompareBar selectedIds />        (floating, from search/favorites)
 └─ <EmptyCompare />                  (conditional: count===0)
```

### Data fields used

Batch fetch `properties(id, slug, title{}, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, property_type, deal_type, status, city, region, district, amenities[])` + `property_media(url, order)`. Computed: `price_per_m2 = price / area_m2`, `best_index` per numeric row, `diff` per row (whether the values are the same or not).

### API contracts

**`GET /api/properties?ids=8423,8501,8677`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 8423, "slug": "...", "title": { "hy": "Բնակարան Արաբկիր" },
      "price": 52000000, "currency": "AMD",
      "area": 75, "pricePerM2": 693333,
      "rooms": 2, "bedrooms": 2, "bathrooms": 1,
      "floor": 4, "floorsTotal": 9, "yearBuilt": 2018,
      "propertyType": "apartment", "dealType": "sale", "status": "active",
      "amenities": ["furniture","elevator"],
      "city": "Yerevan", "district": "Arabkir",
      "media": [{ "url": "...", "order": 0 }]
    }
    // ... up to 4
  ],
  "missing": [8677]   // deleted/sold: dropped ids
}
// 400 { "error": "too_many_ids" }   → max 4
```

**(P3) `GET /api/properties/[id]/distance?to=center`** → `200 { "km": 3.2 }`

**Reuse.** `POST /api/favorites` (♡ toggle) · `POST /api/conversations` (💬 write).

### Client state & validation (zod)

```ts
const idsSchema = z.string()
  .transform(s => s.split(",").map(Number).filter(Boolean))
  .pipe(z.array(z.number().int().positive()).max(4, "Maximum 4 properties"));
// example: "8423,8501,8677" → [8423, 8501, 8677]
```

- Selection store: Zustand (`compareIds: number[]`), sync URL `?ids=` + localStorage.
- Max 4: a 5th add attempt → toast, bar full.
- `missing[]` ids are dropped; an invalid id in a share link is silently dropped.
- Highlight diff: a row's unique values count > 1 → highlight; numeric best: min(price), max(area).
- **Currency.** All columns in the same (header) currency, live rate.
- **Mixed deal type.** Sale + rent can be mixed, but the price is "/month" vs total — notice.

---

## 6. Responsive

- **≥1024px (lg).** All columns visible without scroll (4×~200px); labels sticky left.
- **768–1023px (md).** 3+ columns → horizontal scroll; labels sticky.
- **<768px (sm).** Labels column narrow sticky (`w-24`), property columns swipe (`overflow-x-auto`, `min-w-[160px]`); header actions collapse; compare bar full-width at the bottom.
- **Print (`@media print`).** Table on one page, without nav/footer; long amenities list collapses; columns flex to the page width.

---

## 7. Accessibility

- Table: proper `<table><thead><tbody>` semantics, `<th scope>` for row/column labels.
- [✕ Remove]: `aria-label="Remove from comparison: {title}"`; [♡]: `aria-label="Save to favorites"`; [💬]: `aria-label="Write to seller"`.
- Highlight toggle: `role="switch"`, `aria-checked`; diff cells: not color only (also ✓/best label: color-blind safe).
- Photo: alt text (`{title} — {district}`); horizontal scroll: keyboard-accessible.
- Contrast ≥ 4.5:1; touch target ≥ 44px; share modal: focus trap + ESC.

---

## 8. SEO & meta

- `/compare` (without ids): static landing, **index** (explainer "How to compare properties" + CTA).
- `/compare?ids=...`: **noindex** (dynamic, personal).
- `<title>` = "Compare properties | {brand}"; the landing with a description explainer.
- OG tags for the shared comparison (optional dynamic preview image: N property thumbnails + price).
- `hreflang` (hy/ru/en) for the landing.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `compare_view` | Page load | `ids[], count` |
| `compare_add` | Compare checkbox / [+ Add] | `property_id` |
| `compare_remove` | [✕ Remove] | `property_id` |
| `compare_highlight_toggle` | Highlight switch | `on` |
| `compare_share` | [⤴ Share] copy/channel | `ids[], channel` |
| `compare_print` | [🖨 Print] | `ids[]` |
| `compare_favorite` | Column [♡] | `property_id` |
| `compare_message` | Column [💬 Write] | `property_id` |
| `compare_property_click` | Photo → property | `property_id` |
| `compare_max_reached` | 5th add attempt | `—` |
