# Էջ 12 — Home Value Tool (Տան գնահատում / «Zestimate») 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, formula-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/home-value` — արդյունքից հետո shareable snapshot՝ `/home-value/[estimateHash]` (օրինակ՝ `/hy/home-value/e8423ab`)
**Roles.** Բոլորը (Guest, User, Agent, Admin) կարող են գնահատել ու դիտել; «Claim my home», պահպանում, value alerts՝ պահանջում են login (Guest → login modal `?next`-ով)։
**Primary goal (conversion).** Սեփականատերն իմանա իր գույքի մոտավոր արժեքը, **claim անի իր տունը** կամ սեղմի **«Վաճառիր այս գույքը»** / **«Գտնել գործակալ»**։ Սա lead-generation էջ է՝ վաճառքի funnel-ի մուտքը։

> ⚠️ **Phase 1 / MVP մոդել.** Պարզ heuristic՝ **թաղամասի median price/m² × մակերես**, ճշգրտված սենյակ/հարկ/տարի/վիճակ գործակիցներով։ Իրական ML model-ը (comparable sales regression) Phase 3+։

---

## 0. Ակնարկ (Overview)

Սա **վստահություն կառուցող lead-magnet էջն է**։ Մարդը գալիս է մեկ հարցով՝ «որքա՞ն արժե իմ տունը», և եթե պատասխանը տանք արագ ու համոզիչ, նա մնում է funnel-ում՝ կա՛մ claim անում տունը (retention), կա՛մ անցնում listing wizard-ին (conversion)։ Ուստի էջը պետք է՝ (1) մեկ դաշտով՝ հասցեի autocomplete-ով՝ սկսի flow-ն առանց շփման, (2) արագ ցույց տա **արժեքի միջակայք** (ոչ թե մեկ կեղծ-ճշգրիտ թիվ) + confidence, (3) transparency-ով բացատրի՝ ինչո՞ւ այդ թիվը (factors, comps, trend), և (4) ամեն քայլում պահի **legal disclaimer**՝ «սա գնահատական է, ոչ appraisal»։

Էջն ունի **երեք փուլ (state machine)**.
- **Input** — hero + հասցեի autocomplete (default)։
- **Details** — եթե հասցեն base-ում գույք չունի՝ minimal form (m², type, վիճակ…)։
- **Result** — estimate range + comps + trend + factors + CTA։

Hero/intro-ն render-վում է **SSR**-ով (SEO, արագ first paint); estimate flow-ը, chart-երը, autocomplete-ը՝ client component-ներ (React Query + Recharts)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Սեփականատեր Գայանեն (desktop).** Գայանեն Google-ից որոնել է «որքա արժե բնակարանս» և եկել landing-ին։ Մուտքագրում է «Արաբկիր, Կոմիտաս 12», autocomplete-ը առաջարկում է հասցեն, ընտրում է։ Հասցեն base-ում չկա, բացվում է details form՝ լրացնում 75 m², 3 սենյակ, 4/9 հարկ, «վերանորոգված»։ Սեղմում **[Հաշվել գնահատականը]** → 2 վայրկյանում տեսնում «48,000,000 – 56,000,000 ֏», confidence «Միջին»։ Սեղմում **[🏠 Claim my home]**, login անում, տունը կցվում է account-ին։ → Lead + retention (`home_claimed` event)։

**Սցենար Բ — Հետաքրքրասեր Արտակը (mobile).** Արտակը պարզապես հետաքրքրված է հարևանի շենքով։ Մուտքագրում է հասցեն, base-ում գույք կա՝ ուղիղ անցնում է result-ին։ Տեսնում է range bar, scroll անում comps-ին՝ «3 նմանատիպ վերջերս վաճառված», սեղմում մեկի վրա → property detail։ Չի claim անում, բայց տեսնում է **[Հիփոթեքի հաշվիչ]** CTA-ն և անցնում calculator-ին գնահատված գնով prefilled։ → cross-tool engagement (`hv_cta_clicked`)։

**Սցենար Գ — Վաճառքի մտածող Նարեն (desktop).** Նարեն ուզում է վաճառել։ Ստանում է գնահատական «32M – 38M ֏», տեսնում trend chart-ում, որ թաղամասում գները 12 ամսում աճել են 9%։ Որոշում է վաճառել հիմա, սեղմում **[Վաճառիր այս գույքը]** → listing wizard բացվում է հասցե/m²/type prefilled-ով։ → conversion դեպի listing (`hv_sell_clicked`)։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│            HERO (bg-gradient, py-16, text-center)           │
│   «Իմացիր որքա՞ն արժե քո տունը»  (text-4xl font-bold)       │
│   subtitle (text-lg text-gray-500)                          │
│   ┌──────────────────────────────────────┐ [Գնահատել]      │
│   │ 📍 Մուտքագրիր հասցեն… (autocomplete) │ (h-14)          │
│   └──────────────────────────────────────┘                 │
├────────────────────────────────────────────────────────────┤
│  ───────────  RESULT (հայտնվում է submit-ից հետո)  ──────── │
│ ┌──────────────────────────────┬──────────────────────────┐│
│ │ ◄ MAIN (≈62%)                │ ► SIDEBAR (≈38%, sticky)  ││
│ │ ┌── Estimate card ──┐        │ ┌── CTA card ──┐          ││
│ │ │ 52,000,000 ֏      │        │ │ [🏠 Claim]    │          ││
│ │ │ range bar low–high│        │ │ [Վաճառիր]     │          ││
│ │ │ confidence badge  │        │ │ [Գտնել գործ.] │          ││
│ │ │ price/m² vs median│        │ │ [Հիփ. հաշվիչ] │          ││
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
│ «Որքա՞ արժե տունդ»       │
│ ┌──────────────────────┐ │
│ │ 📍 հասցե (autocompl.)│ │
│ └──────────────────────┘ │
│ [Գնահատել] (full-width)  │
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
│ [🏠 Claim] [Վաճառիր]    │
│ FOOTER                   │
└──────────────────────────┘
```

- Sidebar CTA card-ը desktop-ում sticky `top-20`; mobile-ում փոխարինվում է **fixed bottom bar**-ով (`h-16`, primary [Claim] + secondary [Վաճառիր])։
- Comps-ը mobile-ում horizontal scroll carousel (`overflow-x-auto snap-x`)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Hero վերնագիր | `text-4xl font-bold text-gray-900` (mobile՝ `text-2xl`) |
| Autocomplete input | `h-14 rounded-xl border border-gray-300 px-4 text-lg focus:ring-2 ring-primary` |
| Estimate (մեծ թիվ) | `text-4xl font-bold text-gray-900` |
| Estimate range (low–high) | `text-lg text-gray-600` |
| Range bar track | `h-2 rounded-full bg-gray-200`, fill՝ `bg-primary/30`, marker՝ `bg-primary w-3 h-3 rounded-full` |
| Confidence badge (բարձր) | `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md` |
| Confidence badge (միջին) | `bg-amber-100 text-amber-700` |
| Confidence badge (ցածր) | `bg-gray-100 text-gray-600` |
| Disclaimer | `text-xs text-gray-400 leading-relaxed` |
| Factor ↑ | `text-green-600`, Factor ↓ `text-red-500` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-5` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Բաժինների միջև gap | `space-y-6` (24px) |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Hero / Address input

- **Տեսք.** Կենտրոնացված hero, `bg-gradient-to-b from-primary/5 to-white py-16`։ Վերնագիր «Իմացիր որքա՞ն արժե քո տունը», subtitle «Անվճար գնահատում վայրկյանների ընթացքում»։
- **Address autocomplete (գլխավոր CTA).** Մեկ դաշտ, `h-14`, 📍 icon ձախում։ Type-ahead՝ debounced 300ms → `GET /api/geo/autocomplete?q=`։ Dropdown-ում 5 առաջարկ (`{label, lat, lng, country, region, city, district, street}`), keyboard ↑/↓ + Enter ընտրություն։
- **Submit ([Գնահատել]).** Եթե ընտրված հասցեն base-ում արդեն գույք ունի (match ըստ geo + address) → ուղիղ **Result** state։ Հակառակ դեպքում → **Details** state։
- **Վարք.** Առանց ընտրված հասցեի submit → inline error «Ընտրիր հասցե ցանկից»։
- **Microcopy.** placeholder «Մուտքագրիր հասցեն (քաղաք, փողոց, շենք)», button «Գնահատել»։
- **Տեխ.** `<AddressAutocomplete onSelect={(geo)=>...} />` (client)։ Selection-ը պահվում է URL query-ում (`?lat=&lng=&addr=`) որ flow-ը share/restore-ելի լինի։

### 3.2 Property details form (Details state)

- **Երբ.** Հասցեն base-ում գույք չունի։ Բացվում է inline card-ով hero-ի տակ (ոչ նոր էջ)։
- **Դաշտեր (heuristic-ի minimal input):**
  - **Property type** (select)՝ Բնակարան / Տուն / Հող / Կոմերցիոն — `property_type` enum։
  - **Մակերես (m²)** (number, required) — հիմնական multiplier։
  - **Սենյակների քանակ** (number)։
  - **Ննջասենյակ / Սանհանգույց** (number, optional)։
  - **Հարկ X / Ընդհանուր հարկ Y** (շենքի դեպքում)։
  - **Կառուցման տարի** (number) → տարիք գործակից։
  - **Վիճակ** (select)՝ Նորակառույց / Վերանորոգված / Լավ / Վերանորոգման կարիք — coefficient։
- **Microcopy.** Button «Հաշվել գնահատականը»; required hint «Մակերեսը պարտադիր է»։
- **Վարք.** Submit → `POST /api/home-value/estimate` → loading skeleton → **Result**։
- **Տեխ.** `<PropertyDetailsForm geo={Geo} onEstimate={...} />`, react-hook-form + zod (տես §5)։

### 3.3 Estimate result card — **conversion-ի կորիզ**

- **Տեսք.** `shadow-sm border rounded-xl p-6`։ Վերևում մեծ թիվ (կենտրոնական estimate, ընտրած արժույթով), տակը range bar։
- **Estimate (մեծ թիվ).** `text-4xl font-bold`, ընտրած արժույթով (header currency switcher)։ Կողքին փոքրով՝ բնօրինակ արժույթ եթե տարբերվում է («≈ $130,000»)։
  - **Formula (Phase 1):**
    ```
    base      = area_m2 × medianPricePerM2(country, city, district, property_type)
    estimate  = base
              × roomsCoeff       (median rooms-ից շեղում՝ ±)
              × floorCoeff       (առաջին/վերջին հարկ -, միջին neutral)
              × ageCoeff         (նոր +, հին -, ըստ year_built)
              × conditionCoeff   (renovated +, needs-work -)
    estimate  = clamp(estimate, median ± 3σ)   // outlier guard
    ```
- **Value RANGE (range bar).** `low — estimate — high`, արժույթով։
  - **Formula:** `low = estimate × (1 − margin)`, `high = estimate × (1 + margin)`, որտեղ `margin ∈ [0.10, 0.20]`, որոշվում ըստ comparable-ների խտության (շատ comps → նեղ margin, քիչ → լայն)։
- **Confidence indicator.** Badge՝ Բարձր (≥8 comps) / Միջին (3–7) / Ցածր (<3)։
- **Price per m².** `estimate / area_m2` → ցույց + համեմատություն թաղամասի median-ի հետ («Թաղամասից 8% բարձր ↑»)։
- **Disclaimer (պարտադիր, card-ի տակ).** «Սա ավտոմատ գնահատական է՝ հիմնված հանրային տվյալների վրա, և **չի փոխարինում** պրոֆեսիոնալ գնահատմանը (appraisal)։ Իրական գինը կարող է տարբերվել։»
- **Տեխ.** `<EstimateResultCard estimate={Estimate} displayCurrency />`։ Currency switch → re-render live FX-ով (base արժույթից convert)։

### 3.4 Comparable sold properties (Comps)

- **Ի՞նչ է անում.** 3–6 վերջերս վաճառված/արխիվացված նման գույք նույն թաղամասում։ Սրանք median price/m²-ի աղբյուրն են (transparency)։
- **Տեսք.** Grid `grid-cols-1 md:grid-cols-3 gap-4`; mobile՝ scroll-x carousel։
- **Card-ում.** Նկար, հասցե, վաճառքի գին, m², price/m², վաճառքի ամսաթիվ, հեռավորություն («450 մ»)։
- **Click** → property detail (`/property/[id]`)։
- **Data.** `GET /api/home-value/comps?lat&lng&type&area_m2` → `status=sold|archived` գույքեր, PostGIS radius, ±20% area filter։
- **Empty state.** 0 comps → «Այս տարածքում վերջերս վաճառված նմանատիպ գույք չկա» + confidence badge-ը «Ցածր»։

### 3.5 Price trend chart (տարածքի)

- **Ի՞նչ է անում.** Recharts area/line chart՝ թաղամասի median price/m² ժամանակի ընթացքում (12–36 ամիս)։
- **Տեսք.** `h-[280px]`, X առանցք՝ ամիսներ, Y՝ price/m² ընտրած արժույթով, tooltip hover-ով։
- **Toggle.** «Իմ գույքի գնահատականը» — overlay dashed line տրենդի վրա։
- **Data.** `GET /api/home-value/trend?city&district&type` → ամսական median կետեր (aggregated sold + active)։
- **Empty state.** Քիչ տվյալ → «Բավարար տվյալ չկա այս թաղամասի համար» + fallback city-level տրենդ։

### 3.6 Factors affecting value

- **Ի՞նչ է անում.** Բացատրում է, թե ո՛ր գործոններն ինչպես ազդեցին գնահատականի վրա (transparency, վստահություն)։
- **Տեսք.** Ցուցակ՝ icon + գործոն + ուղղություն (↑ կանաչ / ↓ կարմիր / → neutral) + tooltip։
- **Գործոններ.** Տեղադրություն (թաղամաս median, հիմնական) · Մակերես m² · Սենյակների քանակ · Հարկ (առաջին/վերջին ↓) · Կառուցման տարի / տարիք · Վիճակ / վերանորոգում · Շուկայի տրենդ։
- **Microcopy (tooltip օրինակ).** «Վերանորոգված վիճակը բարձրացրեց գնահատականը ~6%-ով համեմատ թաղամասի միջինի հետ»։
- **Տեխ.** `factors[]` գալիս է estimate response-ից՝ `{ key, label, direction, weightPct, tooltip }`։

### 3.7 «Claim my home» flow

- **Ի՞նչ է անում.** Օգտատերը հայտարարում է «սա իմ տունն է» → կցվում է account-ին, և նա **հետևում է արժեքին ժամանակի ընթացքում**։
- **[🏠 Claim my home]** button (sidebar CTA card / mobile bottom bar)։
  - Guest → login/register modal (`?next` պահելով)։
  - Login user → `POST /api/claimed-homes` (`user_id`, գույքի snapshot, հասցե, lat/lng, պարամետրեր)։
- **Verification.** Թեթև (account-level) Phase 2; ուժեղ ownership proof (փաստաթուղթ) Phase 3+։
- **Claimed home dashboard** (`/dashboard` → «Իմ տները» tab).
  - Ընթացիկ գնահատական + սլաք (↑/↓ նախորդ ամսից)։
  - Արժեքի history chart (claim-ից ի վեր)։
  - Value alerts toggle՝ «Տեղեկացրու երբ արժեքը փոխվի >X%» → notification/email։
  - **[Թարմացնել տվյալները]** (վերանորոգում, սենյակ ավելացում → recalc)։
  - **[Վաճառել այս գույքը]** → listing wizard prefilled (`/sell/new?fromClaim=...`)։

### 3.8 CTA card (sidebar) — lead generation

- **Տեսք.** `shadow-sm border rounded-xl p-5`, sticky `top-20`։
- **Կոճակներ (vertical stack, `space-y-3`):**
  - **[🏠 Claim my home]** primary։
  - **[Վաճառիր այս գույքը]** → listing wizard prefilled (`/sell/new?addr=&area=&type=`)։
  - **[Գտնել գործակալ]** → `/agents?district=...`։
  - **[Հիփոթեքի հաշվիչ]** → `/mortgage/calculators?price={estimate}&currency=...`։
  - **[Ստանալ pre-approval]** → `/mortgage/rates` (Phase 3)։
- **Microcopy.** Վերնագիր «Ի՞նչ անել հետո»։

### 3.9 FAQ / How it works

- Accordion՝ «Ինչպե՞ս է հաշվարկվում գնահատականը», «Որքա՞ն ճշգրիտ է», «Ինչո՞ւ է միջակայք, ոչ թե մեկ թիվ», «Ի՞նչ է claim-ը»։
- **Տեխ.** `FAQPage` JSON-LD (SEO)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Input (default)** | Hero + autocomplete; result բաժինները թաքցված |
| **Details** | Inline form (m², type, վիճակ…) hero-ի տակ |
| **Estimating (loading)** | Estimate card skeleton (shimmer) + spinner button-ում |
| **Result** | Estimate card + comps + trend + factors + CTA + disclaimer |
| **No data (տարածք)** | «Չենք կարող գնահատել այս տարածքը դեռ» + email-collect waitlist |
| **Low confidence** | Result-ը ցույց է տրվում, բայց «Ցածր» badge + ընդլայնված disclaimer |
| **Already claimed** | «Այս տունն արդեն հայտարարված է» (dispute flow՝ Phase 3) |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |
| **Share view** | Read-only snapshot (`/home-value/[hash]`), CTA-ները ակտիվ, owner-ի անձնական տվյալ չկա |

---

## 5. Տեխնիկական խորություն (Technical)

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

### Data fields used (տես 00-SPEC §7)

`properties: id, slug, deal_type, status(sold/archived for comps), property_type, price, currency, area_m2, rooms, floor, floors_total, year_built, country, region, city, district, lat, lng`
`claimed_homes (նոր): id, user_id, address, lat, lng, property_type, area_m2, rooms, floor, year_built, condition, base_currency, snapshot(json), alert_threshold_pct, created_at`
`home_value_estimates (cache/snapshot): hash, params(json), estimate, low, high, currency, confidence, factors(json), created_at`

### API contract-ներ

**`GET /api/geo/autocomplete?q=Արաբկիր`**
```jsonc
// 200 OK
{ "items": [
  { "label": "Արաբկիր, Կոմիտաս 12, Երևան",
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
    { "key": "location", "label": "Թաղամաս", "direction": "up", "weightPct": 100, "tooltip": "..." },
    { "key": "condition", "label": "Վիճակ", "direction": "up", "weightPct": 6, "tooltip": "..." },
    { "key": "floor", "label": "Հարկ", "direction": "down", "weightPct": -3, "tooltip": "..." }
  ] }
// 422 { "error": "no_area_data", "fallbackLevel": "city" }
// 422 { "error": "invalid_input", "field": "areaM2" }
```

**`GET /api/home-value/comps?lat&lng&type&area_m2`** → `200 { "items": Comp[] }` (max 6)
**`GET /api/home-value/trend?city&district&type`** → `200 { "points": [{ "month": "2025-06", "medianPerM2": 640000 }] }`
**`POST /api/claimed-homes`** → `{ params }` → `201 { "claimedHomeId": 77 }` · `401 auth_required` · `409 already_claimed`
**`GET /api/claimed-homes`** → `200 { "items": ClaimedHome[] }` (login)
**`PATCH /api/claimed-homes/[id]`** → թարմացնել պարամետրեր / alert settings → `200`

### Validation (zod)

```ts
const estimateSchema = z.object({
  lat: z.number(), lng: z.number(),
  propertyType: z.enum(["apartment","house","land","commercial"]),
  areaM2: z.number().min(5, "Մակերեսը շատ փոքր է").max(100000, "Անիրատեսական մակերես"),
  rooms: z.number().int().min(0).max(50).optional(),
  floor: z.number().int().min(-3).max(200).optional(),
  floorsTotal: z.number().int().min(1).max(200).optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  condition: z.enum(["new","renovated","good","needs_work"]).optional(),
});
```

- Outlier guard՝ `estimate`-ը clamp է median-ից ±3σ սահմանում server-side։
- Currency convert՝ base արժույթից live FX-ով (`GET /api/fx?from&to`); rate cache 1h։
- Claim/alert՝ պահանջում է auth (401 → login modal `?next`-ով)։

---

## 6. Responsive

- **≥1024px (lg).** Result-ը երկսյունակ, sticky CTA sidebar (`top-20`); comps grid 3 սյունակ; trend chart full-width main-ում։
- **768–1023px (md).** Մեկ սյունակ; CTA card-ը result-ից հետո inline; comps grid 2 սյունակ։
- **<768px (sm).** Hero compact; autocomplete + button stack; comps scroll-x; **fixed bottom bar** ([🏠 Claim] / [Վաճառիր]); chart-ները responsive `ResponsiveContainer`-ով։

---

## 7. Accessibility

- Autocomplete՝ `role="combobox"` + `aria-expanded` + `aria-activedescendant`; dropdown՝ `role="listbox"`, item՝ `role="option"`; keyboard ↑/↓/Enter/Esc։
- Range bar՝ `role="img"` + `aria-label="Գնահատված միջակայք 48 միլիոնից 56 միլիոն դրամ"`; ոչ միայն գույնով՝ low/high թվերը տեքստով։
- Confidence/factor-ները ուղղությունը ցույց են տալիս icon + տեքստ (ոչ միայն գույն)։
- Disclaimer-ները `role="note"`; error-ները `role="alert"`։
- Touch target ≥ 44px (CTA-ները `h-12/h-14`); contrast ≥ 4.5:1։
- Chart-ի համար՝ data table fallback (screen reader-ի համար)։

---

## 8. SEO & meta

- `<title>` = «Որքա՞ն արժե իմ տունը — անվճար գնահատում | {brand}»; `<meta name="description">` = «Իմացիր քո գույքի մոտավոր արժեքը վայրկյանների ընթացքում…»։
- Տարածքային landing-ներ (Phase 3)՝ `/home-value/yerevan`, `/home-value/yerevan/arabkir` — local SEO։
- Structured data՝ `FAQPage` (FAQ բաժին), `WebApplication` (գործիք)։
- OG image՝ generic «Home value» banner (estimate result-ը՝ private, OG չի ցուցադրում թիվ)։
- `hreflang` (hy/ru/en), `canonical` landing-ի վրա; share snapshot-ները՝ `noindex` (անձնական)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `hv_address_selected` | Autocomplete-ից հասցե ընտրում | `country, city, district` |
| `hv_estimate_requested` | [Հաշվել] submit | `property_type, area_m2` |
| `hv_estimate_shown` | Result render | `estimate, confidence, comps_count` |
| `hv_no_data` | 422 no_area_data | `fallback_level` |
| `home_claimed` | Claim my home success | `claimed_home_id` |
| `hv_sell_clicked` | [Վաճառիր] CTA | `estimate` |
| `hv_find_agent_clicked` | [Գտնել գործակալ] CTA | `district` |
| `hv_cta_clicked` | Հիփոթեք/pre-approval CTA | `target` |
| `hv_comp_clicked` | Comp card click | `property_id` |
| `hv_trend_toggle` | Estimate overlay toggle | — |
| `hv_share` | Share snapshot link | `hash` |
