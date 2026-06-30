# Էջ 02 — Search Results + Map (Որոնման արդյունքներ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data, API), responsive, accessibility, SEO, analytics։

**URL.** `/search` · alias `/buy` (deal=sale) · `/rent` (deal=rent) · SEO landing-ներ՝ `/buy/yerevan`, `/rent/gyumri`
**Query params.** `?deal=sale&type=apartment&city=Yerevan&district=Arabkir&price_min=&price_max=&rooms=2&beds=2&baths=1&area_min=&sort=newest&page=1&bounds=lng1,lat1,lng2,lat2&view=split`
**Roles.** Բոլորը (Guest դիտում/ֆիլտրում; save-search ու favorite՝ login-ով)։
**Primary goal (conversion).** Այցելուն **ֆիլտրի և գտնի համապատասխան գույք**, ապա անցնի property էջին։ Երկրորդական՝ պահի որոնումը (saved search + alert)։

---

## 0. Ակնարկ (Overview)

Սա կայքի **սիրտն է** — Zillow-ի ոճով split layout՝ ձախում scroll-վող listing grid, աջում fixed Mapbox քարտեզ։ Երկուսը **սինխրոն** են. ֆիլտրը, sort-ը, bounds-ը կիսում են նույն state-ը (URL-ով), card-ի hover-ը highlight-ում է map pin-ը և հակառակը։

Էջի երեք հիմնական մաս՝ (1) **filter bar** վերևում (location, deal, price, type, beds, more, sort, view toggle, save-search), (2) **listing grid** PropertyCard-երով + pagination, (3) **map** price-pin-երով, clustering-ով, «search this area» կոճակով։

**URL = state** սկզբունքը կրիտիկ է. ամեն ֆիլտր/sort/page/bounds/view պահվում է URL query-ում, ուստի որոնումը share-ելի է, browser back/forward-ը աշխատում է, և SSR-ը render-ում է ճիշտ արդյունքը։ SEO landing-ները (`/buy/yerevan`) նույն template-ն են՝ նախալրացված ֆիլտրով և unique meta-ով — «մեկ template, հազար URL»։

Render՝ **SSR** առաջին էջի համար (SEO + first paint); ֆիլտր/map ինտերակցիաները client-side են (React Query, shallow URL update)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Տիգրանը (desktop).** Տիգրանը մտնում է `/buy/yerevan`։ Տեսնում է «Երևանում վաճառվող 1,234 գույք»։ Բացում **Գին ▾**, դնում max 60M ֏, ապա **Ննջ. ▾** → 2+։ Արդյունքները թարմացվում են (URL՝ `?price_max=60000000&beds=2`)։ Card-ի վրա hover անելիս աջի map pin-ը մեծանում է։ Քարտեզը zoom անում Արաբկիր → հայտնվում է **[Որոնել այս տարածքում]**, սեղմում → bounds ֆիլտր։

**Սցենար Բ — Վարձակալ Լիլիթը (mobile).** Լիլիթը `/rent`-ում է։ Toggle-ով անցնում **[🗺 Քարտեզ]** ռեժիմի, full-screen քարտեզ, pin-երը՝ գներով։ Սեղմում մի pin → ներքևից բարձրանում mini card → tap → property էջ։ Վերադառնում **[Ցանկ]** ռեժիմ։

**Սցենար Գ — Հետևող Անին (logged-in).** Անին ֆիլտրել է «Դիլիջան, տուն, max 40M», 0 արդյունք։ Տեսնում empty state-ը՝ «Ոչինչ չգտնվեց»։ Սեղմում **[🔔 Պահել որոնումը]** → ստեղծվում է saved search ամենօրյա alert-ով, toast «Կտեղեկացնենք նոր գույքի մասին»։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — split (listings + map)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                        │
├────────────────────────────────────────────────────────────┤
│ FILTER BAR (sticky top-16, h-14, bg-white border-b)         │
│ [🔍 Location][Գնել/Վարձ][Գին▾][Տիպ▾][Ննջ▾][Ավելի▾] ... [Sort▾][⊞/🗺][🔔]│
├──────────────────────────────────┬─────────────────────────┤
│ ◄ LISTINGS (≈58%, scroll-y)      │ ► MAP (≈42%, sticky)     │
│  «1,234 գույք» + active chips     │                          │
│  ┌──────┐ ┌──────┐               │   📍52M  📍48M           │
│  │ Card │ │ Card │               │      📍 [25]             │
│  └──────┘ └──────┘               │   📍39M                  │
│  ┌──────┐ ┌──────┐               │  [Որոնել այս տարածքում]  │
│  │ Card │ │ Card │               │   ⊕ ⊖  (zoom controls)   │
│  └──────┘ └──────┘               │                          │
│  ◄ 1 2 3 … 12 ►  (pagination)    │                          │
├──────────────────────────────────┴─────────────────────────┤
│ FOOTER (SEO landing-ի դեպքում՝ + նկարագրություն/internal links)│
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — toggle ցանկ ↔ քարտեզ

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ FILTER BAR (scroll-x)   │
│ [Location][Ֆիլտր▾][Sort▾]│
├──────────────────────────┤
│ «1,234 գույք»  chips     │
│ ┌────────────────────┐  │
│ │  PropertyCard      │  │
│ └────────────────────┘  │
│ ┌────────────────────┐  │
│ │  PropertyCard      │  │
│ └────────────────────┘  │
│ … pagination            │
├──────────────────────────┤
│ FIXED toggle (centered) │
│   [ 🗺 Քարտեզ ]          │
└──────────────────────────┘
   (քարտեզ ռեժիմ → full-screen map + bottom mini-card)
```

- Mobile-ում ցանկ և քարտեզ **չեն** տեղավորվում միաժամանակ → floating toggle pill ներքևում (`[🗺 Քարտեզ]` / `[☰ Ցանկ]`)։
- Ֆիլտրերը mobile-ում բացվում են bottom-sheet modal-ով (`[Ֆիլտր ▾]` մեկ կոճակ → ամբողջ panel)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
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
| «Search this area» | `bg-white shadow-md rounded-full px-4 h-10 text-sm font-medium absolute top-4 left-1/2 -translate-x-1/2` |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-72` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Filter bar

Sticky շերտ header-ի տակ։ Ձախից աջ՝ location → deal toggle → price → type → beds/baths → more → (spacer) → sort → view toggle → save-search։

- **Location input.** Autocomplete (նույն component-ը՝ home hero-ի պես), փոխում է `city`/`district`/`q`։ Ընտրությունը re-center անում քարտեզը այդ տարածքին։
- **Deal toggle.** `[Գնել] [Վարձել]` segmented control։ Փոխում է `deal` param; rent-ի դեպքում price ֆիլտրը դառնում է «/ամիս»։
- **Գին ▾.** Dropdown՝ min/max inputs (ընտրած արժույթով) + dual-range slider։ Active վիճակում pill-ը ցույց է տալիս «մինչև 60M ֏» / «20–60M ֏»։
- **Տիպ ▾.** Multi-select checkbox dropdown՝ Բնակարան · Տուն · Հող · Կոմերցիոն · Նորակառույց · Գարաժ։ Active՝ «Բնակարան +1»։
- **Ննջ./Սանհ. ▾.** `1+ 2+ 3+ 4+ 5+` segmented (ննջասենյակ) + առանձին տող սանհանգույցի համար։
- **Ավելի ▾ (More filters).** Modal/popover՝ մակերես min/max (m²), հարկ (min/max), շինության տարի, վիճակ (նորակառույց/վերանորոգված/լավ/վերանորոգման կարիք), amenities (ավտոկայանատեղի, վերելակ, կահույք, ջեռուցում, պատշգամբ, կոնդիցիոներ, անվտանգություն), «Թաքցված հասցեից բացառել»։ Ներքևում **[Ցույց տալ N գույք]** (live count) + **[Մաքրել]**։
- **Sort ▾.** Նորագույն (default) · Գին ↑ · Գին ↓ · Մակերես ↓ · Ամենադիտված։ Փոխում է `sort` param։
- **View toggle.** `[⊞ Ցանկ] [🗺 Քարտեզ] [⊞🗺 Երկուսը]` (desktop default = Երկուսը)։
- **[🔔 Պահել որոնումը].** Logged-in → ստեղծում saved_search ընթացիկ ֆիլտրով + alert frequency ընտրություն (instant/daily/weekly)։ Guest → login modal «Մուտք գործիր որոնումը պահելու համար»։
- **Վիճակներ.** Ֆիլտր փոխելիս արդյունքները re-fetch (loading skeleton); pill active-ը գունավորվում է; **[Մաքրել բոլորը]** հայտնվում է, երբ ≥1 ֆիլտր active է։

### 3.2 Results heading + active chips

- **Heading.** «Երևանում վաճառվող 1,234 գույք» — count + location + deal (locale-ի կանոններով grammar)։
- **Active chips.** Ամեն active ֆիլտր՝ chip ✕-ով («2+ ննջ. ✕», «մինչև 60M ֏ ✕»)։ ✕ → հանում է ՄԻԱՅՆ այդ ֆիլտրը (URL update + re-fetch)։
- **[Մաքրել բոլորը].** Reset բոլոր ֆիլտրերը (location-ից բացի, ըստ ընտրության)։

### 3.3 Listings (ձախ սյունակ)

- **Grid.** PropertyCard-եր (`grid-cols-1 xl:grid-cols-2`), 20/էջ։
- **PropertyCard.**
  - Նկար slider (←/→ սլաքներ hover-ին, dots ներքևում), badge՝ NEW (`bg-green-100 text-green-700`) / REDUCED (`bg-orange-100`) / FEATURED (`bg-amber-100`) / SOLD (overlay)։
  - ♡ favorite (վերին աջ overlay)՝ toggle, optimistic, toast; guest → login modal։
  - Գին `text-lg font-bold` (ընտրած արժույթով; rent՝ «/ամիս»)։
  - Key facts՝ 🛏 2 · 🛁 1 · 📐 75 m² · 4/9 հարկ (icon row)։
  - Հասցե/թաղամաս `text-sm text-gray-500`։
  - Card click → `/property/[id]/[slug]` (middle-click → նոր tab)։
- **Card hover ↔ map sync.** Hover → համապատասխան map pin-ը highlight (`scale-110 bg-primary`); pin hover → card-ը scroll-ի մեջ highlight (`ring-2 ring-primary`)։
- **Pagination.** Ներքևում `◄ 1 2 3 … 12 ►` → URL `?page=2` (scroll to top)։ Mobile-ում կարող է լինել «Բեռնել ավելին» / infinite scroll։
- **Loading.** 6–8 skeleton card shimmer-ով։

### 3.4 Map (աջ սյունակ)

- **Mapbox GL** sticky, `h-[calc(100vh-120px)]`։ Pins՝ **price label** (ոչ պարզ marker)՝ «52M», «350K /ամիս»։
- **Pin states.** default (white pill), hover/active (primary լցված), visited (gray — localStorage)։
- **Pin click** → mini popup card (նկար, գին, beds/area, հասցե) → click → property; popup-ի ♡-ն էլ աշխատում է։
- **Clustering.** Մոտ pin-երը խմբավորվում են թվով (`[25]`)՝ zoom-ի մակարդակից կախված; cluster click → zoom in / spiderfy։
- **[Որոնել այս տարածքում].** Քարտեզը pan/zoom անելիս հայտնվում է վերևում; click → ֆիլտրում ընթացիկ `bounds`-ով (URL `?bounds=...`), heading-ը թարմացվում է։ Toggle option «Որոնել քարտեզը շարժելիս» (auto-search on move)։
- **Zoom controls** (⊕/⊖) + geolocate («Իմ տեղը»)։
- **Draw tool** (ձեռքով տարածք գծել) — Phase 2։
- **Map ↔ List sync.** Նույն ֆիլտր/bounds; bounds փոխվելիս list-ը re-fetch (debounce 500ms կամ ձեռքով «Որոնել այս տարածքում»)։
- **Loading.** Map skeleton (gray tiles) + pins fade-in; *error* (Mapbox token/network)՝ fallback «Քարտեզը հասանելի չէ» + ցանկը full-width։

### 3.5 Empty state

- **0 արդյունք.** Centered illustration + «Ոչինչ չգտնվեց ընտրված ֆիլտրերով»։ Առաջարկներ՝ **[Մաքրել ֆիլտրերը]** · **[Ընդլայնել տարածքը]** · **[🔔 Ստեղծել alert]** («Կտեղեկացնենք, երբ նոր գույք հայտնվի»)։ Քարտեզը մնում է, բայց առանց pin-երի։

### 3.6 SEO landing pages (`/buy/yerevan`)

- Նույն template-ը նախալրացված ֆիլտրով (`city=Yerevan&deal=sale`)։
- Ունի լրացուցիչ **SEO content block** footer-ից վերև՝ տարածքի նկարագրություն, միջին գին, internal links դեպի թաղամասներ/տիպեր («Բնակարաններ Արաբկիրում», «Տներ Երևանում»)։
- Unique `<title>`/`<meta>` ու breadcrumbs այդ տարածքի համար։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton card-եր ձախում + map gray tiles, pins fade-in |
| **Loaded** | Grid + map + heading count + active chips |
| **Filtering** | Re-fetch — skeleton overlay grid-ի վրա, map pins update |
| **Empty (0 results)** | «Ոչինչ չգտնվեց» + [Մաքրել] / [Ընդլայնել] / [Alert] |
| **Map error** | «Քարտեզը հասանելի չէ» fallback, ցանկը full-width |
| **API error** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |
| **Save-search (guest)** | Login modal `?next`-ով |
| **Save-search (success)** | Toast «Որոնումը պահվեց — կտեղեկացնենք» |
| **Pagination beyond range** | Redirect last valid page / empty + «Վերադառնալ սկիզբ» |
| **Mobile map mode** | Full-screen map + bottom mini-card + [☰ Ցանկ] toggle |

---

## 5. Տեխնիկական խորություն (Technical)

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
 ├─ <EmptyState />                                   (պայմանով)
 ├─ <SeoContentBlock />                              (landing-ի դեպքում)
 └─ <Footer />
```

### Data fields used (00-SPEC §7)

`properties`՝ `id, slug, title{locale}, deal_type, status, property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, city, district, lat, lng, hide_exact_address, is_featured, created_at, property_media[]` + `favorites` (logged-in user-ի state-ի համար)։ Geo query-ն PostGIS-ով՝ `lat/lng` + bounds (`ST_MakeEnvelope`) / radius։

### API contract-ներ

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
  message: "Առավելագույն գինը պետք է մեծ լինի նվազագույնից", path: ["priceMax"],
});
```

- **URL = state.** Բոլոր ֆիլտրերը serialize URLSearchParams-ի մեջ; navigate `router.push(..., { scroll: false })`։
- **Performance.** Pagination 20/էջ; map pins՝ միայն viewport-ի + cap (օր․ 300, ավելին → cluster); `next/image` lazy; bounds query debounce 500ms; React Query cache (keepPreviousData)։

---

## 6. Responsive

- **≥1024px (lg/xl).** Split view՝ listings (~58%) + sticky map (~42%); grid 2-col (`xl`)։
- **768–1023px (md).** Listings full-width 1–2 col; map՝ toggle-ով (default ցանկ); filter bar՝ pill-եր scroll-x։
- **<768px (sm).** Մեկ ռեժիմ ժամանակ; floating `[🗺 Քարտեզ]/[☰ Ցանկ]` toggle; ֆիլտրերը bottom-sheet modal-ով; map mode = full-screen + bottom mini-card; pagination → «Բեռնել ավելին»։

---

## 7. Accessibility

- Filter pill-երը՝ real `<button>`-ներ `aria-expanded`-ով (dropdown), active վիճակը՝ ոչ միայն գույնով այլ տեքստով/icon-ով։
- Results count-ը՝ `role="status" aria-live="polite"` (ֆիլտր փոխվելիս հայտարարվում է «1,234 գույք»)։
- PropertyCard-ը՝ ամբողջը հասանելի link, ♡-ը՝ առանձին `aria-label="Ավելացնել ընտրանի"`։
- Map-ը՝ `aria-label`, keyboard pan/zoom; pin-երը tab-ով հասանելի կամ «Բացել ցանկում» fallback; «Բացել Google Maps-ում» link։
- Map-list sync-ը չպետք է keyboard-only օգտատիրոջ համար focus-ը գողանա։
- Contrast ≥ 4.5:1; touch target ≥ 44px (pin-երն ու pill-երը)։

---

## 8. SEO & meta

- **Location landing-ներ** (`/buy/yerevan`, `/rent/gyumri`)՝ առանձին SSR, unique `<title>` («Երևանում վաճառվող բնակարաններ | {brand}»), `<meta description>`, H1՝ տարածքով։ Սա է «Massachusetts homes for sale»-ի համարժեքը՝ **մեկ template, հազար URL**։
- Structured data (JSON-LD)՝ `ItemList` (արդյունքները) + `BreadcrumbList` (Գլխավոր › Երևան › Վաճառք)։
- `canonical` ֆիլտրված էջերի համար՝ canonical landing-ին (խուսափել duplicate-ից); param-ով խորը ֆիլտրերը՝ `noindex` (page>1, bounds, շատ param)։
- `hreflang` (hy/ru/en); pagination՝ rel prev/next (կամ canonical էջ 1-ին)։
- Internal linking՝ թաղամասներ/տիպեր crawlable `<a>`-ով landing-ների վրա։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `search_view` | Էջի load | `deal, city, filters_count, results_total` |
| `filter_apply` | Ֆիլտր փոփոխություն | `filter_key, value` |
| `filter_clear` | [Մաքրել բոլորը] / chip ✕ | `filter_key?` |
| `sort_change` | Sort ընտրություն | `sort` |
| `view_toggle` | Ցանկ/Քարտեզ/Երկուսը | `view` |
| `map_search_this_area` | «Որոնել այս տարածքում» | `bounds, results_total` |
| `map_pin_click` | Pin click | `property_id` |
| `card_click` | PropertyCard click | `property_id, position, page` |
| `favorite_add` / `favorite_remove` | ♡ toggle | `property_id` |
| `save_search` | Որոնում պահել | `filters, alert_frequency` |
| `pagination_change` | Էջ փոխում | `page` |
| `empty_results` | 0 արդյունք render | `filters` |
