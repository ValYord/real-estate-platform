# Page 02 — Search Results + Map 🟢 Phase 1

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/sizes/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data, API), responsive, accessibility, SEO, analytics.

**URL.** `/search` · alias `/buy` (deal=sale) · `/rent` (deal=rent) · SEO landings: `/buy/yerevan`, `/rent/gyumri`
**Query params.** `?deal=sale&type=apartment&city=Yerevan&district=Arabkir&price_min=&price_max=&rooms=2&beds=2&baths=1&area_min=&sort=newest&page=1&bounds=lng1,lat1,lng2,lat2&view=split`
**Roles.** Everyone (Guest views/filters; save-search and favorite require login).
**Primary goal (conversion).** The visitor **filters and finds a matching property**, then moves on to the property page. Secondary: save the search (saved search + alert).

---

## 0. Overview

This is the **heart** of the site — a Zillow-style split layout: a scrollable listing grid on the left, a fixed Mapbox map on the right. The two are **synchronized**: the filter, the sort, and the bounds share the same state (via URL); hovering a card highlights its map pin and vice versa.

The page has three main parts: (1) a **filter bar** at the top (location, deal, price, type, beds, more, sort, view toggle, save-search), (2) a **listing grid** of PropertyCards + pagination, (3) a **map** with price-pins, clustering, and a "search this area" button.

The **URL = state** principle is critical: every filter/sort/page/bounds/view is kept in the URL query, so the search is shareable, browser back/forward works, and SSR renders the correct result. The SEO landings (`/buy/yerevan`) are the same template with a pre-filled filter and unique meta — "one template, a thousand URLs".

Render: **SSR** for the first page (SEO + first paint); the filter/map interactions are client-side (React Query, shallow URL update).

---

## 1. User scenarios

**Scenario A — Buyer Tigran (desktop).** Tigran lands on `/buy/yerevan`. He sees "1,234 properties for sale in Yerevan". He opens **Price ▾**, sets max 60M ֏, then **Beds ▾** → 2+. The results refresh (URL: `?price_max=60000000&beds=2`). When he hovers over a card, the corresponding map pin on the right enlarges. He zooms the map into Arabkir → **[Search this area]** appears, he clicks it → bounds filter.

**Scenario B — Renter Lilit (mobile).** Lilit is on `/rent`. She switches to **[🗺 Map]** mode via the toggle, a full-screen map, the pins showing prices. She taps a pin → a mini card rises from the bottom → tap → property page. She returns to **[List]** mode.

**Scenario C — Follower Ani (logged-in).** Ani filtered "Dilijan, house, max 40M", 0 results. She sees the empty state: "Nothing found". She clicks **[🔔 Save this search]** → a saved search is created with a daily alert, toast "We'll notify you about new properties".

---

## 2. Layout & visual structure

### Desktop (≥1024px) — split (listings + map)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                        │
├────────────────────────────────────────────────────────────┤
│ FILTER BAR (sticky top-16, h-14, bg-white border-b)         │
│ [🔍 Location][Buy/Rent][Price▾][Type▾][Beds▾][More▾] ... [Sort▾][⊞/🗺][🔔]│
├──────────────────────────────────┬─────────────────────────┤
│ ◄ LISTINGS (≈58%, scroll-y)      │ ► MAP (≈42%, sticky)     │
│  "1,234 properties" + active chips│                          │
│  ┌──────┐ ┌──────┐               │   📍52M  📍48M           │
│  │ Card │ │ Card │               │      📍 [25]             │
│  └──────┘ └──────┘               │   📍39M                  │
│  ┌──────┐ ┌──────┐               │  [Search this area]      │
│  │ Card │ │ Card │               │   ⊕ ⊖  (zoom controls)   │
│  └──────┘ └──────┘               │                          │
│  ◄ 1 2 3 … 12 ►  (pagination)    │                          │
├──────────────────────────────────┴─────────────────────────┤
│ FOOTER (for SEO landings: + description/internal links)     │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — toggle list ↔ map

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ FILTER BAR (scroll-x)   │
│ [Location][Filter▾][Sort▾]│
├──────────────────────────┤
│ "1,234 properties"  chips│
│ ┌────────────────────┐  │
│ │  PropertyCard      │  │
│ └────────────────────┘  │
│ ┌────────────────────┐  │
│ │  PropertyCard      │  │
│ └────────────────────┘  │
│ … pagination            │
├──────────────────────────┤
│ FIXED toggle (centered) │
│   [ 🗺 Map ]            │
└──────────────────────────┘
   (map mode → full-screen map + bottom mini-card)
```

- On mobile the list and the map **don't** fit at the same time → a floating toggle pill at the bottom (`[🗺 Map]` / `[☰ List]`).
- On mobile the filters open in a bottom-sheet modal (`[Filter ▾]` single button → the whole panel).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Filter bar | `sticky top-16 h-14 bg-white border-b border-gray-200 flex items-center gap-2 px-4 z-30` |
| Filter pill (default) | `border border-gray-300 rounded-full h-9 px-4 text-sm hover:border-gray-400` |
| Filter pill (active) | `border-primary bg-primary/5 text-primary` |
| Sort/View select | `border border-gray-300 rounded-lg h-9 px-3 text-sm` |
| Save-search button | `border border-primary text-primary rounded-full h-9 px-4 text-sm hover:bg-primary/5` |
| Results heading | `text-lg font-semibold text-gray-900` |
| Active filter chip | `bg-gray-100 text-gray-700 text-sm rounded-full px-3 py-1 inline-flex items-center gap-1` |
| Listing grid | `grid grid-cols-1 xl:grid-cols-2 gap-4 p-4` |
| Map container | `sticky top-[120px] h-[calc(100vh-120px)] rounded-none` |
| Price pin (default) | `bg-white border border-gray-300 rounded-full px-2 py-1 text-sm font-medium shadow` |
| Price pin (hover/active) | `bg-primary text-white border-primary scale-110` |
| Price pin (visited) | `bg-gray-100 text-gray-500` |
| Cluster | `bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold` |
| "Search this area" | `bg-white shadow-md rounded-full px-4 h-10 text-sm font-medium absolute top-4 left-1/2 -translate-x-1/2` |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-72` |

---

## 3. Section-by-section

### 3.1 Filter bar

A sticky strip below the header. Left to right: location → deal toggle → price → type → beds/baths → more → (spacer) → sort → view toggle → save-search.

- **Location input.** Autocomplete (the same component as the home hero), changes `city`/`district`/`q`. The selection re-centers the map on that area.
- **Deal toggle.** `[Buy] [Rent]` segmented control. Changes the `deal` param; for rent the price filter becomes "/month".
- **Price ▾.** Dropdown: min/max inputs (in the selected currency) + dual-range slider. In the active state the pill shows "up to 60M ֏" / "20–60M ֏".
- **Type ▾.** Multi-select checkbox dropdown: Apartment · House · Land · Commercial · New construction · Garage. Active: "Apartment +1".
- **Beds/Baths ▾.** `1+ 2+ 3+ 4+ 5+` segmented (bedrooms) + a separate row for bathrooms.
- **More ▾ (More filters).** Modal/popover: area min/max (m²), floor (min/max), year built, condition (new construction/renovated/good/needs renovation), amenities (parking, elevator, furniture, heating, balcony, air conditioning, security), "Exclude hidden address". At the bottom **[Show N properties]** (live count) + **[Clear]**.
- **Sort ▾.** Newest (default) · Price ↑ · Price ↓ · Area ↓ · Most viewed. Changes the `sort` param.
- **View toggle.** `[⊞ List] [🗺 Map] [⊞🗺 Both]` (desktop default = Both).
- **[🔔 Save this search].** Logged-in → creates a saved_search with the current filter + alert frequency choice (instant/daily/weekly). Guest → login modal "Sign in to save the search".
- **States.** Changing a filter re-fetches the results (loading skeleton); the active pill becomes colored; **[Clear all]** appears when ≥1 filter is active.

### 3.2 Results heading + active chips

- **Heading.** "1,234 properties for sale in Yerevan" — count + location + deal (grammar per locale rules).
- **Active chips.** Each active filter: a chip with ✕ ("2+ beds ✕", "up to 60M ֏ ✕"). ✕ → removes ONLY that filter (URL update + re-fetch).
- **[Clear all].** Resets all filters (except location, depending on choice).

### 3.3 Listings (left column)

- **Grid.** PropertyCards (`grid-cols-1 xl:grid-cols-2`), 20/page.
- **PropertyCard.**
  - Photo slider (←/→ arrows on hover, dots at the bottom), badge: NEW (`bg-green-100 text-green-700`) / REDUCED (`bg-orange-100`) / FEATURED (`bg-amber-100`) / SOLD (overlay).
  - ♡ favorite (top-right overlay): toggle, optimistic, toast; guest → login modal.
  - Price `text-lg font-bold` (in the selected currency; rent: "/month").
  - Key facts: 🛏 2 · 🛁 1 · 📐 75 m² · 4/9 floor (icon row).
  - Address/district `text-sm text-gray-500`.
  - Card click → `/property/[id]/[slug]` (middle-click → new tab).
- **Card hover ↔ map sync.** Hover → the corresponding map pin is highlighted (`scale-110 bg-primary`); pin hover → the card in the scroll is highlighted (`ring-2 ring-primary`).
- **Pagination.** At the bottom `◄ 1 2 3 … 12 ►` → URL `?page=2` (scroll to top). On mobile it can be "Load more" / infinite scroll.
- **Loading.** 6–8 skeleton cards with shimmer.

### 3.4 Map (right column)

- **Mapbox GL** sticky, `h-[calc(100vh-120px)]`. Pins: a **price label** (not a plain marker): "52M", "350K /month".
- **Pin states.** default (white pill), hover/active (primary filled), visited (gray — localStorage).
- **Pin click** → mini popup card (photo, price, beds/area, address) → click → property; the popup's ♡ also works.
- **Clustering.** Nearby pins are grouped by count (`[25]`) depending on the zoom level; cluster click → zoom in / spiderfy.
- **[Search this area].** Appears at the top when panning/zooming the map; click → filters by the current `bounds` (URL `?bounds=...`), the heading is updated. Toggle option "Search as I move the map" (auto-search on move).
- **Zoom controls** (⊕/⊖) + geolocate ("My location").
- **Draw tool** (manually draw an area) — Phase 2.
- **Map ↔ List sync.** The same filter/bounds; when bounds change the list re-fetches (debounce 500ms or manual "Search this area").
- **Loading.** Map skeleton (gray tiles) + pins fade-in; *error* (Mapbox token/network): fallback "Map unavailable" + the list full-width.

### 3.5 Empty state

- **0 results.** Centered illustration + "Nothing found with the selected filters". Suggestions: **[Clear filters]** · **[Expand the area]** · **[🔔 Create alert]** ("We'll notify you when a new property appears"). The map stays, but without pins.

### 3.6 SEO landing pages (`/buy/yerevan`)

- The same template pre-filled with a filter (`city=Yerevan&deal=sale`).
- Has an additional **SEO content block** above the footer: an area description, the average price, internal links to districts/types ("Apartments in Arabkir", "Houses in Yerevan").
- Unique `<title>`/`<meta>` and breadcrumbs for that area.

---

## 4. Page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton cards on the left + map gray tiles, pins fade-in |
| **Loaded** | Grid + map + heading count + active chips |
| **Filtering** | Re-fetch — skeleton overlay over the grid, map pins update |
| **Empty (0 results)** | "Nothing found" + [Clear] / [Expand] / [Alert] |
| **Map error** | "Map unavailable" fallback, the list full-width |
| **API error** | "Something went wrong" + [Retry] |
| **Save-search (guest)** | Login modal with `?next` |
| **Save-search (success)** | Toast "Search saved — we'll notify you" |
| **Pagination beyond range** | Redirect to the last valid page / empty + "Back to start" |
| **Mobile map mode** | Full-screen map + bottom mini-card + [☰ List] toggle |

---

## 5. Technical depth

### Component tree

```
<SearchPage> (Server Component, SSR — initial query)
 ├─ <Header />                                       (shared)
 ├─ <FilterBar value={Filters} onChange />           (client — URL sync)
 │   ├─ <LocationAutocomplete />
 │   ├─ <DealToggle /> <PriceFilter /> <TypeFilter />
 │   ├─ <BedsBathsFilter /> <MoreFiltersModal />
 │   ├─ <SortSelect /> <ViewToggle />
 │   └─ <SaveSearchButton />                         (auth-gated)
 ├─ <ResultsHeader count chips />
 ├─ <ListingsPanel>                                  (client — React Query)
 │   ├─ <PropertyCard property hover sync /> × N
 │   └─ <Pagination page total />
 ├─ <SearchMap properties bounds onBoundsChange />   (client — Mapbox)
 │   ├─ <PricePin /> × N  <Cluster />
 │   ├─ <SearchThisAreaButton />
 │   └─ <PinPopup />
 ├─ <EmptyState />                                   (conditional)
 ├─ <SeoContentBlock />                              (for landings)
 └─ <Footer />
```

### Data fields used (00-SPEC §7)

`properties`: `id, slug, title{locale}, deal_type, status, property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, city, district, lat, lng, hide_exact_address, is_featured, created_at, property_media[]` + `favorites` (for the logged-in user's state). The geo query via PostGIS: `lat/lng` + bounds (`ST_MakeEnvelope`) / radius.

### API contracts

**`GET /api/properties?deal=sale&city=Yerevan&price_max=60000000&beds=2&sort=newest&page=1&bounds=44.4,40.1,44.6,40.3`**
```jsonc
// 200 OK
{
  "items": [
    { "id": 8423, "slug": "yerevan-arabkir-2-senyak-bnakaran",
      "title": { "hy": "2 սենյականոց բնակարան" },
      "price": 52000000, "currency": "AMD", "dealType": "sale",
      "area": 75, "rooms": 2, "bedrooms": 2, "bathrooms": 1,
      "floor": 4, "floorsTotal": 9,
      "city": "Yerevan", "district": "Arabkir",
      "lat": 40.20, "lng": 44.49,
      "cover": "https://.../cover.jpg",
      "badges": ["new"], "isFavorited": false }
  ],
  "total": 1234,
  "page": 1, "pageSize": 20, "totalPages": 62,
  "facets": { "types": { "apartment": 980, "house": 210 },
              "priceRange": { "min": 12000000, "max": 320000000 } },
  "mapPins": [ { "id": 8423, "lat": 40.20, "lng": 44.49, "price": 52000000, "currency": "AMD" } ]
}
// 422 { "error": "invalid_filters", "fields": { "price_max": "must be > price_min" } }
```

**`POST /api/saved-searches`**
```jsonc
// request  { "filters": { "deal": "sale", "city": "Yerevan", "priceMax": 60000000, "beds": 2 },
//            "alertFrequency": "daily" }
// 201      { "id": 77 }
// 401      { "error": "auth_required" }   → login modal
```

**`POST /api/favorites`** → `{ "propertyId": 8423 }` → `200 { "favorited": true }` (401 → login modal)

### Validation (zod) — filters

```ts
const filtersSchema = z.object({
  deal: z.enum(["sale", "rent"]).default("sale"),
  type: z.array(z.enum(["apartment","house","land","commercial","newdev","garage"])).optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  priceMin: z.coerce.number().int().nonnegative().optional(),
  priceMax: z.coerce.number().int().positive().optional(),
  beds: z.coerce.number().int().min(0).max(10).optional(),
  baths: z.coerce.number().int().min(0).max(10).optional(),
  areaMin: z.coerce.number().positive().optional(),
  sort: z.enum(["newest","price_asc","price_desc","area_desc","most_viewed"]).default("newest"),
  page: z.coerce.number().int().positive().default(1),
  bounds: z.string().regex(/^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/).optional(),
}).refine(d => !d.priceMax || !d.priceMin || d.priceMax >= d.priceMin, {
  message: "The maximum price must be greater than the minimum", path: ["priceMax"],
});
```

- **URL = state.** All filters serialize into URLSearchParams; navigate `router.push(..., { scroll: false })`.
- **Performance.** Pagination 20/page; map pins: only the viewport's + a cap (e.g. 300, more → cluster); `next/image` lazy; bounds query debounce 500ms; React Query cache (keepPreviousData).

---

## 6. Responsive

- **≥1024px (lg/xl).** Split view: listings (~58%) + sticky map (~42%); grid 2-col (`xl`).
- **768–1023px (md).** Listings full-width 1–2 col; map: via toggle (default list); filter bar: pills scroll-x.
- **<768px (sm).** One mode at a time; floating `[🗺 Map]/[☰ List]` toggle; the filters via bottom-sheet modal; map mode = full-screen + bottom mini-card; pagination → "Load more".

---

## 7. Accessibility

- The filter pills: real `<button>`s with `aria-expanded` (dropdown), the active state: not only by color but also by text/icon.
- The results count: `role="status" aria-live="polite"` (when a filter changes, "1,234 properties" is announced).
- The PropertyCard: the whole thing an accessible link, the ♡: a separate `aria-label="Add to favorites"`.
- The map: `aria-label`, keyboard pan/zoom; the pins tab-accessible or "Open in list" fallback; "Open in Google Maps" link.
- The map-list sync must not steal focus for a keyboard-only user.
- Contrast ≥ 4.5:1; touch target ≥ 44px (the pins and pills).

---

## 8. SEO & meta

- **Location landings** (`/buy/yerevan`, `/rent/gyumri`): separate SSR, unique `<title>` ("Apartments for sale in Yerevan | {brand}"), `<meta description>`, H1 with the area. This is the equivalent of "Massachusetts homes for sale": **one template, a thousand URLs**.
- Structured data (JSON-LD): `ItemList` (the results) + `BreadcrumbList` (Home › Yerevan › Sale).
- `canonical` for filtered pages: to the canonical landing (avoid duplicates); deep filters with params: `noindex` (page>1, bounds, many params).
- `hreflang` (hy/ru/en); pagination: rel prev/next (or canonical to page 1).
- Internal linking: districts/types via crawlable `<a>` on the landings.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `search_view` | Page load | `deal, city, filters_count, results_total` |
| `filter_apply` | Filter change | `filter_key, value` |
| `filter_clear` | [Clear all] / chip ✕ | `filter_key?` |
| `sort_change` | Sort selection | `sort` |
| `view_toggle` | List/Map/Both | `view` |
| `map_search_this_area` | "Search this area" | `bounds, results_total` |
| `map_pin_click` | Pin click | `property_id` |
| `card_click` | PropertyCard click | `property_id, position, page` |
| `favorite_add` / `favorite_remove` | ♡ toggle | `property_id` |
| `save_search` | Save search | `filters, alert_frequency` |
| `pagination_change` | Page change | `page` |
| `empty_results` | 0 results render | `filters` |
