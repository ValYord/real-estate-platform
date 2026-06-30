# Էջ 06 — User Dashboard (Անձնական վահանակ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ին։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/dashboard` (My listings՝ `/dashboard/listings`, deep-link tab՝ `?tab=active`)
**Roles.** User+ (Agent-ի համար նույն dashboard-ը + cross-link դեպի Pro Dashboard, տես `18-pro-dashboard.md`)։ Guest → redirect `/auth/login?next=/dashboard`։
**Primary goal.** Օգտատիրոջ «home base»-ը՝ մեկ հայացքով տեսնել իր ակտիվությունը (հայտարարություններ, դիտումներ, հաղորդագրություններ, favorites) և **արագ անցնել գործողության** (նոր listing, պրոֆիլ, messages, listing-ի կառավարում)։

---

## 0. Ակնարկ (Overview)

Dashboard-ը login-ից հետո առաջին էջն է (default `next`)։ Այն **չի** marketing էջ, այլ **գործիքակազմ** — օգտատերը գալիս է այստեղ կոնկրետ առաջադրանքով՝ տեսնել իր listing-ի վիճակագրությունը, պատասխանել նոր հաղորդագրությանը, տեղադրել նոր գույք, կամ խմբագրել գինը։ Ուստի էջի առաջնահերթությունները՝ (1) **status at a glance** — overview card-երը վերևում ցույց են տալիս կարևորագույն թվերը (active listings, դիտումներ, unread, favorites) մեկ scan-ով; (2) **My listings management** — սրտն է էջի, ամեն listing-ի համար edit/promote/stats/delete ձեռքի տակ; (3) **quick actions** — «Տեղադրել հայտարարություն»-ը միշտ prominent։

Layout-ը **persistent left sidebar** + content area է (Zillow/Realtor dashboard-ի ոճով)։ Sidebar-ը navigation hub է account-ի բոլոր էջերի համար (favorites, messages, settings)։ Էջը render-վում է **SSR**-ով initial overview-ի համար, բայց counter-ները և My listings tab-ը client-side են (React Query)՝ optimistic update-ների և realtime badge-երի համար։

Agent role-ի դեպքում նույն dashboard-ն է, բայց overview-ում ավելանում է rating/reviews card և sidebar-ում՝ link դեպի Pro Dashboard։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Վաճառող Հասմիկը (manage listing, desktop).** Հասմիկը login-ից հետո ընկնում է dashboard։ Overview card-երից տեսնում է «1 հայտարարություն · 340 դիտում · 2 չկարդացված հաղորդագրություն»։ Սեղմում է messages card-ը → `/messages`։ Հետո վերադառնում, My listings tab-ից սեղմում [📊 Statistics] → modal-ում տեսնում դիտումների գրաֆիկը 30 օրվա կտրվածքով։

**Սցենար Բ — Վարձատու Տիգրանը (deactivate, mobile).** Տիգրանի բնակարանը արդեն վարձով տրվեց։ Բացում է dashboard-ը հեռախոսում, hamburger drawer-ից չի օգտվում — overview-ից scroll անում My listings, listing card-ի [•••] menu-ից սեղմում **[⏸ Ապաակտիվացնել]** → status-ը անմիջապես (optimistic) դառնում է «Արխիվ», badge-ը գորշանում։ Listing-ն այլևս public չէ։

**Սցենար Գ — Նոր օգտատեր Անին (empty state).** Անին նոր է գրանցվել։ Dashboard-ը դատարկ է՝ overview-ում ամեն card «0», recent activity-ում՝ «Դեռ ակտիվություն չկա»։ Կենտրոնում մեծ **[+ Տեղադրել առաջին հայտարարությունդ]** կոճակ → `/sell/new` (listing wizard)։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + content

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────┬─────────────────────────────────────────────┤
│ SIDEBAR      │ CONTENT                                       │
│ (w-64,       │  «Բարև, Հասմիկ 👋»  [avatar] [User badge]    │
│  sticky      │                                               │
│  top-16)     │  ┌── Overview cards (grid-cols-4 gap-4) ──┐  │
│              │  │ [🏠 1] [👁 340] [💬 2] [♡ 5]           │  │
│ 📊 Overview  │  └──────────────────────────────────────┘  │
│ 🏠 Իմ հայտ.  │                                               │
│ ♡ Favorites  │  Quick actions:                              │
│ 💬 Messages•2│  [+ Տեղադրել] [✏️ Պրոֆիլ]                     │
│ 🔔 Notif. •3 │                                               │
│ 🔍 Saved     │  ── Իմ հայտարարությունները ──                │
│ ⚙️ Settings  │  [Active][Draft][Pending][Archived]          │
│ ──────────   │  ┌── listing row ──────────────────────┐    │
│ ↪ Sign out   │  │ [img] Title · գին · badge            │    │
│              │  │ 👁340 ♡5 💬2   [✏️][📊][•••]          │    │
│              │  └──────────────────────────────────────┘    │
│              │  ── Վերջին ակտիվությունը ──                  │
│              │  · «5 մարդ դիտեց...»  · «Նոր հաղորդ...»       │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px) — drawer + stacked

```
┌──────────────────────────┐
│ HEADER (h-14)  [☰]       │
├──────────────────────────┤
│ «Բարև, Հասմիկ 👋»        │
│ [avatar] [User badge]    │
│                           │
│ Overview (grid-cols-2):  │
│ [🏠 1]  [👁 340]         │
│ [💬 2]  [♡ 5]           │
│                           │
│ [+ Տեղադրել հայտ.]       │
│                           │
│ Իմ հայտարարությունները   │
│ [Active][Draft][Arch.]   │
│ ┌── listing card ──┐     │
│ │ [img] Title       │     │
│ │ գին · badge       │     │
│ │ 👁340 ♡5 💬2 [•••]│     │
│ └──────────────────┘     │
│ Վերջին ակտիվությունը     │
└──────────────────────────┘
  (☰ → drawer՝ sidebar nav)
```

- Mobile-ում sidebar-ը դառնում է **hamburger drawer** (slide-in ձախից, `bg-white w-72 shadow-xl`, overlay `bg-black/40`)։
- Overview card-երը՝ desktop 4 սյունակ, tablet 2, mobile 2 (`grid grid-cols-2 lg:grid-cols-4`)։

### Design tokens

| Տարր | Tailwind / արժեք |
|------|------------------|
| Sidebar | `w-64 border-r border-gray-200 bg-white sticky top-16 h-[calc(100vh-4rem)]` |
| Sidebar nav item | `flex items-center gap-3 px-4 h-11 rounded-lg text-gray-700 hover:bg-gray-50` |
| Sidebar active | `bg-primary/10 text-primary font-medium` |
| Sidebar badge | `ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 text-center` |
| Greeting | `text-2xl font-semibold text-gray-900` |
| Role badge | `text-xs px-2 py-0.5 rounded-md` (User `bg-gray-100`, Agent `bg-blue-50 text-blue-600`, Verified `+✓`) |
| Overview card | `bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm cursor-pointer` |
| Card number | `text-2xl font-bold text-gray-900` |
| Card label | `text-sm text-gray-500` |
| Primary CTA | `bg-primary text-white h-11 rounded-lg px-4 font-medium hover:bg-primary/90` |
| Listing row | `flex gap-4 p-3 border border-gray-200 rounded-xl hover:shadow-sm` |
| Status badge active | `bg-green-100 text-green-700` |
| Status badge draft | `bg-gray-100 text-gray-600` |
| Status badge pending | `bg-yellow-100 text-yellow-700` |
| Status badge archived | `bg-gray-200 text-gray-500` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Greeting header

- **Տեսք.** «Բարև, {name} 👋» (`text-2xl font-semibold`) + avatar (`w-10 h-10 rounded-full`) + role badge։
- **Role badge.** User → `bg-gray-100` «Օգտատեր»; Agent → `bg-blue-50 text-blue-600` «Գործակալ»; verified agent → + ✓ «Հաստատված»։
- **Phone unverified warning.** Եթե `phone_verified == false`՝ դեղին inline banner «Հաստատիր հեռախոսդ՝ հայտարարություն տեղադրելու համար» + **[Հաստատել]** → `/auth/verify`։

### 3.2 Left sidebar nav

Link-եր (active state-ով, ընթացիկ էջը՝ `bg-primary/10 text-primary`):
- **📊 Overview** → `/dashboard`
- **🏠 Իմ հայտարարությունները** → `/dashboard/listings`
- **♡ Favorites** → `/favorites` (տես `07-favorites.md`)
- **💬 Messages** → `/messages`, badge՝ unread քանակ (realtime, տես `09-messages.md`)
- **🔔 Notifications** → `/notifications`, badge (տես `22-notifications.md`)
- **🔍 Saved searches** → `/saved-searches` (Phase 2, տես `08-saved-searches.md`)
- **⚙️ Settings** → `/settings` (տես `21-settings.md`)
- **(Agent only) 📈 Pro Dashboard** → `/pro/dashboard`
- **↪ Sign out** — confirm չկա; session ավարտ → redirect Home + toast «Դուրս եկար»։

**Վարք.** Hover՝ `bg-gray-50`; badge՝ `9+` overflow 9-ից ավելիի դեպքում; mobile-ում drawer-ի ներսում նույն list, ընտրությունից հետո drawer-ը փակվում է։

### 3.3 Overview cards

Ամեն card՝ թիվ (`text-2xl font-bold`) + label + click → target։ Grid `grid-cols-2 lg:grid-cols-4 gap-4`։

| Card | Տվյալ | Click → |
|------|-------|---------|
| **🏠 Իմ հայտարարությունները** | active listings count | My listings (Active tab) |
| **👁 Ընդամենը դիտումներ** | Σ `views_count` | My listings sorted by views |
| **💬 Չկարդացված** | unread messages count | `/messages` |
| **♡ Favorites** | պահված գույքերի քանակ | `/favorites` |
| **🔍 Saved searches** | (Agent/Phase 2) saved count | `/saved-searches` |
| **⭐ Rating** (Agent only) | rating + reviews | `/agent/[slug]#reviews` |

**Վիճակներ.** *Loading*՝ skeleton bar թվի փոխարեն; *0*՝ ցույց է տալիս «0» (ոչ դատարկ, ոչ «—»); *hover*՝ `shadow-sm`; *click*՝ navigate։

### 3.4 Quick actions

- **[+ Տեղադրել հայտարարություն]** (primary, prominent) → `/sell/new` (listing wizard, տես `04-listing-wizard.md`)։
  - **Limit guard.** Եթե user-ը հասել է active listing-ների սահմանին (օրինակ՝ 3 անվճար) → կոճակը ցույց է տալիս upsell tooltip «Հասել ես անվճար սահմանին։ Անցիր Pro-ի» (Phase 2)։
- **[✏️ Խմբագրել պրոֆիլ]** (secondary) → `/settings` (Profile tab)։
- **(Agent) [⭐ Promote listing]** → pricing (Phase 2)։

### 3.5 My listings tab (էջի սիրտը)

**Sub-tabs** (filter ըստ status, deep-link `?tab=`):
- **[Active]** — `status = active` (հաստատված, public)
- **[Draft]** — `status = draft` (անավարտ wizard)
- **[Pending]** — moderation-ի սպասող (Phase 2)
- **[Archived]** — `status = archived` / sold / expired

**Listing row/card-ի կազմ.** Thumbnail (`w-24 h-20 rounded-lg`), title, գին, status badge, key stats (👁 դիտումներ · ♡ favorites · 💬 messages)։

**Per-listing actions** (desktop՝ inline buttons + `[•••]` overflow; mobile՝ `[•••]` menu):
- **[✏️ Խմբագրել]** → `/listing/[id]/edit`
- **[⏸ Ապաակտիվացնել]** / **[▶️ Ակտիվացնել]** → toggle `status` active↔archived (instant, optimistic UI; ձախողման դեպքում rollback + toast)
- **[📊 Statistics]** → modal՝ դիտումների line chart ժամանակի ընթացքում (7/30/90 օր), favorites, messages, lead-եր
- **[🗑 Ջնջել]** → **confirm modal** «Հաստա՞տ ես ուզում ջնջել "{title}"-ը։ Սա անշրջելի է» → [Չեղարկել] / [Ջնջել (red)] → `DELETE`
- **[⭐ Promote]** → promote flow (Phase 2)
- **(Draft) [Շարունակել խմբագրումը]** → wizard-ը նույն քայլից (`step` պահված է draft-ում)

**Expiring soon.** Listing-ը մոտ ժամկետի ավարտին → badge «Ավարտվում է 3 օրից» (`bg-orange-100 text-orange-700`) + **[Երկարացնել]**։

**Empty states.**
- *Active tab դատարկ* → «Դեռ ակտիվ հայտարարություն չունես» + **[+ Տեղադրել]**։
- *Draft tab դատարկ* → «Սևագիր չկա»։
- *Archived դատարկ* → «Արխիվում դատարկ է»։

### 3.6 Recent activity feed

Ժամանակագրական feed՝ վերջին events (`text-sm`, icon + տեքստ + relative time):
- «👁 {X} մարդ դիտեց քո "{listing title}"-ը»
- «💬 Նոր հաղորդագրություն {name}-ից» → `/messages/[id]`
- «✅ Քո "{title}" հայտարարությունը հաստատվեց» → `/property/[id]`
- «⛔ "{title}" մերժվեց — տես պատճառը» → `/listing/[id]/edit`
- «♡ {name}-ը favorite արեց քո գույքը»
- «🔍 Saved search match՝ 3 նոր գույք» (Phase 2)
- **Empty** → «Դեռ ակտիվություն չկա։ Տեղադրիր առաջին հայտարարությունդ»։
- Pagination՝ «Տեսնել ավելին» / infinite scroll (limit 20/page)։

---

## 4. Վիճակների ամբողջական ցանկ (States)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|-------------------|
| **Loading** | Sidebar render + overview card skeleton + listing rows skeleton |
| **Loaded (User)** | Overview + quick actions + My listings + activity feed |
| **Loaded (Agent)** | + rating card + Pro Dashboard sidebar link |
| **Empty (new user)** | Բոլոր card «0» + կենտրոնական [+ Տեղադրել առաջին հայտ.] |
| **Listing limit reached** | [+ Տեղադրել]-ին upsell tooltip «Անցիր Pro-ի» |
| **Phone unverified** | Դեղին banner վերևում + [Հաստատել] |
| **Optimistic toggle** | Status badge անմիջապես փոխվում, ձախողման դեպքում rollback |
| **Delete confirm** | Modal «անշրջելի է» + [Չեղարկել]/[Ջնջել] |
| **Error (API fail)** | «Չհաջողվեց բեռնել» + [Կրկին փորձել] |
| **Realtime update** | Messages/Notifications badge +1 առանց reload |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<DashboardLayout> (Server Component, SSR shell)
 ├─ <Sidebar nav active />            (client՝ active state + badge)
 │   └─ <SidebarBadge channel="messages|notifications" />  (realtime)
 └─ <DashboardContent>
     ├─ <GreetingHeader user />
     ├─ <OverviewCards data={Counts} />          (client, React Query)
     ├─ <QuickActions canCreate limitReached />
     ├─ <MyListings>                              (client)
     │   ├─ <ListingTabs active onChange />
     │   ├─ <ListingRow property actions /> ×N
     │   │   └─ <ListingActionsMenu onEdit onToggle onStats onDelete />
     │   ├─ <StatsModal listingId />              (lazy)
     │   └─ <DeleteConfirmModal />
     └─ <RecentActivity items paginated />        (client)
```

Props (key)՝ `<OverviewCards data: { listings, views, unread, favorites, savedSearches } />`; `<ListingRow property: Property, onToggleStatus, onDelete, onPromote />`; `<SidebarBadge channel, userId />` (Supabase Realtime subscribe)։

### Data fields (properties + users — տես 00-SPEC §7)

`properties: id, owner_id, title{hy,ru,en}, deal_type, status, property_type, price, currency, area_m2, rooms, views_count, is_featured, created_at, expires_at(config)`
Overview counts՝ aggregate queries (active listings count, Σ views, unread messages, favorites count)։

### API contract-ներ

**`GET /api/dashboard/overview`**
```jsonc
// 200 OK
{ "listings": 1, "views": 340, "unread": 2, "favorites": 5,
  "savedSearches": 0,
  "agent": { "rating": 4.8, "reviews": 12 }   // null եթե ոչ-agent
}
```

**`GET /api/dashboard/activity?cursor=...`**
```jsonc
// 200 { "items": [ { "type": "view", "listingId": 8423, "count": 5,
//                    "title": "...", "at": "2026-06-22T10:00:00Z" } ],
//       "nextCursor": "..." }
```

**`GET /api/listings/mine?status=active|draft|pending|archived`**
```jsonc
// 200 { "items": [ { "id": 8423, "title": {...}, "price": 52000000,
//                    "currency": "AMD", "status": "active",
//                    "stats": { "views": 340, "favorites": 5, "messages": 2 },
//                    "thumbnail": "...", "expiresAt": "..." } ] }
```

**`PATCH /api/listings/[id]`** → `{ "status": "archived" }` → `200 { "status": "archived" }` · `403 { "error": "not_owner" }`

**`DELETE /api/listings/[id]`** → `200 { "deleted": true }` · `404`

**`GET /api/listings/[id]/stats?range=30d`** → `200 { "viewsSeries": [...], "favorites": 5, "messages": 2, "leads": 1 }`

### Validation & rules

- **Ownership (RLS).** Բոլոր mine/stats/patch/delete query-ները՝ `owner_id == auth.uid()`; հակառակ դեպքում `403`։
- **Status transition.** Թույլատրելի՝ `active ↔ archived`, `draft → active` (միայն եթե listing-ը ամբողջական է, wizard validation pass)։ `sold/pending` → admin/system-driven։
- **Optimistic update.** React Query `onMutate` → cache update; `onError` → rollback + toast «Չհաջողվեց, փորձիր կրկին»։
- **Realtime.** Supabase Realtime channel `dashboard:{user_id}` → messages/notifications counter update։

---

## 6. Responsive

- **≥1024px (lg).** Persistent sidebar (`w-64`) + content; overview 4 սյունակ; listing-ները row layout inline action-ներով։
- **768–1023px (md).** Sidebar collapse-ի հնարավորություն (icon-only `w-16`) կամ drawer; overview 2 սյունակ։
- **<768px (sm).** Sidebar → hamburger drawer; overview 2 սյունակ; listing-ները card layout `[•••]` menu-ով; quick action-ները՝ full-width stacked։

---

## 7. Accessibility

- Sidebar՝ `<nav aria-label="Անձնական վահանակ">`, active item՝ `aria-current="page"`։
- Badge-երը՝ `aria-label="{n} չկարդացված"` (ոչ միայն գույն)։
- Overview card-երը՝ `role="link"` / `<a>`, focus-visible ring; keyboard-ով հասանելի։
- `[•••]` menu՝ keyboard navigation (↑↓, Enter, Esc), focus trap բացված ժամանակ։
- Delete confirm modal՝ focus trap, `role="dialog"`, Esc փակում, destructive կոճակը՝ ոչ default focus։
- Touch target ≥ 44px; contrast ≥ 4.5:1; status badge-երը՝ տեքստ + գույն (ոչ միայն գույն)։

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated)։
- `<title>` = «Անձնական վահանակ — {brand}»։
- Canonical չկա; sitemap-ից բացառված։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `dashboard_view` | Էջի load | `role` |
| `overview_card_click` | Overview card click | `card` |
| `quick_action_create` | [+ Տեղադրել] click | `limit_reached` |
| `listing_tab_change` | Sub-tab փոխում | `tab` |
| `listing_edit_click` | [✏️ Խմբագրել] | `listing_id` |
| `listing_status_toggle` | Activate/deactivate | `listing_id, to_status` |
| `listing_stats_open` | [📊] modal բացում | `listing_id` |
| `listing_delete` | Confirm delete | `listing_id` |
| `listing_promote_click` | [⭐ Promote] | `listing_id` |
| `activity_load_more` | Feed pagination | `cursor` |
| `upsell_pro_shown` | Limit upsell tooltip | — |
