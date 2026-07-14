# Design Spec — Static / Legal Pages (Page 23)

**Routes:** `/about` · `/contact` · `/faq` · `/terms` · `/privacy` · `/cookies` · `/help`
**Example:** `/hy/faq`, `/ru/contact`, `/en/privacy`
**Version:** 1.0 (Phase 1)
**Date:** 2026-07-12
**Source doc:** `docs/en/pages/23-static.md` (this spec adapts it to this repo's actual conventions and to the Phase‑1 scope below)

---

## 0. Purpose & Phase‑1 scope

These seven pages are the site's trust/legal foundation: About, Contact, FAQ, Terms, Privacy, Cookies, Help. They share one skeleton (Header + Footer + Breadcrumbs + H1 + SSR + canonical + hreflang) and differ only in content shape: **prose** (About/Terms/Privacy/Cookies), **form** (Contact), **search+accordion** (FAQ), **category cards** (Help). A global **Cookie Consent** banner/modal sits outside all of them.

**Explicit Phase‑1 simplifications (do not build beyond this):**
- Content (About narrative, Terms/Privacy/Cookies legal text, FAQ items, Help articles) lives in the **i18n message files** (`messages/{hy,ru,en}.json`), not a CMS. No admin editor.
- `GET /api/faq` and `GET /api/help` from the source doc are **not needed** — FAQ/Help data is bundled at build/SSR time from messages and filtered client‑side. Only `POST /api/contact` is a real API route.
- `/help/[slug]` is **not built**. Help Center is category cards + a static "popular articles" list (each article is `{ title, href }`, `href` pointing to an existing guide/blog/FAQ anchor if one exists, or `/contact` as a fallback). No article detail page, no `Article` JSON‑LD.
- No captcha vendor is wired up in Phase 1 — the honeypot field is the anti‑spam mechanism; leave a documented seam (a `// TODO: captcha` comment + a disabled prop) rather than integrating a real captcha SDK.
- No Admin moderation queue for `contact_messages` (that's Page 24 — out of scope). No archive of previous legal‑text versions.
- Do not touch pages 09 (Messages), 21 (Settings), 22 (Notifications) or any other page/route.

---

## 1. Design Tokens

Reuse the project's existing tokens (`app/globals.css`, `--color-primary: #2563eb`) — do not introduce a new palette. Additions specific to this page group:

### 1.1 Colors

| Token | Tailwind class | Usage |
|-------|----------------|-------|
| `primary` | `text-primary` / `bg-primary` | CTAs, active tab, active TOC link, accordion hover |
| `gray-900` | `text-gray-900` | H1, headings |
| `gray-700` | `text-gray-700` | Body/prose text, office info rows |
| `gray-600` | `text-gray-600` | Breadcrumbs current, secondary text |
| `gray-500` | `text-gray-500` | Labels, TOC inactive links, counters caption |
| `gray-400` | `text-gray-400` | "Last updated" date |
| `gray-300` | `text-gray-300` | Breadcrumb separators, disabled tab |
| `gray-200` | `border-gray-200` | Section dividers, accordion borders, card borders |
| `gray-100` | `bg-gray-100` | Skeleton, hover background for TOC/tab |
| `red-600` | `text-red-600` | Form field errors |
| `green-600` / `green-50` | toast success | `bg-green-50 text-green-700 border-green-200` |
| `red-50` / `red-700` | toast/banner error | `bg-red-50 text-red-700 border-red-200` |
| `blue-50` / `blue-700` | info banner (rate‑limited) | `bg-blue-50 text-blue-700 border-blue-200` |

### 1.2 Typography

| Element | Tailwind classes |
|---|---|
| H1 | `text-3xl font-bold text-gray-900` (mobile `text-2xl`) |
| Update date (legal) | `text-sm text-gray-400` |
| H2 (section) | `text-xl font-semibold text-gray-900 border-t border-gray-200 pt-6 mt-8 scroll-mt-24` |
| H3 (sub‑section) | `text-lg font-semibold text-gray-900 mt-4 scroll-mt-24` |
| Prose body | `prose prose-gray max-w-none prose-a:text-primary prose-a:no-underline hover:prose-a:underline` |
| TOC link | `text-sm text-gray-500 hover:text-primary` → active: `text-primary font-medium` |
| Counter (About stats) | `text-3xl font-bold text-primary` + caption `text-sm text-gray-500` |
| Form label | `text-sm font-medium text-gray-700` (required `*` → `text-red-600 ml-0.5`) |
| Form error | `text-sm text-red-600 mt-1` |
| Accordion trigger | `py-4 text-base font-medium text-gray-900 hover:text-primary` |
| Accordion answer | `text-sm text-gray-700 leading-relaxed pb-4` |

### 1.3 Spacing

| Context | Tailwind | px |
|---|---|---|
| Page container | `max-w-screen-xl mx-auto px-4 lg:px-8 py-6` | — |
| Legal grid gap (TOC ↔ prose) | `gap-10` | 40 |
| Prose max width | `max-w-[760px]` | 760 |
| TOC sticky offset | `top-24` | 96 (below sticky header h‑16 + breadcrumb bar) |
| Section vertical gap | `mt-8` between H2 blocks | 32 |
| Contact grid gap | `gap-10 lg:gap-12` | — |
| Form field gap | `space-y-5` | 20 |
| FAQ tabs gap | `gap-2` | 8 |
| Help category card grid gap | `gap-4` | 16 |

### 1.4 Shadows & Borders

| Element | Tailwind |
|---|---|
| Contact form card | `border border-gray-200 rounded-xl p-6` (mobile: no border, flush) |
| Office info card | `border border-gray-200 rounded-xl p-5` |
| Map container | `h-[280px] rounded-xl overflow-hidden border border-gray-200` |
| Help category card | `border border-gray-200 rounded-xl p-5 hover:border-primary hover:shadow-sm transition` |
| Cookie banner | `border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]` |
| Cookie modal | shadcn `Dialog` default (`rounded-lg shadow-lg`) |

### 1.5 Interactive States

| State | Tailwind |
|---|---|
| Form input focus | `focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary` |
| Form input error | `border-red-500 focus:ring-red-500` |
| Button loading | spinner (`animate-spin`) + `disabled:opacity-60 disabled:cursor-not-allowed` |
| Active FAQ tab | `bg-primary text-white` (pill) or `border-b-2 border-primary text-primary` (underline) — see §4.4 |
| Accordion open icon | `+` rotates 45° → `×`/`−`, `transition-transform duration-200` |
| TOC active (scroll‑spy) | `text-primary font-medium border-l-2 border-primary pl-3` (inactive: `border-l-2 border-transparent pl-3`) |
| Skip‑to‑consent focus ring | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` |

---

## 2. Route / file organization (proposal for the developer)

```
app/[locale]/
  about/page.tsx
  contact/page.tsx
  faq/page.tsx
  terms/page.tsx
  privacy/page.tsx
  cookies/page.tsx
  help/page.tsx

app/api/contact/route.ts        # POST only

components/static/
  PageHero.tsx                  # H1 + optional subtitle, shared by all 7 pages
  LegalToc.tsx                  # client, scroll-spy, used by terms/privacy/cookies
  Prose.tsx                     # server, renders a section list into <article>
  ContactForm.tsx                # client, react-hook-form + zod
  OfficeInfo.tsx                 # server
  OfficeMap.tsx                  # thin client wrapper around components/property/PropertyMap.tsx
  FaqSearch.tsx                  # client
  FaqCategoryTabs.tsx            # client
  FaqAccordion.tsx               # client, shadcn Accordion, deep-link
  HelpCategoryCards.tsx          # server
  PopularArticlesList.tsx        # server
  CookieConsentBanner.tsx        # client, global (mounted once in app/[locale]/layout.tsx)
  CookieConsentModal.tsx         # client, shadcn Dialog + Switch

lib/static/
  types.ts                       # StaticSection, FaqItem, HelpArticle, OfficeInfo types
  contactSchema.ts                # zod contactSchema (client + server import the SAME schema)
  faqHelpers.ts                   # filterFaqItems(items, query, category) — pure, unit-testable
  cookieConsent.ts                 # get/set consent (localStorage), CONSENT_COOKIE_NAME, types

messages/{hy,ru,en}.json
  "about": { ... }
  "contact": { ... }
  "faq": { ... }
  "terms": { ... }
  "privacy": { ... }
  "cookies": { ... }
  "help": { ... }
  "cookieConsent": { ... }        # shared banner/modal copy

supabase/migrations/
  <timestamp>_contact_messages.sql   # table + RLS (see §6.2) — developer owns exact filename/timestamp
```

Reuse rather than duplicate:
- `components/property/Breadcrumbs.tsx` for all breadcrumb trails (already has mobile "‹ Back" + desktop trail + `BreadcrumbList` microdata — no need for a second implementation; the JSON‑LD `BreadcrumbList` in §7 is the *additional* `<script type="application/ld+json">` block the doc asks for, layered on top of the microdata this component already emits — don't double-emit, pick one mechanism per page, prefer the JSON-LD script since it's what §8 of the source doc calls out for rich results).
- `components/property/PropertyMap.tsx` for the Contact page's office map — do not fork a second Mapbox loader. Wrap it (`OfficeMap.tsx`) only to pin the office coordinates and add the "Open in Google Maps" link if `PropertyMap` doesn't already expose one generically enough.
- `lib/auth/rateLimit.ts` (`checkRateLimit`, `LIMITS`) — add a `CONTACT: { max: 3, windowMs: 60 * 60 * 1000 }` preset next to `LOGIN`/`REGISTER`/`FORGOT` rather than writing a new limiter.
- shadcn components not yet installed in this repo's `components/ui` (`accordion`, `dialog`, `switch`, `tabs`) need to be added via the shadcn CLI (`components.json` is already configured, style `new-york`, base color `zinc`) — do this once, don't hand-roll accordion/dialog primitives.

---

## 3. Page Layouts

### 3.1 Content / Legal page (About, Terms, Privacy, Cookies) — Desktop ≥1024px

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                          │
├────────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › About us                                  │
├───────────────────┬──────────────────────────────────────────┤
│ TOC (legal only)   │ H1  text-3xl                              │
│ sticky top-24      │ «Last updated: 2026-06» (legal only)      │
│ • Section 1        │                                            │
│ • Section 2  ← active (scroll-spy, border-l-2 border-primary)  │
│ • Section 3        │ prose sections…  max-w-[760px]            │
│ • Section 4        │ ── About: values grid / stats counters ── │
│                     │ ── About: CTA row ──                      │
├───────────────────┴──────────────────────────────────────────┤
│ FOOTER                                                          │
└────────────────────────────────────────────────────────────────┘
```
Grid: `grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 items-start`. About has **no TOC column** — it's a single `max-w-[760px] mx-auto` prose column instead (no numbered legal sections to jump to). Terms/Privacy/Cookies **do** show the TOC column.

### 3.2 Content / Legal page — Mobile <768px

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ ‹ Back                    │
│ H1  text-2xl               │
│ «Last updated: …» (legal) │
│ ▾ Table of contents        │ ← <details>/<summary>, collapsed by default
│   (legal only)             │
│ prose sections (1-col)     │
│ ── About: stacked CTAs ──  │
├──────────────────────────┤
│ FOOTER                     │
└──────────────────────────┘
```

### 3.3 Contact page — Desktop ≥1024px

```
┌────────────────────────────────────────────────────────────────┐
│ Breadcrumbs · H1 «Contact us»                                  │
├─────────────────────────────────┬────────────────────────────┤
│ CONTACT FORM (≈58%, card)        │ OFFICE INFO (≈42%)          │
│ Name*      [______________]      │ 📍 Address line              │
│ Email*     [______________]      │ 📞 +374 XX XXX XXX (tel:)    │
│ Phone      [______________]      │ ✉️ info@site.am (mailto:)    │
│ Topic ▾    [General         ]    │ 🕐 Mon–Fri 09:00–18:00       │
│ Message*   [________________]    │ 🔗 Facebook · Instagram ·    │
│            [________________]    │    Telegram                  │
│ [website field — visually hidden,│                              │
│  honeypot, not shown to users]   │ ┌─ OfficeMap h-[280px] ────┐ │
│                                   │ │ 📍 office pin              │ │
│ [        Send        ]           │ └────────────────────────────┘ │
│                                   │ Open in Google Maps →        │
├─────────────────────────────────┴────────────────────────────┤
│ FOOTER                                                          │
└────────────────────────────────────────────────────────────────┘
```
Grid: `grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-12 items-start`.

### 3.4 Contact page — Mobile <768px

Stacked: Form → Office info → Map, in that order (`flex flex-col gap-8`).

### 3.5 FAQ page — Desktop ≥1024px

```
┌────────────────────────────────────────────────────────────────┐
│ Breadcrumbs · Home › FAQ                                        │
│ H1 «Frequently asked questions»                                 │
│ 🔍 [ Search questions______________ ]                            │
│ [General][Buyers][Sellers][Rent][Account][Pro]  ← tabs, scrollable│
├────────────────────────────────────────────────────────────────┤
│ ▸ How do I list a property?                                [+] │
│ ▾ How do I change the price?                                [−] │
│   Go to Dashboard → your listing → Edit → update the price...   │
│   [Open the wizard →]                                           │
│ ▸ Is posting a listing free?                                [+] │
│ …                                                                │
├────────────────────────────────────────────────────────────────┤
│ «Didn't find the answer?»                                       │
│ [Contact us]  [Help Center]                                     │
├────────────────────────────────────────────────────────────────┤
│ FOOTER                                                           │
└────────────────────────────────────────────────────────────────┘
```
Empty search state (all filtered out):
```
   🔍
"Nothing found for “post a listinggg”"
        [Contact us →]
```

### 3.6 Help Center — Desktop ≥1024px

```
┌────────────────────────────────────────────────────────────────┐
│ Breadcrumbs · Home › Help Center                                 │
│ H1 «Help Center»                                                  │
│ 🔍 [ Search help articles__________ ]                             │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 🚀 Getting│ │ 🔒 Account│ │ 🏠 Posting│ │ 🔍 Search │  grid-4  │
│  │  started  │ │ & security│ │ a listing │ │& favorites│          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                                       │
│  │ 💬 Messages│ │ 💳 Pro /  │                                     │
│  │           │ │  payments │                                     │
│  └──────────┘ └──────────┘                                       │
├────────────────────────────────────────────────────────────────┤
│ Popular articles                                                  │
│ • How do I reset my password?                                    │
│ • How do I list a property for sale?                              │
│ • How do I contact a seller?                                      │
│ • What does “Featured” mean?                                      │
│ • How do I cancel my Pro subscription?                            │
├────────────────────────────────────────────────────────────────┤
│ «Still need help?»  [Contact us]   FAQ link → /faq                │
│ FOOTER                                                             │
└────────────────────────────────────────────────────────────────┘
```
Card grid: `grid grid-cols-2 lg:grid-cols-3 gap-4`. Each card click scrolls to / filters the matching FAQ category (`/faq?category=account`) since there's no `/help/[category]` page in Phase 1 — **card `href` points into `/faq` with a category query param**, not to a non‑existent Help sub‑route. Popular articles list items link the same way (to the closest matching FAQ anchor, e.g. `/faq#how-do-i-list-a-property`) or to `/contact` when there is no matching FAQ item.

### 3.7 Cookie Consent — Banner (all pages, first visit)

```
┌──────────────────────────────────────────────────────────────┐
│ We use cookies to improve your experience. See our Cookie      │
│ Policy for details.                                            │
│                        [Necessary only]  [Configure]  [Accept all] │
└──────────────────────────────────────────────────────────────┘
```
`fixed bottom-0 inset-x-0 z-50 bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)] p-4`. On mobile, buttons stack full‑width below the text.

### 3.8 Cookie Consent — Configure modal

```
┌── Cookie preferences ──────────────────────────── [✕] ──┐
│ Necessary               always on          [●───] (disabled) │
│ Required for the site to function (auth, cart, language).    │
│                                                                │
│ Analytics                                    [○───]           │
│ Helps us understand how visitors use the site.                │
│                                                                │
│ Marketing                                    [○───]           │
│ Used to personalize ads and measure campaigns.                 │
│                                                                │
│                          [Save preferences]                    │
└─────────────────────────────────────────────────────────────┘
```
shadcn `Dialog` + `Switch`. No ESC‑to‑close and no backdrop‑click‑to‑close until a choice is made the *first* time (consent is mandatory before dismissal) — subsequent opens (from `/cookies` "Manage preferences") behave like a normal closable dialog.

---

## 4. Component Specifications

### 4.1 `<PageHero>` (server)

**Props:** `title: string; subtitle?: string; updatedAt?: string /* ISO date, legal pages only */`

Renders H1 + optional subtitle + optional "Last updated: {formatted date}" (`text-sm text-gray-400`, formatted with `Intl.DateTimeFormat(locale, { year:'numeric', month:'long', day:'numeric' })`).

---

### 4.2 `<LegalToc>` (client)

**Props:** `headings: Array<{ id: string; label: string; level: 2 | 3 }>`

- `<nav aria-label="Table of contents">`.
- **Desktop (`lg:block`):** `sticky top-24 self-start`, vertical list, `IntersectionObserver` on each `<h2 id>`/`<h3 id>` in the prose (rootMargin tuned so the heading crossing ~25% from the top of the viewport marks it active) sets the active link (`aria-current="location"` + `text-primary font-medium border-l-2 border-primary`).
- **Mobile (`lg:hidden`):** rendered as `<details><summary>Table of contents ▾</summary>…</details>`, collapsed by default, no scroll‑spy needed (just a jump list).
- Clicking a link: smooth scroll (`scroll-behavior: smooth` + `scroll-mt-24` on headings, already in the H2 token) and updates the URL hash without a full navigation.

---

### 4.3 `<Prose>` (server)

**Props:** `sections: Array<{ id: string; heading: string; level: 2 | 3; body: string /* may contain simple markup */ }>`

Renders each section as `<h2 id={id} className="scroll-mt-24 ...">{heading}</h2>` followed by the body. Body text comes from i18n messages as **plain strings with a restricted set of inline tokens** (e.g. `{link:/privacy}text{/link}` resolved via a tiny helper, or simpler: pre-split each paragraph as its own message key and use `next-intl`'s `t.rich()` for inline links) — **do not** render raw HTML from messages with `dangerouslySetInnerHTML`; that reintroduces the XSS-sanitization problem the source doc flags for CMS HTML, which Phase 1 avoids entirely by not having a CMS. Prefer `t.rich('privacy.thirdParties.body', { link: (chunks) => <Link href="/cookies">{chunks}</Link> })`.

---

### 4.4 `<ContactForm>` (client)

**Props:** none (self-contained; reads `useTranslations('contact')`).

**Fields** (react-hook-form + zod resolver, schema from `lib/static/contactSchema.ts`):

| Field | Type | Rules |
|---|---|---|
| `name` | text | required, 2–50 chars |
| `email` | email | required, valid email |
| `phone` | tel | optional, E.164-ish pattern |
| `subject` | select | required, one of `general \| support \| partnership \| complaint` |
| `message` | textarea | required, 10–2000 chars |
| `website` | text, **honeypot** | must stay empty; field is visually hidden (`className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1} autoComplete="off"`), **not** `type="hidden"` (bots that skip hidden inputs specifically would bypass it — visually-hidden-but-focusable-by-bots is the correct honeypot pattern) |

**States:**
- **Idle** — empty inputs, `Send` enabled.
- **Client-invalid** — inline error text under the field, `aria-invalid="true"`, `aria-describedby="{field}-error"`, focus moves to first invalid field on submit attempt.
- **Submitting** — button shows spinner + "Sending…", `disabled`, all inputs `disabled`.
- **Success** — green toast/banner "Thank you, we'll get back to you soon" (`role="status"`), form resets.
- **Server error (400 validation)** — map `fields` from the API response back onto the matching RHF field errors.
- **Rate limited (429)** — banner "Too many requests, try again a little later" (`role="alert"`), submit button stays enabled so the user can retry later without a reload.
- **Network/500 error** — banner "Something went wrong, try again" (`role="alert"`).

Reuse the existing toast pattern from the codebase if one exists (check `components/**/Toast*` before adding a new one); otherwise an inline `role="status"`/`role="alert"` banner above the form is sufficient for Phase 1 — don't pull in a new toast library.

---

### 4.5 `<OfficeInfo>` (server)

**Props:** `address: string; phone: string; email: string; hours: string; social: Array<{ label: string; href: string; icon: LucideIcon }>`

Rows: `flex gap-3 items-center text-gray-700` with a `lucide-react` icon (`MapPin`, `Phone`, `Mail`, `Clock`) at `w-5 h-5 text-primary flex-shrink-0`. `tel:`/`mailto:` links fire `contact_channel_click` (see §12) on click.

---

### 4.6 `<OfficeMap>` (client)

**Props:** `lat: number; lng: number; label: string`

Thin wrapper: `<PropertyMap lat={lat} lng={lng} hideExact={false} title={label} />` inside the `h-[280px] rounded-xl overflow-hidden border` container, plus an "Open in Google Maps" link (`https://www.google.com/maps?q={lat},{lng}`) below — reuse `PropertyMap`'s existing fallback-on-missing-token behavior rather than reimplementing it.

---

### 4.7 `<FaqSearch>` (client)

**Props:** `onQueryChange: (q: string) => void`

Debounced (~200ms) text input with a `Search` icon (`lucide-react`), `aria-label="Search FAQ"`, clears with an `×` button when non-empty. Fires `faq_search` (§12) on debounced change with `results_count` computed by the parent.

---

### 4.8 `<FaqCategoryTabs>` (client)

**Props:** `categories: Array<{ key: string; label: string }>; active: string; onChange: (key: string) => void`

`role="tablist"`, each tab `role="tab" aria-selected`, horizontal scroll on mobile (`overflow-x-auto flex gap-2 -mx-4 px-4 snap-x`), pill style: active `bg-primary text-white`, inactive `bg-gray-100 text-gray-700 hover:bg-gray-200`. `"All"` is the default/first tab (maps to the doc's "General" being shown alongside everything, or a true "All" — developer's call; recommend an explicit "All" tab since search already narrows by keyword and users expect a reset).

---

### 4.9 `<FaqAccordion>` (client, shadcn `Accordion`)

**Props:** `items: FaqItem[]; activeId?: string /* from deep-link hash */`

- shadcn `Accordion type="single" collapsible` (source doc: "single-open mode" — matches shadcn's `type="single"`).
- Each `AccordionItem value={item.slug} id={item.slug}`.
- **Deep link:** on mount, read `window.location.hash`; if it matches an item slug, set it as the open value and `scrollIntoView({ behavior: 'smooth', block: 'start' })` after a tick (wait for layout). Also update `AccordionTrigger` `onClick` to push the slug into the URL hash (`history.replaceState`, no extra navigation entries) so answers are shareable.
- Fires `faq_expand` (§12) with `{ faq_id, category }` when an item opens.
- Keyboard: shadcn Accordion already provides Enter/Space toggle and ↑/↓ trigger navigation — verify, don't reimplement.
- Answer body may contain one inline link (e.g. "→ Open the wizard"); use `t.rich()` the same way as `<Prose>`.

---

### 4.10 `<HelpCategoryCards>` (server)

**Props:** `categories: Array<{ key: string; label: string; icon: LucideIcon; faqCategoryKey: string }>`

Grid of clickable cards (`Link href={`/faq?category=${faqCategoryKey}`}`), each: icon (`w-8 h-8 text-primary`) + label + short one-line description. Fires `help_article_click` (§12) with `{ slug: key, category: key }` on click (category card counts as a "click" per the analytics table).

---

### 4.11 `<PopularArticlesList>` (server)

**Props:** `articles: Array<{ title: string; href: string }>`

Simple `<ul>` of links (`ChevronRight` icon, `text-gray-700 hover:text-primary`), sourced from a static i18n/const list (`lib/static/types.ts` → `HELP_POPULAR_ARTICLES` built at the messages layer, **not** a `help_articles` DB table — see §0 scope note).

---

### 4.12 `<CookieConsentBanner>` / `<CookieConsentModal>` (client, global)

**Mounted once** in `app/[locale]/layout.tsx` (or a client provider it renders), **not** per-page — it must appear on every route, including ones outside this task's scope, without duplicating logic per page.

**State machine:**
```
no stored consent → banner visible
  [Accept all]      → { necessary: true, analytics: true,  marketing: true  } → persist → banner hidden
  [Necessary only]   → { necessary: true, analytics: false, marketing: false } → persist → banner hidden
  [Configure]         → opens CookieConsentModal
    toggle Analytics/Marketing, [Save preferences] → persist chosen combo → banner + modal hidden
stored consent exists → banner never renders; `/cookies` "Manage preferences" can reopen the modal
```

**Persistence:** `localStorage` key `cookie_consent` (constant in `lib/static/cookieConsent.ts`) storing `{ necessary: true, analytics: boolean, marketing: boolean, ts: number }`. Also mirror it to a first-party cookie (`cookie_consent=1`, non-httpOnly, `SameSite=Lax`, 12-month expiry) so a server component can read it via `cookies()` and avoid a hydration flash when deciding whether to render analytics `<Script>` tags. Fires `cookie_consent_set` and `cookie_banner_action` (§12).

**Gating non-necessary scripts:** any analytics/tracking `<Script>` (e.g. a future GA/Meta pixel tag) must be conditionally rendered only when `analytics`/`marketing` is `true` in the read consent state — **never mounted by default and toggled off**, since that still executes the initial load. This task doesn't add a real analytics vendor, but the gating mechanism (`useCookieConsent()` hook returning `{ analytics, marketing }`, consumed by a `<ConsentGatedScript category="analytics"><Script .../></ConsentGatedScript>` wrapper) must exist and be demonstrably wired so future scripts plug into it correctly — verified by code inspection per the acceptance criteria.

**Accessibility:** modal is a focus-trapped `Dialog`; **first-visit banner does not close on ESC or outside click** (a real choice must be made); switches are `role="switch" aria-checked`; Necessary switch is `disabled` and always checked, with a visible "Always on" label instead of a toggle affordance so it doesn't look interactive.

---

## 5. Page-by-page content spec

### 5.1 About (`/about`)
Breadcrumbs `Home › About us`. Sections: Hero (H1 + slogan) → Our story (narrative, 2–3 paragraphs) → Mission & values (`grid grid-cols-1 md:grid-cols-3 gap-6`, 3 value cards: icon `w-10 h-10 text-primary` + title + 1‑line description) → Statistics (3 counters: listings / cities / users — static numbers from messages, no live query in Phase 1; note them as illustrative, update via message file) → CTA row: **[List a property]** → `/sell/new` · **[Search properties]** → `/search` · **[Contact us]** → `/contact`. Team grid and Press/Partners sections are P1 — omit both in this build; leave a comment marking where they'd slot in if desired later.

### 5.2 Contact (`/contact`)
See §3.3/§3.4 and §4.4/§4.5/§4.6. Topic dropdown options: General / Support / Partnership / Complaint (values `general|support|partnership|complaint`, matches the API's `subject` enum).

### 5.3 FAQ (`/faq`)
See §3.5, §4.7–4.9. Categories: General · Buyers · Sellers · Rent · Account/Security · Pro (payments) — mirror this list exactly in `lib/static/types.ts` so `<FaqCategoryTabs>` and the Help card grid (§5.7) stay in sync. `?category=` query param pre-selects a tab on load (used by Help card links).

### 5.4 Terms of Service (`/terms`)
Breadcrumbs `Home › Terms of Service`. TOC + H2 sections in this order: Acceptance of terms · Account registration · User obligations · Prohibited content · Intellectual property · Limitation of liability · **Marketplace disclaimer** (the platform is not a party to any transaction between users) · Dispute resolution · Governing law · Changes to these terms. Inline links to `/privacy` and `/cookies` where the text references them (via `t.rich`). Governing-law text is written generically enough to not commit to one jurisdiction in Phase 1 (leave a `{country}` placeholder note for the future multi-country pass called out in the source doc as P2/P3 — do not build country switching now).

### 5.5 Privacy Policy (`/privacy`)
Breadcrumbs `Home › Privacy Policy`. TOC + H2 sections: What data we collect · How we use it · Cookies (links to `/cookies`) · Third parties (name Supabase, Mapbox explicitly; name "analytics" generically since none is wired yet) · Data retention · Your rights (access / delete / export) · Data security · Children's privacy · Contact for data protection. CTA: **[Manage my data]** → `/settings`.

### 5.6 Cookie Policy (`/cookies`)
Breadcrumbs `Home › Cookie Policy`. Sections: What cookies are · Types (necessary / analytics / marketing) · Third-party cookies · How to manage/disable. **Cookie table** (category × purpose × duration) — example rows the developer should adapt to what's actually set:

| Category | Cookie | Purpose | Duration |
|---|---|---|---|
| Necessary | `sb-access-token` / `sb-refresh-token` (Supabase auth) | Keeps you signed in | Session / 1 week |
| Necessary | `NEXT_LOCALE` | Remembers your language | 1 year |
| Necessary | `cookie_consent` | Remembers your cookie choice | 12 months |
| Analytics | *(none shipped yet — reserved)* | Usage analytics, once enabled | — |
| Marketing | *(none shipped yet — reserved)* | Ad personalization, once enabled | — |

**[Manage preferences]** button opens `<CookieConsentModal>` (§4.12, reopen mode).

### 5.7 Help Center (`/help`)
See §3.6, §4.10/§4.11. Category keys must match §5.3's FAQ category keys so cards route into pre-filtered FAQ tabs: Getting started→general, Account & security→account, Posting a listing→sellers, Search & favorites→buyers, Messages→general (or a dedicated tag if one exists in FAQ content), Pro/payments→pro. CTA: **[Contact us]** → `/contact`, plus a plain link to `/faq`.

---

## 6. Data model

### 6.1 i18n message shape (proposal, per locale file)

```jsonc
{
  "about": {
    "title": "About us",
    "slogan": "…",
    "story": ["paragraph 1", "paragraph 2"],
    "values": [{ "icon": "ShieldCheck", "title": "Trust", "body": "…" }, /* x3-4 */],
    "stats": [{ "value": "12,400", "label": "listings" }, /* x3 */]
  },
  "contact": {
    "title": "Contact us",
    "form": { "name": "Name", "email": "Email", "phone": "Phone", "subject": "Topic",
               "subjectOptions": { "general": "General", "support": "Support",
                                    "partnership": "Partnership", "complaint": "Complaint" },
               "message": "Message", "submit": "Send", "success": "Thank you, we'll get back to you soon",
               "error": "Something went wrong, try again", "rateLimited": "Too many requests, try again a little later" },
    "office": { "address": "…", "phone": "+374…", "email": "info@…", "hours": "Mon–Fri 09:00–18:00" }
  },
  "faq": {
    "title": "Frequently asked questions",
    "searchPlaceholder": "Search questions",
    "categories": { "all": "All", "general": "General", "buyers": "Buyers", "sellers": "Sellers",
                     "rent": "Rent", "account": "Account & security", "pro": "Pro" },
    "items": [
      { "slug": "how-do-i-list-a-property", "category": "sellers",
        "question": "How do I list a property?", "answer": "…", "link": "/sell/new" }
    ],
    "emptyState": "Nothing found for “{query}”"
  },
  "terms": { "title": "Terms of Service", "updatedAt": "2026-06-01",
             "sections": [{ "id": "acceptance", "heading": "Acceptance of terms", "body": "…" }, /* … */] },
  "privacy": { "title": "Privacy Policy", "updatedAt": "2026-06-01", "sections": [ /* … */ ] },
  "cookies": { "title": "Cookie Policy", "updatedAt": "2026-06-01", "sections": [ /* … */ ] },
  "help": {
    "title": "Help Center",
    "categories": [{ "key": "getting-started", "label": "Getting started", "faqCategoryKey": "general" }, /* … */],
    "popularArticles": [{ "title": "How do I reset my password?", "href": "/faq#how-do-i-reset-my-password" }]
  },
  "cookieConsent": {
    "banner": { "text": "We use cookies to improve your experience. See our Cookie Policy for details.",
                 "acceptAll": "Accept all", "necessaryOnly": "Necessary only", "configure": "Configure" },
    "modal": { "title": "Cookie preferences", "necessary": "Necessary", "necessaryBody": "…",
                 "analytics": "Analytics", "analyticsBody": "…", "marketing": "Marketing", "marketingBody": "…",
                 "save": "Save preferences", "alwaysOn": "Always on" }
  }
}
```

Keep `terms`/`privacy`/`cookies` section `id`s identical across all three locale files (only `heading`/`body` translate) — `<LegalToc>` and scroll-spy rely on stable ids.

### 6.2 `contact_messages` table (Supabase migration)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `name` | `text not null` | |
| `email` | `text not null` | |
| `phone` | `text` | nullable |
| `subject` | `text not null` | check constraint: one of `general/support/partnership/complaint` |
| `message` | `text not null` | |
| `locale` | `text not null` | `hy/ru/en`, for admin triage later |
| `status` | `text not null default 'new'` | `new/read/archived` — read/write only relevant to the future admin queue (Page 24); Phase 1 only ever writes `new` |
| `created_at` | `timestamptz not null default now()` | |

**RLS:** enabled; **one policy** — `insert` allowed for `anon` and `authenticated` roles with a `with check` that re-validates shape is sane at the DB layer too (defense in depth, e.g. `char_length(message) between 10 and 2000`); **no `select`/`update`/`delete` policy for anon/authenticated** at all (default-deny — the admin/service-role path for Page 24 is explicitly out of scope and will add its own policy later). The `POST /api/contact` route handler should use the **anon key** (RLS-governed insert) rather than the service-role key, since insert-only RLS already covers the need — reserve the service-role key for cases that truly require bypassing RLS.

---

## 7. API contract — `POST /api/contact`

```jsonc
// request
{ "name": "Mary", "email": "mary@b.am", "phone": "+374...", "subject": "partnership",
  "message": "Hi, ...", "website": "" }        // website = honeypot, must be empty

// 201
{ "ok": true }

// 400 (zod validation failure)
{ "error": "validation", "fields": { "email": "Invalid email address" } }

// 429 (rate limited — 3 requests / hour / IP, via lib/auth/rateLimit.ts LIMITS.CONTACT)
{ "error": "rate_limited" }

// 500
{ "error": "server_error" }
```

**Zod schema** (`lib/static/contactSchema.ts`, imported by both the client form and the route handler so validation can never drift):

```ts
export const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(PHONE_REGEX, 'Invalid phone number').optional().or(z.literal('')),
  subject: z.enum(['general', 'support', 'partnership', 'complaint']),
  message: z.string().min(10, 'Message is too short').max(2000),
  website: z.string().max(0).optional(), // honeypot
})
```

**Route handler behavior:**
1. Parse + validate body with `contactSchema` → 400 with field errors on failure.
2. If `website` is non-empty → silently return `201 { ok: true }` (don't tip off bots that they were caught) but **skip** the DB insert/email.
3. Rate-limit by IP (`request.headers.get('x-forwarded-for')` or the platform's equivalent) using `checkRateLimit('contact:' + ip, LIMITS.CONTACT.max, LIMITS.CONTACT.windowMs)` → 429 when exceeded.
4. Insert into `contact_messages` via the Supabase server client (anon key, RLS-governed).
5. Send a notification email via the project's existing email provider **if one is already wired up elsewhere in the codebase** (check `lib/` for an existing mailer before adding a new dependency); otherwise `console.error`-free **structured server log** (not `console.log` — use whatever logging the codebase already has, or a minimal one-line `console.info` is acceptable only if that's the existing convention elsewhere; prefer matching existing patterns over introducing a new one) noting a message was received, with no PII beyond what's already in the DB row.
6. Return `201 { ok: true }`.

---

## 8. JSON‑LD structured data

**`BreadcrumbList`** — inject on all 7 pages, e.g. for `/faq`:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://site.com/en" },
    { "@type": "ListItem", "position": 2, "name": "Frequently asked questions" }
  ]
}
```

**`FAQPage`** — `/faq` only, generated from the same `faq.items` used to render the accordion:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "How do I list a property?",
      "acceptedAnswer": { "@type": "Answer", "text": "Go to Dashboard → ..." } }
  ]
}
```

**`Organization` + `LocalBusiness`** — `/about` and `/contact`:
```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "name": "RealtAM", "url": "https://site.com",
      "logo": "https://site.com/logo.png",
      "contactPoint": { "@type": "ContactPoint", "telephone": "+374...", "contactType": "customer service" },
      "sameAs": ["https://facebook.com/...", "https://instagram.com/...", "https://t.me/..."] },
    { "@type": "LocalBusiness", "name": "RealtAM", "address": { "@type": "PostalAddress", "streetAddress": "...", "addressLocality": "Yerevan", "addressCountry": "AM" },
      "geo": { "@type": "GeoCoordinates", "latitude": 40.18, "longitude": 44.51 } }
  ]
}
```

All four render via a shared `<JsonLd data={...} />` server component (`<script type="application/ld+json">{JSON.stringify(data)}</script>`) — one such component, reused, not four bespoke implementations.

---

## 9. Page states

| State | What renders |
|---|---|
| Loaded (content pages) | SSR prose + TOC (legal) |
| Contact idle | Empty form |
| Contact submitting | Spinner + disabled button/inputs |
| Contact success | Success banner (`role="status"`) + form reset |
| Contact validation error | Inline field errors, focus on first invalid |
| Contact rate-limited | Banner "Too many requests…" (`role="alert"`) |
| Contact server error | Banner "Something went wrong…" (`role="alert"`) |
| FAQ/Help empty search | "Nothing found for “{q}”" + [Contact us] |
| Cookie pre-consent | Banner visible; no analytics/marketing script mounted |
| Cookie consent set | Banner hidden; choice persisted (localStorage + cookie) |
| Untranslated message key | Falls back to `en`; `hreflang` only emitted for locales that actually resolve |
| 404 (unknown static slug — shouldn't occur, these are fixed routes) | Standard Next.js not-found |

---

## 10. SEO meta (per page, per locale)

Follow the exact `generateMetadata` pattern already used in `app/[locale]/property/[id]/[slug]/page.tsx` (canonical + `alternates.languages` for hy/ru/en, OG block). Example for `/faq`:

```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'faq' })
  return {
    title: `${t('title')} | RealtAM`,
    description: t('metaDescription'), // separate short key, ≤155 chars, not the full page copy
    alternates: {
      canonical: `/${locale}/faq`,
      languages: { hy: '/hy/faq', ru: '/ru/faq', en: '/en/faq' },
    },
    openGraph: { title: t('title'), description: t('metaDescription'), type: 'website' },
  }
}
```
Add a `metaDescription` key alongside `title` in every one of the 7 namespaces (§6.1) — don't reuse body copy that overflows 155 chars.

---

## 11. Accessibility checklist

- [ ] Every form input has a `<label for>`, `aria-required` on required fields, `aria-invalid` + `aria-describedby` pointing at its error `id` when invalid.
- [ ] Form submit success/error surfaces use `role="status"` (success) / `role="alert"` (error) so screen readers announce them.
- [ ] Accordion: `aria-expanded` on trigger, Enter/Space toggles, ↑/↓ moves focus between triggers (shadcn default — verify).
- [ ] `<LegalToc>`: `<nav aria-label="Table of contents">`, active link `aria-current="location"`.
- [ ] Cookie banner buttons are keyboard-reachable and are the first focusable elements when the banner appears (a one-time focus move is acceptable; don't steal focus on every re-render); modal traps focus; switches expose `aria-checked`; Necessary switch communicates "always on" without looking like a functioning disabled toggle only (also has adjacent text).
- [ ] Map: `aria-label="Office location map"` + visible "Open in Google Maps" link as the accessible/no-JS fallback.
- [ ] Color contrast ≥ 4.5:1 for all body text; touch targets ≥ 44px (buttons `h-11`/`h-12`).
- [ ] Full keyboard traversal of each page (Tab order matches visual order; no keyboard traps outside the intentional cookie-modal trap).

---

## 12. Analytics events

| Event | Trigger | Payload |
|---|---|---|
| `static_page_view` | Page mount | `{ page: 'about'\|'contact'\|'faq'\|'terms'\|'privacy'\|'cookies'\|'help' }` |
| `contact_submitted` | 201 response | `{ subject }` |
| `contact_error` | 400/429/500 response | `{ reason }` |
| `faq_search` | Debounced search input change | `{ query, results_count }` |
| `faq_expand` | Accordion item opens | `{ faq_id, category }` |
| `faq_category_tab` | Tab switch | `{ category }` |
| `help_article_click` | Category card / popular article click | `{ slug, category }` |
| `contact_channel_click` | `tel:`/`mailto:` link click | `{ channel: 'phone'\|'email' }` |
| `cookie_consent_set` | Consent persisted (any path) | `{ analytics, marketing }` |
| `cookie_banner_action` | Banner button click | `{ action: 'accept_all'\|'necessary'\|'configure' }` |

Reuse whatever analytics dispatch helper already exists in the codebase (check `lib/` before adding a new one); if none exists yet, a minimal `lib/analytics/track.ts` with a single `track(event, payload)` that gates on cookie consent for non-essential events is in scope — but keep it to a thin, typed wrapper, not a vendor integration.

---

## 13. Responsive breakpoints summary

| Breakpoint | Legal | Contact | FAQ | Help | Cookie banner |
|---|---|---|---|---|---|
| `<768px` (sm) | 1-col, TOC collapsible (`<details>`) | Form → Info → Map stacked | Tabs scroll-x, search full-width | Cards 2-col | Fixed bottom, buttons stacked |
| `768–1023px` (md) | 1-col, TOC collapsible | Stacked (same as sm) | Tabs scroll-x | Cards 2-col | Fixed bottom, buttons inline |
| `≥1024px` (lg) | 2-col: sticky TOC + prose | 2-col: form + info/map | Tabs full row | Cards 3-col | Fixed bottom, buttons inline |

---

## 14. Testing notes (for the developer, not exhaustive)

- **`lib/static/contactSchema.ts`** — unit tests for: valid payload passes; missing/short `name`; invalid `email`; bad `phone` format; `subject` outside the enum; `message` too short/long; non-empty `website` (honeypot) fails.
- **`lib/static/faqHelpers.ts`** (`filterFaqItems`) — unit tests for: query matches question text; query matches answer text; case-insensitivity; category filter alone; query + category combined; no matches → empty array.
- **`app/api/contact/route.ts`** — route test(s) covering: 201 on valid payload; 400 on invalid payload with field-level errors; 429 after exceeding the rate limit within the window; honeypot-filled request still returns 201 but does not create a `contact_messages` row (mock/spy the Supabase insert call).
- Component-level tests for `<FaqAccordion>` deep-link behavior and `<CookieConsentBanner>` gating are valuable but lower priority than the three above if time is constrained.

---

## 15. Out of scope (explicit)

- Admin moderation queue for `contact_messages` (Page 24).
- Any CMS/editor UI for legal or FAQ/Help content.
- `/help/[slug]` article detail pages or an `Article` JSON‑LD type.
- Captcha vendor integration (honeypot only, Phase 1).
- Multi-country governing-law variants on `/terms`.
- Legal-text version archive/diffing.
- Any change to pages 09, 21, 22, or any other existing route.

---

*End of Static / Legal Pages Design Spec v1.0*
