# Էջ 03 — Property Detail (Գույքի մանրամասների էջ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3, gold standard) — սա կաղապար է, որին հետևելու են մնացած էջերի spec-երը։ Ներառում է՝ ակնարկ, օգտագործման սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, analytics, SEO։

**URL.** `/property/[id]/[slug]` — օրինակ՝ `/hy/property/8423/yerevan-arabkir-2-senyak-bnakaran`
**Roles.** Բոլորը (Guest, User, Agent, Admin) կարող են դիտել; favorite/contact/report գործողությունները պահանջում են login (Guest → login modal `?next`-ով)։
**Primary goal (conversion).** Այցելուն դիտի գույքը և **կապ հաստատի վաճառողի հետ** — ուղարկի հաղորդագրություն կամ բացի հեռախոսահամարը։ Էջի ամեն տարր ծառայում է այս մեկ նպատակին։

---

## 0. Ակնարկ (Overview)

Սա կայքի **ամենակարևոր conversion էջն է**։ Search էջը մարդուն բերում է այստեղ, և հենց այստեղ է որոշվում՝ նա կկապվի՞ վաճառողի հետ, թե՞ կհեռանա։ Ուստի էջը պետք է՝ (1) արագ ցույց տա գլխավորը (նկար + գին + key facts) առանց scroll-ի, (2) կառուցի վստահություն (verified badge, գործակալի rating, ամբողջական տեղեկություն), և (3) ամեն պահ ձեռքի տակ պահի **«Կապ հաստատել»** գործողությունը (sticky contact card desktop-ում, fixed bottom bar mobile-ում)։

Էջն ունի **երկու ռեժիմ**.
- **Visitor view** — ուրիշի գույք (default ռեժիմ)։ Աջ սյունակում՝ contact card վաճառողի հետ կապվելու համար։
- **Owner view** — այցելուի սեփական գույքը (`owner_id == current_user.id`)։ Contact card-ի փոխարեն ցուցադրվում է management bar (խմբագրել / վիճակագրություն / ջնջել)։

Էջը render-վում է **SSR**-ով (Server Component) SEO-ի և արագ first paint-ի համար; ինտերակտիվ բաժինները (gallery lightbox, map, contact form, similar) client component-ներ են։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Արամը (mobile).** Արամը Facebook-ից սեղմել է գույքի link-ի վրա։ Էջը բացվում է հեռախոսում։ Տեսնում է առաջին նկարը full-width, swipe անում 8 նկար, սեղմում 360° tab-ը և պտտում սենյակը։ Scroll անելով կարդում է նկարագրությունը, տեսնում քարտեզը։ Ներքևի fixed bar-ից սեղմում է **«📞 Զանգ»**, համարը բացվում է հեռախոսի dialer-ում։ → Lead-ը գրանցվեց (`phone_revealed` event)։

**Սցենար Բ — Վարձակալ Մարիան (desktop).** Մարիան համեմատում է 3 բնակարան։ Այս էջում սեղմում է **♡**-ը և ավելացնում favorites (toast «Ավելացվեց ընտրանի»)։ Կարդում է amenities-ը, տեսնում «Կահույքով ✓»։ Աջի contact card-ից գրում է՝ «Բարև, հնարավո՞ր է դիտում շաբաթ օրը»։ → Conversation-ը ստեղծվեց, վաճառողին email-ով ծանուցում գնաց։

**Սցենար Գ — Սեփականատեր Դավիթը (owner view).** Դավիթը բացում է իր հայտարարությունը՝ ստուգելու։ Contact card-ի փոխարեն տեսնում է **«📊 1,240 դիտում · 18 favorite · 3 հաղորդագրություն»** + **«✏️ Խմբագրել»** կոճակ։ Նկատում է, որ գինը հին է, սեղմում է edit-ը և անցնում listing wizard-ի համապատասխան քայլին։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — երկսյունակ

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10, text-sm, text-gray-500)                  │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN COLUMN (≈62%, max-w-760)  │ ► SIDEBAR (≈38%, w-380)  │
│                                   │                          │
│ ┌─── Photo gallery ───┐          │ ┌── Contact card ──┐     │
│ │ 1 մեծ + 2×2 փոքր     │          │ │ (sticky top-20)   │     │
│ │ h-[480px] rounded-xl │          │ │ avatar + անուն    │     │
│ └─────────────────────┘          │ │ ⭐ rating         │     │
│ [📷][🎥][🌐 360°][🗺][📐] tabs   │ │ [💬 Հաղորդագր.]   │     │
│ Գին (text-3xl bold)              │ │ [📞 Հեռախոս]      │     │
│ H1 վերնագիր + 📍 հասցե           │ │ quick form        │     │
│ Key facts row (icons)            │ │ anti-spam note    │     │
│ ── Նկարագրություն ──             │ └──────────────────┘     │
│ ── Հատկություններ (dl աղյուսակ)  │                          │
│ ── Հարմարություններ (grid) ──    │  (card-ը scroll-ի հետ    │
│ ── Հատակագիծ ──                  │   sticky է մնում մինչև    │
│ ── Քարտեզ (h-[360px]) ──         │   footer-ին հասնելը)     │
│ ── Mortgage mini-calc ──         │                          │
├──────────────────────────────────┴─────────────────────────┤
│ Նմանատիպ գույքեր (carousel, full-width)                     │
│ Վերջերս դիտված (carousel)                                   │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — մեկ սյունակ

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ Gallery (full-bleed,     │
│ swipe, h-[280px])  ♡ ⤴ ⚑ │
├──────────────────────────┤
│ Գին text-2xl             │
│ H1 + 📍                  │
│ Key facts (wrap)         │
│ Նկարագրություն           │
│ Հատկություններ           │
│ Հարմարություններ         │
│ Քարտեզ h-[260px]         │
│ Mortgage mini            │
│ Նմանատիպ (scroll-x)      │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BOTTOM BAR (h-18)  │
│ [💬 Գրել] [📞 Զանգ]  ♡  │
└──────────────────────────┘
```

- Gallery-ն full-width swipeable carousel է, `h-[280px]`։
- Contact card-ը **չի** sticky-անում վերևում; փոխարենը՝ ներքևում **fixed bottom bar** (`h-18 / 72px`, `bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`)՝ `[💬 Գրել] [📞 Զանգ]` + ♡։
- Բոլոր բաժինները stack են լինում իրար տակ՝ ամբողջ լայնքով։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Գին (price) | `text-3xl font-bold text-gray-900` (rent՝ + `text-base font-normal text-gray-500` «/ամիս») |
| Բնօրինակ արժույթ (secondary) | `text-sm text-gray-400` (օր․ «≈ $880») |
| H1 վերնագիր | `text-2xl font-semibold text-gray-900 leading-tight` |
| Բաժնի վերնագիր (H2) | `text-xl font-semibold`, վերևում `border-t border-gray-200 pt-6 mt-6` |
| Key facts icon | `w-5 h-5 text-gray-600`, տող՝ `flex flex-wrap gap-6` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full hover:bg-primary/5` |
| Badge NEW | `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md` |
| Badge REDUCED | `bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md` |
| Badge FEATURED | `bg-amber-100 text-amber-700` |
| Badge Verified | `bg-blue-50 text-blue-600` + ✓ |
| Card shadow | `shadow-sm border border-gray-200 rounded-xl` |
| Բաժինների միջև gap | `space-y-6` (24px) |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Breadcrumbs

- **Տեսք.** `text-sm text-gray-500`, separator `›` (`text-gray-300`), hover՝ `text-primary underline`։
- **Բովանդակություն.** `Գլխավոր › Երևան › Արաբկիր › 2 սենյականոց բնակարան`
- **Վարք.** Ամեն հատված link է → համապատասխան search (`/search?city=Yerevan`, `/search?city=Yerevan&district=Arabkir`)։ Վերջին հատվածը (ընթացիկ գույքը)՝ active, `text-gray-700`, ոչ-clickable։
- **Mobile.** Ցուցադրվում է միայն վերջին 2 հատվածը՝ `‹ Հետ` link-ով (browser back-ի փոխարեն՝ search-ին վերադարձ)։
- **Տեխ.** Render-վում է `BreadcrumbList` structured data-ով (schema.org)։

### 3.2 Photo Gallery

- **Տեսք (desktop).** Grid՝ 1 մեծ ձախ (60% լայնք) + 2×2 փոքր աջ։ `h-[480px] rounded-xl overflow-hidden gap-2`։ Աջ-ներքև փոքր նկարի վրա՝ `«+25 լուսանկար»` overlay (`bg-black/50 text-white text-sm font-medium`)։
- **Controls overlay (վերին աջ, `absolute top-4 right-4`).** 3 կլոր կոճակ (`w-10 h-10 rounded-full bg-white/90 backdrop-blur`)՝
  - **♡ Պահել** — toggle։ States՝ default (outline ♡ `text-gray-700`), active (լցված ❤️ `text-red-500`), hover (`scale-105`), loading (spinner)։ Guest → login modal։ Click-ից հետո՝ optimistic toggle + toast «Ավելացվեց ընտրանի» / «Հանվեց ընտրանուց»։
  - **⤴ Կիսվել** — բացում է share modal՝ link copy (toast «Հղումը պատճենվեց»), Facebook, Telegram, WhatsApp, Email (`mailto:`)։
  - **⚑ Բողոքել** — report modal՝ radio պատճառ (Կեղծ հայտարարություն / Արդեն վաճառված է / Սխալ տեղեկություն / Սպամ) + ոչ-պարտադիր textarea → admin queue (`POST .../report`)։
- **Media tabs (gallery-ի ներքևում).** `[📷 Լուսանկար (29)] [🎥 Տեսանյութ] [🌐 360°] [🗺 Քարտեզ] [📐 Հատակագիծ]` — tab-ը disabled (`text-gray-300 cursor-not-allowed`) եթե այդ media-ն բացակայում է։ Active tab՝ `border-b-2 border-primary text-primary`։
- **Click մեծ նկարի վրա** → full-screen **lightbox**՝ `bg-black/95`, ←/→ նավիգացիա, ESC փակում, pinch/scroll zoom, thumbnail strip ներքևում, counter «5 / 29»։ Focus trap lightbox-ի ներսում։
- **Վիճակներ.**
  - *Loading*՝ gray skeleton blocks shimmer animation-ով։
  - *Միայն 1 նկար*՝ full-width, առանց grid-ի (`h-[420px]`)։
  - *0 նկար* (չպետք է լինի, բայց guard)՝ placeholder «Լուսանկար չկա» icon-ով։
- **Տեխ.** `<PropertyGallery media={Media[]} />`։ `next/image`-ով lazy-load; առաջին (LCP) նկարը՝ `priority`։ Lightbox-ը client component է, lazy-loaded (`dynamic(() => ..., { ssr: false })`)։

### 3.3 Main info block

- **Գին.** `text-3xl font-bold`։ Ցուցադրվում է ընտրած արժույթով (header currency switcher-ից)։ Rent՝ «350,000 ֏ /ամիս»։ Կողքին փոքրով՝ բնօրինակ արժույթը, եթե տարբերվում է («≈ $880»)։
  - **Price history.** Եթե գինն իջել է՝ կարմիր chip «↓ 5% — նախկին 4,200,000 ֏» + sparkline (Phase 2)։
- **Վերնագիր (H1).** `text-2xl font-semibold`։ Օրինակ՝ «2 սենյականոց բնակարան Արաբկիրում»։ Ընտրած լեզվով (`title[locale]`)։
- **Հասցե.** `text-gray-600` + 📍 icon + `«Քարտեզին»` anchor (smooth scroll դեպի map)։ Եթե owner-ը թաքցրել է ճշգրիտ հասցեն (`hideExact: true`)՝ ցույց է տրվում միայն թաղամասը՝ «Արաբկիր, Երևան»։
- **Key facts row.** Հորիզոնական icon-ներ (`flex flex-wrap gap-6`)՝ 🛏 3 ննջ. · 🛁 2 սանհ. · 📐 75 m² · 🏢 4/9 հարկ · 📅 2018 · 🏷 Բնակարան։ Null դաշտերը բաց են թողնվում։
- **Badges.** NEW (`created_at` ≤ 7 օր) · FEATURED (`is_featured`) · ✓ Verified (owner-ը verified agent է)։
- **Status banner.**
  - *Active*՝ banner չի ցուցադրվում։
  - *Pending*՝ դեղին banner «Ընթացքում է մոդերացիան»։
  - *Sold/Rented*՝ gallery-ի վրա մուգ overlay + banner «Այս գույքն այլևս հասանելի չէ»; contact CTA-ները disabled։

### 3.4 Body sections

**Նկարագրություն (Description).** Full text (`whitespace-pre-line text-gray-700 leading-relaxed`), max 4 տող collapsed → «Կարդալ ավելին ▾» / «Թաքցնել ▴» toggle։ Ընտրած լեզվով; եթե այդ լեզվով տեքստ չկա՝ fallback այլ լեզվի + badge «Թարգմանված ավտոմատ» (Phase 2)։

**Հատկություններ (Details).** 2-սյունակ `dl` աղյուսակ (mobile՝ 1 սյունակ)։ Ամեն տող՝ label (`text-gray-500`) + value (`text-gray-900 font-medium`)՝ Տիպ · Վիճակ · Ջեռուցում · Պատշգամբ · Պահեստ · Շինության նյութ · Փաստաթղթեր (սեփականություն/կադաստր)։ Ցուցադրվում են միայն լրացված դաշտերը (null-երը՝ թաքցված)։

**Հարմարություններ (Amenities).** Icon grid 3–4 սյունակ (`grid grid-cols-2 md:grid-cols-4 gap-3`), ✓ կանաչ icon + label՝ Ավտոկայանատեղի · Վերելակ · Կահույք · Կոնդիցիոներ · Անվտանգություն · Պատշգամբ · Ինտերնետ։ Բացակայող amenity-ները չեն ցուցադրվում (կամ՝ gray ✗ toggle-ով «Ցույց տալ բոլորը»)։

**Հատակագիծ (Floor plan).** Նկար (եթե կա) → click-ով zoom lightbox-ում։ Եթե չկա՝ ամբողջ բաժինը բաց է թողնվում (չի ցուցադրվում դատարկ վերնագիր)։

**Քարտեզ + թաղամաս.** Embedded Mapbox `h-[360px] rounded-xl`, 📍 pin գույքի վրա։ Եթե owner-ը թաքցրել է հասցեն՝ ցույց է տրվում circle (approximate, ~300m radius) կոնկրետ pin-ի փոխարեն։ Ներքևում chip-եր «Ի՞նչ կա մոտակայքում» (դպրոց, խանութ, transport — Phase 3)։

**Mortgage mini-calc.** Card՝ «Ամսական մոտավոր վճար ~X ֏/ամիս»՝ հաշվարկված այս գնից, 20% կանխավճար, 10 տարի, 14% տոկոսադրույք (default)։ Slider-երը փոխելիս թարմացվում է տեղում (local state, առանց API-ի)։ → link «Մանրամասն հաշվիչ» → `/mortgage/calculators?price=...&currency=...`։

### 3.5 Contact card (sidebar) — **conversion-ի կորիզ**

- **Տեսք.** `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20`։
- **Header.** Avatar (`w-12 h-12 rounded-full`) + անուն + (եթե agent) agency name + ✓ Verified badge + ⭐ 4.8 (12)։ Ամբողջ block-ը clickable → agent profile (`/agent/[slug]`)։
- **CTA կոճակներ.**
  - **[💬 Գրել հաղորդագրություն]** primary, full-width `h-12`։ Guest → login modal (`?next` պահպանելով)։ Logged-in → բացում է thread, prefilled-ով «Բարև, հետաքրքրված եմ այս գույքով (#8423)»։ → `POST /api/conversations`։
  - **[📞 Ցույց տալ հեռախոսը]** secondary։ Click → reveal `+374 XX XXX XXX` + `tel:` link + `phone_revealed` event (lead++)։ Անանուն այցելուի համար՝ captcha մեկ անգամ session-ում։
  - **[📅 Դիտում պատվիրել]** (Phase 2) — calendar modal (օր/ժամ ընտրություն)։
- **Quick form.** Անուն · Հեռախոս · Textarea (prefilled) · [Ուղարկել]։ Inline validation։ Success՝ green «Ուղարկվեց — վաճառողը կկապ հաստատի»։
- **Anti-spam.** Rate-limit (5 հաղորդագրություն/ժամ/user), captcha Guest-ի համար, honeypot hidden field, server-side dedupe։

### 3.6 Owner manage bar (owner view)

- Contact card-ի փոխարեն (`owner_id == current_user`)՝ `shadow-sm border rounded-xl p-5`։
- **Stats row.** «📊 1,240 դիտում · 18 favorite · 3 հաղորդագրություն» (live `views_count`)։
- **Կոճակներ.** **[✏️ Խմբագրել]** (→ `/listing/[id]/edit`) · **[⏸ Ապաակտիվացնել]** · **[🗑 Ջնջել]** (confirm modal «Հաստատե՞լ ջնջումը»)։
- Status-ի համապատասխան microcopy՝ Pending՝ «Ընթացքում է մոդերացիան, սովորաբար մինչև 24 ժամ»։

### 3.7 Similar + Recently viewed

- **Նմանատիպ գույքեր.** «Նմանատիպ գույքեր» — հորիզոնական carousel, 4 PropertyCard, ←/→ arrows։ Algorithm՝ նույն city + ±20% գին + նույն property_type, limit 8։ `GET .../similar`։
- **Վերջերս դիտված** (logged-in կամ localStorage)՝ վերջին 6 դիտված գույքը։ Render client-side։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton՝ gallery blocks + գնի bar + key facts bars + sidebar card outline (shimmer animation) |
| **Loaded (visitor)** | Լրիվ էջ + contact card աջում / fixed bottom bar mobile-ում |
| **Loaded (owner)** | Owner manage bar՝ contact card-ի փոխարեն |
| **404 / deleted** | «Գույքը չգտնվեց» illustration + [Դեպի որոնում] կոճակ |
| **Sold / Rented** | Gallery-ի վրա մուգ overlay + banner «Այլևս հասանելի չէ» + նմանատիպները ակտիվ |
| **Pending (owner)** | Դեղին banner «Դեռ ստուգվում է admin-ի կողմից» |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] կոճակ |
| **Offline** | Cached version (PWA, Phase 4) կամ offline banner «Կապ չկա» |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<PropertyDetailPage> (Server Component, SSR)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <PropertyGallery media={Media[]} title city />
 │   └─ <Lightbox /> (client, lazy, ssr:false)
 ├─ <PropertyMainInfo property={Property} displayCurrency />
 ├─ <PropertyDescription text={string} locale />
 ├─ <PropertyDetailsTable details={Detail[]} />
 ├─ <AmenitiesGrid amenities={string[]} />
 ├─ <FloorPlan url={string|null} />
 ├─ <PropertyMap lat lng hideExact />           (client)
 ├─ <MortgageMiniCalc price currency />          (client, local state)
 ├─ <ContactCard owner={Owner} propertyId />     (client)
 │   └─ <OwnerManageBar property={Property} />   (պայմանով՝ isOwner)
 ├─ <SimilarProperties propertyId />             (client, React Query)
 └─ <RecentlyViewed />                           (client, localStorage)
```

### Data fields used (Property entity — տես 00-SPEC §7)

`id, slug, title{hy,ru,en}, description{hy,ru,en}, deal_type, status, property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, country, region, city, district, address, lat, lng, hide_exact_address, amenities[], heating, condition, views_count, is_featured, created_at, owner{id, name, avatar, phone, role, agent{agency, verified, rating, reviews_count}}`

### API contract-ներ

**`GET /api/properties/[id]`**
```jsonc
// 200 OK
{
  "id": 8423,
  "slug": "yerevan-arabkir-2-senyak-bnakaran",
  "dealType": "sale",
  "status": "active",
  "price": 52000000, "currency": "AMD",
  "title": { "hy": "2 սենյականոց բնակարան", "ru": "...", "en": "..." },
  "description": { "hy": "...", "ru": "...", "en": "..." },
  "area": 75, "rooms": 2, "bedrooms": 2, "bathrooms": 1,
  "floor": 4, "floorsTotal": 9, "yearBuilt": 2018,
  "location": { "city": "Yerevan", "district": "Arabkir",
                "lat": 40.20, "lng": 44.49, "hideExact": false },
  "amenities": ["parking", "elevator", "furniture"],
  "media": [
    { "type": "photo", "url": "...", "order": 0 },
    { "type": "tour360", "url": "..." }
  ],
  "owner": {
    "id": 12, "name": "Davit", "avatar": "...", "role": "agent",
    "agent": { "agency": "X Realty", "verified": true, "rating": 4.8, "reviews": 12 }
  },
  "viewsCount": 1240,
  "isOwner": false
}
// 404 { "error": "not_found" }
```

**`POST /api/conversations`**
```jsonc
// request  { "propertyId": 8423, "message": "Բարև, հնարավո՞ր է դիտում շաբաթ օրը" }
// 201      { "conversationId": 551 }
// 401      { "error": "auth_required" }   → login modal
// 429      { "error": "rate_limited" }    → toast «Չափից շատ հաղորդագրություն»
```

**`POST /api/favorites`** → `{ "propertyId": 8423 }` → toggle → `200 { "favorited": true }`

**`POST /api/properties/[id]/report`** → `{ "reason": "sold", "note": "..." }` → `202 Accepted`

**`GET /api/properties/[id]/similar`** → `200 { "items": PropertyCard[] }` (max 8)

### Validation (zod)

```ts
const contactSchema = z.object({
  name: z.string().min(2, "Անունը պարտադիր է").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  message: z.string().min(5, "Հաղորդագրությունը կարճ է").max(1000),
  // honeypot — պետք է դատարկ մնա
  website: z.string().max(0).optional(),
});
```

- View count՝ +1 server-side, unique ըստ `session_id + property_id` (24h dedupe)։
- Favorite/report/conversation՝ բոլորը պահանջում են auth (401 → login modal `?next`-ով)։

---

## 6. Responsive

- **≥1024px (lg).** Երկսյունակ layout, sticky sidebar (`top-20`), gallery grid 1+2×2։
- **768–1023px (md).** Մեկ սյունակ; contact card-ը՝ gallery-ից հետո inline (ոչ sticky) + fixed bottom bar։
- **<768px (sm).** Gallery full-bleed swipe; բոլոր բաժինները stack; **fixed bottom bar** (💬 / 📞 / ♡); breadcrumbs collapsed՝ «‹ Հետ»։

---

## 7. Accessibility

- Gallery՝ alt տեքստ ամեն նկարի համար (`{title} — {city}, նկար {n}`), keyboard ←/→ նավիգացիա, focus trap lightbox-ում, ESC փակում։
- Բոլոր icon-only կոճակները՝ `aria-label` (♡ = «Ավելացնել ընտրանի», ⤴ = «Կիսվել», ⚑ = «Բողոքել»)։
- Status banner-ները՝ `role="status"`; error-ները՝ `role="alert"`։
- Contrast ≥ 4.5:1 ամբողջ տեքստի համար; touch target ≥ 44px (CTA-ները `h-12`)։
- Map-ը՝ `aria-label` + tab-ով հասանելի controls; «Բացել Google Maps-ում» fallback link։

---

## 8. SEO & meta

- `<title>` = «{title} — {city}, {price} | {brand}»; `<meta name="description">` = նկարագրության առաջին 155 նիշ։
- OG image՝ առաջին նկար + գին overlay (dynamic `/api/og?id=8423`)։
- Structured data (JSON-LD)՝ `RealEstateListing` + `Offer` (price, currency, availability) + `geo` (lat/lng) + `BreadcrumbList`։
- `hreflang` (hy/ru/en), `canonical` (slug-ով՝ `/property/8423/...`)։
- Sold/deleted գույք՝ `noindex` (բայց 301 չ-անել, որ նմանատիպները ցույց տանք)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `property_view` | Էջի load (dedupe 24h) | `property_id` |
| `gallery_open_lightbox` | Lightbox բացում | `property_id` |
| `tour360_open` | 360° tab click | `property_id` |
| `favorite_add` / `favorite_remove` | ♡ toggle | `property_id` |
| `contact_message_sent` | Conversation ստեղծում | `property_id, conversation_id` |
| `phone_revealed` | Հեռախոս reveal | `property_id` |
| `share_clicked` | Share modal action | `property_id, channel` |
| `similar_clicked` | Նմանատիպ card click | `property_id, target_id` |
| `mortgage_calc_used` | Slider փոփոխություն | `property_id` |
