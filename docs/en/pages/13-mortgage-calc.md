# Page 13 — Mortgage Calculators Hub (Mortgage calculators) 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, tab-by-tab behavior and states, formulas, microcopy (English), technical part (components, props, API, validation), responsive, accessibility, SEO, analytics.

**URL.** `/mortgage/calculators` — with a tab: `?tab=payment|affordability|refinance|rentvsbuy`; prefill: `?price=...&currency=...`
**Roles.** Everyone (anonymous use; saving a calculation: login, Guest → login modal with `?next`).
**Primary goal (conversion).** The visitor understands their options and moves on to **pre-approval** or **"See rates"** / **"See properties at this price"**. A lead-generation funnel toward partner banks and listing search.

> ⚠️ **Data.** The default interest rate comes from `/mortgage/rates` (partner banks, Phase 3); until then, a manually maintained average rate by country/currency. All results are an **estimate**, with a disclaimer.

---

## 0. Overview

This is the **engagement + lead tool page**. A mortgage is the main obstacle to buying property, so the calculators reduce uncertainty and bring the person closer to a decision. The four calculators answer four questions: "How much will I pay monthly" (payment), "How much home can I afford" (affordability), "Is it worth refinancing" (refinance), "Rent or buy" (rent vs buy).

The page must: (1) be **currency-aware** (changing the header currency re-converts all amounts with live FX), (2) **prefill** from the property page mini-calc (`?price=`), (3) show the result **in place, live** (debounced client-side, without page reload), and (4) suggest the next step from each tab (pre-approval / rates / search).

The calculations are **pure client-side functions** (instant, offline-capable); the API is only for the default rate, save, and FX. The page shell is SSR (SEO); the tabs and charts are client components.

---

## 1. User scenarios

**Scenario A — Buyer Hovik (from the property page, desktop).** Hovik clicked "Detailed calculator" from the property detail mini-calc. The page opens on the **Payment** tab, price=52,000,000 ֏ prefilled, focus on the down payment. With the slider he raises the down payment from 20% to 30%, the monthly payment updates live, the pie chart redraws. He sees "Total interest" and clicks **[Get pre-approval]**. → lead (`mc_preapproval_clicked`).

**Scenario B — First-time buyer Lilit (mobile).** Lilit doesn't know what she can afford. She opens the **Affordability** tab, enters monthly income 600,000 ֏, debts 50,000 ֏, down payment 8M ֏. Result: "Max ~31,000,000 ֏". With the comfort bar she sees the conservative/moderate/aggressive options. She clicks **[See properties at this price]** → `/search?priceMax=31000000`. → cross-tool (`mc_see_listings`).

**Scenario C — Owner Suren (refinance, desktop).** Suren has a loan with a 28M ֏ balance at 16% rate. In the refinance tab he enters the current terms, new rate 13%, closing costs 300,000 ֏. He sees "Monthly savings 42,000 ֏", "Break-even: 8 months", verdict badge "Worth it". He saves the calculation (login). → retention (`mc_calc_saved`).

---

## 2. Layout & visual structure

### Desktop (≥1024px) — two-column (inputs left, output right)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Mortgage calculators»  + currency note (text-sm)       │
│ ┌── TABS (border-b) ───────────────────────────────────────┐│
│ │[Monthly payment][How much can I][Refinance][Rent vs Buy] ││
│ └──────────────────────────────────────────────────────────┘│
├──────────────────────────────────┬─────────────────────────┤
│ ◄ INPUTS (≈55%)                  │ ► OUTPUT (≈45%, sticky)  │
│ Property price [____] ֏          │ ┌── Monthly payment ──┐  │
│ Down payment [slider ▓▓░] 20%[__]│ │ 412,000 ֏/mo      │     │
│ Interest rate [__] %            │ │ (text-3xl bold)   │     │
│ Term [10|15|20|25|30] yr        │ │ ┌─ Pie chart ─┐   │     │
│ (+ tax/insurance, collapsible)  │ │ │ Principal/   │   │     │
│                                  │ │ │ Interest     │   │     │
│                                  │ │ └─────────────┘   │     │
│                                  │ │ Breakdown rows    │     │
│                                  │ │ [Pre-approval]    │     │
│                                  │ │ [See rates]       │     │
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
│ price / down / rate / term│
├──────────────────────────┤
│ ── OUTPUT card ──        │
│ 412,000 ֏/mo            │
│ Pie chart (responsive)   │
│ Breakdown                │
│ [Pre-approval] (full-w)  │
├──────────────────────────┤
│ DISCLAIMER · links       │
│ FOOTER                   │
└──────────────────────────┘
```

- The output card is sticky `top-20` on desktop; on mobile it is inline after the inputs.
- On mobile the tabs are a horizontal scroll snap (`overflow-x-auto snap-x`).

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` (mobile `text-2xl`) |
| Tab active | `border-b-2 border-primary text-primary font-medium` |
| Tab inactive | `text-gray-500 hover:text-gray-700` |
| Output (large number) | `text-3xl font-bold text-gray-900` |
| "/mo" suffix | `text-base font-normal text-gray-500` |
| Slider track | `h-1.5 rounded-full bg-gray-200`, fill `bg-primary`, thumb `w-5 h-5 rounded-full bg-white border-2 border-primary` |
| Input | `h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 ring-primary` |
| Pie: Principal | `fill-primary`, Interest `fill-amber-400` |
| Verdict "Worth it" | `bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full` |
| Verdict "Not worth it" | `bg-gray-100 text-gray-600` |
| Disclaimer | `text-xs text-gray-400` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-5` |

---

## 3. Tab-by-tab (Section-by-section)

### 3.1 Tabs (shared)

- **Appearance.** `border-b border-gray-200`, 4 tabs, active: `border-b-2 border-primary`.
- **Behavior.** Changing the tab: URL `?tab=` deep-link; **the shared inputs (price, currency) are preserved** across tabs (shared store).
- **Tech.** `<CalcTabs active />` + Zustand store for the shared state (price, currency, rate, term).

### 3.2 Tab 1 — Monthly Payment

**Inputs.**
- **Property price** (number, currency) — prefill from `?price=`.
- **Down payment** — `%` slider **or** amount (the two synced, changing one updates the other). Default 20%.
- **Interest rate (annual %)** — from default rates by currency/country; manually editable.
- **Term** — pill select: 10/15/20/25/30 yr (or custom).
- *(Optional, collapsible)* Property tax/monthly, insurance, maintenance/HOA.

**Output.**
- **Monthly payment (large number).** Principal + Interest (+ optional tax/insurance).
  - **Formula (annuity / PMT):**
    ```
    P = price − downPayment              (loan principal)
    r = annualRate / 12 / 100            (monthly rate)
    n = termYears × 12                   (payments)
    M = P × r × (1+r)^n / ((1+r)^n − 1)
    if r = 0 →  M = P / n                (linear, division-by-zero guard)
    ```
- **Breakdown.** Loan amount, Total interest (`M×n − P`), Total cost (`downPayment + M×n`).
- **Pie chart (Recharts).** Principal vs Total interest (loan composition).
- **Amortization (collapsible, Phase 2).** Monthly principal/interest split + balance; or annual summary + chart.

**Actions.** **[Get pre-approval]** → pre-approval/`/mortgage/rates` · **[See rates]** → `/mortgage/rates` · **[Save calculation]** (login) · **[Share]** → prefilled link.

### 3.3 Tab 2 — Affordability (How much home can I afford)

**Inputs.** Monthly/annual income · Monthly debts · Down payment (available) · Interest rate + Term (defaults from rates) · *(Optional)* DTI ceiling (default 36–43%).

**Output.**
- **Max property price (large number).**
  - **Formula:**
    ```
    maxMonthlyPayment = incomeMonthly × DTI − existingDebtsMonthly
    r = annualRate/12/100 ;  n = termYears×12
    maxLoan  = maxMonthlyPayment × ((1+r)^n − 1) / (r × (1+r)^n)
    maxPrice = maxLoan + downPayment
    ```
- **Breakdown.** Max loan, max monthly payment, which DTI was used in the calculation.
- **Comfort bar.** Conservative / moderate / aggressive (with different DTI slider: 28% / 36% / 43%).

**Actions.** **[See properties at this price]** → `/search?priceMax={maxPrice}` · **[Get pre-approval]**.

### 3.4 Tab 3 — Refinance

**Inputs.** Current loan balance · Current monthly payment / rate · Remaining term · New rate (default from rates) + new term · Refinance costs (closing costs, optional).

**Output.**
- **New monthly payment** (PMT, with Tab 1's formula, using the new rate/term).
- **Monthly savings.** `currentPayment − newPayment`.
- **Break-even point.** `closingCosts / monthlySavings` → "the refinance pays off in N months".
- **Total savings** over the term (new total interest vs old).
- **Verdict badge.** "Worth it / Not worth it" by break-even + horizon.

### 3.5 Tab 4 — Rent vs Buy

**Inputs.** Property price + down payment + rate + term · Monthly rent (of a comparable property) · How many years you'll stay (horizon slider) · *(Optional)* Annual price growth %, rent growth %, maintenance/tax %.

**Output.**
- **Break-even year.** The year in which buying becomes cheaper than renting (cumulative cost crossover).
  - **Formula (cumulative, by year t):**
    ```
    rentCost(t)  = Σ monthlyRent × 12 × (1+rentGrowth)^k,  k=0..t-1
    buyCost(t)   = downPayment
                 + Σ monthlyPayment × 12
                 + Σ (tax + maintenance + insurance)
                 − equityBuilt(t)            (principal paid down)
                 − appreciation(t)           (price × (1+priceGrowth)^t − price)
    breakEven    = min t : buyCost(t) ≤ rentCost(t)
    ```
- **Line chart (Recharts).** Cumulative cost: Rent vs Buy over time (2 lines, crossover point marked).
- **Verdict.** "For your horizon it is more advantageous to RENT / BUY".

### 3.6 Shared sections (below all tabs)

- **Disclaimer.** "The calculations are estimates, not financial advice. Actual rates depend on the bank and your profile."
- **Related links.** Rates (`/mortgage/rates`) · Pre-approval · Guides (mortgage guides) · Home value (`/home-value`).
- **Partner bank CTA banner** (Phase 3): "Compare rates from {N} banks" → `/mortgage/rates`.

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **Default** | Payment tab, default rate loaded, output is 0/placeholder until input |
| **Prefilled (`?price=`)** | Price/currency filled, focus on the down payment, output computed immediately |
| **Live editing** | When changing an input, the output + chart update live (debounced 200ms) |
| **Rate loading** | While the default rate is fetching: spinner in the rate field, output placeholder |
| **Validation error** | Down>price / rate<0 / term=0 → inline error, output: "—" |
| **Saved (login)** | Toast "Calculation saved", restorable from the dashboard |
| **Save (guest)** | [Save] → login modal with `?next` |
| **Error (FX/rate API)** | Fallback: last cached rate + banner "The rate may be outdated" |

---

## 5. Technical depth

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

The calculations are pure functions: `lib/mortgage.ts` (`pmt()`, `maxAffordable()`, `refinance()`, `rentVsBuy()`), unit-tested, currency-agnostic (operating on numbers, currency is the display layer).

### Data fields used

`users.currency` (display); estimates are not stored in the DB, except for saved calcs.
`saved_calcs (new): id, user_id, type(payment/affordability/refinance/rentvsbuy), inputs(json), currency, created_at`

### API contracts

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
  price: z.number().positive("Price is required"),
  downPayment: z.number().min(0).refine(d => true, ""),  // < price checked cross-field
  ratePct: z.number().min(0, "The rate cannot be negative").max(100),
  termYears: z.number().int().min(1, "Term is required").max(40),
}).refine(v => v.downPayment < v.price, {
  message: "The down payment cannot exceed the price", path: ["downPayment"],
});
```

- Edge `rate=0` → the formula switches to linear (`P/n`).
- Currency switch → re-convert all amounts with live FX; the rate (%) does not change, but the default rate may differ by currency/country (a RUB vs USD mortgage has a different average rate).
- Inputs debounced by 200ms to throttle the chart re-render.

---

## 6. Responsive

- **≥1024px (lg).** Two-column: inputs left (55%) + sticky output card right (45%); charts inside the output.
- **768–1023px (md).** Single column; output card after the inputs; tabs full-width.
- **<768px (sm).** Tabs scroll-x snap; inputs stack; output card full-width inline; charts via `ResponsiveContainer`; CTAs full-width.

---

## 7. Accessibility

- Sliders: `role="slider"` + `aria-valuemin/max/now` + `aria-label` ("Down payment percent"); keyboard ←/→ step.
- Down payment %/amount sync: both inputs with `aria-label`, the change announced via `aria-live="polite"` in the output.
- Pie/line charts: `aria-label` + data table fallback (screen reader).
- Verdict badge: in text ("Worth it"), not by color/icon alone.
- Errors `role="alert"`, output live update: `aria-live="polite"`.
- Touch target ≥ 44px; contrast ≥ 4.5:1; tabs keyboard-accessible (`role="tablist"`/`tab`/`tabpanel`).

---

## 8. SEO & meta

- `<title>` = "Mortgage calculator — monthly payment, affordability | {brand}"; description: a summary of the calculators.
- Each calculator can have its own indexable landing page: `/mortgage/calculators/payment`, `/affordability` (canonical to the hub or self, carefully).
- Structured data: `FAQPage` + `WebApplication`.
- `hreflang` (hy/ru/en), `canonical`; prefill queries (`?price=`): `noindex` variant (canonical to the clean URL).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `mc_tab_changed` | Tab change | `tab` |
| `mc_prefilled` | `?price=` load | `price, currency` |
| `mc_calc_used` | Input change (debounced) | `tab` |
| `mc_preapproval_clicked` | [Pre-approval] CTA | `tab, loan_amount` |
| `mc_see_rates` | [See rates] | `tab` |
| `mc_see_listings` | [See properties at this price] | `max_price` |
| `mc_calc_saved` | [Save] success | `tab` |
| `mc_share` | [Share] link | `tab` |
| `mc_currency_changed` | Header currency switch (on this page) | `from, to` |
