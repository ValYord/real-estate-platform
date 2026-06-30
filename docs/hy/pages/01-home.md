# Էջ 01 — Home (Գլխավոր էջ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data, API), responsive, accessibility, SEO, analytics։

**URL.** `/` → `/hy`, `/ru`, `/en` (locale prefix)
**Roles.** Բոլորը (Guest, User, Agent, Admin) — նույն էջ, փոքր տարբերություններ logged-in վիճակում (header CTA, recently viewed)։
**Primary goal (conversion).** Այցելուին **մղել դեպի որոնում**։ Էջի #1 գործողությունը hero search-ն է; երկրորդական նպատակը՝ սեփականատերերին տանել դեպի listing wizard («Տեղադրել գույք»)։

---

## 0. Ակնարկ (Overview)

Home-ը կայքի **դարպասն է**։ Մարդկանց 60–70%-ը գալիս է որոնելու, ուստի էջի վերին ծալքը (above the fold) ամբողջությամբ նվիրված է hero search-ին՝ tab-երով (Գնել / Վարձել / Վաճառել / Գնահատել)։ Ներքևի բաժինները երկրորդական entry point-եր են՝ quick-cards, featured carousel, browse-by-city, property-type shortcuts — բոլորն էլ ի վերջո հանգեցնում են `/search`-ին համապատասխան ֆիլտրով։

Էջը render-վում է **SSR**-ով (Server Component) SEO-ի և արագ first paint-ի համար։ Hero-ի static մասը (վերնագիր, tab-եր) ակնթարթորեն երևում է; դինամիկ բաժինները (featured, stats, blog) բերվում են server-side data fetch-ով կամ streaming-ով։ Ինտերակտիվ տարրերը (search autocomplete, carousel, favorite toggle) client component-ներ են։

Home-ը **չունի owner/visitor ռեժիմ** (ի տարբերություն property էջի), բայց ունի **guest vs logged-in** նրբերանգներ՝ favorite ♡-երը logged-in վիճակում աշխատում են անմիջապես, guest-ի համար բացում են login modal; «Տեղադրել գույք» CTA-ն guest-ին տանում է `/auth/register?next=/sell/new`, logged-in-ին՝ ուղիղ `/sell/new`։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Անին (mobile, guest).** Անին Google-ից մտել է գլխավոր էջ։ Տեսնում է hero-ն՝ «Գտիր քո տունը Հայաստանում», ընտրում է **«Գնել»** tab-ը, input-ում գրում «Արաբկ…», autocomplete-ը առաջարկում է «Արաբկիր, Երևան», սեղմում է, ապա **[🔍 Որոնել]**։ → Անցնում է `/search?deal=sale&city=Yerevan&district=Arabkir`։

**Սցենար Բ — Սեփականատեր Կարենը (desktop, logged-in).** Կարենը ուզում է վաճառել բնակարանը։ Scroll անելով հասնում է **«Վաճառո՞ւմ ես գույք»** banner-ին, սեղմում **[Տեղադրել գույք]**։ Քանի որ logged-in է → ուղիղ բացվում է `/sell/new` wizard-ը։ → Listing flow-ը սկսվեց։

**Սցենար Գ — Զննող Մարիամը (desktop, guest).** Մարիամը դեռ չգիտի՝ ինչ է ուզում։ Տեսնում է **«Թերթիր ըստ քաղաքի»** բաժինը, սեղմում Գյումրիի card-ը → `/search?city=Gyumri`։ Հետո վերադառնում, featured carousel-ից մի գույքի ♡-ին սեղմում → բացվում է login modal «Մուտք գործիր՝ պահելու համար»։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — մեկ սյունակ, full-width բաժիններ

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ ╔════════════ HERO (h-[520px], bg-image + overlay) ═══════╗ │
│ ║  H1 «Գտիր քո տունը Հայաստանում» (text-4xl)             ║ │
│ ║  ենթավերնագիր (text-lg text-white/80)                  ║ │
│ ║  ┌ tabs ─────────────────────────────────────┐         ║ │
│ ║  │ [Գնել][Վարձել][Վաճառել][Գնահատել]          │         ║ │
│ ║  ├────────────────────────────────────────────┤         ║ │
│ ║  │ [🔍 Քաղաք, թաղամաս, հասցե…   ] [Որոնել]    │         ║ │
│ ║  └────────────────────────────────────────────┘         ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
├────────────────────────────────────────────────────────────┤
│ QUICK CARDS (4-col grid)  [Նոր][Իջեցված][Բաց դռ][Վաճառ.]   │
├────────────────────────────────────────────────────────────┤
│ FEATURED CAROUSEL  «Ընտրված գույքեր»  ◄ card card card ►    │
├────────────────────────────────────────────────────────────┤
│ BROWSE BY CITY (image grid)  Երևան · Գյումրի · Վանաձոր …    │
├────────────────────────────────────────────────────────────┤
│ PROPERTY TYPE SHORTCUTS (icon row)  Բնակ · Տուն · Հող …     │
├────────────────────────────────────────────────────────────┤
│ ╔ POST-LISTING CTA banner (bg-primary)  [Տեղադրել գույք] ╗  │
├────────────────────────────────────────────────────────────┤
│ TOOLS (3-col)  Հիփոթեքի հաշվիչ · Գնահատում · Գործակալ      │
├────────────────────────────────────────────────────────────┤
│ STATS strip  «10,000+ գույք · 500+ գործակալ · 3 երկիր»     │
├────────────────────────────────────────────────────────────┤
│ LATEST BLOG (3-col)  hodvac · hodvac · hodvac              │
├────────────────────────────────────────────────────────────┤
│ FOOTER (5 սյունակ)                                          │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — մեկ սյունակ stack

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ HERO (h-[440px])        │
│  H1 (text-2xl)          │
│  tabs (scroll-x)        │
│  [🔍 input full-width]  │
│  [Որոնել full-width]    │
├──────────────────────────┤
│ QUICK CARDS (2-col)     │
│ FEATURED (scroll-x)     │
│ CITIES (2-col)          │
│ TYPES (scroll-x chips)  │
│ POST-LISTING CTA        │
│ TOOLS (1-col stack)     │
│ STATS (wrap)            │
│ BLOG (1-col stack)      │
│ FOOTER (accordion)      │
└──────────────────────────┘
```

- Hero-ի search card-ը mobile-ում input-ը և կոճակը stack-վում են ուղղահայաց (`flex-col gap-2`)։
- Featured ու type-shortcuts-ը mobile-ում horizontal scroll են (`overflow-x-auto snap-x`)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Hero container | `relative h-[520px] md:h-[520px] h-[440px] bg-cover bg-center` |
| Hero overlay | `absolute inset-0 bg-black/40` |
| H1 (hero) | `text-4xl md:text-4xl text-2xl font-bold text-white leading-tight` |
| Ենթավերնագիր | `text-lg text-white/80 mt-3` |
| Search card | `bg-white rounded-xl shadow-lg p-2 max-w-2xl` |
| Tab (active) | `bg-primary text-white rounded-md px-4 h-10 font-medium` |
| Tab (inactive) | `text-gray-600 hover:bg-gray-100 rounded-md px-4 h-10` |
| Search input | `h-12 flex-1 text-base px-4 outline-none` |
| Primary search button | `bg-primary text-white h-12 px-6 rounded-lg font-medium hover:bg-primary/90` |
| Quick card | `border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary transition` |
| Բաժնի վերնագիր (H2) | `text-2xl font-semibold text-gray-900 mb-6` |
| Section wrapper | `max-w-7xl mx-auto px-4 py-12` |
| CTA banner | `bg-primary text-white rounded-2xl p-8 md:p-12` |
| Stats number | `text-3xl font-bold text-primary` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Header

→ Տես `00-PRODUCT-SPEC.md` § 9 (նույնն է ամեն էջում)։ Home-ում header-ը `sticky top-0`; scroll-ի սկզբին (hero-ի վրա) կարող է լինել transparent/translucent, scroll-ից հետո՝ `bg-white shadow-sm` (transition)։

### 3.2 Hero + search

- **Ֆոն.** Մեծ նկար (Երևան/բնակելի շենք) կամ subtle video loop; վրան `bg-black/40` overlay՝ տեքստի contrast-ի համար։ Նկարը `priority` (LCP element), `next/image` fill, `object-cover`։
- **Վերնագիր (H1).** `text-4xl font-bold text-white`։ Ընտրած լեզվով (`t("home.hero.title")`)։ Օրինակ՝ «Գտիր քո տունը Հայաստանում»։
- **Ենթավերնագիր.** Կարճ վստահության նախադասություն՝ «10,000+ ստուգված հայտարարություն մեկ տեղում»։
- **Search tabs.** `[Գնել] [Վարձել] [Վաճառել] [Գնահատել]`։ Active tab-ը `bg-primary text-white`, մնացածը՝ ghost։ Tab-ի փոփոխությունը փոխում է input placeholder-ը և submit-ի destination-ը (local state, ոչ navigation)։
  - **Tab «Գնել»** → submit գնում է `/search?deal=sale&...`
  - **Tab «Վարձել»** → `/search?deal=rent&...`
  - **Tab «Վաճառել»** → input-ը թաքնվում է, ցույց է տրվում մեկ կոճակ **[Տեղադրել գույք →]** → `/sell/new` (guest → register)
  - **Tab «Գնահատել»** → input placeholder «Մուտքագրիր հասցեն գնահատման համար» → submit → `/home-value?address=...`
- **Search input + autocomplete.** Մեծ input, placeholder tab-ից կախված («Քաղաք, թաղամաս, հասցե…»)։ Մուտքագրելիս բացվում է autocomplete dropdown (`debounce 300ms`, `min 2 նիշ`)՝ քաղաք/թաղամաս/հասցե առաջարկներով՝ icon-ով (📍 location, 🏙 city)։
  - **States.** *default* (placeholder gray), *focus* (`ring-2 ring-primary`), *typing→loading* (input-ի աջում spinner), *results* (dropdown 5–8 row), *no-match* («Ոչինչ չգտնվեց — փորձիր այլ տեղ»), *error* (silent fallback՝ free-text submit)։
- **[🔍 Որոնել] կոճակ.** Primary, `h-12`։ Click → navigate ընտրած tab-ի destination-ին։ Եթե input-ը դատարկ է → գնում է `/search` առանց location ֆիլտրի (բոլորը)։ Enter key-ն input-ում = submit։

### 3.3 Quick cards (browse shortcuts)

- **Տեսք.** 4-սյունակ grid (`grid grid-cols-2 md:grid-cols-4 gap-4`)։ Ամեն card՝ icon + վերնագիր + counter (`text-sm text-gray-500`)։
- **Card-եր.**
  - **🆕 Նոր հայտարարություններ** «1,240 նոր» → `/search?sort=newest`
  - **📉 Գին իջեցված** «320 գույք» → `/search?price_reduced=true`
  - **🚪 Բաց դռների օրեր** «18 այս շաբաթ» → `/search?open_house=true` (Phase 2)
  - **✅ Վերջերս վաճառված** → `/search?status=sold`
- **Վարք.** Ամբողջ card-ը clickable (`<Link>`)։ Hover՝ `shadow-md border-primary`։ Counter-ները live DB count queries (cached 5 րոպե)։ Loading՝ counter-ի փոխարեն skeleton bar։

### 3.4 Featured / Promoted carousel

- **Տեսք.** «Ընտրված գույքեր» H2 + horizontal carousel՝ **PropertyCard**-երով (4 տեսանելի desktop, scroll-x mobile)։ ←/→ arrow կոճակներ desktop-ում (`absolute`, `bg-white shadow rounded-full`)։
- **Card.** Տես PropertyCard component (նկար slider, գին, ♡, beds/area, հասցե, badge)։ Card click → `/property/[id]/[slug]`։ ♡ toggle՝ logged-in → optimistic + toast «Ավելացվեց ընտրանի»; guest → login modal։
- **[Տեսնել բոլորը →]** → `/search` (default ֆիլտրով)։
- **Վիճակներ.** *Loading*՝ 4 skeleton card; *Empty* (չկան featured)՝ ամբողջ բաժինը թաքնվում է (չ-render); *Error*՝ inline «Չհաջողվեց բեռնել» + [Կրկին]։

### 3.5 Browse by city

- **Տեսք.** Image grid (`grid grid-cols-2 md:grid-cols-4 gap-4`)՝ ամեն card քաղաքի նկարով + անունով overlay (`bg-gradient-to-t from-black/60`) + listing count «Երևան · 4,200 գույք»։
- **Card-եր.** Երևան, Գյումրի, Վանաձոր, Դիլիջան, Աբովյան, Հրազդան… (Phase 2՝ +Москва, Тбилиси)։ Click → `/search?city=Yerevan`։
- **Վարք.** Hover՝ `scale-[1.02]` zoom + overlay-ի մգացում։ Count-երը DB-ից։

### 3.6 Property type shortcuts

- **Տեսք.** Icon-card row (`flex flex-wrap gap-3` desktop, scroll-x mobile)։ Ամեն shortcut՝ icon (`w-6 h-6`) + label, `border rounded-lg px-5 py-4 hover:border-primary`։
- **Տիպեր.** 🏢 Բնակարան · 🏡 Տուն/Առանձնատուն · 🌳 Հող · 🏬 Կոմերցիոն · 🏗 Նորակառույց։ Click → `/search?type=apartment` (և այլն)։

### 3.7 Post-listing CTA banner

- **Տեսք.** Full-width գունավոր banner (`bg-primary text-white rounded-2xl`), ձախում տեքստ, աջում կոճակ (mobile՝ stack)։
- **Microcopy.** Վերնագիր «Վաճառո՞ւմ ես գույք» · ենթատեքստ «Տեղադրիր անվճար 5 րոպեում և հասիր հազարավոր գնորդների» · **[Տեղադրել գույք]** (white button on primary)։
- **Վարք.** Click → logged-in՝ `/sell/new`; guest՝ `/auth/register?next=/sell/new`։

### 3.8 Tools

- **Տեսք.** 3-սյունակ card grid (`grid grid-cols-1 md:grid-cols-3 gap-6`)՝ icon + վերնագիր + կարճ նկարագրություն + «Բացել →» link։
- **Card-եր.** 🧮 Հիփոթեքի հաշվիչ → `/mortgage/calculators` · 📊 Տան գնահատում → `/home-value` · 🧑‍💼 Գտնել գործակալ → `/agents`։

### 3.9 Stats strip

- **Տեսք.** Centered horizontal strip (`flex flex-wrap justify-center gap-12`)՝ ամեն stat-ը մեծ թիվ (`text-3xl font-bold text-primary`) + label (`text-sm text-gray-500`)։
- **Բովանդակություն.** «10,000+ հայտարարություն · 500+ գործակալ · 3 երկիր»։ Թվերը live DB-ից (cached, fallback static-ի, եթե query ձախողվի)։

### 3.10 Latest from blog

- **Տեսք.** 3-սյունակ card grid՝ cover նկար + category badge + վերնագիր + ամսաթիվ։ Card click → `/news/[slug]`։
- **[Բոլոր հոդվածները →]** → `/news`։
- **Վիճակ.** *Empty* (չկան հոդված)՝ ամբողջ բաժինը թաքնվում է։

### 3.11 Footer

→ Տես `00-PRODUCT-SPEC.md` § 9 (5 սյունակ, ամեն էջում նույնը)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading (first paint)** | Hero static-ը անմիջապես; featured/cities/blog՝ skeleton card-ներ |
| **Loaded (guest)** | Լրիվ էջ; ♡ և «Տեղադրել»՝ login/register gate |
| **Loaded (logged-in)** | Նույնը + ♡ աշխատում է անմիջապես; header-ում profile menu; «Վերջերս դիտված» row (եթե կա history) |
| **Autocomplete loading** | Input-ի աջում spinner, dropdown «Որոնում…» |
| **Autocomplete empty** | Dropdown «Ոչինչ չգտնվեց» |
| **Featured/blog error** | Inline «Չհաջողվեց բեռնել» + [Կրկին փորձել], մնացած էջը նորմալ |
| **Stats fallback** | API ձախողվեց → static round թվեր (օր․ «10,000+») |
| **Offline** | Cached version (PWA, Phase 4) կամ offline banner «Կապ չկա» |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<HomePage> (Server Component, SSR)
 ├─ <Header />                                   (shared)
 ├─ <HeroSearch />                               (client — tabs + autocomplete state)
 │   ├─ <SearchTabs value onChange />
 │   └─ <LocationAutocomplete onSelect />        (debounced, React Query)
 ├─ <QuickCards counts={Counts} />               (server data)
 ├─ <FeaturedCarousel items={PropertyCard[]} />  (client — scroll/arrows)
 │   └─ <PropertyCard property={...} />          (♡ client)
 ├─ <BrowseByCity cities={City[]} />
 ├─ <PropertyTypeShortcuts />
 ├─ <PostListingCTA isLoggedIn={boolean} />
 ├─ <ToolsSection />
 ├─ <StatsStrip stats={Stats} />
 ├─ <LatestBlog posts={Post[]} />
 ├─ <RecentlyViewed />                           (client, localStorage — logged-in/guest)
 └─ <Footer />                                   (shared)
```

### Data fields used (00-SPEC §7)

- **Featured.** `properties` where `is_featured = true AND status = 'active'`, `LIMIT 10` → PropertyCard fields՝ `id, slug, title{locale}, price, currency, deal_type, area_m2, rooms, bedrooms, city, district, property_media[0..n], is_featured, created_at`։
- **Counts.** `new` (`created_at` ≤ 7d), `reduced` (price drop flag), `open_house`, `sold` (`status='sold'`)։
- **Cities.** Static list + `COUNT(*)` per `city` (cached)։
- **Blog.** `blog_posts` where `published_at IS NOT NULL` ORDER BY `published_at DESC` LIMIT 3 → `slug, title{locale}, cover, category, published_at`։
- **Stats.** `COUNT(properties)`, `COUNT(agents)`, `COUNT(DISTINCT country)`։

### API contract-ներ

**`GET /api/home/summary`** (SSR-ի համար մեկ aggregated call)
```jsonc
// 200 OK
{
  "featured": [
    { "id": 8423, "slug": "yerevan-arabkir-2-senyak-bnakaran",
      "title": { "hy": "2 սենյականոց բնակարան", "ru": "...", "en": "..." },
      "price": 52000000, "currency": "AMD", "dealType": "sale",
      "area": 75, "rooms": 2, "bedrooms": 2,
      "city": "Yerevan", "district": "Arabkir",
      "cover": "https://.../cover.jpg", "isFeatured": true }
  ],
  "counts": { "new": 1240, "reduced": 320, "openHouse": 18, "sold": 4502 },
  "cities": [ { "slug": "yerevan", "name": { "hy": "Երևան" }, "count": 4200, "image": "..." } ],
  "stats": { "listings": 10240, "agents": 512, "countries": 3 },
  "blog": [ { "slug": "...", "title": { "hy": "..." }, "cover": "...", "category": "guide", "publishedAt": "2026-06-01" } ]
}
// 200 partial — բաժինը ձախողվելու դեպքում null/[] է, էջը չի կոտրվում
```

**`GET /api/geo/autocomplete?q=arab&locale=hy`**
```jsonc
// 200 OK
{ "items": [
  { "type": "district", "label": "Արաբկիր, Երևան", "city": "Yerevan", "district": "Arabkir" },
  { "type": "city", "label": "Արարատ", "city": "Ararat" }
] }
// 200 { "items": [] }   → «Ոչինչ չգտնվեց»
```

### Validation (zod) — hero search

```ts
const heroSearchSchema = z.object({
  deal: z.enum(["sale", "rent"]).default("sale"),
  q: z.string().max(120).optional(),         // free-text location
  city: z.string().optional(),
  district: z.string().optional(),
});
// q դատարկ → թույլատրելի (բոլորը); navigate /search-ին URLSearchParams-ով
```

- Autocomplete-ը debounce 300ms, min 2 նիշ; XSS-ից պաշտպանված (label-ները escape)։
- Featured/blog/counts՝ ISR/cache (revalidate 300s)։ Stats fallback static, եթե query timeout։

---

## 6. Responsive

- **≥1024px (lg).** Hero `h-[520px]`, search card horizontal (input + button կողք կողքի), բոլոր grid-երը 3–4 սյունակ։
- **768–1023px (md).** Quick cards 2-col, featured/tools 2–3 col, hero `h-[480px]`։
- **<768px (sm).** Hero `h-[440px]`, search card vertical stack; quick cards 2-col; featured + type shortcuts horizontal scroll (`snap-x`); footer՝ accordion; «Որոնել» կոճակը full-width։

---

## 7. Accessibility

- Hero-ի background նկարը `alt=""` (decorative); H1-ը էջի միակ `<h1>`-ն է, semantic heading hierarchy (բաժինները՝ `<h2>`)։
- Search tabs՝ `role="tablist"`, ամեն tab `role="tab" aria-selected`, input-ը կապված `aria-controls`-ով։
- Autocomplete՝ `role="listbox"`, option-ները `role="option"`, ←/↓ keyboard նավիգացիա, Enter select, Esc close (combobox pattern)։
- Բոլոր icon-only/clickable card-երը՝ accessible name (`aria-label` կամ տեսանելի label)։
- Carousel arrow-ները՝ `aria-label` («Հաջորդ», «Նախորդ»); scroll-ը keyboard-ով հասանելի։
- Contrast ≥ 4.5:1 (hero overlay ապահովում է սպիտակ տեքստի contrast); touch target ≥ 44px։

---

## 8. SEO & meta

- `<title>` = «{brand} — Անշարժ գույք Հայաստանում | Առք, վաճառք, վարձ»; `<meta name="description">` = եռալեզու, ~155 նիշ։
- `hreflang` tags (hy/ru/en) + `canonical` (locale root)։
- Structured data (JSON-LD)՝ `Organization` (logo, sameAs սոց ցանցեր) + `WebSite` + `SearchAction` (sitelinks search box → `/search?q={query}`)։
- Hero նկար՝ optimized `next/image`, `priority`, ճիշտ `sizes` (LCP < 2.5s թիրախ)։
- Internal linking՝ quick-cards, cities, type-shortcuts՝ crawlable `<a href>` (ոչ միայն JS onClick)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `home_view` | Էջի load | `locale, is_logged_in` |
| `hero_tab_change` | Tab փոխում | `tab` (sale/rent/sell/estimate) |
| `hero_search_submit` | [Որոնել] click / Enter | `deal, q, city, district` |
| `autocomplete_select` | Առաջարկ ընտրում | `type, label` |
| `quick_card_click` | Quick card click | `card` (new/reduced/open_house/sold) |
| `featured_card_click` | Featured card click | `property_id, position` |
| `favorite_add` / `favorite_remove` | ♡ toggle (featured) | `property_id` |
| `city_card_click` | Browse-by-city click | `city` |
| `type_shortcut_click` | Type shortcut click | `type` |
| `post_listing_cta_click` | «Տեղադրել գույք» banner | `is_logged_in` |
| `tool_click` | Tools card click | `tool` (mortgage/home_value/agents) |
| `blog_card_click` | Latest blog card click | `slug` |
