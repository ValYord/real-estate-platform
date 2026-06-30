# Page 12 — Home Value Tool (Home valuation / "Zestimate") 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, formulas, validation), responsive, accessibility, SEO, analytics.

**URL.** `/home-value` — after the result, a shareable snapshot: `/home-value/[estimateHash]` (e.g., `/en/home-value/e8423ab`)
**Roles.** Everyone (Guest, User, Agent, Admin) can estimate and view; "Claim my home", saving, and value alerts require login (Guest → login modal with `?next`).
**Primary goal (conversion).** The owner learns the approximate value of their property, **claims their home**, or clicks **"Sell this property"** / **"Find an agent"**. This is a lead-generation page — the entry to the selling funnel.

> ⚠️ **Phase 1 / MVP model.** A simple heuristic: **district median price/m² × area**, adjusted by room/floor/year/condition coefficients. The real ML model (comparable sales regression) is Phase 3+.

---

## 0. Overview

This is the **trust-building lead-magnet page**. A person comes with a single question — "how much is my home worth" — and if we answer quickly and convincingly, they stay in the funnel: either claiming the home (retention) or moving on to the listing wizard (conversion). Therefore the page must: (1) start the flow without friction using a single field with address autocomplete, (2) quickly show a **value range** (not a single false-precise number) + confidence, (3) explain with transparency why that number (factors, comps, trend), and (4) keep a **legal disclaimer** at every step: "this is an estimate, not an appraisal".

The page has **three phases (state machine)**:
- **Input** — hero + address autocomplete (default).
- **Details** — if the address has no property in the database: a minimal form (m², type, condition…).
- **Result** — estimate range + comps + trend + factors + CTA.

The hero/intro is rendered with **SSR** (SEO, fast first paint); the estimate flow, charts, and autocomplete are client components (React Query + Recharts).

---

## 1. User scenarios

**Scenario A — Owner Gayane (desktop).** Gayane searched Google for "how much is my apartment worth" and landed on the page. She types "Arabkir, Komitas 12", autocomplete suggests the address, she selects it. The address is not in the database, so the details form opens: she fills in 75 m², 3 rooms, floor 4/9, "renovated". She clicks **[Calculate estimate]** → within 2 seconds sees "48,000,000 – 56,000,000 ֏", confidence "Medium". She clicks **[🏠 Claim my home]**, logs in, and the home is attached to her account. → Lead + retention (`home_claimed` event).

**Scenario B — Curious Artak (mobile).** Artak is simply curious about his neighbor's building. He types the address, the property exists in the database, and he goes straight to the result. He sees the range bar, scrolls to the comps — "3 similar properties recently sold" — and clicks one → property detail. He doesn't claim, but he sees the **[Mortgage calculator]** CTA and goes to the calculator with the estimated price prefilled. → cross-tool engagement (`hv_cta_clicked`).

**Scenario C — Considering-to-sell Nare (desktop).** Nare wants to sell. She receives an estimate of "32M – 38M ֏" and sees in the trend chart that prices in the district have risen 9% over 12 months. She decides to sell now and clicks **[Sell this property]** → the listing wizard opens with address/m²/type prefilled. → conversion to listing (`hv_sell_clicked`).

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│            HERO (bg-gradient, py-16, text-center)           │
│   «Find out how much your home is worth» (text-4xl bold)    │
│   subtitle (text-lg text-gray-500)                          │
│   ┌──────────────────────────────────────┐ [Estimate]      │
│   │ 📍 Enter the address… (autocomplete) │ (h-14)          │
│   └──────────────────────────────────────┘                 │
├────────────────────────────────────────────────────────────┤
│  ───────────  RESULT (appears after submit)  ───────────── │
│ ┌──────────────────────────────┬──────────────────────────┐│
│ │ ◄ MAIN (≈62%)                │ ► SIDEBAR (≈38%, sticky)  ││
│ │ ┌── Estimate card ──┐        │ ┌── CTA card ──┐          ││
│ │ │ 52,000,000 ֏      │        │ │ [🏠 Claim]    │          ││
│ │ │ range bar low–high│        │ │ [Sell]        │          ││
│ │ │ confidence badge  │        │ │ [Find agent]  │          ││
│ │ │ price/m² vs median│        │ │ [Mortg. calc] │          ││
│ │ └───────────────────┘        │ └──────────────┘          ││
│ │ DISCLAIMER (text-xs)         │                           ││
│ │ ── Comparable sold (grid) ── │                           ││
│ │ ── Price trend chart ──      │                           ││
│ │ ── Factors (↑/↓ list) ──     │                           ││
│ │ ── FAQ (accordion) ──        │                           ││
│ └──────────────────────────────┴──────────────────────────┘│
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ HERO (py-10)             │
│ «How much is your home»  │
│ ┌──────────────────────┐ │
│ │ 📍 address (autocompl.)│ │
│ └──────────────────────┘ │
│ [Estimate] (full-width)  │
├──────────────────────────┤
│ Estimate card            │
│ range bar low–high       │
│ confidence badge         │
│ DISCLAIMER               │
│ Comps (scroll-x)         │
│ Trend chart (responsive) │
│ Factors list             │
│ FAQ                      │
├──────────────────────────┤
│ FIXED BOTTOM BAR (h-16)  │
│ [🏠 Claim] [Sell]        │
│ FOOTER                   │
└──────────────────────────┘
```

- The sidebar CTA card is sticky `top-20` on desktop; on mobile it is replaced by a **fixed bottom bar** (`h-16`, primary [Claim] + secondary [Sell]).
- On mobile the comps are a horizontal scroll carousel (`overflow-x-auto snap-x`).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Hero heading | `text-4xl font-bold text-gray-900` (mobile: `text-2xl`) |
| Autocomplete input | `h-14 rounded-xl border border-gray-300 px-4 text-lg focus:ring-2 ring-primary` |
| Estimate (large number) | `text-4xl font-bold text-gray-900` |
| Estimate range (low–high) | `text-lg text-gray-600` |
| Range bar track | `h-2 rounded-full bg-gray-200`, fill: `bg-primary/30`, marker: `bg-primary w-3 h-3 rounded-full` |
| Confidence badge (high) | `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md` |
| Confidence badge (medium) | `bg-amber-100 text-amber-700` |
| Confidence badge (low) | `bg-gray-100 text-gray-600` |
| Disclaimer | `text-xs text-gray-400 leading-relaxed` |
| Factor ↑ | `text-green-600`, Factor ↓ `text-red-500` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-5` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Gap between sections | `space-y-6` (24px) |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Hero / Address input

- **Appearance.** Centered hero, `bg-gradient-to-b from-primary/5 to-white py-16`. Heading "Find out how much your home is worth", subtitle "Free valuation in seconds".
- **Address autocomplete (primary CTA).** A single field, `h-14`, 📍 icon on the left. Type-ahead, debounced 300ms → `GET /api/geo/autocomplete?q=`. The dropdown shows 5 suggestions (`{label, lat, lng, country, region, city, district, street}`), keyboard ↑/↓ + Enter selection.
- **Submit ([Estimate]).** If the selected address already has a property in the database (match by geo + address) → straight to the **Result** state. Otherwise → the **Details** state.
- **Behavior.** Submit without a selected address → inline error "Select an address from the list".
- **Microcopy.** placeholder "Enter the address (city, street, building)", button "Estimate".
- **Tech.** `<AddressAutocomplete onSelect={(geo)=>...} />` (client). The selection is stored in the URL query (`?lat=&lng=&addr=`) so the flow is shareable/restorable.

### 3.2 Property details form (Details state)

- **When.** The address has no property in the database. Opens inline as a card under the hero (not a new page).
- **Fields (minimal input for the heuristic):**
  - **Property type** (select): Apartment / House / Land / Commercial — `property_type` enum.
  - **Area (m²)** (number, required) — the main multiplier.
  - **Number of rooms** (number).
  - **Bedrooms / Bathrooms** (number, optional).
  - **Floor X / Total floors Y** (for buildings).
  - **Year built** (number) → age coefficient.
  - **Condition** (select): New construction / Renovated / Good / Needs renovation — coefficient.
- **Microcopy.** Button "Calculate estimate"; required hint "Area is required".
- **Behavior.** Submit → `POST /api/home-value/estimate` → loading skeleton → **Result**.
- **Tech.** `<PropertyDetailsForm geo={Geo} onEstimate={...} />`, react-hook-form + zod (see §5).

### 3.3 Estimate result card — **the conversion core**

- **Appearance.** `shadow-sm border rounded-xl p-6`. At the top a large number (the central estimate, in the selected currency), below it the range bar.
- **Estimate (large number).** `text-4xl font-bold`, in the selected currency (header currency switcher). Next to it, smaller, the original currency if it differs ("≈ $130,000").
  - **Formula (Phase 1):**
    ```
    base      = area_m2 × medianPricePerM2(country, city, district, property_type)
    estimate  = base
              × roomsCoeff       (deviation from median rooms: ±)
              × floorCoeff       (first/last floor -, middle neutral)
              × ageCoeff         (new +, old -, by year_built)
              × conditionCoeff   (renovated +, needs-work -)
    estimate  = clamp(estimate, median ± 3σ)   // outlier guard
    ```
- **Value RANGE (range bar).** `low — estimate — high`, in the currency.
  - **Formula:** `low = estimate × (1 − margin)`, `high = estimate × (1 + margin)`, where `margin ∈ [0.10, 0.20]`, determined by comparable density (many comps → narrow margin, few → wide).
- **Confidence indicator.** Badge: High (≥8 comps) / Medium (3–7) / Low (<3).
- **Price per m².** `estimate / area_m2` → display + comparison with the district median ("8% above the district ↑").
- **Disclaimer (required, below the card).** "This is an automated estimate based on public data, and **does not replace** a professional appraisal. The actual price may differ."
- **Tech.** `<EstimateResultCard estimate={Estimate} displayCurrency />`. Currency switch → re-render with live FX (converted from the base currency).

### 3.4 Comparable sold properties (Comps)

- **What it does.** 3–6 recently sold/archived similar properties in the same district. These are the source of the median price/m² (transparency).
- **Appearance.** Grid `grid-cols-1 md:grid-cols-3 gap-4`; mobile: scroll-x carousel.
- **On the card.** Photo, address, sale price, m², price/m², sale date, distance ("450 m").
- **Click** → property detail (`/property/[id]`).
- **Data.** `GET /api/home-value/comps?lat&lng&type&area_m2` → properties with `status=sold|archived`, PostGIS radius, ±20% area filter.
- **Empty state.** 0 comps → "No similar properties recently sold in this area" + the confidence badge is "Low".

### 3.5 Price trend chart (for the area)

- **What it does.** A Recharts area/line chart of the district median price/m² over time (12–36 months).
- **Appearance.** `h-[280px]`, X axis: months, Y: price/m² in the selected currency, tooltip on hover.
- **Toggle.** "My property's estimate" — overlay dashed line on the trend.
- **Data.** `GET /api/home-value/trend?city&district&type` → monthly median points (aggregated sold + active).
- **Empty state.** Too little data → "Not enough data for this district" + fallback city-level trend.

### 3.6 Factors affecting value

- **What it does.** Explains which factors affected the estimate and how (transparency, trust).
- **Appearance.** A list: icon + factor + direction (↑ green / ↓ red / → neutral) + tooltip.
- **Factors.** Location (district median, primary) · Area m² · Number of rooms · Floor (first/last ↓) · Year built / age · Condition / renovation · Market trend.
- **Microcopy (tooltip example).** "Renovated condition raised the estimate by ~6% compared to the district average".
- **Tech.** `factors[]` comes from the estimate response: `{ key, label, direction, weightPct, tooltip }`.

### 3.7 "Claim my home" flow

- **What it does.** The user declares "this is my home" → it is attached to their account, and they **track the value over time**.
- **[🏠 Claim my home]** button (sidebar CTA card / mobile bottom bar).
  - Guest → login/register modal (keeping `?next`).
  - Logged-in user → `POST /api/claimed-homes` (`user_id`, property snapshot, address, lat/lng, parameters).
- **Verification.** Light (account-level) in Phase 2; strong ownership proof (document) in Phase 3+.
- **Claimed home dashboard** (`/dashboard` → "My homes" tab).
  - Current estimate + arrow (↑/↓ from the previous month).
  - Value history chart (since the claim).
  - Value alerts toggle: "Notify me when the value changes by >X%" → notification/email.
  - **[Update details]** (renovation, room addition → recalc).
  - **[Sell this property]** → listing wizard prefilled (`/sell/new?fromClaim=...`).

### 3.8 CTA card (sidebar) — lead generation

- **Appearance.** `shadow-sm border rounded-xl p-5`, sticky `top-20`.
- **Buttons (vertical stack, `space-y-3`):**
  - **[🏠 Claim my home]** primary.
  - **[Sell this property]** → listing wizard prefilled (`/sell/new?addr=&area=&type=`).
  - **[Find an agent]** → `/agents?district=...`.
  - **[Mortgage calculator]** → `/mortgage/calculators?price={estimate}&currency=...`.
  - **[Get pre-approval]** → `/mortgage/rates` (Phase 3).
- **Microcopy.** Heading "What to do next".

### 3.9 FAQ / How it works

- Accordion: "How is the estimate calculated?", "How accurate is it?", "Why a range, not a single number?", "What is a claim?".
- **Tech.** `FAQPage` JSON-LD (SEO).

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **Input (default)** | Hero + autocomplete; result sections hidden |
| **Details** | Inline form (m², type, condition…) under the hero |
| **Estimating (loading)** | Estimate card skeleton (shimmer) + spinner in the button |
| **Result** | Estimate card + comps + trend + factors + CTA + disclaimer |
| **No data (area)** | "We can't value this area yet" + email-collect waitlist |
| **Low confidence** | The result is shown, but with a "Low" badge + extended disclaimer |
| **Already claimed** | "This home has already been claimed" (dispute flow: Phase 3) |
| **Error (API fail)** | "Something went wrong" + [Try again] |
| **Share view** | Read-only snapshot (`/home-value/[hash]`), CTAs active, no owner's personal data |

---

## 5. Technical depth

### Component tree

```
<HomeValuePage> (Server Component, SSR — hero/SEO)
 ├─ <HomeValueHero />
 │   └─ <AddressAutocomplete onSelect />        (client)
 ├─ <PropertyDetailsForm geo onEstimate />       (client, rhf+zod)
 ├─ <EstimateResultCard estimate displayCurrency />(client)
 │   └─ <ValueRangeBar low estimate high />
 ├─ <ComparablesGrid comps={Comp[]} />           (client, React Query)
 ├─ <PriceTrendChart points overlayEstimate />   (client, Recharts)
 ├─ <ValueFactorsList factors={Factor[]} />
 ├─ <HomeValueCtaCard estimate geo isOwner />    (client)
 │   └─ <ClaimHomeButton />                      (auth-gated)
 └─ <HomeValueFaq />                             (FAQPage JSON-LD)
```

### Data fields used (see 00-SPEC §7)

`properties: id, slug, deal_type, status(sold/archived for comps), property_type, price, currency, area_m2, rooms, floor, floors_total, year_built, country, region, city, district, lat, lng`
`claimed_homes (new): id, user_id, address, lat, lng, property_type, area_m2, rooms, floor, year_built, condition, base_currency, snapshot(json), alert_threshold_pct, created_at`
`home_value_estimates (cache/snapshot): hash, params(json), estimate, low, high, currency, confidence, factors(json), created_at`

### API contracts

**`GET /api/geo/autocomplete?q=Arabkir`**
```jsonc
// 200 OK
{ "items": [
  { "label": "Arabkir, Komitas 12, Yerevan",
    "lat": 40.20, "lng": 44.51,
    "country": "AM", "region": "Yerevan", "city": "Yerevan",
    "district": "Arabkir", "street": "Komitas 12" }
] }
```

**`POST /api/home-value/estimate`**
```jsonc
// request
{ "lat": 40.20, "lng": 44.51, "propertyType": "apartment",
  "areaM2": 75, "rooms": 3, "floor": 4, "floorsTotal": 9,
  "yearBuilt": 2008, "condition": "renovated" }
// 200 OK
{ "hash": "e8423ab",
  "estimate": 52000000, "low": 48000000, "high": 56000000,
  "currency": "AMD", "pricePerM2": 693000,
  "medianPricePerM2": 640000, "vsMedianPct": 8.3,
  "confidence": "medium", "compsCount": 5,
  "factors": [
    { "key": "location", "label": "District", "direction": "up", "weightPct": 100, "tooltip": "..." },
    { "key": "condition", "label": "Condition", "direction": "up", "weightPct": 6, "tooltip": "..." },
    { "key": "floor", "label": "Floor", "direction": "down", "weightPct": -3, "tooltip": "..." }
  ] }
// 422 { "error": "no_area_data", "fallbackLevel": "city" }
// 422 { "error": "invalid_input", "field": "areaM2" }
```

**`GET /api/home-value/comps?lat&lng&type&area_m2`** → `200 { "items": Comp[] }` (max 6)
**`GET /api/home-value/trend?city&district&type`** → `200 { "points": [{ "month": "2025-06", "medianPerM2": 640000 }] }`
**`POST /api/claimed-homes`** → `{ params }` → `201 { "claimedHomeId": 77 }` · `401 auth_required` · `409 already_claimed`
**`GET /api/claimed-homes`** → `200 { "items": ClaimedHome[] }` (login)
**`PATCH /api/claimed-homes/[id]`** → update parameters / alert settings → `200`

### Validation (zod)

```ts
const estimateSchema = z.object({
  lat: z.number(), lng: z.number(),
  propertyType: z.enum(["apartment","house","land","commercial"]),
  areaM2: z.number().min(5, "Area is too small").max(100000, "Unrealistic area"),
  rooms: z.number().int().min(0).max(50).optional(),
  floor: z.number().int().min(-3).max(200).optional(),
  floorsTotal: z.number().int().min(1).max(200).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  condition: z.enum(["new","renovated","good","needs_work"]).optional(),
});
```

- Outlier guard: `estimate` is clamped to within median ±3σ server-side.
- Currency convert: from the base currency with live FX (`GET /api/fx?from&to`); rate cache 1h.
- Claim/alert: requires auth (401 → login modal with `?next`).

---

## 6. Responsive

- **≥1024px (lg).** The result is two-column, sticky CTA sidebar (`top-20`); comps grid 3 columns; trend chart full-width in the main column.
- **768–1023px (md).** Single column; the CTA card is inline after the result; comps grid 2 columns.
- **<768px (sm).** Hero compact; autocomplete + button stack; comps scroll-x; **fixed bottom bar** ([🏠 Claim] / [Sell]); charts responsive via `ResponsiveContainer`.

---

## 7. Accessibility

- Autocomplete: `role="combobox"` + `aria-expanded` + `aria-activedescendant`; dropdown: `role="listbox"`, item: `role="option"`; keyboard ↑/↓/Enter/Esc.
- Range bar: `role="img"` + `aria-label="Estimated range from 48 million to 56 million drams"`; not by color alone — the low/high numbers in text.
- Confidence/factors indicate direction with icon + text (not by color alone).
- Disclaimers `role="note"`; errors `role="alert"`.
- Touch target ≥ 44px (CTAs `h-12/h-14`); contrast ≥ 4.5:1.
- For the chart: data table fallback (for screen readers).

---

## 8. SEO & meta

- `<title>` = "How much is my home worth — free valuation | {brand}"; `<meta name="description">` = "Find out the approximate value of your property in seconds…".
- Area landing pages (Phase 3): `/home-value/yerevan`, `/home-value/yerevan/arabkir` — local SEO.
- Structured data: `FAQPage` (FAQ section), `WebApplication` (tool).
- OG image: generic "Home value" banner (the estimate result is private, OG does not show a number).
- `hreflang` (hy/ru/en), `canonical` on the landing page; share snapshots: `noindex` (private).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `hv_address_selected` | Address selected from autocomplete | `country, city, district` |
| `hv_estimate_requested` | [Calculate] submit | `property_type, area_m2` |
| `hv_estimate_shown` | Result render | `estimate, confidence, comps_count` |
| `hv_no_data` | 422 no_area_data | `fallback_level` |
| `home_claimed` | Claim my home success | `claimed_home_id` |
| `hv_sell_clicked` | [Sell] CTA | `estimate` |
| `hv_find_agent_clicked` | [Find an agent] CTA | `district` |
| `hv_cta_clicked` | Mortgage/pre-approval CTA | `target` |
| `hv_comp_clicked` | Comp card click | `property_id` |
| `hv_trend_toggle` | Estimate overlay toggle | — |
| `hv_share` | Share snapshot link | `hash` |
