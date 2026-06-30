# Էջ 15 — Blog / News & Insights (Նորություններ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO (ընդլայնված), analytics։

**URL.** `/news` (ինդեքս) · `/news/[slug]` (հոդված) · `/news/category/[category]` (կատեգորիա) — օրինակ՝ `/hy/news/yerevan-shuka-2026-trendner`
**Roles.** Բոլորը (Guest, User, Agent, Admin) դիտում են; newsletter signup՝ email; հոդվածներ ստեղծվում ու հրապարակվում են Admin CMS-ով (տես `24-admin.md`)։
**Primary goal.** Organic SEO traffic Google-ից + բրենդի վստահություն (E-E-A-T)։ Երկրորդական՝ newsletter capture և internal funnel դեպի search/guides/property էջեր։

---

## 0. Ակնարկ (Overview)

Blog-ը կայքի **organic traffic-ի գլխավոր շարժիչն է**։ Property էջերը convert են անում արդեն-հետաքրքրված այցելուին, իսկ blog-ը **բերում է նոր այցելու** Google-ից՝ «Երևանի բնակարանների գները 2026», «ինչպես վարձել բնակարան» տիպի որոնումներով, և տանում դեպի funnel։ Ուստի ամեն հոդված պետք է՝ (1) արագ render-վի SSR-ով (Google crawl + LCP), (2) ունենա անթերի structured data ու meta (rich results), (3) ներքին հղումներով ուղղորդի դեպի search/guides/neighborhood էջեր։

**Տարբերությունը Guides-ից (`16-guides.md`).** Blog = **timely news** (ամսաթվով, շուտ հնացող՝ շուկայի նորություն, տրենդ, սեզոնային խորհուրդ)։ Guides = **evergreen** (խորը, քայլ առ քայլ, ամիսներ արդիական)։ Նույն CMS-engine, տարբեր entity-ներ ու schema։

Էջն ունի **երկու template**.
- **Blog Index** (`/news`) — featured hero + կատեգորիա filter + որոնում + card grid + pagination + newsletter։
- **Article Page** (`/news/[slug]`) — header + cover + TOC + body + share + author bio + related + newsletter։

Երկուսն էլ render-վում են **SSR**-ով (Server Component); ինտերակտիվ մասերը (TOC scroll-spy, share, newsletter form, որոնում) client component-ներ են։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Google-ից եկած Անին (mobile).** Անին Google-ում որոնել է «Երևան բնակարան գին 2026», սեղմել մեր հոդվածի վրա։ Էջը բացվում է հեռախոսում՝ cover նկար, վերնագիր, «6 ր. ընթերցում»։ Կարդում է, scroll-ի ընթացքում վերևի progress bar-ը լցվում է։ Կեսին հանդիպում է inline CTA «Տես Արաբկիրի ակտիվ հայտարարությունները ▸» → սեղմում, անցնում `/search?district=Arabkir`։ → Funnel-ը աշխատեց (`article_internal_link_click`)։

**Սցենար Բ — Կրկնվող այցելու Սուրենը (desktop).** Սուրենը `/news`-ում սեղմում է **«Ֆինանսավորում»** կատեգորիա chip-ը, ցանկը ֆիլտրվում է, URL-ը դառնում `/news/category/financing`։ Կարդում է 2 հոդված, ապա ներքևի newsletter banner-ում մուտքագրում email-ը, սեղմում **«Բաժանորդագրվել»** → toast «Ստուգիր փոստդ՝ հաստատելու համար» (double opt-in)։ → `newsletter_subscribe` event։

**Սցենար Գ — Խմբագիր Լիլիթը (Admin).** Լիլիթը CMS-ում գրում է նոր հոդված հայերեն, ապա ru/en թարգմանությունները։ Հրապարակում է `published_at`-ով։ Հոդվածն ավտոմատ հայտնվում է index-ի վերևում, ներառվում `sitemap.xml`-ում, `hreflang`-երը կապվում 3 լեզվի միջև։ en-ը դեռ չի թարգմանված → `/en/news/[slug]` ցույց է տալիս hy fallback + badge, և `hreflang en` չի դրվում։

---

## 2. Layout & visual structure

### Blog Index — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10) · Գլխավոր › Նորություններ                │
│ H1 «Նորություններ և Insights» (text-3xl)                    │
│ Ենթավերնագիր (text-gray-500, max-w-2xl)                     │
├────────────────────────────────────────────────────────────┤
│ ┌──── FEATURED HERO (full-width, h-[420px]) ──────────────┐ │
│ │ cover image + gradient overlay                          │ │
│ │ [Շուկա] badge · H2 վերնագիր · excerpt · author · date   │ │
│ └─────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ [Բոլորը][Գնում][Վաճառք][Վարձ][Ֆինանս][Շուկա][Նոր.]  🔍 ___ │
├────────────────────────────────────────────────────────────┤
│ ┌─card─┐  ┌─card─┐  ┌─card─┐    (grid-cols-3, gap-6)        │
│ │ img  │  │ img  │  │ img  │                                 │
│ │badge │  │badge │  │badge │                                 │
│ │title │  │title │  │title │                                 │
│ │meta  │  │meta  │  │meta  │                                 │
│ └──────┘  └──────┘  └──────┘                                 │
│ ┌─card─┐  ┌─card─┐  ┌─card─┐                                 │
│ └──────┘  └──────┘  └──────┘                                 │
├────────────────────────────────────────────────────────────┤
│ NEWSLETTER banner (bg-primary/5, rounded-2xl)              │
│ ‹ 1 2 3 … › pagination                                      │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Article Page — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ Reading progress bar (fixed top, h-1, bg-primary)          │
│ HEADER                                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Նորություններ › Շուկա › Վերնագիր     │
├──────────┬──────────────────────────────────┬──────────────┤
│ ► SHARE  │ ◄ ARTICLE (max-w-[720px])         │ ► TOC        │
│ (sticky) │ [Շուկա] badge                     │ (sticky      │
│ FB       │ H1 (text-4xl)                     │  top-24)     │
│ TG       │ author · date · 6 ր. · updated    │ • Բաժին 1    │
│ WA       │ ┌── cover h-[420px] rounded-xl ──┐│ • Բաժին 2    │
│ X        │ └────────────────────────────────┘│ • Բաժին 3    │
│ 🔗       │ Body (prose)…                     │ (scroll-spy) │
│          │  inline CTA cards…                │              │
│          │ ── Author bio ──                  │              │
├──────────┴──────────────────────────────────┴──────────────┤
│ NEWSLETTER (inline)                                         │
│ ── Կարդա նաև (related, 3 card) ──                          │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ HEADER (h-14)            │   │ progress bar (fixed)     │
├──────────────────────────┤   │ HEADER                   │
│ H1                       │   ├──────────────────────────┤
│ FEATURED (h-[240px])     │   │ ‹ Հետ                    │
│ [chips scroll-x →]       │   │ [Շուկա] badge            │
│ 🔍 search (full-width)   │   │ H1 (text-2xl)            │
│ ┌──card (1-col)──┐       │   │ author · date · 6 ր.     │
│ │ img            │       │   │ cover (full-bleed)       │
│ │ title · meta   │       │   │ ▾ Բովանդակություն (acc.) │
│ └────────────────┘       │   │ Body…                    │
│ … cards stack …          │   │ [share row]              │
│ NEWSLETTER               │   │ author bio · newsletter  │
│ [Բեռնել ավելին]          │   │ Կարդա նաև (scroll-x)     │
│ FOOTER                   │   │ FOOTER                   │
└──────────────────────────┘   └──────────────────────────┘
```

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 (index) | `text-3xl font-bold text-gray-900` |
| H1 (article) | `text-4xl font-bold leading-tight` (mobile՝ `text-2xl`) |
| Ենթավերնագիր | `text-base text-gray-500 max-w-2xl` |
| Category badge | `bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full` |
| Card | `shadow-sm border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition` |
| Card cover | `aspect-[16/9] object-cover` |
| Card title | `text-lg font-semibold text-gray-900 line-clamp-2` |
| Card excerpt | `text-sm text-gray-600 line-clamp-2` |
| Meta row | `text-xs text-gray-400 flex items-center gap-2` |
| Active chip | `bg-primary text-white` (idle՝ `bg-gray-100 text-gray-700 hover:bg-gray-200`) |
| Featured overlay | `bg-gradient-to-t from-black/70 to-transparent` |
| Body prose | `prose prose-gray max-w-none prose-a:text-primary prose-img:rounded-xl` |
| TOC active | `text-primary font-medium border-l-2 border-primary pl-3` |
| Progress bar | `fixed top-0 h-1 bg-primary z-50 transition-[width]` |
| Newsletter banner | `bg-primary/5 border border-primary/15 rounded-2xl p-6` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Breadcrumbs

- **Տեսք.** `text-sm text-gray-500`, separator `›`, hover՝ `text-primary underline`։ Render-վում է `BreadcrumbList` structured data-ով։
- **Index.** `Գլխավոր › Նորություններ`։ **Article.** `Գլխավոր › Նորություններ › Շուկա › 2 senyak…`։
- **Mobile.** Միայն `‹ Հետ` link (դեպի `/news`)։

### 3.2 Featured hero (index only)

- **Տվյալ.** `blog_posts WHERE is_featured = true ORDER BY published_at DESC LIMIT 1`; եթե featured չկա՝ ամենավերջին հոդվածը։
- **Տեսք.** Full-width `h-[420px] rounded-2xl`, cover + gradient overlay, ներքև-ձախ՝ badge + H2 (`text-2xl text-white font-bold`) + excerpt + author avatar + ամսաթիվ։
- **Վարք.** Ամբողջ block clickable → `/news/[slug]`։ Hover՝ cover-ը `scale-105` (`transition`)։
- **Mobile.** `h-[240px]`, excerpt թաքնված, միայն badge + վերնագիր։

### 3.3 Category filter (chips)

- **Կատեգորիաներ.** `Բոլորը · Գնում · Վաճառք · Վարձ · Ֆինանսավորում · Շուկայի տրենդներ · Նորություններ`։ Internal value-ներ՝ `all/buying/selling/renting/financing/market/news`։
- **Տեսք.** Հորիզոնական row (`flex gap-2 flex-wrap`), mobile՝ `overflow-x-auto` scroll։ Active chip՝ primary fill։
- **Վարք (SEO-ի համար կարևոր).** Click → **navigate** `/news/category/[category]` (առանձին crawlable URL), ոչ թե միայն client filter։ «Բոլորը» → `/news`։ SSR-ով render-վում է ֆիլտրված ցանկը։

### 3.4 Search box

- **Տեսք.** `🔍` icon + input (`h-11 rounded-lg border`), placeholder «Որոնել հոդվածներ…»։
- **Վարք.** Enter/submit → `/news?search=[q]` (SSR full-text որոնում `title` + `body` ընտրած լեզվի դաշտում)։ Debounce 300ms suggestion-ների համար (optional)։
- **Empty state.** «Ոչինչ չգտնվեց «{q}»-ով» + 3 առաջարկվող հոդված + «Մաքրել որոնումը»։

### 3.5 Article cards grid

- **Layout.** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`։
- **Card բովանդակություն.** cover (`aspect-[16/9]`) · category badge (cover-ի վրա `absolute top-3 left-3`) · վերնագիր (`line-clamp-2`) · excerpt (`line-clamp-2`) · author avatar+անուն · «·» · ամսաթիվ · «·» · «5 ր. ընթերցում»։
- **Վարք.** Ամբողջ card clickable → `/news/[slug]`։ Hover՝ `shadow-md`, վերնագիրը `text-primary`։
- **Տվյալ.** `GET /api/news?category=&search=&page=&lang=`։

### 3.6 Pagination

- **Տեսք.** Կենտրոնում `‹ 1 2 3 … 8 ›`, active՝ `bg-primary text-white rounded-md`։
- **Վարք (SEO).** Իրական `?page=N` URL-ներ (SSR), ոչ pure infinite scroll։ Mobile՝ «Բեռնել ավելին» կոճակ (բայց `rel=next/prev` link-երը head-ում մնում են)։
- **Edge.** Page > max → 404 կամ redirect last page-ին։

### 3.7 Article header & cover (article)

- **Category badge** clickable → կատեգորիայի էջ։
- **H1** (`text-4xl`)՝ `title[locale]`։
- **Meta row.** author avatar + անուն (clickable → `/news/author/[id]`) · 📅 published · «6 ր. ընթերցում» · «Թարմացվել է [ամսաթիվ]» (եթե `updated_at > published_at`)։
- **Cover.** `next/image priority` (LCP), `h-[420px] rounded-xl`, alt = վերնագիր (SEO)։

### 3.8 Table of contents (TOC)

- **Գեներացում.** Ավտո՝ body-ի H2/H3-ից (slugified anchor-ներ)։
- **Desktop.** Sticky աջ կողագոտի (`top-24`), scroll-spy ընդգծում ակտիվ բաժինը (IntersectionObserver)։
- **Mobile.** Collapsible accordion «▾ Բովանդակություն» (cover-ից հետո)։
- **Վարք.** Click anchor → smooth scroll + URL hash update։

### 3.9 Share buttons

- **Տեսք.** Desktop՝ sticky ձախ rail (`flex-col gap-2`); mobile՝ body-ից հետո հորիզոնական row։
- **Channels.** Facebook · Telegram · WhatsApp · X · 🔗 Պատճենել · Email (`mailto:`)։
- **Վարք.** Click → share intent URL նոր tab-ում; 🔗 → `navigator.clipboard` + toast «Հղումը պատճենվեց»։

### 3.10 Article body

- **Render.** Rich content CMS-ից (sanitized HTML / MDX)՝ պարբերություն, H2/H3, նկար (alt + lazy), quote, list, embedded video (lazy iframe), **inline CTA cards** ու internal links դեպի property/guides/neighborhood (SEO funnel)։
- **Inline CTA card.** Body-ի մեջ ներդրված block՝ «📍 Տես Արաբկիրի ակտիվ հայտարարությունները» + կոճակ → `/search?district=Arabkir` (`article_internal_link_click`)։
- **Լեզու.** `body[locale]`; բացակա թարգմանություն → fallback default + badge «Հասանելի է միայն հայերեն»։

### 3.11 Author bio · Newsletter · Related

- **Author bio.** Body-ի վերջում card՝ avatar · անուն · credentials/bio (E-E-A-T) · «Տեսնել բոլոր հոդվածները» → author էջ։
- **Newsletter (inline).** Email input + **[Բաժանորդագրվել]** → `POST /api/newsletter/subscribe` (double opt-in)։ Success toast «Ստուգիր փոստդ՝ հաստատելու համար»։ Edge՝ արդեն բաժանորդ → «Դու արդեն բաժանորդագրված ես»։
- **Related.** «Կարդա նաև» — 3-4 card նույն կատեգորիայից/tag-երից → `GET /api/news/[slug]/related`։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading (index)** | Featured skeleton + 6 card skeleton (shimmer) |
| **Loading (article)** | Title bar + cover block + 6 prose line skeleton |
| **Loaded** | Լրիվ index / article |
| **Empty (search/category)** | «Ոչինչ չգտնվեց» + առաջարկվող հոդվածներ + «Մաքրել» |
| **Draft / unpublished** | Հանրությանը 404; Admin-ին preview banner «Սևագիր — չհրապարակված» |
| **Untranslated** | hy/default fallback + badge «Հասանելի է միայն հայերեն»; `hreflang` չի դրվում |
| **404 (bad slug)** | «Հոդվածը չգտնվեց» + [Դեպի նորություններ] |
| **Old slug** | 301 redirect նոր slug-ին |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |
| **Broken cover** | Placeholder gradient + badge |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<NewsIndexPage> (Server Component, SSR)
 ├─ <Breadcrumbs items />
 ├─ <FeaturedHero post />
 ├─ <CategoryChips active />              (client, navigates)
 ├─ <NewsSearch defaultQuery />           (client)
 ├─ <ArticleGrid posts={Post[]} />
 │   └─ <ArticleCard post />
 ├─ <NewsletterBanner />                  (client)
 └─ <Pagination page total />

<ArticlePage> (Server Component, SSR)
 ├─ <ReadingProgress />                   (client)
 ├─ <Breadcrumbs />
 ├─ <ArticleHeader post />
 ├─ <ShareRail url title />               (client)
 ├─ <ArticleBody html={string} />         (server, sanitized)
 │   └─ <InlineCtaCard /> (body-embedded)
 ├─ <TableOfContents headings />          (client, scroll-spy)
 ├─ <AuthorBio author />
 ├─ <NewsletterBanner />                  (client)
 └─ <RelatedArticles slug />              (client, React Query)
```

### Data fields used (`blog_posts` — տես 00-SPEC §7)

`id, slug, title{hy,ru,en}, excerpt{hy,ru,en}, body{hy,ru,en}, cover, category, author_id, is_featured, published_at, updated_at, reading_time` + `author{id, name, avatar, bio, credentials}`

### API contract-ներ

**`GET /api/news?category=&search=&page=&lang=`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 41, "slug": "yerevan-shuka-2026-trendner",
      "title": "Երևանի շուկայի տրենդները 2026",
      "excerpt": "Գները կայունացել են…",
      "cover": "https://…/cover.jpg",
      "category": "market",
      "author": { "id": 3, "name": "Լիլիթ", "avatar": "…" },
      "publishedAt": "2026-05-12T09:00:00Z",
      "readingTime": 6
    }
  ],
  "page": 1, "totalPages": 8, "total": 94
}
```

**`GET /api/news/[slug]?lang=`**
```jsonc
// 200 OK
{
  "id": 41, "slug": "yerevan-shuka-2026-trendner",
  "title": "Երևանի շուկայի տրենդները 2026",
  "body": "<h2>…</h2><p>…</p>",
  "category": "market",
  "author": { "id": 3, "name": "Լիլիթ", "avatar": "…", "bio": "…", "credentials": "…" },
  "publishedAt": "2026-05-12T09:00:00Z",
  "updatedAt": "2026-06-01T10:00:00Z",
  "readingTime": 6,
  "availableLocales": ["hy", "ru"]
}
// 404 { "error": "not_found" }
// 301 → Location: /news/<new-slug>  (slug փոխվել է)
```

**`GET /api/news/[slug]/related`** → `200 { "items": ArticleCard[] }` (max 4)

**`POST /api/newsletter/subscribe`**
```jsonc
// request  { "email": "a@b.am", "source": "news_index" }
// 202      { "status": "pending_confirmation" }   → double opt-in email
// 409      { "error": "already_subscribed" }
// 429      { "error": "rate_limited" }
```

### Validation (zod)

```ts
const newsletterSchema = z.object({
  email: z.string().email("Անվավեր էլ. հասցե"),
  source: z.enum(["news_index", "article", "footer"]).optional(),
  // honeypot — պետք է դատարկ մնա
  website: z.string().max(0).optional(),
});
```

- Newsletter՝ rate-limit (3/ժ/IP) + honeypot + double opt-in (confirm token email-ով)։
- Article body՝ server-side sanitize (XSS) CMS HTML-ի համար։
- Search query՝ trim + max 100 նիշ, SQL-ից escape (parameterized)։

---

## 6. Responsive

- **≥1024px (lg).** Index՝ 3-սյունակ grid, full-width featured։ Article՝ եռամաս (share rail + body + TOC), sticky TOC `top-24`։
- **768–1023px (md).** Index՝ 2-սյունակ grid։ Article՝ body + collapsible TOC (rail թաքնված, share՝ body-ից հետո)։
- **<768px (sm).** Index՝ 1-սյունակ, chips horizontal scroll, «Բեռնել ավելին»։ Article՝ progress bar, `‹ Հետ`, accordion TOC, full-bleed cover, share row body-ից հետո։

---

## 7. Accessibility

- Cover/body նկարներ՝ իմաստալից `alt` (ոչ դատարկ)։ Decorative՝ `alt=""`։
- Category chips՝ `role="tablist"`/links, ակտիվը `aria-current="page"`։
- TOC՝ `<nav aria-label="Բովանդակություն">`, scroll-spy active-ը `aria-current`։
- Reading progress bar՝ `role="progressbar"` + `aria-valuenow`։
- Share կոճակները՝ `aria-label` («Կիսվել Facebook-ով»)։ Toast-ը՝ `role="status"`։
- Body prose՝ heading hierarchy ճիշտ (H1 → H2 → H3, ոչ skip)։ Contrast ≥ 4.5:1, touch target ≥ 44px։

---

## 8. SEO & meta (ընդլայնված — content page)

- **`<title>`** = ունիկ ամեն հոդվածի (CMS-ից խմբագրելի, ընտրած լեզվով), fallback՝ «{title} | {brand} Նորություններ»։ Index՝ «Անշարժ գույքի նորություններ և Insights | {brand}»։
- **`<meta name="description">`** = excerpt-ից կամ ձեռքով CMS field (≤ 155 նիշ)։
- **Structured data (JSON-LD).** Article՝ `NewsArticle` (`headline`, `image`, `datePublished`, `dateModified`, `author{Person}`, `publisher{Organization, logo}`, `mainEntityOfPage`) + `BreadcrumbList`։ Index՝ `Blog` + `BreadcrumbList`։
- **`hreflang`** ամեն լեզվի (hy/ru/en) + `x-default`, **միայն գոյություն ունեցող** թարգմանությունների վրա (`availableLocales`-ից)։
- **`canonical`** ամեն էջում (slug-ով); category/search/page variant-ները՝ ճիշտ canonical/pagination (`rel=next/prev`)։
- **OG / Twitter Card.** `og:type=article`, cover + վերնագիր + excerpt; `twitter:card=summary_large_image`։ Dynamic OG՝ `/api/og?type=news&slug=…`։
- **Sitemap.xml.** Ավտո-ներառում միայն հրապարակված հոդվածներ; `lastmod = updated_at`; news sitemap (Google News) թարմ հոդվածների համար (Phase 3)։
- **SSR** ամբողջ body-ի (ոչ client-only)՝ crawl-ի համար։
- **Internal linking.** Body-ի inline link-եր + related + category cross-links → topical authority։
- **E-E-A-T.** Author bio + credentials + `datePublished`/`dateModified` տեսանելի + sources/citations body-ում։
- **Draft/sold(deleted).** Չհրապարակված → `noindex` + 404; հին slug → 301 (SEO juice չկորցնելու)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `news_index_view` | Index load | `category, page` |
| `article_view` | Article load (dedupe 24h) | `slug, category` |
| `article_read_complete` | Progress 90% | `slug, reading_time` |
| `category_filter_click` | Chip click | `category` |
| `news_search` | Search submit | `query, results_count` |
| `article_share` | Share action | `slug, channel` |
| `article_internal_link_click` | Body/CTA link | `slug, target_url` |
| `newsletter_subscribe` | Submit success | `source` |
| `related_article_click` | Related card click | `slug, target_slug` |
| `featured_hero_click` | Hero click | `slug` |
