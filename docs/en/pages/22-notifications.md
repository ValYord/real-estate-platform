# Page 22 — Notifications 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard. Includes: overview, scenarios, layout/sizing/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/notifications` (+ header bell 🔔 dropdown on every page)
**Roles.** User+ . Guest → the bell is not shown; `/notifications` → redirect `/auth/login?next=/notifications`.
**Primary goal.** Collect all of the user's events in one place (messages, property changes, moderation, alerts), with a **realtime badge**, and **quickly take them to the target page** in one click.

---

## 0. Overview

Notifications is a **re-engagement** tool — it brings the user back to the platform when something important happens (new message, price drop on a favorite, saved-search match, listing approval). There are two surfaces: (1) a **bell dropdown** in every page header with an unread badge, for a quick peek (last ~10); (2) a **full page** `/notifications` with the full history, filters, and per-item actions.

The most important behavior: every notification is **clickable** and takes you straight to its target (a message → conversation, a price-drop → property, a match → search results), while marking it read at the same time. The badge is **realtime** (Supabase Realtime subscription): a new event → badge +1 without reload. A notification is created/delivered **only** if the corresponding channel is enabled in the user's settings (`21-settings.md`).

The bell dropdown is a client component (part of the header); the full page is an SSR initial list + client pagination/realtime.

---

## 1. User scenarios

**Scenario A — New message, Armine (bell, desktop).** Armine is browsing the search page. A "1" badge suddenly appears on the header's 🔔 (realtime). She taps it → in the dropdown she sees "💬 New message from Tigran · now" (bold, unread dot). Click → goes to `/messages/551`, the notification is marked read, badge → 0.

**Scenario B — Price drop, Gagik (re-engagement, mobile).** Gagik had favorited an apartment. By email + push he gets "📉 The price of \"Kentron, 3 rooms\" dropped 5%". He opens the app, from the bell → dropdown → click → `/property/8423` with the new price. → re-engaged lead.

**Scenario C — Listing moderation, Nare (full page).** Nare had posted a listing. On `/notifications` she sees "✅ Your \"Arabkir, 2 rooms\" listing was approved" with a green icon. A bit further down: an old "⏳ ... expires in 3 days". From the [•••] menu she marks the old ones read, then **[Mark all read]**.

---

## 2. Layout & visual structure

### Bell dropdown (on every page, desktop)

```
        🔔③  ◄ badge (unread count)
        │ click
        ▼
┌────────────────────────────────┐
│ Notifications     [Mark all]   │  ◄ header
├────────────────────────────────┤
│ ● 💬 New msg from Tigran  now  │  ◄ unread (bold, bg-primary/5)
│ ● 📉 "Kentron 3r" price↓  5m   │
│   ✅ "Arabkir" approved   2h   │  ◄ read (normal)
│   ⏳ "..." expires        1d   │
│   ... (scroll, ~10)           │
├────────────────────────────────┤
│ [View all]        [⚙ Settings] │  ◄ footer
└────────────────────────────────┘
```

### Full page (`/notifications`) — desktop

```
┌────────────────────────────────────────────────┐
│ HEADER (sticky)                                 │
├────────────────────────────────────────────────┤
│ Notifications                  [Mark all read] │
│ [All][Unread][Messages][Property][Alerts]      │  ◄ filter tabs
├────────────────────────────────────────────────┤
│ ● 💬 New message from Tigran        now   [•••]│
│ ● 📉 "Kentron 3r" price dropped 5%  5m    [•••]│
│   ✅ "Arabkir 2r" approved           2h    [•••]│
│   🔍 3 new properties for "Yerevan rent" 1d [•••]│
│   ... (infinite scroll)                         │
└────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ 🔔③            (header)  │
├──────────────────────────┤
│ Notifications            │
│ [Mark all]               │
│ [All][Unread][Msg][Prop] │  scroll-x
│ ● 💬 From Tigran... now  │
│ ● 📉 price↓... 5m         │
│   ✅ approved... 2h       │
│   (infinite scroll)      │
└──────────────────────────┘
  bell tap → full page (not dropdown)
```

- On mobile, bell tap → straight to `/notifications` (instead of a dropdown, since the screen is narrow).
- Filter tabs on mobile are horizontal-scroll chips.

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| Bell badge | `absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 text-center` |
| Dropdown panel | `w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border` |
| Notification item | `flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer` |
| Unread item | `bg-primary/5 font-medium` + unread dot `w-2 h-2 rounded-full bg-primary` |
| Read item | `text-gray-700` (normal weight) |
| Type icon | `w-9 h-9 rounded-full flex items-center justify-center` (colored background by type) |
| Relative time | `text-xs text-gray-400 ml-auto` |
| Filter tab | `px-3 h-9 text-sm`, active: `border-b-2 border-primary text-primary` |
| Mark all link | `text-sm text-primary hover:underline` |
| Empty state | `text-center text-gray-500 py-12` + icon |
| `[•••]` menu | `text-gray-400 hover:text-gray-700` |

---

## 3. Section-by-section

### 3.1 Header bell 🔔 dropdown (on every page)

- **Bell icon** on the right of the header + **badge** with the unread count (`9+` overflow when more than 9). Badge is realtime.
- **Click** → dropdown panel (last ~10 notifications, scroll). Outside click / Esc → closes.
- **Each item.** Type icon + short text + relative time ("5m ago"): unread → bold + `bg-primary/5` + dot; read → normal.
- **Item click** → mark read + navigate to target (dropdown closes).
- **Dropdown footer.**
  - **[Mark all read]** → `PATCH /api/notifications/read-all` → badge → 0 (optimistic).
  - **[View all]** → `/notifications`.
  - **[⚙ Settings]** → `/settings/notifications`.
- **Empty** → "No new notifications".
- **Loading** → 3 skeleton rows.

### 3.2 `/notifications` full page

- **Heading** "Notifications" + **[Mark all read]** (disabled if 0 unread).
- **Filter tabs.** `[All] [Unread] [Messages] [Property] [Alerts]` — active tab `border-b-2 border-primary`.
- **List** (infinite scroll, limit 20/page): each row: type icon, full text, relative time, `[•••]` menu, unread highlight.
- **Row click** → mark read → navigate to target.
- **`[•••]` menu.** "Mark read" / "Mark unread" / "Delete".
- **Loading more** → spinner at the bottom; **end** → "No older notifications".

### 3.3 Notification types

| Type | Text (example) | Click → target | Icon / color |
|------|----------------|----------------|--------------|
| **New message** | "New message from {name}" | `/messages/[conversationId]` | 💬 `bg-blue-50` |
| **Price drop (favorite)** | "The price of \"{property}\" dropped 5%" | `/property/[id]` | 📉 `bg-orange-50` |
| **Saved-search match** | "3 new properties match \"{search}\"" | `/saved-searches/[id]` / `/search?...` | 🔍 `bg-purple-50` |
| **Listing approved** | "Your \"{title}\" listing was approved" | `/property/[id]` | ✅ `bg-green-50` |
| **Listing rejected** | "\"{title}\" was rejected — see the reason" | `/listing/[id]/edit` | ⛔ `bg-red-50` |
| **Listing expiring soon** | "\"{title}\" expires in 3 days" | `/listing/[id]/edit` (renew) | ⏳ `bg-yellow-50` |
| **New review (Agent)** | "{name} rated you ⭐4" | `/agent/[slug]#reviews` | ⭐ `bg-amber-50` |

### 3.4 Actions

- **Mark read** — item click or menu → `PATCH /api/notifications/[id]` (`read=true`): optimistic.
- **Mark all read** — bell dropdown / page → badge → 0 (optimistic, rollback on failure).
- **Mark unread / Delete** — per-item `[•••]` menu.
- **Click → target** — always navigates to the related page + marks read.
- **Badge count** — unread total on the bell, realtime update (Supabase channel).
- **Settings link** — → `/settings/notifications` (per-type email/push toggle, see `21-settings.md`).

### 3.5 Empty & edge states

- **Empty** → "You don't have any notifications yet. When something happens (a message, a price change, a match), it will appear here" + bell illustration.
- **Stale target.** Clicking a deleted listing/conversation → graceful "This content is no longer available" (toast), notification marked read.
- **Filter empty** → "No notifications in this category".

---

## 4. Full list of states

| State | What is shown |
|-------|-------------------|
| **Loading (dropdown/page)** | Skeleton rows |
| **Loaded, unread present** | Badge number + unread items bold/highlighted |
| **Loaded, all read** | Badge hidden, items normal |
| **Empty** | Illustration + "You don't have any notifications yet" |
| **Filter empty** | "No notifications in this category" |
| **New realtime** | Badge +1 + (optional) toast "New notification" |
| **Mark all (optimistic)** | Everything immediately read, badge → 0 |
| **Stale target click** | Toast "No longer available" + mark read |
| **Loading more** | Spinner at the bottom |
| **End of list** | "No older notifications" |
| **Error** | "Failed to load" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<NotificationBell />                       (client, header, realtime)
 ├─ <BellBadge count />
 └─ <NotificationDropdown>
     ├─ <NotificationItem n /> ×~10
     └─ <DropdownFooter onReadAll />

<NotificationsPage> (Server Component shell + client list)
 ├─ <PageHeader onReadAll disabled={unread===0} />
 ├─ <FilterTabs active onChange />
 └─ <NotificationList filter>             (client, infinite scroll, realtime)
     └─ <NotificationRow n>
         ├─ <TypeIcon type />
         └─ <RowMenu onRead onUnread onDelete />
```

Props (key): `<NotificationItem n: Notification, onClick />`; `<NotificationList filter: 'all'|'unread'|'messages'|'property'|'alerts' />`; `<BellBadge count: number, max: 9 />`; `<TypeIcon type: NotificationType />`.

### Data fields (notifications — see 00-SPEC §7)

`notifications: id, user_id, type, payload(json), read, created_at`
`payload` example: `{ conversationId, propertyId, title, name, searchId, percent }` (by type).

### API contracts

**`GET /api/notifications?filter=all|unread|messages|property|alerts&cursor=...`**
```jsonc
// 200 OK
{ "items": [
    { "id": 901, "type": "message", "read": false,
      "payload": { "conversationId": 551, "name": "Tigran" },
      "createdAt": "2026-06-23T09:00:00Z" },
    { "id": 900, "type": "price_drop", "read": false,
      "payload": { "propertyId": 8423, "title": "Կենտրոն, 3 սենյակ", "percent": 5 },
      "createdAt": "2026-06-23T08:55:00Z" }
  ],
  "nextCursor": "..." }
```

**`GET /api/notifications/unread-count`** → `200 { "count": 3 }`

**`PATCH /api/notifications/[id]`** → `{ "read": true }` → `200 { "ok": true }` · `403 { "error": "not_owner" }`

**`PATCH /api/notifications/read-all`** → `200 { "updated": 3 }`

**`DELETE /api/notifications/[id]`** → `200 { "deleted": true }`

**Realtime channel** `notifications:{user_id}` (Supabase Realtime): INSERT event → client badge +1 + list prepend.

### Validation & rules

- **Ownership (RLS).** All queries: `user_id == auth.uid()`; cross-user → `403`.
- **De-dup / grouping.** Several messages in the same conversation → one grouped notification ("3 new messages from {name}"); server-side group by `type + payload.conversationId` among the unread.
- **Read sync (cross-channel).** Reading a message on `/messages` → the related notification is automatically marked read (backend trigger / event).
- **Respect prefs.** A notification is created/delivered **only** if it's enabled in the user's `notification_prefs` (email/push) (see `21-settings.md`). An in-app notification is always created; email/push: per prefs.
- **Push.** Browser push (Phase 1 basic, `Notification` API + service worker) / mobile push (Phase 4).
- **Auto-purge.** Notifications >90 days auto-delete (config, cron job).

---

## 6. Responsive

- **≥1024px (lg).** Header bell dropdown (`w-80`); full page: filter tabs inline + row layout `[•••]` inline.
- **768–1023px (md).** Dropdown the same; full page row layout.
- **<768px (sm).** Bell tap → straight to `/notifications` (not a dropdown); filter tabs → scroll-x chips; rows compact; `[•••]` menu touch-friendly.

---

## 7. Accessibility

- Bell: `aria-label="Notifications, {n} unread"`, `aria-haspopup`, `aria-expanded`.
- Dropdown: `role="menu"` / `role="dialog"`, focus trap, Esc closes, keyboard navigation (↑↓).
- Unread state: not color only — dot + `aria-label="unread"` + bold text.
- Realtime new notification: `aria-live="polite"` region ("New notification").
- Filter tabs: `role="tablist"`, `aria-selected`; `[•••]` menu: keyboard-accessible.
- Touch target ≥ 44px; contrast ≥ 4.5:1; type icons: `aria-hidden` (the text carries the meaning).

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated).
- `<title>` = "Notifications — {brand}".
- Excluded from sitemap; no canonical.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `notif_bell_open` | Bell dropdown open | `unread_count` |
| `notif_page_view` | `/notifications` load | `filter` |
| `notif_filter_change` | Filter tab change | `filter` |
| `notif_click` | Notification item click | `type, notif_id` |
| `notif_mark_read` | Single mark read | `notif_id` |
| `notif_mark_all_read` | [Mark all] | `count` |
| `notif_delete` | Per-item delete | `notif_id` |
| `notif_settings_click` | [⚙ Settings] | — |
| `notif_realtime_received` | Realtime INSERT | `type` |
| `notif_stale_target` | Deleted target click | `type` |
