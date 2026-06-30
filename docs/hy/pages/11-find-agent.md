# Էջ 11 — Find an Agent (Գտնել գործակալ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/agents` — filter-ները query string-ով, օր․ `/hy/agents?city=yerevan&lang=ru&specialty=rent&sort=rating`; SEO landing-ներ՝ `/agents/yerevan`, `/agents/rent`։
**Roles.** Բոլորը (Guest, User, Agent, Admin) կարող են դիտել; request/compare flow՝ login խրախուսված, Guest-ին թույլ՝ captcha-ով։
**Primary goal (conversion).** Այցելուն գտնի ճիշտ գործակալին և **մտնի lead funnel** — բացի պրոֆիլ, սեղմի «Կապ», կամ ուղարկի «Համեմատել առաջարկներ» հարցումը մի քանի գործակալի։

---

## 0. Ակնարկ (Overview)

Սա lead-generation funnel-ի **մուտքն է**։ Մարդը, ով չգիտի կոնկրետ ում դիմել, գալիս է այստեղ՝ filter անելու քաղաքով, լեզվով, specialty-ով ու rating-ով, և գտնելու վստահելի մասնագետ։ Էջն ունի երկու conversion ուղի՝ (1) **ուղիղ** — agent card-ից անցում պրոֆիլ կամ quick contact, և (2) **broadcast** — «Համեմատել առաջարկներ» flow, որտեղ մեկ հարցումը գնում է մի քանի համապատասխան գործակալի, և օգտատերը հետո side-by-side համեմատում է նրանց պատասխանները։ Երկրորդ ուղին platform-ի գլխավոր lead-gen mechanic-ն է։

Էջը render-վում է **SSR**-ով (Server Component) SEO-ի և filter landing էջերի համար; filters bar, results grid, compare/request modal-ները client component-ներ են (URL-synced filters, React Query)։

Էջն ունի **երկու tab**.
- **👤 Գործակալներ** — individual agent-ների ցանկ (default)։
- **🏢 Թիմեր / Ընկերություններ** — agency card-եր → `/agency/[slug]`։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Նարեկը (desktop).** Նարեկը ուզում է գնել բնակարան Արաբկիրում և նախընտրում ռուսախոս գործակալ։ Filters-ից ընտրում է «Երևան» + «🇷🇺 ru» + «Բնակարաններ» + «⭐ 4.5+»։ URL-ը թարմացվում է, ցուցակը re-fetch-վում։ Տեսնում է 8 գործակալ, sort-ում «Ամենաբարձր rating»-ով, սեղմում առաջինի **[Պրոֆիլ]**-ը։

**Սցենար Բ — Վաճառող Գայանեն (mobile).** Գայանեն չգիտի ում դիմել։ Hero-ի **[Համեմատել առաջարկներ]** կոճակից բացում է multi-step form՝ «Վաճառք · Բնակարան · Երևան · 40-60 մլն ֏ · 2 ննջ» + կոնտակտ։ Ուղարկում է։ → 3 գործակալ ստանում են հարցումը, պատասխանում; Գայանեն `/dashboard/requests`-ում տեսնում է 3 proposal side-by-side ու ընտրում մեկին։

**Սցենար Գ — Guest Արթուրը.** Արթուրը չի գրանցված, բայց ուզում է հարցում ուղարկել։ Լրացնում է «Request an agent» form-ը; submit-ին հայտնվում է captcha + հուշում «Գրանցվիր՝ պատասխանները հետևելու համար»։ Հաջող submit-ից հետո՝ «Ուղարկվեց — ստուգիր email-դ»։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + grid

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ HERO (h-44, bg-gray-50)                                     │
│  H1 «Գտի՛ր քո գործակալին» · search bar · [Որոնել]          │
│  CTA banner: «Ստացի՛ր 3 առաջարկ» [Համեմատել առաջարկներ]    │
├────────────────────────────────────────────────────────────┤
│ Tabs: [👤 Գործակալներ] [🏢 Թիմեր/Ընկերություններ]          │
├──────────────────┬─────────────────────────────────────────┤
│ ◄ FILTERS (w-72) │ ► RESULTS                                │
│ City             │  sort dropdown · «37 գործակալ»          │
│ Specialty        │  ┌────────┐ ┌────────┐                  │
│ Language ☑☑☑     │  │ agent  │ │ agent  │  (grid 2-3 col)  │
│ Rating ⭐4+/4.5+ │  │ card   │ │ card   │                  │
│ Deal [Վճ][Վր]    │  └────────┘ └────────┘                  │
│ ☑ Verified only  │  ┌────────┐ ┌────────┐                  │
│ ☑ Pro only       │  │ card   │ │ card   │                  │
│ [Մաքրել]         │  └────────┘ └────────┘                  │
│                  │  Pagination / infinite scroll            │
├──────────────────┴─────────────────────────────────────────┤
│ «Ինչպես է աշխատում» (3 քայլ) · «Գործակա՞լ ես» CTA          │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — մեկ սյունակ

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ HERO: H1 · search        │
│ [Համեմատել առաջարկներ]   │
├──────────────────────────┤
│ Tabs [👤][🏢]            │
│ [⚙ Ֆիլտրեր (3)] [Sort ▾] │  ← filters bottom-sheet-ում
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ agent card (1-col)   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ agent card           │ │
│ └──────────────────────┘ │
│ ...load more             │
│ «Ինչպես է աշխատում»      │
│ FOOTER                   │
└──────────────────────────┘
```

- Mobile-ում filters-ը **bottom-sheet** է (`[⚙ Ֆիլտրեր]` կոճակ, active count badge-ով)։ Apply-ից հետո փակվում է ու re-fetch անում։
- Agent card-երը 1-col mobile, 2-col md, 3-col lg։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Hero | `bg-gray-50 py-12`, H1՝ `text-3xl font-bold text-gray-900` |
| Search bar | `h-12 rounded-lg border border-gray-300 px-4` + `[Որոնել]` primary |
| Compare CTA banner | `bg-primary/5 border border-primary/20 rounded-xl p-4`, CTA՝ primary |
| Tab (active) | `border-b-2 border-primary text-primary font-medium` |
| Filter label | `text-sm font-medium text-gray-700` |
| Filter checkbox | shadcn `Checkbox`, accent `text-primary` |
| Sort dropdown | `h-9 text-sm border border-gray-300 rounded-md` |
| Agent card | `bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition` |
| Card avatar | `w-16 h-16 rounded-full` |
| Verified badge | `bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded` + ✓ |
| Tier badge | Pro՝ `bg-violet-100 text-violet-700`; Premium՝ `bg-amber-100 text-amber-700` |
| Language chip | `bg-gray-50 border border-gray-200 text-xs px-2 py-0.5 rounded` |
| Quick contact CTA | `border border-primary text-primary h-9 rounded-md text-sm` |
| Empty state | `text-center py-16 text-gray-500` + illustration |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-40` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Hero / վերնագիր

- **H1.** «Գտի՛ր քո անշարժ գույքի գործակալին» (`text-3xl font-bold`)։
- **Ենթավերնագիր.** «Հաստատված մասնագետներ Հայաստանում և ավելին» (`text-gray-500`)։
- **Search bar.** Քաղաք/տարածք input (autocomplete, `GET /api/geo/cities`) + **[Որոնել]**։ Submit → `?city=` filter։
- **Compare CTA banner.** «Ստացի՛ր 3 գործակալի առաջարկ մեկ հարցումով» + **[Համեմատել առաջարկներ]** (բացում է compare flow modal)։

### 3.2 Tabs

- **Տեսք.** `[👤 Գործակալներ] [🏢 Թիմեր / Ընկերություններ]`, active՝ `border-b-2 border-primary`։
- **Agents tab** (default) → individual agent card-ների grid։
- **Teams/Companies tab** → agency card-եր՝ logo, անվանում, գործակալների քանակ, համախ rating, սպասարկման քաղաքներ → `/agency/[slug]`։ Filters-ը հարմարվում են (agency-level fields)։

### 3.3 Filters bar

Ամեն filter փոխում է URL (`router.replace`, shallow) + re-fetch (React Query, `keepPreviousData`)։

- **City / տարածք** — dropdown / autocomplete (multi-country aware՝ country → city cascade)։
- **Specialty** — checkbox group՝ Բնակարաններ · Տներ · Կոմերցիոն · Հող · Նոր կառուցապատում · Վարձակալություն (multi-select)։
- **Language** — 🇦🇲 hy · 🇷🇺 ru · 🇬🇧 en (multi-select chip toggle)։
- **Rating** — radio՝ ⭐ 4+ · ⭐ 4.5+ (min rating)։
- **Deal type** — `[Վաճառք] [Վարձ]` toggle (ով ինչով է զբաղվում)։
- **Verified only** — toggle։
- **Pro / Premium only** — toggle (Phase 2 monetization, ranking boost-ի կողքին)։
- **[Մաքրել ֆիլտրերը]** — reset URL → `/agents` (հայտնվում է միայն երբ active filter կա)։
- **Active count.** Mobile-ի `[⚙ Ֆիլտրեր]` կոճակին badge-ով՝ ակտիվ filter-ների քանակ։

### 3.4 Sort

- **Dropdown.** Ամենաբարձր rating (default) · Ամենաշատ կարծիք · Ամենաշատ ակտիվ հայտարարություն · Արագ պատասխանող · Նոր անդամ։ → `?sort=` URL param։

### 3.5 Results / Agent cards grid

- **Header.** Sort dropdown + count «37 գործակալ» (`text-sm text-gray-500`)։
- **Agent card** (`bg-white border rounded-xl p-4`)՝
  - Avatar (`w-16 h-16`) + անուն + agency name
  - ✓ Verified badge · tier badge
  - ⭐ rating · «(N կարծիք)»
  - Language chips · 📍 քաղաք
  - «N ակտիվ հայտարարություն»
  - **[Պրոֆիլ]** primary → `/agent/[slug]` · **[💬 Կապ]** outline → quick contact modal (message/request)
  - Ամբողջ card click → agent profile
- **Pagination.** Infinite scroll (IntersectionObserver) կամ «Ցույց տալ ևս» fallback։
- **Empty state.** «Տվյալ ֆիլտրերով գործակալ չգտնվեց» + **[Մաքրել ֆիլտրերը]** + **[Ուղարկել ընդհանուր հարցում]** (broadcast queue-ին)։

### 3.6 «Համեմատել առաջարկներ» flow — **lead-gen-ի կորիզ**

Մեկ հարցում → մի քանի գործակալ պատասխանում է → side-by-side համեմատություն։

- **CTA.** Hero banner-ից կամ էջի մեջտեղից։ Click → multi-step form (modal desktop, full-screen mobile)՝
  1. **Ի՞նչ ես ուզում** — առք / վաճառք / վարձ (radio cards)
  2. **Գույքի տիպ + քաղաք** — property type + location autocomplete
  3. **Բյուջե** — gni range slider + currency (header-ից default)
  4. **Մանրամասներ** — սենյակ, ժամկետ, ազատ նշումներ (optional)
  5. **Կոնտակտ** — անուն, հեռ., email (login → prefill, autofill)
  - Progress indicator վերևում («Քայլ 3/5»)։ **[Հետ]** / **[Շարունակել]**; վերջում **[Ուղարկել հարցումը]** → `POST /api/agent-requests` (broadcast matching agents-ին, max 5)։
- **Արդյունք.** Հարցումը գնում է համապատասխան գործակալներին (city + specialty + deal match)։ Նրանք **respond** անում են proposal-ով (message + նախնական գնահատական) իրենց Pro Dashboard lead inbox-ից։ Օգտատերը `/dashboard/requests`-ում տեսնում է **comparison table**՝ գործակալ · rating · պատասխանի ժամ · proposal տեքստ → ընտրում է ում հետ շարունակել → բացվում է conversation thread։
- **Success microcopy.** «Հարցումն ուղարկվեց {N} գործակալի — պատասխանները կտեսնես «Իմ հարցումներ» բաժնում»։

### 3.7 «Request an agent» form (Ուղիղ հարցում)

- Compare-ից թեթև տարբերակ՝ single-step modal։
- **[Հարցում ուղարկել]** → form (նույն դաշտերը, պարզեցված, մեկ էջ)՝ ինչ եմ փնտրում · անուն · հեռ. · email · հաղորդագրություն։
- **[Ուղարկել]** → `POST /api/agent-requests` (`mode: "single"` կամ auto-match)՝ 1 գործակալի կամ matching գործակալների։

### 3.8 «Ինչպես է աշխատում» (How it works)

3-քայլ բացատրություն (icon + վերնագիր + կարճ տեքստ)՝
1. **Ուղարկ ես հարցում** — կամ ընտրում գործակալ ուղիղ
2. **Գործակալները կապ են հաստատում** — ստանում ես առաջարկներ
3. **Աշխատում եք միասին** — գործարքը տեղի է ունենում հարթակից դուրս

### 3.9 CTA գործակալների համար

- **Bloc.** «Գործակա՞լ ես — միացի՛ր և ստացի՛ր lead-եր» → **[Տեսնել փաթեթները]** → `/pro` (pricing, էջ 17)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton՝ filter outline + 6-8 agent card placeholder (shimmer) |
| **Loaded (results)** | Agent card grid + sort + count |
| **Empty (filters)** | «Տվյալ ֆիլտրերով գործակալ չգտնվեց» + Մաքրել / Ընդհանուր հարցում |
| **Empty (region)** | «Քո տարածքում դեռ գործակալ չկա» + notify-when-available |
| **Teams tab** | Agency card grid |
| **Compare modal open** | Multi-step form, progress indicator |
| **Request submitted** | Success screen «Ուղարկվեց {N} գործակալի» |
| **Guest submit** | Captcha + «Գրանցվիր՝ պատասխանները հետևելու համար» |
| **Duplicate request** | «Արդեն ուղարկեցիր այս հարցումը» (rate limit) |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<FindAgentPage> (Server Component, SSR)
 ├─ <AgentSearchHero onSearch />
 │   └─ <CompareCtaBanner onOpen />
 ├─ <AgentTabs active="agents" />
 ├─ <AgentFilters value={Filters} onChange />     (client, URL-synced)
 │   └─ <FilterSheet />                            (mobile bottom-sheet)
 ├─ <AgentSortDropdown value onChange />           (client)
 ├─ <AgentResultsGrid filters sort />              (client, React Query, infinite)
 │   └─ <AgentCard agent={AgentCardData} />
 ├─ <CompareRequestModal />                        (client, lazy, multi-step)
 ├─ <RequestAgentModal />                          (client, lazy)
 ├─ <HowItWorks />
 └─ <AgentSelfCta />
```

### Data fields used (Agent / Agency / Request — տես 00-SPEC §7)

`agentCard: { id, slug, name, avatar, agency_name, verified, tier, rating, reviews_count, languages[], scope[], specialties[], listings_active_count, avg_response_time }`
`agency: { id, slug, name, logo, agents_count, avg_rating, cities[] }`
`agent_request: { id, requester_id, deal_type, property_type, city, budget_min, budget_max, currency, rooms, note, contact{name,phone,email}, broadcast_to[], status, created_at }`

### API contract-ներ

**`GET /api/agents?city=&specialty=&lang=&rating=&deal=&verified=&tier=&sort=&page=`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 12, "slug": "anna-petrosyan-yerevan",
      "name": "Աննա Պետրոսյան", "avatar": "...",
      "agencyName": "X Realty", "verified": true, "tier": "pro",
      "rating": 4.8, "reviewsCount": 37,
      "languages": ["hy","ru","en"], "scope": ["Yerevan"],
      "specialties": ["apartments","rent"],
      "listingsActive": 24, "avgResponseHours": 2
    }
  ],
  "total": 37, "page": 1, "pageSize": 12
}
```

**`GET /api/agencies?city=&sort=&page=`** → `200 { "items": Agency[], "total": ... }`

**`POST /api/agent-requests`** (compare / single)
```jsonc
// request
{ "mode": "broadcast",
  "dealType": "sell", "propertyType": "apartment", "city": "Yerevan",
  "budgetMin": 40000000, "budgetMax": 60000000, "currency": "AMD",
  "rooms": 2, "note": "Շտապ վաճառք",
  "contact": { "name": "Գայանե", "phone": "+374...", "email": "..." } }
// 201  { "requestId": 7710, "broadcastCount": 3 }
// 401  { "error": "auth_required" }    → captcha guest / login հուշում
// 429  { "error": "duplicate_or_rate_limited" }
```

**`GET /api/agent-requests/[id]/proposals`** (comparison view)
```jsonc
// 200
{ "items": [
    { "agentId": 12, "agentName": "Աննա", "rating": 4.8,
      "respondedAt": "2026-06-23T10:12:00Z",
      "proposal": "Կարող եմ վաճառել 3 շաբաթում, գնահատում եմ ~55 մլն ֏" }
  ] }
```

**`GET /api/geo/cities?country=AM&q=ере`** → `200 { "items": [{ "id", "name" }] }`

### Validation (zod)

```ts
const agentRequestSchema = z.object({
  mode: z.enum(["single", "broadcast"]),
  dealType: z.enum(["buy", "sell", "rent"]),
  propertyType: z.string().min(1, "Ընտրիր գույքի տիպը"),
  city: z.string().min(2, "Ընտրիր քաղաքը"),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(["AMD", "RUB", "USD", "EUR"]),
  rooms: z.number().int().min(0).max(20).optional(),
  note: z.string().max(1000).optional(),
  contact: z.object({
    name: z.string().min(2, "Անունը պարտադիր է").max(50),
    phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
    email: z.string().email("Անվավեր email").optional(),
  }),
  website: z.string().max(0).optional(), // honeypot
}).refine(
  (d) => !d.budgetMax || !d.budgetMin || d.budgetMax >= d.budgetMin,
  { message: "Առավելագույնը պետք է մեծ լինի նվազագույնից", path: ["budgetMax"] }
);
```

- Guest request թույլատրված է, բայց captcha + email/phone verify հուշում; tracking՝ login-ից հետո կապվում է account-ին։
- Privacy՝ օգտատիրոջ կոնտակտը գործակալին բացվում է **միայն** հարցում ուղարկելուց հետո։
- Rate-limit՝ նույն user/IP-ից նույն հարցումը կարճ ժամանակում → 429։

---

## 6. Responsive

- **≥1024px (lg).** Sidebar filters (`w-72`) + results grid 3-col; compare modal՝ centered dialog։
- **768–1023px (md).** Filters sidebar collapses; results grid 2-col; filters՝ collapsible top-bar կամ sheet։
- **<768px (sm).** Filters՝ bottom-sheet (`[⚙ Ֆիլտրեր]` count badge-ով); results 1-col; compare/request modal՝ full-screen; sort՝ dropdown header-ում։

---

## 7. Accessibility

- Filter checkbox/radio group-երը՝ `fieldset` + `legend` (օր․ «Լեզու», «Specialty»)։
- Agent card-ը՝ ամբողջը clickable, բայց ներսի **[Պրոֆիլ]** / **[💬 Կապ]** կոճակները՝ առանձին `aria-label`-ով, որ keyboard-ով տարբերվեն card-link-ից։
- Multi-step compare form-ը՝ `aria-current="step"` ընթացիկ քայլի վրա; error-ները՝ `aria-describedby` input-ին կապված։
- Modal-ները՝ focus trap + ESC; bottom-sheet-ը՝ `role="dialog"` + scrim click փակում։
- Contrast ≥ 4.5:1; touch target ≥ 44px։
- Empty/loading՝ `role="status"`; error՝ `role="alert"`։

---

## 8. SEO & meta

- `<title>` = «Անշարժ գույքի գործակալներ Երևանում — Գտնել ու համեմատել | {brand}»։
- `<meta name="description">` = «Գտի՛ր հաստատված գործակալ ըստ քաղաքի, լեզվի և specialty-ի։ {N}+ մասնագետ»։
- Indexable city/specialty landing-ներ՝ `/agents/yerevan`, `/agents/rent`, `/agents/yerevan/rent` (server-rendered, unique title/H1)։
- Structured data (JSON-LD)՝ `ItemList` of `RealEstateAgent` + `BreadcrumbList`։
- `hreflang` (hy/ru/en), `canonical` (filter-less base URL-ին, որ duplicate չ-index-վի)։ Filter query string-երը՝ `noindex` (բացի landing slug-երից)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `agents_search` | Filter / search apply | `filters` |
| `agent_card_clicked` | Agent card → profile | `agent_id, position` |
| `agent_quick_contact` | [💬 Կապ] card-ից | `agent_id` |
| `compare_flow_started` | Compare CTA open | — |
| `compare_step_completed` | Multi-step քայլ ավարտ | `step` |
| `agent_request_sent` | Request submit | `mode, deal_type, broadcast_count` |
| `request_guest_captcha` | Guest captcha shown | — |
| `proposals_viewed` | Comparison view open | `request_id, proposal_count` |
| `proposal_selected` | Ընտրել գործակալին | `request_id, agent_id` |
| `agent_self_cta_clicked` | «Գործակա՞լ ես» → `/pro` | — |
