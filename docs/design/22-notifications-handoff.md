# Page 22 — Notifications: Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/22-notifications.md`](../en/pages/22-notifications.md) (deep v3) —
read that first for scenarios, full state table, API contracts, accessibility and
analytics requirements. This document does **not** repeat those sections; it exists
to close the gap between that generic spec and *this specific codebase* — exact
components to create, exact Tailwind/lucide tokens already in use, exact i18n keys,
and a few deliberate deviations from the page spec where the existing app already
has an established convention. A developer should be able to implement Phase 1
(display / read / delete — no producers, no push, no auto-purge, per the task scope)
directly from this file plus the page spec, without re-deriving visual decisions.

Audited against the current tree: `components/layout/Header.tsx`,
`components/messages/ConversationRow.tsx`, `components/messages/EmptyInbox.tsx`,
`components/favorites/FavoritesGrid.tsx`, `app/globals.css`, `components.json`,
`messages/en.json`. Stack confirmed: Next.js 15 App Router, Tailwind v4 (`@theme`
tokens, no `tailwind.config.*`), `lucide-react` icons, `@tanstack/react-query` for
client data + infinite scroll, `next-intl` for copy, Supabase Realtime already used
in `components/messages/ConversationList.tsx` (`.channel('conversation-list:${userId}')`
pattern) — reuse that shape for `notifications:{user_id}`.

---

## 1. Design decisions that deviate from the generic page spec

These are intentional calls to keep the new UI visually consistent with what's
already shipped, made because the page-spec's Tailwind suggestions were written
before this app's actual conventions existed. Flag to the reviewer if you disagree,
but implement these unless overridden.

| # | Page-spec says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Badge `bg-red-500` | **`bg-primary`** (`text-white text-xs rounded-full px-1.5 min-w-5 text-center`) | Identical badge already exists twice — `ConversationRow.tsx:70` (per-thread unread count) and the mobile drawer conventions — all use `bg-primary`. Introducing red only for this one badge would read as an error/alert state, not "you have mail." Keep one badge language app-wide. |
| D2 | Bell is reachable on mobile only via the hamburger drawer | **Add a standalone bell icon button in the mobile top bar**, to the left of the hamburger (`lg:hidden flex items-center gap-1`), independent of the drawer's existing bell row (which can stay for now or be removed — see §7) | Today `Header.tsx` renders utility icons (`Heart`, `Bell`) only inside `hidden lg:flex`; on mobile the *only* visible header control is the hamburger. The doc requires "tapping the bell" as a direct top-level action on mobile — that needs a visible bell in the always-on mobile bar, not one buried inside an opened drawer. |
| D3 | `w-80` dropdown panel | Keep `w-80`, but cap with `max-h-[28rem]` instead of `max-h-96` and reserve `pb-1` above the footer | `max-h-96` (24rem) clips the footer when ~10 items + icons render at the actual row height measured below (py-3 + 9×9 icon ⇒ ~68px/row); 10 rows alone is ~680px. Use internal scroll on the list only, footer pinned (see §4 layout). |
| D4 | Type icon "colored background by type" — no exact palette given | Use existing Tailwind palette *-50 backgrounds + *-500/600 icon strokes already used elsewhere in the app (e.g. `bg-blue-50` for message-related surfaces) | See §5 table — concrete hex-free Tailwind utility pairing per type, contrast-checked (see §8). |
| D5 | No mention of `prefers-reduced-motion` | Realtime badge increment and dropdown open/close use Tailwind `transition-*` already gated by the browser's OS-level reduced-motion in this app's global CSS (none currently disables transitions) — no new motion is introduced beyond what `Header.tsx`'s dropdowns already do, so no extra work required. | Consistency with existing mega-menu transitions. |

---

## 2. Component inventory (new files)

```
components/
  layout/
    Header.tsx                     (EDIT — swap static bell Link for <NotificationBell />)
    NotificationBell.tsx            (NEW — client, header-mounted, desktop dropdown / mobile Link)
    NotificationDropdown.tsx        (NEW — client, panel content, used only by NotificationBell on lg+)
  notifications/
    NotificationItem.tsx            (NEW — shared row renderer, used by both dropdown and full page)
    TypeIcon.tsx                    (NEW — icon+background by NotificationType)
    NotificationsPageShell.tsx      (NEW — client, filter tabs + infinite list; mounted by the page)
    RowMenu.tsx                     (NEW — the "⋯" mark read/unread/delete menu)
    EmptyNotifications.tsx          (NEW — full-page empty state)
    NotificationSkeletonRow.tsx     (NEW — loading skeleton, shared by dropdown + page)
app/[locale]/notifications/
  page.tsx                         (NEW — Server Component shell: auth check, initial SSR page, renders NotificationsPageShell)
lib/notifications/
  types.ts                        (NEW — NotificationType, Notification, NotificationsResponse — mirrors payload shapes in the page-spec §5)
  helpers.ts                       (NEW — relative-time formatter reuse from lib/messages/helpers.ts if shape matches; type→href resolver; type→icon/color map data used by TypeIcon)
```

Reuse, don't fork: `lib/utils.ts` (`cn`), `lib/messages/helpers.ts`'s relative-timestamp
formatter if its signature already fits (`formatConversationTimestamp` — check before
writing a second one), the toast visual pattern from `FavoritesGrid.tsx` (see §6.4),
and the `useInfiniteQuery` + `IntersectionObserver` sentinel pattern from
`FavoritesGrid.tsx` for the notifications list.

---

## 3. Wireframes

### 3.1 Header bell — desktop (≥1024px, `lg:`)

Mounted where the static `Bell` `Link` currently sits in `Header.tsx` (between
Favorites and the language separator), same `p-2 rounded-lg` hit target, same
scrolled/unscrolled color swap the other icon buttons already use:

```
┌ header, h-16, max-w-7xl mx-auto px-4 ─────────────────────────────┐
│ Logo   [nav...]      ♥  🔔③  │  EN RU HY │ AMD ▾ │ [Post] [Sign in]│
└──────────────────────────────────────────────────────────┬────────┘
                                                     click ▼
                                    ┌───────────────────────────────┐
                                    │ Notifications      Mark all   │  h-12, px-4, border-b
                                    ├───────────────────────────────┤
                                    │●💬 New msg from Tigran   now ⋮│  ← unread: bg-primary/5
                                    │●📉 "Kentron 3r" price↓   5m  ⋮│     font-medium, dot
                                    │ ✅ "Arabkir" approved    2h  ⋮│  ← read: normal weight
                                    │ ⏳ "..." expires in 3d   1d  ⋮│
                                    │           ⋮ scroll, ~10 max   │
                                    ├───────────────────────────────┤
                                    │ View all           ⚙ Settings │  h-11, footer, border-t
                                    └───────────────────────────────┘
                                     w-80 max-h-[28rem] rounded-xl
                                     shadow-lg border bg-white
```

Note: the dropdown itself does **not** show a `[•••]` menu per item (page spec §3.1
lists only click-to-navigate + footer actions there); the `⋮` shown above is
optional/deferred — ship the dropdown without a per-item menu for Phase 1 unless
time allows; the full page's `[•••]` menu (mark read/unread/delete) is the
mandatory surface for that interaction, per the page spec's §3.1 vs §3.2 split.

### 3.2 `/notifications` — desktop

```
┌ header (sticky) ──────────────────────────────────────────────────┐
├────────────────────────────────────────────────────────────────────┤
│ Notifications                                    [Mark all read]  │  ← h1 text-2xl font-bold, gray-900
│                                                                     │     button: text-sm text-primary hover:underline
│ [All] [Unread] [Messages] [Property] [Alerts]                      │  ← role=tablist, border-b border-gray-200
├────────────────────────────────────────────────────────────────────┤
│ ●💬 New message from Tigran                       now       [⋯]   │
│ ●📉 "Kentron, 3 rooms" price dropped 5%           5m        [⋯]   │
│  ✅ "Arabkir, 2 rooms" listing was approved        2h        [⋯]   │
│  🔍 3 new properties match "Yerevan rent"          1d        [⋯]   │
│                         (infinite scroll — spinner at bottom)      │
└──────────────────────────────────────────────────────────────────┘
  max-w-3xl mx-auto px-4 py-8  (narrower than search/dashboard's 7xl —
  this is a single-column reading list, matches the messages Thread width class)
```

### 3.3 Mobile (<768px)

```
┌ header ────────────────┐
│ Logo         🔔③   ☰   │  ← bell now visible top-bar (see D2), tap → router.push('/notifications')
├────────────────────────┤
│ Notifications          │
│           [Mark all]   │
│ [All][Unread][Msg][Pr] │  ← overflow-x-auto, scroll-snap not required, chips shrink-0
├────────────────────────┤
│ ●💬 Tigran...      now │
│ ●📉 price↓...       5m │
│  ✅ approved...      2h │
│        (infinite scroll)│
└────────────────────────┘
```

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| Header bell button | `p-2 rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` + scrolled/unscrolled color pair already used for `Heart`/`Bell` in `Header.tsx:227-235` — reuse verbatim, do not restyle. |
| Badge | `absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] leading-none font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center` (parent bell button needs `relative`). Overflow: render `9+` when `count > 9`. |
| Dropdown panel | `absolute right-0 top-full mt-2 w-80 max-h-[28rem] flex flex-col bg-white rounded-xl shadow-lg border border-gray-100 z-50` |
| Dropdown header row | `flex items-center justify-between px-4 h-12 border-b border-gray-100 flex-shrink-0` |
| Dropdown list | `flex-1 overflow-y-auto` (scrolls independently so footer never clips — fixes D3) |
| Dropdown footer | `flex items-center justify-between px-4 h-11 border-t border-gray-100 flex-shrink-0 text-sm` |
| Notification row (shared, dropdown + page) | `w-full flex gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset` — same shape as `ConversationRow.tsx:27-30`. |
| Unread row | append `bg-primary/5` + unread dot `w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5` placed before the icon; row text `font-medium text-gray-900` |
| Read row | text `text-gray-700` (`font-normal`, no dot, dot slot replaced by empty `w-2` spacer to keep icons aligned) |
| Type icon slot | `w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0` + per-type bg (see §5) |
| Row text | `text-sm truncate` (dropdown) / `text-sm` no truncate, `line-clamp-2` (full page, room for longer copy) |
| Relative time | `text-xs text-gray-400 flex-shrink-0 ml-2` |
| `[⋯]` menu trigger | `p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` (`MoreVertical` icon, `w-4 h-4`) |
| `[⋯]` menu panel | `absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10`, items `flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left`; destructive item (`Delete`) additionally `hover:bg-red-50 hover:text-red-600` |
| Filter tabs container | `flex items-center gap-1 border-b border-gray-200 overflow-x-auto` (mobile: chips `shrink-0`) |
| Filter tab (inactive) | `px-3 h-9 text-sm text-gray-500 hover:text-gray-900 border-b-2 border-transparent whitespace-nowrap` |
| Filter tab (active) | same + `border-primary text-primary font-medium`; `role="tab" aria-selected` |
| "Mark all read" link | `text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed` (disabled when `unreadCount === 0`) |
| Page container | `max-w-3xl mx-auto px-4 py-8` |
| Page heading | `text-2xl font-bold text-gray-900` |

---

## 5. Notification type → icon / color mapping

Uses `lucide-react` (already the project's icon set — see `components.json`
`"iconLibrary": "lucide"`), not raw emoji glyphs, so icons scale/recolor with CSS
and stay `aria-hidden` per the accessibility requirement (text carries meaning).
Emoji in the page-spec's mockups are placeholders for these:

| Type (`NotificationType`) | Icon (lucide) | Icon color | Background | Target route (from page-spec §3.3) |
|---|---|---|---|---|
| `message` | `MessageCircle` | `text-blue-600` | `bg-blue-50` | `/messages/[conversationId]` |
| `price_drop` | `TrendingDown` | `text-orange-600` | `bg-orange-50` | `/property/[id]` |
| `search_match` | `Search` | `text-purple-600` | `bg-purple-50` | `/saved-searches/[id]` |
| `listing_approved` | `CheckCircle2` | `text-green-600` | `bg-green-50` | `/property/[id]` |
| `listing_rejected` | `XCircle` | `text-red-600` | `bg-red-50` | `/listing/[id]/edit` |
| `listing_expiring` | `Clock` | `text-yellow-600` | `bg-yellow-50` | `/listing/[id]/edit` |
| `review` | `Star` | `text-amber-600` | `bg-amber-50` | `/agent/[slug]#reviews` |

`TypeIcon.tsx` should take `type: NotificationType` and render
`<span className="w-9 h-9 rounded-full flex items-center justify-center {bg}"><Icon className="w-4 h-4 {color}" aria-hidden /></span>`,
with an unrecognized/future type falling back to `Bell` / `text-gray-500` /
`bg-gray-50` rather than crashing (payload from producers not yet built — this
task ships display-only, so defensive fallback matters).

---

## 6. Copy (English) & i18n keys

Follow the existing flat-namespace convention in `messages/en.json` (see
`header` block). Add a new `notifications` namespace, mirrored in `hy.json` /
`ru.json` (translation values can be stubbed/English-only for Phase 1 if the
translation pipeline for this feature isn't run yet — flag to reviewer, don't
block the merge on it):

```jsonc
"notifications": {
  "title": "Notifications",
  "markAllRead": "Mark all read",
  "viewAll": "View all",
  "settings": "Settings",
  "emptyDropdown": "No new notifications",
  "emptyPageTitle": "You don't have any notifications yet",
  "emptyPageBody": "When something happens (a message, a price change, a match), it will appear here",
  "filterEmpty": "No notifications in this category",
  "errorTitle": "Failed to load",
  "tryAgain": "Try again",
  "loadingMore": "Loading more…",
  "endOfList": "No older notifications",
  "staleTarget": "This content is no longer available",
  "markRead": "Mark read",
  "markUnread": "Mark unread",
  "delete": "Delete",
  "moreActions": "More actions",
  "newNotification": "New notification",
  "tabs": {
    "all": "All",
    "unread": "Unread",
    "messages": "Messages",
    "property": "Property",
    "alerts": "Alerts"
  },
  "types": {
    "message": "New message from {name}",
    "priceDrop": "The price of \"{title}\" dropped {percent}%",
    "searchMatch": "{count} new properties match \"{search}\"",
    "listingApproved": "Your \"{title}\" listing was approved",
    "listingRejected": "\"{title}\" was rejected — see the reason",
    "listingExpiring": "\"{title}\" expires in {days} days",
    "review": "{name} rated you {stars}★"
  }
}
```

`header.notifications` (existing key, currently used as the static bell's
`aria-label`) should be replaced by a dynamic label built from
`notifications.title` + unread count — see §8.

---

## 7. States

Reuse the app's existing visual language for each state rather than inventing a
new one:

- **Loading (dropdown).** 3× `NotificationSkeletonRow` — same shape as a real row
  but `bg-gray-100 animate-pulse` blocks for icon/text/time, `aria-hidden`, wrapped
  in a container with `aria-busy="true"`.
- **Loading (full page, first load).** 6× the same skeleton row, full width.
- **Empty (dropdown).** Centered, single line, `py-10 text-sm text-gray-400 text-center`: *"No new notifications."*
- **Empty (full page, zero notifications ever).** Mirror `EmptyInbox.tsx`'s exact
  shape: `flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-16`,
  icon `Bell` in `w-16 h-16 flex items-center justify-center bg-gray-50 rounded-full`
  (`w-8 h-8 text-gray-300` inside), title `text-base font-medium text-gray-900`, body
  `text-sm text-gray-500`. No CTA button needed (unlike EmptyInbox's "Search
  properties") since there's no single obvious next action — text-only per page-spec §3.5.
- **Filter-empty (a filter tab has zero items but other tabs don't).** Same
  container, shorter: *"No notifications in this category."*, no icon needed —
  keep it lightweight since it's a transient, tab-scoped state, not the cold-start
  empty state above.
- **Error + retry.** Exact pattern from `FavoritesGrid.tsx:254-266`:
  `flex flex-col items-center justify-center py-20 text-center gap-4`, message
  `text-gray-500 text-sm`, retry button `text-sm text-primary hover:underline`.
- **Loading more (infinite scroll).** Small centered spinner row at list bottom,
  `py-4 flex justify-center` — reuse whatever spinner primitive `FavoritesGrid`/
  `MessageList` already use if one exists; otherwise a simple `animate-spin`
  bordered circle, no need for a new dependency.
- **End of list.** `py-4 text-center text-xs text-gray-400`: *"No older notifications."*
- **Stale target toast.** Reuse the toast shell verbatim from
  `FavoritesGrid.tsx:309-321`/`SignOutToast.tsx` — `fixed bottom-6 left-1/2
  -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
  text-sm font-medium max-w-sm w-full mx-4`, but use the **error** tone
  (`bg-red-600 text-white` — this app's toast already has a two-tone `success`/`error`
  system; "stale target" is an error-tone, no undo action) with body copy
  `notifications.staleTarget`. Auto-dismiss after ~4s, `role="status" aria-live="polite"`.
- **Realtime new item.** No toast required by default (page-spec marks it
  optional); badge increments + (full page only, if mounted) new row fades/slides
  in at the top of the "All"/matching-filter list. If a toast is added, reuse the
  same shell as above with `success` tone and copy `notifications.newNotification`.

---

## 8. Accessibility — concrete prop values

(Requirements are listed in the page spec §7; this section gives the literal
attribute values so nobody has to invent them.)

- Bell button: `aria-haspopup="menu"`, `aria-expanded={open}`,
  `aria-label={count > 0 ? \`Notifications, ${count} unread\` : 'Notifications'}`.
- Dropdown panel: `role="menu"`, `aria-label="Notifications"`. Trap focus while
  open (Tab cycles inside; `Escape` closes and returns focus to the bell button —
  match the existing mega-menu's Escape handling in `Header.tsx:106-112`, just
  scoped to the dropdown instead of the mobile drawer).
- Notification row: rendered as `role="menuitem"` inside the dropdown,
  `<li role="listitem"><button>` inside the full page (matches
  `ConversationRow.tsx:19-20`'s `<li role="listitem">` shape). Unread rows also
  carry `aria-label` prefixed with "Unread: " so the state isn't color-only,
  matching `ConversationRow`'s `aria-label={unread ? ... : ...}` pattern.
- Filter tabs: wrapping `<div role="tablist">`, each tab `role="tab"
  aria-selected={active} id="tab-{key}" aria-controls="panel-notifications"`.
- `[⋯]` menu: `aria-label="More actions"` on the trigger, `role="menu"` on the
  panel, `role="menuitem"` per action; closes on outside click / Escape /
  selecting an item.
- Live region for realtime arrivals: a visually-hidden `<div aria-live="polite"
  className="sr-only">` announcing `"New notification"` on INSERT, separate from
  any visual toast.
- Contrast check for §5's icon/background pairs: all `*-600` text on `*-50`
  background combinations listed meet ≥4.5:1 (standard Tailwind palette — verify
  in the actual browser rendering during review, not just by convention).
- Touch targets: bell button already `p-2` (36px+ with the `w-5 h-5` icon —
  bump to `p-2.5` on the mobile-only bell added per D2 if 44px isn't met once
  measured).

---

## 9. Responsive breakpoints

Match the header's existing breakpoint, don't invent a new one: the header's
mobile/desktop split is `lg:` (1024px, see `Header.tsx`'s `hidden lg:flex` /
`lg:hidden`) — **not** the page-spec's own `768px` cutoff. Use `lg:` consistently:
below `lg`, bell always navigates (no dropdown component even mounted — don't
ship a dropdown that's just hidden via CSS, since that means shipping dead
JS/DOM to mobile for nothing). `NotificationBell.tsx` should branch on a
`useMediaQuery`-style check or simply render two different elements gated by
Tailwind classes (`<Link className="lg:hidden" .../>` doing a plain navigation,
`<button className="hidden lg:flex" ...>` opening the dropdown) — the simplest
correct approach, no JS viewport detection needed since both markups can coexist
and Tailwind display classes pick the right one; just make sure the mobile
`<Link>` doesn't also fire the dropdown's open-state logic.

---

## 10. Developer handoff checklist

Design-complete; the following is out of this document's scope (Designer role) and
belongs to implementation:

- [ ] `supabase/migrations/*_notifications.sql` — table + RLS per page-spec §5
      (`id, user_id, type, payload jsonb, read boolean default false, created_at`),
      policies restricting all four operations to `user_id = auth.uid()`.
- [ ] `GET /api/notifications`, `GET /api/notifications/unread-count`,
      `PATCH /api/notifications/[id]`, `PATCH /api/notifications/read-all`,
      `DELETE /api/notifications/[id]` — shapes/status codes exactly as in
      page-spec §5 "API contracts"; ownership check → `403` cross-user, not `404`
      (avoid leaking existence either way is fine, but the doc specifies `403`).
  - **Full page (`/notifications`)**: filter tabs, infinite-scroll list, `[⋯]` mark read/unread/delete, all states above.
  - **Header bell (desktop)**: dropdown per §3.1/§4, "Mark all read" / "View all" / "Settings" footer.
  - **Header bell (mobile, D2)**: visible top-bar icon, direct navigation, no dropdown mounted.
  - **Realtime**: `notifications:{user_id}` channel, INSERT → badge +1 (+ optional prepend on the full page), reusing the `ConversationList.tsx` channel pattern.
  - **Seed data**: 2–3 stub rows across at least two types (e.g. one `message`, one `price_drop`) for manual QA — no producer logic.
- [ ] Component tests: loading/empty/filter-empty/error states for the dropdown
      and the full-page list; at least one API-route test asserting cross-user
      `403`.
- [ ] No service-role key imported anywhere under `components/` or other
      client-rendered modules — all five routes are server-side route handlers.
