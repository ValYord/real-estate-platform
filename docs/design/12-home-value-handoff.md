# Page 12 — Home Value Tool: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/12-home-value.md`](../en/pages/12-home-value.md) (deep spec —
full ML-comps model in Phase 3+, comps grid, price-trend chart, claimed-home
dashboard with value alerts, FAQ JSON-LD). This document does **not** repeat
that spec in full; it exists to pin down the **MVP scope** for the current
task and to close several real gaps between the generic spec / task brief and
*this specific codebase* (see §1 — two of these are load-bearing: there is no
address-geocoding provider anywhere in this repo, and `/agents` is a
pre-existing dead link).

Audited against the current tree: `components/home/HeroSearch.tsx` (already
routes its "Estimate" tab to `/home-value?address=...` and its "Sell" tab to
`/sell/new` — the entry points this task must satisfy), `components/layout/
Header.tsx:42` and `Footer.tsx:21` (already link to `/home-value`, so the
route path is fixed), `components/wizard/steps/Step2Location.tsx` (the
country/city-datalist/district/address free-text field group — see D1, this
is what "address input" reuses since there is no geocoding autocomplete to
reuse), `components/search/FilterBar.tsx`'s `CityInput` (debounced text
input + `MapPin` icon styling, `lucide-react`), `lib/listings/schemas.ts`
`step3Schema`/`condition` enum (`new`/`renovated`/`good`/`needs_renovation` —
reused verbatim, see D4), `supabase/migrations/0001_init.sql` (`properties`
table shape: no `condition` column, `currency` per-row, not global — see D6),
`supabase/migrations/0002_rls_policies.sql` (`properties: active listings are
public` — `sold`/`archived` rows are **not** publicly readable, only via
owner or service role — see D3), `supabase/migrations/0007_saved_searches.sql`
(the "verified token / service-role client, not a permissive RLS policy" read
pattern for the unsubscribe route — the precedent this page's hash-snapshot
read follows, see D7), `app/api/agent-leads/route.ts` and `lib/auth/
rateLimit.ts` (rate-limit-a-public-write-endpoint precedent, see D8),
`app/api/properties/[id]/similar/route.ts` (admin-client aggregate query +
mock-data fallback when Supabase env vars are absent, pattern to mirror in
the estimate route), `components/search/SignInPromptModal.tsx` +
`lib/auth/safeNext.ts` (the modal-not-hard-redirect guest-gate pattern this
page's Claim/Save/Alerts CTAs reuse, see D9), `lib/auth/protectedPaths.ts`
(`/home-value` must **not** be added — anonymous use is core to the page),
`app/[locale]/sell/new/page.tsx` (`/sell/new` takes only an optional `draft`
query param — no address/area/type prefill wiring exists, see D2),
`docs/design/13-mortgage-calc-handoff.md` (`?price=`/currency precedent,
D2/D6 there — reused for D6/D10 here), `vitest.config.ts` (`environment:
'node'`, `__tests__/*.test.ts`, no DOM/RTL), `types/database.ts` (hand-
authored, mirrors migrations — regenerate manually, not via a live `supabase
gen types` run in this sandbox).

---

## 0. MVP scope for this task (read before building)

Build exactly the "In scope" list. Everything else in the generic page spec —
the comps grid (§3.4), the price-trend chart (§3.5), the factors list UI
(§3.6, though the *pure function* still computes coefficients internally —
see §6), the claimed-home dashboard / value-history chart / update-details
flow (§3.7's second half), the FAQ accordion + `FAQPage` JSON-LD (§3.9), live
FX currency conversion, and real geocoding autocomplete — is **explicitly
deferred**. Do not build it, do not stub it with a disabled tab. Keep the
diff minimal per `CLAUDE.md`.

**In scope:**
- `/[locale]/home-value` — client-driven three-phase state machine (Input →
  Details → Result), SSR shell around it for SEO (H1, subtitle, disclaimer,
  metadata).
- `/[locale]/home-value/[estimateHash]` — SSR read-only snapshot of a
  previously computed estimate.
- Address input via structured free-text fields (country/city/district/
  street — Step2Location's pattern, D1), **not** a suggestions dropdown.
- Details form (property type, area m², rooms, floor/floors total, year
  built, condition) shown only when no matching `properties` row is found —
  rhf + zod, validated again server-side on submit.
- `POST /api/home-value/estimate` — computes the estimate via the pure
  heuristic function (§6), persists a `home_value_estimates` row, returns
  `{ hash, estimate, low, high, ... }`.
- The heuristic itself: `computeHomeValueEstimate()` in
  `lib/home-value/estimate.ts` — pure, currency-agnostic, unit-tested (§6,
  §12).
- New migration `supabase/migrations/0010_home_value_estimates.sql`, RLS
  enabled (§7).
- Result card: large number + range bar + confidence badge + price/m² vs
  median + disclaimer.
- CTA card: **Claim my home** / **Save estimate** / **Get value alerts**
  (guest → login modal with `?next=`, logged-in → "Coming soon" stub, D9) ·
  **Sell this property** → `/sell/new` (no query params, D2) · **Find an
  agent** → `/agents?district=...` (pre-existing dead link, built anyway per
  existing `Header.tsx` precedent, D5).
- Disclaimer text present in Input, Details, and Result phases (and the
  snapshot route).
- `noindex` on the snapshot route, indexable on `/home-value` itself.

**Explicitly out of scope (do not build):** comps grid + `/api/home-value/
comps`, price-trend chart + `/api/home-value/trend`, Recharts (not a
dependency — do not add it), `claimed_homes` table, `POST /api/claimed-
homes`, the "My homes" dashboard tab, value-alert delivery (Page 08's
saved-searches cron/email pipeline is untouched), FAQ accordion + JSON-LD,
real geocoding/address-suggestion API integration, live FX conversion,
outlier σ-clamping (needs a real dataset to be meaningful — §6 leaves a hook
for it), area landing pages (`/home-value/yerevan/arabkir`).

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task-brief tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Task brief: "reuse existing geocoding/Mapbox helper already used on `/search`; do not add a new provider." Generic spec: single field, debounced `GET /api/geo/autocomplete`, structured suggestion dropdown. | **There is no geocoding/autocomplete helper anywhere in this repo.** `mapbox-gl` is used only for map-tile *rendering* (`DraggablePinMap.tsx`, `MapComponent.tsx`), never for address search; `/search`'s `CityInput` (`FilterBar.tsx`) is a plain debounced free-text filter with zero suggestions. Since the task explicitly forbids adding a new provider, the address input is **structured free-text fields** mirroring `Step2Location.tsx` exactly: Country (fixed `AM` for MVP, no selector), City (`<input list="am-cities">` + the same `ARMENIAN_CITIES` datalist), District (free text), Street address (free text) — same `h-11 border-gray-300 rounded-lg` styling, same `MapPin` icon treatment as `CityInput`. No `?lat=&lng=` in the URL (no geocoder to produce coordinates). | Honors "do not add a new provider" literally — the only way to do that when no provider exists is to not require geocoding at all. Reusing `Step2Location`'s exact field set means zero new UI patterns and zero new a11y surface to review. |
| D2 | Generic spec: "Sell this property" → `/sell/new?addr=&area=&type=` (prefilled). Task brief: "link to `/sell/new` (already exists) — no new logic there." | Link to **`/sell/new`** with **no query params**. Do not touch `ListingWizard`/`SellNewPage` to accept prefill — `SellNewPageProps` only reads `draft`. | The task brief is explicit that this CTA needs no new logic; `/sell/new` is already `PROTECTED_PATHS`-gated by middleware, so a guest clicking it is redirected to `/auth/login?next=/sell/new` automatically — no custom guest-gate needed for this one CTA (unlike Claim/Save/Alerts, D9). Wiring real prefill would mean editing the wizard, which the acceptance criteria explicitly forbids ("does not modify Page 04 wizard"). |
| D3 | Generic spec's comps source (`status=sold|archived`) and price-trend data both read `properties` rows that **are not covered by the existing public RLS policy** (`properties: active listings are public` only covers `status = 'active'`; `sold`/`archived` rows are owner-only). Building comps/trend UI would require either a new public RLS policy on `properties` or a new API surface. | **Comps grid and trend chart are out of scope for this MVP** (§0). The district-median heuristic input (§6) is computed server-side via the **admin/service-role client** (same pattern as `similar/route.ts`), which legitimately reads `active` + `sold` rows without needing a new RLS policy, because the aggregate (a single median number) is all that's ever exposed to the client — no row-level comp data leaves the server. | Keeps `properties` RLS completely untouched (lower risk than adding a new public policy) while still letting the heuristic use sold-comps data the way the doc intends. Matches the task's explicit "no comps grid" MVP framing. |
| D4 | Generic spec's Details-form `condition` enum: New construction / Renovated / Good / Needs renovation (no canonical value names given). | Reuse **`lib/listings/schemas.ts`'s `condition` enum verbatim**: `'new' \| 'renovated' \| 'good' \| 'needs_renovation'`. Same for `propertyType`, narrowed to the doc's 4 values: `'apartment' \| 'house' \| 'land' \| 'commercial'` (a subset of the wizard's 6-value enum — no `newdev`/`garage`, matching `docs/en/pages/12-home-value.md` §3.2 exactly). | One canonical `condition` vocabulary across the codebase instead of a second parallel enum; `garage`/`newdev` aren't in the page spec's own field list so there's no reason to widen it here. |
| D5 | Task brief: "`/agents` already exists." Reality: only `app/[locale]/agent/[slug]/page.tsx` exists; there is no `/agents` index/listing page anywhere in the tree — it is currently a dead link (`Header.tsx:69`, `agent/[slug]/page.tsx:100,123` already point at it and 404 today). | Build the **"Find an agent"** CTA as `href="/agents?district={district}"` anyway, matching the existing dead-link convention verbatim. **Do not** build the `/agents` index page — that's Page 11's own task, out of scope here. | Consistent with how the rest of the app already treats this link (three existing files link to it without building it); building Page 11 inside a Page 12 task would be large, unrelated scope creep. If Page 11 ships later, this CTA starts working with zero changes. |
| D6 | Generic spec: estimate shown "in the selected currency (header currency switcher)... live FX." | **No FX conversion, no currency switcher wiring.** The estimate is computed and displayed in a fixed base currency, **AMD** (`properties.currency` defaults to `'AMD'`; the district-median query in §6 filters `currency = 'AMD'` rows only, to avoid silently averaging unconverted USD/EUR/RUB prices with AMD ones). `store/currencyStore.ts`'s header switcher does not affect this page. | Identical reasoning to `docs/design/13-mortgage-calc-handoff.md` D2: this codebase's currency handling is UI-only, no live FX anywhere; averaging prices across currencies without conversion would silently corrupt the median, which is worse than just being AMD-only for MVP. |
| D7 | Task acceptance criteria: "RLS enabled: owner **or estimate-hash holder** can read; only the creator/service role can write" — but Postgres RLS `USING` clauses evaluate per-row, they cannot conditionally grant access "only if the caller supplied the right hash in its `WHERE`." A blanket `USING (true)` SELECT policy would technically satisfy "hash holder can read" but also lets anyone enumerate **every** estimate (every address ever looked up) via a raw PostgREST call with no hash at all. | RLS SELECT policy stays **owner-only** (`auth.uid() = user_id`), exactly like `saved_searches`. The **hash-holder read path is implemented in the app, not in RLS**: `POST /api/home-value/estimate` already returns the full result inline (no follow-up read needed for the creator), and `GET /home-value/[estimateHash]` (the SSR page) looks the row up **via the admin/service-role client**, scoped to `.eq('hash', estimateHash).single()` — never a raw anon-key query. This is the exact pattern `0007_saved_searches.sql`'s own comment already documents for its unsubscribe-token route. All writes also go through the admin client (§7's INSERT policy is `WITH CHECK (false)` — no direct anon/authenticated inserts at all). | Matches an established, already-reviewed precedent in this codebase instead of inventing a new "public share link" RLS shape. Strictly satisfies "no arbitrary read of others' full input data" (a raw PostgREST client can read *nothing* from this table beyond its own `user_id` rows) while still making hash-based sharing work through the normal app route. |
| D8 | `POST /api/home-value/estimate` is a **public, unauthenticated write** endpoint (core requirement — guests must be able to get an estimate) — the one write path in this codebase that isn't behind login. | Rate-limit it: `checkRateLimit(`home-value-estimate:${ip}`, 20, 60 * 60 * 1000)` (20/hour per IP) using the existing in-memory `lib/auth/rateLimit.ts`, same shape as `LIMITS.AGENT_LEAD`. A honeypot field (`website`, hidden, same convention as `agentLeadSchema`) is **not** added — the form has no free-text fields a bot would target for spam content (no message/phone), so the abuse surface is compute cost, not spam content; rate-limiting alone is enough. | This is the first genuinely public write endpoint in the app (favorites/agent-leads/saved-searches all require auth first); rate-limiting is the minimum needed to keep it from being a free compute-abuse or database-fill vector. |
| D9 | Task brief: "Claim my home / saving the estimate / value alerts require login — guest clicking these gets a login modal with `?next=`... do not implement the alerts delivery mechanism itself... otherwise stub the CTA." | All three CTAs share one guest-gate: clicking as a guest opens a modal cloned from `SignInPromptModal.tsx` (same dialog chrome, same `role="dialog"`/focus-trap/Escape behavior), retitled per action, linking to `/auth/login?next=${encodeURIComponent(currentHomeValueUrl)}` (`currentHomeValueUrl` includes the estimate hash once one exists, via `safeNext`-compatible relative path, so login returns the user to the same result). **Logged-in click → a "Coming soon" stub**: the button stays enabled but the click handler shows an inline toast/tooltip ("We'll notify you when this is ready") and makes **no network call** — do not fake a 201/success response. No `claimed_homes` table, no `POST /api/claimed-homes` route this task. | The task brief permits stubbing but explicitly forbids building the alerts pipeline or (by the acceptance criteria's scope list) the claim/save backend; a silent no-op would look broken, and a fake success toast would be actively misleading (the estimate isn't actually saved anywhere retrievable) — an honest "coming soon" state is the only option that's both truthful and matches "stub the CTA." |
| D10 | Generic spec implies `/home-value`'s Result state is restorable via URL (`?lat=&lng=&addr=`), which depended on geocoded coordinates that don't exist here (D1). | `/home-value`'s Input→Details→Result state machine is **client-side React state only**, not persisted in the URL or restorable on reload — reloading mid-flow returns to Input. The **only** durable, shareable, reload-safe URL is the separate `/home-value/[estimateHash]` snapshot route, which the Result phase surfaces via a visible "Share this estimate" link/copy-button as soon as the `POST` response returns a `hash`. | Matches the doc's own framing ("after the result, a shareable snapshot: `/home-value/[estimateHash]`") — the *snapshot* route is the durable one by design, not `/home-value` itself. Building URL-restorable state for the plain flow adds a second persistence mechanism for no acceptance-criteria benefit. |

---

## 2. Component inventory

```
app/[locale]/home-value/
  page.tsx                          (NEW — Server Component shell: generateMetadata
                                      (title/description/canonical/hreflang, §11),
                                      renders static H1/subtitle/disclaimer +
                                      <HomeValueFlow /> client island)
  [estimateHash]/
    page.tsx                        (NEW — Server Component: admin-client lookup by
                                      hash (D7), notFound() on miss, renders
                                      <EstimateSnapshotView /> — no client state
                                      machine, robots: noindex, follow: false)

components/home-value/
  HomeValueFlow.tsx                 (NEW — client, 'use client': owns the
                                      input/details/estimating/result/error phase
                                      state, renders the right child per phase)
  AddressFieldsForm.tsx             (NEW — client: Country(fixed)/City(datalist)/
                                      District/Street — Step2Location's pattern, D1)
  PropertyDetailsForm.tsx           (NEW — client: rhf + zod, area/type/rooms/
                                      floor/floorsTotal/yearBuilt/condition)
  EstimateResultCard.tsx            (NEW — client or pure-props: large number +
                                      <ValueRangeBar /> + confidence badge +
                                      price/m² vs median)
  ValueRangeBar.tsx                 (NEW — pure-props: low—estimate—high bar)
  HomeValueCtaCard.tsx              (NEW — client: Claim/Save/Alerts (D9) + Sell
                                      (D2) + Find an agent (D5) buttons)
  GuestActionModal.tsx              (NEW — client: clone of
                                      SignInPromptModal.tsx, parameterized title/
                                      body/next — D9)
  HomeValueDisclaimer.tsx           (NEW — pure-props: the `role="note"` legal
                                      microcopy block, rendered in all 3 phases +
                                      the snapshot route, §5)
  EstimateSnapshotView.tsx          (NEW — pure-props render of a persisted
                                      estimate row: same visual card as
                                      EstimateResultCard plus disclaimer, no
                                      phase machine, no forms)

lib/home-value/
  estimate.ts                       (NEW — pure function `computeHomeValueEstimate`,
                                      currency-agnostic, unit-tested, §6)
  schemas.ts                        (NEW — `addressFieldsSchema`, `propertyDetailsSchema`,
                                      `estimateRequestSchema` (zod), §8)
  types.ts                          (NEW — shared TS types: `EstimateInput`,
                                      `MarketStats`, `EstimateResult`, row types)
  marketStats.ts                    (NEW — server-only: admin-client query +
                                      in-memory median calc, district→city
                                      fallback resolution, §6)
  matchProperty.ts                  (NEW — server-only: "does this address match
                                      an existing `properties` row" lookup, §5.1)
  hash.ts                           (NEW — `generateEstimateHash()`, §7)

app/api/home-value/
  estimate/route.ts                 (NEW — POST: zod-validate → matchProperty →
                                      marketStats → computeHomeValueEstimate →
                                      admin-client insert → `{ hash, ...result }`,
                                      rate-limited (D8), §8)
```

Reuse, don't fork: `Step2Location.tsx`'s field markup/`ARMENIAN_CITIES`
datalist (D1), `FilterBar.tsx`'s `CityInput` icon/debounce styling, `lib/
listings/schemas.ts`'s `condition` enum + `z.coerce.number()` convention
(D4), `SignInPromptModal.tsx`'s dialog chrome (D9), `lib/auth/safeNext.ts`,
`lib/auth/rateLimit.ts` (D8), `lib/supabase/admin.ts` (D3/D7), `lib/utils.ts`
`cn()`, `app/[locale]/favorites/page.tsx`'s breadcrumb + SSR-shell pattern.

---

## 3. Wireframes

### 3.1 Desktop (≥1024px) — Input phase (default)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│           HERO (bg-gradient, py-16, text-center)             │
│  «Find out how much your home is worth» (text-4xl bold)      │
│  subtitle "Free valuation in seconds" (text-lg gray-500)     │
│  ┌─ Country: Armenia (fixed) ─────────────────────────────┐ │
│  │ City [ Yerevan▾/datalist ]  District [ Arabkir ]        │ │
│  │ Street address [ Komitas 12 ]                            │ │
│  └──────────────────────────────────────────────────────────┘│
│                                    [ Estimate ]  (h-12)       │
│  DISCLAIMER (text-xs, role="note")                            │
├────────────────────────────────────────────────────────────┤
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Details phase (inline card under the hero, address has no match)

```
┌────────────────────────────────────────────────────────────┐
│ HERO (collapsed to a compact "Estimating: Arabkir, Komitas 12"│
│ summary row + "Change address" link)                          │
├────────────────────────────────────────────────────────────┤
│ ── Property details card ──                                  │
│ Property type [Apartment▾]      Area m² [ 75 ]  *required     │
│ Rooms [ 3 ]      Floor [ 4 ] / Total floors [ 9 ]              │
│ Year built [ 2008 ]             Condition [Renovated▾]        │
│                                    [ Calculate estimate ]      │
│ DISCLAIMER                                                     │
└────────────────────────────────────────────────────────────┘
```

### 3.3 Result phase (desktop, two-column — same shape as the generic spec
minus comps/trend/factors/FAQ)

```
┌────────────────────────────────────────────────────────────┐
│ HERO (collapsed summary row, as in 3.2)                       │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN (≈62%)                    │ ► SIDEBAR (≈38%, sticky  │
│ ┌── Estimate card ──┐            │   top-20)                │
│ │ 52,000,000 ֏      │            │ ┌── CTA card ──┐         │
│ │ range bar low–high│            │ │ [🏠 Claim my home]     │
│ │ confidence badge   │            │ │ [💾 Save estimate]     │
│ │ price/m² vs median │            │ │ [🔔 Get value alerts]  │
│ └────────────────────┘            │ │ [Sell this property]  │
│ DISCLAIMER (text-xs)              │ │ [Find an agent]        │
│ "Share this estimate" link/copy   │ └────────────────────────┘
└──────────────────────────────────┴─────────────────────────┘│
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

### 3.4 Mobile (<768px) — all phases, single column

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ HERO (py-10, compact)     │
│ Address fields (stacked)  │
│ [Estimate] full-width      │
│  — or —                    │
│ Details form (stacked)     │
│ [Calculate estimate]       │
│  — or —                    │
│ Estimate card               │
│ range bar / confidence      │
│ DISCLAIMER                  │
│ CTA card (inline, stacked)  │
├──────────────────────────┤
│ FOOTER                     │
└──────────────────────────┘
```

- No fixed bottom bar for MVP (that's a comps/CTA-density affordance the full
  spec uses; with only 5 stacked CTA buttons and no comps carousel to scroll
  past, an inline CTA card at the end of the page is sufficient — simpler
  than the generic spec's mobile layout, intentionally, per §0's minimal-diff
  scope).

### 3.5 Snapshot route (`/home-value/[estimateHash]`)

Same visual card as 3.3's "Estimate card" + disclaimer + the same 5-button
CTA card (Claim/Save/Alerts still guest-gate exactly as on `/home-value` —
this is not a stripped-down view functionally, only structurally: no
address/details forms, no phase machine, pure SSR render of the persisted
row). Unknown/invalid hash → Next.js `notFound()` → the app's standard
not-found page.

---

## 4. Design tokens (for this page)

Reused verbatim from `docs/en/pages/12-home-value.md` §2 (already correct
and already codebase-consistent — no changes needed):

| Element | Tailwind / value |
|------|------------------|
| Hero heading | `text-4xl font-bold text-gray-900` (mobile: `text-2xl`) |
| Address input | `h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-primary` (matches `Step2Location.tsx`, not the doc's original `h-14`/`text-lg` — this codebase's form-field height convention wins over the generic spec's hero-sized single field, since D1 replaces the single field with 3 stacked fields) |
| Submit button | `h-12 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 w-full md:w-auto px-8` |
| Estimate (large number) | `text-4xl font-bold text-gray-900` |
| Estimate range (low–high) | `text-lg text-gray-600` |
| Range bar track | `h-2 rounded-full bg-gray-200`, fill `bg-primary/30`, marker `bg-primary w-3 h-3 rounded-full` |
| Confidence badge (high) | `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md` |
| Confidence badge (medium) | `bg-amber-100 text-amber-700` |
| Confidence badge (low) | `bg-gray-100 text-gray-600` |
| Disclaimer | `text-xs text-gray-400 leading-relaxed` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-5` |
| Primary CTA (Claim) | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Secondary CTA (Save/Alerts/Sell/Agent) | `border border-gray-300 text-gray-700 h-11 rounded-lg w-full font-medium hover:bg-gray-50` |
| Gap between sections | `space-y-6` (24px) |
| Skeleton (Estimating phase) | `bg-gray-100 animate-pulse rounded-lg` |
| Error field text | `text-sm text-red-600 mt-1`, `role="alert"` (matches `Step2Location.tsx`) |

Colors/radii all reused from existing tokens — no new design tokens
introduced.

---

## 5. Section-by-section (MVP)

### 5.1 Input phase

- Fields: Country (fixed "Armenia", not rendered as a selector for MVP — no
  other country has data to estimate against; render as static text, not an
  input, to avoid implying it's changeable), City (`<input list="am-cities">`
  + `ARMENIAN_CITIES` datalist, required), District (free text, optional),
  Street address (free text, optional).
  **[Estimate]** submit.
- On submit: client-side requires City to be non-empty (inline error "City is
  required" — mirrors `Step2Location.tsx`'s `role="alert"` pattern). No
  "select from a dropdown" requirement (D1 — there is no dropdown).
  `matchProperty()` (server-side, called from the Details/estimate flow, not
  here) decides Details vs Result — the Input phase itself just collects the
  address fields and transitions to `estimating`.
  - Address fields resolved server-side call
    `lib/home-value/matchProperty.ts`: `SELECT id, property_type, area_m2,
    rooms, floor, floors_total, year_built FROM properties WHERE status =
    'active' AND city ILIKE :city AND (:district IS NULL OR district ILIKE
    :district) AND (:address IS NULL OR address ILIKE '%'||:address||'%')
    LIMIT 1` (admin client — this is a cross-owner lookup, not something the
    public RLS policy needs to special-case since it only ever returns
    `active` rows the public policy already allows).
  - Match found → condition defaults to `'good'` (neutral coefficient, since
    `properties` has no `condition` column — D6 in the audit list above)
    → skip Details → go straight to `estimating` → `Result`.
  - No match → `Details` phase.
- Microcopy: heading "Find out how much your home is worth", subtitle "Free
  valuation in seconds", button "Estimate".
- Disclaimer (always visible, `role="note"`): "This is an automated estimate
  based on public data, and does not replace a professional appraisal. The
  actual price may differ."

### 5.2 Details phase

- Shown only when `matchProperty()` found nothing. Fields: Property type
  (select, required), Area m² (number, required — "Area is required" if
  blank/≤0), Rooms (number, optional), Floor / Total floors (numbers,
  optional), Year built (number, optional), Condition (select, optional,
  defaults to `'good'` if left unset).
- Button "Calculate estimate". Submit → `estimating` (skeleton card, spinner
  in button) → `POST /api/home-value/estimate` → `Result` or `Error`.
- Disclaimer repeated below the form (same copy as 5.1).

### 5.3 Result phase

- Estimate card: large number (`text-4xl font-bold`, AMD — D6), range bar
  (low—estimate—high), confidence badge, price/m² vs district median
  ("8% above the district ↑" / "below ↓" / "in line with" — text label, not
  color-only, per §10).
- "Share this estimate" — a copy-to-clipboard button + visible link showing
  `/home-value/{hash}` once the POST response includes `hash`.
- Disclaimer (same copy).
- CTA card (§5.4).
- No comps, no trend chart, no factors list, no FAQ (§0).

### 5.4 CTA card (Claim / Save / Alerts / Sell / Find an agent)

- **[🏠 Claim my home]**, **[💾 Save estimate]**, **[🔔 Get value alerts]** —
  all three: guest → `GuestActionModal` (D9); logged-in → "Coming soon" stub
  (D9, no network call, no fake success state).
- **[Sell this property]** → `<Link href="/sell/new">` (D2, no query params;
  middleware handles the guest redirect for this one since `/sell` is
  already in `PROTECTED_PATHS`).
- **[Find an agent]** → `<Link href={`/agents?district=${district}`}>` (D5 —
  builds the link even though `/agents` doesn't resolve yet; this task does
  not build Page 11).

### 5.5 Snapshot route (`/home-value/[estimateHash]`)

- Server Component, `generateMetadata` sets `robots: { index: false, follow:
  false }` (this is a private-by-hash view, not meant to be indexed — the
  doc's own §8 "share snapshots: noindex" rule).
- Fetch: `createAdminClient().from('home_value_estimates').select(...).eq
  ('hash', estimateHash).single()` (D7 — never the anon client here). Miss →
  `notFound()`.
- Renders `<EstimateSnapshotView estimate={row} />` — same visual card as
  5.3's Estimate card, same CTA card (5.4, same guest-gating), same
  disclaimer. No forms, no phase state.

---

## 6. The heuristic (`lib/home-value/estimate.ts`)

Pure, synchronous, currency-agnostic (operates on plain numbers, no
formatting) — no `Date.now()`/network/DB calls inside it, so it is fully
unit-testable with plain fixtures (§12).

```ts
export interface MarketStats {
  medianPricePerM2: number
  medianRooms: number
  compsCount: number
}

export interface HomeValueEstimateInput {
  areaM2: number
  rooms?: number
  floor?: number
  floorsTotal?: number
  yearBuilt?: number
  condition?: 'new' | 'renovated' | 'good' | 'needs_renovation'
}

export interface HomeValueEstimateResult {
  estimate: number
  low: number
  high: number
  pricePerM2: number
  medianPricePerM2: number
  vsMedianPct: number
  confidence: 'high' | 'medium' | 'low'
  usedFallbackLevel: 'district' | 'city'
  coefficients: { rooms: number; floor: number; age: number; condition: number }
}

/**
 * @param district  District-level market stats, or `null` if the district
 *                   has too few comps to be meaningful (caller's threshold —
 *                   `marketStats.ts` passes `null` when `compsCount < 1`).
 * @param city       City-level fallback stats — always required, always used
 *                   when `district` is `null`.
 * @param currentYear  Passed explicitly (not `new Date()`) so the function
 *                      stays pure/deterministic for tests.
 */
export function computeHomeValueEstimate(
  input: HomeValueEstimateInput,
  district: MarketStats | null,
  city: MarketStats,
  currentYear: number,
): HomeValueEstimateResult
```

**Formula** (mirrors `docs/en/pages/12-home-value.md` §3.3 exactly, made
concrete):

```
market   = district ?? city             // usedFallbackLevel = district ? 'district' : 'city'
base     = input.areaM2 * market.medianPricePerM2

roomsCoeff     = 1 + clamp((rooms - market.medianRooms) * 0.03, -0.15, 0.15)   // rooms undefined → 1
floorCoeff     = (floor == null || floorsTotal == null) ? 1
                 : floor === 1                          ? 0.97   // ground floor
                 : floor === floorsTotal                ? 0.95   // top floor
                 : 1                                             // middle floors
ageCoeff       = yearBuilt == null ? 1
                 : age <= 2  ? 1.05
                 : age <= 15 ? 1.00
                 : age <= 40 ? 0.95
                 :             0.90                              // age = currentYear - yearBuilt
conditionCoeff = { new: 1.06, renovated: 1.05, good: 1.00, needs_renovation: 0.85 }[condition] ?? 1.00

estimate = round(base * roomsCoeff * floorCoeff * ageCoeff * conditionCoeff, nearest: 1000)

margin = market.compsCount >= 8 ? 0.10 : market.compsCount >= 3 ? 0.15 : 0.20
low    = round(estimate * (1 - margin), nearest: 1000)
high   = round(estimate * (1 + margin), nearest: 1000)

confidence = market.compsCount >= 8 ? 'high' : market.compsCount >= 3 ? 'medium' : 'low'

pricePerM2 = estimate / input.areaM2
vsMedianPct = ((pricePerM2 - market.medianPricePerM2) / market.medianPricePerM2) * 100
```

`clamp(x, min, max)` is a 3-line local helper, not a new dependency.
Rounding to the nearest 1000 (generic currency units) avoids the "false
precision" the doc explicitly warns against (§3.3's "not a single false-
precise number").

**Explicit non-goal (§0):** the doc's `clamp(estimate, median ± 3σ)` outlier
guard is **not** implemented this iteration — it needs a real σ computed over
a large-enough comps sample to be meaningful, which this MVP's small seeded
dataset can't reliably provide. Leave a one-line comment in `estimate.ts`
noting this as the natural extension point once `marketStats.ts` can supply
a `stdDevPricePerM2`.

### `lib/home-value/marketStats.ts` (server-only, not part of the pure-function test surface)

- Admin client (D3), query: `properties` rows where `status IN ('active',
  'sold')`, `currency = 'AMD'` (D6), matching `city`/`district`/
  `property_type`, `area_m2 > 0`, capped `.limit(500)`.
- Compute `medianPricePerM2` (median of `price / area_m2` across rows),
  `medianRooms` (median of `rooms`, ignoring nulls), `compsCount` (row
  count) — plain JS array sort + midpoint, no Postgres percentile function
  needed at this data scale (avoids adding a new SQL function to the
  migration).
- Two calls: district-scoped (passed as `district` arg, `null` if
  `compsCount === 0`) and city-scoped (`district: null` filter, always
  computed as the guaranteed fallback — if the city itself has zero comps,
  fall back further to a small hardcoded `DEFAULT_CITY_STATS` constant per
  the doc's "No data (area)" state, §4 of the generic spec, rendered as the
  page's `no_area_data` error state rather than a 500).

---

## 7. Migration (`supabase/migrations/0010_home_value_estimates.sql`)

```sql
CREATE TABLE IF NOT EXISTS home_value_estimates (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- High-entropy, unguessable — the practical access-control boundary for
  -- the snapshot route (see D7; RLS SELECT below is intentionally owner-only).
  hash                  TEXT        NOT NULL UNIQUE,
  -- Nullable: guest-created estimates have no owner. Set to auth.uid() by
  -- the API route when the caller has a session at creation time.
  user_id               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  -- Set when the Details phase was skipped because an existing `properties`
  -- row matched the entered address (§5.1).
  matched_property_id   UUID        REFERENCES properties(id) ON DELETE SET NULL,
  city                  TEXT        NOT NULL,
  district              TEXT,
  address               TEXT,
  property_type         TEXT        NOT NULL
                                       CHECK (property_type IN ('apartment', 'house', 'land', 'commercial')),
  area_m2                NUMERIC(10, 2) NOT NULL,
  rooms                  SMALLINT,
  floor                  SMALLINT,
  floors_total           SMALLINT,
  year_built              SMALLINT,
  condition               TEXT        CHECK (condition IN ('new', 'renovated', 'good', 'needs_renovation')),
  currency                 TEXT        NOT NULL DEFAULT 'AMD' CHECK (currency = 'AMD'), -- D6: AMD-only this iteration
  estimate                 NUMERIC(15, 2) NOT NULL,
  low                       NUMERIC(15, 2) NOT NULL,
  high                      NUMERIC(15, 2) NOT NULL,
  price_per_m2               NUMERIC(15, 2) NOT NULL,
  median_price_per_m2         NUMERIC(15, 2) NOT NULL,
  confidence                   TEXT        NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  used_fallback_level           TEXT        NOT NULL CHECK (used_fallback_level IN ('district', 'city')),
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS home_value_estimates_user_id_idx
  ON home_value_estimates (user_id, created_at DESC);

ALTER TABLE home_value_estimates ENABLE ROW LEVEL SECURITY;

-- SELECT: owner-only (D7). The hash-holder read path (the /home-value/[hash]
-- snapshot page) goes through the admin/service-role client, not this
-- policy — same pattern documented in 0007_saved_searches.sql for its
-- unsubscribe-token route. This table intentionally stores no PII beyond
-- what a share link is meant to reveal (no name/email/phone columns); do
-- not add one without revisiting this policy.
CREATE POLICY "home_value_estimates: owner can select"
  ON home_value_estimates
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: nobody, via the anon/authenticated PostgREST role — every write
-- (guest or logged-in) goes through POST /api/home-value/estimate using
-- the admin client, which bypasses RLS entirely. This keeps a single write
-- path regardless of auth state instead of trying to encode "guest OR
-- owner-matches" in a client-side-reachable policy.
CREATE POLICY "home_value_estimates: no direct client inserts"
  ON home_value_estimates
  FOR INSERT
  WITH CHECK (false);

-- No UPDATE/DELETE policy — rows are immutable snapshots; RLS defaults to
-- deny-all for both without an explicit policy.
```

Add the corresponding hand-authored entry to `types/database.ts` (Row/Insert/
Update shapes, following the file's existing per-table block convention —
regenerate is not possible in this sandbox, see the audit note).

### `lib/home-value/hash.ts`

```ts
export function generateEstimateHash(): string {
  // 12 hex chars ≈ 48 bits — collision-resistant enough given the UNIQUE
  // constraint + retry-on-23505 in the route handler (same pattern as
  // saved_searches' unique-violation → 409 handling).
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}
```

---

## 8. API contract & validation (`app/api/home-value/estimate/route.ts`, `lib/home-value/schemas.ts`)

```ts
import { z } from 'zod'

export const addressFieldsSchema = z.object({
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
})

export const propertyDetailsSchema = z.object({
  propertyType: z.enum(['apartment', 'house', 'land', 'commercial'], {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  areaM2: z.coerce.number().min(5, 'Area is too small').max(100000, 'Unrealistic area'),
  rooms: z.coerce.number().int().min(0).max(50).optional(),
  floor: z.coerce.number().int().min(-3).max(200).optional(),
  floorsTotal: z.coerce.number().int().min(1).max(200).optional(),
  yearBuilt: z.coerce.number().int().min(1800).max(2100).optional(),
  condition: z.enum(['new', 'renovated', 'good', 'needs_renovation']).optional(),
})

// The route does NOT merge these into one combined schema (propertyType/
// areaM2 are conditionally required depending on which phase the client is
// submitting from, which zod expresses awkwardly as one flat object).
// Instead, validate in two steps in the route handler:
//   1. Always: addressFieldsSchema.parse(body) — 422 on failure.
//   2. Only when body.matchedPropertyId is absent (the Details-phase path):
//      propertyDetailsSchema.parse(body) — 422 on failure.
// When body.matchedPropertyId is present, re-verify server-side that the id
// resolves to an `active` property before trusting its stored fields (never
// trust a client-supplied id without re-checking it still matches).
export const matchedEstimateRequestSchema = addressFieldsSchema.extend({
  matchedPropertyId: z.string().uuid(),
})
```

`POST /api/home-value/estimate`
```jsonc
// request (Details-phase submit)
{ "city": "Yerevan", "district": "Arabkir", "address": "Komitas 12",
  "propertyType": "apartment", "areaM2": 75, "rooms": 3,
  "floor": 4, "floorsTotal": 9, "yearBuilt": 2008, "condition": "renovated" }

// 201 Created
{ "hash": "e8423ab1c9d4",
  "estimate": 52000000, "low": 46800000, "high": 57200000,
  "currency": "AMD", "pricePerM2": 693333,
  "medianPricePerM2": 640000, "vsMedianPct": 8.3,
  "confidence": "medium", "usedFallbackLevel": "district" }

// 422 { "error": "validation_error", "fields": {...} }
// 422 { "error": "no_area_data" }             // city fallback also empty (§6)
// 429 { "error": "rate_limited" }             // D8
// 500 { "error": "server_error" }
```

Route flow: parse JSON → zod-validate (422 on failure) → rate-limit check by
IP (D8, 429 on failure) → `matchProperty()` if the client didn't already
resolve one → `marketStats.getDistrictAndCityStats(...)` → `no_area_data` if
both are null → `computeHomeValueEstimate(...)` → `generateEstimateHash()` →
admin-client insert (retry once on `23505` unique-violation with a fresh
hash) → `201` with the result + hash. Session is read (`supabase.auth.
getUser()`) only to optionally set `user_id` on the row when present — it is
**never required** (this must stay a guest-accessible endpoint).

---

## 9. Guest-gating implementation notes

- `GuestActionModal` (D9) receives `{ action: 'claim' | 'save' | 'alerts',
  redirectTo }`, where `redirectTo` is the current `/home-value` URL
  (including `?hash=` once one exists) built the same way `SignInPromptModal`
  builds `redirectTo` — passed down from `HomeValueFlow`/`EstimateSnapshotView`,
  never recomputed from `window.location` inside the modal (SSR-safe).
- Auth check for the logged-in "Coming soon" branch reuses
  `useFavoriteToggle`'s cookie-sniff convention (`document.cookie` match on
  `/^sb-.+-auth-token=/`) — do not add a new `useSession` hook for this.
- `/home-value` itself must **not** be added to `PROTECTED_PATHS`
  (`lib/auth/protectedPaths.ts`) — anonymous use of Input/Details/Result is
  the entire point of the page.

---

## 10. Accessibility

- Address/details form fields: `<label htmlFor>`, `aria-invalid`,
  `aria-describedby` + `role="alert"` error text — identical contract to
  `Step2Location.tsx`/`Step3...` (already-audited pattern, no new a11y
  surface).
- Range bar: `role="img"` + `aria-label="Estimated range from 46.8 million to
  57.2 million drams"` — never color-only; low/high numbers are also
  rendered as plain text next to the bar.
- Confidence badge and vs-median indicator communicate via icon/text, not
  color alone (e.g. "8% above the district ↑" — the arrow is decorative,
  the words carry the meaning).
- Disclaimer: `role="note"`.
- `GuestActionModal`: same `role="dialog"`, `aria-modal`, focus-trap,
  Escape-to-close, initial-focus-on-close-button contract as
  `SignInPromptModal.tsx`.
- Touch targets ≥ 44px (form inputs `h-11`, buttons `h-11`/`h-12`); contrast
  ≥ 4.5:1 (all reused tokens, already audited elsewhere).

---

## 11. SEO & meta

- `/home-value`: `<title>` "How much is my home worth — free valuation |
  {brand}", description per doc §8, `alternates.canonical` +
  `alternates.languages` (hy/ru/en) following the `mortgage-calculators`
  page's `generateMetadata` shape exactly. Indexable (no `robots` override).
- `/home-value/[estimateHash]`: `robots: { index: false, follow: false }`
  (private-by-hash snapshot, matches the doc's own §8 rule and the existing
  `/sell/new` `noindex` convention).
- No `FAQPage`/`WebApplication` JSON-LD this iteration (§0).

---

## 12. Testing notes

Mirrors this repo's convention (`environment: 'node'`, one file per unit,
no DOM/RTL):

- `__tests__/homeValueEstimate.test.ts` — `computeHomeValueEstimate`:
  - **Baseline case**: known `areaM2`/`district` stats/no optional fields →
    assert exact `estimate`/`low`/`high`/`confidence`/`pricePerM2` against a
    hand-computed expected value.
  - **Missing-district fallback**: `district = null` → asserts
    `usedFallbackLevel === 'city'` and that `city.medianPricePerM2` (not any
    stray district value) drove the result.
  - **Each coefficient's effect**, isolated (all other inputs held at their
    neutral/undefined default so only one coefficient moves):
    `rooms` above vs below `medianRooms` → estimate higher / lower
    respectively, and clamped at ±15%; `floor === 1` and `floor ===
    floorsTotal` → lower than a middle floor; `yearBuilt` recent vs old (via
    varying `currentYear - yearBuilt`) → higher / lower; each `condition`
    value → matches its documented coefficient, `undefined` → neutral (1.0).
  - `confidence`/`margin` thresholds at the `compsCount` boundaries (7 vs 8,
    2 vs 3).
  - Rounding: result is always a multiple of 1000 (no false-precision
    leakage from the raw multiplication).
- `__tests__/homeValueSchemas.test.ts` — `addressFieldsSchema`/
  `propertyDetailsSchema`: valid input parses; `city` empty rejected;
  `areaM2` `0`/negative/`> 100000` rejected; `propertyType` outside the
  4-value enum rejected; `condition` outside the 4-value enum rejected;
  optional fields genuinely optional (omitting them parses).
- `__tests__/homeValueMigration.test.ts` — static regex assertions against
  `0010_home_value_estimates.sql` (same style as
  `savedSearchesMigration.test.ts`): table created, RLS enabled, exactly 2
  policies, SELECT policy scopes `auth.uid() = user_id`, INSERT policy is
  `WITH CHECK (false)`, `hash` is `NOT NULL UNIQUE`, `property_type`/
  `condition`/`confidence`/`used_fallback_level`/`currency` CHECK
  constraints present.
- `__tests__/homeValueEstimateRoute.test.ts` — route handler: 422 on bad
  body, 429 after exceeding the rate limit (D8), 201 shape on success
  (mirrors `savedSearchesApiRoutes.test.ts`'s structure).

Component-level rendering assertions are out of scope (no
`@testing-library/react` wired into `vitest.config.ts`) — keep all logic
under test in `lib/home-value/`, with the client components staying thin
renderers of `computeHomeValueEstimate`/fetch results, same discipline
`docs/design/13-mortgage-calc-handoff.md` §10 already established.

---

## 13. Explicit follow-ups (not part of this task)

- Comparable-sold-properties grid + `GET /api/home-value/comps`.
- Price-trend chart + `GET /api/home-value/trend` (needs Recharts — not
  currently a dependency).
- The "Factors affecting value" transparency list in the UI (the pure
  function already computes `coefficients` internally — surfacing them as a
  labeled list is a small follow-up once comps/trend also ship, so all three
  "why this number" sections land together).
- `claimed_homes` table, `POST /api/claimed-homes`, "My homes" dashboard tab,
  value-history chart, `PATCH /api/claimed-homes/[id]`.
- Value-alert delivery (needs its own cron/email pipeline — Page 08
  territory, not touched here).
- Real geocoding/address-suggestion provider integration (would replace D1's
  structured free-text fields with a true autocomplete).
- Live FX conversion (D6) — once the codebase gets a real FX source anywhere.
- Outlier σ-clamping in `computeHomeValueEstimate` (§6) once `marketStats.ts`
  can supply a statistically meaningful `stdDevPricePerM2`.
- `FAQPage`/`WebApplication` JSON-LD.
- `/agents` index page itself (Page 11) — this task only builds the CTA link
  that already assumes it exists (D5).
- Area landing pages (`/home-value/yerevan/arabkir`).
