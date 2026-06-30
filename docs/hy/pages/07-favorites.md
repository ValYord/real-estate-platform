# Էջ 07 — Favorites / Saved Listings (Ընտրանի) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ի կառուցվածքին։

**URL.** `/favorites` — օրինակ՝ `/hy/favorites?sort=price_drop`
**Roles.** User+ (login պարտադիր)։ Guest → login wall (ուղիղ `/favorites` բացելիս) կամ login modal (♡ սեղմելիս ուրիշ էջից)։
**Primary goal (re-engagement).** Օգտատիրոջը վերադարձնել նախկինում հավանած գույքերին և մղել **գործողության** (կապ հաստատել, համեմատել) — հատկապես երբ գինն իջել է կամ կարգավիճակը փոխվել է։ Սա retention-ի և կրկնակի այցի գլխավոր էջն է։

---

## 0. Ակնարկ (Overview)

Ընտրանին օգտատիրոջ **անձնական shortlist-ն** է։ Property card-ի կամ property էջի ♡-ը այստեղ է հավաքում ամեն ինչ։ Էջի արժեքը երկակի է. (1) **հարմարություն** — մարդը մեկ տեղում տեսնում է իր համար կարևոր գույքերը առանց նորից որոնելու, և (2) **conversion trigger** — մենք card-երի վրա ցույց ենք տալիս, թե ի՛նչ է փոխվել պահելուց հետո (գինն իջավ, ամրագրվեց, հանվեց), որ մարդը վերադառնա ու գործի։

Էջը render-վում է **SSR**-ով auth-gated layout-ում (cookie-ից session)։ Card grid-ը client component է React Query-ով՝ optimistic ♡ remove, undo և header counter-ի sync-ի համար։ Տվյալների կորիզն է `favorites` join `properties` join `property_media`, plus `saved_price` (պահելու պահի գինը)՝ price-drop-ը հաշվելու համար։

Phase 1-ում՝ մեկ flat ցուցակ, sort, price-drop/status indicator-ներ։ Phase 2-ում՝ collections/folders և compare checkbox։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Վարձակալ Մարիան (desktop).** Մարիան շաբաթվա ընթացքում ♡-ով պահել է 9 բնակարան։ Բացում է `/favorites`, sort-ը դնում «Գնի իջեցում»՝ վերև բարձրացնելու էժանացածները։ Տեսնում է, որ Արաբկիրի բնակարանի վրա կարմիր chip՝ «🔻 −5%»։ Click անում card-ի վրա → property էջ → գրում վաճառողին։ → Price-drop indicator-ը բերեց lead։

**Սցենար Բ — Գնորդ Արամը (mobile).** Արամը 4 գույք է պահել ամսվա ընթացքում։ Բացում է ընտրանին, տեսնում, որ մեկը grayscale-ով՝ «Այլևս հասանելի չէ»։ Սեղմում **[Տես նմանատիպ]** → search՝ նույն չափանիշներով։ Մյուս card-ի ♡-ը սխալմամբ սեղմում, toast-ի **[Հետ բերել]**-ով վերականգնում։

**Սցենար Գ — Ներդրող Դավիթը (Phase 2, collections).** Դավիթը 20+ գույք է պահել։ Ստեղծում է երկու ցուցակ՝ «Ներդրման համար» և «Ընտանիքի համար», card-ների «⋯»-ից տեղափոխում համապատասխան ցուցակ։ Վերևի chip-երով filter անում միայն «Ներդրման համար»-ը։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Ընտրանի                            │
│ H1 «Ընտրանի»  12 գույք                                      │
├────────────────────────────────────────────────────────────┤
│ TOOLBAR                                                     │
│ [Բոլորը·Արաբկիր·Ներդրում] (P2 chips)   [Դասավորել ▾] [⚖][🔔]│
├────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ Card   │ │ Card   │ │ Card   │ │ Card   │  (lg: 3-4 col) │
│ │ 🔻−5%  │ │        │ │ Ամրագ. │ │        │               │
│ └────────┘ └────────┘ └────────┘ └────────┘               │
│ ┌────────┐ ┌────────┐ …                                    │
│ └────────┘ └────────┘                                      │
│ [Տես ավելին]  (կամ infinite scroll)                        │
│ FOOTER                                                      │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Հետ   Ընտրանի (12)     │
│ [Դասավորել ▾]  [⚖] [🔔]  │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ Card (full-width)    │ │
│ │ 🔻 −5%               │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Card                 │ │
│ └──────────────────────┘ │
│ …                        │
│ FOOTER                   │
└──────────────────────────┘
```

- Grid՝ `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`։
- Toolbar՝ sticky `top-16` desktop-ում (`bg-white/95 backdrop-blur border-b`)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 վերնագիր | `text-2xl font-semibold text-gray-900` |
| Քանակ (count) | `text-base text-gray-500 ml-2` |
| Toolbar | `flex items-center justify-between h-14` |
| Sort dropdown | `border border-gray-200 rounded-lg h-10 px-3 text-sm` |
| Price-drop chip | `bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded-md` |
| Price-up chip | `bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-md` |
| Status badge «Ամրագրված» | `bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-md` |
| Unavailable overlay | `grayscale opacity-60` + `bg-black/40` banner |
| Card | `shadow-sm border border-gray-200 rounded-xl overflow-hidden` |
| ♡ filled | `text-red-500 fill-red-500` |
| Empty illustration | `w-32 h-32 text-gray-300 mx-auto` |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-72` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Page header

- **Breadcrumbs.** `Գլխավոր › Ընտրանի` (`text-sm text-gray-500`, separator `›`)։
- **H1.** «Ընտրանի» + քանակ՝ «Ընտրանի 12 գույք»։ Քանակ 0 → subtitle-ը թաքնված, ցուցադրվում է empty state։
- **Subtitle** (եթե ≥1)՝ «Քո պահած գույքերը» (`text-gray-500 text-sm`)։

### 3.2 Toolbar

- **Sort dropdown `[Դասավորել ▾]`.** Ընտրությունը պահվում է URL query-ով (`?sort=`)՝ shareable և back-button-friendly։ Տարբերակներ.
  - Վերջերս ավելացված (`?sort=recent`, default, `favorites.created_at desc`)
  - Գին՝ էժանից թանկ (`?sort=price_asc`)
  - Գին՝ թանկից էժան (`?sort=price_desc`)
  - Գնի իջեցում (`?sort=price_drop`, առաջ՝ price-drop ունեցողները, ապա ըստ իջեցման %)
  - **States.** default (label «Դասավորել»), open (panel `shadow-lg rounded-lg`), selected (✓ ընտրվածի կողքին `text-primary`)։
- **Currency note.** Գները ցուցադրվում են header-ի ընտրած արժույթով (live rate); secondary՝ բնօրինակ արժույթ եթե տարբեր։
- **[⚖ Համեմատել ընտրվածները]** (Phase 2)՝ disabled (`text-gray-300`) մինչև ≥2 compare checkbox նշված; active → `/compare?ids=...`։
- **[🔔 Պահված որոնումներ]** cross-link → `/saved-searches` (`08-saved-searches.md`)։

### 3.3 Grid of saved property cards

- Ամեն card = standard **PropertyCard** (նկար slider, գին, ♡, 🛏/📐/🏢, հասցե, badge)։ Click card-ի մարմնի վրա → `/property/[id]/[slug]`։
- **♡ toggle (լցված սիրտ՝ default այստեղ).** Click → optimistic remove (card fade-out `transition-opacity`) → `DELETE /api/favorites/[propertyId]`։
  - Success՝ card-ը անհետանում է + **Toast** «Հանված է ընտրանուց» + **[Հետ բերել]** (undo, 5 վրկ countdown)։
  - Undo click → `POST /api/favorites` վերականգնում + card վերադառնում է իր տեղը։
  - Error՝ rollback (card վերադառնում) + toast «Չհաջողվեց, փորձիր նորից»։
- **Compare checkbox** (Phase 2)՝ card-ի վերին ձախ անկյունում `absolute top-2 left-2`, նշում/հանում համեմատությունից։
- **States per card.** default · hover (`shadow-md scale-[1.01]`) · removing (fade) · unavailable (grayscale, ниже)։

### 3.4 Indicators on saved items (կարևոր)

Card-ի վրա badge/ribbon՝ ի՛նչ է փոխվել **այս գույքի մոտ քո պահելուց հետո**.

- **🔻 Գինն իջել է** — chip «−5%» կամ «−2,000,000 ֏» (`bg-red-50 text-red-600`)։ Հաշվ՝ `saved_price` (պահելու պահի) vs ընթացիկ `price`։ Threshold՝ < 1% փոփոխությունը չենք ցույց տալիս։
- **🔺 Գինը բարձրացել է** — chip «+3%» (subtle gray, ոչ կարմիր)։
- **Status change.**
  - `pending` → badge «Ամրագրված» (amber)։
  - `sold` / `rented` → grayscale overlay + banner «Այլևս հասանելի չէ» + **[Հեռացնել]** / **[Տես նմանատիպ]** (→ `/search` նույն չափանիշներով)։
  - `archived` / deleted → placeholder card «Հանված է հրապարակումից» + **[Հեռացնել]** (auto-removable)։
- Indicator-ի տվյալը գալիս է `favorites.saved_price` + property-ի ընթացիկ վիճակից, diff-ը հաշվ server-side։

### 3.5 Collections / Folders (🟡 Phase 2)

- **[+ Նոր ցուցակ]** — օգտատերը խմբավորում է ընտրանին (օր․ «Արաբկիր», «Ներդրման համար», «Ծնողների համար»)։
- Tabs/chips վերևում՝ «Բոլորը · Արաբկիր · Ներդրում …» (active chip `bg-primary text-white`)։
- Card-ի «⋯» menu → **[Տեղափոխել ցուցակ ▾]**։
- Տվյալ՝ `favorite_collections(id, user_id, name)` + `favorites.collection_id`։
- *Phase 1-ում՝ մեկ flat ցուցակ, collections-ը հետո։*

### 3.6 Empty state

Երբ 0 պահված գույք.
- Icon (դատարկ սիրտ `w-32 h-32 text-gray-300`) + վերնագիր «Դեռ ոչինչ չես պահել»։
- Տեքստ՝ «Սեղմիր ♡-ը ցանկացած գույքի վրա՝ այստեղ պահելու համար»։
- **[Որոնել գույք]** primary → `/search`։
- Cross-link՝ «Կամ ստեղծիր **պահված որոնում**՝ նոր գույքերի մասին ծանուցում ստանալու համար» → `/saved-searches`։

### 3.7 Guest state (login wall)

- Guest-ը ուղիղ բացում է `/favorites` → **login wall** card (centered, `max-w-md`)։
- Տեքստ՝ «Մուտք գործիր՝ քո ընտրանին տեսնելու համար»։
- **[Մուտք գործել]** → `/auth/login?redirect=/favorites` · **[Գրանցվել]** → `/auth/register`։
- **Guest-ի ♡ ուրիշ էջերում.** Property card/էջի ♡ սեղմելիս՝ login modal (`/auth/login?redirect=…&fav=[id]`)։ Login-ից հետո՝ intent-ը կատարվում է ավտոմատ (գույքը պահվում է)։ Optional՝ guest-ի ♡-ը պահել `localStorage`-ում ու login-ից հետո sync անել։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Grid skeleton (8–12 gray card shimmer) + toolbar disabled |
| **Loaded (≥1)** | Card grid + toolbar (sort, count) |
| **Empty (0)** | Դատարկ սիրտ illustration + «Դեռ ոչինչ չես պահել» + [Որոնել գույք] |
| **Guest** | Login wall card՝ [Մուտք գործել] / [Գրանցվել] |
| **Card removing** | Optimistic fade-out + toast «Հանված է ընտրանուց» + [Հետ բերել] |
| **Card unavailable** | Grayscale overlay «Այլևս հասանելի չէ» + [Տես նմանատիպ] |
| **Card deleted** | Placeholder «Հանված է հրապարակումից» + [Հեռացնել] |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |
| **Loading more** | Ներքևում spinner / skeleton row (infinite scroll / «Տես ավելին») |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<FavoritesPage> (Server Component, SSR, auth-gated)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <FavoritesHeader count={number} />
 ├─ <FavoritesToolbar sort onSortChange collections />   (client)
 ├─ <CollectionTabs collections active />                 (P2, client)
 ├─ <FavoritesGrid>                                       (client, React Query)
 │   └─ <PropertyCard property indicator onUnfavorite />  (×N)
 │       ├─ <PriceDropChip saved current />
 │       └─ <StatusBadge status />
 ├─ <LoadMore /> | infinite scroll sentinel
 ├─ <EmptyFavorites />      (պայմանով՝ count===0)
 └─ <FavoritesLoginWall />  (պայմանով՝ guest)
```

### Data fields used

`favorites(user_id, property_id, saved_price, collection_id, created_at)` join `properties(id, slug, title{}, price, currency, status, deal_type, property_type, area_m2, rooms, floor, floors_total, city, district, address)` join `property_media(url, order)`։ Հաշված դաշտ՝ `price_change_pct = (price - saved_price) / saved_price`։

### API contract-ներ

**`GET /api/favorites?sort=price_drop&collection=&page=1`**
```jsonc
// 200 OK
{
  "items": [
    {
      "propertyId": 8423,
      "slug": "yerevan-arabkir-2-senyak-bnakaran",
      "title": { "hy": "2 սենյականոց բնակարան" },
      "price": 49400000, "currency": "AMD",
      "savedPrice": 52000000,
      "priceChangePct": -0.05,
      "status": "active",
      "media": [{ "url": "...", "order": 0 }],
      "rooms": 2, "area": 75, "floor": 4, "floorsTotal": 9,
      "city": "Yerevan", "district": "Arabkir"
    }
  ],
  "total": 12,
  "page": 1,
  "pageSize": 24
}
// 401 { "error": "auth_required" }   → login wall
```

**`POST /api/favorites`** → `{ "propertyId": 8423 }` → `200 { "favorited": true }`

**`DELETE /api/favorites/[propertyId]`** → `200 { "favorited": false }` (undo = կրկին POST)

**(P2) `POST /api/favorite-collections`** → `{ "name": "Ներդրման համար" }` → `201 { "id": 7 }`

**(P2) `PATCH /api/favorites/[propertyId]`** → `{ "collectionId": 7 }` → `200`

### Validation & logic (zod)

```ts
const sortSchema = z.enum(["recent","price_asc","price_desc","price_drop"]).default("recent");
const collectionSchema = z.object({
  name: z.string().min(1, "Անվանումը պարտադիր է").max(40),
});
```

- Price-drop՝ ցույց ենք տալիս միայն եթե `|price_change_pct| ≥ 0.01`։
- ♡ remove՝ optimistic; error → rollback + toast։
- Header favorites counter՝ shared React Query cache, invalidate ամեն toggle-ից հետո (sync ամեն էջում)։
- Pagination՝ page size 24, infinite scroll (`IntersectionObserver` sentinel) կամ «Տես ավելին»։

---

## 6. Responsive

- **≥1280px (xl).** Grid 4 սյունակ; toolbar sticky `top-16`։
- **1024–1279px (lg).** Grid 3 սյունակ։
- **768–1023px (md).** Grid 2 սյունակ; toolbar wrap։
- **<768px (sm).** Grid 1 սյունակ full-width; breadcrumbs collapsed «‹ Հետ»; sort-ը bottom-sheet modal-ով։

---

## 7. Accessibility

- ♡ կոճակ՝ `aria-label="Հանել ընտրանուց"` (filled վիճակ), `aria-pressed="true"`։
- Toast undo՝ `role="status"`, **[Հետ բերել]** focusable, countdown-ը `aria-live="polite"`-ով չի կարդացվում ամեն վայրկյան (միայն հայտնվելիս)։
- Card grid՝ `<ul>/<li>` semantic, ամեն card-ը keyboard-հասանելի (Enter = open)։
- Sort dropdown՝ ARIA listbox pattern, ←/→/Enter նավիգացիա։
- Status overlay banner՝ `role="status"`; contrast ≥ 4.5:1; touch target ≥ 44px։

---

## 8. SEO & meta

- **noindex, nofollow** — անձնական, auth-gated էջ (`robots: noindex, nofollow`)։
- `<title>` = «Ընտրանի | {brand}» (UX-ի համար, ոչ SEO)։
- Չունի structured data, OG image (private)։
- Sort query (`?sort=`)՝ `canonical` դեպի base `/favorites`։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `favorites_view` | Էջի load | `count` |
| `favorite_remove` | ♡ toggle off | `property_id` |
| `favorite_undo` | Toast [Հետ բերել] | `property_id` |
| `favorites_sort_changed` | Sort dropdown | `sort` |
| `favorite_card_click` | Card → property | `property_id` |
| `price_drop_shown` | Price-drop chip render | `property_id, pct` |
| `unavailable_similar_click` | [Տես նմանատիպ] | `property_id` |
| `compare_select` (P2) | Compare checkbox | `property_id` |
| `collection_create` (P2) | [+ Նոր ցուցակ] | `name` |
