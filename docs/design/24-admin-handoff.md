# Page 24 — Admin Panel MVP (Shell + Dashboard + Moderation): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/24-admin.md`](../en/pages/24-admin.md) — read that first for the
full 8-section vision, all scenarios, and the generic API contracts. **This task
builds only the auth-guarded shell, a minimal Dashboard, and the Moderation
queue** (per the task brief) — Users, Reports, Listings, Content, Locations and
Settings are explicitly out of scope and must not be built. This document closes
the gap between the generic page spec and *this specific codebase*: exact
components to create, exact Tailwind classes and `lucide-react` icons already in
use elsewhere in the app, and the concrete motion technique to use given this
codebase has no animation library.

Audited against the current tree: `components/dashboard/DashboardSidebar.tsx`
(sticky sidebar + mobile drawer — the direct precedent for `AdminSidebar`),
`components/dashboard/OverviewCards.tsx` (stat-card grid precedent for the
Dashboard), `components/dashboard/MyListings.tsx` + `ListingRow.tsx` +
`DeleteConfirmModal.tsx` (React Query + optimistic mutation + toast + confirm-modal
precedent for the Moderation queue and Reject flow), `components/messages/EmptyInbox.tsx`
(empty-state visual convention), `app/[locale]/dashboard/layout.tsx` (the exact
server-side auth-guard pattern to copy for `AdminLayout`), `app/globals.css`
(Tailwind v4 `@theme` — only two custom tokens exist: `--color-primary` (`#2563eb`)
and `--font-sans`; everything else is stock Tailwind gray/green/red/amber scales),
`supabase/migrations/0001_init.sql` (`properties.status` CHECK constraint, `profiles.role`
CHECK constraint, `property_media` table), `lib/utils.ts` (`cn()`).

**Stack confirmed: no `components/ui` primitives library and no `components/motion`
wrapper library exist anywhere in this codebase** — every screen is hand-built with
Tailwind utility classes, `clsx`/`tailwind-merge` (`cn()`), `lucide-react` icons, and
plain CSS transitions gated by React state (no `framer-motion`, no
`tailwindcss-animate` plugin). This is the same conclusion reached by the
`26-virtual-tour-viewer-handoff.md` and `22-notifications-handoff.md` audits. **This
spec follows that convention and does not introduce a UI/motion library.** Every
"animation" below is a Tailwind `transition-*` class toggled by a boolean/mount
state, exactly like `DashboardSidebar`'s existing mobile drawer.

---

## 1. Design decisions that deviate from / clarify the generic page spec

| # | Page-spec says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | "Charts (Recharts)", date-range filter, Views/Revenue/Leads cards | **Not built.** Task scope is 3 stat cards only: Users total, Listings by status, Attention (pending moderation count). No charts, no date filter. | Explicit task scope cut — MVP only. Keep the dashboard to a single `stats` query, no new chart dependency. |
| D2 | Sidebar shows all 8 sections, each a working route with live badge counts | **6 of 8 nav items (Users, Reports, Listings, Content, Locations, Settings) are rendered but disabled** — same visual treatment `DashboardSidebar.tsx` already uses for its own "Saved searches" item (`text-gray-400 cursor-not-allowed pointer-events-none`, `aria-disabled="true"`, no `href` navigation). A small `Soon` pill replaces the badge slot. | Lower-effort option per the task brief (placeholder pages vs. unlinked items) — disabled items need zero new routes/pages, and the pattern already exists verbatim in this codebase, so it costs nothing to add and never 404s. **Note this choice in the PR** as the brief requests. |
| D3 | Sidebar badge = live pending count via `refetchInterval: 30s` | Kept, but **only for the Moderation item** (Reports doesn't exist yet in this task). Badge reuses the exact `Badge` component/markup already in `DashboardSidebar.tsx` (`ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-[1.25rem] h-5 …`). | One real badge, not five fake ones. Reuse, don't fork, the existing badge component. |
| D4 | `status IN ('active','draft','pending','archived','sold')` doesn't include `rejected` (see `supabase/migrations/0001_init.sql:53`) | **Data-model gap for the developer**, flagged here because it changes the status-badge palette below: the reject migration must extend the CHECK constraint (or the reject API will violate it). Add `'rejected'` to the constraint in the same migration that creates `admin_actions`. | Caught during design audit; not a UI decision, but blocks the UI from ever showing a "Rejected" badge if skipped. |
| D5 | Top bar has global search + full avatar dropdown (`Profile / Audit log / Sign out`) | **MVP top bar has no global search and no dropdown menu** — just the brand, the "↗ To site" link, and a single sign-out affordance next to an avatar chip (no `Profile`/`Audit log` items, those pages don't exist in this task). | Users/Reports/audit-log pages are out of scope; a dropdown with two dead entries would be worse than a plain sign-out button. Avatar chip visual reuses the initials-circle convention from `AgentReviews.tsx`/`ThreadHeader.tsx` (`w-8 h-8 rounded-full bg-gray-100 …`), inverted for the dark top bar (see §4.1). |
| D6 | Preview drawer shows "the full listing as it would appear on the property page" (gallery, map, etc.) | **Simplified detail panel**, per the task brief's "drawer is nice-to-have, not required": show only the key fields listed in the acceptance criteria (cover, title, owner, price, status, created date, description excerpt, city/address) in a static `<dl>` layout — no gallery carousel, no embedded map. Still uses the slide-in drawer chrome (see §4.3) since that chrome is cheap to build (it's a copy of `DashboardSidebar`'s existing mobile-drawer shell) and reads as more "premium" than an inline expand. | Matches task scope while keeping the promised drawer polish at near-zero extra cost — the shell is already written once for the mobile nav drawer. |
| D7 | Routing: spec URL is `/admin` (no locale segment) | This app locale-prefixes every page (`app/[locale]/…`) and `middleware.ts`'s matcher (`'/((?!api|_next|_vercel|.*\\..*).*)'`) runs `next-intl`'s middleware over everything, including `/admin`, unless excluded. **Recommended (lower-effort): place the panel at `app/[locale]/admin/…`**, i.e. real URLs are `/en/admin`, `/hy/admin`, etc. All admin copy stays English-only regardless of the locale segment (this is an internal tool, not translated — do not add admin strings to `messages/*.json`). Document the exact URL chosen in the PR. | Avoids touching `middleware.ts`'s matcher/locale-detection logic (higher risk, cross-cutting) for an internal tool where the URL segment doesn't matter to anyone. If the team prefers a locale-free `/admin`, that requires a matcher exclusion — flag it as a follow-up, don't do it silently in this task. |
| D8 | "Confirm modal" bare word for reject | Reject reason capture reuses the **`DeleteConfirmModal.tsx` shell** (overlay + centered `role="dialog"` card, focus-trap-on-cancel, Escape-to-close, backdrop-click-to-close) but swaps the body for a reason `<select>` (zod enum) + optional note `<textarea>`, and swaps the icon tint from red (delete) to amber (reject-is-less-destructive-than-delete but still needs a reason) as detailed in §4.4. | Reuse the exact interaction shell that already ships and is already accessible; only the content and one color token change. |

---

## 2. Component inventory (new files)

```
app/[locale]/admin/
  layout.tsx                        (NEW — Server Component: auth guard, noindex metadata, renders AdminTopBar + AdminSidebar + children)
  page.tsx                          (NEW — Server Component: fetches real counts, renders <DashboardStats />)
  moderation/
    page.tsx                        (NEW — Server Component shell: auth already guarded by layout; renders <ModerationQueue />)
  forbidden/
    page.tsx                        (NEW — the 403 "Access denied" page content; see §4.6. Rendered directly by the layout guard, not navigated to — see D7 note in dev notes on how Next 15 route guards typically render in-place rather than redirect, so the exact file may instead be inlined in layout.tsx. Either is fine; keep the visual spec in §4.6.)

components/admin/
  AdminTopBar.tsx                    (NEW — Server Component; brand + "↗ To site" + <AdminSignOutButton />)
  AdminSignOutButton.tsx             (NEW — Client Component; the only interactive piece of the top bar, mirrors DashboardSidebar's handleSignOut)
  AdminSidebar.tsx                   (NEW — Client Component; desktop sticky nav + mobile drawer, direct fork of DashboardSidebar.tsx's shape)
  AdminNavBadge.tsx                  (NEW — thin wrapper around the existing Badge markup, or import/reuse if extracted)
  DashboardStats.tsx                 (NEW — Client Component; React Query stat cards + empty state)
  StatCard.tsx                       (NEW — single stat card, styled per OverviewCard precedent)
  ModerationQueue.tsx                 (NEW — Client Component; React Query list, oldest-first, row click → drawer, tabs N/A for MVP — pending only)
  ModerationRow.tsx                   (NEW — one queue row, desktop table row / mobile stacked card)
  ListingPreviewDrawer.tsx           (NEW — slide-in detail panel, D6)
  RejectReasonModal.tsx              (NEW — reason <select> + note <textarea>, forked from DeleteConfirmModal shell, D8)
  AdminToast.tsx                     (NEW — thin wrapper reusing the app's standard toast markup, shared by approve/reject/error paths)

lib/admin/
  types.ts                           (NEW — DashboardStats, ModerationListItem, RejectReason mirrors)
  guard.ts                           (NEW — requireAdmin() server helper: fetch user + profile.role, return {user, profile} or `null`; used by layout.tsx)

app/api/admin/
  stats/route.ts                     (NEW — GET, zod-free — no input — returns counts)
  listings/[id]/approve/route.ts     (NEW — POST)
  listings/[id]/reject/route.ts      (NEW — POST, body validated with rejectSchema)

supabase/migrations/
  00xx_admin_moderation.sql          (NEW — admin_actions table + RLS, ALTER properties status CHECK to add 'rejected')
```

Reuse, don't fork: `lib/utils.ts` (`cn`), the `Badge` markup in `DashboardSidebar.tsx`,
the toast markup already duplicated across `MyListings.tsx` / `SignOutToast.tsx` /
`StaleTargetToast.tsx` (`fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm
px-4 py-3 rounded-lg shadow-lg`) and `PublishedToast.tsx` (`bg-green-600 …` variant
for the success case), the disabled-nav-item classes already in
`DashboardSidebar.tsx`'s `navItems` (`text-gray-400 cursor-not-allowed
pointer-events-none`), and the mobile-drawer shell (overlay + slide panel +
Escape/backdrop-close/body-scroll-lock/focus-management `useEffect`s) verbatim from
`DashboardSidebar.tsx` for both `AdminSidebar`'s mobile drawer and
`ListingPreviewDrawer`.

---

## 3. Wireframes

### 3.1 Desktop (≥1024px) — sidebar + content

```
┌────────────────────────────────────────────────────────────────────┐
│ h-14 bg-gray-900 text-white px-4 flex items-center                 │
│  Admin            [spacer]      ↗ To site      (A) Sign out        │
├────────────────┬─────────────────────────────────────────────────┤
│ w-60            │ bg-gray-50 min-h-[calc(100vh-3.5rem)] p-6        │
│ bg-white        │                                                  │
│ border-r        │  ┌ H1 "Dashboard" text-2xl font-semibold ──────┐│
│ sticky top-14   │  └───────────────────────────────────────────────┘│
│                 │                                                  │
│ 📊 Dashboard    │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ 🛡 Moderation 12│  │ Users    │ │ Listings │ │Attention │          │
│ 👥 Users  Soon  │  │  8,421   │ │ by status│ │   12     │          │
│ ⚑ Reports Soon  │  └──────────┘ └──────────┘ └──────────┘          │
│ 🏠 Listings Soon│                                                  │
│ 📝 Content Soon │                                                  │
│ 📍 Locations Soon                                                  │
│ ⚙️ Settings Soon│                                                  │
│                 │                                                  │
└────────────────┴─────────────────────────────────────────────────┘
active item → bg-primary/10 text-primary border-l-2 border-primary
```

### 3.2 Moderation queue (desktop)

```
┌ H1 "Moderation queue" · sub-copy "12 listings waiting" ─────────────┐
├──────────────────────────────────────────────────────────────────────┤
│ COVER  TITLE                 OWNER        PRICE        CREATED       │
│ ▢▢▢▢   3-room apt, Center    Ani K.       85,000,000֏  ⏱ waiting 6h  │
│ ▢▢▢▢   Studio, Malatia       David S.     42,000 $     ⏱ waiting 2d  │ ← amber text (>24h)
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
row click → drawer slides in from the right:

                                        ┌──────────────────────────────┐
                                        │ w-[480px] bg-white shadow-2xl │
                                        │ ×                              │
                                        │ [cover image]                 │
                                        │ 3-room apartment in the Center│
                                        │ Ani K. · Center, Yerevan      │
                                        │ 85,000,000 ֏                  │
                                        │ description excerpt…          │
                                        │ ──────────────────────────── │
                                        │ [✅ Approve]   [❌ Reject]    │  ← sticky footer
                                        └──────────────────────────────┘
```

### 3.3 Mobile (<768px)

```
┌──────────────────────────┐
│ ☰  Admin        (A)      │  h-14 bg-gray-900 text-white
├──────────────────────────┤
│ Dashboard / Moderation    │  page content, stat cards → grid-cols-2
│ queue rows → stacked      │  queue rows → stacked cards (thumb, title,
│ cards                     │  owner, price, waiting-time, [✅][❌] chips)
└──────────────────────────┘
☰ → same slide-in drawer pattern as DashboardSidebar (bg-black/40 overlay,
    translate-x panel, w-72)
```

### 3.4 403 — Access denied (any role, any auth state)

```
┌──────────────────────────────────────────┐
│                                            │
│         ⛔  (ShieldAlert icon,             │
│              w-16 h-16 bg-red-50           │
│              rounded-full, icon red-400)   │
│                                            │
│      Access denied                        │
│      This section is available to         │
│      admins only.                         │
│                                            │
│      [ ← Back to home ]                   │
│                                            │
└──────────────────────────────────────────┘
centered, min-h-screen flex items-center justify-center, text-center,
same empty-state anatomy as EmptyInbox.tsx (icon-in-circle + heading + copy + CTA)
```

---

## 4. Section-by-section spec

### 4.1 `AdminLayout` (Server Component, auth guard) + `AdminTopBar`

- **Auth guard** (`lib/admin/guard.ts`, mirrors `app/[locale]/dashboard/layout.tsx`
  exactly): `createServerClient()` → `supabase.auth.getUser()` → if no user, or if
  `profiles.role !== 'admin'` for that user, **render the 403 content in place**
  (do not `redirect()` to a client page — the acceptance criteria require no
  client-side flash, so the check and the branch must both happen server-side in
  `layout.tsx` before any admin content is returned).
- **Top bar** — `<header className="h-14 bg-gray-900 text-white px-4 flex items-center gap-4">`:
  - Brand: `<span className="font-semibold text-sm tracking-wide">Admin</span>`.
  - Spacer: `<div className="flex-1" />`.
  - "↗ To site": plain `<Link>` (from `@/i18n/navigation`) to `/`, `target="_blank"`
    is **not** used (per spec "opens the public site in a new tab" — use
    `target="_blank" rel="noopener noreferrer"` since it explicitly says new tab),
    styled `text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1`,
    icon `ExternalLink` (`lucide-react`) `w-4 h-4`.
  - Avatar chip + sign-out: a `w-8 h-8 rounded-full bg-white/10 flex items-center
    justify-center text-xs font-medium text-white flex-shrink-0` circle showing the
    admin's initials (same derivation as `AgentReviews.tsx`'s initials fallback:
    first letter of `full_name`, uppercase), immediately followed by
    `<AdminSignOutButton />` — a plain icon button (`LogOut` `w-4 h-4`,
    `aria-label="Sign out"`, `p-2 rounded-lg text-gray-300 hover:bg-white/10
    hover:text-white transition-colors focus-visible:outline-none
    focus-visible:ring-2 focus-visible:ring-white`) that calls
    `supabase.auth.signOut()` then `router.push('/')` (same call shape as
    `DashboardSidebar.handleSignOut`, minus the `?signed_out=1` toast hookup since
    that toast lives on the public site, not inside `/admin`).
  - **Micro-interaction:** both the "To site" link and the sign-out button use
    `transition-colors duration-150` (the app's standard hover-color timing, see
    `DashboardSidebar`'s nav links) — no new duration value.

### 4.2 `AdminSidebar`

- Desktop: `<aside className="hidden lg:flex flex-col w-60 border-r border-gray-200 bg-white sticky top-14 h-[calc(100vh-3.5rem)] flex-shrink-0 overflow-y-auto">` — same shape as `DashboardSidebar`'s desktop `<aside>`, only `w-60` instead of `w-64` and `top-14`/`h-[calc(100vh-3.5rem)]` instead of `top-16`/`h-[calc(100vh-4rem)]` (the admin top bar is `h-14`, not the public `h-16` header).
- 8 nav items, icons (`lucide-react`): `LayoutDashboard` (Dashboard), `ShieldCheck`
  (Moderation), `Users` (Users), `Flag` (Reports), `Home` (Listings), `FileText`
  (Content), `MapPin` (Locations), `Settings` (Settings).
- Only **Dashboard** (`/admin`) and **Moderation** (`/admin/moderation`) are real
  `<Link>`s. The other 6 render as `<span>` (not `<Link>`, not `<button>`, so
  they're never focusable/clickable — matches `DashboardSidebar`'s disabled-item
  intent but goes one step further since these have literally no destination):
  `className="flex items-center gap-3 px-4 h-11 rounded-lg text-sm text-gray-400
  cursor-not-allowed"`, `aria-disabled="true"`. Each disabled item gets a `Soon`
  pill in the badge slot: `className="ml-auto text-[10px] font-medium uppercase
  tracking-wide text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5"`.
- Active item (Dashboard or Moderation, whichever matches `pathname`):
  `bg-primary/10 text-primary border-l-2 border-primary font-medium` (exact class
  string from the page spec's design-tokens table; `DashboardSidebar` uses
  `bg-primary/10 text-primary font-medium` without the left border today — the
  admin spec explicitly wants the `border-l-2 border-primary` accent, so add it
  here even though the public dashboard sidebar doesn't have it).
- Moderation badge: identical markup/props to `DashboardSidebar`'s `Badge`
  component (`ml-auto bg-red-500 text-white text-xs rounded-full px-1.5
  min-w-[1.25rem] h-5 flex items-center justify-center font-medium`), fed by the
  same count the Dashboard's Attention stat card uses (pending listings count),
  refetched via React Query `refetchInterval: 30_000`.
- Mobile: identical drawer chrome to `DashboardSidebar` (hamburger button,
  `bg-black/40` overlay with `transition-opacity duration-300`, panel
  `translate-x-0`/`-translate-x-full` with `transition-transform duration-300`,
  Escape-to-close, body-scroll-lock, focus-the-close-button-on-open) — copy the
  four `useEffect`s verbatim, only change copy from "My Account" to "Admin".

### 4.3 Dashboard (`/admin`)

- Page header: `<h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>`,
  no filters, no date range (D1).
- Stat cards: `grid grid-cols-1 sm:grid-cols-3 gap-4` (3 cards, no need for the
  4-column breakpoint `OverviewCards` uses since there are only 3):
  - **Users** — icon `Users` (lucide), label "Users", value = `profiles` row count
    (`text-3xl font-bold text-gray-900`).
  - **Listings** — icon `Home`, label "Listings", value = total `properties` count,
    with a small breakdown line underneath in `text-xs text-gray-500`:
    `Active 3,120 · Pending 12 · Sold 890 · Archived 210` (no mini bar chart per D1
    — plain text is enough for MVP).
  - **Attention** — icon `AlertTriangle` (amber), label "Attention", value =
    pending-moderation count. When `> 0`, the whole card gets `bg-amber-50` (per
    the page spec's "warning color if >0") instead of `bg-white`, and the value
    text becomes `text-amber-700` instead of `text-gray-900`; the card is also a
    `<Link href="/admin/moderation">` in that state (quick-action shortcut) — when
    `0`, it's a plain non-interactive `<div>` in the neutral `bg-white` styling.
  - Card shell (all three): `bg-white rounded-xl border border-gray-200 p-5
    shadow-sm` (exact tokens table match), hover state only on the Attention card
    when clickable: `hover:shadow-md transition-shadow duration-150`.
- **Empty state** (platform has zero rows in all three counts): replace the grid
  with the `EmptyInbox.tsx` anatomy — icon-in-circle (`Inbox` or `LayoutDashboard`
  icon, `w-16 h-16 bg-gray-50 rounded-full`, icon `w-8 h-8 text-gray-300`), heading
  `text-base font-medium text-gray-900` "No data yet", sub-copy `text-sm
  text-gray-500` "We're waiting for the first users and listings." No CTA button
  (there's nothing actionable from here).
- **Loading:** 3 skeleton cards, same shimmer treatment as `OverviewCards`'
  `SkeletonCard` (`bg-white rounded-xl border border-gray-200 p-4 h-24` with two
  `bg-gray-100 animate-pulse` bars inside) — reuse verbatim, just resized to the
  3-card grid.
- **Entrance micro-interaction:** on first mount (data resolved), stagger the 3
  cards in — no library needed: give `StatCard` a `mounted` boolean that flips
  `true` one tick after mount (`useEffect(() => setMounted(true), [])`), classes
  `cn('transition-all duration-300 ease-out', mounted ? 'opacity-100
  translate-y-0' : 'opacity-0 translate-y-2')`, and stagger via an inline
  `style={{ transitionDelay: \`${index * 60}ms\` }}` per card (index 0/1/2 → 0ms/60ms/120ms).
  This is the same "plain-CSS-transition-driven-by-state" technique already used
  for the drawer/overlay elsewhere in the app — no new dependency.

### 4.4 Moderation queue (`/admin/moderation`)

- Page header: `<h1 className="text-2xl font-semibold text-gray-900">Moderation queue</h1>`
  + sub-copy `text-sm text-gray-500 mt-1` "{n} listings waiting" (or nothing if 0).
- No tabs for MVP (page spec's `[Pending][Approved][Rejected][All]` tabs are out of
  scope — this task only ever shows `status=pending`, oldest first). If a future
  task adds the tabs, reuse the exact `role="tablist"` markup already implemented
  in `MyListings.tsx`.
- **Table** (desktop, ≥1024px) — this is the first real `<table>` in the codebase
  (existing "tables" like `MyListings`/`ListingRow` are actually div rows); the
  page spec's own accessibility section (§7) requires semantic `<table>` +
  `<th scope="col">`, so use a real table here, styled to match the app's existing
  gray/border language:
  ```
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
      <tr>
        <th scope="col" className="text-left font-medium px-3 py-2 w-20">Cover</th>
        <th scope="col" className="text-left font-medium px-3 py-2">Title</th>
        <th scope="col" className="text-left font-medium px-3 py-2">Owner</th>
        <th scope="col" className="text-left font-medium px-3 py-2">Price</th>
        <th scope="col" className="text-left font-medium px-3 py-2">Created</th>
      </tr>
    </thead>
    <tbody>
      {/* one <tr> per ModerationRow, className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer transition-colors duration-100" */}
    </tbody>
  </table>
  ```
  - Cover cell: `<Image>` `w-16 h-12 rounded object-cover` if `property_media`
    exists (first row by `sort_order`), else the `🏠` gray-100 placeholder square
    already used by `ListingRow.tsx`.
  - Title cell: `text-gray-900 font-medium truncate max-w-xs`, resolved
    `title.en ?? title.hy ?? title.ru` (same fallback chain as `ListingRow`/`CompareTable`).
  - Owner cell: owner's `full_name`, plain text (not a link — the Users detail
    page doesn't exist in this task, so don't promise a destination that 404s).
  - Price cell: reuse the currency-symbol/format function shape from
    `CompareTable.tsx`'s `formatPrice` (symbol map + `toLocaleString`).
  - Created cell: absolute date (`created_at` formatted `DD Mon YYYY`) **plus** a
    "waiting" chip below it: `text-xs` normally `text-gray-500`, becomes
    `text-amber-600 font-medium` when the listing has been pending `> 24h` (per
    the page spec's `text-amber-600` waiting-time rule) — e.g. "⏱ waiting 6h" /
    "⏱ waiting 2d".
  - Row hover: `hover:bg-gray-50` + the whole `<tr>` is clickable
    (`onClick` opens the drawer) — add a visually-hidden affordance for keyboard
    users: wrap the title in a real `<button>`/`<a>` inside the cell so Tab order
    reaches it, `aria-label="Preview {title}"`.
- **Mobile (<768px):** stacked cards, one per listing — same anatomy as
  `ListingRow.tsx` (thumbnail left, content right: title, owner, price, waiting
  chip) plus two inline action chips instead of the desktop drawer's footer
  buttons: `[✅ Approve]` (`bg-green-600 text-white h-9 px-3 rounded-md
  hover:bg-green-700`) and `[❌ Reject]` (`bg-red-600 text-white h-9 px-3
  rounded-md hover:bg-red-700`) — exact classes from the page spec's tokens table,
  identical to `DeleteConfirmModal`'s destructive-button sizing (`min-h-[44px]`
  touch target implied by `h-9 px-3` plus the row's own padding).
- **`ListingPreviewDrawer`** (row click, desktop and mobile alike): fork of
  `DashboardSidebar`'s mobile-drawer shell, but anchored right instead of left and
  wider:
  - Overlay: `fixed inset-0 bg-black/40 z-50 transition-opacity duration-300`
    (identical class string, mirrored).
  - Panel: `fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50
    flex flex-col transition-transform duration-300`, `translate-x-0` open /
    `translate-x-full` closed (mirror image of the sidebar drawer's `-translate-x-full`).
  - Header: `flex items-center justify-between px-4 h-14 border-b border-gray-100
    flex-shrink-0`, title = the listing title, close button = same `X` icon
    button classes as `DashboardSidebar`'s drawer close button.
  - Body (`flex-1 overflow-y-auto p-4 space-y-4`): cover image (`w-full aspect-video
    rounded-lg object-cover bg-gray-100`), then a `<dl>` of key fields per D6
    (owner, price, city/address, created date, description excerpt
    `line-clamp-4 text-sm text-gray-600`) — each field pair styled `<dt
    className="text-xs text-gray-500 uppercase tracking-wide">…</dt><dd
    className="text-sm text-gray-900 mt-0.5">…</dd>`.
  - **Sticky action footer** (`sticky bottom-0 bg-white border-t border-gray-200 p-4
    flex gap-3`): `[✅ Approve]` / `[❌ Reject]` buttons, exact classes from the
    tokens table (§ above). Buttons show a spinner + `disabled` state while their
    mutation is in flight (`opacity-60 cursor-not-allowed`, same convention as
    `DeleteConfirmModal`'s `isDeleting` state), and the **entire footer disables**
    while either mutation is pending (can't double-submit).
  - Same Escape-to-close, backdrop-click-to-close, body-scroll-lock behavior as
    the sidebar drawer — copy the `useEffect`s.
  - **On Approve success:** drawer closes, row disappears from the (pending-only)
    list with a brief `opacity-0 transition-opacity duration-200` fade before
    removal (React Query cache update removes the row; apply the fade by keeping
    the row mounted for ~200ms with a `removing` flag before calling
    `queryClient.setQueryData` to actually drop it — optional polish, not required
    for the acceptance criteria, but cheap given the transition utility already
    exists elsewhere).
- **`RejectReasonModal`** (opened by the drawer's/row's Reject button): forked
  from `DeleteConfirmModal`'s shell (overlay, centered card, `role="dialog"`,
  cancel-is-focused-not-confirm, Escape/backdrop-close) with these content swaps:
  - Icon tint: `bg-amber-100` circle, `AlertTriangle` icon `text-amber-600`
    (instead of `DeleteConfirmModal`'s red — rejecting is corrective, not
    destructive-delete, per the page spec's amber pending-badge language).
  - Title: "Reject listing?" Body: a required `<select>` bound to the
    `rejectSchema` enum (`bad_photos`, `duplicate`, `suspicious_price`,
    `rule_violation`, `other`), labeled options: "Bad photos", "Duplicate",
    "Suspicious price", "Rule violation", "Other" — `<select>` styled
    `w-full h-10 px-3 rounded-lg border border-gray-300 text-sm
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`,
    plus an optional `<textarea maxLength={500}>` note below it, same input
    chrome.
  - Inline validation error (reason not selected): `text-xs text-red-600 mt-1`
    "Select a reason" (matches zod's `required_error` message from the spec).
  - Confirm button: `bg-red-600 text-white … hover:bg-red-700` (same as
    `DeleteConfirmModal`'s destructive button — rejecting is still the "bad
    outcome" button color at the button level, only the icon changed), disabled
    until a reason is chosen.
- **Toasts** (`AdminToast`, reused for both flows):
  - Approve success: `bg-green-600 text-white text-sm font-medium px-4 py-3
    rounded-xl shadow-lg` (same variant `PublishedToast.tsx` uses), copy
    "Approved — the listing is now live."
  - Reject success: same green variant, copy "Rejected — the reason was recorded."
    (page spec's "the reason was sent to the owner" email-copy is out of scope per
    the task brief, so the toast text intentionally doesn't promise an email).
  - 409 `already_moderated` (either action, on a listing someone else already
    moderated): **neutral** toast, `bg-gray-900 text-white` variant (matches
    `MyListings.tsx`'s existing error-toast convention), leading `AlertCircle`
    icon, copy "Already reviewed by another admin." — the row is refetched
    (`queryClient.invalidateQueries`) so it silently drops out of the pending list
    instead of the UI looking broken.
  - All toasts: `fixed bottom-4 right-4 z-50`, auto-dismiss after 4–5s
    (`MyListings.tsx` uses 4000ms — match that), `role="status" aria-live="polite"`.
- **Empty queue:** same `EmptyInbox`-style anatomy, icon `ShieldCheck` in a
  `w-16 h-16 bg-gray-50 rounded-full` circle, heading "Nothing waiting for
  moderation", sub-copy "New listings will show up here for review." No CTA.
- **Loading:** row skeletons, `h-16 bg-gray-100 animate-pulse rounded-lg` × 5,
  replacing the table body (or the card list on mobile) — same shimmer language as
  `MyListings.tsx`'s loading state, just resized to row height.

### 4.5 Idempotency / error handling (UI side)

- Both mutations use `@tanstack/react-query`'s `useMutation`, matching
  `MyListings.tsx`'s optimistic-update shape: optimistically mark the row/drawer
  as "processing" (disable its buttons) on `onMutate`, roll back on generic
  `onError`, and specifically branch on a `409` response to show the neutral
  "Already reviewed" toast (not the generic failure toast) — check
  `res.status === 409` in the `mutationFn` and throw a typed error the `onError`
  handler can distinguish (e.g. `class AlreadyModeratedError extends Error {}`),
  so a race with another admin never surfaces as a raw crash/red screen.

### 4.6 403 "Access denied" page

- Rendered directly by the server-side guard in `layout.tsx` (see §4.1) — no
  client redirect, no flash of sidebar/content underneath.
- Full-viewport centered card, anatomy identical to `EmptyInbox.tsx`:
  `min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6`.
  - Icon circle: `w-16 h-16 bg-red-50 rounded-full flex items-center justify-center`,
    `ShieldAlert` (lucide) `w-8 h-8 text-red-400`.
  - Heading: `text-lg font-semibold text-gray-900` "Access denied".
  - Sub-copy: `text-sm text-gray-500 max-w-sm` "This section is available to
    admins only." (verbatim page-spec microcopy).
  - CTA: `<Link href="/">` styled as the app's standard primary button
    (`inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5
    text-sm font-semibold text-white hover:bg-primary/90 transition-colors
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
    focus-visible:ring-offset-2`, identical to `EmptyInbox`'s "Search properties"
    button), label "← Back to home".
  - This page must **not** render the admin top bar/sidebar chrome — it's the
    entire response body for a non-admin hitting `/admin/*`.

---

## 5. Page states (MVP subset of the generic spec's table)

| State | What is displayed |
|---|---|
| Loading (dashboard) | 3 skeleton stat cards |
| Loading (moderation) | 5 skeleton rows/cards |
| Loaded (dashboard, data present) | 3 stat cards, staggered fade/slide-in |
| Empty (dashboard, zero rows everywhere) | "No data yet" empty state, §4.3 |
| Empty queue | "Nothing waiting for moderation", §4.4 |
| Action loading | Approve/Reject buttons show a spinner + `disabled`, footer locked |
| Action success | Green toast + row removed from list / drawer closes |
| 409 (already moderated) | Neutral toast "Already reviewed by another admin", row silently refetched away |
| Reject validation error | Inline `text-red-600` message under the `<select>`, submit blocked client-side by zod + server-side re-validated |
| 403 (non-admin/guest) | Full-page "Access denied", §4.6 — never a flash of admin content |
| Error (stats/queue fetch fails) | Reuse `OverviewCards`'/`MyListings`' existing "Failed to load" + `[Retry]` text-link pattern verbatim |

---

## 6. Responsive

- **≥1024px (lg):** sidebar `w-60` sticky, table as a real `<table>`, drawer
  `w-[480px]`.
- **<1024px:** sidebar becomes the `☰` drawer (mirrors `DashboardSidebar`'s
  existing `lg:hidden`/`hidden lg:flex` split — there is no need for a separate
  "icon-only collapsed" tier since this MVP only has 2 live nav items; skip the
  page spec's 768–1023px icon-rail treatment as unnecessary scope for 2 links).
- **<768px:** moderation rows become stacked cards (§4.4); stat cards go
  `grid-cols-1` (3 cards stack) or stay `sm:grid-cols-3` at the `sm` breakpoint,
  developer's call — either reads fine at this card count.

---

## 7. Accessibility

- All icon-only buttons (`AdminSignOutButton`, drawer/modal close `X`, hamburger)
  carry `aria-label`, matching every existing icon button in this codebase.
- The Moderation table uses real `<table>`/`<th scope="col">` markup (§4.4) —
  the one deliberate exception to "this app doesn't use `<table>` elsewhere,"
  justified by the page spec's explicit accessibility requirement.
- Drawer and reject modal: focus trap is achieved the same way
  `DashboardSidebar`'s drawer and `DeleteConfirmModal` already do it — focus the
  close/cancel button on open, Escape closes, backdrop click closes.
- The Reject modal's destructive Confirm button is **not** autofocused (Cancel
  is), matching `DeleteConfirmModal`'s existing pattern, to avoid an accidental
  Enter-key rejection.
- Toasts: `role="status" aria-live="polite"` (matches every existing toast in
  this codebase).
- Disabled sidebar items are real non-interactive `<span>`s with
  `aria-disabled="true"`, not `<a href="#">` or buttons with no handler — they
  must not appear in the Tab order at all (unlike `DashboardSidebar`'s current
  disabled item, which is a `<Link>` styled to look disabled but is still
  arguably reachable; the admin sidebar should be stricter since these are true
  dead ends with zero destination).
- Contrast: `text-amber-600` on white and `bg-amber-50`/`text-amber-700` combos
  already meet 4.5:1 per Tailwind's amber-600/700 luminance — no custom colors
  introduced, so no new contrast audit needed beyond what the page spec's token
  table already specifies.

---

## 8. SEO & meta

- `layout.tsx` exports `export const metadata: Metadata = { title: 'Admin | RE
  Platform', robots: { index: false, follow: false } }` — identical mechanism to
  `app/[locale]/dashboard/layout.tsx`'s existing `robots` metadata (Next.js
  renders this as `<meta name="robots" content="noindex, nofollow">`
  automatically; do not hand-write the meta tag).
  Every page under `/admin/*` inherits this from the layout — do not override it
  per-page.
- Confirm `/admin` and `/admin/moderation` are absent from `app/sitemap.ts` (or
  wherever the sitemap is generated) — since this app's sitemap presumably
  enumerates only public locale routes already, this should already be true by
  omission; add an explicit exclusion only if the sitemap generator currently
  walks the filesystem/route tree indiscriminately.

---

## 9. Motion summary (all Tailwind utility-driven, no new dependency)

| Interaction | Classes / technique |
|---|---|
| Nav link hover | `transition-colors duration-100` (matches `DashboardSidebar`) |
| Top bar link/button hover | `transition-colors duration-150` |
| Stat card hover (Attention, when clickable) | `hover:shadow-md transition-shadow duration-150` |
| Stat cards entrance | Per-card `opacity-0 translate-y-2` → `opacity-100 translate-y-0`, `transition-all duration-300 ease-out`, staggered via inline `transitionDelay: index * 60ms` |
| Table row hover | `hover:bg-gray-50 transition-colors duration-100` |
| Drawer open/close | Overlay `transition-opacity duration-300`; panel `transition-transform duration-300`, `translate-x-full` ↔ `translate-x-0` |
| Modal open/close | Reuses `DeleteConfirmModal`'s instant-mount pattern (no entrance transition today — keep consistent, don't add one just for this modal) |
| Row removed after approve/reject | Optional `opacity-0 transition-opacity duration-200` fade-out before removal from the list |
| Skeleton shimmer | `animate-pulse` (Tailwind built-in), same as every other loading state in the app |
| Toast enter/exit | No transition today anywhere in the codebase (`MyListings`, `SignOutToast`, etc. just mount/unmount) — stay consistent, don't introduce a fade here either |

No `prefers-reduced-motion` handling is required beyond what's already true of
`transition-*` utilities: none of the motion above is large/vestibular-triggering
(translate distances ≤ 0.5rem, opacity fades), consistent with how the rest of
the app already treats its own `transition-*` usage (see `26-virtual-tour-viewer-handoff.md`
D5-equivalent reasoning) — no extra work required for this task.
