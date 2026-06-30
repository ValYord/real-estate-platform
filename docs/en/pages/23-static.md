# Page 23 — Static pages (Static pages) 🟢 Phase 1

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO (extended), analytics.

**URL.** `/about` · `/contact` · `/faq` · `/terms` · `/privacy` · `/cookies` · `/help` — e.g. `/hy/contact`, `/ru/faq`
**Roles.** Everyone (viewing); contact form: everyone (captcha for Guests).
**Primary goal.** Trust + legal compliance + support. Required for launch (footer links, legal requirements). All content is **trilingual** (hy/ru/en).

---

## 0. Overview

The static pages are the site's **foundation of trust and legality**. They don't convert directly, but launching without them is impossible (App Store/legal review, cookie law, mandatory footer links). At the same time, the **About/Contact/FAQ/Help** pages have SEO value and support deflection value (user self-service, fewer support tickets).

All pages share a **common skeleton**: Header + Footer + breadcrumbs + H1 + SSR (SEO) + canonical + hreflang. The content is stored in the **CMS or in i18n messages** (editable by the Admin without a deploy). The only **interactive** parts: Contact form, FAQ/Help accordion+search, Cookie consent modal — the rest is pure static render.

Pages by type:
- **Content** (`/about`, `/terms`, `/privacy`, `/cookies`) — read-only, prose + TOC (for legal).
- **Interactive** (`/contact`, `/faq`, `/help`) — form / accordion / search.
- **Consent** (`/cookies`) — preference modal + banner.

---

## 1. User scenarios

**Scenario A — Karen looking for support (mobile).** Karen can't post a listing. From the footer he opens `/faq`, types "post" in the search, the accordion filters, and he clicks the "How do I list a property?" question → the answer expands with a link to the wizard. He didn't write to support (deflection). → `faq_search` + `faq_expand` events.

**Scenario B — Mary looking for a partnership (desktop).** Mary opens `/contact`, selects Topic = "Partnership", fills out the form, and clicks **[Send]** → captcha (Guest) → success toast "Thank you, we'll get back to you soon". An email went to Admin, and a record was created in the DB. → `contact_submitted`.

**Scenario C — First-time visitor Ani (cookie consent).** Ani is visiting for the first time. A cookie banner rises from the bottom: **[Accept all] [Necessary only] [Configure]**. She clicks "Configure" → a modal with toggles (analytics/marketing) → **[Save]**. Before consent: non-necessary analytics weren't loaded (legal). → `cookie_consent_set`.

---

## 2. Layout & visual structure

### Content page (About / Legal) — Desktop

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › About us                              │
├──────────────────┬─────────────────────────────────────────┤
│ ► TOC (legal,    │ ◄ CONTENT (prose, max-w-[760px])        │
│   sticky top-24) │ H1 (text-3xl)                           │
│ • Section 1      │ «Last updated: 2026-06» (legal)         │
│ • Section 2      │ Hero / narrative / sections…            │
│ • Section 3      │ ── Values (icon grid) ──               │
│ (scroll-spy)     │ ── Statistics (counters) ──             │
│                  │ CTA «List a property» «Search»          │
├──────────────────┴─────────────────────────────────────────┤
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Contact page — Desktop (two-column)

```
┌────────────────────────────────────────────────────────────┐
│ Breadcrumbs · H1 «Contact us»                             │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ CONTACT FORM (≈58%)            │ ► OFFICE INFO (≈42%)    │
│ Name*  [____________]             │ 📍 Address              │
│ Email*  [____________]            │ 📞 +374… (tel:)         │
│ Phone  [____________]             │ ✉️ info@… (mailto:)     │
│ Topic ▾  [General    ]            │ 🕐 Working hours        │
│ Message.* [__________]            │ 🔗 Social networks      │
│         [captcha (guest)]         │                          │
│         [ Send ]                  │ ┌── Mapbox h-[280px] ──┐ │
│                                   │ │ 📍 office             │ │
│                                   │ └───────────────────────┘ │
├──────────────────────────────────┴─────────────────────────┤
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### FAQ / Help — Desktop

```
┌────────────────────────────────────────────────────────────┐
│ H1 «Frequently asked questions» · 🔍 [search questions__] │
│ [General][Buyer][Seller][Rent][Account][Pro]  tabs        │
├────────────────────────────────────────────────────────────┤
│ ▸ How do I list a property                           [+]   │
│ ▾ How do I change the price                           [−]   │
│   answer… (link to the wizard)                              │
│ ▸ Is posting a listing free                          [+]   │
│ …                                                           │
│ «Didn't find the answer?» → [Contact us] [Help Center]    │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — all static pages

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Back                   │
│ H1 (text-2xl)            │
│ ▾ Table of contents (legal)│
│ Content stack (1-col)    │
│ Contact: form → info →   │
│   map (stacked)          │
│ FAQ: search → tabs       │
│   (scroll-x) → accordion │
│ FOOTER                   │
├──────────────────────────┤
│ COOKIE BANNER (first)    │
│ [Accept][Necessary][⚙]  │
└──────────────────────────┘
```

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` (mobile: `text-2xl`) |
| Update date | `text-sm text-gray-400` (legal pages) |
| Section heading (H2) | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8 scroll-mt-24` |
| Prose | `prose prose-gray max-w-none prose-a:text-primary` |
| Value icon card | `flex gap-3 items-start`, icon `w-10 h-10 text-primary` |
| Counter | `text-3xl font-bold text-primary` + `text-sm text-gray-500` label |
| Form input | `h-11 rounded-lg border border-gray-300 focus:border-primary` |
| Form label | `text-sm font-medium text-gray-700`, required: `*` red |
| Error text | `text-sm text-red-600 mt-1` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg px-6 font-medium hover:bg-primary/90` |
| Accordion item | `border-b border-gray-200`, trigger `py-4 font-medium`, hover `text-primary` |
| Accordion icon | `+` / `−` rotate transition |
| Office info row | `flex gap-3 items-center text-gray-700` |
| Map | `h-[280px] rounded-xl overflow-hidden` |
| Cookie banner | `fixed bottom-0 inset-x-0 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4 z-50` |
| Consent toggle | shadcn `Switch` (necessary: disabled, always on) |

---

## 3. Page-by-page

### 3.1 About (`/about`)

- **Breadcrumbs.** `Home › About us`.
- **Hero.** H1 "About us" + mission slogan + image.
- **Our story.** Narrative (why it was created, what problem it solves).
- **Mission and values.** 3-4 values with icon cards (`grid grid-cols-1 md:grid-cols-3`).
- **Team** (optional P1).** Avatar + name + role grid.
- **Statistics.** Counters: "X listings · X cities · X users" (animate on scroll).
- **In the press / Partners** (optional).
- **CTA.** **[List a property]** → `/sell/new` (Guest → login) · **[Search properties]** → `/search` · **[Contact us]** → `/contact`.

### 3.2 Contact (`/contact`)

- **Breadcrumbs.** `Home › Contact`. **H1** "Contact us".
- **Contact form (left).** Fields: **Name*** · **Email*** · Phone · **Topic** (dropdown: General / Support / Partnership / Complaint) · **Message***.
  - **Validation.** react-hook-form + zod, inline error (`text-red-600`). For Guests: captcha (anti-spam).
  - **[Send].** → `POST /api/contact` → success toast "Thank you, we'll get back to you soon" + email to admin. Loading: spinner + disabled. Error: "Something went wrong, try again".
- **Office info (right).** 📍 Address · 📞 phone (`tel:`) · ✉️ email (`mailto:`) · 🕐 working hours · 🔗 social networks.
- **Map.** Mapbox embed with the office 📍 pin; "Open in Google Maps" link.

### 3.3 FAQ (`/faq`)

- **Breadcrumbs.** `Home › Frequently asked questions`. **H1** "Frequently asked questions".
- **Search box.** `🔍` + input → filter questions by keyword (client-side, `title`+`answer`). Empty: "Nothing found" + [Contact us].
- **Categories (tabs).** `General · For buyers · For sellers · Rent · Account / Security · Payments (Pro)`. Active tab highlighted.
- **Accordion (shadcn).** Question/answer pairs; click → expand/collapse. Default: all closed (single-open mode: design choice). **Deep-link** anchor (e.g. `/faq#how-to-list`) → auto-expand + scroll.
- **CTA.** "Didn't find the answer?" → **[Contact us]** `/contact` · **[Help Center]** `/help`.

### 3.4 Terms of Service (`/terms`)

- **Breadcrumbs.** `Home › Terms of Service`. **H1** + "Last updated: [date]".
- **TOC.** Anchors to sections (sticky desktop / collapsible mobile, scroll-spy).
- **Legal sections (H2).** acceptance · account · user obligations · prohibited content · intellectual property · limitation of liability · **marketplace disclaimer** (we don't participate in the financial transaction) · dispute resolution · governing law (by country) · changes.
- **Links.** Inline → `/privacy`, `/cookies`. **Multi-country.** The governing law section may differ by country (note P2/3).

### 3.5 Privacy Policy (`/privacy`)

- **Breadcrumbs.** `Home › Privacy Policy`. **H1** + update date.
- **TOC** + **sections (H2).** what data we collect · how we use it · cookies (→ `/cookies`) · third parties (Supabase, Mapbox, analytics) · data retention · user rights (access/delete/export — GDPR style) · data security · children's privacy · contact for data protection.
- **CTA.** **[Manage my data]** → `/settings`.

### 3.6 Cookie Policy (`/cookies`)

- **Breadcrumbs.** `Home › Cookie Policy`. **H1** + update date.
- **Sections.** what cookies are · types (necessary / analytical / marketing) · third-party cookies · how to manage/disable.
- **Cookie preferences table.** Category × purpose × duration.
- **[Manage preferences].** → consent modal (toggle: analytics/marketing; necessary disabled-on) → **[Save]** → preference cookie/localStorage + consent log.
- **Cookie consent banner.** On first visit (on every page): **[Accept all] [Necessary only] [Configure]**. Before consent: non-necessary cookies/analytics are not loaded (legal).

### 3.7 Help Center (`/help`)

- **Breadcrumbs.** `Home › Help Center`. **H1** + **search box** (article search).
- **Thematic categories (cards).** Getting started · Account and security · Posting a listing · Search and favorites · Messages · Pro / payments → click → `/help/[category]`.
- **Popular articles.** list → `/help/[slug]`.
- **CTA.** "Still need help?" → **[Contact us]** `/contact` · FAQ link `/faq`.

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loaded (content)** | Static prose render (SSR), TOC (legal) |
| **Contact idle** | Empty form |
| **Contact submitting** | Spinner + disabled button |
| **Contact success** | Green toast "Thank you, we'll get back to you soon" + form reset |
| **Contact error** | Inline field errors / "Something went wrong" |
| **Contact rate-limited** | "Too many requests, try again a little later" |
| **FAQ/Help empty search** | "Nothing found for «{q}»" + [Contact us] |
| **Cookie pre-consent** | Banner visible; analytics not loaded |
| **Cookie consent set** | Banner hidden; preference saved |
| **Untranslated** | Fallback to default + `hreflang` only on existing ones |
| **404** | "Page not found" + [Home] |

---

## 5. Technical depth

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

### Data fields used (see 00-SPEC §7)

- **Legal/About** — i18n messages or CMS (`title{hy,ru,en}, body{hy,ru,en}, updated_at`).
- **FAQ** — `faq_items{id, slug, category, question{hy,ru,en}, answer{hy,ru,en}, order}`.
- **Help** — `help_articles{id, slug, category, title{hy,ru,en}, body{hy,ru,en}}`.
- **Contact** — `contact_messages{id, name, email, phone, subject, body, created_at, status}`.
- **Cookie consent** — client cookie/localStorage `{necessary:true, analytics:bool, marketing:bool, ts}` + server consent log.

### API contracts

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
  // honeypot — must stay empty
  website: z.string().max(0).optional(),
});
```

- Contact: rate-limit (3/h/IP) + captcha (Guest) + honeypot + server-side email.
- Legal/About content: CMS HTML server-side sanitize (XSS).
- Cookie consent: stored **before** injecting non-necessary scripts; consent log for audit.

---

## 6. Responsive

- **≥1024px (lg).** Legal: two-column (sticky TOC + prose). Contact: two-column (form + info/map). FAQ: tabs horizontal.
- **768–1023px (md).** Single column; legal TOC collapsible; contact form → info → map stack.
- **<768px (sm).** `‹ Back`; everything stacks; FAQ tabs/categories horizontal scroll; accordion full-width; **cookie banner** fixed bottom.

---

## 7. Accessibility

- Form: `<label for>` for every input + `aria-required` + `aria-invalid` + error `aria-describedby`; submit success/error: `role="status"`/`role="alert"`.
- Accordion (shadcn): `aria-expanded`, keyboard (Enter/Space toggle, ↑/↓ navigate).
- Legal TOC: `<nav aria-label="Table of contents">`, active anchor `aria-current`.
- Cookie banner: focus-trap in the modal, ESC does not close (consent required), buttons keyboard-accessible; toggles `aria-checked`.
- Map: `aria-label` + "Open in Google Maps" fallback link. Contrast ≥ 4.5:1, touch target ≥ 44px.

---

## 8. SEO & meta (extended)

- **`<title>` + `<meta name="description">`** = unique per page (in the selected language, editable from the CMS).
- **`hreflang`** (hy/ru/en) + `x-default` + **`canonical`** on every page; missing translation → `hreflang` not set for that language.
- **SSR / static** render (fast, crawlable, Core Web Vitals).
- **Structured data (JSON-LD).** `/faq` → **`FAQPage`** (rich results in Google); `/about` + `/contact` → **`Organization`** (logo, `contactPoint`, `sameAs` social networks) + `LocalBusiness` (address, geo); `BreadcrumbList` everywhere; `/help/[slug]` → `Article`.
- **OG / Twitter Card** on every page + sitemap.xml inclusion (legal: low priority, About/Help: high).
- **Internal linking.** Help/FAQ → guides/blog/wizard (support SEO + deflection funnel).
- **Legal versioning.** Terms/Privacy/Cookies: visible update date + (optional) archive of previous versions (compliance).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `static_page_view` | Page load | `page` (about/terms/…) |
| `contact_submitted` | Form success | `subject` |
| `contact_error` | Submit fail | `reason` |
| `faq_search` | FAQ/Help search | `query, results_count` |
| `faq_expand` | Accordion open | `faq_id, category` |
| `faq_category_tab` | Tab switch | `category` |
| `help_article_click` | Help card/article | `slug, category` |
| `contact_channel_click` | tel:/mailto: click | `channel` |
| `cookie_consent_set` | Consent save | `analytics, marketing` |
| `cookie_banner_action` | Banner button | `action` (accept_all/necessary/configure) |
