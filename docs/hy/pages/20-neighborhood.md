# Էջ 20 — Neighborhood / Market Trends (Թաղամաս / Շուկայի տրենդներ) 🔵 Phase 3

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO (ընդլայնված՝ programmatic), analytics։

**URL.** `/neighborhood/[area]` — օրինակ՝ `/hy/neighborhood/yerevan-arabkir`, `/hy/neighborhood/yerevan-kentron`
**Roles.** Բոլորը (Guest, User, Agent, Admin) դիտում են։
**Primary goal.** Programmatic SEO — մեկ template, հարյուրավոր URL, ամեն թաղամաս գրավում է «[թաղամաս] անշարժ գույք / գներ» որոնումները և ուղղորդում `/search`-ին ու saved-search alert-ին։

---

## 0. Ակնարկ (Overview)

Սա **programmatic SEO-ի գլխավոր մեքենան է**՝ մեկ React template, որ render-վում է հարյուրավոր URL-ի համար (ամեն թաղամաս/տարածք)։ Ամեն էջ ունի **ունիկ բովանդակություն** (median գին, գնի տրենդ, ակտիվ listings, sold), ուստի ոչ thin/duplicate։ Այցելուն, ով որոնում է «Արաբկիր բնակարան գին», հասնում է այստեղ, տեսնում շուկայի պատկերը և անցնում `/search?district=Arabkir`-ին կամ ստեղծում alert։

**Տվյալների աղբյուր (Phase 3 nuance).** Շուկայի մետրիկները հաշվարկվում են՝ (1) մեր սեփական `properties` + sold records-ից (on-the-fly aggregate), (2) պետական/բաց վիճակագրությունից (demographics), (3) Phase 3-ում՝ հնարավոր external data partnerships։ Քանի դեռ տվյալը նոսր է՝ **graceful degradation** — ցույց ենք տալիս միայն հասանելի մետրիկները, դատարկ բաժինները թաքցնում (երբեք սխալ chart չենք ցույց տալիս)։

Էջը render-վում է **ISR**-ով (Incremental Static Regeneration)՝ ծանր aggregate-ները pre-compute անելու և Google crawl-ին թարմ HTML մատուցելու համար (օր.՝ ամենօրյա regeneration cron-ով)։ Ինտերակտիվ մասերը (chart toggle, Mapbox, carousel) client component-ներ են։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Հետազոտող գնորդ Տիգրանը (desktop).** Տիգրանը Google-ից հասել է «Արաբկիր, Երևան» էջին։ Quick stats-ում տեսնում է median 52M֏, +4% YoY։ Price-trend chart-ում toggle-ով անցնում 5 տարվա view-ի, hover անում point-երի վրա՝ ամսաթիվ + գին։ Scroll անելով տեսնում ակտիվ listings carousel, սեղմում **[Տեսնել բոլորը]** → `/search?district=Arabkir`։ → funnel աշխատեց (`area_view_listings_click`)։

**Սցենար Բ — Տեղափոխվող Աննան (mobile).** Աննան չգիտի՝ որ թաղամասն ընտրի։ Քարտեզում միացնում **[🏫 Դպրոցներ]** ու **[🚇 Տրանսպորտ]** շերտերը, տեսնում մոտակա կետերը։ Ներքևում սեղմում **[Ստացի՛ր alert]** → saved search ստեղծվում է այս տարածքի համար (login-ի հետևում)։ → `area_alert_created`։

**Սցենար Գ — Արժույթ փոխող Դավիթը (desktop).** Դավիթը header-ից փոխում է արժույթը AMD-ից USD։ Quick stats, chart axis, sold ցանկ՝ բոլորը re-render են լինում $-ով (live rate)։ Chart-ի y-axis-ը նորից scale-վում է։ → ոչ մի reload, instant client recompute։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Երևան › Արաբկիր                     │
├────────────────────────────────────────────────────────────┤
│ ┌──── AREA HERO (h-[320px], static map bg) ──────────────┐ │
│ │ H1 «Արաբկիր, Երևան — անշարժ գույքի շուկա»               │ │
│ │ ենթավերնագիր (SEO intro)                                │ │
│ │ [52M֏ median][184 ակտիվ][$690/m²][+4% YoY]  stat cards │ │
│ └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN (≈64%)                    │ ► ASIDE (≈36%)          │
│ ── Median price trend ──         │ ── Market activity ──   │
│ [Վաճառք][Վարձ] [$/m²][ընդ.]      │ Days on market: 38      │
│ ┌── Recharts area h-[300px] ──┐  │ Sale-to-list: 97%       │
│ │ 12 ամիս / 5 տարի toggle     │  │ Inventory: 184          │
│ └──────────────────────────────┘ │ [seller's market] chip  │
│ ── Ակտիվ հայտարարություններ ──   │ ── Nearby թաղամասներ ── │
│ [PropertyCard carousel] [Բոլորը] │ • Քանաքեռ · Քանաքեռ-Զեյթ │
│ ── Վերջերս վաճառված ──           │ • Կենտրոն · Նոր Նորք    │
│ աղյուսակ (հասցե/գին/ամսաթիվ/m²)  │                          │
├──────────────────────────────────┴─────────────────────────┤
│ ── Քարտեզ + POI (Mapbox h-[420px]) ──                       │
│ [🏫][🛒][🚇][🏥][🌳] layer toggles                          │
│ ── Demographics (chart cards, Phase 3) ──                   │
│ CTA «Որոնի՛ր այստեղ» · «Ստացի՛ր alert»                     │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Հետ                    │
│ AREA HERO (h-[220px])    │
│ H1 (text-2xl)            │
│ [stat cards 2×2 grid]    │
│ ── Price trend chart ──  │
│ [toggle chips scroll-x]  │
│ chart h-[240px]          │
│ ── Ակտիվ (scroll-x) ──   │
│ ── Market activity ──    │
│ ── Վերջերս վաճառված ──   │
│ ── Քարտեզ h-[300px] ──   │
│ [layer chips scroll-x]   │
│ ── Nearby թաղամասներ ──  │
│ CTA (stacked)            │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BAR: [Որոնել] [🔔] │
└──────────────────────────┘
```

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-3xl font-bold text-white` (hero-ի վրա, mobile՝ `text-2xl`) |
| Hero overlay | `bg-gradient-to-t from-black/60 to-transparent` |
| Stat card | `bg-white/95 backdrop-blur rounded-xl p-4 shadow-sm` |
| Stat value | `text-2xl font-bold text-gray-900` |
| Stat label | `text-xs text-gray-500` |
| YoY ↑ | `text-green-600` · YoY ↓ | `text-red-600` |
| Բաժնի վերնագիր (H2) | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8` |
| Chart toggle chip | active՝ `bg-primary text-white`, idle՝ `bg-gray-100 text-gray-700` |
| Chart area | `stroke-primary fill-primary/10` (Recharts) |
| Market chip (seller's) | `bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md` |
| Market chip (buyer's) | `bg-blue-100 text-blue-700` |
| Sold table row | `border-b border-gray-100 text-sm`, hover `bg-gray-50` |
| Map container | `h-[420px] rounded-xl overflow-hidden` (mobile `h-[300px]`) |
| Layer toggle | `bg-white shadow-sm rounded-full px-3 py-1.5 text-sm` (active՝ `bg-primary text-white`) |
| Nearby link | `text-primary hover:underline` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Breadcrumbs

- **Տեսք.** `text-sm text-gray-500`, separator `›`, render `BreadcrumbList` structured data-ով։
- **Բովանդակություն.** `Գլխավոր › Երևան › Արաբկիր`։ Ամեն հատված link (Երևան → city էջ կամ `/search?city=Yerevan`)։
- **Mobile.** `‹ Հետ`։

### 3.2 Area hero & quick stats

- **Տեսք.** `h-[320px]` hero՝ background-ը Mapbox **static map** թաղամասի սահմաններով (boundary polygon overlay) + gradient։
- **H1.** «Արաբկիր, Երևան — անշարժ գույքի շուկա» (`{area_name}, {city}`)։
- **Ենթավերնագիր.** SEO intro՝ տարածքի կարճ նկարագիր (CMS/generated, 1-2 նախադասություն)։
- **Quick stats row.** 4 stat card՝ **Median գին** (52M֏) · **Ակտիվ հայտարարություն** (184) · **Միջին $/m²** ($690) · **YoY փոփոխություն** (+4%, ↑ կանաչ / ↓ կարմիր)։ Null մետրիկ → card թաքնված (graceful)։
- **Տվյալ.** `GET /api/market/[area]`։

### 3.3 Median price + trend chart

- **Տեսք.** Recharts area/line chart, `h-[300px]`։
- **Toggle-ներ.** `[12 ամիս] [5 տարի]` (period) · `[Վաճառք] [Վարձ]` (deal) · `[$/m²] [Ընդհանուր գին]` (metric)։ Active chip primary fill։
- **Արժույթ.** Header-ի ընտրությունից (AMD/RUB/USD/EUR); փոխելիս y-axis re-scale + client recompute (live rate)։
- **Hover.** Tooltip՝ ամսաթիվ + արժեք + (optional) volume։
- **Edge.** < 6 data point → chart-ի փոխարեն «Բավարար տվյալ չկա այս տարածքի համար դեռ» (graceful, ոչ սխալ գիծ)։
- **Տվյալ.** `GET /api/market/[area]/trends?period=&deal=&metric=`։

### 3.4 Active listings

- **Տեսք.** «Ակտիվ հայտարարություններ (184)» + PropertyCard carousel (նույն card-ը search-ից), ←/→ arrows; mobile `overflow-x-auto`։
- **Վարք.** **[Տեսնել բոլորը]** → `/search?district=Arabkir` (նախալցված ֆիլտր)։ Card click → `/property/[id]`։
- **Edge.** 0 ակտիվ → «Այս պահին ակտիվ հայտարարություն չկա» + CTA «Ստացի՛ր alert»։

### 3.5 Recently sold

- **Տեսք.** Աղյուսակ՝ Հասցե (ընդհանրացված, ոչ ճշգրիտ) · Գին · Ամսաթիվ · $/m² · (optional) գնի vs list տարբերություն։
- **Privacy.** Ընդհանրացված տվյալ (թաղամաս-մակարդակ, ոչ անձնական/ճշգրիտ հասցե)։
- **Edge.** Sold տվյալ չկա → ամբողջ բաժինը թաքնված։
- **Տվյալ.** `GET /api/market/[area]/sold`։

### 3.6 Market activity

- **Մետրիկներ.** Days on market (38) · Sale-to-list ratio (97%) · Inventory (184) · ակտիվության heat indicator (**buyer's / balanced / seller's market** chip)։
- **Տեսք.** Փոքր stat card-ներ + (optional) sparkline (Recharts)։
- **Edge.** Անբավարար տվյալ → individual մետրիկ թաքնված կամ «—»։

### 3.7 Map + POI (Mapbox)

- **Տեսք.** Ինտերակտիվ Mapbox GL, `h-[420px] rounded-xl`, թաղամասի boundary polygon + POI markers։
- **Layer toggle-ներ.** `[🏫 Դպրոցներ] [🛒 Խանութներ] [🚇 Տրանսպորտ] [🏥 Առողջապահություն] [🌳 Զբոսայգիներ]`։ Toggle → marker layer show/hide։
- **Վարք.** Click marker → popup (անվանում, տիպ, հեռավորություն)։
- **Տվյալ.** `GET /api/market/[area]/poi` (Mapbox/OSM, Phase 3 sourcing)։

### 3.8 Demographics (Phase 3)

- **Մետրիկներ.** Բնակչություն · միջին տարիք · տնային տնտեսության եկամուտ · սեփականություն vs վարձ հարաբերակցություն։
- **Տեսք.** Փոքր chart-եր (Recharts); **տվյալի աղբյուրը նշվում է** («Աղբյուր՝ ՀՀ վիճ. կոմիտե»)։
- **Edge.** Տվյալ չկա տվյալ երկրի/տարածքի համար → ամբողջ բաժինը թաքնված (graceful)։

### 3.9 Nearby neighborhoods & CTA

- **Nearby.** Հարակից թաղամասների link-եր → `/neighborhood/[other-area]` (internal linking cluster, SEO)։
- **CTA.** **[Որոնի՛ր գույք այս թաղամասում]** → `/search?area=` · **[Ստացի՛ր alert այս տարածքի համար]** → saved search (`08-saved-searches.md`, login-ի հետևում)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Hero skeleton + stat card skeleton + chart skeleton + carousel skeleton |
| **Loaded (full data)** | Բոլոր բաժինները՝ stats, chart, listings, sold, activity, map, demographics |
| **Sparse data** | Միայն հասանելի մետրիկները; դատարկ բաժինները թաքնված; chart-ի փոխարեն «Բավարար տվյալ չկա դեռ» |
| **No active listings** | «Ակտիվ հայտարարություն չկա» + alert CTA |
| **Currency switch** | Բոլոր գումարները + chart axis re-render ընտրված արժույթով |
| **404 (bad area)** | «Այս տարածքը չգտնվեց» + [Դեպի որոնում] |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] (բաժին-մակարդակ՝ partial fail-ի դեպքում) |
| **Map fail** | Static map fallback + «Քարտեզը հասանելի չէ» |

---

## 5. Տեխնիկական խորություն (Technical)

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

Հաշվարկ՝ `properties` (active) + sold records-ից aggregate; PostGIS geo query (`area` boundary-ի ներսում); ISR/cron regeneration (cache)։

### API contract-ներ

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

- `[area]` slug՝ validate registry-ից (չգոյ → 404, ոչ open redirect)։
- Sparse guard՝ `pointCount < 6` → `insufficient: true`, client թաքցնում chart-ը։
- ISR `revalidate`՝ ~86400s (օրական) + on-demand revalidate listing փոփոխության դեպքում։

---

## 6. Responsive

- **≥1024px (lg).** Երկսյունակ (main + aside)՝ chart/listings/sold ձախ, market activity/nearby աջ; full-width map ներքև։
- **768–1023px (md).** Մեկ սյունակ, stat cards `grid-cols-4`, chart full-width։
- **<768px (sm).** `‹ Հետ`, stat cards `grid-cols-2`, chart/map toggle chips horizontal scroll, listings/sold horizontal scroll, **fixed bottom bar** [Որոնել] + [🔔 alert]։

---

## 7. Accessibility

- Chart-ը՝ `role="img"` + `aria-label` (ամփոփ՝ «Median գնի դինամիկա, 12 ամիս»), + տվյալների տեքստ-տարբերակ (screen reader table fallback)։
- Map-ը՝ `aria-label` + keyboard-հասանելի layer toggle-ներ; «Բացել Google Maps-ում» fallback link։
- Stat card-ները՝ իմաստալից label (ոչ միայն թիվ); YoY-ի ↑/↓-ը + գույն + տեքստ («աճ»/«նվազում»)։
- Layer toggle-ները՝ `aria-pressed`։ Market type chip՝ տեքստ + գույն (ոչ միայն գույն)։ Contrast ≥ 4.5:1, touch target ≥ 44px։

---

## 8. SEO & meta (ընդլայնված — programmatic landing pages)

- **Programmatic SEO.** Մեկ template → հարյուրավոր URL (ամեն թաղամաս)։ Ամեն էջ՝ ունիկ բովանդակություն (median, trend, listings) → ոչ thin/duplicate; thin տվյալով էջը՝ `noindex` մինչև բավարար content կուտակվի։
- **`<title>`** = «{area}, {city} անշարժ գույք՝ գներ, տրենդներ {year} | {brand}»։
- **`<meta name="description">`** = generated ամփոփ՝ median + active count + YoY (≤ 155 նիշ)։
- **Structured data (JSON-LD).** `Place` (geo, boundary) + `Dataset` (market stats, `dateModified`) + `BreadcrumbList`; ակտիվ listings-ի համար `RealEstateListing` (ItemList)։
- **`hreflang`** (hy/ru/en) + `x-default` ամեն տարածքի 3 լեզվով։
- **`canonical`** ամեն էջում (area slug-ով)։
- **SSR / ISR.** Pre-render շուկայի տվյալով (Google crawl + Core Web Vitals); ամենօրյա regeneration = freshness signal։
- **Internal linking.** Nearby neighborhoods + property listings + guides խաչաձև հղումներ → **topical authority cluster**։
- **Sitemap.xml.** Ավտո-ներառում բոլոր ակտիվ տարածքների; priority ըստ inventory ծավալի; `lastmod = regeneration date`։
- **OG / Twitter Card.** Map snapshot + median գին overlay (dynamic `/api/og?type=area&slug=…`)։
- **Multi-country.** Template-ը նույնն է բոլոր երկրների; տվյալի աղբյուրն ու հասանելիությունը՝ ըստ երկրի (CIS rollout-ում)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `area_view` | Էջի load (dedupe 24h) | `area, city` |
| `area_chart_toggle` | Period/deal/metric chip | `area, period, deal, metric` |
| `area_chart_hover` | Tooltip (throttled) | `area, date` |
| `area_view_listings_click` | [Տեսնել բոլորը] | `area` |
| `area_listing_card_click` | Carousel card | `area, property_id` |
| `area_map_layer_toggle` | POI layer toggle | `area, layer, on` |
| `area_alert_created` | Alert CTA → saved search | `area` |
| `area_nearby_click` | Nearby թաղամաս link | `area, target_area` |
| `area_currency_recompute` | Header currency switch | `area, currency` |
