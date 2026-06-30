# Էջ 10 — Agent / Agency Profile (Գործակալի պրոֆիլ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/agent/[slug]` — օրինակ՝ `/hy/agent/anna-petrosyan-yerevan`; agency-ի դեպքում՝ `/hy/agency/[slug]`
**Roles.** Բոլորը (Guest, User, Agent, Admin) կարող են դիտել; review գրել / կապ հաստատել պահանջում է login (Guest → login modal `?next`-ով); edit controls՝ միայն պրոֆիլի տերը (`agent.user_id == current_user.id`)։
**Primary goal (conversion).** Այցելուն վստահի գործակալին և **կապ հաստատի** — գրի հաղորդագրություն, բացի հեռախոսը կամ ուղարկի հարցում։ Էջի ամեն տարր կառուցում է վստահություն և մղում դեպի այս մեկ գործողությունը։

---

## 0. Ակնարկ (Overview)

Սա գործակալի **հանրային վիտրինն է** և lead-generation funnel-ի կենտրոնական էջը։ «Գտնել գործակալ» էջից (11), property detail-ի contact card-ից (03) ու որոնման արդյունքներից մարդիկ գալիս են այստեղ՝ որոշելու՝ վստահե՞լ այս մասնագետին։ Ուստի էջը պետք է՝ (1) ակնթարթորեն ցույց տա trust signal-ները (avatar, ✓ Verified, ⭐ rating, տարիների փորձ), (2) ապացուցի փորձառությունը (ակտիվ հայտարարությունների grid + վիճակագրություն + կարծիքներ), և (3) ամեն պահ ձեռքի տակ պահի **«Կապ հաստատել»** գործողությունը (sticky contact card desktop-ում, fixed bottom bar mobile-ում)։

Էջն ունի **երկու ռեժիմ**.
- **Visitor view** — ուրիշի պրոֆիլ (default)։ Աջ սյունակում՝ contact card։
- **Owner view** — այցելուի սեփական պրոֆիլը (`agent.user_id == current_user.id`)։ Contact card-ի փոխարեն՝ management bar (խմբագրել / preview / Pro Dashboard / promote)։

Էջը render-վում է **SSR**-ով (Server Component) SEO-ի և արագ first paint-ի համար; ինտերակտիվ բաժինները (listings grid filter, review modal, contact form, share) client component-ներ են։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Սուրենը (mobile).** Սուրենը property detail էջից սեղմել է գործակալի անվան վրա։ Բացվում է պրոֆիլը հեռախոսում։ Տեսնում է avatar, «✓ Հաստատված», ⭐ 4.8 (37) և «Գործունեության 6 տարի»։ Scroll անելով տեսնում է 24 ակտիվ հայտարարություն և կարդում 2-3 կարծիք։ Ներքևի fixed bar-ից սեղմում է **«📞 Զանգ»**, համարը բացվում է dialer-ում։ → Lead-ը գրանցվեց (`agent_phone_revealed` event)։

**Սցենար Բ — Վաճառող Լիլիթը (desktop).** Լիլիթը ուզում է վաճառել իր բնակարանը և փնտրում է գործակալ։ Կարդում է bio-ն, տեսնում «Բնակարաններ» և «Նոր կառուցապատում» specialty chip-երը։ Աջի contact card-ից սեղմում է **[📋 Հարցում ուղարկել]**, modal-ում նշում՝ «Վաճառք · Բնակարան · Երևան · 2 ննջ»։ → `agent_leads` record ստեղծվեց, գործակալին email գնաց, Լիլիթը toast տեսավ «Հարցումն ուղարկվեց»։

**Սցենար Գ — Գործակալ Աննան (owner view).** Աննան բացում է իր պրոֆիլը՝ ստուգելու, թե ինչպես է երևում։ Contact card-ի փոխարեն տեսնում է management bar՝ **[✏️ Խմբագրել]**, **[👁 Preview]**, **[📊 Pro Dashboard]**։ Նկատում է նոր կարծիք, սեղմում **[Պատասխանել]** և գրում շնորհակալական reply, որը հայտնվում է review-ի տակ։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — երկսյունակ

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10, text-sm, text-gray-500)                  │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN COLUMN (≈64%, max-w-760)  │ ► SIDEBAR (≈36%, w-360)  │
│                                   │                          │
│ ┌── Profile header (card) ──┐    │ ┌── Contact card ──┐     │
│ │ avatar 96px · անուն · ✓   │    │ │ (sticky top-20)   │     │
│ │ agency · ⭐4.8 (37) · 6 տ. │    │ │ avatar + անուն    │     │
│ │ 🇦🇲🇷🇺🇬🇧 · Երևան·Կոտայք  │    │ │ [💬 Գրել]         │     │
│ │ [Pro] [Top Agent] badges  │    │ │ [📞 Հեռախոս]      │     │
│ └───────────────────────────┘    │ │ [📋 Հարցում]      │     │
│ ── Մասին (bio) ──                │ │ [⤴ Կիսվել]        │     │
│ ── Stats row (4 KPI քարտ) ──     │ │ anti-spam note    │     │
│ ── Ակտիվ հայտարարություններ ──   │ └──────────────────┘     │
│   [Բոլորը][Վաճառք][Վարձ] + sort  │                          │
│   PropertyCard grid (2-col)      │  (card sticky մինչև       │
│ ── Կարծիքներ ──                  │   reviews-ին հասնելը)     │
│   ⭐4.8 · breakdown · [Գրել]     │                          │
│   review list                    │                          │
├──────────────────────────────────┴─────────────────────────┤
│ Այլ գործակալներ (carousel, full-width)                      │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — մեկ սյունակ

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ Profile header           │
│ avatar 80px · անուն · ✓  │
│ ⭐4.8 (37) · 6 տարի      │
│ 🇦🇲🇷🇺🇬🇧 · badges       │
├──────────────────────────┤
│ Մասին (bio)              │
│ Stats (2×2 grid)         │
│ Հայտարարություններ       │
│  tabs + sort             │
│  PropertyCard (1-col)    │
│ Կարծիքներ                │
│ Այլ գործակալներ (scroll) │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BOTTOM BAR (h-18)  │
│ [💬 Գրել] [📞 Զանգ]  ⤴  │
└──────────────────────────┘
```

- Profile header-ը full-width card է (`bg-white border border-gray-200 rounded-xl p-6`)։
- Contact card-ը **չի** sticky-անում mobile-ում; փոխարենը՝ **fixed bottom bar** (`h-18 / 72px`, `bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`)՝ `[💬 Գրել] [📞 Զանգ]` + ⤴։
- Բոլոր բաժինները stack են լինում ամբողջ լայնքով (`space-y-6`)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Avatar (header) | `w-24 h-24 rounded-full ring-2 ring-white shadow-md` (mobile՝ `w-20 h-20`) |
| Անուն (H1) | `text-2xl font-semibold text-gray-900 leading-tight` |
| Agency name | `text-base text-gray-500 hover:text-primary` |
| Rating | `text-amber-500` աստղեր + `text-gray-900 font-medium` թիվ + `text-gray-400` «(37)» |
| Verified badge | `bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md` + ✓ |
| Tier badge (Pro) | `bg-violet-100 text-violet-700`; Premium՝ `bg-amber-100 text-amber-700` |
| Top Agent badge | `bg-green-100 text-green-700` |
| Specialty chip | `bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full` |
| Language chip | `bg-gray-50 border border-gray-200 text-sm px-2 py-0.5 rounded` |
| KPI քարտ | `bg-gray-50 rounded-lg p-4 text-center`; թիվ՝ `text-2xl font-bold`, label՝ `text-sm text-gray-500` |
| Բաժնի վերնագիր (H2) | `text-xl font-semibold`, վերևում `border-t border-gray-200 pt-6 mt-6` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full hover:bg-primary/5` |
| Contact card | `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20` |
| Rating bar (breakdown) | `bg-gray-200 h-2 rounded`, fill՝ `bg-amber-400` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Breadcrumbs

- **Տեսք.** `text-sm text-gray-500`, separator `›` (`text-gray-300`), hover՝ `text-primary underline`։
- **Բովանդակություն.** `Գլխավոր › Գտնել գործակալ › Երևան › Աննա Պետրոսյան`
- **Վարք.** Ամեն հատված link է (`/agents`, `/agents?city=yerevan`)։ Վերջին հատվածը (ընթացիկ գործակալ)՝ `text-gray-700`, ոչ-clickable։
- **Mobile.** Միայն «‹ Գործակալներ» link։
- **Տեխ.** `BreadcrumbList` structured data (schema.org)։

### 3.2 Profile header

- **Avatar.** `w-24 h-24 rounded-full`։ Եթե նկար չկա՝ placeholder սկզբնատառերով (`bg-primary/10 text-primary text-2xl font-semibold`, օր․ «ԱՊ»)։
- **Անուն (H1).** `text-2xl font-semibold`։ Կողքին՝ **✓ Verified badge** (hover tooltip՝ «Ինքնությունն ու լիցենզիան հաստատված են»)։
- **Agency.** Անվան տակ՝ agency name → link `/agency/[slug]` (եթե կա)։
- **Rating.** ⭐ icon-ներ (5 աստղ, fill ըստ rating-ի) + թվային «4.8» + «(37 կարծիք)» → anchor smooth-scroll դեպի reviews բաժին։
- **Years active.** «Գործունեության 6 տարի» (`now() - agent.created_at`)։
- **Scope.** Սպասարկման տարածքներ՝ «Երևան · Կոտայք» (📍 icon)։
- **Languages.** Flag/chip-եր՝ 🇦🇲 🇷🇺 🇬🇧 (`agent.languages[]`)։
- **Badges row.** Tier badge (Pro / Premium) · «Top Agent» (եթե ranking ≤ top 5% քաղաքում) · «Արագ պատասխանող» (եթե `avg_response_time < 2h`)։
- **Վիճակ.** Չհաստատված գործակալ՝ Verified badge չկա; փոխարենը gray tag «Հաստատման ընթացքում» (միայն Pro tier-ից վեր)։

### 3.3 Bio (Մասին)

- **Տեսք.** `text-gray-700 leading-relaxed whitespace-pre-line`, ընտրած լեզվով (`bio[locale]`)։ Max 4 տող collapsed → «Կարդալ ավելին ▾» / «Թաքցնել ▴» toggle։
- **Specialties chips.** Bio-ից ներքև՝ `flex flex-wrap gap-2`՝ «Բնակարաններ» · «Նոր կառուցապատում» · «Կոմերցիոն» · «Վարձակալություն»։
- **Fallback.** Եթե bio-ն դատարկ է՝ ամբողջ բաժինը բաց է թողնվում (visitor view); owner view-ում՝ inline prompt «➕ Ավելացրու քո մասին տեքստ»։

### 3.4 Stats row (թվային ցուցանիշներ)

- **Տեսք.** 4-5 KPI քարտ՝ `grid grid-cols-4 md:grid-cols-5 gap-3` (mobile՝ `grid-cols-2`)։ Ամեն քարտ՝ մեծ թիվ (`text-2xl font-bold`) + label (`text-sm text-gray-500`)։
- **Ցուցանիշներ.**
  - **Ակտիվ հայտարարություններ** — `listings_active_count` (օր․ 24)
  - **Վաճառված / փակված** — «112» (եթե track ենք deal-close; հակառակ դեպքում թաքցվում է)
  - **Միջին պատասխան** — «~2 ժ»
  - **Լեզուներ** — «3»
  - **Անդամ՝** — «2020-ից»
- Null ցուցանիշները բաց են թողնվում (չեն ցուցադրվում 0-ով)։

### 3.5 Active listings grid (Ակտիվ հայտարարություններ)

- **Filter mini-bar.** Վերևում՝ tabs `[Բոլորը] [Վաճառք] [Վարձ]` (active՝ `border-b-2 border-primary text-primary`) + sort dropdown (Նոր / Գին ↑ / Գին ↓)։ Tab/sort փոխելը re-fetch անում է (client, React Query) URL hash-ով (`#listings?deal=sale`)։
- **Grid.** Նույն **PropertyCard** բաղադրիչը, ինչ search/03-ում՝ նկար(slider), գին, ♡, սենյակ/մակերես/հարկ, հասցե, badge (NEW/REDUCED/FEATURED)։ `grid grid-cols-1 md:grid-cols-2 gap-4`։
- **Pagination.** «Տեսնել բոլոր 24 հայտարարությունները» → `/search?agent=[id]` (լրիվ search experience filter-ներով)։
- **Card click** → `/property/[id]/[slug]`։
- **Empty state.** «Այս պահին ակտիվ հայտարարություն չկա» illustration-ով; contact card-ը մնում է հասանելի։

### 3.6 Reviews section (Կարծիքներ)

- **Ամփոփ header.** ⭐ 4.8 (մեծ՝ `text-3xl font-bold`) · «37 կարծիք» · rating breakdown bar-եր (5★→1★, ամեն տող՝ աստղ + horizontal bar + քանակ)։
- **[✍️ Գրել կարծիք] CTA.** Logged-in user-ի համար (ոչ-տերը)։ Click → review modal՝
  - **Star rating** (1-5 ընտրովի, hover preview, պարտադիր)
  - **Textarea** (min 10 / max 1000 նիշ, counter)
  - **[Հրապարակել]** → `POST /api/agents/[id]/reviews`
  - **Guard.** 1 review/author/agent (եթե արդեն կա՝ «Խմբագրել իմ կարծիքը»); Guest → login modal; տերը չի տեսնում CTA-ն իր էջում։
- **Review list.** Ամեն item՝ avatar, անուն, ⭐ rating, ամսաթիվ (`text-gray-400`), տեքստ։
  - **Agent reply** (optional)՝ indented block `bg-gray-50 border-l-2 border-primary pl-3`, «Գործակալի պատասխան» label-ով։
  - **⚑ Բողոքել** review-ի վրա (spam/վիրավորանք) → report modal → admin moderation queue (`POST /api/reports`)։
- **Sort.** Նոր / Բարձր rating / Ցածր rating։
- **Pagination.** «Ցույց տալ ևս» (load more, page-by-page)։
- **Empty state.** «Դեռ կարծիք չկա — եղիր առաջինը» + write-review CTA։

### 3.7 Contact card (sidebar) — **conversion-ի կորիզ**

- **Տեսք.** `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20`։
- **Header.** Avatar (`w-12 h-12 rounded-full`) + անուն + ✓ Verified + ⭐ 4.8 (37)։
- **CTA կոճակներ.**
  - **[💬 Գրել հաղորդագրություն]** primary `h-12`։ Guest → login modal (`?next`)։ Logged-in → բացում է thread գործակալի հետ (property-ից անկախ), prefilled «Բարև, հետաքրքրված եմ ձեր ծառայություններով»։ → `POST /api/conversations` (`agentId` payload-ով)։
  - **[📞 Ցույց տալ հեռախոսը]** secondary։ Click → reveal `+374 XX XXX XXX` + `tel:` link + `agent_phone_revealed` event (lead++)։ Անանուն այցելու՝ captcha մեկ անգամ session-ում։
  - **[📋 Հարցում ուղարկել]** outline։ Modal form՝ ի՞նչ եմ փնտրում (առք/վաճառք/վարձ radio · գույքի տիպ · քաղաք · գնի range + currency · սենյակ), անուն, հեռ., հաղորդագրություն → **[Ուղարկել]** → `POST /api/agent-leads`։ Success՝ green «Հարցումն ուղարկվեց — գործակալը կկապ հաստատի»։
  - **[⤴ Կիսվել]** ghost։ Share modal՝ link copy (toast «Հղումը պատճենվեց»), Facebook, Telegram, WhatsApp, Email։
- **Anti-spam.** Rate-limit (5 հաղորդագրություն/ժ/user), captcha Guest-ի համար, honeypot hidden field, server-side dedupe։

### 3.8 Owner manage bar (owner view)

- Contact card-ի փոխարեն (`agent.user_id == current_user`)՝ `shadow-sm border rounded-xl p-5`։
- **Կոճակներ.** **[✏️ Խմբագրել պրոֆիլը]** (→ `/settings/agent` — avatar, bio, specialties, languages, scope, agency) · **[👁 Preview]** (visitor view simulation) · **[📊 Pro Dashboard]** (→ `/pro/dashboard`) · **[⭐ Promote]** (→ `/pro`, եթե tier-ը թույլ չի տալիս)։
- **Inline edit.** Bio-ի և specialties-ի վրա pencil icon (hover-ով), ուղիղ խմբագրման համար։
- **Reply** կոճակ ամեն review-ի տակ (`POST /api/agents/[id]/reviews/[reviewId]/reply`)։

### 3.9 Other agents (ներքև)

- **«Այլ գործակալներ»** — հորիզոնական carousel, 4 agent card, ←/→ arrows։ Algorithm՝ նույն city + նույն/նմանատիպ specialty, limit 8 → agent card → `/agent/[slug]`։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton՝ header card outline + bio bars + stats քարտեր + listings grid blocks + sidebar card (shimmer) |
| **Loaded (visitor)** | Լրիվ պրոֆիլ + contact card աջում / fixed bottom bar mobile-ում |
| **Loaded (owner)** | Owner manage bar՝ contact card-ի փոխարեն + inline edit controls |
| **Չհաստատված գործակալ** | Verified badge չկա; «Հաստատման ընթացքում» tag |
| **0 listings** | «Այս պահին ակտիվ հայտարարություն չկա» + contact մնում է |
| **0 reviews** | «Դեռ կարծիք չկա — եղիր առաջինը» + write-review CTA |
| **404 / not found** | «Այս պրոֆիլը չգտնվեց» illustration + [Գտնել գործակալ] |
| **Suspended / deleted** | «Այս պրոֆիլն այլևս հասանելի չէ» + Find an agent link |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<AgentProfilePage> (Server Component, SSR)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <AgentHeader agent={Agent} isVerified />
 ├─ <AgentBio text={string} specialties={string[]} locale />
 ├─ <AgentStats stats={Stat[]} />
 ├─ <AgentListings agentId initialDeal="all" />     (client, React Query)
 │   └─ <PropertyCard property={PropertyCardData} />
 ├─ <AgentReviews agentId summary={ReviewSummary} /> (client)
 │   ├─ <WriteReviewModal agentId />                 (client, lazy)
 │   └─ <ReviewItem review={Review} canReply={isOwner} />
 ├─ <AgentContactCard agent={Agent} />               (client)
 │   ├─ <RequestModal agentId />                     (client, lazy)
 │   └─ <OwnerManageBar agent={Agent} />             (պայմանով՝ isOwner)
 └─ <OtherAgents agentId city specialty />           (client, React Query)
```

### Data fields used (Agent entity — տես 00-SPEC §7)

`agent: { user_id, agency_name, license_no, bio{hy,ru,en}, specialties[], languages[], scope[], rating, reviews_count, verified, subscription_tier, avg_response_time, listings_active_count, deals_closed_count, created_at }`
`user: { id, name, avatar_url, phone, email }`
`review: { id, agent_id, author_id, author_name, author_avatar, rating, text, reply, created_at }`

### API contract-ներ

**`GET /api/agents/[slug]`**
```jsonc
// 200 OK
{
  "id": 12,
  "slug": "anna-petrosyan-yerevan",
  "name": "Աննա Պետրոսյան",
  "avatar": "https://...",
  "agencyName": "X Realty",
  "agencySlug": "x-realty",
  "verified": true,
  "tier": "pro",
  "rating": 4.8,
  "reviewsCount": 37,
  "bio": { "hy": "...", "ru": "...", "en": "..." },
  "specialties": ["apartments", "new_construction", "rent"],
  "languages": ["hy", "ru", "en"],
  "scope": ["Yerevan", "Kotayk"],
  "stats": {
    "listingsActive": 24, "dealsClosed": 112,
    "avgResponseHours": 2, "memberSince": "2020"
  },
  "badges": ["top_agent", "fast_responder"],
  "isOwner": false
}
// 404 { "error": "not_found" }
// 410 { "error": "suspended" }   → «Այլևս հասանելի չէ»
```

**`GET /api/agents/[id]/listings?deal=sale|rent|all&sort=new&page=1`**
```jsonc
// 200 { "items": PropertyCard[], "total": 24, "page": 1, "pageSize": 12 }
```

**`POST /api/agents/[id]/reviews`**
```jsonc
// request  { "rating": 5, "text": "Շատ պրոֆեսիոնալ էր, օգնեց արագ։" }
// 201      { "reviewId": 902 }
// 401      { "error": "auth_required" }       → login modal
// 409      { "error": "already_reviewed" }    → «Արդեն կարծիք գրել ես»
// 422      { "error": "self_review_forbidden" }
```

**`POST /api/agent-leads`** (request form)
```jsonc
// request
{ "agentId": 12, "dealType": "sell", "propertyType": "apartment",
  "city": "Yerevan", "budgetMin": 40000000, "budgetMax": 60000000,
  "currency": "AMD", "rooms": 2, "name": "Լիլիթ", "phone": "+374...",
  "message": "Ուզում եմ վաճառել բնակարանս" }
// 201  { "leadId": 4410 }
// 429  { "error": "rate_limited" }   → toast «Չափից շատ հարցում»
```

**`POST /api/conversations`** → `{ "agentId": 12, "message": "..." }` → `201 { "conversationId": 612 }`

**`POST /api/reports`** → `{ "targetType": "review", "targetId": 902, "reason": "spam" }` → `202 Accepted`

### Validation (zod)

```ts
const reviewSchema = z.object({
  rating: z.number().int().min(1, "Գնահատականը պարտադիր է").max(5),
  text: z.string().min(10, "Կարծիքը կարճ է").max(1000),
});

const requestSchema = z.object({
  dealType: z.enum(["buy", "sell", "rent"]),
  propertyType: z.string().min(1),
  city: z.string().min(2),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  name: z.string().min(2, "Անունը պարտադիր է").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  message: z.string().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});
```

- Review/request/conversation՝ բոլորը պահանջում են auth (401 → login modal `?next`-ով)։
- Self-review server-side block (`author_id == agent.user_id` → 422)։
- View count՝ +1 server-side, unique ըստ `session_id + agent_id` (24h dedupe)։

---

## 6. Responsive

- **≥1024px (lg).** Երկսյունակ layout, sticky contact card (`top-20`); listings grid 2-col; stats 5-col։
- **768–1023px (md).** Մեկ սյունակ; contact card-ը՝ header-ից հետո inline (ոչ sticky) + fixed bottom bar; listings grid 2-col։
- **<768px (sm).** Բոլոր բաժինները stack; listings grid 1-col; stats 2×2 grid; **fixed bottom bar** (💬 / 📞 / ⤴); breadcrumbs collapsed «‹ Գործակալներ»։

---

## 7. Accessibility

- Avatar-ին alt տեքստ (`{name} — անշարժ գույքի գործակալ`); placeholder avatar՝ `aria-hidden` սկզբնատառերով։
- Բոլոր icon-only կոճակները՝ `aria-label` (⤴ = «Կիսվել», ⚑ = «Բողոքել կարծիքի մասին»)։
- Star rating input-ը՝ `role="radiogroup"`, ամեն աստղ՝ `aria-label="{n} աստղ"`, keyboard ←/→ նավիգացիա։
- Rating breakdown bar-երը՝ `aria-label="5 աստղ — 28 կարծիք"`։
- Status/success message-ները՝ `role="status"`; error-ները՝ `role="alert"`։
- Contrast ≥ 4.5:1; touch target ≥ 44px (CTA-ները `h-12`)։
- Modal-ները (review/request/share)՝ focus trap + ESC փակում։

---

## 8. SEO & meta

- `<title>` = «Աննա Պետրոսյան — անշարժ գույքի գործակալ Երևանում · ⭐ 4.8 | {brand}»։
- `<meta name="description">` = bio-ի առաջին 155 նիշ + «{N} ակտիվ հայտարարություն · {N} կարծիք»։
- OG image՝ avatar + անուն + rating overlay (dynamic `/api/og?agent=12`)։
- Structured data (JSON-LD)՝ `RealEstateAgent` (extends `Person`) + `aggregateRating` (rating, reviewCount) + `review[]` + `BreadcrumbList`։
- `hreflang` (hy/ru/en), `canonical` (slug-ով՝ `/agent/12/...` կամ slug-ով)։
- Indexable; agent էջերը ներառված են sitemap-ում։ Suspended/deleted՝ `noindex`։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `agent_profile_view` | Էջի load (dedupe 24h) | `agent_id` |
| `agent_message_sent` | Conversation ստեղծում | `agent_id, conversation_id` |
| `agent_phone_revealed` | Հեռախոս reveal | `agent_id` |
| `agent_request_sent` | Request form submit | `agent_id, deal_type` |
| `agent_review_submitted` | Review հրապարակում | `agent_id, rating` |
| `agent_review_reported` | ⚑ Բողոքել | `agent_id, review_id` |
| `agent_share_clicked` | Share modal action | `agent_id, channel` |
| `agent_listing_clicked` | Listings grid card click | `agent_id, property_id` |
| `other_agent_clicked` | Carousel card click | `agent_id, target_agent_id` |
