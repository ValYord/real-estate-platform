# Էջ 22 — Notifications (Ծանուցումներ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ին։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/notifications` (+ header bell 🔔 dropdown ամեն էջում)
**Roles.** User+ ։ Guest → bell-ը չի ցուցադրվում; `/notifications` → redirect `/auth/login?next=/notifications`։
**Primary goal.** Մեկ տեղում հավաքել օգտատիրոջ բոլոր events-ը (հաղորդագրություններ, գույքի փոփոխություններ, moderation, alerts), **realtime badge**-ով, ու **արագ տանել target էջ** մեկ click-ով։

---

## 0. Ակնարկ (Overview)

Notifications-ը **re-engagement** գործիք է — այն վերադարձնում է օգտատիրոջը հարթակ, երբ ինչ-որ կարևոր բան է պատահում (նոր հաղորդագրություն, favorite-ի գնի անկում, saved-search match, listing-ի հաստատում)։ Երկու մակերես կա՝ (1) **bell dropdown** ամեն էջի header-ում՝ unread badge-ով, արագ peek-ի համար (վերջին ~10); (2) **full page** `/notifications`՝ ամբողջ history-ով, filter-ներով, per-item action-ներով։

Կարևորագույն վարքագիծ՝ ամեն notification **clickable** է և տանում է ուղիղ target-ին (հաղորդագրությունը → conversation, price-drop → property, match → search results)՝ միաժամանակ mark read անելով։ Badge-ը **realtime** է (Supabase Realtime subscription)՝ նոր event → badge +1 առանց reload-ի։ Notification-ը ստեղծվում/առաքվում է **միայն** եթե user-ի setting-ով (`21-settings.md`) միացված է համապատասխան channel-ը։

Bell dropdown-ը client component է (header-ի մաս); full page-ը SSR initial list + client pagination/realtime։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Նոր հաղորդագրություն, Արմինե (bell, desktop).** Արմինեն browse անում է search էջը։ Header-ի 🔔-ի վրա հանկարծ հայտնվում է «1» badge (realtime)։ Սեղմում է → dropdown-ում տեսնում «💬 Տիգրանից նոր հաղորդագրություն · հիմա» (bold, unread dot)։ Click → անցնում `/messages/551`, notification-ը mark read, badge → 0։

**Սցենար Բ — Price drop, Գագիկ (re-engagement, mobile).** Գագիկը favorite էր արել մի բնակարան։ Email-ով + push-ով ստանում է «📉 "Կենտրոն, 3 սենյակ"-ի գինը իջավ 5%-ով»։ Բացում է հավելվածը, bell-ից → dropdown → click → `/property/8423`՝ նոր գնով։ → re-engaged lead։

**Սցենար Գ — Listing moderation, Նարե (full page).** Նարեն տեղադրել էր հայտարարություն։ `/notifications` էջում տեսնում է «✅ Քո "Արաբկիր, 2 սենյակ" հայտարարությունը հաստատվեց»՝ կանաչ icon-ով։ Մի փոքր ներքև՝ հին «⏳ ... ավարտվում է 3 օրից»։ [•••] menu-ից հին-երը mark read անում, ապա **[Նշել բոլորը կարդացված]**։

---

## 2. Layout & visual structure

### Bell dropdown (ամեն էջում, desktop)

```
        🔔③  ◄ badge (unread count)
        │ click
        ▼
┌────────────────────────────────┐
│ Ծանուցումներ      [Նշել բոլորը] │  ◄ header
├────────────────────────────────┤
│ ● 💬 Տիգրանից նոր հաղ.   հիմա  │  ◄ unread (bold, bg-primary/5)
│ ● 📉 "Կենտրոն 3ս" գին↓   5ր     │
│   ✅ "Արաբկիր" հաստատվ.  2ժ     │  ◄ read (normal)
│   ⏳ "..." ավարտվում է   1օր    │
│   ... (scroll, ~10)            │
├────────────────────────────────┤
│ [Տեսնել բոլորը]  [⚙ Կարգավոր.] │  ◄ footer
└────────────────────────────────┘
```

### Full page (`/notifications`) — desktop

```
┌────────────────────────────────────────────────┐
│ HEADER (sticky)                                 │
├────────────────────────────────────────────────┤
│ Ծանուցումներ          [Նշել բոլորը կարդացված]  │
│ [Բոլորը][Չկարդացված][Հաղորդագր.][Գույք][Alerts]│  ◄ filter tabs
├────────────────────────────────────────────────┤
│ ● 💬 Տիգրանից նոր հաղորդագրություն   հիմա  [•••]│
│ ● 📉 "Կենտրոն 3ս" գինը իջավ 5%       5ր    [•••]│
│   ✅ "Արաբկիր 2ս" հաստատվեց           2ժ    [•••]│
│   🔍 3 նոր գույք "Երևան վարձ"-ին      1օր   [•••]│
│   ... (infinite scroll)                         │
└────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ 🔔③            (header)  │
├──────────────────────────┤
│ Ծանուցումներ             │
│ [Նշել բոլորը]            │
│ [Բոլ.][Չկար.][Հաղ.][Գ.] │  scroll-x
│ ● 💬 Տիգրանից... հիմա    │
│ ● 📉 գին↓... 5ր          │
│   ✅ հաստատվ... 2ժ       │
│   (infinite scroll)      │
└──────────────────────────┘
  bell tap → full page (ոչ dropdown)
```

- Mobile-ում bell tap → ուղիղ `/notifications` (dropdown-ի փոխարեն, քանի որ էկրանը նեղ է)։
- Filter tabs-ը mobile-ում horizontal scroll chip-ներ։

### Design tokens

| Տարր | Tailwind / արժեք |
|------|------------------|
| Bell badge | `absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 text-center` |
| Dropdown panel | `w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-lg border` |
| Notification item | `flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer` |
| Unread item | `bg-primary/5 font-medium` + unread dot `w-2 h-2 rounded-full bg-primary` |
| Read item | `text-gray-700` (normal weight) |
| Type icon | `w-9 h-9 rounded-full flex items-center justify-center` (գունավոր ֆոն ըստ type) |
| Relative time | `text-xs text-gray-400 ml-auto` |
| Filter tab | `px-3 h-9 text-sm`, active՝ `border-b-2 border-primary text-primary` |
| Mark all link | `text-sm text-primary hover:underline` |
| Empty state | `text-center text-gray-500 py-12` + icon |
| `[•••]` menu | `text-gray-400 hover:text-gray-700` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Header bell 🔔 dropdown (ամեն էջում)

- **Bell icon** header-ի աջ մասում + **badge** unread քանակով (`9+` overflow 9-ից ավելիի դեպքում)։ Badge realtime։
- **Click** → dropdown panel (վերջին ~10 notification, scroll)։ Outside click / Esc → փակվում։
- **Ամեն item.** Type icon + կարճ տեքստ + relative time («5ր առաջ»)՝ unread → bold + `bg-primary/5` + dot; read → normal։
- **Item click** → mark read + navigate target (dropdown փակվում)։
- **Dropdown footer.**
  - **[Նշել բոլորը կարդացված]** → `PATCH /api/notifications/read-all` → badge → 0 (optimistic)։
  - **[Տեսնել բոլորը]** → `/notifications`։
  - **[⚙ Կարգավորումներ]** → `/settings/notifications`։
- **Empty** → «Նոր ծանուցում չկա»։
- **Loading** → 3 skeleton row։

### 3.2 `/notifications` full page

- **Վերնագիր** «Ծանուցումներ» + **[Նշել բոլորը կարդացված]** (disabled եթե 0 unread)։
- **Filter tabs.** `[Բոլորը] [Չկարդացված] [Հաղորդագր.] [Գույք] [Alerts]` — active tab `border-b-2 border-primary`։
- **List** (infinite scroll, limit 20/page)՝ ամեն row՝ type icon, full տեքստ, relative time, `[•••]` menu, unread highlight։
- **Row click** → mark read → navigate target։
- **`[•••]` menu.** «Նշել կարդացված» / «Նշել չկարդացված» / «Ջնջել»։
- **Loading more** → spinner ներքևում; **end** → «Ավելի հին ծանուցում չկա»։

### 3.3 Notification types

| Type | Տեքստ (օրինակ) | Click → target | Icon / գույն |
|------|----------------|----------------|--------------|
| **Նոր հաղորդագրություն** | «{name}-ից նոր հաղորդագրություն» | `/messages/[conversationId]` | 💬 `bg-blue-50` |
| **Price drop (favorite)** | «"{property}"-ի գինը իջավ 5%-ով» | `/property/[id]` | 📉 `bg-orange-50` |
| **Saved-search match** | «3 նոր գույք համապատասխանում է "{search}"-ին» | `/saved-searches/[id]` / `/search?...` | 🔍 `bg-purple-50` |
| **Listing approved** | «Քո "{title}" հայտարարությունը հաստատվեց» | `/property/[id]` | ✅ `bg-green-50` |
| **Listing rejected** | «"{title}" մերժվեց — տես պատճառը» | `/listing/[id]/edit` | ⛔ `bg-red-50` |
| **Listing expiring soon** | «"{title}" ավարտվում է 3 օրից» | `/listing/[id]/edit` (renew) | ⏳ `bg-yellow-50` |
| **Նոր review (Agent)** | «{name}-ը գնահատեց քեզ ⭐4» | `/agent/[slug]#reviews` | ⭐ `bg-amber-50` |

### 3.4 Actions

- **Mark read** — item click կամ menu → `PATCH /api/notifications/[id]` (`read=true`)՝ optimistic։
- **Mark all read** — bell dropdown / page → badge → 0 (optimistic, ձախողման դեպքում rollback)։
- **Mark unread / Delete** — per-item `[•••]` menu։
- **Click → target** — միշտ navigate-ում է related էջ + mark read։
- **Badge count** — bell-ի վրա unread total, realtime update (Supabase channel)։
- **Settings link** — → `/settings/notifications` (per-type email/push toggle, տես `21-settings.md`)։

### 3.5 Empty & edge states

- **Empty** → «Դեռ ծանուցում չունես։ Երբ ինչ-որ բան պատահի (հաղորդագրություն, գնի փոփոխություն, match), այստեղ կհայտնվի» + bell illustration։
- **Stale target.** Ջնջված listing/conversation-ի click → graceful «Այս բովանդակն այլևս հասանելի չէ» (toast), notification-ը mark read։
- **Filter empty** → «Այս կատեգորիայում ծանուցում չկա»։

---

## 4. Վիճակների ամբողջական ցանկ (States)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|-------------------|
| **Loading (dropdown/page)** | Skeleton row-ներ |
| **Loaded, unread կա** | Badge թիվ + unread item-ները bold/highlighted |
| **Loaded, all read** | Badge թաքնված, item-ները normal |
| **Empty** | Illustration + «Դեռ ծանուցում չունես» |
| **Filter empty** | «Այս կատեգորիայում ծանուցում չկա» |
| **New realtime** | Badge +1 + (optional) toast «Նոր ծանուցում» |
| **Mark all (optimistic)** | Բոլորը անմիջապես read, badge → 0 |
| **Stale target click** | Toast «Այլևս հասանելի չէ» + mark read |
| **Loading more** | Spinner ներքևում |
| **End of list** | «Ավելի հին ծանուցում չկա» |
| **Error** | «Չհաջողվեց բեռնել» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

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

Props (key)՝ `<NotificationItem n: Notification, onClick />`; `<NotificationList filter: 'all'|'unread'|'messages'|'property'|'alerts' />`; `<BellBadge count: number, max: 9 />`; `<TypeIcon type: NotificationType />`։

### Data fields (notifications — տես 00-SPEC §7)

`notifications: id, user_id, type, payload(json), read, created_at`
`payload` օրինակ՝ `{ conversationId, propertyId, title, name, searchId, percent }` (ըստ type-ի)։

### API contract-ներ

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

**Realtime channel** `notifications:{user_id}` (Supabase Realtime)՝ INSERT event → client badge +1 + list prepend։

### Validation & rules

- **Ownership (RLS).** Բոլոր query-ները՝ `user_id == auth.uid()`; cross-user → `403`։
- **De-dup / grouping.** Նույն conversation-ի մի քանի message → մեկ grouped notification («3 նոր հաղորդագրություն {name}-ից»); server-side group ըստ `type + payload.conversationId` չկարդացածների մեջ։
- **Read sync (cross-channel).** Message կարդալով `/messages`-ում → related notification ավտոմատ mark read (backend trigger / event)։
- **Respect prefs.** Notification-ը ստեղծվում/առաքվում է **միայն** եթե user-ի `notification_prefs`-ով (email/push) միացված է (տես `21-settings.md`)։ In-app notification միշտ ստեղծվում է; email/push՝ ըստ prefs-ի։
- **Push.** Browser push (Phase 1 basic, `Notification` API + service worker) / mobile push (Phase 4)։
- **Auto-purge.** >90 օր notification-ները auto-delete (config, cron job)։

---

## 6. Responsive

- **≥1024px (lg).** Header bell dropdown (`w-80`); full page՝ filter tabs inline + row layout `[•••]` inline։
- **768–1023px (md).** Dropdown նույնը; full page row layout։
- **<768px (sm).** Bell tap → ուղիղ `/notifications` (ոչ dropdown); filter tabs → scroll-x chip; row-ները compact; `[•••]` menu touch-friendly։

---

## 7. Accessibility

- Bell՝ `aria-label="Ծանուցումներ, {n} չկարդացված"`, `aria-haspopup`, `aria-expanded`։
- Dropdown՝ `role="menu"` / `role="dialog"`, focus trap, Esc փակում, keyboard navigation (↑↓)։
- Unread state՝ ոչ միայն գույն — dot + `aria-label="չկարդացված"` + bold տեքստ։
- Realtime նոր notification՝ `aria-live="polite"` region («Նոր ծանուցում»)։
- Filter tabs՝ `role="tablist"`, `aria-selected`; `[•••]` menu՝ keyboard-accessible։
- Touch target ≥ 44px; contrast ≥ 4.5:1; type icon-ները՝ `aria-hidden` (տեքստն է կրում նշանակությունը)։

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated)։
- `<title>` = «Ծանուցումներ — {brand}»։
- Sitemap-ից բացառված; canonical չկա։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `notif_bell_open` | Bell dropdown բացում | `unread_count` |
| `notif_page_view` | `/notifications` load | `filter` |
| `notif_filter_change` | Filter tab փոխում | `filter` |
| `notif_click` | Notification item click | `type, notif_id` |
| `notif_mark_read` | Single mark read | `notif_id` |
| `notif_mark_all_read` | [Նշել բոլորը] | `count` |
| `notif_delete` | Per-item ջնջում | `notif_id` |
| `notif_settings_click` | [⚙ Կարգավորումներ] | — |
| `notif_realtime_received` | Realtime INSERT | `type` |
| `notif_stale_target` | Ջնջված target click | `type` |
