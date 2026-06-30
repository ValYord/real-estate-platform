# Page 20 — Neighborhood / Market Trends (Neighborhood / Market Trends) 🔵 Phase 3

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO (extended: programmatic), analytics.

**URL.** `/neighborhood/[area]` — e.g. `/hy/neighborhood/yerevan-arabkir`, `/hy/neighborhood/yerevan-kentron`
**Roles.** Everyone (Guest, User, Agent, Admin) can view.
**Primary goal.** Programmatic SEO — one template, hundreds of URLs, each neighborhood capturing "[neighborhood] real estate / prices" searches and directing them to `/search` and saved-search alerts.

---

## 0. Overview

This is the **main engine of programmatic SEO**: one React template that renders for hundreds of URLs (every neighborhood/area). Each page has **unique content** (median price, price trend, active listings, sold), so it's not thin/duplicate. A visitor searching for "Arabkir apartment price" reaches this page, sees the market picture, and moves to `/search?district=Arabkir` or creates an alert.

**Data source (Phase 3 nuance).** Market metrics are computed from: (1) our own `properties` + sold records (on-the-fly aggregate), (2) government/open statistics (demographics), (3) in Phase 3: possible external data partnerships. As long as the data is sparse: **graceful degradation** — we show only the available metrics and hide empty sections (we never show an incorrect chart).

The page renders via **ISR** (Incremental Static Regeneration) to pre-compute the heavy aggregates and serve fresh HTML to the Google crawl (e.g. with a daily regeneration cron). The interactive parts (chart toggle, Mapbox, carousel) are client components.

---

## 1. User scenarios

**Scenario A — Researching buyer Tigran (desktop).** Tigran reached the "Arabkir, Yerevan" page from Google. In Quick stats he sees a median of 52M֏, +4% YoY. In the price-trend chart he toggles to the 5-year view and hovers over the points: date + price. Scrolling down he sees the active listings carousel and clicks **[See all]** → `/search?district=Arabkir`. → the funnel worked (`area_view_listings_click`).

**Scenario B — Relocating Anna (mobile).** Anna doesn't know which neighborhood to choose. On the map she turns on the **[🏫 Schools]** and **[🚇 Transport]** layers and sees the nearby points. At the bottom she clicks **[Get an alert]** → a saved search is created for this area (behind login). → `area_alert_created`.

**Scenario C — Currency-switching David (desktop).** David switches the currency from AMD to USD in the header. Quick stats, the chart axis, and the sold list all re-render in $ (live rate). The chart's y-axis re-scales. → no reload, instant client recompute.

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Yerevan › Arabkir                     │
├────────────────────────────────────────────────────────────┤
│ ┌──── AREA HERO (h-[320px], static map bg) ──────────────┐ │
│ │ H1 «Arabkir, Yerevan — real estate market»             │ │
│ │ subtitle (SEO intro)                                    │ │
│ │ [52M֏ median][184 active][$690/m²][+4% YoY]  stat cards│ │
│ └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN (≈64%)                    │ ► ASIDE (≈36%)          │
│ ── Median price trend ──         │ ── Market activity ──   │
│ [Sale][Rent] [$/m²][total]       │ Days on market: 38      │
│ ┌── Recharts area h-[300px] ──┐  │ Sale-to-list: 97%       │
│ │ 12 months / 5 years toggle  │  │ Inventory: 184          │
│ └──────────────────────────────┘ │ [seller's market] chip  │
│ ── Active listings ──            │ ── Nearby neighborhoods ─│
│ [PropertyCard carousel] [All]    │ • Kanaker · Kanaker-Zeyt │
│ ── Recently sold ──              │ • Kentron · Nor Nork    │
│ table (address/price/date/m²)    │                          │
├──────────────────────────────────┴─────────────────────────┤
│ ── Map + POI (Mapbox h-[420px]) ──                          │
│ [🏫][🛒][🚇][🏥][🌳] layer toggles                          │
│ ── Demographics (chart cards, Phase 3) ──                   │
│ CTA «Search here» · «Get an alert»                         │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Back                   │
│ AREA HERO (h-[220px])    │
│ H1 (text-2xl)            │
│ [stat cards 2×2 grid]    │
│ ── Price trend chart ──  │
│ [toggle chips scroll-x]  │
│ chart h-[240px]          │
│ ── Active (scroll-x) ──  │
│ ── Market activity ──    │
│ ── Recently sold ──      │
│ ── Map h-[300px] ──      │
│ [layer chips scroll-x]   │
│ ── Nearby neighborhoods ─│
│ CTA (stacked)            │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BAR: [Search] [🔔] │
└──────────────────────────┘
```

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-3xl font-bold text-white` (over the hero, mobile: `text-2xl`) |
| Hero overlay | `bg-gradient-to-t from-black/60 to-transparent` |
| Stat card | `bg-white/95 backdrop-blur rounded-xl p-4 shadow-sm` |
| Stat value | `text-2xl font-bold text-gray-900` |
| Stat label | `text-xs text-gray-500` |
| YoY ↑ | `text-green-600` · YoY ↓ | `text-red-600` |
| Section heading (H2) | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8` |
| Chart toggle chip | active: `bg-primary text-white`, idle: `bg-gray-100 text-gray-700` |
| Chart area | `stroke-primary fill-primary/10` (Recharts) |
| Market chip (seller's) | `bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md` |
| Market chip (buyer's) | `bg-blue-100 text-blue-700` |
| Sold table row | `border-b border-gray-100 text-sm`, hover `bg-gray-50` |
| Map container | `h-[420px] rounded-xl overflow-hidden` (mobile `h-[300px]`) |
| Layer toggle | `bg-white shadow-sm rounded-full px-3 py-1.5 text-sm` (active: `bg-primary text-white`) |
| Nearby link | `text-primary hover:underline` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Breadcrumbs

- **Appearance.** `text-sm text-gray-500`, separator `›`, rendered with `BreadcrumbList` structured data.
- **Content.** `Home › Yerevan › Arabkir`. Each segment is a link (Yerevan → city page or `/search?city=Yerevan`).
- **Mobile.** `‹ Back`.

### 3.2 Area hero & quick stats

- **Appearance.** `h-[320px]` hero: background is a Mapbox **static map** with the neighborhood boundaries (boundary polygon overlay) + gradient.
- **H1.** "Arabkir, Yerevan — real estate market" (`{area_name}, {city}`).
- **Subtitle.** SEO intro: a short description of the area (CMS/generated, 1-2 sentences).
- **Quick stats row.** 4 stat cards: **Median price** (52M֏) · **Active listings** (184) · **Average $/m²** ($690) · **YoY change** (+4%, ↑ green / ↓ red). Null metric → card hidden (graceful).
- **Data.** `GET /api/market/[area]`.

### 3.3 Median price + trend chart

- **Appearance.** Recharts area/line chart, `h-[300px]`.
- **Toggles.** `[12 months] [5 years]` (period) · `[Sale] [Rent]` (deal) · `[$/m²] [Total price]` (metric). Active chip primary fill.
- **Currency.** From the header's selection (AMD/RUB/USD/EUR); on change, y-axis re-scale + client recompute (live rate).
- **Hover.** Tooltip: date + value + (optional) volume.
- **Edge.** < 6 data points → instead of the chart, "Not enough data for this area yet" (graceful, no incorrect line).
- **Data.** `GET /api/market/[area]/trends?period=&deal=&metric=`.

### 3.4 Active listings

- **Appearance.** "Active listings (184)" + PropertyCard carousel (the same card from search), ←/→ arrows; mobile `overflow-x-auto`.
- **Behavior.** **[See all]** → `/search?district=Arabkir` (pre-filled filter). Card click → `/property/[id]`.
- **Edge.** 0 active → "No active listings at the moment" + CTA "Get an alert".

### 3.5 Recently sold

- **Appearance.** Table: Address (generalized, not exact) · Price · Date · $/m² · (optional) price vs list difference.
- **Privacy.** Generalized data (neighborhood-level, not personal/exact address).
- **Edge.** No sold data → the entire section is hidden.
- **Data.** `GET /api/market/[area]/sold`.

### 3.6 Market activity

- **Metrics.** Days on market (38) · Sale-to-list ratio (97%) · Inventory (184) · activity heat indicator (**buyer's / balanced / seller's market** chip).
- **Appearance.** Small stat cards + (optional) sparkline (Recharts).
- **Edge.** Insufficient data → individual metric hidden or "—".

### 3.7 Map + POI (Mapbox)

- **Appearance.** Interactive Mapbox GL, `h-[420px] rounded-xl`, neighborhood boundary polygon + POI markers.
- **Layer toggles.** `[🏫 Schools] [🛒 Shops] [🚇 Transport] [🏥 Healthcare] [🌳 Parks]`. Toggle → marker layer show/hide.
- **Behavior.** Click marker → popup (name, type, distance).
- **Data.** `GET /api/market/[area]/poi` (Mapbox/OSM, Phase 3 sourcing).

### 3.8 Demographics (Phase 3)

- **Metrics.** Population · median age · household income · ownership vs rent ratio.
- **Appearance.** Small charts (Recharts); **the data source is indicated** ("Source: RA Statistical Committee").
- **Edge.** No data for the given country/area → the entire section is hidden (graceful).

### 3.9 Nearby neighborhoods & CTA

- **Nearby.** Links to adjacent neighborhoods → `/neighborhood/[other-area]` (internal linking cluster, SEO).
- **CTA.** **[Search properties in this neighborhood]** → `/search?area=` · **[Get an alert for this area]** → saved search (`08-saved-searches.md`, behind login).

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Hero skeleton + stat card skeleton + chart skeleton + carousel skeleton |
| **Loaded (full data)** | All sections: stats, chart, listings, sold, activity, map, demographics |
| **Sparse data** | Only the available metrics; empty sections hidden; instead of the chart, "Not enough data yet" |
| **No active listings** | "No active listings" + alert CTA |
| **Currency switch** | All amounts + chart axis re-render in the selected currency |
| **404 (bad area)** | "This area was not found" + [Go to search] |
| **Error (API fail)** | "Something went wrong" + [Try again] (section-level, in case of a partial fail) |
| **Map fail** | Static map fallback + "The map is unavailable" |

---

## 5. Technical depth

### Component tree

```
<NeighborhoodPage> (Server Component, ISR)
 ├─ <Breadcrumbs />
 ├─ <AreaHero name city statics />
 │   └─ <QuickStats stats />
 ├─ <PriceTrendChart areaId />              (client, Recharts)
 ├─ <ActiveListings areaId />               (client, React Query, carousel)
 ├─ <RecentlySold areaId />                 (client/server)
 ├─ <MarketActivity metrics />
 ├─ <NeighborhoodMap areaId poi />          (client, Mapbox)
 │   └─ <PoiLayerToggles />
 ├─ <Demographics areaId />                 (client, Phase 3)
 ├─ <NearbyNeighborhoods links />
 └─ <AreaCta area />                        (search + alert)
```

### Data fields used (aggregate, computed)

`area_slug, area_name, city, country, boundary_geojson, median_price, currency, active_count, price_per_m2, yoy_change, days_on_market, sale_to_list, inventory, market_type(buyers/balanced/sellers), trend_series[{date, value}], sold[{address_generic, price, date, price_per_m2}], poi[{type, name, lat, lng}], demographics{population, median_age, income, owner_ratio, source}, nearby[{slug, name}]`

Computation: aggregate from `properties` (active) + sold records; PostGIS geo query (within the `area` boundary); ISR/cron regeneration (cache).

### API contracts

**`GET /api/market/[area]`**
```jsonc
// 200 OK
{
  "area": "yerevan-arabkir",
  "name": "Արաբկիր", "city": "Yerevan", "country": "AM",
  "medianPrice": 52000000, "currency": "AMD",
  "activeCount": 184, "pricePerM2": 690, "pricePerM2Currency": "USD",
  "yoyChange": 4.2,
  "marketType": "sellers",
  "daysOnMarket": 38, "saleToList": 0.97, "inventory": 184
}
// 404 { "error": "area_not_found" }
```

**`GET /api/market/[area]/trends?period=12m&deal=sale&metric=total`**
```jsonc
// 200 OK
{
  "currency": "AMD",
  "series": [
    { "date": "2025-07", "value": 49800000 },
    { "date": "2025-08", "value": 50100000 }
  ],
  "pointCount": 12
}
// 200 (sparse)  { "series": [], "pointCount": 3, "insufficient": true }
```

**`GET /api/market/[area]/sold`** → `200 { "items": SoldRecord[] }`
**`GET /api/market/[area]/poi?layers=schools,transport`** → `200 { "items": Poi[] }`
**`GET /api/market/[area]/demographics`** → `200 { ...demographics, source } | 204 No Content`

### Validation (zod)

```ts
const trendsQuery = z.object({
  period: z.enum(["12m", "5y"]).default("12m"),
  deal: z.enum(["sale", "rent"]).default("sale"),
  metric: z.enum(["total", "per_m2"]).default("total"),
});
const poiQuery = z.object({
  layers: z.string().regex(/^[a-z,]+$/).optional(), // "schools,transport"
});
```

- `[area]` slug: validate from registry (non-existent → 404, not open redirect).
- Sparse guard: `pointCount < 6` → `insufficient: true`, client hides the chart.
- ISR `revalidate`: ~86400s (daily) + on-demand revalidate when a listing changes.

---

## 6. Responsive

- **≥1024px (lg).** Two-column (main + aside): chart/listings/sold on the left, market activity/nearby on the right; full-width map at the bottom.
- **768–1023px (md).** Single column, stat cards `grid-cols-4`, chart full-width.
- **<768px (sm).** `‹ Back`, stat cards `grid-cols-2`, chart/map toggle chips horizontal scroll, listings/sold horizontal scroll, **fixed bottom bar** [Search] + [🔔 alert].

---

## 7. Accessibility

- Chart: `role="img"` + `aria-label` (summary: "Median price trend, 12 months"), + a text alternative of the data (screen reader table fallback).
- Map: `aria-label` + keyboard-accessible layer toggles; "Open in Google Maps" fallback link.
- Stat cards: meaningful label (not just a number); YoY ↑/↓ + color + text ("rise"/"decline").
- Layer toggles: `aria-pressed`. Market type chip: text + color (not color alone). Contrast ≥ 4.5:1, touch target ≥ 44px.

---

## 8. SEO & meta (extended — programmatic landing pages)

- **Programmatic SEO.** One template → hundreds of URLs (every neighborhood). Each page: unique content (median, trend, listings) → not thin/duplicate; a page with thin data: `noindex` until enough content accumulates.
- **`<title>`** = "{area}, {city} real estate: prices, trends {year} | {brand}".
- **`<meta name="description">`** = generated summary: median + active count + YoY (≤ 155 chars).
- **Structured data (JSON-LD).** `Place` (geo, boundary) + `Dataset` (market stats, `dateModified`) + `BreadcrumbList`; for active listings `RealEstateListing` (ItemList).
- **`hreflang`** (hy/ru/en) + `x-default` for each area in 3 languages.
- **`canonical`** on every page (by area slug).
- **SSR / ISR.** Pre-render with market data (Google crawl + Core Web Vitals); daily regeneration = freshness signal.
- **Internal linking.** Nearby neighborhoods + property listings + guides cross-links → **topical authority cluster**.
- **Sitemap.xml.** Auto-includes all active areas; priority by inventory volume; `lastmod = regeneration date`.
- **OG / Twitter Card.** Map snapshot + median price overlay (dynamic `/api/og?type=area&slug=…`).
- **Multi-country.** The template is the same for all countries; the data source and availability depend on the country (in the CIS rollout).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `area_view` | Page load (dedupe 24h) | `area, city` |
| `area_chart_toggle` | Period/deal/metric chip | `area, period, deal, metric` |
| `area_chart_hover` | Tooltip (throttled) | `area, date` |
| `area_view_listings_click` | [See all] | `area` |
| `area_listing_card_click` | Carousel card | `area, property_id` |
| `area_map_layer_toggle` | POI layer toggle | `area, layer, on` |
| `area_alert_created` | Alert CTA → saved search | `area` |
| `area_nearby_click` | Nearby neighborhood link | `area, target_area` |
| `area_currency_recompute` | Header currency switch | `area, currency` |
