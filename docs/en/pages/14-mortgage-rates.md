# Page 14 — Mortgage Rates (Mortgage interest rates) 🔵 Phase 3

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, formulas, microcopy (English), technical part (components, props, API, validation), responsive, accessibility, SEO, analytics.

**URL.** `/mortgage/rates` — with a filter: `?type=&term=&amount=&country=`; bank profile: `/mortgage/rates/[bankSlug]`
**Roles.** Everyone (viewing); pre-approval application: login (Guest → login modal with `?next`).
**Primary goal (conversion).** The visitor compares bank rates and clicks **"Get pre-approved"** (lead) or opens a partner bank's profile. A lead-generation funnel toward partner banks.

> ⚠️ **Data source.** Initially the rates are **maintained manually** (from the partner banks' feed or admin entry, not a live API). Every rate has an `updated_at` and an "Updated: {date}" badge. Later: an automatic feed from partner banks. This is **informational**, not an official offer.

---

## 0. Overview

This is the **comparison + lead page for CIS partner banks**. Someone thinking about a mortgage wants to see in one place which bank offers which rate, and to apply quickly. The page must: (1) show a comparable **rates table** (with sort/filter), (2) give context: **rate trend** + central bank key rate (important in CIS), (3) offer **pre-approval** lead capture from each row, and (4) always keep a **disclaimer + update date** (legal/financial trust).

In the CIS context, **multi-country + multi-currency** is critical: a bank is available only in its own countries, USD/RUB/AMD rates differ sharply, and the key rate (refinance rate) is volatile. Therefore the filter narrows down relevant offers by country/currency.

The page is **SSR** (SEO: the rates are indexable, country landing pages); the table sort/filter, the chart, and the pre-approval form are client components (React Query).

---

## 1. User scenarios

**Scenario A — Buyer Ashot (desktop).** Ashot is looking for a mortgage in USD in Yerevan. In the filter he selects country Armenia, currency USD, term 15 yr, amount $80,000. The table shows 6 banks, sorted by rate ascending. He expands the row with the lowest rate: he sees the commission and requirements. He clicks **[Get pre-approved]**, logs in, fills the form → the application is sent to the bank. → lead (`mr_preapproval_submitted`).

**Scenario B — Curious Marine (mobile).** Marine wants to understand whether rates are rising. The table is a card list on mobile. She scrolls to the trend chart: she sees that over 12 months the AMD rate fell from 14% to 13%, and the key rate overlay also dropped. She decides to wait/apply, clicks the partner bank's logo → bank profile. → engagement (`mr_bank_profile_viewed`).

**Scenario C — Georgian visitor Nino (early country, desktop).** Nino selects country Georgia: there is no partner yet. Instead of the table she sees an empty state "Coming soon in your country" + email collect. She leaves her email → waitlist. → demand signal (`mr_waitlist_joined`).

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Mortgage interest rates»                               │
│ subtitle «Compare {N} banks in {country}»                  │
│ «Updated: {date}»  · disclaimer link                       │
├────────────────────────────────────────────────────────────┤
│ FILTER BAR (sticky, h-14, border-y)                         │
│ [Country ▾][Currency ▾][Type ▾][Term ▾][Amount __][Apply]  │
├────────────────────────────────────────────────────────────┤
│ ┌── RATES TABLE ───────────────────────────────────────────┐│
│ │ Bank │ Rate↑│ Program│Term │Down │Mo.pmt│Updt.│ CTA      ││
│ │ 🏦 X │ 11.9%│ primary│15-20│ 20% │…֏    │06.01│[Apply]   ││
│ │ 🏦 Y │ 12.4%│ …      │ …   │ …   │…     │…    │[Apply]   ││
│ │  (click row → expand: terms, fees, requirements)        ││
│ └──────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ RATE TREND CHART (h-[300px], key-rate overlay)              │
├────────────────────────────────────────────────────────────┤
│ «Get pre-approved» CTA block (form)                         │
│ Partner bank profiles (logo grid)                           │
│ Educational links · DISCLAIMER block                        │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 + «Updated…»         │
│ [⚙ Filter] (bottom-sheet)│
├──────────────────────────┤
│ ── Rate cards (list) ──  │
│ ┌──────────────────────┐ │
│ │ 🏦 X Bank      11.9% │ │
│ │ primary · 15-20 yr   │ │
│ │ ~…֏/mo · 06.01       │ │
│ │ [Apply] (full-width) │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Trend chart (responsive) │
│ Pre-approval form        │
│ Bank profiles (scroll-x) │
│ DISCLAIMER · FOOTER      │
└──────────────────────────┘
```

- The filter bar is sticky `top-16` on desktop; on mobile a **bottom-sheet** (via the [⚙ Filter] button).
- On mobile the table becomes a **card list** (bank + rate + key facts + CTA).

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` |
| "Updated" badge | `text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded` |
| Filter bar | `bg-white border-y border-gray-200 h-14 flex items-center gap-3` |
| Table header | `text-sm font-medium text-gray-500 bg-gray-50` |
| Rate cell | `text-lg font-semibold text-gray-900` ("from" prefix `text-xs text-gray-400`) |
| Row hover | `hover:bg-gray-50 cursor-pointer` |
| Expanded row | `bg-gray-50 border-t border-gray-100` |
| Stale badge | `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded` |
| Partner badge | `bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded` + ✓ |
| Row CTA | `bg-primary text-white h-9 px-4 rounded-lg text-sm hover:bg-primary/90` |
| Bank logo | `w-10 h-10 rounded object-contain` |
| Card | `shadow-sm border border-gray-200 rounded-xl` |
| Disclaimer | `text-xs text-gray-400 leading-relaxed` |

---

## 3. Section-by-section

### 3.1 Header / intro

- **Appearance.** H1 + subtitle "Compare {N} banks in {country}" (live count).
- **"Updated: {date}"** badge + disclaimer anchor (smooth scroll to the disclaimer block).
- **Microcopy.** "The interest rates are informational and may change".

### 3.2 Filter / parameter bar

- **Appearance.** Sticky `top-16`, horizontal `flex gap-3`. Mobile: [⚙ Filter] → bottom-sheet.
- **Fields.**
  - **Country** (select) — multi-country; default by geo/locale.
  - **Currency** — AMD/RUB/USD/EUR (header currency, overridable).
  - **Loan type** — primary market / secondary / new construction / refinance / government program.
  - **Term** — 10/15/20/25/30 yr.
  - **Loan amount** (number) — affects the tier (some banks set rate by amount).
  - **Down payment %** (optional) — some rates are conditioned on LTV.
- **Behavior.** **[Apply]** → re-query (URL `?...` sync); **[Clear]** → reset.
- **Tech.** `<RatesFilterBar values onApply />`; the URL query is the single source of truth (shareable/indexable).

### 3.3 Rates table — **the comparison core**

- **Columns.** Bank/Lender (logo + name → bank profile) · Interest rate ("from X%") · Loan type/program · Term (min–max) · Down payment (min down %) / max LTV · Approx. monthly payment · Updated (`updated_at`) · [Apply].
- **Monthly payment column.** Computed from `amount` and the rate with the PMT formula (see `13-mortgage-calc.md` §3.2). Currency convert with live FX.
- **Behaviors.**
  - **Sort** — by rate / monthly payment / bank name (asc/desc; default rate ascending).
  - **Click row** → expand: terms, fees (commission, insurance), requirements, link to the partner profile.
  - **Stale.** `updated_at` > 30 days → "⚠️ May be outdated" badge on the row.
- **Empty state.** No data for the selected filter → "No offers with these parameters" + [Clear filter].
- **Mobile.** Table → card list; sort: dropdown above the cards.
- **Tech.** `<RatesTable rows={Rate[]} sort onSort />`; the amount-dependent monthly payment is computed client-side (pure function).

### 3.4 Rate trend chart

- **What it does.** A Recharts line chart of the change in average rate over time (12–24 months), by the selected country/currency/term.
- **Appearance.** `h-[300px]`, tooltip on hover, legend by term/currency.
- **Lines.** Multiple possible: by term (15 vs 30 yr) or by currency (RUB vs USD).
- **Annotation.** The central bank refinance rate (key rate) as an overlay dashed line, if available (an important signal in the CIS context).
- **Data.** `GET /api/mortgage/rate-history?country&currency&term` → monthly average rate (manual/aggregated).
- **Empty state.** Too little history → "Not enough data for the trend" (the chart is hidden).

### 3.5 "Get pre-approved" CTA block

- **What it does.** Lead capture → sends an application to the partner bank(s).
- **Form.** Name · Phone · Income (range select) · Loan amount · Country · **consent checkbox** (data transfer to the bank) → submit.
  - Guest → login/register prompt (for lead quality).
  - **POST `/api/mortgage/preapproval`** → creates a lead, routes it to the relevant partner bank(s) + email confirm.
- **Microcopy.** Button "Send application"; success "Your application was sent — the bank will contact you"; disclaimer "This is only an application, not an approval".

### 3.6 Partner bank profiles

- **On the hub.** Logo grid → each one to `/mortgage/rates/[bankSlug]`.
- **Bank profile page.** Logo, description (`description{hy,ru,en}`), mortgage programs (table), rates, terms, branch/contact, **[Apply]** CTA, ✓ Partner badge.
- **Data.** `partner_banks`: `slug, name, logo, country[], description{hy,ru,en}, programs[], contact`.

### 3.7 Educational / related links

- **Guides.** "How to get a mortgage" · "Fixed vs floating rate" · "What is LTV/DTI" · "The pre-approval steps" → `/guides/[slug]`.
- **Calculators.** → `/mortgage/calculators`.
- **Home value.** → `/home-value`.

### 3.8 Disclaimer block (required, above the footer)

- The rates are informational, change, and **do not constitute an offer**. The actual terms are determined by the bank. Update date + source noted.

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Filter bar + table skeleton rows (shimmer) |
| **Loaded** | Filter bar + sorted table + trend chart + CTA + partners |
| **Filtered empty** | "No offers with these parameters" + [Clear filter] |
| **No partners (early country)** | "Coming soon in your country" + email collect waitlist |
| **Stale rows** | "⚠️ May be outdated" badge on rows with `updated_at` > 30 days |
| **Row expanded** | Inline terms/fees/requirements panel |
| **Pre-approval (guest)** | Submit → login modal with `?next` |
| **Pre-approval success** | "Your application was sent" confirmation |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<MortgageRatesPage> (Server Component, SSR — SEO, country landing)
 ├─ <RatesHeader updatedAt count />
 ├─ <RatesFilterBar values onApply />              (client, URL-synced)
 ├─ <RatesTable rows sort onSort />                (client, React Query)
 │   └─ <RateRowExpanded conditions fees />
 ├─ <RateTrendChart points keyRate />              (client, Recharts)
 ├─ <PreApprovalCtaBlock />                        (client, rhf+zod)
 ├─ <PartnerBankGrid banks={Bank[]} />
 ├─ <RatesEducationLinks />
 └─ <RatesDisclaimer />
```

### Data fields used (see 00-SPEC §7)

`mortgage_rates (new): id, bank_id, country, currency, loan_type, rate_pct, term_min, term_max, min_down_pct, max_ltv, amount_tier_min, amount_tier_max, commission_pct, conditions(json), updated_at, source`
`partner_banks (new): id, slug, name, logo, country[], description{hy,ru,en}, programs(json), contact, is_active`
`rate_history (new): country, currency, term, month, avg_rate_pct, key_rate_pct`
`preapproval_leads (new): id, user_id?, name, phone, income_range, loan_amount, country, bank_ids[], consent, created_at`

### API contracts

**`GET /api/mortgage/rates?country=AM&currency=USD&type=primary&term=15&amount=80000&down=20`**
```jsonc
// 200 OK
{ "updatedAt": "2026-06-01",
  "items": [
    { "bankId": 3, "bankSlug": "ardshinbank", "bankName": "Ardshinbank", "logo": "...",
      "ratePct": 11.9, "loanType": "primary",
      "termMin": 15, "termMax": 20, "minDownPct": 20, "maxLtv": 80,
      "estMonthly": 658, "currency": "USD",
      "commissionPct": 1.0, "updatedAt": "2026-06-01", "stale": false }
  ] }
// 200 (empty) { "updatedAt": "...", "items": [] }
```

**`GET /api/mortgage/rate-history?country=AM&currency=AMD&term=20`**
```jsonc
// 200 OK
{ "points": [ { "month": "2025-07", "avgRatePct": 14.1, "keyRatePct": 9.5 } ] }
```

**`GET /api/mortgage/banks`** → `200 { "items": Bank[] }` · **`GET /api/mortgage/banks/[slug]`** → `200 { ...bankProfile }` · `404 not_found`

**`POST /api/mortgage/preapproval`**
```jsonc
// request { "name": "Ashot", "phone": "+374...", "incomeRange": "500k-800k",
//           "loanAmount": 80000, "country": "AM", "bankIds": [3], "consent": true }
// 201     { "leadId": 412 }
// 401     { "error": "auth_required" }   → login modal
// 422     { "error": "consent_required" }
```

### Validation (zod)

```ts
const preApprovalSchema = z.object({
  name: z.string().min(2, "Name is required").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  incomeRange: z.enum(["lt300k","300k-500k","500k-800k","gt800k"]),
  loanAmount: z.number().positive("Amount is required"),
  country: z.string().length(2),
  bankIds: z.array(z.number()).min(1, "Select at least one bank"),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
});
```

- **Stale guard.** `updated_at` > 30 days → `stale: true` server-side (UI badge).
- **Multi-country.** A bank is available only in its `country[]`; the filter hides the irrelevant ones.
- **Lead privacy.** Pre-approval data is sent only to the selected/relevant partner bank, with a consent checkbox (GDPR/local).
- The monthly payment is converted with live FX (`GET /api/fx`).

---

## 6. Responsive

- **≥1024px (lg).** Full table (8 columns), sticky filter bar (`top-16`), trend chart full-width.
- **768–1023px (md).** Table with fewer columns (Bank, Rate, Monthly, CTA), the rest in the row expand; filter bar wraps.
- **<768px (sm).** Table → **card list**; filter → **bottom-sheet** ([⚙ Filter]); bank profiles scroll-x; chart via `ResponsiveContainer`.

---

## 7. Accessibility

- Table: correct `<table>` semantics (`<th scope>`, `<caption>`), sortable header: `aria-sort`; row expand: `aria-expanded`.
- Mobile card list: structured (bank name as heading), CTA `aria-label="Apply to {bank}"`.
- Rate change not by color alone: data table fallback for the trend chart; the key-rate line marked in the legend.
- Filter bar: all selects with a `<label>`; bottom-sheet: focus trap + Esc to close.
- Pre-approval form: inline error `role="alert"`, consent checkbox required.
- Touch target ≥ 44px; contrast ≥ 4.5:1.

---

## 8. SEO & meta

- `<title>` = "Mortgage interest rates {country} — compare {N} banks | {brand}"; description: a summary of the rate range.
- Country/currency landing pages: `/mortgage/rates?country=...` indexable variants (canonical carefully, the primary variant self-canonical).
- Bank profile pages: indexable (`/mortgage/rates/[bankSlug]`).
- Structured data: `FinancialProduct` (each rate / bank program) + `FAQPage` (educational).
- `hreflang` (hy/ru/en), OG image: generic rates banner.
- Stale/empty country: `noindex` until there are partners.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `mr_filter_applied` | [Apply] | `country, currency, type, term, amount` |
| `mr_sorted` | Column sort | `column, dir` |
| `mr_row_expanded` | Row expand | `bank_id` |
| `mr_apply_clicked` | Row [Apply] | `bank_id, rate_pct` |
| `mr_preapproval_submitted` | Pre-approval form submit | `loan_amount, bank_ids` |
| `mr_bank_profile_viewed` | Bank profile open | `bank_slug` |
| `mr_trend_viewed` | Trend chart in-view | `country, currency` |
| `mr_waitlist_joined` | Early-country email collect | `country` |
| `mr_stale_shown` | Stale badge render | `bank_id` |
| `mr_guide_clicked` | Educational link | `slug` |
