# Page 18 — Pro Dashboard shell + Overview + Analytics: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/18-pro-dashboard.md`](../en/pages/18-pro-dashboard.md) (deep
spec — full page: shell, Overview, Analytics, Leads, Promoted, Bulk Upload,
Team, Billing). This document does **not** repeat that spec in full; it pins
down the **current task's MVP scope** (shell + Overview + Analytics only) and
closes the gap between the generic spec's Tailwind sketch and *this specific
codebase's* actual conventions.

Audited against the current tree: `components/dashboard/DashboardSidebar.tsx`
+ `components/dashboard/OverviewCards.tsx` (the sidebar/drawer shell and
KPI-card patterns this page reuses almost verbatim, scoped down to 2 nav
items), `components/dashboard/StatsModal.tsx` (the `7d/30d/90d` segmented
range-selector **and** the dependency-free inline-SVG line chart — the
pattern for Overview sparklines, and the shape `AnalyticsCharts` upgrades to
Recharts), `components/home-value/ValueFactorsList.tsx` (the icon+color,
not-color-alone trend-direction convention — reused verbatim for KPI trends),
`components/agent/AgentHeader.tsx`'s `TIER_STYLES` map (`pro:
bg-violet-100 text-violet-700`, `premium: bg-amber-100 text-amber-700` —
already pixel-identical to the generic spec's tier-badge tokens), `store/currencyStore.ts`
(the established "small global client-UI-state" Zustand pattern — reused for
the date-range picker, see D3), `app/[locale]/messages/layout.tsx` (the
auth-gated Server Component layout + client shell pattern this page's
`<ProDashboardLayout>` copies), `app/[locale]/pro/page.tsx`'s `loadPlans()`
(the existing `profiles.tier` read — the tier-source-of-truth this page
reuses, see D2), `components/wizard/LimitReachedModal.tsx` (the
upgrade-CTA visual language reused for the free-tier locked overlay),
`components/mortgage/AmortizationTable.tsx` (plain `<table>` styling
convention), `components/favorites/FavoritesGrid.tsx` (skeleton /
error-retry / infinite-scroll-spinner visual language), `app/globals.css`
(confirms: **no** custom `@keyframes`, no animation library anywhere in this
codebase — all motion today is Tailwind's built-in `transition-*` /
`animate-pulse` / `animate-spin` utilities; this doc's motion section stays
inside that vocabulary, see D1), and `package.json` (confirms `recharts` is
**not yet installed** — `@tanstack/react-query` and `zustand` already are).

---

## 0. MVP scope for this task (read before building)

Build exactly: the auth-gated dashboard shell (sidebar + topbar), the
**Overview** section (§3.1 of the page spec), and the **Analytics** section
(§3.2). This mirrors the task brief's scope exactly.

**Explicitly out of scope — do not build, do not add nav items or dead
links for them:** Leads inbox (§3.3), Promoted listings manager (§3.5), Bulk
CSV upload (§3.6), Team management (§3.7), Billing panel (§3.4), Stripe/
payment-provider integration, Supabase Realtime. The sidebar in this task
lists **only** "Overview" and "Analytics" — nothing else, not even
disabled/greyed-out placeholders (that would still be a dead link).
Premium-only extras mentioned in the generic spec's Analytics section
(Traffic sources pie chart, `[Export CSV]`) are **also** out of scope for
this task — Analytics ships only: views/favorites/contact-clicks/leads
charts + Top performing listings table, per the task brief. Do not build a
traffic-sources chart or an export button.

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Task brief says "reuse `components/ui` primitives and `components/motion` wrappers." | **Neither directory exists in this repo.** There is no shadcn-style `components/ui/`, no animation-wrapper library, and `app/globals.css` defines only `--color-primary`/`--color-primary-foreground`/`--font-sans` — no custom keyframes anywhere in the codebase (verified). This page's "design system" *is* the set of Tailwind utility conventions already repeated across `components/dashboard/`, `components/favorites/`, `components/messages/`: `transition-colors`/`transition-opacity`/`transition-transform` for hover/open-close, `animate-pulse` for skeletons, `animate-spin` for loading spinners, plain `border border-gray-200 rounded-xl` cards. **Build within that existing vocabulary** — do not add `framer-motion` or a new `components/motion/` folder for this task. §5 below specifies every micro-interaction using only these utilities. |
| D2 | Generic spec doesn't say where "the caller's plan/tier" comes from. | Reuse `profiles.tier` (`UserTier = 'free' \| 'pro' \| 'premium'`) exactly as `app/[locale]/pro/page.tsx`'s `loadPlans()` already reads it (`supabase.from('profiles').select('tier').eq('id', user.id).maybeSingle()`), and reuse the `plans` table (`supabase/migrations/0009_plans.sql`) only if a feature/quota value is needed later — for this task's scope (Overview + Analytics), `profiles.tier` alone is sufficient to decide "locked or live." **Do not invent a parallel tier/subscription table.** |
| D3 | Generic spec's topbar sketch shows a bordered `▾` dropdown (`h-9 border border-gray-300 rounded-md`) for the date range. | Use the **segmented control** pattern already shipped in `StatsModal.tsx` (`flex gap-1 rounded-lg bg-gray-100 p-1`, active pill `bg-white text-gray-900 shadow-sm`) instead — it's the exact same `7d/30d/90d` value set this page needs, already built, already accessible (plain buttons, no popover/focus-trap plumbing to redo). For **cross-page state** (the topbar lives in the shared layout; Overview and Analytics are separate routes that both need the current range), lift it into a tiny Zustand store, mirroring `store/currencyStore.ts` exactly (see §2, `store/proDashboardStore.ts`) — this codebase's established pattern for small global client UI state read by multiple, non-nested components, rather than prop-drilling or introducing React Context (a pattern not used anywhere else in this repo). |
| D4 | Generic spec: "KPI trend: ↑/↓ % icon, not color alone" with no concrete icon/markup given. | Reuse `ValueFactorsList.tsx`'s `DIRECTION_STYLE`/`DIRECTION_ICON` convention verbatim: `ArrowUp`/`text-green-600` for a positive trend, `ArrowDown`/`text-red-500` for negative, `Minus`/`text-gray-400` for flat (0% or no prior-period data). Same icon set (`lucide-react`, already a dependency), same colors, same "icon + colored `+12%` text" shape — no new visual language invented for this page. |
| D5 | Generic spec: tier badge colors "Pro: `bg-violet-100 text-violet-700`; Premium: `bg-amber-100 text-amber-700`." | These are **already implemented**, verbatim, as `AgentHeader.tsx`'s `TIER_STYLES` map. Import/duplicate that exact map into `ProTopbar.tsx` (this repo duplicates small per-file maps rather than sharing a util — same convention `17-pricing-handoff.md` D6 and `PropertyMainInfo.tsx`'s `CURRENCY_SYMBOL` map already follow — don't create a new shared `lib/tier/badge.ts` for a 2-line map). |
| D6 | Task brief: "sparkline optional" (Overview) vs. "Add `recharts`... " (Analytics). | Use **two different rendering strategies deliberately**: Overview KPI-card sparklines reuse `StatsModal.tsx`'s dependency-free inline-SVG `<polyline>`/area-fill approach (extract it into a small shared `components/pro/Sparkline.tsx`, stripped of the tooltip/axis-label text — a KPI card sparkline is a glance-only trend shape, not a full chart) — six of these render on every Overview load, and pulling Recharts' heavier runtime in for a 40×16px decoration is unjustified. Reserve `recharts` (the new dependency) for **Analytics only** — the four full charts (views/favorites/contact-clicks/leads) genuinely need axes, tooltips, and responsive containers, which is exactly what Recharts is for. |
| D7 | Generic spec: "Locked overlay (Free): `backdrop-blur-sm bg-white/60` + centered 'Upgrade' CTA." | Match that token, but reuse `LimitReachedModal.tsx`'s CTA button styling for the overlay's link (`bg-primary text-white` primary button, `h-11 rounded-lg font-medium text-sm`) rather than inventing a new button style — this is the same "you hit a plan limit, go upgrade" moment visually, just inline instead of in a modal. |
| D8 | Generic spec's sidebar lists 7 items (Overview…Billing) with an unread-Leads badge. | This task's sidebar renders **exactly 2 items** (Overview, Analytics) — reuse `DashboardSidebar.tsx`'s structural pattern (desktop `aside w-60 sticky`, mobile drawer with focus-trap/Escape/scroll-lock already fully implemented there) but with a 2-item `navItems` array and no badge logic (nothing here produces unread counts in this task's scope). Match `w-60` from the *page spec* (not `DashboardSidebar.tsx`'s `w-64` — the two dashboards are visually distinct surfaces, and `w-60` is what this page's own spec/token table specifies). |

---

## 2. Component inventory (new files)

```
app/[locale]/pro/dashboard/
  layout.tsx                        (NEW — Server Component: session check (redirect
                                      guests → /auth/login?next=/pro/dashboard, mirrors
                                      messages/layout.tsx exactly), reads profiles.tier
                                      once (D2), renders <ProDashboardShell tier>{children}</>)
  page.tsx                          (NEW — Overview route: thin Server Component,
                                      renders <OverviewKpis tier /> + quick-links row)
  analytics/
    page.tsx                        (NEW — Analytics route: thin Server Component,
                                      renders <AnalyticsCharts tier />)

components/pro/
  ProDashboardShell.tsx              (NEW — 'use client': owns the responsive
                                       sidebar/drawer chrome (copy DashboardSidebar's
                                       drawer mechanics, D8) + mounts <ProTopbar/> +
                                       renders {children} in the content pane)
  ProSidebar.tsx                     (NEW — 'use client' or plain — nav list, 2 items,
                                       `aria-current="page"` active state, D8)
  ProTopbar.tsx                      (NEW — 'use client': tier badge (D5) + the
                                       7d/30d/90d segmented control (D3), reads/writes
                                       useProDashboardStore)
  TierBadge.tsx                      (NEW — small presentational piece: tier → pill,
                                       used by ProTopbar; also usable standalone in tests)
  KpiCard.tsx                        (NEW — one KPI card: big number, label, trend
                                       (D4), optional <Sparkline/>)
  Sparkline.tsx                      (NEW — dependency-free inline SVG line, extracted
                                       from StatsModal.tsx's LineChart, D6)
  OverviewKpis.tsx                   (NEW — 'use client': React Query fetch of
                                       GET /api/pro/overview?range=, renders the KPI
                                       grid + quick-links row + all Overview states)
  AnalyticsCharts.tsx                (NEW — 'use client': React Query fetch of
                                       GET /api/pro/analytics?range=&metric=, renders
                                       the 4 Recharts panels + TopListingsTable + all
                                       Analytics states)
  TopListingsTable.tsx               (NEW — presentational table, row click →
                                       /property/[id])
  UpgradeOverlay.tsx                 (NEW — the free-tier locked/blurred overlay,
                                       D7 — wraps any widget: `<UpgradeOverlay
                                       locked={tier === 'free'}>{children}</UpgradeOverlay>`)
  EmptyProStats.tsx                  (NEW — "Not enough data yet" empty state,
                                       shared by Overview + Analytics)

store/
  proDashboardStore.ts               (NEW — Zustand: `{ range: '7d'|'30d'|'90d',
                                       setRange }`, mirrors currencyStore.ts, D3)

lib/pro-dashboard/
  types.ts                          (NEW — OverviewResponse, AnalyticsResponse,
                                       DateRange, TopListing, etc. — API contract
                                       shapes from the page spec §5)
  schemas.ts                        (NEW — zod: rangeQuerySchema, analyticsQuerySchema)

app/api/pro/
  overview/route.ts                 (NEW — GET: session + tier check → 403
                                       tier_insufficient for free; zod-validate
                                       ?range; query the caller's own `properties`
                                       rows only)
  analytics/route.ts                 (NEW — GET: same guard; zod-validate
                                       ?range&?metric; time-series + top-listings query)
```

Reuse, don't fork: `createServerClient()` (`@/lib/supabase/server`), the
`auth.getUser()` + typed-error-response pattern from `app/api/favorites/route.ts`
/ `app/api/dashboard/overview/route.ts` (same 401 shape, same
`Promise.all([...])` parallel-query style — scope every query to
`.eq('owner_id', user.id)` so RLS and the handler agree: no cross-tenant
rows ever leave the query), `cn()` (`lib/utils.ts`), the `useInfiniteQuery`/
skeleton conventions already in `FavoritesGrid.tsx` for loading/error states,
and `DashboardSidebar.tsx`'s drawer open/close/focus-trap `useEffect`s
verbatim inside `ProDashboardShell.tsx` (same Escape-key, body-scroll-lock,
focus-on-open behavior — don't re-derive it).

---

## 3. Wireframes

### 3.1 Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 — existing global header)                  │
├──────────────┬─────────────────────────────────────────────────┤
│ SIDEBAR w-60 │ TOPBAR h-14: [Pro ▮] · [ 7d | 30d | 90d ]        │
│ (sticky)     ├─────────────────────────────────────────────────┤
│              │ Overview                                         │
│ ▸ Overview   │ ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐│
│ ▸ Analytics  │ │Views ││Favs  ││Clicks││Leads ││Active││Conv. ││
│              │ │1,240 ││ 86   ││ 54   ││ 18   ││ 24   ││1.45% ││
│              │ │↑12%  ││↑4%   ││↓3%   ││↓2%   ││  —   ││  —   ││
│              │ │▁▂▃▅▇ ││▁▁▂▃▄ ││ ...  ││ ...  ││      ││      ││
│              │ └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘│
│              │ [See leads →]   [Promote a listing →]  (disabled│
│              │                  — Promoted ships in a later task)│
└──────────────┴─────────────────────────────────────────────────┘
```

`grid-cols-2 lg:grid-cols-6 gap-3` for the KPI grid (page spec §3.1, exact
class). "Quick links" per the spec, but scoped to this task: **"See leads"**
and **"Promote listing"** both point at not-yet-built routes — render them as
visibly `disabled` buttons with a small "coming soon" `title` tooltip rather
than linking to a 404, or simply omit them entirely and ship the KPI grid
only. Recommendation: **omit** the quick-links row for this task (cleanest —
zero dead links, matches "do not add nav items or dead links" from §0) and
let a later task add it alongside Leads/Promoted.

### 3.2 Desktop — Analytics

```
┌──────────────┬─────────────────────────────────────────────────┐
│ SIDEBAR      │ TOPBAR: [Pro ▮] · [ 7d | 30d | 90d ]             │
│ ▸ Overview   ├─────────────────────────────────────────────────┤
│ ▸ Analytics  │ ┌─── Views over time (line) ─────────────────┐  │
│  (active)    │ │  Recharts <LineChart>, h-72                │  │
│              │ └─────────────────────────────────────────────┘  │
│              │ ┌─── Favorites over time (area) ─────────────┐  │
│              │ └─────────────────────────────────────────────┘  │
│              │ ┌─── Contact clicks (bar) ────────────────────┐  │
│              │ └─────────────────────────────────────────────┘  │
│              │ ┌─── Leads over time (line) ──────────────────┐  │
│              │ └─────────────────────────────────────────────┘  │
│              │ ┌─── Top performing listings (table) ─────────┐  │
│              │ │ Listing        Views  Favs  Clicks  Leads CTR│  │
│              │ │ Kentron 3-rm   1,240   86    54     18   1.4%│  │
│              │ └─────────────────────────────────────────────┘  │
└──────────────┴─────────────────────────────────────────────────┘
```

Each chart panel: `bg-white border border-gray-200 rounded-xl p-4`, height
`h-72` (page spec §2 token table, verbatim). Stack panels vertically,
`space-y-4` — the generic spec's "property selector" and "funnel" sub-widgets
and the Premium-only "Traffic sources" pie / "Export CSV" button are **out of
scope** for this task (§0); ship the 4 time-series charts + the table only.

### 3.3 Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)         ☰  │  ← hamburger opens the same drawer as
├──────────────────────────┤     DashboardSidebar.tsx, 2 items only
│ [Pro ▮]  [7d|30d|90d]    │  ← topbar wraps to 1 row, range control
├──────────────────────────┤     shrinks: `text-xs px-2` at <400px
│ ┌────────┐ ┌────────┐    │
│ │ Views  │ │ Favs   │    │  KPI grid: grid-cols-2 (page spec §3.1)
│ │ 1,240  │ │  86    │    │
│ │ ↑12%   │ │ ↑4%    │    │
│ └────────┘ └────────┘    │
│ ┌────────┐ ┌────────┐    │
│ │ Clicks │ │ Leads  │    │
│ └────────┘ └────────┘    │
│ ┌────────┐ ┌────────┐    │
│ │ Active │ │ Conv.  │    │
│ └────────┘ └────────┘    │
├──────────────────────────┤
│ (Analytics route only)   │
│ ── Chart (full-width) ── │  ← Recharts ResponsiveContainer,
│ ── Chart 2 ──            │     scroll-x not needed at h-64 mobile
│ ── Top listings ──       │  ← card-list fallback (see §4 Table row)
└──────────────────────────┘
```

No bottom tab-bar for this task — with only 2 sections, the hamburger drawer
(already fully built in `DashboardSidebar.tsx`, just re-skinned with 2
items) is simpler and avoids inventing a second nav pattern only to remove it
again once Leads/Promoted/etc. ship and a bottom-tab layout might make more
sense with 4+ items. Revisit bottom-tabs when those sections land.

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| Sidebar (`ProSidebar`, desktop) | `hidden lg:flex flex-col w-60 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0` |
| Sidebar item | `flex items-center gap-3 px-4 h-10 rounded-md text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Sidebar item (active) | append `bg-primary/10 text-primary font-medium`, `aria-current="page"` |
| Sidebar item (inactive) | append `text-gray-700 hover:bg-gray-50` |
| Mobile drawer | copy `DashboardSidebar.tsx`'s exact drawer markup/classes (`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50`, `translate-x-0`/`-translate-x-full` transition, overlay `bg-black/40`) |
| Topbar | `h-14 border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 gap-3 flex-wrap` |
| Tier badge (`TierBadge`) | `inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold` + `TIER_STYLES[tier]` from D5 (`pro: bg-violet-100 text-violet-700`, `premium: bg-amber-100 text-amber-700`) |
| Range segmented control wrapper | `flex gap-1 rounded-lg bg-gray-100 p-1` (copy `StatsModal.tsx` verbatim, D3) |
| Range option (inactive) | `px-3 h-7 text-sm rounded-md transition-colors font-medium text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Range option (active) | `px-3 h-7 text-sm rounded-md font-medium bg-white text-gray-900 shadow-sm` |
| KPI card (`KpiCard`) | `bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1` |
| KPI label | `text-sm text-gray-500` |
| KPI number | `text-2xl font-bold text-gray-900 leading-none` |
| KPI trend row | `flex items-center gap-1 text-sm` + `DIRECTION_STYLE[direction]` (D4: `text-green-600`/`text-red-500`/`text-gray-400`) |
| KPI trend icon | `w-3.5 h-3.5` (`ArrowUp`/`ArrowDown`/`Minus`, `aria-hidden="true"`) |
| Sparkline svg | `w-full h-8`, `text-primary` stroke/`text-primary/10` fill (copy `StatsModal.tsx`'s `LineChart`, strip axis `<text>` labels) |
| Chart panel container | `bg-white border border-gray-200 rounded-xl p-4 h-72` |
| Chart panel title | `text-sm font-medium text-gray-700 mb-2` |
| Table wrapper | `bg-white border border-gray-200 rounded-xl overflow-x-auto` |
| Table header cell | `text-xs uppercase text-gray-500 font-medium text-left p-3 border-b border-gray-100` |
| Table body cell | `text-sm text-gray-900 p-3 border-b border-gray-100` |
| Table row (interactive) | append `hover:bg-gray-50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` to a `<tr tabIndex={0} role="button">`-equivalent (or wrap the row's first cell content in a `<Link>` — either satisfies "row click → `/property/[id]`") |
| Locked overlay wrapper | `relative` on the widget's outer div |
| Locked overlay scrim | `absolute inset-0 backdrop-blur-sm bg-white/60 rounded-xl flex flex-col items-center justify-center gap-3 text-center px-4` + `aria-disabled="true"` on the underlying widget content |
| Locked overlay CTA | `inline-flex items-center justify-center h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` (copy `LimitReachedModal.tsx`'s primary button, D7), `href="/pro"` |
| Locked overlay copy | `text-sm text-gray-600 max-w-xs` |
| Empty state (`EmptyProStats`) | copy `EmptyInbox.tsx`'s shape: `flex flex-col items-center justify-center gap-3 text-center px-6 py-14`, icon `w-14 h-14 bg-gray-50 rounded-full` wrapping a `w-7 h-7 text-gray-300` lucide icon (`BarChart2` or `TrendingUp`), title `text-base font-medium text-gray-900`, body `text-sm text-gray-500` |
| Skeleton card | `bg-white rounded-xl border border-gray-200 p-4 h-24` with two `bg-gray-100 animate-pulse` blocks inside (copy `OverviewCards.tsx`'s `SkeletonCard` verbatim) |
| Error + retry | copy `FavoritesGrid.tsx`'s shape verbatim: `flex flex-col items-center justify-center py-14 text-center gap-3`, message `text-gray-500 text-sm`, retry `text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded` |

---

## 5. Micro-interactions & motion (built only from utilities already in this codebase, D1)

**Hover / tap feedback**
- KPI cards, chart panels, table rows: `transition-colors duration-150` on
  background (`hover:bg-gray-50` for rows; cards stay static background, no
  hover-lift — matches `OverviewCards.tsx`'s `hover:shadow-sm
  transition-shadow duration-150` if the KPI card should read as clickable;
  for this task KPI cards are **not** clickable (no per-KPI drill-down route
  exists yet), so omit the hover-shadow entirely — a card that looks
  clickable but does nothing is worse than a static card).
- Range segmented control / sidebar items / retry links: `transition-colors
  duration-100`–`150`, `focus-visible:ring-2 focus-visible:ring-primary` on
  every interactive element (keyboard parity with hover, already this
  repo's blanket rule).
- Table row press: no separate "tap" style needed beyond the `hover:bg-gray-50`
  (mobile has no `:hover`, so the row's `focus-visible:ring-2` plus a plain
  `active:bg-gray-100` utility gives touch feedback without new JS).

**Entrance (route/section mount)**
- KPI grid and chart panels fade+rise in on mount using a single reusable
  Tailwind-only pattern — no library: give each card/panel
  `animate-in fade-in slide-in-from-bottom-1 duration-300` **is not
  available** (no `tailwindcss-animate` plugin installed) — instead use the
  plain-CSS-compatible approach already implicitly used by this codebase's
  skeleton→content swap: render the skeleton (`animate-pulse`) while
  `isLoading`, then swap to the real content with a one-time `transition-opacity
  duration-300` from a mounted `opacity-0` state to `opacity-100` (a `useEffect`
  that flips a boolean one tick after mount, exactly the same shape as
  `ProDashboardShell`'s drawer `opacity-0`/`opacity-100` toggle already does
  for the overlay backdrop in `DashboardSidebar.tsx`). Keep it subtle: 200–300ms,
  no translate/scale — this is a data dashboard, not a marketing page.

**Staggered list (KPI cards, chart panels)**
- Apply a small per-index `transitionDelay` inline style (`style={{
  transitionDelay: \`${index * 40}ms\` }}`) on top of the same
  opacity-0→100 transition above, capped at index 5 (6 KPI cards → max
  200ms total stagger) so the grid doesn't feel sluggish. This uses only
  inline `style` + the existing `transition-opacity` utility — no new
  dependency, no keyframes.
- `TopListingsTable` rows: same `transitionDelay` idea is unnecessary once
  the panel itself has already faded in — do **not** stagger every table
  row individually (visual noise for a data table); the panel-level fade is
  enough.

**Scroll-reveal**
- Not needed: this page is a fixed-viewport dashboard behind a sticky
  sidebar/topbar, not a long scrolling marketing page — everything relevant
  is visible after the initial section fade-in described above.  If
  Analytics' 4 charts + table end up taller than the viewport on small
  laptop screens, plain scroll is sufficient; do not add
  `IntersectionObserver`-driven reveal animations for internal-tool content
  (matches this app's existing convention — no other authenticated,
  behind-login page in this codebase uses scroll-reveal; it's reserved for
  public marketing pages like `/pro`, which itself doesn't use it either).

**Loading states**
- Skeleton cards/panels: `animate-pulse` (Tailwind built-in), exactly
  `OverviewCards.tsx`'s `SkeletonCard`.
- Spinner (retry-in-progress, "loading more" if ever added): `animate-spin`
  on a `w-6 h-6 border-2 border-primary border-t-transparent rounded-full`
  div — copy `FavoritesGrid.tsx`'s spinner verbatim.

**Reduced motion**
- Every transition above is opacity/color, not transform-heavy, and all are
  short (≤300ms) — no explicit `prefers-reduced-motion` override is required
  beyond what the rest of this codebase already ships (confirmed: no page in
  this repo currently guards `transition-*` behind `motion-reduce:`, so this
  page doesn't need to be the first — flag to reviewer if this should
  change platform-wide, but it's out of scope for a single-page task).

---

## 6. States

| State | What renders |
|---|---|
| **Loading** | Skeleton KPI cards (`OverviewCards.tsx` pattern) / skeleton chart panels (`h-72 bg-gray-100 animate-pulse rounded-xl`) |
| **Loaded (Pro or Premium)** | Full live widgets, no distinction needed for this task's scope (Premium-only extras are out of scope, §0) |
| **Free tier** | Every KPI card and every chart panel individually wrapped in `<UpgradeOverlay locked>` (D7) — **not** a single page-level overlay, so the layout shape (grid, panel sizes) stays identical to the Pro view, just each widget shows blurred placeholder content behind the scrim. `GET /api/pro/overview` / `GET /api/pro/analytics` return `403 { error: "tier_insufficient" }` for these callers — the client renders the overlay from that response, it does not fetch-then-hide real data. |
| **Empty (new Pro agent, zero stats)** | `EmptyProStats` ("Not enough data yet — listings start collecting statistics after they're published") in place of the KPI grid / chart panels; only shown when the API returns a genuinely empty series/zeroed KPIs for a Pro/Premium caller (distinct from the 403 locked state) |
| **Error (API fail)** | Per-widget "Couldn't load" + `[Try again]`, not a page-level error — matches `FavoritesGrid.tsx`'s retry convention; one widget failing shouldn't blank the whole dashboard |

---

## 7. Accessibility — concrete values

- `ProSidebar`'s `<nav>`: `aria-label="Pro dashboard"`, active item
  `aria-current="page"` (page spec §7, exact wording).
- Range segmented control: each option is a plain `<button
  aria-pressed={range === opt.value}>` (mirrors `FilterBar.tsx`'s deal-type
  toggle `aria-pressed` usage) — no `role="radiogroup"` needed for a
  3-option button group, consistent with the existing `FilterBar` precedent.
- KPI trend: icon + colored `+12%`/`-3%` text together, never color alone
  (D4) — additionally set `aria-label` on the trend `<span>` summarizing
  direction in words, e.g. `aria-label="Up 12% versus previous period"`, so
  a screen reader doesn't have to infer meaning from a bare "+12%".
- Charts (Recharts): each chart panel needs a `<table class="sr-only">`
  fallback with the same series data (date, value columns) plus
  `aria-label="Views over time chart"` on the chart's wrapping `<div
  role="img">` — per page spec §7. Recharts renders an SVG with no
  inherent text alternative, so this sr-only table is not optional.
- Locked overlay: `aria-disabled="true"` on the wrapped widget's content
  container (not just the overlay div) + the CTA is a real, focusable
  `<Link>` with descriptive text ("Upgrade to Pro to unlock analytics"),
  never blur-only (page spec §7, matches D7).
- Empty state icon: `aria-hidden="true"` (decorative), meaning carried by
  the adjacent text.
- Contrast: all pairs reused here (`text-green-600`/`text-red-500` on
  white, `bg-violet-100`/`text-violet-700`, `bg-amber-100`/`text-amber-700`)
  are already shipped elsewhere in this app and were audited there — no new
  pairs introduced.
- Touch targets: sidebar items `h-10` (40px) is below the 44px guidance in
  the generic spec's §7 — bump to `h-11` for the mobile drawer variant
  specifically (desktop `h-10` is fine, mouse-only); range-control options
  are `h-7` (28px) inside a `p-1` wrapper, giving effectively ~36px hit
  area — acceptable for a 3-option low-stakes control matching
  `StatsModal.tsx`'s existing, shipped precedent, but note this if a
  stricter 44px audit is required later.

---

## 8. i18n

No prior art requires this page to be translated (contrast `docs/design/17-pricing-handoff.md`
D1, which is the *only* prior page wiring real `next-intl` copy so far) —
this is an authenticated, internal tool page, not indexable marketing
content. Follow the same default every other authenticated page in this
repo uses (`DashboardSidebar.tsx`, `StatsModal.tsx`, `FavoritesGrid.tsx` —
all hardcoded English): **ship this page's copy as hardcoded English
strings**, no `messages/*.json` namespace needed. Flag to reviewer if
product wants this translated later; it's a bigger, separate lift (per D1's
precedent).

---

## 9. SEO & meta

Per page spec §8 and the task's acceptance criteria: `noindex`. Set on the
new layout, mirroring `app/[locale]/messages/layout.tsx`'s exact
`metadata` export:

```ts
export const metadata: Metadata = {
  title: 'Pro dashboard | RE Platform',
  robots: { index: false, follow: false },
}
```

---

## 10. Developer handoff checklist

Design-complete; the following is implementation (out of this document's
scope):

- [ ] `app/[locale]/pro/dashboard/layout.tsx` — session check (redirect →
      `/auth/login?next=/pro/dashboard`), read `profiles.tier` once (D2),
      add `/pro/dashboard` to `PROTECTED_PATHS` (`lib/auth/protectedPaths.ts`)
      **or** rely on the in-layout `redirect()` alone (pick one — check
      whether adding to `PROTECTED_PATHS` double-redirects harmlessly or
      conflicts; `messages/layout.tsx`'s comment implies both can coexist as
      defense-in-depth, that's the safer default).
- [ ] `GET /api/pro/overview`, `GET /api/pro/analytics` — zod-validate
      `range` (`z.enum(['7d','30d','90d'])`) and `metric` where applicable;
      session check → tier check (`403 { error: 'tier_insufficient' }` for
      `free`) → **before** any data query runs; every DB query scoped to
      `.eq('owner_id', user.id)` (no cross-tenant leakage — mirror
      `app/api/dashboard/overview/route.ts`'s parallel-query shape).
- [ ] `recharts` — add to `package.json` dependencies (not yet present);
      use `ResponsiveContainer` inside the fixed `h-72` panel so charts
      resize with the sidebar/drawer breakpoint changes.
- [ ] `store/proDashboardStore.ts` — Zustand store for `range`, mirrors
      `currencyStore.ts` (D3).
- [ ] Tests: route-handler tests for both endpoints (unauthenticated → 401,
      free tier → 403 `tier_insufficient`, invalid `range`/`metric` → 422,
      Pro/Premium + valid params → 200 with the exact response shape from
      the page spec §5 "API contracts"), plus at least one
      component/rendering test (e.g. `KpiCard` trend icon/color/aria-label
      per direction, or `UpgradeOverlay` rendering `aria-disabled` + the
      `/pro` link).
- [ ] No `console.log`, no `any`/`@ts-ignore`, no secrets in client code —
      per root `CLAUDE.md`.

---

## 11. Explicitly out of scope — flag in review if present

Per §0: Leads inbox, Promoted listings manager, Bulk CSV upload, Team
management, Billing panel, Stripe/payment-provider integration, Supabase
Realtime, Traffic-sources pie chart, `[Export CSV]`, any sidebar nav item or
route for the sections above. If any of these show up in the diff, it's
scope creep against this task.
