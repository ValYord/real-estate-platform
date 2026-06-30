# Էջ 13 — Mortgage Calculators Hub (Հիփոթեքի հաշվիչներ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, tab առ tab վարք ու վիճակներ, formula-ներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API, validation), responsive, accessibility, SEO, analytics։

**URL.** `/mortgage/calculators` — tab-ով՝ `?tab=payment|affordability|refinance|rentvsbuy`; prefill՝ `?price=...&currency=...`
**Roles.** Բոլորը (անանուն օգտվում; հաշվարկ պահել՝ login, Guest → login modal `?next`-ով)։
**Primary goal (conversion).** Այցելուն հասկանա իր հնարավորությունները և անցնի **pre-approval** կամ **«Տեսնել rates»** / **«Տեսնել գույքեր այս գնով»**։ Lead-generation funnel դեպի partner banks ու listing search։

> ⚠️ **Տվյալներ.** Տոկոսադրույքի default-ը գալիս է `/mortgage/rates`-ից (partner banks, Phase 3); մինչ այդ՝ ձեռքով պահվող միջին rate ըստ երկրի/արժույթի։ Բոլոր արդյունքները՝ **estimate**, disclaimer-ով։

---

## 0. Ակնարկ (Overview)

Սա **engagement + lead գործիք էջն է**։ Հիփոթեքը գույք գնելու հիմնական խոչընդոտն է, ուստի հաշվիչները նվազեցնում են անորոշությունը և մարդուն մոտեցնում որոշման։ Չորս հաշվիչը պատասխանում են չորս հարցի՝ «Որքա՞ն կվճարեմ ամսական» (payment), «Որքա՞ն տուն կարող եմ թույլ տալ» (affordability), «Արժե՞ refinance անել» (refinance), «Վարձե՞լ թե՞ առնել» (rent vs buy)։

Էջը պետք է՝ (1) լինի **currency-aware** (header-ի արժույթ փոխելը re-converts բոլոր գումարները live FX-ով), (2) **prefill** անի property էջի mini-calc-ից (`?price=`), (3) ցույց տա արդյունքը **տեղում, live** (debounced client-side, առանց page reload), և (4) ամեն tab-ից առաջարկի հաջորդ քայլ (pre-approval / rates / search)։

Հաշվարկները **pure client-side functions** են (instant, offline-capable); API-ն միայն default rate-ի, save-ի և FX-ի համար։ Page shell-ը SSR (SEO); tab-երն ու chart-երը client component-ներ։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Հովիկը (property էջից, desktop).** Հովիկը property detail-ի mini-calc-ից սեղմել է «Մանրամասն հաշվիչ»։ Էջը բացվում է **Payment** tab-ով, price=52,000,000 ֏ prefilled, focus down payment-ի վրա։ Slider-ով կանխավճարը 20%-ից բարձրացնում է 30%-ի, ամսական վճարը live թարմացվում է, pie chart-ը վերագծվում։ Տեսնում է «Ընդհանուր տոկոս» և սեղմում **[Ստանալ pre-approval]**։ → lead (`mc_preapproval_clicked`)։

**Սցենար Բ — Առաջին գնորդ Լիլիթը (mobile).** Լիլիթը չգիտի՝ ինչ կարող է թույլ տալ։ Բացում է **Affordability** tab-ը, մուտքագրում ամսական եկամուտ 600,000 ֏, պարտքեր 50,000 ֏, կանխավճար 8M ֏։ Արդյունք՝ «Max ~31,000,000 ֏»։ Comfort bar-ով տեսնում է conservative/moderate/aggressive տարբերակները։ Սեղմում **[Տեսնել գույքեր այս գնով]** → `/search?priceMax=31000000`։ → cross-tool (`mc_see_listings`)։

**Սցենար Գ — Սեփականատեր Սուրենը (refinance, desktop).** Սուրենն ունի վարկ 28M ֏ մնացորդով, 16% rate-ով։ Refinance tab-ում մուտքագրում ընթացիկ պայմանները, նոր rate 13%, closing costs 300,000 ֏։ Տեսնում «Ամսական խնայողություն 42,000 ֏», «Break-even՝ 8 ամիս», verdict badge «Արժե»։ Պահում է հաշվարկը (login)։ → retention (`mc_calc_saved`)։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — երկսյունակ (inputs ձախ, output աջ)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Հիփոթեքի հաշվիչներ»  + currency note (text-sm)          │
│ ┌── TABS (border-b) ───────────────────────────────────────┐│
│ │[Ամսական վճար][Որքա՞ն կարող եմ][Refinance][Վարձ vs Առք]   ││
│ └──────────────────────────────────────────────────────────┘│
├──────────────────────────────────┬─────────────────────────┤
│ ◄ INPUTS (≈55%)                  │ ► OUTPUT (≈45%, sticky)  │
│ Գույքի գին [____] ֏              │ ┌── Ամսական վճար ──┐     │
│ Կանխավճար [slider ▓▓░] 20% [__] │ │ 412,000 ֏/ամիս    │     │
│ Տոկոսադրույք [__] %             │ │ (text-3xl bold)   │     │
│ Ժամկետ [10|15|20|25|30] տ       │ │ ┌─ Pie chart ─┐   │     │
│ (+ tax/insurance, collapsible)  │ │ │ Principal/   │   │     │
│                                  │ │ │ Interest     │   │     │
│                                  │ │ └─────────────┘   │     │
│                                  │ │ Breakdown rows    │     │
│                                  │ │ [Pre-approval]    │     │
│                                  │ │ [Տեսնել rates]    │     │
│                                  │ └───────────────────┘     │
├──────────────────────────────────┴─────────────────────────┤
│ DISCLAIMER · Related links · Partner bank CTA banner        │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 (text-2xl)            │
│ TABS (scroll-x snap)     │
├──────────────────────────┤
│ INPUTS (stack)           │
│  գին / down / rate / term│
├──────────────────────────┤
│ ── OUTPUT card ──        │
│ 412,000 ֏/ամիս           │
│ Pie chart (responsive)   │
│ Breakdown                │
│ [Pre-approval] (full-w)  │
├──────────────────────────┤
│ DISCLAIMER · links       │
│ FOOTER                   │
└──────────────────────────┘
```

- Output card-ը desktop-ում sticky `top-20`; mobile-ում inputs-ից հետո inline։
- Tab-երը mobile-ում horizontal scroll snap (`overflow-x-auto snap-x`)։

### Design tokens

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` (mobile `text-2xl`) |
| Tab active | `border-b-2 border-primary text-primary font-medium` |
| Tab inactive | `text-gray-500 hover:text-gray-700` |
| Output (մեծ թիվ) | `text-3xl font-bold text-gray-900` |
| «/ամիս» suffix | `text-base font-normal text-gray-500` |
| Slider track | `h-1.5 rounded-full bg-gray-200`, fill `bg-primary`, thumb `w-5 h-5 rounded-full bg-white border-2 border-primary` |
| Input | `h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 ring-primary` |
| Pie՝ Principal | `fill-primary`, Interest `fill-amber-400` |
| Verdict «Արժե» | `bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full` |
| Verdict «Չարժե» | `bg-gray-100 text-gray-600` |
| Disclaimer | `text-xs text-gray-400` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-5` |

---

## 3. Tab առ tab (Section-by-section)

### 3.1 Tabs (shared)

- **Տեսք.** `border-b border-gray-200`, 4 tab, active՝ `border-b-2 border-primary`։
- **Վարք.** Tab փոխելը՝ URL `?tab=` deep-link; **ընդհանուր input-ները (price, currency) պահպանվում են** tab-երի միջև (shared store)։
- **Տեխ.** `<CalcTabs active />` + Zustand store ընդհանուր state-ի համար (price, currency, rate, term)։

### 3.2 Tab 1 — Monthly Payment (Ամսական վճար)

**Inputs.**
- **Գույքի գին** (number, currency) — prefill `?price=`-ից։
- **Կանխավճար (Down payment)** — `%` slider **կամ** գումար (երկուսը synced, փոխելը մյուսը update-ում)։ Default 20%։
- **Տոկոսադրույք (տարեկան %)** — default rates-ից ըստ արժույթ/երկիր; ձեռքով փոխելի։
- **Ժամկետ (Term)** — pill select՝ 10/15/20/25/30 տ (կամ custom)։
- *(Optional, collapsible)* Գույքահարկ/ամսական, ապահովագրություն, սպասարկում/HOA։

**Output.**
- **Ամսական վճար (մեծ թիվ).** Principal + Interest (+ optional tax/insurance)։
  - **Formula (annuity / PMT):**
    ```
    P = price − downPayment              (loan principal)
    r = annualRate / 12 / 100            (monthly rate)
    n = termYears × 12                   (payments)
    M = P × r × (1+r)^n / ((1+r)^n − 1)
    եթե r = 0 →  M = P / n               (linear, division-by-zero guard)
    ```
- **Breakdown.** Loan amount, Total interest (`M×n − P`), Total cost (`downPayment + M×n`)։
- **Pie chart (Recharts).** Principal vs Total interest (loan-ի կազմ)։
- **Amortization (collapsible, Phase 2).** Ամսական principal/interest split + մնացորդ; կամ տարեկան ամփոփ + chart։

**Actions.** **[Ստանալ pre-approval]** → pre-approval/`/mortgage/rates` · **[Տեսնել rates]** → `/mortgage/rates` · **[Պահել հաշվարկը]** (login) · **[Share]** → link prefilled։

### 3.3 Tab 2 — Affordability (Որքա՞ն տուն կարող եմ թույլ տալ)

**Inputs.** Ամսական/տարեկան եկամուտ · Ամսական պարտքեր (debts) · Կանխավճար (հասանելի) · Տոկոսադրույք + Ժամկետ (defaults rates-ից) · *(Optional)* DTI ceiling (default 36–43%)։

**Output.**
- **Max գույքի գին (մեծ թիվ).**
  - **Formula:**
    ```
    maxMonthlyPayment = incomeMonthly × DTI − existingDebtsMonthly
    r = annualRate/12/100 ;  n = termYears×12
    maxLoan  = maxMonthlyPayment × ((1+r)^n − 1) / (r × (1+r)^n)
    maxPrice = maxLoan + downPayment
    ```
- **Breakdown.** Max loan, max ամսական վճար, որ DTI-ով հաշվարկվեց։
- **Comfort bar.** Conservative / moderate / aggressive (տարբեր DTI slider-ով՝ 28% / 36% / 43%)։

**Actions.** **[Տեսնել գույքեր այս գնով]** → `/search?priceMax={maxPrice}` · **[Ստանալ pre-approval]**։

### 3.4 Tab 3 — Refinance

**Inputs.** Ընթացիկ վարկի մնացորդ · Ընթացիկ ամսական վճար / rate · Մնացած ժամկետ · Նոր rate (default rates-ից) + նոր ժամկետ · Refinance ծախսեր (closing costs, optional)։

**Output.**
- **Նոր ամսական վճար** (PMT, Tab 1-ի formula-ով, նոր rate/term-ով)։
- **Ամսական խնայողություն.** `currentPayment − newPayment`։
- **Break-even point.** `closingCosts / monthlySavings` → «N ամսից refinance-ը մարվում է»։
- **Ընդհանուր խնայողություն** ժամկետի ընթացքում (նոր total interest vs հին)։
- **Verdict badge.** «Արժե / Չարժե» ըստ break-even + horizon-ի։

### 3.5 Tab 4 — Rent vs Buy (Վարձ vs Առք)

**Inputs.** Գույքի գին + down payment + rate + term · Ամսական վարձ (համեմատելի գույքի) · Քանի՞ տարի կմնաս (horizon slider) · *(Optional)* Տարեկան գնի աճ %, վարձի աճ %, սպասարկում/հարկ %։

**Output.**
- **Break-even տարի.** Որ տարում առնելը դառնում է վարձելուց էժան (cumulative cost crossover)։
  - **Formula (cumulative, ըստ տարվա t):**
    ```
    rentCost(t)  = Σ monthlyRent × 12 × (1+rentGrowth)^k,  k=0..t-1
    buyCost(t)   = downPayment
                 + Σ monthlyPayment × 12
                 + Σ (tax + maintenance + insurance)
                 − equityBuilt(t)            (principal մարված)
                 − appreciation(t)           (price × (1+priceGrowth)^t − price)
    breakEven    = min t : buyCost(t) ≤ rentCost(t)
    ```
- **Line chart (Recharts).** Cumulative cost՝ Rent vs Buy ժամանակի ընթացքում (2 line, crossover կետը նշված)։
- **Verdict.** «Քո horizon-ի համար ձեռնտու է ՎԱՐՁԵԼ / ԱՌՆԵԼ»։

### 3.6 Shared sections (բոլոր tab-երի տակ)

- **Disclaimer.** «Հաշվարկները estimate են, ոչ ֆինանսական խորհրդատվություն։ Փաստացի rate-ները կախված են բանկից և քո պրոֆիլից։»
- **Related links.** Rates (`/mortgage/rates`) · Pre-approval · Guides (հիփոթեքի ուղեցույցներ) · Home value (`/home-value`)։
- **Partner bank CTA banner** (Phase 3)՝ «Համեմատիր rates {N} բանկից» → `/mortgage/rates`։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Default** | Payment tab, default rate բեռնված, output-ը 0/placeholder մինչ input |
| **Prefilled (`?price=`)** | Price/currency լրացված, focus down payment-ի վրա, output անմիջապես հաշված |
| **Live editing** | Input փոխելիս output + chart-ը live update (debounced 200ms) |
| **Rate loading** | Default rate fetch ընթացքում՝ rate field-ում spinner, output placeholder |
| **Validation error** | Down>price / rate<0 / term=0 → inline error, output՝ «—» |
| **Saved (login)** | Toast «Հաշվարկը պահվեց», dashboard-ից restore-ելի |
| **Save (guest)** | [Պահել] → login modal `?next`-ով |
| **Error (FX/rate API)** | Fallback՝ վերջին cached rate + banner «Rate-ը հնարավոր է հնացած» |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<MortgageCalcPage> (Server Component, SSR — shell/SEO)
 ├─ <CalcTabs active />                            (client, URL-synced)
 ├─ <SharedInputsProvider>                         (Zustand: price, currency, rate, term)
 ├─ <PaymentCalc />        (client) ──► <PaymentPieChart /> (Recharts)
 ├─ <AffordabilityCalc />  (client) ──► <ComfortBar />
 ├─ <RefinanceCalc />      (client) ──► <VerdictBadge />
 ├─ <RentVsBuyCalc />      (client) ──► <RentBuyLineChart /> (Recharts)
 ├─ <CalcDisclaimer />
 ├─ <RelatedLinks />
 └─ <PartnerBankBanner />                          (Phase 3)
```

Հաշվարկները՝ pure functions՝ `lib/mortgage.ts` (`pmt()`, `maxAffordable()`, `refinance()`, `rentVsBuy()`), unit-tested, currency-agnostic (թվերի վրա, currency-ն display layer)։

### Data fields used

`users.currency` (display); estimate-ները չեն պահվում DB-ում, բացի saved calc-ից։
`saved_calcs (նոր): id, user_id, type(payment/affordability/refinance/rentvsbuy), inputs(json), currency, created_at`

### API contract-ներ

**`GET /api/mortgage/default-rate?country=AM&currency=AMD&term=20`**
```jsonc
// 200 OK
{ "ratePct": 13.5, "source": "manual", "updatedAt": "2026-06-01", "country": "AM", "currency": "AMD" }
// 404 { "error": "no_rate", "fallbackRatePct": 14 }
```

**`POST /api/mortgage/save`** (login)
```jsonc
// request { "type": "refinance", "inputs": { ... }, "currency": "AMD" }
// 201     { "savedCalcId": 91 }
// 401     { "error": "auth_required" }   → login modal
```

**`GET /api/fx?from=AMD&to=USD`** → `200 { "rate": 0.0026, "updatedAt": "..." }` (cache 1h)

### Validation (zod)

```ts
const paymentSchema = z.object({
  price: z.number().positive("Գինը պարտադիր է"),
  downPayment: z.number().min(0).refine(d => true, ""),  // < price ստուգում cross-field
  ratePct: z.number().min(0, "Տոկոսը չի կարող բացասական լինել").max(100),
  termYears: z.number().int().min(1, "Ժամկետը պարտադիր է").max(40),
}).refine(v => v.downPayment < v.price, {
  message: "Կանխավճարը չի կարող գերազանցել գինը", path: ["downPayment"],
});
```

- Edge `rate=0` → formula switch է անում linear-ի (`P/n`)։
- Currency switch → re-convert բոլոր գումարները live FX-ով; rate (%) չի փոխվում, բայց default rate-ը կարող է տարբեր լինել ըստ արժույթ/երկիր (RUB vs USD հիփոթեքն ունի տարբեր միջին rate)։
- Inputs debounced 200ms-ով՝ chart-ի re-render-ը throttle անելու համար։

---

## 6. Responsive

- **≥1024px (lg).** Երկսյունակ՝ inputs ձախ (55%) + sticky output card աջ (45%); chart-երը output-ի ներսում։
- **768–1023px (md).** Մեկ սյունակ; output card inputs-ից հետո; tab-երը full-width։
- **<768px (sm).** Tab-երը scroll-x snap; inputs stack; output card full-width inline; chart-ները `ResponsiveContainer`-ով; CTA-ները full-width։

---

## 7. Accessibility

- Slider-ները՝ `role="slider"` + `aria-valuemin/max/now` + `aria-label` («Կանխավճար տոկոս»); keyboard ←/→ քայլ։
- Down payment %/գումար sync՝ երկու input-ն էլ `aria-label`-ով, փոփոխությունը հայտարարվում է `aria-live="polite"`-ով output-ում։
- Pie/line chart-երը՝ `aria-label` + data table fallback (screen reader)։
- Verdict badge-ը՝ տեքստով («Արժե»), ոչ միայն գույն/icon։
- Error-ները `role="alert"`, output-ի live update՝ `aria-live="polite"`։
- Touch target ≥ 44px; contrast ≥ 4.5:1; tab-երը keyboard-հասանելի (`role="tablist"`/`tab`/`tabpanel`)։

---

## 8. SEO & meta

- `<title>` = «Հիփոթեքի հաշվիչ — ամսական վճար, affordability | {brand}»; description՝ հաշվիչների ամփոփում։
- Ամեն հաշվիչ կարող է ունենալ own indexable landing՝ `/mortgage/calculators/payment`, `/affordability` (canonical hub-ին կամ self, խնամքով)։
- Structured data՝ `FAQPage` + `WebApplication`։
- `hreflang` (hy/ru/en), `canonical`; prefill query-ները (`?price=`)՝ `noindex` variant (canonical մաքուր URL-ին)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `mc_tab_changed` | Tab փոխում | `tab` |
| `mc_prefilled` | `?price=` load | `price, currency` |
| `mc_calc_used` | Input փոփոխություն (debounced) | `tab` |
| `mc_preapproval_clicked` | [Pre-approval] CTA | `tab, loan_amount` |
| `mc_see_rates` | [Տեսնել rates] | `tab` |
| `mc_see_listings` | [Տեսնել գույքեր այս գնով] | `max_price` |
| `mc_calc_saved` | [Պահել] success | `tab` |
| `mc_share` | [Share] link | `tab` |
| `mc_currency_changed` | Header currency switch (այս էջում) | `from, to` |
