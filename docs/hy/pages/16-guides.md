# Էջ 16 — Guides / Resource Center (Ուղեցույցներ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO (ընդլայնված), analytics։

**URL.** `/guides` (hub) · `/guides/[slug]` (ուղեցույց) — օրինակ՝ `/hy/guides/arajin-bnakaran-gnelu-ughecuyc`
**Roles.** Բոլորը (Guest, User, Agent, Admin) դիտում են; ուղեցույցները ստեղծվում ու թարմացվում են Admin CMS-ով (տես `24-admin.md`)։
**Primary goal.** High-intent «how to» SEO + conversion։ Ուղեցույցը սովորեցնում է օգտատիրոջը և ուղղորդում դեպի գործիքներ (calculators, home-value, search, agents)։

---

## 0. Ակնարկ (Overview)

Guides-ը **evergreen content engine**-ն է՝ խորը, քայլ առ քայլ ուղեցույցներ («Առաջին բնակարան գնելու ուղեցույց», «Վաճառքի ամբողջական ուղեցույց», «Հիփոթեքի ուղեցույց»)։ Ի տարբերություն blog-ի, որը շուտ հնանում է, guide-ը մնում է արդիական ամիսներ/տարիներ և **թարմացվում** (ոչ թե նոր ամսաթիվ ստանում)։ Թիրախն է «ինչպես գնել բնակարան», «որքա՞ն կանխավճար է պետք» տիպի informational որոնումները, որոնք բերում են **բարձր մտադրությամբ** (high-intent) այցելու funnel-ի վերին մաս։

Guide-ի conversion-ի կորիզը՝ (1) downloadable checklist (PDF, lead capture), (2) inline tool CTA-ներ (mortgage calc, home-value, search), (3) related guides cross-linking (topical authority)։

**Տարբերությունը Blog-ից (`15-blog.md`).** Blog = timely news (`blog_posts`, `published_at`, `NewsArticle` schema)։ Guides = evergreen step-by-step (`guides`, `updated_at`, `HowTo`/`Article` schema, attachments)։ Տարբեր entity, տարբեր URL space, տարբեր structured data։

Էջն ունի **երկու template**.
- **Guides Hub** (`/guides`) — թեմատիկ բաժիններ (ճանապարհորդության փուլ) + guide cards + featured + որոնում + CTA։
- **Guide Page** (`/guides/[slug]`) — header + cover + sticky TOC + step-by-step body + checklist download + tool CTA-ներ + related։

Երկուսն էլ render-վում են **SSR**-ով; ինտերակտիվ մասերը (TOC scroll-spy, download, embedded calc) client component-ներ են։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Առաջին անգամ գնորդ Արմենը (desktop).** Արմենը Google-ում որոնել է «ինչպես գնել առաջին բնակարան Հայաստանում», հասել «Առաջին բնակարան գնելու ուղեցույց»-ին։ Ձախ sticky TOC-ով տեսնում է 7 քայլ։ Կարդում է «Քայլ 3 — Բյուջե», որտեղ ներդրված է mortgage mini-calc → տեղում հաշվում ամսական վճարը։ Ներքևում սեղմում է **«⬇ Ներբեռնել ստուգաթերթը (PDF)»** → ստանում checklist։ → `checklist_download` event, lead++։

**Սցենար Բ — Վաճառող Նարեն (mobile).** Նարեն բացում է «Վաճառքի ուղեցույց»-ը հեռախոսում։ TOC-ը collapsible accordion է։ Կարդում է «Ինչպես գնագոյացնել», սեղմում inline CTA **«Գնահատի՛ր տունդ անվճար ▸»** → անցնում `/home-value`։ → funnel աշխատեց (`guide_tool_cta_click`)։

**Սցենար Գ — Հետազոտող Գայանեն (desktop).** Գայանեն hub-ում սեղմում է **«Հիփոթեք / Ֆինանսներ»** բաժինը, տեսնում 4 guide։ Կարդում մեկը, վերջում «Կարդա նաև»-ից անցնում երկրորդին։ Internal linking-ը պահում է նրան կայքում 12 րոպե։ → topical authority + engagement signal։

---

## 2. Layout & visual structure

### Guides Hub — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Ուղեցույցներ                        │
│ H1 «Ուղեցույցներ» (text-3xl) · ենթավերնագիր · 🔍 search     │
├────────────────────────────────────────────────────────────┤
│ ── Ամենահայտնի ուղեցույցները (featured, 3 մեծ card) ──      │
├────────────────────────────────────────────────────────────┤
│ ## Գնորդների համար                                          │
│ ┌─card─┐ ┌─card─┐ ┌─card─┐  (grid-cols-3)                   │
│ │icon  │ │icon  │ │icon  │  title · «7 քայլ» · «12 ր.»     │
│ └──────┘ └──────┘ └──────┘                                  │
│ ## Վաճառողների համար                                        │
│ ┌─card─┐ ┌─card─┐                                           │
│ ## Վարձակալ / Տանտեր                                        │
│ ## Հիփոթեք / Ֆինանսներ                                      │
├────────────────────────────────────────────────────────────┤
│ CTA banner «Չգիտե՞ս որտեղից սկսել → Խոսիր գործակալի հետ»    │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Guide Page — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Ուղեցույցներ › Առաջին բնակարան       │
├───────────────────┬────────────────────────────────────────┤
│ ► TOC (sticky      │ ◄ GUIDE BODY (max-w-[760px])           │
│   top-24,          │ H1 (text-4xl)                          │
│   scroll-spy)      │ «Թարմացվել է 2026-06» · 12 ր. · expert │
│ ✓ Քայլ 1 Բյուջե    │ intro պարբերություն                     │
│ • Քայլ 2 Որոնում   │ ┌── cover h-[420px] ──┐                 │
│ • Քայլ 3 Դիտում    │ └──────────────────────┘                │
│ • Քայլ 4 Գործարք   │ ## Քայլ 1 — Բյուջե                      │
│ • Ստուգաթերթ       │   text · info box · նկար                │
│                    │   [⬇ Ներբեռնել ստուգաթերթ (PDF)]        │
│ ┌── download ──┐   │ ## Քայլ 2 — Որոնում                     │
│ │ checklist PDF │   │   [embedded mortgage mini-calc]        │
│ └───────────────┘  │   [Գնահատի՛ր տունդ ▸] CTA               │
│                    │ … քայլեր …                              │
├───────────────────┴────────────────────────────────────────┤
│ CTA «Պատրա՞ստ ես հաջորդ քայլին» · ── Կապված ուղեցույցներ ── │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ HEADER (h-14)            │   │ HEADER                   │
├──────────────────────────┤   ├──────────────────────────┤
│ H1 · 🔍 search           │   │ ‹ Հետ                    │
│ Featured (scroll-x)      │   │ H1 (text-2xl)            │
│ ## Գնորդների համար       │   │ Թարմացվել է · 12 ր.      │
│ ┌─card (1-col)─┐         │   │ cover (full-bleed)       │
│ └──────────────┘         │   │ ▾ Բովանդակություն (acc.) │
│ ## Վաճառողների …         │   │ intro                    │
│ … բաժիններ stack …       │   │ ## Քայլ 1 …              │
│ CTA banner               │   │ [⬇ Ստուգաթերթ (sticky)]  │
│ FOOTER                   │   │ tool CTA-ներ · related   │
└──────────────────────────┘   │ FOOTER                   │
                               └──────────────────────────┘
```

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 (hub) | `text-3xl font-bold text-gray-900` |
| H1 (guide) | `text-4xl font-bold leading-tight` (mobile՝ `text-2xl`) |
| Բաժնի վերնագիր | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8` |
| Guide card | `shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition` |
| Card icon | `w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center` |
| Card meta | `text-xs text-gray-400` («7 քայլ · 12 ր. ընթերցում») |
| TOC active | `text-primary font-medium border-l-2 border-primary pl-3` |
| TOC done (✓) | `text-gray-400 line-through` (progress, login) |
| Step heading (H2) | `text-2xl font-semibold scroll-mt-24` (anchor) |
| Info box | `bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg` |
| Warning box | `bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg` |
| Download card | `border border-primary/20 bg-primary/5 rounded-xl p-5` |
| Download CTA | `bg-primary text-white h-11 rounded-lg px-5 font-medium` |
| Tool CTA | `border border-primary text-primary h-11 rounded-lg px-5 hover:bg-primary/5` |
| Body prose | `prose prose-gray max-w-none prose-a:text-primary prose-img:rounded-xl` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Breadcrumbs

- **Տեսք.** `text-sm text-gray-500`, separator `›`, render `BreadcrumbList` structured data-ով։
- **Hub.** `Գլխավոր › Ուղեցույցներ`։ **Guide.** `Գլխավոր › Ուղեցույցներ › Առաջին բնակարան…`։
- **Mobile (guide).** `‹ Հետ` link → `/guides`։

### 3.2 Hub header & search

- **H1** `text-3xl`, ենթավերնագիր՝ SEO տեքստ (1-2 նախադասություն, max-w-2xl)։
- **Search.** `🔍` + input, placeholder «Որոնել ուղեցույց…»։ Submit → `/guides?search=[q]` (SSR full-text `title`+`body`)։ Empty՝ «Ոչինչ չգտնվեց» + առաջարկվող guides։

### 3.3 Featured / Popular guides

- «Ամենահայտնի ուղեցույցները» — 3 մեծ card (cover + title + meta)։ Տվյալ՝ `guides ORDER BY views_count DESC LIMIT 3` կամ Admin-ի pin։
- **Click** → `/guides/[slug]`։

### 3.4 Թեմատիկ բաժիններ (hub categories)

- **Խմբավորում ըստ ճանապարհորդության փուլի.** `Գնորդների համար · Վաճառողների համար · Վարձակալ / Տանտեր · Հիփոթեք / Ֆինանսներ`։ Internal value՝ `buyer/seller/renter/finance`։
- Ամեն բաժին՝ H2 վերնագիր + guide cards grid (`grid-cols-3`, mobile 1)։
- **Empty բաժին** (guide չկա) → ամբողջ բաժինը թաքնված (չի ցույց տրվում դատարկ վերնագիր)։

### 3.5 Guide card

- **Բովանդակություն.** icon/cover · վերնագիր (`line-clamp-2`) · կարճ նկարագիր · «7 քայլ» badge · «12 ր. ընթերցում» · progress bar (եթե login և սկսած)։
- **Վարք.** Ամբողջ card clickable → `/guides/[slug]`։ Hover՝ `shadow-md`, վերնագիրը `text-primary`։
- **Տվյալ.** `GET /api/guides?category=&search=&lang=`։

### 3.6 Hub CTA banner

- «Չգիտե՞ս որտեղից սկսել» + **[Խոսիր գործակալի հետ]** → `/agents` · (optional) email signup։

### 3.7 Guide header & cover (guide page)

- **H1** (`text-4xl`)՝ `title[locale]`։
- **Meta.** «Թարմացվել է [ամսաթիվ]» (ոչ published — evergreen) · «12 ր. ընթերցում» · author/expert avatar + credentials (E-E-A-T)։
- **Intro.** Կարճ պարբերություն՝ «Ի՞նչ կսովորես այս ուղեցույցից» (bullet list, optional)։
- **Cover.** `next/image priority`, `h-[420px] rounded-xl`, alt = վերնագիր։

### 3.8 Table of contents (TOC) — sticky

- **Գեներացում.** Ավտո body-ի H2/H3-ից, քայլերի ցանկով։
- **Desktop.** Sticky ձախ կողագոտի (`top-24`), scroll-spy active highlight (IntersectionObserver)։ Login-ի դեպքում՝ կարդացած քայլերը ✓ (progress)։
- **Mobile.** Collapsible accordion «▾ Բովանդակություն»։
- **Վարք.** Click anchor → smooth scroll + hash update։

### 3.9 Step-by-step body

- **Կառուցվածք.** «Քայլ 1 … Քայլ N …» H2-ով; ամեն բաժին՝ բացատրություն, նկար (alt+lazy), օրինակ, **info box** (💡 խորհուրդ) / **warning box** (⚠️ զգուշացում)։
- **Render.** CMS rich content (sanitized HTML/MDX), `prose` styling։
- **Լեզու.** `body[locale]`; բացակա թարգմանություն → fallback default + badge «Հասանելի է միայն հայերեն»։

### 3.10 Downloadable checklist

- **Տեսք.** Download card (`bg-primary/5 border`)՝ «📋 Առաջին գնորդի ստուգաթերթ» + **[⬇ Ներբեռնել (PDF)]**։
- **Վարք.** Click → ներբեռնում PDF (`guide.attachments[]`, Supabase Storage signed URL)։ Phase 2՝ login-ի հետևում lead capture (email gate)։ Track՝ `POST /api/guides/[slug]/download` → `download_count++`։
- **Edge.** Attachment չկա → ամբողջ card թաքնված։

### 3.11 Embedded calculators / tool CTA

- **Inline embed.** Mortgage mini-calc (նույն component-ը property էջից, local state)։
- **CTA կոճակներ.** **[Հաշվել հիփոթեքս]** → `/mortgage/calculators` · **[Գնահատի՛ր տունդ]** → `/home-value` · **[Որոնել գույք]** → `/search`։ Ամեն մեկը internal link (SEO funnel + `guide_tool_cta_click`)։

### 3.12 Related guides & end CTA

- **Կապված ուղեցույցներ.** 3-4 card → `GET /api/guides/[slug]/related` (նույն category/tag)։
- **End CTA.** «Պատրա՞ստ ես հաջորդ քայլին» → search / agents / calculators։
- **Newsletter (inline, optional).** Email signup (նույն component-ը blog-ից)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading (hub)** | Featured skeleton + բաժինների card skeleton |
| **Loading (guide)** | Title bar + cover + prose line skeleton + TOC skeleton |
| **Loaded** | Լրիվ hub / guide |
| **Empty (search)** | «Ոչինչ չգտնվեց» + առաջարկվող ուղեցույցներ |
| **Untranslated** | hy/default fallback + badge «Հասանելի է միայն հայերեն»; `hreflang` չի դրվում |
| **No checklist** | Download card թաքնված |
| **Progress (login)** | TOC-ում ✓ կարդացած քայլերի վրա (Phase 3) |
| **404 (bad slug)** | «Ուղեցույցը չգտնվեց» + [Դեպի ուղեցույցներ] |
| **Old slug** | 301 redirect նոր slug-ին |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<GuidesHubPage> (Server Component, SSR)
 ├─ <Breadcrumbs />
 ├─ <GuidesSearch defaultQuery />          (client)
 ├─ <FeaturedGuides guides />
 ├─ <GuideCategorySection title guides />   (×4 փուլ)
 │   └─ <GuideCard guide />
 └─ <HubCtaBanner />

<GuidePage> (Server Component, SSR)
 ├─ <Breadcrumbs />
 ├─ <GuideHeader guide />
 ├─ <TableOfContents headings progress />   (client, scroll-spy)
 ├─ <GuideBody html={string} />             (server, sanitized)
 │   ├─ <InfoBox /> <WarningBox />
 │   ├─ <MortgageMiniCalc />                (client, embedded)
 │   └─ <ToolCtaButtons />
 ├─ <ChecklistDownload attachments />       (client)
 ├─ <RelatedGuides slug />                  (client, React Query)
 └─ <NewsletterBanner />                    (client)
```

### Data fields used (`guides` — առանձին `blog_posts`-ից, տես 00-SPEC §7)

`id, slug, title{hy,ru,en}, intro{hy,ru,en}, body{hy,ru,en}, cover, category, author_id, attachments[], reading_time, step_count, views_count, download_count, updated_at` + `author{id, name, avatar, credentials}`

### API contract-ներ

**`GET /api/guides?category=&search=&lang=`**
```jsonc
// 200 OK
{
  "sections": [
    {
      "category": "buyer",
      "title": "Գնորդների համար",
      "items": [
        {
          "id": 7, "slug": "arajin-bnakaran-gnelu-ughecuyc",
          "title": "Առաջին բնակարան գնելու ուղեցույց",
          "intro": "Քայլ առ քայլ…",
          "cover": "https://…/cover.jpg",
          "stepCount": 7, "readingTime": 12
        }
      ]
    }
  ],
  "featured": [ /* GuideCard[] */ ]
}
```

**`GET /api/guides/[slug]?lang=`**
```jsonc
// 200 OK
{
  "id": 7, "slug": "arajin-bnakaran-gnelu-ughecuyc",
  "title": "Առաջին բնակարան գնելու ուղեցույց",
  "intro": "Քայլ առ քայլ…",
  "body": "<h2>Քայլ 1 — Բյուջե</h2><p>…</p>",
  "category": "buyer",
  "author": { "id": 5, "name": "Գայանե", "avatar": "…", "credentials": "Licensed agent" },
  "attachments": [
    { "id": 14, "label": "Առաջին գնորդի ստուգաթերթ", "url": "https://…/checklist.pdf", "sizeKb": 240 }
  ],
  "readingTime": 12, "stepCount": 7,
  "updatedAt": "2026-06-10T08:00:00Z",
  "availableLocales": ["hy", "ru", "en"]
}
// 404 { "error": "not_found" }
// 301 → Location: /guides/<new-slug>
```

**`GET /api/guides/[slug]/related`** → `200 { "items": GuideCard[] }` (max 4)

**`POST /api/guides/[slug]/download`**
```jsonc
// request  { "attachmentId": 14 }
// 200      { "url": "https://…/signed-checklist.pdf?token=…" }
// 401      { "error": "auth_required" }   → login modal (եթե lead-gate միացված է)
// 404      { "error": "attachment_not_found" }
```

### Validation (zod)

```ts
const downloadSchema = z.object({
  attachmentId: z.number().int().positive(),
});
// lead-gate միացված ռեժիմում՝ email պարտադիր
const leadGateSchema = z.object({
  email: z.string().email("Անվավեր էլ. հասցե"),
  attachmentId: z.number().int().positive(),
});
```

- Guide body՝ server-side sanitize (XSS) CMS HTML-ի համար։
- Download URL՝ կարճ-կյանք signed link (Supabase Storage), ոչ public direct URL։
- Download count՝ +1, dedupe ըստ `session_id + attachment_id` (24h)։

---

## 6. Responsive

- **≥1024px (lg).** Hub՝ 3-սյունակ grid բաժիններով։ Guide՝ երկսյունակ (sticky TOC ձախ `top-24` + body)։
- **768–1023px (md).** Hub՝ 2-սյունակ։ Guide՝ body + collapsible TOC (rail թաքնված), download card inline։
- **<768px (sm).** Hub՝ 1-սյունակ, featured horizontal scroll։ Guide՝ `‹ Հետ`, accordion TOC, full-bleed cover, **sticky bottom download bar** «⬇ Ստուգաթերթ»։

---

## 7. Accessibility

- TOC՝ `<nav aria-label="Բովանդակություն">`, active anchor՝ `aria-current`։
- Step heading hierarchy ճիշտ (H1 → H2 → H3, ոչ skip)։
- Info/warning box՝ `role="note"` + տեսանելի icon + տեքստ (ոչ միայն գույն)։
- Download կոճակ՝ `aria-label` («Ներբեռնել ստուգաթերթ, PDF, 240KB»)։ Embedded calc՝ keyboard-հասանելի slider-ներ։
- Tool CTA կոճակները՝ իմաստալից label (ոչ «սեղմիր այստեղ»)։ Contrast ≥ 4.5:1, touch target ≥ 44px։

---

## 8. SEO & meta (ընդլայնված — evergreen content)

- **`<title>`** = ունիկ ամեն ուղեցույցի (թիրախ՝ «how to»/informational queries, CMS-ից խմբագրելի), fallback՝ «{title} — Ուղեցույց | {brand}»։ Hub՝ «Անշարժ գույքի ուղեցույցներ և ռեսուրսներ | {brand}»։
- **`<meta name="description">`** = intro-ից կամ ձեռքով CMS field (≤ 155 նիշ)։
- **Structured data (JSON-LD).** Step-by-step ուղեցույց՝ `HowTo` (`step[]`, `totalTime`, `tool`, `supply`) + `Article` (author, dateModified, publisher)։ Եթե guide-ում FAQ բաժին կա՝ `FAQPage`։ + `BreadcrumbList`։
- **`hreflang`** (hy/ru/en) + `x-default`, **միայն թարգմանված** տարբերակների վրա (`availableLocales`-ից)։
- **`canonical`** ամեն էջում (slug-ով)։ Slug չի փոխվում թարմացման ժամանակ (evergreen URL stability)։
- **OG / Twitter Card.** `og:type=article`, cover + վերնագիր + intro։ Dynamic OG՝ `/api/og?type=guide&slug=…`։
- **Sitemap.xml.** Ավտո-ներառում, **բարձր crawl priority** (evergreen, stable), `lastmod = updated_at`։
- **SSR** ամբողջ body-ի (crawl)։
- **Internal linking hub.** Guides խաչաձև հղվում են միմյանց + blog + calculators + search → **topical authority cluster**։
- **E-E-A-T.** Author/expert credentials + թարմացման ամսաթիվ տեսանելի + sources/citations body-ում։
- **Freshness.** Պարբերական content թարմացում → `dateModified` update (Google-ի freshness signal)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `guides_hub_view` | Hub load | `category` |
| `guide_view` | Guide load (dedupe 24h) | `slug, category` |
| `guide_read_complete` | TOC վերջին քայլ տեսանելի | `slug, reading_time` |
| `guide_section_view` | Քայլ բաժին scroll | `slug, step` |
| `guides_search` | Search submit | `query, results_count` |
| `checklist_download` | Download success | `slug, attachment_id` |
| `guide_tool_cta_click` | Tool CTA / inline link | `slug, target_url` |
| `embedded_calc_used` | Mini-calc slider | `slug` |
| `related_guide_click` | Related card click | `slug, target_slug` |
| `guide_card_click` | Hub card click | `slug, category` |
