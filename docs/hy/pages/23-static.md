# Էջ 23 — Static pages (Ստատիկ էջեր) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO (ընդլայնված), analytics։

**URL.** `/about` · `/contact` · `/faq` · `/terms` · `/privacy` · `/cookies` · `/help` — օրինակ՝ `/hy/contact`, `/ru/faq`
**Roles.** Բոլորը (դիտում); contact form՝ բոլորը (Guest-ին captcha)։
**Primary goal.** Վստահություն + legal compliance + աջակցություն։ Պարտադիր launch-ի համար (footer links, օրինական պահանջներ)։ Ամբողջ բովանդակությունը **եռալեզու** (hy/ru/en)։

---

## 0. Ակնարկ (Overview)

Ստատիկ էջերը կայքի **վստահության ու օրինականության հիմքն են**։ Չեն convert անում ուղղակիորեն, բայց առանց դրանց launch անհնար է (App Store/legal review, cookie օրենք, footer-ի պարտադիր links)։ Միաժամանակ՝ **About/Contact/FAQ/Help** էջերը SEO-ի և support deflection-ի (օգտատիրոջ ինքնասպասարկում, ավելի քիչ support tickets) արժեք ունեն։

Բոլոր էջերն ունեն **ընդհանուր կմախք**՝ Header + Footer + breadcrumbs + H1 + SSR (SEO) + canonical + hreflang։ Բովանդակությունը պահվում է **CMS-ում կամ i18n messages-ում** (Admin-ի կողմից խմբագրելի՝ առանց deploy-ի)։ Միակ **ինտերակտիվ** մասերը՝ Contact form, FAQ/Help accordion+search, Cookie consent modal — մնացածը մաքուր static render։

Էջերն ըստ տիպի.
- **Content** (`/about`, `/terms`, `/privacy`, `/cookies`) — read-only, prose + TOC (legal-ի համար)։
- **Interactive** (`/contact`, `/faq`, `/help`) — form / accordion / search։
- **Consent** (`/cookies`) — preference modal + banner։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Աջակցություն փնտրող Կարենը (mobile).** Կարենը չի կարողանում հայտարարություն տեղադրել։ Footer-ից բացում է `/faq`, search-ում գրում «տեղադրել», accordion-ը ֆիլտրվում է, սեղմում «Ինչպե՞ս տեղադրել գույք» հարցը → expand պատասխան՝ link-ով դեպի wizard։ Չի գրել support-ին (deflection)։ → `faq_search` + `faq_expand` events։

**Սցենար Բ — Գործընկեր փնտրող Մերին (desktop).** Մերին բացում է `/contact`, ընտրում Թեմա = «Գործընկերություն», լրացնում form-ը, սեղմում **[Ուղարկել]** → captcha (Guest) → success toast «Շնորհակալություն, կպատասխանենք շուտով»։ Admin-ին email գնաց, DB-ում record ստեղծվեց։ → `contact_submitted`։

**Սցենար Գ — Առաջին այցելու Անին (cookie consent).** Անին առաջին անգամ է մտնում։ Ներքևից բարձրանում է cookie banner՝ **[Ընդունել բոլորը] [Միայն անհրաժեշտ] [Կարգավորել]**։ Սեղմում «Կարգավորել» → modal toggle-ներով (analytics/marketing) → **[Պահպանել]**։ Մինչ consent՝ ոչ-անհրաժեշտ analytics չի բեռնվել (legal)։ → `cookie_consent_set`։

---

## 2. Layout & visual structure

### Content page (About / Legal) — Desktop

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Մեր մասին                           │
├──────────────────┬─────────────────────────────────────────┤
│ ► TOC (legal,    │ ◄ CONTENT (prose, max-w-[760px])        │
│   sticky top-24) │ H1 (text-3xl)                           │
│ • Բաժին 1        │ «Վերջին թարմացում՝ 2026-06» (legal)      │
│ • Բաժին 2        │ Hero / narrative / sections…            │
│ • Բաժին 3        │ ── Արժեքներ (icon grid) ──              │
│ (scroll-spy)     │ ── Վիճակագրություն (counters) ──         │
│                  │ CTA «Տեղադրել գույք» «Որոնել»            │
├──────────────────┴─────────────────────────────────────────┤
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Contact page — Desktop (two-column)

```
┌────────────────────────────────────────────────────────────┐
│ Breadcrumbs · H1 «Կապ մեզ հետ»                             │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ CONTACT FORM (≈58%)            │ ► OFFICE INFO (≈42%)    │
│ Անուն*  [____________]            │ 📍 Հասցե                │
│ Email*  [____________]            │ 📞 +374… (tel:)         │
│ Հեռախոս [____________]            │ ✉️ info@… (mailto:)     │
│ Թեմա ▾  [Ընդհանուր   ]            │ 🕐 Աշխ. ժամեր           │
│ Հաղորդ.* [__________]             │ 🔗 Սոց. ցանցեր          │
│         [captcha (guest)]         │                          │
│         [ Ուղարկել ]              │ ┌── Mapbox h-[280px] ──┐ │
│                                   │ │ 📍 գրասենյակ          │ │
│                                   │ └───────────────────────┘ │
├──────────────────────────────────┴─────────────────────────┤
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### FAQ / Help — Desktop

```
┌────────────────────────────────────────────────────────────┐
│ H1 «Հաճախ տրվող հարցեր» · 🔍 [որոնել հարցեր____]           │
│ [Ընդհանուր][Գնորդ][Վաճառող][Վարձ][Հաշիվ][Pro]  tabs        │
├────────────────────────────────────────────────────────────┤
│ ▸ Ինչպե՞ս տեղադրել գույք                              [+]   │
│ ▾ Ինչպե՞ս փոխել գինը                                  [−]   │
│   պատասխան… (link դեպի wizard)                              │
│ ▸ Անվճա՞ր է հայտարարություն տեղադրելը                 [+]   │
│ …                                                           │
│ «Չգտա՞ք պատասխանը» → [Կապ մեզ հետ] [Help Center]           │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — բոլոր static էջերը

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Հետ                    │
│ H1 (text-2xl)            │
│ ▾ Բովանդակություն (legal)│
│ Content stack (1-col)    │
│ Contact՝ form → info →   │
│   map (stacked)          │
│ FAQ՝ search → tabs       │
│   (scroll-x) → accordion │
│ FOOTER                   │
├──────────────────────────┤
│ COOKIE BANNER (first)    │
│ [Ընդունել][Անհրաժ.][⚙]  │
└──────────────────────────┘
```

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` (mobile՝ `text-2xl`) |
| Թարմացման ամսաթիվ | `text-sm text-gray-400` (legal էջեր) |
| Բաժնի վերնագիր (H2) | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8 scroll-mt-24` |
| Prose | `prose prose-gray max-w-none prose-a:text-primary` |
| Արժեք icon card | `flex gap-3 items-start`, icon `w-10 h-10 text-primary` |
| Counter | `text-3xl font-bold text-primary` + `text-sm text-gray-500` label |
| Form input | `h-11 rounded-lg border border-gray-300 focus:border-primary` |
| Form label | `text-sm font-medium text-gray-700`, պարտադիր՝ `*` red |
| Error text | `text-sm text-red-600 mt-1` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg px-6 font-medium hover:bg-primary/90` |
| Accordion item | `border-b border-gray-200`, trigger `py-4 font-medium`, hover `text-primary` |
| Accordion icon | `+` / `−` rotate transition |
| Office info row | `flex gap-3 items-center text-gray-700` |
| Map | `h-[280px] rounded-xl overflow-hidden` |
| Cookie banner | `fixed bottom-0 inset-x-0 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4 z-50` |
| Consent toggle | shadcn `Switch` (անհրաժեշտը՝ disabled, միշտ on) |

---

## 3. Բաժին առ բաժին (Page-by-page)

### 3.1 About (`/about`)

- **Breadcrumbs.** `Գլխավոր › Մեր մասին`։
- **Hero.** H1 «Մեր մասին» + առաքելության նշանաբան + նկար։
- **Մեր պատմությունը.** Narrative (ինչու ստեղծվեց, ինչ խնդիր է լուծում)։
- **Առաքելություն և արժեքներ.** 3-4 արժեք icon card-ով (`grid grid-cols-1 md:grid-cols-3`)։
- **Թիմ** (optional P1).** Avatar + անուն + դեր grid։
- **Վիճակագրություն.** Counters՝ «X հայտարարություն · X քաղաք · X օգտատեր» (animate on scroll)։
- **Մամուլում / Partners** (optional)։
- **CTA.** **[Տեղադրել գույք]** → `/sell/new` (Guest → login) · **[Որոնել գույք]** → `/search` · **[Կապ մեզ հետ]** → `/contact`։

### 3.2 Contact (`/contact`)

- **Breadcrumbs.** `Գլխավոր › Կապ`։ **H1** «Կապ մեզ հետ»։
- **Contact form (ձախ).** Դաշտեր՝ **Անուն*** · **Email*** · Հեռախոս · **Թեմա** (dropdown՝ Ընդհանուր / Աջակցություն / Գործընկերություն / Բողոք) · **Հաղորդագրություն***։
  - **Validation.** react-hook-form + zod, inline error (`text-red-600`)։ Guest-ի համար՝ captcha (anti-spam)։
  - **[Ուղարկել].** → `POST /api/contact` → success toast «Շնորհակալություն, կպատասխանենք շուտով» + email admin-ին։ Loading՝ spinner + disabled։ Error՝ «Ինչ-որ բան սխալ գնաց, փորձիր կրկին»։
- **Office info (աջ).** 📍 Հասցե · 📞 հեռախոս (`tel:`) · ✉️ email (`mailto:`) · 🕐 աշխ. ժամեր · 🔗 սոց. ցանցեր։
- **Map.** Mapbox embed գրասենյակի 📍 pin-ով; «Բացել Google Maps-ում» link։

### 3.3 FAQ (`/faq`)

- **Breadcrumbs.** `Գլխավոր › Հաճախ տրվող հարցեր`։ **H1** «Հաճախ տրվող հարցեր»։
- **Search box.** `🔍` + input → filter հարցերը keyword-ով (client-side, `title`+`answer`)։ Empty՝ «Ոչինչ չգտնվեց» + [Կապ մեզ հետ]։
- **Categories (tabs).** `Ընդհանուր · Գնորդների համար · Վաճառողների համար · Վարձ · Հաշիվ / Անվտանգություն · Վճարումներ (Pro)`։ Active tab ընդգծված։
- **Accordion (shadcn).** Հարց/պատասխան զույգեր; click → expand/collapse։ Default՝ բոլորը փակ (single-open ռեժիմ՝ design choice)։ **Deep-link** anchor (օր.՝ `/faq#how-to-list`) → ավտո-expand + scroll։
- **CTA.** «Չգտա՞ք պատասխանը» → **[Կապ մեզ հետ]** `/contact` · **[Help Center]** `/help`։

### 3.4 Terms of Service (`/terms`)

- **Breadcrumbs.** `Գլխավոր › Օգտագործման պայմաններ`։ **H1** + «Վերջին թարմացում՝ [ամսաթիվ]»։
- **TOC.** Anchor-ներ բաժիններին (sticky desktop / collapsible mobile, scroll-spy)։
- **Իրավական բաժիններ (H2).** ընդունում · հաշիվ · օգտատիրոջ պարտականություն · արգելված բովանդակություն · intellectual property · պատասխանատվության սահմանափակում · **marketplace disclaimer** (չենք մասնակցում ֆինանսական գործարքին) · վեճերի լուծում · կիրառելի օրենք (ըստ երկրի) · փոփոխություններ։
- **Links.** Inline → `/privacy`, `/cookies`։ **Multi-country.** Կիրառելի օրենքի հատվածը կարող է երկրով տարբերվել (note P2/3)։

### 3.5 Privacy Policy (`/privacy`)

- **Breadcrumbs.** `Գլխավոր › Գաղտնիության քաղաքականություն`։ **H1** + թարմացման ամսաթիվ։
- **TOC** + **բաժիններ (H2).** ինչ տվյալ ենք հավաքում · ինչպես ենք օգտագործում · cookies (→ `/cookies`) · երրորդ կողմեր (Supabase, Mapbox, analytics) · տվյալների պահպանում · օգտատիրոջ իրավունքներ (access/delete/export — GDPR ոճ) · տվյալի անվտանգություն · երեխաների գաղտնիություն · կապ data protection-ի համար։
- **CTA.** **[Կառավարել իմ տվյալները]** → `/settings`։

### 3.6 Cookie Policy (`/cookies`)

- **Breadcrumbs.** `Գլխավոր › Cookie քաղաքականություն`։ **H1** + թարմացման ամսաթիվ։
- **Բաժիններ.** ի՞նչ են cookies-ը · տիպեր (անհրաժեշտ / վերլուծական / մարքեթինգային) · երրորդ կողմի cookies · ինչպես կառավարել/անջատել։
- **Cookie preferences table.** Կատեգորիա × նպատակ × տևողություն։
- **[Կառավարել նախընտրությունները].** → consent modal (toggle՝ analytics/marketing; անհրաժեշտը disabled-on) → **[Պահպանել]** → preference cookie/localStorage + consent log։
- **Cookie consent banner.** Առաջին այցելության (ամեն էջում)՝ **[Ընդունել բոլորը] [Միայն անհրաժեշտ] [Կարգավորել]**։ Մինչ consent՝ ոչ-անհրաժեշտ cookies/analytics չեն բեռնվում (legal)։

### 3.7 Help Center (`/help`)

- **Breadcrumbs.** `Գլխավոր › Օգնության կենտրոն`։ **H1** + **search box** (հոդվածների որոնում)։
- **Թեմատիկ կատեգորիաներ (card-եր).** Սկսել · Հաշիվ և անվտանգություն · Հայտարարության տեղադրում · Որոնում և favorites · Հաղորդագրություններ · Pro / վճարումներ → click → `/help/[category]`։
- **Հանրաճանաչ հոդվածներ.** ցանկ → `/help/[slug]`։
- **CTA.** «Դեռ օգնության կարիք ունե՞ք» → **[Կապ մեզ հետ]** `/contact` · FAQ link `/faq`։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loaded (content)** | Static prose render (SSR), TOC (legal) |
| **Contact idle** | Դատարկ form |
| **Contact submitting** | Spinner + disabled կոճակ |
| **Contact success** | Green toast «Շնորհակալություն, կպատասխանենք շուտով» + form reset |
| **Contact error** | Inline field errors / «Ինչ-որ բան սխալ գնաց» |
| **Contact rate-limited** | «Չափից շատ հարցում, փորձիր մի փոքր հետո» |
| **FAQ/Help empty search** | «Ոչինչ չգտնվեց «{q}»-ով» + [Կապ մեզ հետ] |
| **Cookie pre-consent** | Banner տեսանելի; analytics չի բեռնված |
| **Cookie consent set** | Banner թաքնված; preference պահված |
| **Untranslated** | Fallback default + `hreflang` միայն գոյություն ունեցողների վրա |
| **404** | «Էջը չգտնվեց» + [Գլխավոր] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<StaticContentPage> (Server Component, SSR/static)
 ├─ <Breadcrumbs />
 ├─ <LegalToc headings />            (client, scroll-spy; legal only)
 └─ <Prose html={i18nOrCms} />

<ContactPage> (Server Component)
 ├─ <ContactForm />                  (client, react-hook-form + zod)
 │   └─ <Captcha />                  (Guest only)
 ├─ <OfficeInfo info />
 └─ <OfficeMap lat lng />            (client, Mapbox)

<FaqPage> / <HelpPage> (Server Component)
 ├─ <FaqSearch />                    (client, filter)
 ├─ <CategoryTabs active />          (client)
 └─ <Accordion items />              (client, shadcn, deep-link)

<CookieConsent />                    (client, global; banner + modal)
```

### Data fields used (տես 00-SPEC §7)

- **Legal/About** — i18n messages կամ CMS (`title{hy,ru,en}, body{hy,ru,en}, updated_at`)։
- **FAQ** — `faq_items{id, slug, category, question{hy,ru,en}, answer{hy,ru,en}, order}`։
- **Help** — `help_articles{id, slug, category, title{hy,ru,en}, body{hy,ru,en}}`։
- **Contact** — `contact_messages{id, name, email, phone, subject, body, created_at, status}`։
- **Cookie consent** — client cookie/localStorage `{necessary:true, analytics:bool, marketing:bool, ts}` + server consent log։

### API contract-ներ

**`POST /api/contact`**
```jsonc
// request
{ "name": "Մերի", "email": "mary@b.am", "phone": "+374…",
  "subject": "partnership", "message": "Բարև, …", "website": "" }
// 201 { "ok": true }
// 400 { "error": "validation", "fields": { "email": "Անվավեր էլ. հասցե" } }
// 429 { "error": "rate_limited" }
```

**`GET /api/faq?category=&search=&lang=`** → `200 { "items": FaqItem[] }`
**`GET /api/help?category=&search=&lang=`** → `200 { "items": HelpArticle[] }`
**`GET /api/help/[slug]?lang=`** → `200 { ...HelpArticle } | 404`

### Validation (zod)

```ts
const contactSchema = z.object({
  name: z.string().min(2, "Անունը պարտադիր է").max(50),
  email: z.string().email("Անվավեր էլ. հասցե"),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար").optional(),
  subject: z.enum(["general", "support", "partnership", "complaint"]),
  message: z.string().min(10, "Հաղորդագրությունը կարճ է").max(2000),
  // honeypot — պետք է դատարկ մնա
  website: z.string().max(0).optional(),
});
```

- Contact՝ rate-limit (3/ժ/IP) + captcha (Guest) + honeypot + server-side email։
- Legal/About content՝ CMS HTML server-side sanitize (XSS)։
- Cookie consent՝ պահվում է **մինչև** ոչ-անհրաժեշտ script-երի inject; consent log audit-ի համար։

---

## 6. Responsive

- **≥1024px (lg).** Legal՝ երկսյունակ (sticky TOC + prose)։ Contact՝ երկսյունակ (form + info/map)։ FAQ՝ tabs horizontal։
- **768–1023px (md).** Մեկ սյունակ; legal TOC collapsible; contact form → info → map stack։
- **<768px (sm).** `‹ Հետ`; բոլորը stack; FAQ tabs/categories horizontal scroll; accordion full-width; **cookie banner** fixed bottom։

---

## 7. Accessibility

- Form-ը՝ ամեն input-ի `<label for>` + `aria-required` + `aria-invalid` + error `aria-describedby`; submit success/error՝ `role="status"`/`role="alert"`։
- Accordion (shadcn)՝ `aria-expanded`, keyboard (Enter/Space toggle, ↑/↓ navigate)։
- Legal TOC՝ `<nav aria-label="Բովանդակություն">`, active anchor `aria-current`։
- Cookie banner՝ focus-trap modal-ում, ESC չի փակում (consent պարտադիր), կոճակները keyboard-հասանելի; toggle-ները `aria-checked`։
- Map՝ `aria-label` + «Բացել Google Maps-ում» fallback link։ Contrast ≥ 4.5:1, touch target ≥ 44px։

---

## 8. SEO & meta (ընդլայնված)

- **`<title>` + `<meta name="description">`** = ունիկ ամեն էջի (ընտրած լեզվով, CMS-ից խմբագրելի)։
- **`hreflang`** (hy/ru/en) + `x-default` + **`canonical`** ամեն էջում; բացակա թարգմանություն → `hreflang` չի դրվում այդ լեզվի վրա։
- **SSR / static** render (արագ, crawlable, Core Web Vitals)։
- **Structured data (JSON-LD).** `/faq` → **`FAQPage`** (rich results Google-ում); `/about` + `/contact` → **`Organization`** (logo, `contactPoint`, `sameAs` սոց. ցանցեր) + `LocalBusiness` (հասցե, geo); `BreadcrumbList` ամենուր; `/help/[slug]` → `Article`։
- **OG / Twitter Card** ամեն էջում + sitemap.xml ներառում (legal-ը՝ ցածր priority, About/Help՝ բարձր)։
- **Internal linking.** Help/FAQ → guides/blog/wizard (support SEO + deflection funnel)։
- **Legal versioning.** Terms/Privacy/Cookies՝ թարմացման ամսաթիվ տեսանելի + (optional) արխիվ նախորդ տարբերակների (compliance)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `static_page_view` | Էջի load | `page` (about/terms/…) |
| `contact_submitted` | Form success | `subject` |
| `contact_error` | Submit fail | `reason` |
| `faq_search` | FAQ/Help search | `query, results_count` |
| `faq_expand` | Accordion open | `faq_id, category` |
| `faq_category_tab` | Tab switch | `category` |
| `help_article_click` | Help card/article | `slug, category` |
| `contact_channel_click` | tel:/mailto: click | `channel` |
| `cookie_consent_set` | Consent save | `analytics, marketing` |
| `cookie_banner_action` | Banner button | `action` (accept_all/necessary/configure) |
