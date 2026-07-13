# Page 17 — Pricing / Advertise (`/pro`): Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/17-pricing.md`](../en/pages/17-pricing.md) (deep spec: `/pro`
tier comparison **and** `/advertise` brand landing, full Stripe checkout,
enterprise contact, testimonials, feature-highlight cards, analytics events).
This document does **not** repeat that spec in full; it exists to pin down the
**MVP scope** for the current task and to close the gap between the generic
spec and *this specific codebase*.

Audited against the current tree: `app/[locale]/favorites/page.tsx` and
`app/[locale]/mortgage-calculators/page.tsx` (the two Server-Component-shell
patterns this page combines — direct `createServerClient()` DB read for
auth-aware data, `generateMetadata` + `alternates.languages` hreflang), `types/database.ts`
(`profiles.tier: UserTier = 'free' | 'pro' | 'premium'` **already exists** —
this is the current-plan source of truth, see D2), `supabase/migrations/0007_saved_searches.sql`
(RLS + idempotent-migration style to mirror), `app/api/favorites/route.ts` and
`__tests__/favoritesRoute.test.ts` (the zod-body + `auth.getUser()` + typed-response
route-handler pattern and its Vitest mock style — mirror both exactly for
`POST /api/plans/checkout`), `lib/auth/safeNext.ts` (already accepts **any**
relative path, including `/pro` — `/login?next=/pro` needs **zero** auth-flow
changes), `middleware.ts` / `lib/auth/protectedPaths.ts` (`/pro` must **not**
be added to `PROTECTED_PATHS` — the page itself is public; only the checkout
call is gated, same pattern as `/favorites`), `store/currencyStore.ts`
(existing global currency preference, header-mounted, **display-only, no live
FX** — reused here, see D3), `components/property/PropertyMainInfo.tsx`
(`CURRENCY_SYMBOL` map convention — duplicated per-file throughout this repo;
follow that convention, don't introduce a new shared util), `messages/{en,hy,ru}.json`
+ `i18n/request.ts` (confirms **only `messages/*.json` at repo root is
live** — `i18n/messages/*.json` is a stale, unused duplicate; do not edit it,
see D1), `components/layout/Header.tsx` (`useTranslations` client pattern,
`NAV_ITEMS` typed union — **not** touched by this task, see D5) and
`components/layout/Footer.tsx` (plain hardcoded-English link labels, not
translated — a 1-line addition is enough, see D5), `vitest.config.ts`
(`environment: 'node'`, no DOM/RTL — tests target `lib/` pure functions and
route handlers only, see §9).

---

## 0. MVP scope for this task (read before building)

Build exactly the "In scope" list from the task brief. Everything else in the
generic page-spec (`/advertise`, real Stripe Checkout, `GET /api/plans` as a
separate fetch-based endpoint, Enterprise/Agency contact modal, feature
highlight icon cards, testimonials carousel, final CTA block, `Product`/`Offer`
JSON-LD, analytics events) is **explicitly deferred**. Do not build it, do not
stub it with a disabled button beyond what's noted below.

**In scope:**
- `/[locale]/pro` — Server Component shell (SSR, indexable), hero + tier
  comparison table (Free / Pro / Premium) sourced from a new `plans` DB table
  (migration + RLS, §5.1), with a typed static fallback config when Supabase
  isn't configured (§5.3 — mirrors the `getMockPropertiesResponse` fallback
  pattern already used by `/search`).
- Monthly/Annual billing-cycle toggle and currency-aware price display — both
  client components, reading **already-fetched** per-currency prices; **no**
  live FX conversion call (§5.1 — `plans.prices` stores one static price per
  currency, matching how a real subscription business sets per-market pricing
  manually, not via spot exchange rate).
- FAQ accordion — client component, static translated content (4 items, §6).
- Tier CTA buttons: logged-out → `/login?next=/pro`; logged-in → `POST
  /api/plans/checkout` (zod-validated body, session-checked, stub response);
  current-tier CTA is disabled ("Your current plan"), reusing the
  already-existing `profiles.tier` column (§1 D2).
- Translated static copy (en/hy/ru) wired through the existing `next-intl`
  setup — a **new namespace** in `messages/*.json` (§6). This is a deliberate
  deviation from every page shipped so far (§1 D1).
- Basic SEO: `<title>`, meta description, canonical, hreflang. Indexable (no
  `robots: noindex` — this is the platform's monetization/marketing page).

**Explicitly out of scope (do not build):** `/advertise` (separate task),
real Stripe Checkout / `checkout.stripe.com` redirect, `POST
/api/billing/portal`, `POST /api/webhooks/stripe`, Enterprise/Agency contact
form + `POST /api/leads/enterprise`, feature-highlight icon cards (§3.4 of the
generic spec), testimonials carousel, final CTA block, `GET /api/plans` as a
standalone fetch endpoint (data is read directly in the Server Component,
§5.2), `Product`/`Offer`/`FAQPage` JSON-LD, analytics event wiring, admin UI
for editing plans (Page 24).

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | No prior page in this repo wires translated copy through `next-intl` beyond `Header`/notification-bell chrome (`docs/design/25-compare-handoff.md` D4, `docs/design/13-mortgage-calc-handoff.md` D5 both explicitly chose hardcoded English for page content). | **This task's acceptance criteria explicitly requires translated static copy**, so `/pro` is the first content page to do it for real: add a **`pro`** namespace to `messages/en.json` / `messages/hy.json` / `messages/ru.json` (exact content in §6), read server-side via `getTranslations('pro')` in `page.tsx` (this repo's first server-side `next-intl` usage — `NextIntlClientProvider` in `app/[locale]/layout.tsx` already provides all messages to client components too, so `PricingFaq`/`PlanComparison`/`PlanCtaButton` use the ordinary client `useTranslations('pro')`, no extra plumbing needed) and client-side in the three new client components. **Do not** edit `i18n/messages/*.json` — that directory is a stale duplicate `i18n/request.ts` never imports (it loads from `../messages/*.json`, i.e. the repo-root `messages/` dir); editing it would silently do nothing. |
| D2 | Generic spec's §4 state table: "Loaded (Pro subscriber): Pro CTA disabled 'Your current plan'; Premium: upgrade" — implies knowing the user's current tier. | **Use the already-existing `profiles.tier` column** (`types/database.ts`, `UserTier = 'free' \| 'pro' \| 'premium'`, set by `0001_init.sql`, defaults `'free'`) as the current-tier source of truth. `page.tsx` reads it once via `createServerClient()` alongside `auth.getUser()` (same call site pattern as `favorites/page.tsx`) and passes `currentTier: PlanTier \| null` down as a prop — no new column, no client-side auth call. | This column already exists and is exactly the "tier-sync source of truth" the generic spec's §5 Data Fields section names (`agents.subscription_tier` in the generic doc = `profiles.tier` here). Free to use, zero migration cost. |
| D3 | Generic spec: header currency switcher re-converts prices via live FX (`GET /api/fx`); task brief: "currency display... no live currency conversion API call required." | `plans.prices` is a JSONB map with **one real price already stored per currency** (`AMD`/`USD`/`EUR`/`RUB`, §5.1) — not a single base price recomputed on the fly. `PlanComparison` (client) reads the existing global `useCurrencyStore().currency` (already mounted in `Header.tsx`, no new UI control on this page) and does a plain object lookup: `plan.prices[currency] ?? plan.prices.AMD`. This satisfies "client component that only affects rendering of already-fetched prices" literally — there is no conversion math anywhere, ever, live or otherwise. | Matches `store/currencyStore.ts`'s documented behavior ("UI-only... no live exchange-rate conversion") and `docs/design/13-mortgage-calc-handoff.md` D2's identical precedent. Reusing the header's existing currency switcher (rather than building a second one on this page) avoids a duplicate, possibly-inconsistent control. |
| D4 | Generic spec's CTA matrix (§3.3): Free → direct register/`/dashboard` (no checkout call), Pro/Premium → checkout, lower-tier → "Downgrade" (no call). | **Every** tier's CTA follows the *same* two-branch rule the task brief states literally: logged-out → `/login?next=/pro`; logged-in → `POST /api/plans/checkout`, *except* when `plan.tier === currentTier`, which renders a disabled "Your current plan" button and never calls anything. Free tier is **not** special-cased into a direct-register shortcut. | The task's acceptance criteria states the CTA rule once, with no per-tier carve-out, and the checkout route is a stub anyway (`not_implemented` for every tier) — adding a Free-specific bypass is an extra code path for a distinction that has no observable effect in this MVP (nothing actually completes checkout for any tier). Keep the one rule, uniformly applied. |
| D5 | Generic spec assumes the page is reachable from primary nav / footer. | **Footer only**: add one link (`Pricing` → `/pro`) to the existing `Company` column in `components/layout/Footer.tsx` (plain hardcoded-English label — the footer isn't translated anywhere today, so this matches, not deviates from, existing convention; contrast with D1 which is about the *page's own* content). **Do not touch `Header.tsx`** — its `NAV_ITEMS`/`NavKey` union and mega-menu structure is a bigger, riskier surface for a 1-page addition and isn't required by the acceptance criteria; the page is still fully reachable via the footer link and direct URL. | Mirrors `docs/design/13-mortgage-calc-handoff.md` D1's reachability fix, scaled down to the lower-risk option since — unlike that case — nothing already links to `/pro` with a wrong path that needs correcting. |
| D6 | Generic spec's §3.3 comparison table has 10 feature rows across three tiers, including enum-valued rows (`analytics: basic/extended/full`, `ranking: —/medium/high`, `support: —/email/email+phone`) and null-valued "unlimited" (`listings: null` for Premium). | Model this as a typed `PlanFeatures` interface (§5.1) with a small **pure, unit-testable** mapping function `formatFeatureValue(key, plan)` (`lib/plans/featureRows.ts`) that returns a `{ kind: 'check' \| 'dash' \| 'number' \| 'text', text?, value? }` shape — the table/card components are thin renderers of that, no formatting logic inline in JSX. | Keeps the only logic worth asserting in a test (`__tests__` has no DOM/RTL, §9) out of untestable client-component render code, mirroring `docs/design/25-compare-handoff.md` §7's `deriveCompareState`/`isUnavailable` pattern. |

---

## 2. Component inventory

```
app/[locale]/pro/
  page.tsx                          (NEW — Server Component: generateMetadata
                                      (title/description/canonical/hreflang, §8),
                                      reads user + profiles.tier + plans directly
                                      via createServerClient() (§5.2), falls back
                                      to DEFAULT_PLANS (§5.3) if unconfigured/error,
                                      renders static hero (translated, server-
                                      rendered, no client JS) + <PlanComparison/>
                                      + <PricingFaq/>)

components/pro/
  PlanComparison.tsx                 (NEW — 'use client': owns billingCycle state
                                       ('monthly'|'annual'), subscribes to
                                       useCurrencyStore(); renders
                                       <BillingCycleToggle/> + desktop <table>
                                       (≥768px) / mobile stacked <PlanCard/>s
                                       (<768px, same component tree, CSS-only
                                       breakpoint switch — see §3); mounts one
                                       <PlanCtaButton/> per tier column)
  BillingCycleToggle.tsx             (NEW — 'use client': controlled segmented
                                       switch, role="switch" aria-checked, §7)
  PlanCtaButton.tsx                  (NEW — 'use client': per-plan CTA; owns the
                                       POST /api/plans/checkout fetch + inline
                                       not_implemented/error message state, §3.3)
  PricingFaq.tsx                     (NEW — 'use client': accordion, 4 static
                                       translated Q&A items, §6)

lib/plans/
  types.ts                           (NEW — PlanTier, BillingCycle, PlanCurrency,
                                       PlanFeatures, Plan, CheckoutInput,
                                       CheckoutResponse, §5.1)
  schemas.ts                         (NEW — checkoutSchema (zod), §5.1)
  defaultPlans.ts                    (NEW — DEFAULT_PLANS: Plan[], typed fallback
                                       config, mirrors the migration seed data
                                       verbatim, §5.3)
  mapPlanRow.ts                      (NEW — mapPlanRow(row): Plan, DB row →
                                       camelCase mapper, §5.2)
  featureRows.ts                     (NEW — FEATURE_ROW_KEYS (ordered tuple) +
                                       formatFeatureValue(key, plan) — pure,
                                       unit-testable, §1 D6 / §9)

app/api/plans/checkout/
  route.ts                           (NEW — POST handler: zod body validation +
                                       Supabase session check + stub response,
                                       §5.4)

components/layout/
  Footer.tsx                         (EDIT — 1-line addition to the `Company`
                                       column's `links` array, §1 D5)

messages/
  en.json, hy.json, ru.json          (EDIT — add "pro" namespace, §6)

supabase/migrations/
  0009_plans.sql                     (NEW — table + RLS + seed INSERT, §5.1)
```

Reuse, don't fork: `createServerClient()` (`@/lib/supabase/server`), the
`auth.getUser()` + typed-error-response pattern from `app/api/favorites/route.ts`,
the breadcrumb markup from `app/[locale]/favorites/page.tsx:58-84`, the
`CURRENCY_SYMBOL` map convention from `components/property/PropertyMainInfo.tsx`
(copy the same 4 entries locally into `components/pro/PlanComparison.tsx` — this
repo duplicates that map per-file rather than sharing it; follow the existing
convention rather than introducing a new shared util in this task), `cn()`
(`lib/utils.ts`), `useCurrencyStore` (`store/currencyStore.ts`, read-only here),
`safeNext` (`lib/auth/safeNext.ts` — already handles `/pro` correctly, **no
edit needed**), and the `<details>/<summary>` disclosure pattern already used
for the mobile footer accordion (`Footer.tsx:99-133`) as a reference for
`PricingFaq`'s expand/collapse semantics (though `PricingFaq` needs
`aria-expanded`/`aria-controls` on explicit buttons per §7, not native
`<details>`, since the doc requires keyboard Enter/Space toggling of individual
items with animated chevrons — native `<details>` is an acceptable simpler
alternative if it's faster to ship correctly; either satisfies the
acceptance criteria).

---

## 3. Wireframes

### 3.1 Desktop (≥768px) — comparison table

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                           │
├────────────────────────────────────────────────────────────────┤
│                     Sell faster with Pro tools                  │
│         More listings, statistics, featured placement,          │
│                    and a Pro badge.                              │
├────────────────────────────────────────────────────────────────┤
│              [ Monthly ]  [ Annual –20% ]   (toggle, centered)  │
├──────────────┬──────────────────┬──────────────────────────────┤
│ FREE         │ PRO              │ PREMIUM  ★ Most popular       │
│ 0 ֏          │ 9,900 ֏ /mo      │ 24,900 ֏ /mo                  │
│ [Start free] │ [Choose Pro]     │ [Choose Premium]               │
├──────────────┼──────────────────┼──────────────────────────────┤
│ Active listings          3      │        25         │ Unlimited │
│ Featured listings        —      │        2/mo        │  10/mo   │
│ Analytics              Basic    │     Extended        │   Full + export │
│ Pro badge                —      │        ✓            │    ✓     │
│ Ranking priority          —      │      Medium          │   High   │
│ Lead inbox                —      │        ✓             │  ✓ priority │
│ Bulk upload                —      │        —             │    ✓     │
│ Team members                —      │        1             │    10    │
│ Priority support            —      │      Email             │ Email + phone │
│ Placement guarantee          —      │        —             │    ✓     │
├────────────────────────────────────────────────────────────────┤
│                 Frequently asked questions                      │
│  ▸ When am I charged?                                           │
│  ▸ Can I cancel anytime?                                        │
│  ▸ What happens to my listings after a downgrade?                │
│  ▸ Is there a refund?                                            │
├────────────────────────────────────────────────────────────────┤
│ FOOTER                                                           │
└────────────────────────────────────────────────────────────────┘
```

The Premium column is visually highlighted: `ring-2 ring-primary shadow-lg` +
a small "★ Most popular" pill anchored above the column header (`absolute
-top-3`).

### 3.2 Mobile (<768px) — stacked cards

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ Sell faster with Pro tools│
│ subtitle                  │
├──────────────────────────┤
│ [Monthly][Annual –20%]    │
├──────────────────────────┤
│ ┌────────────────────────┐│
│ │ FREE          0 ֏      ││
│ │ ✓ 3 active listings    ││
│ │ ✓ Basic analytics      ││
│ │ [Start for free]       ││
│ └────────────────────────┘│
│ ┌────────────────────────┐│
│ │ PRO      9,900 ֏/mo    ││
│ │ ✓ 25 active listings   ││
│ │ ✓ 2 featured/mo        ││
│ │ ✓ Extended analytics   ││
│ │ ✓ Pro badge            ││
│ │ ...                    ││
│ │ [Choose Pro]           ││
│ └────────────────────────┘│
│ ┌────────────────────────┐│
│ │ ★ Most popular          ││
│ │ PREMIUM  24,900 ֏/mo   ││
│ │ ✓ Unlimited listings   ││
│ │ ...                    ││
│ │ [Choose Premium]        ││
│ └────────────────────────┘│
├──────────────────────────┤
│ FAQ (accordion)           │
├──────────────────────────┤
│ FOOTER                    │
└──────────────────────────┘
```

Each mobile card lists only the features that tier *has* (a short bullet
list, not all 10 rows with dashes — the full 10-row grid is desktop-only,
inside `<table>`; mobile renders a `<ul>` per plan built from the same
`formatFeatureValue` helper, filtering out `kind === 'dash'` rows). This is a
**single component tree** (`PlanComparison`), not two — the desktop `<table>`
is `hidden md:table` / the mobile card stack is `md:hidden`, both driven by
the same `plans`/`billingCycle`/`currency` state, so there is no risk of the
two views drifting out of sync.

### 3.3 CTA states (all three tiers, same component)

```
Guest:              [ Choose Pro ]                 → <Link href="/login?next=/pro">
Logged in, other:   [ Choose Pro ]  → click →  (loading…) → "Checkout isn't
                                                  available yet — we'll email
                                                  you when it's ready."
Logged in, current: [ Your current plan ]  (disabled, aria-disabled="true")
```

`PlanCtaButton` never navigates anywhere on the logged-in path — it's a plain
`<button>` that calls `POST /api/plans/checkout` and swaps in an inline
`role="status"` message below itself on response (`not_implemented` → info
copy; network/5xx → `cta.error` copy, matches `favoritesRoute.test.ts`-style
try/catch). No toast system is introduced for this.

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| Hero H1 | `text-3xl sm:text-4xl font-bold text-gray-900 text-center` |
| Hero subtitle | `text-base sm:text-lg text-gray-500 text-center max-w-2xl mx-auto mt-2` |
| Toggle wrapper | `inline-flex items-center rounded-lg border border-gray-200 p-1 bg-gray-50` |
| Toggle option (inactive) | `px-4 py-2 text-sm font-medium text-gray-600 rounded-md` |
| Toggle option (active) | `px-4 py-2 text-sm font-medium bg-primary text-white rounded-md shadow-sm` |
| Annual discount badge | `ml-1.5 bg-green-100 text-green-700 text-xs font-medium px-1.5 py-0.5 rounded` |
| Tier card / column | `bg-white border border-gray-200 rounded-2xl p-6` |
| Tier card (Premium) | add `ring-2 ring-primary shadow-lg relative` |
| "Most popular" pill | `absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full` |
| Tier name | `text-lg font-semibold text-gray-900` |
| Tier price | `text-3xl font-bold text-gray-900` + trailing `text-base font-normal text-gray-500` (`/mo`) |
| Annual sub-label | `text-xs text-gray-500 mt-0.5` (e.g. "95,040 ֏ per year") |
| Comparison table | `w-full border-collapse hidden md:table` |
| Table header row | `sticky top-16 z-10 bg-white` |
| Feature label cell (`th scope="row"`) | `text-sm text-gray-600 text-left p-3 border-b border-gray-100` |
| Feature value cell | `text-sm text-center p-3 border-b border-gray-100` |
| Row hover | `hover:bg-gray-50` |
| Check icon | `text-green-600 w-5 h-5 inline` (lucide `Check`, `aria-label="Included"`) |
| Dash (not included) | literal `—`, `text-gray-300`, `aria-label="Not included"` |
| Primary CTA (button/link) | `w-full h-11 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center` |
| Disabled "current plan" CTA | `w-full h-11 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed flex items-center justify-center` |
| Inline stub-response message | `text-xs text-gray-500 mt-2 text-center` |
| Mobile plan card | `bg-white border border-gray-200 rounded-2xl p-5 space-y-3` |
| FAQ item wrapper | `border-b border-gray-200 py-4` |
| FAQ question button | `w-full flex items-center justify-between text-left text-sm font-medium text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded` |
| FAQ chevron | `w-4 h-4 text-gray-400 transition-transform duration-200` + `rotate-180` when open |
| FAQ answer | `text-sm text-gray-600 mt-2` |

---

## 5. Data & API

### 5.1 Migration — `supabase/migrations/0009_plans.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0009_plans.sql
-- Page 17 — Pricing (/pro). Adds the `plans` table: public read-only reference
-- data for the tier comparison table. No write API ships in this task — Page 24
-- (admin plan management) is the only intended writer, using the service-role
-- client (lib/supabase/admin.ts), which bypasses RLS entirely. Seeded here (not
-- in supabase/seed.sql) because this is reference/config data needed in every
-- environment (staging/prod included), not local-dev-only demo data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plans (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tier        TEXT        NOT NULL UNIQUE CHECK (tier IN ('free', 'pro', 'premium')),
  is_popular  BOOLEAN     NOT NULL DEFAULT false,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  -- { "AMD": {"monthly":9900,"annual":95040}, "USD": {...}, "EUR": {...}, "RUB": {...} }
  -- One static price per currency (no live FX) — see docs/design/17-pricing-handoff.md D3.
  prices      JSONB       NOT NULL DEFAULT '{}',
  -- Shape mirrors lib/plans/types.ts PlanFeatures — see that file for field docs.
  features    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plans_sort_order_idx ON plans (sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — public SELECT only. No INSERT/UPDATE/DELETE policy is created, so RLS
-- default-denies all writes for the anon/authenticated roles; only the
-- service-role key (which bypasses RLS) can write. That's "write restricted to
-- service role/admin" without needing a role-check policy.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans: public can select"
  ON plans
  FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data — matches lib/plans/defaultPlans.ts (the Supabase-unconfigured
-- fallback) exactly. Keep both in sync if prices/features change.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO plans (tier, is_popular, sort_order, prices, features)
VALUES
  (
    'free', false, 0,
    '{"AMD":{"monthly":0,"annual":0},"USD":{"monthly":0,"annual":0},"EUR":{"monthly":0,"annual":0},"RUB":{"monthly":0,"annual":0}}',
    '{"listings":3,"featuredPerMonth":0,"analytics":"basic","proBadge":false,"rankingPriority":"none","leadInbox":"none","bulkUpload":false,"teamSeats":0,"support":"community","placementGuarantee":false}'
  ),
  (
    'pro', false, 1,
    '{"AMD":{"monthly":9900,"annual":95040},"USD":{"monthly":25,"annual":240},"EUR":{"monthly":23,"annual":221},"RUB":{"monthly":2400,"annual":23040}}',
    '{"listings":25,"featuredPerMonth":2,"analytics":"extended","proBadge":true,"rankingPriority":"medium","leadInbox":"standard","bulkUpload":false,"teamSeats":1,"support":"email","placementGuarantee":false}'
  ),
  (
    'premium', true, 2,
    '{"AMD":{"monthly":24900,"annual":239040},"USD":{"monthly":65,"annual":624},"EUR":{"monthly":60,"annual":576},"RUB":{"monthly":6100,"annual":58560}}',
    '{"listings":null,"featuredPerMonth":10,"analytics":"full","proBadge":true,"rankingPriority":"high","leadInbox":"priority","bulkUpload":true,"teamSeats":10,"support":"email_phone","placementGuarantee":true}'
  )
ON CONFLICT (tier) DO NOTHING;
```

Add a matching entry to `types/database.ts`'s `Database['public']['Tables']`
(`plans: { Row, Insert, Update }`) following the existing `profiles`/`saved_searches`
shape — `Row.prices` and `Row.features` typed as `Json` (the existing recursive
type), narrowed to `PlanPrices`/`PlanFeatures` by `mapPlanRow.ts` at the
boundary (don't loosen `Json` to `any` — cast through the specific interfaces
instead, matching `types/database.ts`'s documented "no `any`" rule).

### 5.2 `lib/plans/types.ts` + `mapPlanRow.ts`

```ts
// lib/plans/types.ts
export type PlanTier = 'free' | 'pro' | 'premium'
export type BillingCycle = 'monthly' | 'annual'
export type PlanCurrency = 'AMD' | 'USD' | 'EUR' | 'RUB'

export interface PlanCyclePrice {
  monthly: number
  annual: number
}

export type PlanPrices = Record<PlanCurrency, PlanCyclePrice>

export interface PlanFeatures {
  /** null = unlimited (Premium). */
  listings: number | null
  featuredPerMonth: number
  analytics: 'basic' | 'extended' | 'full'
  proBadge: boolean
  rankingPriority: 'none' | 'medium' | 'high'
  leadInbox: 'none' | 'standard' | 'priority'
  bulkUpload: boolean
  teamSeats: number
  support: 'community' | 'email' | 'email_phone'
  placementGuarantee: boolean
}

export interface Plan {
  tier: PlanTier
  isPopular: boolean
  prices: PlanPrices
  features: PlanFeatures
}

export interface CheckoutInput {
  tier: PlanTier
  cycle: BillingCycle
}

export interface CheckoutResponse {
  status: 'not_implemented'
  tier: PlanTier
  cycle: BillingCycle
}
```

```ts
// lib/plans/mapPlanRow.ts
import type { Plan, PlanFeatures, PlanPrices } from './types'

interface PlanRow {
  tier: string
  is_popular: boolean
  prices: unknown
  features: unknown
}

/** DB row (snake_case, loosely-typed JSONB) → Plan (camelCase, fully typed). */
export function mapPlanRow(row: PlanRow): Plan {
  return {
    tier: row.tier as Plan['tier'],
    isPopular: row.is_popular,
    prices: row.prices as PlanPrices,
    features: row.features as PlanFeatures,
  }
}
```

`page.tsx` fetches with `.order('sort_order', { ascending: true })` so `plans`
arrives Free → Pro → Premium without a client-side sort.

### 5.3 `lib/plans/defaultPlans.ts` (fallback config)

Typed fallback used only when Supabase isn't configured (same
`supabaseUrl.includes('your-project-id')` guard as `app/[locale]/search/page.tsx:55`)
or the query errors. Values are a **literal TypeScript transcription** of the
migration's seed `INSERT` above — keep both in sync.

```ts
// lib/plans/defaultPlans.ts
import type { Plan } from './types'

export const DEFAULT_PLANS: Plan[] = [
  {
    tier: 'free',
    isPopular: false,
    prices: {
      AMD: { monthly: 0, annual: 0 },
      USD: { monthly: 0, annual: 0 },
      EUR: { monthly: 0, annual: 0 },
      RUB: { monthly: 0, annual: 0 },
    },
    features: {
      listings: 3, featuredPerMonth: 0, analytics: 'basic', proBadge: false,
      rankingPriority: 'none', leadInbox: 'none', bulkUpload: false,
      teamSeats: 0, support: 'community', placementGuarantee: false,
    },
  },
  {
    tier: 'pro',
    isPopular: false,
    prices: {
      AMD: { monthly: 9900, annual: 95040 },
      USD: { monthly: 25, annual: 240 },
      EUR: { monthly: 23, annual: 221 },
      RUB: { monthly: 2400, annual: 23040 },
    },
    features: {
      listings: 25, featuredPerMonth: 2, analytics: 'extended', proBadge: true,
      rankingPriority: 'medium', leadInbox: 'standard', bulkUpload: false,
      teamSeats: 1, support: 'email', placementGuarantee: false,
    },
  },
  {
    tier: 'premium',
    isPopular: true,
    prices: {
      AMD: { monthly: 24900, annual: 239040 },
      USD: { monthly: 65, annual: 624 },
      EUR: { monthly: 60, annual: 576 },
      RUB: { monthly: 6100, annual: 58560 },
    },
    features: {
      listings: null, featuredPerMonth: 10, analytics: 'full', proBadge: true,
      rankingPriority: 'high', leadInbox: 'priority', bulkUpload: true,
      teamSeats: 10, support: 'email_phone', placementGuarantee: true,
    },
  },
]
```

`page.tsx` fetch sketch:

```ts
// app/[locale]/pro/page.tsx (sketch)
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()

let currentTier: PlanTier | null = null
if (user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .maybeSingle()
  currentTier = (profile?.tier as PlanTier | undefined) ?? 'free'
}

let plans: Plan[] = DEFAULT_PLANS
const { data: rows, error } = await supabase
  .from('plans')
  .select('tier, is_popular, prices, features')
  .order('sort_order', { ascending: true })
if (!error && rows && rows.length > 0) {
  plans = rows.map(mapPlanRow)
}
```

### 5.4 `POST /api/plans/checkout`

```ts
// lib/plans/schemas.ts
import { z } from 'zod'

export const checkoutSchema = z.object({
  tier: z.enum(['free', 'pro', 'premium']),
  cycle: z.enum(['monthly', 'annual']),
})
```

```ts
// app/api/plans/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { checkoutSchema } from '@/lib/plans/schemas'
import type { CheckoutResponse } from '@/lib/plans/types'

/**
 * POST /api/plans/checkout
 *
 * Stub checkout endpoint — Page 17 MVP does not integrate Stripe. Validates
 * the body and the caller's session, then returns a typed placeholder so the
 * client CTA has something real to branch on once Stripe ships (Phase 2).
 * Body: { tier: 'free'|'pro'|'premium', cycle: 'monthly'|'annual' }
 * 200 { status: 'not_implemented', tier, cycle } · 401 auth_required ·
 * 400 invalid_json · 422 validation_error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof checkoutSchema.parse>
  try {
    input = checkoutSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 })
    }

    const response: CheckoutResponse = {
      status: 'not_implemented',
      tier: input.tier,
      cycle: input.cycle,
    }
    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
```

This mirrors `app/api/favorites/route.ts` exactly: JSON-parse guard → zod
guard → session guard → typed success response, same status-code choices
(400/422/401/500).

### 5.5 Feature-row rendering (`lib/plans/featureRows.ts`)

Pure helper — the table/card components call this, they don't format values
inline:

```ts
export const FEATURE_ROW_KEYS = [
  'listings', 'featuredPerMonth', 'analytics', 'proBadge', 'rankingPriority',
  'leadInbox', 'bulkUpload', 'teamSeats', 'support', 'placementGuarantee',
] as const

export type FeatureRowKey = (typeof FEATURE_ROW_KEYS)[number]

export interface FeatureCell {
  kind: 'check' | 'dash' | 'number' | 'text'
  /** Present only for kind 'number' | 'text'. For 'text', this is an i18n key
   *  suffix into the `pro.featureValues` namespace (e.g. 'analyticsBasic'),
   *  not literal display copy — the component resolves it via useTranslations. */
  value?: number | string
}

export function formatFeatureValue(key: FeatureRowKey, plan: Plan): FeatureCell {
  const f = plan.features
  switch (key) {
    case 'listings':
      return f.listings === null ? { kind: 'text', value: 'unlimited' }
        : f.listings === 0 ? { kind: 'dash' } : { kind: 'number', value: f.listings }
    case 'featuredPerMonth':
      return f.featuredPerMonth === 0 ? { kind: 'dash' } : { kind: 'number', value: f.featuredPerMonth }
    case 'analytics':
      return { kind: 'text', value: `analytics_${f.analytics}` } // → 'analytics_basic' etc.
    case 'proBadge':
      return { kind: f.proBadge ? 'check' : 'dash' }
    case 'rankingPriority':
      return f.rankingPriority === 'none' ? { kind: 'dash' } : { kind: 'text', value: `ranking_${f.rankingPriority}` }
    case 'leadInbox':
      return f.leadInbox === 'none' ? { kind: 'dash' }
        : f.leadInbox === 'priority' ? { kind: 'text', value: 'leadInboxPriority' } : { kind: 'check' }
    case 'bulkUpload':
      return { kind: f.bulkUpload ? 'check' : 'dash' }
    case 'teamSeats':
      return f.teamSeats === 0 ? { kind: 'dash' } : { kind: 'number', value: f.teamSeats }
    case 'support':
      return f.support === 'community' ? { kind: 'dash' } : { kind: 'text', value: `support_${f.support}` }
    case 'placementGuarantee':
      return { kind: f.placementGuarantee ? 'check' : 'dash' }
  }
}
```

(The exact `text` value strings above are illustrative keys — wire them to the
`pro.featureValues.*` keys in §6; adjust the string literals to match
whatever key names you actually add, the important part is the `kind`
discriminant and the pure/no-JSX shape.)

---

## 6. i18n content — `messages/*.json` new `"pro"` namespace

Add this top-level key to all three files, alongside the existing `nav`/
`header`/`lang`/`currency`/`footer`/`search` keys (do not touch those).

**`messages/en.json`** (add):
```json
"pro": {
  "meta": {
    "title": "Pro plans for agents — price and features | RE Platform",
    "description": "Compare the Free, Pro, and Premium plans. More listings, analytics, and featured placement for agents."
  },
  "hero": {
    "h1": "Sell faster with Pro tools",
    "subtitle": "More listings, statistics, featured placement, and a Pro badge."
  },
  "toggle": {
    "monthly": "Monthly",
    "annual": "Annual",
    "discountBadge": "–20%",
    "annualNote": "2 months free"
  },
  "tiers": { "free": "Free", "pro": "Pro", "premium": "Premium" },
  "popularBadge": "Most popular",
  "perMonth": "/mo",
  "perYear": "{amount} per year",
  "cta": {
    "startFree": "Start for free",
    "choosePro": "Choose Pro",
    "choosePremium": "Choose Premium",
    "currentPlan": "Your current plan",
    "upgradeTo": "Upgrade to {tier}",
    "downgrade": "Downgrade",
    "notImplemented": "Checkout isn't available yet — we'll email you when it's ready.",
    "error": "Something went wrong. Please try again."
  },
  "features": {
    "listings": "Active listings",
    "featured": "Featured / promoted listings",
    "analytics": "Analytics",
    "badge": "Pro badge on profile",
    "ranking": "Find-an-Agent ranking priority",
    "leadInbox": "Lead inbox",
    "bulkUpload": "Bulk upload (CSV)",
    "teamSeats": "Team members",
    "support": "Priority support",
    "placementGuarantee": "Placement guarantee"
  },
  "featureValues": {
    "analytics_basic": "Basic",
    "analytics_extended": "Extended",
    "analytics_full": "Full + export",
    "ranking_medium": "Medium",
    "ranking_high": "High",
    "leadInboxPriority": "Priority",
    "support_email": "Email",
    "support_email_phone": "Email + phone",
    "unlimited": "Unlimited"
  },
  "included": "Included",
  "notIncluded": "Not included",
  "faq": {
    "title": "Frequently asked questions",
    "q1": "When am I charged?",
    "a1": "You're charged immediately when you choose a paid plan, then automatically on the same date every billing cycle (monthly or annually) until you cancel.",
    "q2": "Can I cancel anytime?",
    "a2": "Yes. You can cancel anytime from your billing settings; your plan stays active until the end of the current billing period.",
    "q3": "What happens to my listings after a downgrade?",
    "a3": "Listings above your new plan's limit are archived, not deleted — you can restore them if you upgrade again.",
    "q4": "Is there a refund?",
    "a4": "We offer a full refund within 14 days of your first payment if you're not satisfied — contact support."
  }
}
```

**`messages/hy.json`** (add):
```json
"pro": {
  "meta": {
    "title": "Pro փաթեթներ գործակալների համար — գին և հնարավորություններ | RE Platform",
    "description": "Համեմատեք Անվճար, Pro և Պրեմիում փաթեթները: Ավելի շատ հայտարարություններ, վիճակագրություն և առաջատար տեղադրում գործակալների համար:"
  },
  "hero": {
    "h1": "Վաճառեք ավելի արագ Pro գործիքներով",
    "subtitle": "Ավելի շատ հայտարարություններ, վիճակագրություն, առաջատար տեղադրում և Pro կրծքանշան:"
  },
  "toggle": {
    "monthly": "Ամսական",
    "annual": "Տարեկան",
    "discountBadge": "–20%",
    "annualNote": "2 ամիս անվճար"
  },
  "tiers": { "free": "Անվճար", "pro": "Pro", "premium": "Պրեմիում" },
  "popularBadge": "Ամենահայտնի",
  "perMonth": "/ամիս",
  "perYear": "{amount} տարեկան",
  "cta": {
    "startFree": "Սկսել անվճար",
    "choosePro": "Ընտրել Pro",
    "choosePremium": "Ընտրել Պրեմիում",
    "currentPlan": "Ձեր ընթացիկ փաթեթը",
    "upgradeTo": "Փոխանցվել {tier}-ին",
    "downgrade": "Իջեցնել փաթեթը",
    "notImplemented": "Վճարումը դեռ հասանելի չէ, կտեղեկացնենք էլ. փոստով, երբ պատրաստ լինի:",
    "error": "Ինչ-որ բան այն չէր: Փորձեք կրկին:"
  },
  "features": {
    "listings": "Ակտիվ հայտարարություններ",
    "featured": "Առաջատար հայտարարություններ",
    "analytics": "Վիճակագրություն",
    "badge": "Pro կրծքանշան պրոֆիլում",
    "ranking": "Առաջնահերթություն գործակալների որոնման մեջ",
    "leadInbox": "Հայտերի փոստարկղ",
    "bulkUpload": "Զանգվածային վերբեռնում (CSV)",
    "teamSeats": "Թիմի անդամներ",
    "support": "Առաջնահերթ աջակցություն",
    "placementGuarantee": "Տեղադրման երաշխիք"
  },
  "featureValues": {
    "analytics_basic": "Հիմնական",
    "analytics_extended": "Ընդլայնված",
    "analytics_full": "Ամբողջական + արտահանում",
    "ranking_medium": "Միջին",
    "ranking_high": "Բարձր",
    "leadInboxPriority": "Առաջնահերթ",
    "support_email": "Էլ. փոստ",
    "support_email_phone": "Էլ. փոստ + հեռախոս",
    "unlimited": "Անսահմանափակ"
  },
  "included": "Ներառված է",
  "notIncluded": "Ներառված չէ",
  "faq": {
    "title": "Հաճախակի տրվող հարցեր",
    "q1": "Երբ է գանձվում վճարումը:",
    "a1": "Վճարումը գանձվում է անմիջապես՝ վճարովի փաթեթ ընտրելուց հետո, այնուհետև ավտոմատ կերպով նույն ամսաթվին յուրաքանչյուր վճարման ցիկլում (ամսական կամ տարեկան)՝ մինչև չեղարկումը:",
    "q2": "Կարո՞ղ եմ չեղարկել ցանկացած պահի:",
    "a2": "Այո: Կարող եք չեղարկել ցանկացած պահի ձեր վճարումների կարգավորումներից. Ձեր փաթեթը կմնա ակտիվ մինչև ընթացիկ վճարման ժամանակաշրջանի ավարտը:",
    "q3": "Ի՞նչ է կատարվում իմ հայտարարությունների հետ փաթեթն իջեցնելուց հետո:",
    "a3": "Նոր փաթեթի սահմանաչափից բարձր հայտարարությունները արխիվացվում են, ոչ թե ջնջվում: Դուք կարող եք վերականգնել դրանք, եթե կրկին բարձրացնեք փաթեթը:",
    "q4": "Կա՞ վերադարձ:",
    "a4": "Մենք առաջարկում ենք ամբողջական վերադարձ առաջին վճարումից հետո 14 օրվա ընթացքում, եթե դժգոհ եք. դիմեք աջակցության ծառայությանը:"
  }
}
```

**`messages/ru.json`** (add):
```json
"pro": {
  "meta": {
    "title": "Тарифы Pro для агентов — цены и возможности | RE Platform",
    "description": "Сравните тарифы Free, Pro и Premium. Больше объявлений, аналитика и продвижение в топ для агентов."
  },
  "hero": {
    "h1": "Продавайте быстрее с инструментами Pro",
    "subtitle": "Больше объявлений, статистика, продвижение в топ и значок Pro."
  },
  "toggle": {
    "monthly": "Ежемесячно",
    "annual": "Ежегодно",
    "discountBadge": "–20%",
    "annualNote": "2 месяца бесплатно"
  },
  "tiers": { "free": "Бесплатный", "pro": "Pro", "premium": "Премиум" },
  "popularBadge": "Популярный выбор",
  "perMonth": "/мес",
  "perYear": "{amount} в год",
  "cta": {
    "startFree": "Начать бесплатно",
    "choosePro": "Выбрать Pro",
    "choosePremium": "Выбрать Премиум",
    "currentPlan": "Ваш текущий тариф",
    "upgradeTo": "Перейти на {tier}",
    "downgrade": "Понизить тариф",
    "notImplemented": "Оплата пока недоступна — мы напишем вам на почту, когда она заработает.",
    "error": "Что-то пошло не так. Попробуйте ещё раз."
  },
  "features": {
    "listings": "Активные объявления",
    "featured": "Продвигаемые объявления",
    "analytics": "Аналитика",
    "badge": "Значок Pro в профиле",
    "ranking": "Приоритет в поиске агентов",
    "leadInbox": "Входящие заявки",
    "bulkUpload": "Массовая загрузка (CSV)",
    "teamSeats": "Участники команды",
    "support": "Приоритетная поддержка",
    "placementGuarantee": "Гарантия размещения"
  },
  "featureValues": {
    "analytics_basic": "Базовая",
    "analytics_extended": "Расширенная",
    "analytics_full": "Полная + экспорт",
    "ranking_medium": "Средний",
    "ranking_high": "Высокий",
    "leadInboxPriority": "Приоритетные",
    "support_email": "Email",
    "support_email_phone": "Email + телефон",
    "unlimited": "Без ограничений"
  },
  "included": "Включено",
  "notIncluded": "Не включено",
  "faq": {
    "title": "Часто задаваемые вопросы",
    "q1": "Когда списывается оплата?",
    "a1": "Оплата списывается сразу после выбора платного тарифа, а затем автоматически в ту же дату каждого расчётного периода (ежемесячно или ежегодно) до отмены подписки.",
    "q2": "Могу ли я отменить подписку в любой момент?",
    "a2": "Да. Вы можете отменить подписку в любой момент в настройках оплаты; тариф останется активным до конца текущего расчётного периода.",
    "q3": "Что происходит с моими объявлениями при понижении тарифа?",
    "a3": "Объявления сверх лимита нового тарифа архивируются, а не удаляются — вы сможете восстановить их при повторном повышении тарифа.",
    "q4": "Предусмотрен ли возврат средств?",
    "a4": "Мы предлагаем полный возврат средств в течение 14 дней с момента первой оплаты, если вы не удовлетворены — обратитесь в поддержку."
  }
}
```

> **Note on the hy block above.** Paste the Armenian text as literal UTF-8
> characters into `messages/hy.json` (no escaping needed — `messages/hy.json`
> already stores unescaped Armenian text today, e.g. `"Գնել"`). After editing,
> verify with `node -e "console.log(JSON.parse(require('fs').readFileSync('messages/hy.json','utf8')).pro.hero.h1)"`
> to confirm it prints correct Armenian, not mojibake.

`interpolation`: `perYear`/`upgradeTo` use `{amount}`/`{tier}` — call with
`t('pro.perYear', { amount: formattedAnnualTotal })` /
`t('pro.cta.upgradeTo', { tier: t(`pro.tiers.${plan.tier}`) })` (next-intl's
ICU interpolation, same mechanism already available, just unused elsewhere so
far).

---

## 7. Accessibility

- `BillingCycleToggle`: `role="switch"` + `aria-checked={cycle === 'annual'}`,
  keyboard-toggleable (native `<button>`, no extra keydown handler needed);
  wrap the whole price block that changes on toggle in `aria-live="polite"`
  so screen readers announce the new numbers.
- Comparison `<table>`: `<th scope="col">` for the three tier headers, `<th
  scope="row">` for each feature label; check/dash icons get `aria-label`
  ("Included"/"Not included") via `pro.included`/`pro.notIncluded`, not
  relying on color alone.
- CTA buttons: descriptive translated text (never bare "Choose"), disabled
  "current plan" button uses `aria-disabled="true"` (keep it a real `<button
  disabled>` too, not just visually styled).
- `PricingFaq`: each question is a `<button aria-expanded aria-controls="faq-panel-N">`;
  answer `<div id="faq-panel-N" role="region">`; Enter/Space toggle (native
  `<button>` gives this for free); chevron rotation is decorative
  (`aria-hidden="true"`).
- Contrast ≥ 4.5:1 (all tokens in §4 reuse already-audited pairs from other
  pages in this app); touch targets ≥ 44px (`h-11` CTA buttons, FAQ button
  `py-4` padding already clears this).

---

## 8. Page shell & SEO

```ts
// app/[locale]/pro/page.tsx (metadata sketch)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = safeLocale(rawLocale)
  const t = await getTranslations({ locale, namespace: 'pro' })

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `/${locale}/pro`,
      languages: { hy: '/hy/pro', ru: '/ru/pro', en: '/en/pro' },
    },
    // No robots override — public, indexable monetization page.
  }
}
```

No JSON-LD for MVP (§0 — deferred; the generic spec's `Product`/`Offer`/`FAQPage`
structured data would need to stay perfectly in sync with prices that aren't
real Stripe prices yet, which is a worse SEO outcome than omitting it until
Stripe ships).

---

## 9. Testing notes

Mirror `__tests__/favoritesRoute.test.ts`'s conventions (`environment: 'node'`,
top-level `vi.mock('@/lib/supabase/server', ...)`, `beforeEach` resets
`mockUser`). Suggested new files — these three cover the acceptance
criteria's "at least one test covering the unauthenticated and authenticated
paths" plus the pure-logic modules that are actually assertable in this
DOM-less test setup:

- `__tests__/plansCheckoutRoute.test.ts` — `POST /api/plans/checkout`:
  unauthenticated → 401 `auth_required`; authenticated + valid body → 200
  `{ status: 'not_implemented', tier, cycle }` echoing the request; invalid
  JSON → 400; invalid `tier`/`cycle` enum value → 422 `validation_error`.
- `__tests__/plansSchemas.test.ts` — `checkoutSchema`: accepts all 3×2
  tier/cycle combinations; rejects unknown tier/cycle strings, missing
  fields, wrong types.
- `__tests__/plansFeatureRows.test.ts` — `formatFeatureValue`: `listings:
  null` → `{ kind: 'text', value: 'unlimited' }`; `listings: 0`-style zero
  counts → `{ kind: 'dash' }`; boolean fields → `check`/`dash`; enum fields
  (`analytics`, `rankingPriority`, `support`) → correct `text` key per tier,
  spot-check all three seeded tiers (Free/Pro/Premium) end-to-end against
  `DEFAULT_PLANS`.
- `__tests__/plansMapRow.test.ts` (optional, cheap) — `mapPlanRow`: snake_case
  DB row → camelCase `Plan`, round-trips `DEFAULT_PLANS[i]` when given the
  equivalent row shape.

Component-level rendering assertions are not this repo's pattern (no
`@testing-library/react`/jsdom wired into `vitest.config.ts`, confirmed
already true for every prior page) — don't add that tooling for this task;
keep the logic under test in `lib/plans/`.

---

## 10. Explicitly out of scope — flag in review if present

Per §0: `/advertise`, real Stripe Checkout / `checkout.stripe.com` redirect,
`POST /api/billing/portal`, `POST /api/webhooks/stripe`, Enterprise/Agency
contact form, feature-highlight icon cards, testimonials, final CTA block,
`GET /api/plans` as a standalone route, `Product`/`Offer`/`FAQPage` JSON-LD,
analytics event wiring, any admin UI for editing `plans` rows (Page 24). If
any of these show up in the diff, it's scope creep against this task.
