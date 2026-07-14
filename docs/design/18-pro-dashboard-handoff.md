# Page 18 — Pro Dashboard shell + Overview + Analytics: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/18-pro-dashboard.md`](../en/pages/18-pro-dashboard.md) (deep
spec — full page: shell, Overview, Analytics, Leads, Promoted, Bulk Upload,
Team, Billing). This document does **not** repeat that spec in full; it pins
down the **current task's MVP scope** (shell + Overview + Analytics only, per
§0 below) and closes the gap between the generic spec's Tailwind sketch and
*this specific codebase's* actual, current design system.

## 0. Why this document replaces the previous version of itself

A first pass of this page (shell, `OverviewKpis`, `AnalyticsCharts`, the
`/api/pro/overview` and `/api/pro/analytics` route handlers, the zod schemas,
the data-fetch logic) is **already implemented and merged on this branch**
(`components/pro/*`, `app/api/pro/*`, `lib/pro-dashboard/*`,
`store/proDashboardStore.ts`, `app/[locale]/pro/dashboard/**`). It was built
against a prior version of this same handoff document, written at a point
where `components/ui/` and `components/motion/` **did not yet exist** on this
branch — that document's own D1 said so explicitly and built everything from
hand-rolled Tailwind (`bg-white border border-gray-200`, `text-gray-500`,
`animate-pulse`, a bespoke `components/pro/FadeIn.tsx`, etc.).

Since then, **`main` gained the "Design system foundation" work** (tokens in
`app/globals.css` `@theme`, `components/ui/*`, `components/motion/*`,
documented in root `DESIGN_SYSTEM.md`) — this branch was cut before that
landed, so it isn't reflected in the code that's already merged here.
Root `CLAUDE.md`'s reviewer checklist now enforces, repo-wide: *"Compose UI
from `components/ui` primitives... flag ad-hoc reimplementations,"* and
*"Animate only via `components/motion` primitives... flag direct
`framer-motion` usage in page/feature code that bypasses these."* The
already-shipped Page 18 code predates that rule and doesn't follow it.

**This document is the restyle spec**: it keeps every already-working piece
of architecture (component tree, file layout, the `/api/pro/*` contracts,
zod schemas, RLS-scoped queries, React Query wiring, the Zustand range
store — none of that changes, none of it is wrong) and re-specifies **only
the visual/presentational layer** — which token/primitive replaces which
hand-rolled `<div className="bg-white border border-gray-200 ...">` — so a
follow-up dev pass can restyle in place without re-deriving any data logic.
§10 is a concrete file-by-file diff list for that pass.

**MVP scope (unchanged):** shell (sidebar + topbar) + Overview (§3.1 of the
page spec) + Analytics (§3.2). **Explicitly out of scope** — do not build,
do not add nav items or dead links for: Leads inbox, Promoted listings
manager, Bulk CSV upload, Team management, Billing panel, Stripe/payment
integration, Supabase Realtime, the Premium-only Traffic-sources pie chart,
`[Export CSV]`. The sidebar lists **only** "Overview" and "Analytics."

---

## 1. Design-system cheat sheet for this page

Confirmed against `DESIGN_SYSTEM.md` + `app/globals.css` (`@theme`) +
`components/ui/*` + `components/motion/*` on `main` (commit `8a7171e`,
"Design system foundation — tokens, primitives, motion, styleguide").

| Need | Use |
|---|---|
| Page/content background | `bg-bg` (outer), `bg-surface` (cards/panels — aliases white) |
| Borders | `border-border` |
| Body text / headings | `text-text` |
| Secondary/help text | `text-muted` |
| Positive trend | `text-success` (never color alone — pair with an icon, §4) |
| Negative trend | `text-danger` |
| Neutral/flat trend | `text-muted` |
| Brand actions, Pro tier accent | `bg-primary`, `text-primary`, `text-primary-fg` |
| Premium tier accent / highlight | `bg-accent`, `text-accent-fg` (amber) |
| Panel/card shell | `Card` (`components/ui/Card.tsx`) — `rounded-lg border-border bg-surface shadow-sm` baked in |
| Pills (tier badge) | `Badge` (`components/ui/Badge.tsx`) — `variant="primary"` (Pro) / `variant="accent"` (Premium) |
| Buttons / button-styled links | `Button` (`components/ui/Button.tsx`) visual classes (`variant="primary"`) |
| Segmented range control | `Tabs` (`components/ui/Tabs.tsx`) — same primitive `PricingFaq.tsx` uses for its category filter |
| Loading placeholders | `Skeleton` (`components/ui/Skeleton.tsx`) — `animate-pulse rounded-md bg-neutral-200` baked in |
| Formula/glossary hints | `Tooltip` (`components/ui/Tooltip.tsx`) |
| Grid/list entrance + stagger | `Stagger` (`components/motion/Stagger.tsx`) |
| Single-element entrance (headings) | `FadeIn` (`components/motion/FadeIn.tsx`) |
| Reduced motion | Automatic — every `components/motion/*` wrapper already calls `useReducedMotion()`; **do not** hand-roll a `motion-reduce:` variant like the old `components/pro/FadeIn.tsx` did |

**Not used on this page, and why:**

- **`Dialog`** — considered for the mobile nav drawer, rejected: `Dialog` is a
  centered, portal-rendered modal (`fixed inset-0 flex items-center
  justify-center`, no directional slide, no left-anchor option). The Pro
  Dashboard's mobile drawer is a left-anchored sliding panel controlled by a
  boolean (`drawerOpen`) — a different interaction shape. Keep it hand-rolled
  (§3.1), same as `DashboardSidebar.tsx`'s drawer (still the only precedent
  for this exact pattern anywhere in the app), but rebuilt on tokens instead
  of raw grays (§3.1 table).
- **`SlideIn` / `Reveal`** — both trigger off `whileInView` (scroll
  intersection), not a controlled `open` boolean, so neither can drive the
  drawer's open/close transition. Keep the drawer's open/close as plain
  Tailwind `transition-transform duration-300` gated by React state — this
  matches `DESIGN_SYSTEM.md`'s own guidance ("simple hover/tap... → plain
  Tailwind," "Route-level page transitions are planned; they'll be wired
  into the layout during page integration" — a controlled drawer toggle is
  exactly that unsolved case today, not a gap specific to this page).
- **`Field` / `Input` / `Select`** — no form inputs on this page (MVP scope
  has no filters beyond the range control, which is a `Tabs` group, not a
  `<select>`).

---

## 2. Section-by-section spec

### 2.1 `ProDashboardShell` (desktop sidebar + topbar + mobile drawer)

*File: `components/pro/ProDashboardShell.tsx`, `ProSidebar.tsx`,
`ProTopbar.tsx`, `TierBadge.tsx` — structure unchanged, restyle only.*

**Desktop sidebar** (`aside`, `w-60`, sticky):
- Wrapper: `border-r border-border bg-surface` (was `border-gray-200
  bg-white`).
- Nav item (`ProSidebar`'s `<Link>`): unchanged shape (`flex items-center
  gap-3 px-4 h-10 rounded-md text-sm transition-colors duration-100
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`).
  Active: `bg-primary/10 text-primary font-medium` — already token-correct,
  no change. Inactive: `text-text hover:bg-neutral-100` (was `text-gray-700
  hover:bg-gray-50`).
- `<nav aria-label="Pro dashboard">`, active item `aria-current="page"` —
  unchanged (page spec §7, already correct).

**Mobile drawer** (hamburger + overlay + sliding panel — see §1 for why this
stays hand-rolled instead of `Dialog`):
- Trigger button: `bg-surface border-border text-text hover:bg-neutral-100
  focus-visible:ring-2 focus-visible:ring-primary` (was `bg-white
  border-gray-200 text-gray-700 hover:bg-gray-50`).
- Overlay: `bg-text/50` (was `bg-black/40` — matches `Dialog`'s own overlay
  token exactly, `data-dialog-overlay` in `Dialog.tsx` uses `bg-text/50`, so
  this keeps the "scrim" color consistent between the one hand-rolled
  overlay on this page and the shipped `Dialog` primitive elsewhere).
- Panel: `bg-surface shadow-lg` (was `bg-white shadow-xl` — `shadow-lg` is
  the largest documented shadow token; there is no `shadow-xl` token, don't
  invent one). Header border: `border-border`. Close button: `text-muted
  hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-primary`.
- Panel width (`w-72`), z-index (`z-50`), and the open/close
  `translate-x-0`/`-translate-x-full` `transition-transform duration-300`
  mechanism are all unchanged (§1 — controlled toggles stay plain Tailwind).
- Mobile drawer nav items use `h-11` (44px touch target) vs. the desktop
  `h-10` — unchanged from the current implementation, still correct per page
  spec §7.

**Topbar** (`h-14 border-b`, tier badge + range control):
- Wrapper: `border-b border-border` (was `border-gray-200`).
- **Tier badge** — replace the custom `TierBadge`'s hand-rolled `<span>` +
  `TIER_STYLES` map with `Badge`:
  ```tsx
  import Badge from '@/components/ui/Badge'

  {tier !== 'free' && (
    <Badge
      variant={tier === 'premium' ? 'accent' : 'primary'}
      className="h-6 font-semibold capitalize"
    >
      {tier}
    </Badge>
  )}
  ```
  **Deliberate deviation from `AgentHeader.tsx`'s `TIER_STYLES`** (`pro:
  bg-violet-100 text-violet-700`, `premium: bg-amber-100 text-amber-700`,
  the pattern the *previous* version of this doc told you to copy
  verbatim): violet has **no token** in `app/globals.css`'s `@theme` block —
  copying it would hard-code an undocumented hex-backed color into new code,
  which the current `CLAUDE.md` reviewer checklist explicitly flags. Map
  instead onto the two documented brand tokens: **Pro → `Badge
  variant="primary"`** (deep blue — the base brand tier), **Premium →
  `Badge variant="accent"`** (amber — `DESIGN_SYSTEM.md`'s accent token is
  literally described as "highlights... etc.," and Premium is the
  highlighted upsell tier). Do not backport this fix into `AgentHeader.tsx`
  — that file is out of scope for this task; flag it to the design-system
  maintainers as a follow-up if consistency across the two tier badges
  matters later.
- **Range control** — replace the hand-rolled segmented-control `<div
  className="flex gap-1 rounded-lg bg-gray-100 p-1">...` with the `Tabs`
  primitive (`components/ui/Tabs.tsx`), the same component
  `components/pro/PricingFaq.tsx` already uses for its category filter (a
  functionally identical "mutually-exclusive filter that re-fetches
  content" interaction, not a distinct-panels tab bar — same justification
  that precedent already established):
  ```tsx
  import Tabs from '@/components/ui/Tabs'

  <Tabs
    label="Date range"
    options={[
      { value: '7d', label: '7d' },
      { value: '30d', label: '30d' },
      { value: '90d', label: '90d' },
    ]}
    value={range}
    onChange={(v) => setRange(v as ProDateRange)}
  />
  ```
  This gives roving-tabindex keyboard nav (←/→/Home/End) for free, which the
  old hand-rolled segmented control didn't have — a strict a11y upgrade, not
  just a restyle. Visual note: `Tabs` renders individual rounded-full pill
  buttons (active = solid `bg-primary` fill) rather than the page spec's
  sketched "single grouped track" segmented control — accept the shipped
  primitive's look rather than forking a new one; it's still a 3-option
  low-stakes range picker either way.

### 2.2 Overview — KPI grid

*File: `components/pro/OverviewKpis.tsx`, `KpiCard.tsx`, `Sparkline.tsx`.*

- Page heading (`app/[locale]/pro/dashboard/page.tsx`'s `<h1>`): `text-text`
  (was `text-gray-900`), wrap in `FadeIn` (`components/motion/FadeIn.tsx`,
  default `delay={0}`) for a small on-mount lift — the one-line heading is
  the page's first thing to read, worth a beat of polish.
- Grid wrapper: unchanged `grid grid-cols-2 lg:grid-cols-6 gap-3` (page spec
  §3.1, exact class — a token-neutral layout class, nothing to migrate).
- **Entrance/stagger**: replace the bespoke `components/pro/FadeIn.tsx` +
  manual `delayMs={Math.min(i, 5) * 40}` loop with `Stagger`
  (`components/motion/Stagger.tsx`, default `gap={0.08}`) wrapping the whole
  card set — `Stagger` already fades+lifts each direct child in sequence,
  which is exactly what the manual per-index-delay loop was hand-building:
  ```tsx
  import Stagger from '@/components/motion/Stagger'

  <Stagger>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  </Stagger>
  ```
  Note `Stagger` staggers its **direct children**, so it wraps the *grid*
  as a single child here (one fade-in for the whole grid) rather than each
  card individually — for a per-card stagger, restructure so each `KpiCard`
  is a direct child of `Stagger` and let `Stagger`'s own CSS grid className
  do the layout (`<Stagger className="grid grid-cols-2 lg:grid-cols-6
  gap-3">` if a `className` passthrough is added to `Stagger`, or keep the
  grid wrapper and accept the whole-grid single fade — **developer's call**,
  both are reasonable; the whole-grid fade is simpler and still reads as
  "entrance," per-card stagger is closer to the page-spec/task's explicit
  "staggered lists" ask. Prefer per-card if `Stagger` already supports a
  `className` prop passthrough (check current `Stagger.tsx` signature before
  assuming); if not, that's a one-line addition to the shared primitive, not
  a page-specific fork.
- Delete `components/pro/FadeIn.tsx` once `Stagger` covers both Overview and
  Analytics (§2.3) — it's a dead duplicate of `components/motion/FadeIn.tsx`
  once nothing imports it, and `CLAUDE.md`'s hygiene rule is "flag ad-hoc
  reimplementations."
- **`KpiCard`** — replace the hand-rolled `<div className="bg-white
  border border-gray-200 rounded-xl p-4 flex flex-col gap-1">` with `Card`:
  ```tsx
  import Card from '@/components/ui/Card'

  <Card className="p-4 flex flex-col gap-1">
    <span className="text-sm text-muted">{label}</span>
    <span className="text-2xl font-bold text-text leading-none">{value}</span>
    {/* trend row, below */}
    {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} />}
  </Card>
  ```
  `variant="default"` (the `Card` default) — **not** `interactive`: KPI
  cards have no per-KPI drill-down route in this task's scope, so no hover
  shadow/cursor-pointer (unchanged reasoning from the prior version of this
  doc — a card that looks clickable but does nothing is worse than a static
  one).
- **Trend row** — icon + colored text, never color alone (page spec §7,
  unchanged requirement). Only the *color source* changes:
  | Direction | Old (hand-rolled) | New (token) |
  |---|---|---|
  | Up | `text-green-600` | `text-success` |
  | Down | `text-red-500` | `text-danger` |
  | Neutral | `text-gray-400` | `text-muted` |
  Icons (`ArrowUp`/`ArrowDown`/`Minus` from `lucide-react`) and the
  `aria-label` summarizing direction in words ("Up 12% versus previous
  period") are unchanged — already correct.
- **`Sparkline`** — already token-compliant (`text-primary` stroke,
  `text-primary/10` fill via `currentColor`), **no change needed**. Stays
  `aria-hidden="true"` (decorative — the KPI number + trend text already
  carry the meaning accessibly).
- **Conversion rate** — add a `Tooltip` (`components/ui/Tooltip.tsx`) on the
  label clarifying the formula, a small "modern-premium" polish detail with
  zero new dependency:
  ```tsx
  <Tooltip content="Contact clicks ÷ views for the selected period">
    <span className="text-sm text-muted underline decoration-dotted underline-offset-2 cursor-help">
      Conversion rate
    </span>
  </Tooltip>
  ```

### 2.3 Analytics — chart panels + Top listings table

*File: `components/pro/AnalyticsCharts.tsx`, `TopListingsTable.tsx`.*

- Page heading: same `FadeIn` treatment as Overview's (§2.2).
- **Chart panel wrapper** — replace `<div className="bg-white border
  border-gray-200 rounded-xl p-4 h-72">` with `Card`:
  ```tsx
  <Card className="p-4 h-72">
    <p className="text-sm font-medium text-text mb-2">{title}</p>
    <div role="img" aria-label={ariaLabel} className="h-56">
      <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      <table className="sr-only">…</table> {/* unchanged — page spec §7 */}
    </div>
  </Card>
  ```
- **Recharts styling** — `stroke-primary` / `fill-primary/10` (favorites
  area), `fill-primary` (bar), `stroke-primary` (line) are **already
  token-compliant** (Tailwind v4 generates `stroke-*`/`fill-*` utilities for
  every `@theme` color, including `primary`) — no change. `CartesianGrid`'s
  `stroke="#E5E7EB"` is a raw hex on an SVG element prop (not a `className`,
  so it can't take a Tailwind utility directly) — replace with the
  `--color-border` token's resolved value via a CSS variable instead of a
  literal hex, e.g. `stroke="var(--color-border)"` (SVG `stroke` accepts any
  valid CSS color, and `--color-border` is already defined on `:root` by the
  `@theme` block) — same visual result, zero hard-coded hex.
- **Stack + stagger**: same `Stagger` treatment as §2.2 — wrap the 4 chart
  panels + `TopListingsTable` (5 direct children) in one `Stagger`,
  replacing the bespoke per-index `FadeIn`/`delayMs` loop. Because
  `Stagger`'s `whileInView` fires per-child as *that child* scrolls into
  view (not just once for the whole group — confirm against
  `Stagger.tsx`'s actual `viewport` wiring: the container has `whileInView`,
  children read `variants` from the container's stagger orchestration, so
  in practice the reveal is gated by the *container* entering view, not
  each child individually — verify this against the live component before
  relying on true per-child scroll-reveal for panels far below the fold; if
  the container is short enough to intersect the viewport in one shot on
  most screens, this is moot). Either way this satisfies the task's
  "scroll-reveal" ask for the taller Analytics stack without a separate
  `Reveal` wrapper.
- **`TopListingsTable`** — wrapper `<div className="bg-white border
  border-gray-200 rounded-xl overflow-x-auto">` → `<Card className="p-0
  overflow-x-auto">` (padding zeroed since table cells carry their own
  `p-3`). Header cell `text-xs uppercase text-gray-500` → `text-muted`.
  Body cell `text-gray-900` → `text-text`. Row hover `hover:bg-gray-50` →
  `hover:bg-neutral-100`. Row/cell borders `border-gray-100` →
  `border-border` (the codebase has no separate "hairline" border token —
  reuse the one documented `border-border`, don't invent a lighter shade).
  Add a `Tooltip` on the "CTR" header cell (`Contact clicks ÷ views`), same
  formula-hint pattern as §2.2's Conversion rate.
- **Loading**: replace `<div className="bg-white border border-gray-200
  rounded-xl p-4 h-72 bg-gray-100 animate-pulse" />` with `<Skeleton
  className="h-72 w-full rounded-lg" />` — `Skeleton` already bakes in
  `animate-pulse rounded-md bg-neutral-200`; override to `rounded-lg` via
  `className` (merged safely through `cn`/`twMerge`) to match `Card`'s own
  radius so the loading→loaded swap doesn't visibly change corner radius.
  Same for `OverviewKpis`'s `SkeletonCard` — `<Skeleton className="h-24
  rounded-lg" />` (or compose two: a `h-6 w-12` bar + a `h-4 w-20` bar
  inside a `Card`, closer to the current two-bar skeleton shape — either is
  fine, `Skeleton` is a plain placeholder primitive with no internal
  structure to preserve).

### 2.4 Free-tier locked overlay

*File: `components/pro/UpgradeOverlay.tsx` — wraps each KPI card / chart
panel individually, keeping the grid/stack shape identical between Free and
Pro views (unchanged structural decision).*

- Scrim: `absolute inset-0 backdrop-blur-sm bg-surface/60 rounded-lg
  flex flex-col items-center justify-center gap-3 text-center px-4` (was
  `bg-white/60 rounded-xl` — `bg-surface/60` is the token-correct
  equivalent of translucent white; `rounded-lg` matches `Card`'s radius
  since the wrapped content is now a `Card`).
- Copy: `text-sm text-muted max-w-xs` (was `text-gray-600`).
- CTA — still a real, focusable `<Link href="/pro">` (page spec §7: "a
  clear upgrade link... never blur-only" — must stay a genuine anchor, not
  a `Button` `onClick`, so it's crawlable/right-click-openable). Replicate
  `Button`'s `variant="primary" size="md"` visual output on the `<Link>`
  directly, since `Button` renders a native `<button>` and has no
  polymorphic `as`/`asChild` prop to swap the element type:
  ```tsx
  <Link
    href="/pro"
    className="inline-flex items-center justify-center gap-2 rounded-md font-medium
               bg-primary text-primary-fg hover:bg-primary/90 shadow-sm
               transition-colors focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-primary/40 h-11 px-4 text-sm"
  >
    Upgrade to Pro
  </Link>
  ```
  (Exact copy of `Button.tsx`'s `primary`/`md` cva output — keep the two in
  sync by hand since there's no shared export today; if a third page needs
  a button-styled `Link`, that's the trigger to add a
  `buttonVariants()`-style exported class-builder to `components/ui/Button.tsx`
  rather than a third copy-paste.)
- `aria-disabled="true"` + `inert` on the wrapped content, `pointer-events-
  none select-none` — all unchanged, already correct (page spec §7).

### 2.5 Empty state ("Not enough data yet")

*File: `components/pro/EmptyProStats.tsx`.*

- Wrap the existing centered content (icon-in-circle + heading + body) in a
  `Card` (`className="py-14"` to keep the current generous vertical
  padding) rather than leaving it as a bare, borderless block — with the
  KPI grid / chart stack it replaces both being sets of `Card`s, a bordered
  panel reads as a more deliberate, "designed" empty state than content
  floating directly on `bg-bg`, and costs nothing extra.
- Icon circle: `bg-neutral-100` (was `bg-gray-50`) wrapping the `TrendingUp`
  icon at `text-neutral-300` (was `text-gray-300`). **Note:** this is a
  raw neutral-scale step, not a semantic token — deliberately, per
  `DESIGN_SYSTEM.md`'s own carve-out language ("Use the semantic tokens...
  *rather than* reaching for a raw `neutral-*` step" is a preference, not an
  absolute ban, and there's no semantic token for "faint decorative icon
  tint"; `text-muted` at neutral-500 would read too dark/prominent for a
  purely decorative glyph here). Heading `text-text` (was `text-gray-900`),
  body `text-muted` (was `text-gray-500`).

### 2.6 Error + retry (per-widget)

Unchanged structurally (one widget failing doesn't blank the whole
dashboard — page spec intent, already correct). Restyle only: message
`text-muted` (was `text-gray-500`), retry link `text-primary hover:underline
focus-visible:ring-2 focus-visible:ring-primary` — already token-correct,
no change needed (this one was already using `text-primary`, not a raw hex,
in the current implementation).

---

## 3. Micro-interactions & motion summary

| Interaction | Primitive / technique |
|---|---|
| Sidebar nav item hover | Plain Tailwind `transition-colors duration-100` (per `DESIGN_SYSTEM.md`: simple hover/tap feedback doesn't need a motion wrapper) |
| Range `Tabs` hover/focus/keyboard | Built into `Tabs` — roving tabindex, `focus-visible:ring-2 ring-primary` |
| Page `<h1>` on mount | `FadeIn` (`delay={0}`) |
| KPI grid entrance + stagger | `Stagger` (`gap={0.08}` default) wrapping the 6 `KpiCard`s (or the grid as one child — §2.2 developer's-call note) |
| Chart panels + Top listings table entrance/scroll-reveal | `Stagger` wrapping the 4 panels + table (5 children) |
| Mobile drawer open/close | Plain Tailwind `transition-opacity` (overlay) / `transition-transform` (panel), controlled by `drawerOpen` boolean — not a `components/motion` primitive (§1 rationale) |
| Table row hover | `hover:bg-neutral-100 transition-colors` |
| Loading skeletons | `Skeleton` primitive (`animate-pulse` baked in) |
| Tooltip (Conversion rate, CTR) | `Tooltip` primitive, hover/focus-triggered |
| Reduced motion | Automatic via every `components/motion/*` wrapper's `useReducedMotion()` — no page-specific handling needed, and don't reintroduce the old manual `motion-reduce:` class the bespoke `components/pro/FadeIn.tsx` had (delete that file, §2.2) |

---

## 4. States (unchanged from the shipped behavior — restyle only)

| State | What renders |
|---|---|
| **Loading** | `Skeleton`-based KPI cards / chart panels (§2.2, §2.3) |
| **Loaded (Pro or Premium)** | Full live widgets — no visual distinction between the two tiers beyond the topbar's `Badge` color (Premium-only extras are out of scope, §0) |
| **Free tier** | Every KPI card / chart panel individually wrapped in `<UpgradeOverlay locked>` (§2.4) — `GET /api/pro/overview` / `GET /api/pro/analytics` return `403 { error: "tier_insufficient" }`; the client renders the overlay from that response, never fetch-then-hide |
| **Empty (new Pro agent, zero stats)** | `EmptyProStats` (§2.5), shown only when the API returns a genuinely empty series/zeroed KPIs for a Pro/Premium caller — distinct from the 403 locked state |
| **Error (per-widget)** | §2.6 |

---

## 5. Responsive (unchanged breakpoints, tokens only)

- **≥1024px (lg).** Sidebar `w-60` sticky; KPI grid 6-col; chart panels
  full-width, stacked `space-y-4`.
- **<1024px.** Sidebar → hamburger drawer (§2.1); KPI grid stays
  `grid-cols-2` down to the smallest width tested (page spec §3.1); chart
  panels remain full-width (`ResponsiveContainer` handles the resize, no
  horizontal scroll needed at `h-72`/`h-56`); `TopListingsTable`'s `Card`
  wrapper keeps `overflow-x-auto` with `min-w-[560px]` on the inner
  `<table>` for horizontal scroll on narrow phones.

---

## 6. Accessibility (unchanged requirements, confirms nothing regresses)

Every item below was already correct in the shipped implementation and
stays correct after the token/primitive migration — restyling doesn't touch
markup semantics:

- `ProSidebar`'s `<nav aria-label="Pro dashboard">`, active item
  `aria-current="page"`.
- `Tabs`' native roving-tabindex + `aria-selected` (an upgrade over the old
  hand-rolled `aria-pressed` buttons — real tab-list keyboard semantics for
  free, §2.1).
- KPI trend: icon + colored text + `aria-label` summarizing direction in
  words — color token changes (`text-success`/`text-danger`/`text-muted`)
  don't change the contrast story: `--color-success`/`--color-danger` are
  new tokens introduced by the design-system foundation and were audited
  there for 4.5:1 contrast on `bg-surface`; no new audit needed here.
- Charts: `role="img"` + `aria-label` per panel + `<table class="sr-only">`
  fallback (page spec §7) — unchanged.
- `UpgradeOverlay`: `aria-disabled="true"` + `inert` on content, real
  focusable `<Link>` CTA (never blur-only) — unchanged.
- Touch targets: mobile drawer nav items `h-11` (44px); desktop `h-10`
  (mouse-only, fine); `Tabs` options — check the rendered height against the
  44px guidance now that `Tabs` (not the old bespoke `h-7` segmented
  control) owns this control; if `Tabs`' own height is below 44px, that's a
  primitive-level fix, not a page-specific override.

---

## 7. SEO & meta (unchanged)

```ts
// app/[locale]/pro/dashboard/layout.tsx — already correct, no change
export const metadata: Metadata = {
  title: 'Pro dashboard | RE Platform',
  robots: { index: false, follow: false },
}
```

---

## 8. Developer handoff checklist (restyle pass — file-by-file)

- [ ] `components/pro/ProDashboardShell.tsx` — token classes for the aside/
      drawer/overlay/trigger button (§2.1).
- [ ] `components/pro/ProSidebar.tsx` — inactive-item token classes (§2.1).
- [ ] `components/pro/ProTopbar.tsx` — swap the hand-rolled segmented
      control for `Tabs` (§2.1); swap `TierBadge`'s render for `Badge`
      (§2.1) or fold `TierBadge.tsx` into a two-line wrapper around `Badge`.
- [ ] `components/pro/TierBadge.tsx` — delete the `TIER_STYLES` map, render
      `Badge variant={tier === 'premium' ? 'accent' : 'primary'}` (§2.1).
- [ ] `components/pro/KpiCard.tsx` — swap the outer `<div>` for `Card`,
      trend colors → `text-success`/`text-danger`/`text-muted` (§2.2).
- [ ] `components/pro/OverviewKpis.tsx` — swap `components/pro/FadeIn`
      usage for `Stagger`; skeleton `<div>`s → `Skeleton`; add the
      Conversion-rate `Tooltip` (§2.2).
- [ ] `components/pro/AnalyticsCharts.tsx` — swap `ChartPanel`'s outer
      `<div>` for `Card`; `CartesianGrid`'s `stroke="#E5E7EB"` →
      `stroke="var(--color-border)"`; swap `FadeIn`/stagger loop for
      `Stagger`; skeleton panels → `Skeleton` (§2.3).
- [ ] `components/pro/TopListingsTable.tsx` — swap the outer `<div>` for
      `Card`, token text/border/hover classes, add the CTR `Tooltip`
      (§2.3).
- [ ] `components/pro/UpgradeOverlay.tsx` — token scrim/copy classes,
      replicate `Button` `primary`/`md` classes on the `<Link>` CTA (§2.4).
- [ ] `components/pro/EmptyProStats.tsx` — wrap in `Card`, token icon/text
      classes (§2.5).
- [ ] `components/pro/FadeIn.tsx` — **delete** once `Stagger` covers both
      Overview and Analytics entrances (§2.2).
- [ ] `app/[locale]/pro/dashboard/page.tsx` /
      `app/[locale]/pro/dashboard/analytics/page.tsx` — `<h1>` token class +
      `FadeIn` wrap (§2.2, §2.3).
- [ ] No change needed: `app/api/pro/overview/route.ts`,
      `app/api/pro/analytics/route.ts`, `lib/pro-dashboard/*`,
      `store/proDashboardStore.ts`, `app/[locale]/pro/dashboard/layout.tsx`
      (auth/tier guard), existing tests in `__tests__/proOverviewRoute.test.ts`
      / `__tests__/proDashboardComponents.test.tsx` — this is a
      presentation-layer restyle; if any of those tests assert on the exact
      class strings being replaced above, update the assertions to match,
      but don't touch the logic they're testing.
- [ ] After the restyle, this branch should be rebased onto (or merged
      with) `main` past `8a7171e` so `components/ui/*` and
      `components/motion/*` actually exist on this branch to import from —
      they don't yet (§0).

---

## 9. Explicitly out of scope — flag in review if present

Per §0: Leads inbox, Promoted listings manager, Bulk CSV upload, Team
management, Billing panel, Stripe/payment-provider integration, Supabase
Realtime, Traffic-sources pie chart, `[Export CSV]`, any sidebar nav item or
route for the sections above. Also out of scope for *this* document: adding
a `buttonVariants()` export to `components/ui/Button.tsx`, adding a
`Drawer` primitive to `components/ui/`, adding a `className` passthrough to
`Stagger`, and backporting the `Badge`-based tier colors into
`AgentHeader.tsx` — all flagged above as follow-ups for whoever owns the
shared design system, not this page's task.
