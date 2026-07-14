# Page 14 — Mortgage Rates Hub MVP (`/mortgage/rates`): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/14-mortgage-rates.md`](../en/pages/14-mortgage-rates.md) (deep
spec — full trend chart w/ central-bank key-rate overlay, bank profile pages,
partner-bank logo grid, waitlist/early-country email capture, educational
links, `FinancialProduct`/`FAQPage` JSON-LD). This document does **not**
repeat that spec in full; it exists to pin down the **MVP scope** already cut
down by the task brief and to close the gap between that brief and *this
specific codebase*.

Audited against the current tree: `docs/design/13-mortgage-calc-handoff.md` +
`lib/mortgage/calculations.ts`/`constants.ts` (the PMT formula and
`TERM_PRESETS`/`CURRENCIES`/`PRICE_MAX` constants this task reuses verbatim —
see D3), `docs/design/25-compare-handoff.md` + `docs/design/24-admin-handoff.md`
(both explicitly re-confirm: **no `components/ui` primitives library and no
`components/motion` wrapper library exist anywhere in this codebase** — every
screen is hand-built Tailwind + `lucide-react` + `cn()`, no `framer-motion`,
no shadcn — see D1), `components/admin/ModerationRow.tsx` (the one existing
`variant: 'row' | 'card'` component — the direct precedent for the
table↔card-list responsive pattern this page needs, see D5),
`app/[locale]/search/page.tsx` + `lib/search/filtersSchema.ts` (the
"Server Component page reads `searchParams` → zod-validates → self-fetches
its own API route with an absolute URL → mock-data fallback when Supabase
isn't configured" pattern this page's SSR shell copies, see D6),
`components/search/SearchPageClient.tsx:61` (`router.push` URL-sync pattern
for filters, mirrored by `RatesFilterBar`), `lib/favorites/useFavoriteToggle.ts`
(cookie-sniff guest-detection + hard `router.push('/auth/login?next=...')`
redirect — the exact "redirect to login," not modal, pattern the task brief
asks for, see D7), `app/api/agent-leads/route.ts` + `lib/auth/rateLimit.ts` +
`lib/agent/schemas.ts`'s `E164_PHONE` regex (rate-limited, authenticated,
honeypot lead-form POST route precedent for `POST /api/mortgage/preapproval`,
see D8), `supabase/migrations/0009_plans.sql` (public-read/service-role-write
reference-data RLS shape for `mortgage_rates`/`partner_banks`, see D9),
`supabase/migrations/0008_agent_profile.sql`'s `agent_leads` table (owner-write
lead table RLS shape for `preapproval_leads`), `supabase/migrations/0012_admin_moderation.sql`
(the existing `is_admin()` `SECURITY DEFINER` helper — reused, not
reinvented, for the "admin reads all" policy, see D9), `app/api/properties/route.ts`
(422 `invalid_filters` error-shape convention for bad query params),
`lib/admin/format.ts` (`formatWaiting`'s `>24h` staleness-boundary helper —
the direct precedent for this page's `>30 days` stale check), `app/globals.css`
(Tailwind v4 `@theme` — only `--color-primary` (`#2563eb`) and `--font-sans`
exist as custom tokens; `html { scroll-behavior: smooth }` is already global),
`components/layout/Header.tsx:61` (already hardcodes `href: '/mortgage/rates'`
— this task makes that link resolve instead of 404).

---

## 0. MVP scope (already trimmed by the task brief — restated here as the contract)

**In scope:** `/mortgage/rates` (SSR), `?country=&currency=&type=&term=&amount=`
query-string filters as the source of truth, `mortgage_rates` + `partner_banks`
tables (seeded, ≥2 countries), `<RatesFilterBar>`, `<RatesTable>` (desktop
table / mobile `<768px` card list, rate-ascending default sort, stale badge,
empty state), `GET /api/mortgage/rates`, a minimal `<PreApprovalCtaBlock>`
(name/phone/loanAmount/consent) → `POST /api/mortgage/preapproval` →
`preapproval_leads` table, guest → hard redirect to `/auth/login?next=...`,
`<RatesDisclaimer>`, basic SEO (`<title>`, `hreflang`, canonical).

**Explicitly out of scope (do not build, do not stub):** rate trend chart
(§3.4 of the deep spec), `rate_history` table, `GET /api/mortgage/rate-history`,
`/mortgage/rates/[bankSlug]` bank profile pages, partner-bank logo grid,
waitlist/early-country email capture (§1 Scenario C), educational links
section (§3.7), row-expand-to-see-fees/requirements interaction (§3.3 "click
row → expand"), `incomeRange`/`bankIds` fields on the pre-approval form,
`FinancialProduct`/`FAQPage` JSON-LD, country-landing canonical strategy,
Down payment % filter field (deep spec §3.2 lists it as optional; the task
brief's field list for `<RatesFilterBar>` does not include it — omit it),
sortable column headers / user-toggleable sort (only the default
rate-ascending order is required), pagination (seed data is small; return
all matching rows unpaginated), the `/mortgage/pre-approval` nav destination
(`Header.tsx:62` already links there — leave that pre-existing dead link
untouched, same precedent as `docs/design/12-home-value-handoff.md` D5).

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task-brief tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Generic instruction: "reuse `components/ui` primitives and `components/motion` wrappers." | **Neither exists in this codebase** (confirmed by two independent prior audits, see header). Build with hand-written Tailwind utility classes + `lucide-react` icons + `lib/utils.ts`'s `cn()`, exactly like every other page in this app. Any "animation" is a plain `transition-*` class gated by React state or a native `<a href="#...">` anchor jump (this page needs almost none — see §9). | Inventing a `components/ui`/`components/motion` layer for one page would be a large, unreviewed architectural change and would break the "reuse, don't fork" discipline every prior handoff in this repo has followed. |
| D2 | Deep spec: URL is `/mortgage/rates` with a bank-profile sub-route `/mortgage/rates/[bankSlug]`. | Build only `app/[locale]/mortgage/rates/page.tsx`. **Do not** create the `[bankSlug]` folder. Bank name in the table is **plain text, not a link**, for MVP (no destination exists yet — do not ship a link that 404s, same reasoning as `docs/design/12-home-value-handoff.md` D5's "build the CTA anyway" only applies to a link the header *already* promises; a brand-new link to a page this task doesn't build would be new, avoidable dead-link surface). Route is locale-prefixed via `@/i18n/navigation`'s `Link`/`useRouter` (`app/[locale]/mortgage/rates/...`), matching `Header.tsx:61`'s literal `/mortgage/rates` href (next-intl auto-prefixes the locale). | Matches the task brief's explicit out-of-scope list (bank profile pages are a follow-up) and the existing `Header.tsx` href exactly, with zero new dead links introduced. |
| D3 | Deep spec §3.3: "Monthly payment column. Computed from `amount` and the rate with the PMT formula (see `13-mortgage-calc.md` §3.2)." Task brief: "reusing/adapting the calculator logic from the existing Mortgage Calculators Hub if available." | **Reuse `calculateMonthlyPayment(principal, annualRatePct, termYears)` from `lib/mortgage/calculations.ts` verbatim — no fork, no new PMT implementation.** It is already pure/currency-agnostic/unit-tested. Also reuse `CURRENCIES` (symbol map), `TERM_PRESETS`, `TERM_MIN`/`TERM_MAX`, `PRICE_MAX` from `lib/mortgage/constants.ts` for the filter bar's Term/Amount fields and their guards. | Exactly the "if available" branch of the task brief — it is available, and it is the one function every mortgage-math number on this page must agree with, so reusing it also satisfies the acceptance criterion "consistent with the standard PMT formula." |
| D4 | Deep spec §5 API contract shows `estMonthly` as a field the **server** computes and returns per item. Task brief says the monthly-payment column is "computed client-side... reusing the calculator logic." | **`GET /api/mortgage/rates` does NOT return `estMonthly`.** The response is the documented shape minus that one field (bank info + rate fields + `stale`); `RatesTable`/`RateRow` computes the monthly payment at render time by calling `calculateMonthlyPayment` directly (see §5.4 for exactly which inputs). This is still literally "the standard PMT formula," it is just not round-tripped through the API. | The task brief explicitly overrides the generic spec here ("computed client-side... if available" is stronger/more specific instruction than the generic doc's server-side `estMonthly`), and it avoids the API needing to already know the caller's payment-column semantics (down-payment-less loan amount, per-row currency, term fallback chain — see D11) baked into a response field instead of a reusable pure function. |
| D5 | Deep spec §6 Responsive: "≤768px table → card list"; task acceptance criteria: same, literally "<768px shows the rates as a card list, not a horizontally-scrolled table." | Fork `components/admin/ModerationRow.tsx`'s exact `variant: 'row' \| 'card'` pattern into a new `RateRow.tsx`: one component, two render branches, switched by CSS breakpoint wrappers (`<table className="hidden md:table">…` / `<div className="md:hidden space-y-3">…`), not by JS `matchMedia`. `768px` is Tailwind's `md:` breakpoint, so `hidden md:table` / `md:hidden` is the literal, no-JS implementation of the acceptance criterion. | `ModerationRow.tsx` is the **only** `variant: 'row' \| 'card'` component in the codebase and is already an approved, shipped pattern for "same data, table row on desktop / stacked card on mobile" — reuse it rather than inventing a second responsive-table technique. |
| D6 | Deep spec: "The page is SSR... the table sort/filter... are client components (React Query)." | **`RatesTable` stays a Server Component.** Only `RatesFilterBar` (query-param sync) and `PreApprovalCtaBlock` (form + guest-redirect) are `'use client'`. `app/[locale]/mortgage/rates/page.tsx` reads `searchParams`, zod-validates them, and **self-fetches its own `GET /api/mortgage/rates`** via an absolute URL built from `NEXT_PUBLIC_SITE_URL` — identical to `app/[locale]/search/page.tsx`'s existing pattern (parse → fetch own API route → fall back to mock data if Supabase isn't configured). No `@tanstack/react-query` needed here: `RatesFilterBar`'s `[Apply]`/`[Clear]` call `router.push` with new query params, which re-runs the Server Component with the new `searchParams` — Next's App Router client-side navigation, not a full page reload — satisfying "no full page reload required, but SSR-on-navigation is acceptable" *and* "SSR renders... correct for the default case and when filters are applied via the URL query" in one mechanism. | Matches this app's dominant "SSR shell + 1–2 client islands" architecture (`mortgage-calculators`, `home-value`, `search` all do this) instead of introducing a new client-fetch-on-every-filter-change pattern this page doesn't need. Simpler diff, fewer moving parts, no hydration cost for data that's already resolved server-side. |
| D7 | Task brief: "Guest submit → redirect to login with `?next` back to this page, matching the existing auth-modal/login pattern used elsewhere." | The brief says **"redirect,"** not "modal" — use `useFavoriteToggle.ts`'s exact mechanism: on submit, cookie-sniff for `/^sb-.+-auth-token=/`; if absent, `router.push(`/auth/login?next=${encodeURIComponent(currentPath)}`)` (a hard client-side navigation away from the form, no dialog). Extract the URL-building into a pure, unit-testable helper: `buildPreApprovalLoginRedirect(pathname: string, search: string): string` in `lib/mortgage/rates/redirect.ts` (mirrors `lib/auth/safeNext.ts`'s shape — a tiny pure string function, not logic buried in a component). | Two guest-gate idioms already coexist in this codebase: a **modal** (`SignInPromptModal.tsx`, used for saved-search/save-estimate — a "don't lose my in-progress filters" case) and a **hard redirect** (`useFavoriteToggle`, used for a single-click action with nothing to lose). The task brief's own wording ("redirect to login") picks the second idiom, and a pre-approval form submit is closer to `useFavoriteToggle`'s single-action case than to the modal's "don't lose my filter state" case anyway. |
| D8 | Deep spec's `preApprovalSchema`: `phone: z.string().regex(E164_BY_COUNTRY, ...)` — `E164_BY_COUNTRY` does not exist anywhere in this repo. | Reuse the **generic E.164 regex already defined twice** in this codebase (`lib/agent/schemas.ts`'s `E164_PHONE`, `lib/auth/schemas.ts`'s `PHONE_REGEX`: `/^\+[1-9]\d{6,14}$/`) instead of inventing a new per-country map. | A `E164_BY_COUNTRY` map is a Phase-3+ nicety this codebase's other two lead/auth forms don't have either; matching the existing generic-E.164 convention keeps validation consistent across the app and avoids a one-off regex nobody else uses. |
| D9 | Task brief: `mortgage_rates`/`partner_banks` are "admin-write/public-read"; `preapproval_leads` is "user can read own leads, admin reads all." | `mortgage_rates`/`partner_banks`: **public `SELECT USING (true)`, no INSERT/UPDATE/DELETE policy** — identical shape to `supabase/migrations/0009_plans.sql` (RLS default-denies writes for anon/authenticated once no write policy exists; only the service-role key, which bypasses RLS, can write — matches "manually maintained... admin entry," §0 of the deep spec, no admin UI ships this task). `preapproval_leads`: `SELECT USING (auth.uid() = user_id OR is_admin())`, `INSERT WITH CHECK (auth.uid() = user_id)` — reuses the **existing** `is_admin()` `SECURITY DEFINER` helper from `0012_admin_moderation.sql` (do not redefine it) for the admin-read half, and the exact `agent_leads` INSERT-policy shape for the owner-write half. | Both shapes already exist and are already reviewed in this codebase (`plans` for public-read/service-role-write reference data, `agent_leads` for an authenticated-owner lead table) — reusing them is strictly lower-risk than inventing new RLS idioms, and `is_admin()` already exists so there is no reason to write a second admin-role-check function. |
| D10 | Deep spec §3.2: filter fields include Country, Currency, Loan type, Term, Loan amount, **and** Down payment % (optional). Task brief's field list for `<RatesFilterBar>`: "Country, Currency, Loan type, Term, Amount fields" — no down-payment field. | **Omit the Down payment % filter.** `min_down_pct`/`max_ltv` are still stored per-row and shown as a table/card column (per the task's own column list), just not filterable. | The task brief's explicit field list for the filter bar is narrower than the generic spec's and doesn't mention it — adding a field the brief didn't ask for is scope creep the "keep this slice small" instruction warns against. |
| D11 | The "Amount" filter is a single global number, but rows span multiple currencies (AMD rows in the tens of millions vs. USD rows in the hundreds of thousands) and a `term` filter is optional (a row's own `[termMin, termMax]` range may not contain one specific year). | **Monthly-payment inputs per row, resolved independently, not from one global default:** `principal = filters.amount ?? DEFAULT_LOAN_AMOUNT_BY_CURRENCY[row.currency]`; `termYears = filters.term ?? row.termMax ?? row.termMin`. `filters.amount` (when the user *did* type one) is applied to every row regardless of currency (matches the deep spec's own API example, which applies one `amount` query param to a `currency=USD`-filtered result set) — this is a known, accepted simplification, not a bug, since a user filtering by a specific currency is typing an amount in that currency. `DEFAULT_LOAN_AMOUNT_BY_CURRENCY` is a **new** constant (§2), deliberately not reusing `lib/mortgage/constants.ts`'s `DEFAULT_PRICE_BY_CURRENCY` (that constant is a *home price* default for the standalone calculator; this page's `amount` is a *loan principal* directly — no down payment field exists here, see D10 — so reusing the home-price constant would silently overstate the principal). | Keeps the no-filter default page (task acceptance criterion: SSR renders "correct for the default (no-filter) case") from showing `NaN`/`0` monthly payments, and keeps the table internally consistent (every row uses a term that's actually valid for that row) without inventing a currency-aware amount-conversion feature (explicitly out of scope — no FX anywhere in this app, per every prior mortgage handoff's D2). |

---

## 2. Component inventory (new files)

```
app/[locale]/mortgage/rates/
  page.tsx                          (NEW — Server Component: generateMetadata (D2's route,
                                      §7), parses+zod-validates searchParams via
                                      ratesFilterSchema, self-fetches GET /api/mortgage/rates
                                      (D6), renders the static H1/subtitle + all sections below)

components/mortgage/rates/
  RatesFilterBar.tsx                 (NEW — 'use client': Country/Currency/Loan type/Term/
                                      Amount fields, [Apply]/[Clear] → router.push, D6)
  RatesTable.tsx                     (NEW — Server Component: sorts rate asc (defensive
                                      re-sort even though the query already orders it),
                                      renders <table> (desktop) + card list (mobile) wrappers,
                                      empty state, delegates each row to RateRow)
  RateRow.tsx                        (NEW — Server Component: variant 'row' | 'card', forked
                                      from ModerationRow.tsx, D5 — bank name+logo, rate, loan
                                      type, term range, min-down/LTV, computed monthly payment
                                      (D3/D11), updated date + stale badge, [Apply] anchor)
  PreApprovalCtaBlock.tsx            (NEW — 'use client': rhf + zod form, guest-redirect (D7),
                                      success/error states, POST /api/mortgage/preapproval)
  RatesDisclaimer.tsx                (NEW — pure-props Server Component: disclaimer text +
                                      "Updated: {date}" badge, §5.6)

lib/mortgage/rates/
  schemas.ts                         (NEW — ratesFilterSchema (query-param zod, §5.1),
                                      preApprovalSchema (body zod, §5.5))
  types.ts                           (NEW — RateOffer, BankSummary — mirror the API item
                                      shape, D4)
  constants.ts                       (NEW — COUNTRIES, LOAN_TYPES, STALE_DAYS = 30,
                                      DEFAULT_LOAN_AMOUNT_BY_CURRENCY (D11))
  calc.ts                            (NEW — resolveMonthlyPayment(row, filters): pure,
                                      wraps calculateMonthlyPayment with the D11 fallback
                                      chain, unit-tested)
  redirect.ts                        (NEW — buildPreApprovalLoginRedirect(pathname, search):
                                      pure, unit-tested, D7)
  getRates.ts                        (NEW — server-only: buildRatesQuery(filters) — the
                                      Supabase `.eq`/`.gte`/`.lte` chain-building logic,
                                      extracted as a pure-ish function taking a query builder
                                      so it's unit-testable without a live Supabase instance
                                      (same technique `lib/search`'s route uses implicitly);
                                      getRates(filters): { updatedAt, items } — calls
                                      buildRatesQuery then computes `stale` per row, or falls
                                      back to mockRates.ts when Supabase isn't configured)
  mockRates.ts                       (NEW — hand-seeded RateOffer[] + BankSummary[] mirroring
                                      the migration's seed rows, for the no-Supabase-configured
                                      dev/test fallback — same convention as
                                      lib/search/mockData.ts)

app/api/mortgage/
  rates/route.ts                     (NEW — GET: ratesFilterSchema.safeParse → 422
                                      invalid_filters on failure (matches
                                      app/api/properties/route.ts's exact error shape) →
                                      getRates(filters) → 200 { updatedAt, items })
  preapproval/route.ts               (NEW — POST: parse JSON → preApprovalSchema.parse → 422
                                      validation_error → honeypot → require session → 401
                                      auth_required → rate-limit → 429 rate_limited → insert
                                      preapproval_leads → 201 { leadId }; forked from
                                      app/api/agent-leads/route.ts almost verbatim)

lib/auth/
  rateLimit.ts                       (EDIT — add MORTGAGE_PREAPPROVAL: { max: 5,
                                      windowMs: 60 * 60 * 1000 } to LIMITS, same shape as
                                      AGENT_LEAD)

supabase/migrations/
  0013_mortgage_rates.sql            (NEW — partner_banks + mortgage_rates + preapproval_leads,
                                      RLS on all three (D9), seed rows for ≥2 countries)

types/database.ts                   (EDIT — hand-authored Row/Insert/Update blocks for the
                                      three new tables, following the file's existing
                                      per-table convention)
```

Reuse, don't fork: `lib/utils.ts` (`cn`), `lib/mortgage/calculations.ts`'s
`calculateMonthlyPayment` (D3), `lib/mortgage/constants.ts`'s `CURRENCIES`/
`TERM_PRESETS`/`TERM_MIN`/`TERM_MAX`/`PRICE_MAX`, `components/admin/ModerationRow.tsx`'s
row/card variant shape (D5), `components/search/SearchPageClient.tsx:61`'s
`router.push` filter-sync pattern, `useFavoriteToggle.ts`'s cookie-sniff +
hard-redirect guest gate (D7), `lib/agent/schemas.ts`'s `E164_PHONE` (D8),
`lib/auth/rateLimit.ts`'s `checkRateLimit`, `app/api/agent-leads/route.ts`'s
whole route shape (D8), `lib/admin/format.ts`'s `formatPrice`
symbol-map style (reuse `CURRENCIES`' own `symbol` field instead of a second
map), the breadcrumb markup from `app/[locale]/favorites/page.tsx:58-84`.

---

## 3. Wireframes

### 3.1 Desktop (≥768px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Mortgage rates                                        │
│ H1 "Mortgage interest rates"  (text-3xl font-bold)            │
│ subtitle "Compare {N} offers"  ·  Updated: 01 Jun 2026        │
├────────────────────────────────────────────────────────────┤
│ ── FILTER BAR (card, not sticky — D-below) ──────────────── │
│ Country[▾]  Currency[▾]  Loan type[▾]  Term[▾]  Amount[__]   │
│                                          [Clear]  [Apply]     │
├────────────────────────────────────────────────────────────┤
│ ┌── RATES TABLE (<table>, hidden md:table) ────────────────┐│
│ │ Bank        │Rate  │Type   │Term  │Down/LTV│Mo.pmt │Updt │CTA││
│ │ 🏦 Ardshinb.│11.9% │primary│15–20 │20%/80% │196k ֏ │01Jun│[Apply]││
│ │ 🏦 Ameria   │12.4% │primary│10–20 │15%/85% │203k ֏ │15Apr⚠️│[Apply]││
│ └────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ ── PRE-APPROVAL CTA (id="preapproval") ──────────────────── │
│ "Get pre-approved" · Name / Phone / Loan amount / ☐ consent   │
│                                              [Send application]│
├────────────────────────────────────────────────────────────┤
│ DISCLAIMER (text-xs gray-400) + "Updated: {date}" badge       │
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ H1 (text-2xl) + Updated:… │
├──────────────────────────┤
│ Filter bar — fields stack │
│ vertically, full-width    │
│ [Clear]      [Apply]      │
├──────────────────────────┤
│ ── Rate cards (md:hidden)─│
│ ┌──────────────────────┐ │
│ │ 🏦 Ardshinbank  11.9% │ │
│ │ Primary · 15–20 yr    │ │
│ │ 20% down / 80% LTV    │ │
│ │ ~196,000 ֏/mo         │ │
│ │ Updated 01 Jun 2026    │ │
│ │ [Apply →] (full-width)│ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Pre-approval form (stacked)│
├──────────────────────────┤
│ DISCLAIMER · FOOTER        │
└──────────────────────────┘
```

No filter bottom-sheet for MVP (deep spec §2 draws one) — the filter bar is
a plain card with wrapping fields, always visible on every breakpoint, same
"stacked full-width fields" treatment `Step2Location.tsx`/`AddressFieldsForm`-style
forms already use elsewhere in this app. This is a deliberate simplification:
the acceptance criteria only require the filters to work and sync the URL,
not a specific mobile interaction chrome; a bottom-sheet is real, unscoped
UI surface (focus trap, open/close state, backdrop) the task brief doesn't
ask for.

### 3.3 Empty filtered result

```
┌────────────────────────────────────────────────────────────┐
│              (icon circle, w-16 h-16 bg-gray-100)             │
│                     🏦  (Landmark icon, gray-300)             │
│         No offers with these parameters                       │
│         Try a different country, currency, or term.           │
│                     [Clear filters]                            │
└────────────────────────────────────────────────────────────┘
```

Same icon-circle anatomy as `EmptyInbox.tsx`/`not-found.tsx` (§4 tokens),
`lucide-react`'s `Landmark` icon (already thematically a "bank" glyph, no new
icon dependency). `[Clear filters]` is a plain `<Link href="/mortgage/rates">`
(locale-aware), not a JS handler — clearing the query string is exactly
navigating to the bare route.

### 3.4 Stale badge (row/card)

```
Updated 15 Apr 2026  ⚠️ May be outdated
```

`⚠️ May be outdated`: `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded`
— shown only when `stale === true` from the API (§5.3).

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| Breadcrumb | Reuse `app/[locale]/favorites/page.tsx:58-84` verbatim (desktop `Home › X`, mobile `‹ Back`) |
| H1 | `text-3xl font-bold text-gray-900` (mobile `text-2xl`) |
| Subtitle | `text-sm text-gray-500 mt-1` |
| "Updated" badge | `text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md` |
| Filter bar card | `bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end` |
| Filter label | `text-xs font-medium text-gray-700 mb-1 block` |
| Filter select/input | `h-11 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary` (identical to `MortgagePaymentCalculator`'s number-input convention) |
| `[Apply]` | `h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors` |
| `[Clear]` | `h-11 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors` |
| Table wrapper | `hidden md:block overflow-x-auto` (D5) |
| Table | `w-full text-sm border-collapse` |
| Table header (`<th scope="col">`) | `text-left font-medium text-gray-500 bg-gray-50 px-3 py-2 text-xs uppercase tracking-wide` |
| Table row | `border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100` |
| Card list wrapper | `md:hidden space-y-3` (D5) |
| Card | `border border-gray-200 rounded-xl p-4 bg-white shadow-sm` |
| Bank logo | `w-10 h-10 rounded object-contain flex-shrink-0 bg-gray-50` (fallback: `🏦` in a `w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-lg`, same fallback idiom as `ModerationRow.tsx`'s `Thumbnail`) |
| Bank name | `text-sm font-medium text-gray-900` |
| Rate cell | `text-lg font-semibold text-gray-900` — prefix `from` in `text-xs text-gray-400 font-normal` |
| Stale badge | `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-md inline-flex items-center gap-1` |
| `[Apply]` row/card CTA | `inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors` (anchor `href="#preapproval"`, no JS) |
| Monthly payment | `text-sm font-medium text-gray-900` + `/mo` suffix `text-gray-500 font-normal` |
| Empty-state icon circle | `w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center` (icon `w-8 h-8 text-gray-300`) — matches `EmptyInbox.tsx`/`not-found.tsx` |
| Pre-approval card | `bg-white border border-gray-200 rounded-xl p-6 shadow-sm` |
| Pre-approval submit | `h-11 px-6 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors` |
| Pre-approval success | `bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm` |
| Inline field error | `text-xs text-red-600 mt-1` + `role="alert"` |
| Consent checkbox row | `flex items-start gap-2 text-sm text-gray-600` (native `<input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary">`) |
| Disclaimer | `text-xs text-gray-400 leading-relaxed mt-8` |

Every color/radius/spacing value above is an existing Tailwind default or
this app's one custom token (`--color-primary`) — no new tokens introduced
(D1).

---

## 5. Data & API

### 5.1 `lib/mortgage/rates/schemas.ts`

```ts
import { z } from 'zod'
import { TERM_MIN, TERM_MAX, PRICE_MAX, CURRENCIES } from '@/lib/mortgage/constants'
import { LOAN_TYPES } from './constants'

const CURRENCY_VALUES = CURRENCIES.map((c) => c.value) as [string, ...string[]]
const LOAN_TYPE_VALUES = LOAN_TYPES.map((t) => t.value) as [string, ...string[]]

export const ratesFilterSchema = z.object({
  country: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(CURRENCY_VALUES as [string, ...string[]]).optional(),
  type: z.enum(LOAN_TYPE_VALUES as [string, ...string[]]).optional(),
  term: z.coerce.number().int().min(TERM_MIN).max(TERM_MAX).optional(),
  amount: z.coerce.number().positive().max(PRICE_MAX).optional(),
})
export type RatesFilter = z.infer<typeof ratesFilterSchema>

/** Parses raw URLSearchParams into RatesFilter; unknown/blank keys are dropped so zod's `.optional()` applies. Never throws — caller uses `.safeParse` or wraps in try/catch (route uses safeParse; page.tsx wraps in try/catch and falls back to `{}` on failure, mirroring search/page.tsx). */
export function parseRatesFilter(params: URLSearchParams): RatesFilter { /* same drop-undefined-keys technique as lib/search/filtersSchema.ts's parseSearchParams */ }
```

`LOAN_TYPES` (`lib/mortgage/rates/constants.ts`):
`primary` "Primary market" · `secondary` "Secondary market" ·
`new_construction` "New construction" · `refinance` "Refinance" ·
`government` "Government program" (matches the deep spec's §3.2 list).

`COUNTRIES` (same file), used by the filter `<select>` and the migration
seed — at minimum the two seeded countries:
`AM` "Armenia" · `RU` "Russia" (banks: e.g. Ardshinbank/Ameriabank/Inecobank
for AM, Sberbank/VTB for RU — pick any realistic, publicly-known bank names;
these are display data, not a legal claim of an actual partnership).

### 5.2 `GET /api/mortgage/rates?country=AM&currency=AMD&type=primary&term=15&amount=40000000`

```jsonc
// 200 OK
{
  "updatedAt": "2026-06-01",   // max(updated_at) across returned items, or null if items=[]
  "items": [
    {
      "bankId": "5f3e...-uuid", "bankSlug": "ardshinbank", "bankName": "Ardshinbank",
      "logo": "/images/banks/ardshinbank.svg",
      "ratePct": 11.9, "loanType": "primary",
      "termMin": 15, "termMax": 20, "minDownPct": 20, "maxLtv": 80,
      "currency": "AMD", "commissionPct": 1.0,
      "updatedAt": "2026-06-01T00:00:00.000Z", "stale": false
    }
  ]
}
// 200 (empty) { "updatedAt": null, "items": [] }
// 422 { "error": "invalid_filters", "fields": { "term": "..." } }   — matches app/api/properties/route.ts's shape
```

No `estMonthly` field (D4). `items` ordered `rate_pct ASC` by the query
itself (`RatesTable` re-sorts defensively client^H^H^Hserver-side too, cheap
insurance against a future query-order regression, not a required feature).

`lib/mortgage/rates/getRates.ts`:

```ts
export interface RatesQueryResult { updatedAt: string | null; items: RateOffer[] }

export async function getRates(filters: RatesFilter): Promise<RatesQueryResult> {
  // Supabase-configured path: admin client (RLS already allows public SELECT,
  // but the route always reads server-side, so the admin client is fine and
  // matches similar/route.ts's precedent), select from mortgage_rates joined
  // to partner_banks (is_active = true), apply .eq for country/currency/
  // loan_type, and a term-overlap filter: term_min <= :term AND term_max >= :term
  // when filters.term is set. Order by rate_pct ascending.
  // Not-configured path: filter mockRates.ts's array in-memory with the same
  // predicates (kept in one small pure function, testable without Supabase).
  // Either path: stale = (Date.now() - new Date(row.updated_at).getTime()) > STALE_DAYS * 86_400_000
}
```

### 5.3 Stale threshold

`STALE_DAYS = 30` (`lib/mortgage/rates/constants.ts`). Computed **server-side**
(in `getRates`), returned as `stale: boolean` — mirrors `lib/admin/format.ts`'s
`formatWaiting`'s `>24h` boundary check, just a different threshold/table.
Unit-test the boundary exactly like the acceptance criteria asks
("stale-badge threshold"): 29 days → `false`, 31 days → `true`, exactly 30
days → pick and document one side (recommend `> 30` i.e. exactly-30-days is
**not** stale yet, matching the deep spec's literal wording "`updated_at` >
30 days").

### 5.4 Monthly-payment resolution (`lib/mortgage/rates/calc.ts`)

```ts
import { calculateMonthlyPayment } from '@/lib/mortgage/calculations'
import { DEFAULT_LOAN_AMOUNT_BY_CURRENCY } from './constants'
import type { RateOffer, RatesFilter } from './types'

/** D11 — resolves the principal/term inputs per row, then delegates to the
 * shared PMT function. Pure, no I/O — the only thing RatesTable/RateRow call. */
export function resolveMonthlyPayment(row: RateOffer, filters: Pick<RatesFilter, 'amount' | 'term'>): number {
  const principal = filters.amount ?? DEFAULT_LOAN_AMOUNT_BY_CURRENCY[row.currency]
  const termYears = filters.term ?? row.termMax ?? row.termMin
  return calculateMonthlyPayment(principal, row.ratePct, termYears)
}
```

`DEFAULT_LOAN_AMOUNT_BY_CURRENCY`: a **new**, smaller-scale constant than the
calculator's `DEFAULT_PRICE_BY_CURRENCY` (D11) — e.g.
`{ AMD: 30_000_000, USD: 80_000, EUR: 70_000, RUB: 5_000_000 }` (loan
principal, not home price; pick any values in the same ballpark as the seed
rows' `amount_tier`-free rates so the default table doesn't show absurd
monthly payments).

### 5.5 `POST /api/mortgage/preapproval`

```ts
// lib/mortgage/rates/schemas.ts
import { z } from 'zod'

const E164_PHONE = /^\+[1-9]\d{6,14}$/ // same pattern as lib/agent/schemas.ts (D8)

export const preApprovalSchema = z.object({
  name: z.string().min(2, 'Name is required').max(50),
  phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
  loanAmount: z.coerce.number().positive('Loan amount is required').max(PRICE_MAX),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required' }) }),
  // Context, not user-editable fields — populated from the page's current filters:
  country: z.string().trim().toUpperCase().length(2).optional(),
  currency: z.enum(CURRENCY_VALUES as [string, ...string[]]).optional(),
  /** Honeypot — must stay empty, same convention as agentLeadSchema. */
  website: z.string().max(0, 'Spam detected').optional(),
})
```

```jsonc
// request { "name": "Ashot", "phone": "+37477123456", "loanAmount": 40000000, "country": "AM", "currency": "AMD", "consent": true }
// 201 { "leadId": "..." }
// 401 { "error": "auth_required" }
// 422 { "error": "validation_error", "fields": {...} }   // e.g. consent missing/false
// 429 { "error": "rate_limited" }
```

Route flow (fork of `app/api/agent-leads/route.ts`, §2): parse JSON → 400
`invalid_json` → `preApprovalSchema.parse` (422 `validation_error` on
`ZodError`, matching the pattern's `err.flatten().fieldErrors`) → honeypot
(silently 201 `{ leadId: 'discarded' }` if `website` is non-empty) →
`createServerClient()` → `supabase.auth.getUser()` → no user → **401**
`auth_required` → `checkRateLimit('mortgage-preapproval:' + user.id, LIMITS.MORTGAGE_PREAPPROVAL.max, ...windowMs)` →
429 `rate_limited` → insert `{ user_id: user.id, name, phone, loan_amount: loanAmount, country, currency, consent }`
into `preapproval_leads` (via the request-scoped `createServerClient()`, an
**authenticated** insert respecting the RLS `INSERT WITH CHECK (auth.uid() =
user_id)` policy — not the admin client; this mirrors `agent-leads`'s exact
insert path, not `home-value`'s admin-client path, since this write is
always authenticated by the time it reaches the DB, unlike home-value's
guest-writable estimate table) → 201 `{ leadId: row.id }`.

### 5.6 Disclaimer copy (`<RatesDisclaimer>`)

> "Interest rates shown are informational and provided by partner banks or
> entered manually; they may change and do not constitute an official offer.
> Actual terms are determined by the bank at the time of application."

Plus the "Updated: {date}" badge (§4 tokens), fed by the same `updatedAt`
the page already fetched — always visible (task's explicit acceptance
criterion), rendered both near the H1 (§3.1) and again above the footer.

---

## 6. Migration (`supabase/migrations/0013_mortgage_rates.sql`)

```sql
CREATE TABLE IF NOT EXISTS partner_banks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  logo        TEXT,
  country     TEXT[]      NOT NULL DEFAULT '{}',  -- ISO 3166-1 alpha-2, e.g. {'AM'}
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mortgage_rates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id        UUID        NOT NULL REFERENCES partner_banks(id) ON DELETE CASCADE,
  country        TEXT        NOT NULL CHECK (char_length(country) = 2),
  currency       TEXT        NOT NULL CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  loan_type      TEXT        NOT NULL
                                CHECK (loan_type IN ('primary', 'secondary', 'new_construction', 'refinance', 'government')),
  rate_pct       NUMERIC(5,2) NOT NULL CHECK (rate_pct >= 0),
  term_min       SMALLINT    NOT NULL CHECK (term_min > 0),
  term_max       SMALLINT    NOT NULL CHECK (term_max >= term_min),
  min_down_pct   NUMERIC(5,2) CHECK (min_down_pct IS NULL OR (min_down_pct >= 0 AND min_down_pct <= 100)),
  max_ltv        NUMERIC(5,2) CHECK (max_ltv IS NULL OR (max_ltv >= 0 AND max_ltv <= 100)),
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Free-text provenance note, e.g. 'manual entry' / 'bank rate sheet 2026-06' (§0 of the deep spec).
  source         TEXT
);

CREATE INDEX IF NOT EXISTS mortgage_rates_filter_idx
  ON mortgage_rates (country, currency, loan_type, rate_pct);

CREATE TABLE IF NOT EXISTS preapproval_leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,
  loan_amount NUMERIC     NOT NULL CHECK (loan_amount > 0),
  country     TEXT        CHECK (country IS NULL OR char_length(country) = 2),
  currency    TEXT        CHECK (currency IS NULL OR currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  consent     BOOLEAN     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS preapproval_leads_user_id_created_idx
  ON preapproval_leads (user_id, created_at DESC);

ALTER TABLE partner_banks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mortgage_rates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE preapproval_leads ENABLE ROW LEVEL SECURITY;

-- Public read-only reference data (D9) — no write policy, so RLS default-denies
-- writes for anon/authenticated; only the service-role key can write.
CREATE POLICY "partner_banks: public can select"
  ON partner_banks FOR SELECT USING (is_active = true);

CREATE POLICY "mortgage_rates: public can select"
  ON mortgage_rates FOR SELECT USING (true);

-- preapproval_leads: owner or admin can read (D9, reuses is_admin() from
-- 0012_admin_moderation.sql — do not redefine it); owner-only, authenticated
-- insert (matches agent_leads' shape in 0008_agent_profile.sql).
CREATE POLICY "preapproval_leads: owner or admin can select"
  ON preapproval_leads FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "preapproval_leads: user can insert own"
  ON preapproval_leads FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed — at least 2 countries so the page isn't empty in review (task
-- acceptance criterion). Realistic sample banks/rates, manually curated.
INSERT INTO partner_banks (slug, name, logo, country, description, is_active) VALUES
  ('ardshinbank', 'Ardshinbank', '/images/banks/ardshinbank.svg', '{AM}', 'Leading Armenian retail bank.', true),
  ('ameriabank',  'Ameriabank',  '/images/banks/ameriabank.svg',  '{AM}', 'Universal bank offering mortgage programs.', true),
  ('sberbank-ru', 'Sberbank',    '/images/banks/sberbank.svg',    '{RU}', 'Russia''s largest retail bank.', true)
ON CONFLICT (slug) DO NOTHING;

-- One row per bank/loan-type combination is enough to exercise sort + stale
-- badge (one row deliberately dated > 30 days back). Use each bank's id via
-- a WITH clause / subselect on slug so this migration is self-contained.
INSERT INTO mortgage_rates (bank_id, country, currency, loan_type, rate_pct, term_min, term_max, min_down_pct, max_ltv, commission_pct, updated_at, source)
SELECT id, 'AM', 'AMD', 'primary', 11.9, 15, 20, 20, 80, 1.0, NOW(), 'manual entry' FROM partner_banks WHERE slug = 'ardshinbank'
UNION ALL
SELECT id, 'AM', 'AMD', 'secondary', 12.4, 10, 20, 15, 85, 1.5, NOW() - INTERVAL '45 days', 'manual entry' FROM partner_banks WHERE slug = 'ameriabank'
UNION ALL
SELECT id, 'RU', 'RUB', 'primary', 16.5, 15, 30, 20, 80, 0.5, NOW(), 'manual entry' FROM partner_banks WHERE slug = 'sberbank-ru';
-- Developer: extend with 2–3 more rows per bank (different loan_type/term)
-- so the table has enough variety to demo sort + filters meaningfully.
```

Add the corresponding hand-authored `Row`/`Insert`/`Update` blocks to
`types/database.ts` for all three tables (no live `supabase gen types` run
in this sandbox, per every prior handoff's note).

---

## 7. Page shell & SEO

```ts
// app/[locale]/mortgage/rates/page.tsx (sketch)
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return {
    title: `Mortgage interest rates — compare banks | RE Platform`,
    description: 'Compare current mortgage interest rates from partner banks. Filter by country, currency, term, and loan amount.',
    alternates: {
      canonical: `/${locale}/mortgage/rates`,
      languages: { hy: '/hy/mortgage/rates', ru: '/ru/mortgage/rates', en: '/en/mortgage/rates' },
    },
    // No `robots` override — indexable (public comparison tool page, same as mortgage-calculators).
  }
}
```

No `FinancialProduct`/`FAQPage` JSON-LD (§0). Route is locale-prefixed but
page chrome copy is hardcoded English, same established convention as every
prior mortgage/compare/home-value handoff in this repo (no
`messages/*.json` namespace added). `/mortgage/rates` must **not** be added
to `lib/auth/protectedPaths.ts` — anonymous browsing/filtering is core to
the page; only the pre-approval POST requires auth (enforced inside the
route + the client-side guest-redirect, not via route-level middleware).

---

## 8. Accessibility

- Filter bar: every field has a real `<label htmlFor>` (not a placeholder).
- Table: `<table>` with `<th scope="col">` headers (no `<caption>` required
  by the acceptance criteria, but cheap to add: `<caption className="sr-only">Mortgage rate offers</caption>`).
- Card list (mobile): each card's bank name is the heading element
  (`<h3 className="text-sm font-medium text-gray-900">`), `[Apply]`
  `aria-label="Apply to {bankName}"`.
- Stale badge communicates via text ("May be outdated"), not color alone —
  already satisfied since it's a text+icon badge, not a bare color swatch.
- Pre-approval form: inline errors `role="alert"`, `aria-invalid` +
  `aria-describedby` on each field (identical contract to
  `Step2Location.tsx`/`AddressFieldsForm.tsx`), consent checkbox has a
  visible, clickable `<label>` wrapping both the input and its text.
- Touch targets ≥ 44px (`h-11` inputs/buttons, `h-9`+padding CTAs already
  meet this per prior handoffs' own audits of the same class strings).
- Contrast ≥ 4.5:1 — all colors reused from already-audited pairs.

---

## 9. Motion summary (Tailwind-only, no new dependency — D1)

| Interaction | Technique |
|---|---|
| Filter `[Apply]`/`[Clear]` hover | `hover:bg-primary/90` / `hover:bg-gray-50`, `transition-colors` |
| Table row hover | `hover:bg-gray-50 transition-colors duration-100` |
| Row/card `[Apply]` → pre-approval form | Native `<a href="#preapproval">` anchor jump — `html { scroll-behavior: smooth }` already global in `app/globals.css`, zero JS |
| Pre-approval submit (in flight) | Button `disabled` + text swap ("Sending…"), `opacity-60 cursor-not-allowed`, same convention as every other form submit in this app |
| Pre-approval success | Static success panel replaces the form (no fade library needed — mount/unmount, matching this app's existing toast convention of "no enter/exit transition") |

No `prefers-reduced-motion` handling needed beyond what's already implicit —
nothing here moves more than a color/opacity change.

---

## 10. Testing notes

Mirrors this repo's convention (`environment: 'node'`, one file per unit, no
DOM/RTL — logic lives in `lib/`, components stay thin renderers):

- `__tests__/mortgageRatesSchemas.test.ts` — `ratesFilterSchema`: valid
  combinations parse; invalid `currency`/`type` enum values rejected;
  `term` outside `[TERM_MIN, TERM_MAX]` rejected; `amount` non-positive or
  `> PRICE_MAX` rejected; all fields genuinely optional (empty object
  parses). `preApprovalSchema`: valid body parses; **missing/false `consent`
  rejected** (the acceptance criterion's literal "missing consent → 422"
  case); invalid phone shape rejected; `name` too short/long rejected;
  `loanAmount` non-positive rejected; optional `country`/`currency`
  genuinely optional.
- `__tests__/mortgageRatesCalc.test.ts` — `resolveMonthlyPayment`: with an
  explicit `filters.amount`/`filters.term`, matches
  `calculateMonthlyPayment(amount, row.ratePct, term)` exactly (delegates,
  doesn't reimplement); with `filters` empty, falls back to
  `DEFAULT_LOAN_AMOUNT_BY_CURRENCY[row.currency]` and `row.termMax` (or
  `termMin` when `termMax` is absent) — assert against a hand-computed PMT
  value for at least one AMD and one RUB row (covers the multi-currency
  default case, D11).
- `__tests__/mortgageRatesStale.test.ts` — the `> STALE_DAYS` boundary:
  29 days old → `stale: false`; exactly 30 days → `false` (per §5.3's
  documented tie-break); 31 days → `true`.
- `__tests__/mortgageRatesQuery.test.ts` — `getRates`/`buildRatesQuery`
  (mock-data path, no live Supabase needed, same technique
  `propertiesRoute.test.ts` uses): filtering by `country`/`currency`/`type`
  narrows the result set correctly; `term` filter only returns rows whose
  `[termMin, termMax]` contains it; results always come back `rate_pct`
  ascending; no-filter call returns all seeded rows across ≥2 countries
  (covers the "default (no-filter) case" acceptance criterion at the data
  layer); a filter combination matching nothing returns `{ items: [] }`
  (not a throw).
- `__tests__/mortgageRatesRedirect.test.ts` — `buildPreApprovalLoginRedirect`:
  given a pathname (+ optional query string), returns
  `/auth/login?next=<url-encoded-original-path>`; round-trips through
  `decodeURIComponent` back to the original path (covers the "guest-redirect
  behavior" acceptance criterion without needing RTL/a rendered component).
- `__tests__/mortgageRatesApiRoutes.test.ts` — `GET /api/mortgage/rates`:
  valid query → 200 with `items` sorted rate-ascending; invalid query
  (e.g. `?term=abc`) → 422 `invalid_filters` (matches
  `app/api/properties/route.ts`'s exact error shape); no Supabase env vars
  configured → still 200 via the mock fallback (forced via the existing
  placeholder-Supabase-URL trick other route tests already use).
  `POST /api/mortgage/preapproval`: no session → 401 `auth_required`;
  authenticated + `consent: false`/missing → 422 `validation_error`;
  authenticated + valid body → 201 `{ leadId }`; over the rate limit → 429.
- `__tests__/mortgageRatesMigration.test.ts` — static regex assertions
  against `0013_mortgage_rates.sql` (same style as
  `savedSearchesMigration.test.ts`/`homeValueMigration.test.ts`): all three
  tables created; RLS enabled on all three; `partner_banks`/`mortgage_rates`
  have a public `SELECT` policy and **no** INSERT/UPDATE/DELETE policy;
  `preapproval_leads`'s SELECT policy references both `auth.uid() = user_id`
  and `is_admin()`; its INSERT policy is `auth.uid() = user_id`; the
  `loan_type`/`currency` CHECK constraints list the documented values; seed
  `INSERT`s cover at least 2 distinct `country` values.

Manual verification checklist (documented, not automatable in this sandbox —
same disclaimer as every prior migration test file): confirm as a real
non-admin user that `SELECT * FROM preapproval_leads` returns only that
user's own rows; confirm an anon/no-session client can `SELECT` from
`mortgage_rates`/`partner_banks` but any `INSERT`/`UPDATE`/`DELETE` on them
is rejected by RLS (not just absent from the UI).

---

## 11. Explicit follow-ups (not part of this task)

- Rate trend chart (§3.4), `rate_history` table, `GET /api/mortgage/rate-history`
  (needs Recharts — not currently a dependency, same non-goal every prior
  mortgage handoff has noted).
- `/mortgage/rates/[bankSlug]` bank profile pages (D2) — once built, the
  table's bank name becomes a real `<Link>`.
- Partner-bank logo grid (§3.6 second half).
- Waitlist / early-country email capture for countries with zero partner
  banks (deep spec's Scenario C) — for MVP, a country filter that matches
  zero banks just renders the same "No offers with these parameters" empty
  state (§3.3), not a distinct "coming soon" state.
- Educational/related links section (§3.7).
- Row-expand-to-see-fees/requirements (§3.3's "click row → expand").
- `incomeRange`/`bankIds` fields on the pre-approval form, and routing a
  lead to a *specific* bank (currently a lead is a general "get
  pre-approved" inquiry, not bank-targeted).
- Down payment % filter field (D10).
- Interactive/user-toggleable column sort, pagination.
- `FinancialProduct`/`FAQPage` JSON-LD, country-landing canonical strategy
  (§8 of the deep spec).
- `/mortgage/pre-approval` as its own page (`Header.tsx:62`'s nav item stays
  a pre-existing dead link, untouched by this task).
- Live partner-bank data feed (§0 of the deep spec — rates stay manually
  maintained this iteration, per the task brief).
