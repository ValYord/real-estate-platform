# Page 13 — Mortgage Calculators Hub: Design → Dev Handoff (MVP: Monthly Payment calculator only)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/13-mortgage-calc.md`](../en/pages/13-mortgage-calc.md) (deep spec,
4 calculators: Payment / Affordability / Refinance / Rent-vs-Buy, tabbed hub,
default-rate API, FX conversion, save/share, lead-gen CTAs). This document does
**not** repeat that spec in full; it exists to pin down the **MVP scope** for the
current task (single core calculator, no backend) and to close the gap between
the generic spec and *this specific codebase*.

Audited against the current tree: `components/wizard/steps/Step5Price.tsx` (the
currency-pill + labeled-number-input pattern to mirror), `store/currencyStore.ts`
(confirms this codebase's existing currency handling is **display-only, no live
FX conversion** — same rule applies here, see D2), `lib/listings/schemas.ts`
(`z.coerce.number()` convention for RHF-bound numeric fields, `errorMap` style
enums), `app/[locale]/property/[id]/[slug]/page.tsx` (`generateMetadata` +
`alternates.languages` hreflang pattern, `formatPriceShort`/`CURRENCY_SYMBOL`
convention), `app/[locale]/favorites/page.tsx` (SSR shell + breadcrumb markup,
`robots` metadata pattern), `vitest.config.ts` (`environment: 'node'`, no
DOM/RTL — tests target `lib/` pure functions only), `components/layout/Header.tsx`
line 60 and `components/layout/Footer.tsx` line 22 (both already link to
`/mortgage/calculators` — see D1, this is a real conflict with the task brief's
literal route and needs a decision), `package.json` (no charting library
installed — see D3), `middleware.ts` / `lib/auth/protectedPaths.ts` (this route
must **not** be added to `PROTECTED_PATHS` — anonymous use is required).

---

## 0. MVP scope for this task (read before building)

Build exactly the "In scope" list from the task brief: a single, standalone,
client-side **monthly payment** calculator (home price, down payment, rate,
term, currency → monthly payment, total interest, total cost, live amortization
summary). Everything else in the generic page-spec — the Affordability /
Refinance / Rent-vs-Buy tabs, the tab bar itself, `?price=`/`?tab=` prefill and
deep-linking, the default-rate API (`GET /api/mortgage/default-rate`), live FX
re-conversion on currency switch, save/share (`POST /api/mortgage/save`, login
modal), the pre-approval / "See rates" / "See properties at this price" CTAs,
the partner-bank banner, and `FAQPage`/`WebApplication` structured data — is
**explicitly deferred**. Do not build it, do not stub it with a disabled
tab/button. Keep the diff minimal per `CLAUDE.md`.

**In scope:**
- `/[locale]/mortgage-calculators` (see D1 for the exact route decision), SSR
  shell (Server Component) + one client component owning the calculator.
- Inputs: home price, down payment (amount, synced with a percent slider),
  annual interest rate (%), term (years, pill presets + custom), currency
  (AMD/RUB/USD/EUR, display-only per D2).
- Output: monthly payment (large number), loan amount, total interest, total
  cost, principal-vs-interest composition bar, annual amortization summary
  table (collapsible, still computed live per D3).
- Client-side validation (react-hook-form + zod) with inline errors; guards:
  price > 0, down payment ≥ 0 and < price, rate 0–30%, term 1–40 years (D4).
- Basic SEO: title, meta description, canonical, hreflang. Indexable (no
  `robots: noindex` — this is a public marketing/tool page, unlike
  `/compare` or `/favorites`).
- Keyboard-operable, labeled form controls, `aria-live` result region.

**Explicitly out of scope (do not build):** Affordability / Refinance /
Rent-vs-Buy calculators, tab bar, `?tab=`/`?price=` query prefill, any
`/api/mortgage/*` route, FX conversion, save/share, login modal, pre-approval
/ rates / listings CTAs, partner-bank banner, `FAQPage`/`WebApplication`
JSON-LD, property-tax/insurance/HOA optional fields (doc's §3.2 "collapsible"
extras — fold into a follow-up alongside Affordability/Refinance/Rent-vs-Buy,
see §11).

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Task brief says the route is `/mortgage-calculators` (flat, stated twice — "In scope" and acceptance criteria). The generic spec uses `/mortgage/calculators` (nested, with `?tab=`). **`components/layout/Header.tsx:60` and `components/layout/Footer.tsx:22` already hardcode `href: '/mortgage/calculators'`.** | Build the route at **`app/[locale]/mortgage-calculators/page.tsx`** (flat, matches the task brief and acceptance criteria literally). **Also update** `Header.tsx:60` and `Footer.tsx:22` hrefs from `/mortgage/calculators` → `/mortgage-calculators` (2-line diff) so the newly-built page is actually reachable from primary nav instead of shipping unreachable. Leave the other `mortgage` submenu items (`Rates` → `/mortgage/rates`, `Pre-approval` → `/mortgage/pre-approval`) untouched — those pages don't exist yet and are out of scope (Page 14 / Phase 3). | The task brief is the authoritative spec for *this* piece of work and is unambiguous; the generic doc's nested URL was designed around a 4-tab hub that isn't being built here. Fixing two dead hrefs to point at the page this task actually ships is a trivial, low-risk correction, not scope creep — leaving it unreachable from nav would be a worse outcome than a 2-line edit. |
| D2 | Generic spec: "changing the header currency re-converts all amounts with live FX" (`GET /api/fx`). | **No FX conversion.** Currency selection changes the displayed symbol/label only — the number the user typed stays the number used in the formula, now labeled in the selected currency. Switching currency **does** reset the rate field to that currency's default sample rate (see D3's constants table), since real average mortgage rates differ by currency/market — but does not rescale the entered price/down-payment figures. | Matches `store/currencyStore.ts`'s existing documented behavior verbatim: *"UI-only in this iteration — no live exchange-rate conversion."* No other page in this codebase does live FX conversion; building it here would be new infrastructure well beyond a single calculator page, and the task explicitly puts "integration with live... data" and backend calls out of scope. |
| D3 | Generic spec: rate defaults from `GET /api/mortgage/default-rate` (Phase 3); pie chart via Recharts. | **Static default rates**, one per currency, in `lib/mortgage/constants.ts` (editable by the user, not fetched). **No chart library** — `recharts` is not a dependency in `package.json` and the task explicitly excludes live-rate integration; adding a charting dependency for one page is unjustified. The "loan composition" visual is a plain two-segment horizontal bar (`div` flex, `bg-primary` for principal / `bg-amber-400` for interest — same color mapping the generic spec assigns to its pie chart, so the visual language still lines up if Recharts is introduced later). The **amortization summary** (task acceptance criteria explicitly requires this) is an **annual table** (year, principal paid, interest paid, remaining balance), not a chart — satisfies "table or chart" per the task brief's own wording, computed via `useMemo` so it updates on every input change without a debounce (no expensive re-render to throttle without a chart). | Keeps the diff to zero new npm dependencies and no new API routes, consistent with the task's "pure client-side math, no backend calls required." |
| D4 | Generic spec's zod: `ratePct: z.number().min(0).max(100)`, `termYears: z.number().int().min(1).max(40)`. | Keep `termYears` bounds as-is (1–40). **Tighten `ratePct` to 0–30**, not 0–100. | Task brief asks for "rate within a realistic range" specifically (stronger wording than the generic spec). 100% APR is not a realistic mortgage rate anywhere and is far more likely to be a fat-fingered typo (e.g. "10.0" → "100"); 30% comfortably covers even distressed/high-inflation markets while still catching input errors before they silently produce a nonsensical monthly payment. |
| D5 | Generic spec assumes a full i18n hub with per-tab, per-locale microcopy. | Route is **locale-prefixed** (`/[locale]/mortgage-calculators`, via `i18n/routing.ts`, `localePrefix: 'always'`) so the URL round-trips the locale segment, but **page chrome copy is hardcoded English**, matching every comparable page shipped so far (`favorites/page.tsx`, `compare/page.tsx` — see `docs/design/25-compare-handoff.md` D4). `messages/*.json` has no calculator-related namespace; do not add one for this task. | Same reasoning `docs/design/25-compare-handoff.md` D4 already established for this codebase: "i18n-aware route" = the URL correctly carries `[locale]`, not that every string is translated yet. Introducing a new translation namespace for one page's form labels is disproportionate to this task. |
| D6 | Generic spec: property price prefilled from a property-detail mini-calc (`?price=`), page is an "engagement + lead tool" tied into the funnel. | **No prefill, no cross-links to `/search`, `/mortgage/rates`, or pre-approval.** The page is fully self-contained: it starts empty (or with sensible defaults) and stays that way. | Task brief explicitly frames this as "a standalone, self-contained tool page independent of listings/agent data" and separately lists "lead-gen forms tying the calculator to an agent/lender" as out of scope. `/mortgage/rates` and pre-approval pages don't exist yet either — linking to them would ship dead links. |

---

## 2. Component inventory

```
app/[locale]/mortgage-calculators/
  page.tsx                          (NEW — Server Component shell: generateMetadata
                                      (title/description/canonical/hreflang, D1/§8),
                                      renders static H1/intro/disclaimer +
                                      <MortgagePaymentCalculator />)

components/mortgage/
  MortgagePaymentCalculator.tsx     (NEW — client: react-hook-form + zodResolver,
                                      owns all input state, computes results via
                                      useMemo from lib/mortgage/calculations.ts,
                                      renders the two-column input/output layout)
  CompositionBar.tsx                (NEW — client or pure-props: the principal/
                                      interest horizontal bar, §4)
  AmortizationTable.tsx             (NEW — pure-props render: <details> wrapping
                                      the annual amortization rows, §3.2)

lib/mortgage/
  calculations.ts                   (NEW — pure functions: calculateMonthlyPayment
                                      (pmt), calculateTotals, buildAnnualSchedule;
                                      unit-tested, currency-agnostic — operates on
                                      plain numbers, §6)
  schemas.ts                        (NEW — paymentInputSchema (zod), §7)
  constants.ts                      (NEW — DEFAULT_RATE_BY_CURRENCY, TERM_PRESETS,
                                      RATE_MIN/MAX, TERM_MIN/MAX, CURRENCIES
                                      (value/symbol/label), §7)

components/layout/
  Header.tsx                        (EDIT — line 60 href fix, D1)
  Footer.tsx                        (EDIT — line 22 href fix, D1)
```

Reuse, don't fork: the currency-pill button pattern from
`components/wizard/steps/Step5Price.tsx:53-75` (`aria-pressed`, `bg-primary
text-white` selected state), its number-input styling (`h-11 border
border-gray-300 rounded-lg px-3 focus:ring-2 ring-primary`, `aria-invalid`,
`aria-describedby`, `role="alert"` error paragraph), `lib/utils.ts`'s `cn()`
helper, and the breadcrumb markup from `app/[locale]/favorites/page.tsx:58-84`
(desktop `Home › X` / mobile `‹ Back`).

---

## 3. Wireframes

### 3.1 Desktop (≥1024px) — two-column

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Mortgage calculator                                   │
│ H1 "Mortgage calculator"  (text-3xl font-bold)               │
│ Subtitle: "Estimate your monthly payment" (text-sm gray-500) │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ INPUTS (≈55%)                  │ ► OUTPUT (≈45%, sticky   │
│                                   │   top-20)                │
│ Home price [ 52,000,000 ] [AMD▾] │ ┌── Monthly payment ───┐ │
│                                   │ │ 412,340 ֏ /mo        │ │
│ Down payment                     │ │ (text-3xl font-bold)  │ │
│  [slider ▓▓▓░░░░░░░] 20% [amount]│ │                       │ │
│                                   │ │ ▓▓▓▓▓▓░░░ (bar)       │ │
│ Interest rate (annual)           │ │ ■ Principal ■ Interest│ │
│  [ 13.5 ] %                      │ │                       │ │
│                                   │ │ Loan amount   41.6M ֏ │ │
│ Term                              │ │ Total interest 57.2M ֏│ │
│  [10][15][20*][25][30][Custom]   │ │ Total cost    98.9M ֏ │ │
│                                   │ │                       │ │
│                                   │ │ ▸ Amortization summary│ │
│                                   │ │   (collapsible table) │ │
│                                   │ └───────────────────────┘ │
├──────────────────────────────────┴─────────────────────────┤
│ DISCLAIMER (text-xs gray-400)                                 │
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile (<768px) — single column, output inline after inputs

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ H1 (text-2xl) + subtitle  │
├──────────────────────────┤
│ Home price [___] [AMD▾]   │
│ Down payment (slider+amt) │
│ Interest rate [___] %     │
│ Term (pill wrap)           │
├──────────────────────────┤
│ ── OUTPUT card ──         │
│ 412,340 ֏ /mo             │
│ composition bar            │
│ breakdown rows              │
│ ▸ Amortization summary     │
├──────────────────────────┤
│ DISCLAIMER                 │
│ FOOTER                     │
└──────────────────────────┘
```

- Output card is `sticky top-20` on `lg:`, static/inline on smaller viewports
  (same pattern the generic spec uses for its 2-column layout, minus the tabs).
- No horizontal scroll needed anywhere on this page (unlike `/compare`).

### 3.3 Amortization summary (collapsible, both breakpoints)

```
▸ Amortization summary                     (button, aria-expanded)
  ┌──────┬───────────┬───────────┬──────────┐
  │ Year │ Principal │ Interest  │ Balance  │
  ├──────┼───────────┼───────────┼──────────┤
  │ 1    │ 1,240,000 │ 5,468,000 │40,360,000│
  │ 2    │ 1,330,000 │ 5,378,000 │39,030,000│
  │ ...  │ ...       │ ...       │ ...      │
  │ 20   │ 4,980,000 │   123,000 │        0 │
  └──────┴───────────┴───────────┴──────────┘
```

Implemented as a native `<details><summary>` — no extra JS state needed for
open/close, and the table body is always present in the DOM (computed
regardless of open state) so "live-updating as inputs change" holds even while
collapsed.

### 3.4 Validation error (inline, per field)

```
Down payment
[ slider ]  [ 60,000,000 ]  ← border-red-400, focus:ring-red-400
⚠ Down payment must be less than the home price     (role="alert", text-red-600)
```

Output card shows `—` for the monthly payment / totals while any field is
invalid (never `NaN` or a stale number), matching the generic spec's "Validation
error" page state.

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| H1 | `text-3xl font-bold text-gray-900` (mobile `text-2xl`) |
| Subtitle | `text-sm text-gray-500 mt-1` |
| Card (output) | `shadow-sm border border-gray-200 rounded-xl p-5 lg:sticky lg:top-20` |
| Labeled input wrapper | `space-y-1.5` (label + input + optional error) |
| Label | `text-sm font-medium text-gray-700 mb-1.5 block` |
| Number input | `h-11 w-full border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary` — swap `border-gray-300` → `border-red-400 focus:ring-red-400` when that field's zod error is set |
| Currency pill group | `flex border border-gray-300 rounded-lg overflow-hidden` (button `px-3 py-2 text-sm font-medium`, selected `bg-primary text-white`, unselected `bg-white text-gray-700 hover:bg-gray-50`) — identical to `Step5Price.tsx`'s currency selector |
| Term pill group | same pattern as currency pills, `flex flex-wrap gap-2`; each pill `h-9 px-3 rounded-full text-sm font-medium border`, selected `bg-primary text-white border-primary`, unselected `bg-white text-gray-700 border-gray-300 hover:bg-gray-50` |
| Down-payment range input | native `<input type="range">`, `h-1.5 accent-primary w-full` (native slider — full keyboard/ARIA support for free, no custom `role="slider"` reimplementation) |
| Output large number | `text-3xl font-bold text-gray-900` + `/mo` suffix `text-base font-normal text-gray-500` |
| Composition bar | `h-3 rounded-full overflow-hidden flex w-full`; principal segment `bg-primary`, interest segment `bg-amber-400`, each `<div style={{ width: pct + '%' }}>` |
| Composition legend | `flex items-center gap-4 text-xs text-gray-500 mt-2` with `<span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />`/`bg-amber-400` swatches |
| Breakdown row | `flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0` (label `text-gray-500`, value `text-gray-900 font-medium`) |
| Amortization `<summary>` | `text-sm font-medium text-primary cursor-pointer select-none py-2` |
| Amortization table | `w-full text-sm border-collapse`, `<th>` `text-left text-gray-500 font-medium p-2 border-b border-gray-100`, `<td>` `p-2 border-b border-gray-100 text-gray-900` |
| Error text | `text-sm text-red-600 mt-1` with `role="alert"` |
| Disclaimer | `text-xs text-gray-400 mt-8` |

Colors and radii are all drawn from tokens already in use elsewhere in this
app (`--color-primary` in `app/globals.css`, `red-400`/`red-600`/`amber-400`
Tailwind defaults) — no new design tokens introduced.

---

## 5. Inputs — exact fields and defaults

| Field | Control | Default | Guard (zod, §7) |
|---|---|---|---|
| Currency | Pill group, AMD/RUB/USD/EUR | `AMD` | `z.enum([...])` |
| Home price | Number input | `50000000` (AMD) / scaled per-currency default in `constants.ts` | `positive`, sane upper bound (see D4 rationale) |
| Down payment | Range input (0–90%, step 1) **and** synced number input (amount) | `20%` of price | `min(0)`, cross-field `< price` |
| Interest rate (annual %) | Number input, step `0.1` | per-currency default from `DEFAULT_RATE_BY_CURRENCY` (D3) | `min(0)`, `max(30)` (D4) |
| Term (years) | Pill presets `10/15/20/25/30` + "Custom" reveals a number input | `20` | `int`, `min(1)`, `max(40)` |

Down payment amount ↔ percent sync: changing the range input recomputes the
amount field (`price * pct / 100`); changing the amount field recomputes the
percent shown on the slider. Both are registered with react-hook-form; keep
the sync in a single `onChange` handler per field (no `useEffect` ping-pong).

---

## 6. Calculation formulas (`lib/mortgage/calculations.ts`)

Mirrors the generic spec's §3.2 formula exactly (this part of the doc is
authoritative and does not need reinterpretation):

```ts
// principal
P = price - downPayment

// monthly rate
r = annualRatePct / 12 / 100

// number of payments
n = termYears * 12

// monthly payment (standard annuity / PMT formula)
M = r === 0
  ? P / n                                    // 0% edge case — linear, no division by zero
  : P * r * (1 + r) ** n / ((1 + r) ** n - 1)

totalCost     = downPayment + M * n
totalInterest = M * n - P
```

`buildAnnualSchedule(P, r, n)` walks the standard amortization recurrence
(`interestThisMonth = balance * r`, `principalThisMonth = M - interestThisMonth`,
`balance -= principalThisMonth`), summed into one row per 12-month block, and
must also handle `r === 0` (interest column is always 0, principal is a flat
`P / n` per month). Clamp the final year's balance to exactly `0` (floating
point drift) rather than a stray `-0.0003`.

---

## 7. Validation (`lib/mortgage/schemas.ts`)

```ts
import { z } from 'zod'

export const RATE_MIN = 0
export const RATE_MAX = 30       // D4 — tightened from the generic spec's 100
export const TERM_MIN = 1
export const TERM_MAX = 40
export const PRICE_MAX = 1_000_000_000_000 // overflow/typo guard, not a business rule

export const paymentInputSchema = z
  .object({
    currency: z.enum(['AMD', 'RUB', 'USD', 'EUR']),
    price: z.coerce.number().positive('Home price is required').max(PRICE_MAX),
    downPayment: z.coerce.number().min(0, 'Down payment cannot be negative'),
    ratePct: z.coerce
      .number()
      .min(RATE_MIN, 'The rate cannot be negative')
      .max(RATE_MAX, 'Enter a realistic interest rate'),
    termYears: z.coerce
      .number()
      .int()
      .min(TERM_MIN, 'Term is required')
      .max(TERM_MAX, 'Term is too long'),
  })
  .refine((v) => v.downPayment < v.price, {
    message: 'Down payment must be less than the home price',
    path: ['downPayment'],
  })
```

Wired via `useForm({ resolver: zodResolver(paymentInputSchema), mode:
'onChange' })`, following the same `z.coerce.number()` + RHF `register()`
convention as `lib/listings/schemas.ts` / `Step5Price.tsx` (no `valueAsNumber`
needed). While any field fails validation, the output card renders `—`
placeholders instead of computing from partially-invalid `watch()` values —
this is what "blocked... with a visible inline error rather than producing
NaN/broken output" means concretely here.

No server-side persistence exists for this MVP (no save/share), so this zod
schema's only enforcement boundary is the client form — there is no API route
to also validate at, which is consistent with the task's "pure client-side
math, no backend calls required for the core calculation."

---

## 8. Page shell & SEO

```ts
// app/[locale]/mortgage-calculators/page.tsx (sketch)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const canonical = `/${locale}/mortgage-calculators`

  return {
    title: `Mortgage calculator — monthly payment | ${BRAND}`,
    description:
      'Estimate your monthly mortgage payment, total interest, and total cost. Free, instant, no signup required.',
    alternates: {
      canonical,
      languages: {
        hy: '/hy/mortgage-calculators',
        ru: '/ru/mortgage-calculators',
        en: '/en/mortgage-calculators',
      },
    },
    // No `robots` override — indexable by default (public tool page).
  }
}

export default function MortgageCalculatorsPage() {
  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* breadcrumb, H1, subtitle — static, Server Component */}
      <MortgagePaymentCalculator />
      {/* disclaimer — static */}
    </main>
  )
}
```

No `searchParams` handling at all (D6 — no `?price=` prefill), which keeps
`page.tsx` a plain Server Component with zero dynamic data fetching: title,
description, canonical, and hreflang are all locale-derived only, no property
lookup, no Supabase call. `MortgagePaymentCalculator` is the one client
component (`'use client'`) and owns 100% of the interactive state.

---

## 9. Accessibility

- Every input has a `<label htmlFor>` (no placeholder-as-label).
- Down payment range input: native `<input type="range" aria-label="Down payment percent">` — browser supplies `role="slider"` + `aria-valuemin/max/now` automatically; do not hand-roll a custom slider.
- Term pills: `<button type="button" aria-pressed={selected}>`, not a plain `<div>` — matches `Step5Price.tsx`'s existing currency-pill accessibility pattern.
- Output card: wrap in a region with `aria-live="polite"` so the monthly payment / totals are announced on change without stealing focus.
- Errors: `role="alert"`, `aria-invalid="true"` + `aria-describedby` pointing at the error `id`, exactly like `Step5Price.tsx:92-108`.
- Amortization `<details>/<summary>` is natively keyboard-operable (Enter/Space toggles); the `<table>` inside uses proper `<th scope="col">` headers.
- Composition bar communicates "Principal vs Interest" via the adjacent legend text (color swatch + label), never color alone.
- Touch targets ≥ 44px (term pills `h-9` + horizontal padding meets this; range input thumb uses the browser default, which already satisfies this on touch platforms).
- Contrast ≥ 4.5:1 — all colors reused from already-audited tokens elsewhere in this app.

---

## 10. Testing notes

Mirrors this repo's existing convention (`environment: 'node'`, `__tests__/*.test.ts`, one file per unit — see `docs/design/25-compare-handoff.md` §9 for the precedent). New files:

- `__tests__/mortgageCalculations.test.ts` — `calculateMonthlyPayment`/`pmt`
  against known amortization results for a few representative sets (e.g.
  price 50,000,000 / down 10,000,000 / rate 12% / term 20yr → assert the
  monthly payment against a hand/spreadsheet-verified expected value, within a
  cent/unit tolerance); **0% rate** edge case (`r=0` → `M = P/n` exactly, no
  `NaN`/`Infinity`); **minimum term** edge case (`termYears=1` → `n=12`);
  `totalInterest = M*n - P` and `totalCost = downPayment + M*n` derived
  correctly from the same inputs; `buildAnnualSchedule` final year balance is
  `0` (not a floating-point residue) and each year's `principal + interest`
  sums to `12 * M` (or the 0%-rate linear equivalent).
- `__tests__/mortgageSchemas.test.ts` — `paymentInputSchema`: valid input
  parses; `price <= 0` rejected; `downPayment >= price` rejected (cross-field
  refine, correct `path`); `ratePct < 0` and `ratePct > 30` both rejected;
  `termYears` `0`, non-integer, and `> 40` all rejected; `termYears = 1`
  (minimum) accepted.

Component-level rendering assertions are not this repo's pattern (no
`@testing-library/react`/jsdom wired into `vitest.config.ts`) — keep the
logic under test in `lib/mortgage/`, with `MortgagePaymentCalculator.tsx`
staying a thin renderer of `useMemo`-derived results, same discipline
`docs/design/25-compare-handoff.md` §7/§9 already established for this
codebase.

---

## 11. Explicit follow-ups (not part of this task)

- Affordability, Refinance, and Rent-vs-Buy calculators + the tab bar that
  switches between all four (generic spec §3.3–§3.5).
- `GET /api/mortgage/default-rate` (Phase 3, live partner-bank rates) —
  replaces the static `DEFAULT_RATE_BY_CURRENCY` table in `constants.ts`.
- Live FX re-conversion on currency switch (`GET /api/fx`).
- Save/share a calculation (`POST /api/mortgage/save`, login modal, guest
  `?next` flow).
- `?price=`/`?tab=` query prefill and deep-linking from the property-detail
  mini-calc.
- Pre-approval / "See rates" / "See properties at this price" CTAs and the
  partner-bank banner (all lead-gen, needs the pages they'd link to — Page 14
  — to exist first).
- Optional collapsible property tax / insurance / HOA fields in the Payment
  calculator itself.
- `FAQPage`/`WebApplication` JSON-LD structured data.
