# Page 15 — Blog / News & Insights (News) 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO (extended), analytics.

**URL.** `/news` (index) · `/news/[slug]` (article) · `/news/category/[category]` (category) — e.g. `/hy/news/yerevan-shuka-2026-trendner`
**Roles.** Everyone (Guest, User, Agent, Admin) can view; newsletter signup via email; articles are created and published through the Admin CMS (see `24-admin.md`).
**Primary goal.** Organic SEO traffic from Google + brand trust (E-E-A-T). Secondary: newsletter capture and internal funnel toward search/guides/property pages.

---

## 0. Overview

The blog is the site's **main driver of organic traffic**. Property pages convert the already-interested visitor, whereas the blog **brings in new visitors** from Google via searches like "Yerevan apartment prices 2026" or "how to rent an apartment" and channels them into the funnel. Therefore every article must: (1) render fast via SSR (Google crawl + LCP), (2) have flawless structured data and meta (rich results), (3) guide visitors through internal links toward search/guides/neighborhood pages.

**Difference from Guides (`16-guides.md`).** Blog = **timely news** (dated, quickly outdated — market news, trends, seasonal advice). Guides = **evergreen** (deep, step-by-step, relevant for months). Same CMS engine, different entities and schema.

The page has **two templates**.
- **Blog Index** (`/news`) — featured hero + category filter + search + card grid + pagination + newsletter.
- **Article Page** (`/news/[slug]`) — header + cover + TOC + body + share + author bio + related + newsletter.

Both render via **SSR** (Server Component); the interactive parts (TOC scroll-spy, share, newsletter form, search) are client components.

---

## 1. User scenarios

**Scenario A — Ani arriving from Google (mobile).** Ani searched Google for "Yerevan apartment price 2026" and tapped on our article. The page opens on her phone: cover image, title, "6 min read". She reads, and as she scrolls the progress bar at the top fills up. Halfway through she encounters an inline CTA "See active listings in Arabkir ▸" → she taps it and lands on `/search?district=Arabkir`. → The funnel worked (`article_internal_link_click`).

**Scenario B — Returning visitor Suren (desktop).** On `/news`, Suren clicks the **"Financing"** category chip; the list filters and the URL becomes `/news/category/financing`. He reads 2 articles, then enters his email in the newsletter banner at the bottom and clicks **"Subscribe"** → toast "Check your inbox to confirm" (double opt-in). → `newsletter_subscribe` event.

**Scenario C — Editor Lilit (Admin).** In the CMS, Lilit writes a new article in Armenian, then the ru/en translations. She publishes it with a `published_at`. The article automatically appears at the top of the index, is included in `sitemap.xml`, and the `hreflang` tags are linked across the 3 languages. The en version isn't translated yet → `/en/news/[slug]` shows the hy fallback + a badge, and `hreflang en` is not set.

---

## 2. Layout & visual structure

### Blog Index — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10) · Home › News                           │
│ H1 «News & Insights» (text-3xl)                            │
│ Subtitle (text-gray-500, max-w-2xl)                        │
├────────────────────────────────────────────────────────────┤
│ ┌──── FEATURED HERO (full-width, h-[420px]) ──────────────┐ │
│ │ cover image + gradient overlay                          │ │
│ │ [Market] badge · H2 title · excerpt · author · date     │ │
│ └─────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ [All][Buying][Selling][Rent][Finance][Market][News]  🔍 __ │
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
│ Breadcrumbs · Home › News › Market › Title                  │
├──────────┬──────────────────────────────────┬──────────────┤
│ ► SHARE  │ ◄ ARTICLE (max-w-[720px])         │ ► TOC        │
│ (sticky) │ [Market] badge                    │ (sticky      │
│ FB       │ H1 (text-4xl)                     │  top-24)     │
│ TG       │ author · date · 6 min · updated   │ • Section 1  │
│ WA       │ ┌── cover h-[420px] rounded-xl ──┐│ • Section 2  │
│ X        │ └────────────────────────────────┘│ • Section 3  │
│ 🔗       │ Body (prose)…                     │ (scroll-spy) │
│          │  inline CTA cards…                │              │
│          │ ── Author bio ──                  │              │
├──────────┴──────────────────────────────────┴──────────────┤
│ NEWSLETTER (inline)                                         │
│ ── Read also (related, 3 cards) ──                         │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ HEADER (h-14)            │   │ progress bar (fixed)     │
├──────────────────────────┤   │ HEADER                   │
│ H1                       │   ├──────────────────────────┤
│ FEATURED (h-[240px])     │   │ ‹ Back                   │
│ [chips scroll-x →]       │   │ [Market] badge           │
│ 🔍 search (full-width)   │   │ H1 (text-2xl)            │
│ ┌──card (1-col)──┐       │   │ author · date · 6 min    │
│ │ img            │       │   │ cover (full-bleed)       │
│ │ title · meta   │       │   │ ▾ Table of contents (acc.)│
│ └────────────────┘       │   │ Body…                    │
│ … cards stack …          │   │ [share row]              │
│ NEWSLETTER               │   │ author bio · newsletter  │
│ [Load more]              │   │ Read also (scroll-x)     │
│ FOOTER                   │   │ FOOTER                   │
└──────────────────────────┘   └──────────────────────────┘
```

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 (index) | `text-3xl font-bold text-gray-900` |
| H1 (article) | `text-4xl font-bold leading-tight` (mobile: `text-2xl`) |
| Subtitle | `text-base text-gray-500 max-w-2xl` |
| Category badge | `bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full` |
| Card | `shadow-sm border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition` |
| Card cover | `aspect-[16/9] object-cover` |
| Card title | `text-lg font-semibold text-gray-900 line-clamp-2` |
| Card excerpt | `text-sm text-gray-600 line-clamp-2` |
| Meta row | `text-xs text-gray-400 flex items-center gap-2` |
| Active chip | `bg-primary text-white` (idle: `bg-gray-100 text-gray-700 hover:bg-gray-200`) |
| Featured overlay | `bg-gradient-to-t from-black/70 to-transparent` |
| Body prose | `prose prose-gray max-w-none prose-a:text-primary prose-img:rounded-xl` |
| TOC active | `text-primary font-medium border-l-2 border-primary pl-3` |
| Progress bar | `fixed top-0 h-1 bg-primary z-50 transition-[width]` |
| Newsletter banner | `bg-primary/5 border border-primary/15 rounded-2xl p-6` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Breadcrumbs

- **Appearance.** `text-sm text-gray-500`, separator `›`, hover: `text-primary underline`. Rendered with `BreadcrumbList` structured data.
- **Index.** `Home › News`. **Article.** `Home › News › Market › 2 senyak…`.
- **Mobile.** Only a `‹ Back` link (to `/news`).

### 3.2 Featured hero (index only)

- **Data.** `blog_posts WHERE is_featured = true ORDER BY published_at DESC LIMIT 1`; if no featured post exists, the most recent article.
- **Appearance.** Full-width `h-[420px] rounded-2xl`, cover + gradient overlay, bottom-left: badge + H2 (`text-2xl text-white font-bold`) + excerpt + author avatar + date.
- **Behavior.** The entire block is clickable → `/news/[slug]`. On hover the cover scales `scale-105` (`transition`).
- **Mobile.** `h-[240px]`, excerpt hidden, only badge + title.

### 3.3 Category filter (chips)

- **Categories.** `All · Buying · Selling · Rent · Financing · Market trends · News`. Internal values: `all/buying/selling/renting/financing/market/news`.
- **Appearance.** Horizontal row (`flex gap-2 flex-wrap`), mobile: `overflow-x-auto` scroll. Active chip: primary fill.
- **Behavior (important for SEO).** Click → **navigate** to `/news/category/[category]` (a separate crawlable URL), not just a client-side filter. "All" → `/news`. The filtered list is rendered via SSR.

### 3.4 Search box

- **Appearance.** `🔍` icon + input (`h-11 rounded-lg border`), placeholder "Search articles…".
- **Behavior.** Enter/submit → `/news?search=[q]` (SSR full-text search across the `title` + `body` field for the selected language). 300ms debounce for suggestions (optional).
- **Empty state.** "Nothing found for «{q}»" + 3 suggested articles + "Clear search".

### 3.5 Article cards grid

- **Layout.** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
- **Card content.** cover (`aspect-[16/9]`) · category badge (on the cover, `absolute top-3 left-3`) · title (`line-clamp-2`) · excerpt (`line-clamp-2`) · author avatar+name · "·" · date · "·" · "5 min read".
- **Behavior.** The entire card is clickable → `/news/[slug]`. On hover: `shadow-md`, title turns `text-primary`.
- **Data.** `GET /api/news?category=&search=&page=&lang=`.

### 3.6 Pagination

- **Appearance.** Centered `‹ 1 2 3 … 8 ›`, active: `bg-primary text-white rounded-md`.
- **Behavior (SEO).** Real `?page=N` URLs (SSR), not pure infinite scroll. Mobile: a "Load more" button (but the `rel=next/prev` links remain in the head).
- **Edge.** Page > max → 404 or redirect to the last page.

### 3.7 Article header & cover (article)

- **Category badge** clickable → category page.
- **H1** (`text-4xl`): `title[locale]`.
- **Meta row.** author avatar + name (clickable → `/news/author/[id]`) · 📅 published · "6 min read" · "Updated [date]" (if `updated_at > published_at`).
- **Cover.** `next/image priority` (LCP), `h-[420px] rounded-xl`, alt = title (SEO).

### 3.8 Table of contents (TOC)

- **Generation.** Auto: from the body's H2/H3 (slugified anchors).
- **Desktop.** Sticky right sidebar (`top-24`), scroll-spy highlights the active section (IntersectionObserver).
- **Mobile.** Collapsible accordion "▾ Table of contents" (after the cover).
- **Behavior.** Click anchor → smooth scroll + URL hash update.

### 3.9 Share buttons

- **Appearance.** Desktop: sticky left rail (`flex-col gap-2`); mobile: horizontal row after the body.
- **Channels.** Facebook · Telegram · WhatsApp · X · 🔗 Copy · Email (`mailto:`).
- **Behavior.** Click → share intent URL in a new tab; 🔗 → `navigator.clipboard` + toast "Link copied".

### 3.10 Article body

- **Render.** Rich content from the CMS (sanitized HTML / MDX): paragraphs, H2/H3, images (alt + lazy), quotes, lists, embedded video (lazy iframe), **inline CTA cards**, and internal links to property/guides/neighborhood (SEO funnel).
- **Inline CTA card.** A block embedded within the body: "📍 See active listings in Arabkir" + button → `/search?district=Arabkir` (`article_internal_link_click`).
- **Language.** `body[locale]`; missing translation → fallback to default + badge "Available in Armenian only".

### 3.11 Author bio · Newsletter · Related

- **Author bio.** A card at the end of the body: avatar · name · credentials/bio (E-E-A-T) · "See all articles" → author page.
- **Newsletter (inline).** Email input + **[Subscribe]** → `POST /api/newsletter/subscribe` (double opt-in). Success toast "Check your inbox to confirm". Edge: already a subscriber → "You are already subscribed".
- **Related.** "Read also" — 3-4 cards from the same category/tags → `GET /api/news/[slug]/related`.

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading (index)** | Featured skeleton + 6 card skeletons (shimmer) |
| **Loading (article)** | Title bar + cover block + 6 prose line skeletons |
| **Loaded** | Full index / article |
| **Empty (search/category)** | "Nothing found" + suggested articles + "Clear" |
| **Draft / unpublished** | 404 for the public; preview banner for Admin "Draft — unpublished" |
| **Untranslated** | hy/default fallback + badge "Available in Armenian only"; `hreflang` not set |
| **404 (bad slug)** | "Article not found" + [Go to news] |
| **Old slug** | 301 redirect to new slug |
| **Error (API fail)** | "Something went wrong" + [Try again] |
| **Broken cover** | Placeholder gradient + badge |

---

## 5. Technical depth

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

### Data fields used (`blog_posts` — see 00-SPEC §7)

`id, slug, title{hy,ru,en}, excerpt{hy,ru,en}, body{hy,ru,en}, cover, category, author_id, is_featured, published_at, updated_at, reading_time` + `author{id, name, avatar, bio, credentials}`

### API contracts

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
// 301 → Location: /news/<new-slug>  (slug changed)
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
  // honeypot — must stay empty
  website: z.string().max(0).optional(),
});
```

- Newsletter: rate-limit (3/h/IP) + honeypot + double opt-in (confirm token via email).
- Article body: server-side sanitize (XSS) for the CMS HTML.
- Search query: trim + max 100 chars, SQL escape (parameterized).

---

## 6. Responsive

- **≥1024px (lg).** Index: 3-column grid, full-width featured. Article: three-part (share rail + body + TOC), sticky TOC `top-24`.
- **768–1023px (md).** Index: 2-column grid. Article: body + collapsible TOC (rail hidden, share after the body).
- **<768px (sm).** Index: 1-column, chips horizontal scroll, "Load more". Article: progress bar, `‹ Back`, accordion TOC, full-bleed cover, share row after the body.

---

## 7. Accessibility

- Cover/body images: meaningful `alt` (not empty). Decorative: `alt=""`.
- Category chips: `role="tablist"`/links, the active one `aria-current="page"`.
- TOC: `<nav aria-label="Table of contents">`, scroll-spy active one `aria-current`.
- Reading progress bar: `role="progressbar"` + `aria-valuenow`.
- Share buttons: `aria-label` ("Share on Facebook"). Toast: `role="status"`.
- Body prose: correct heading hierarchy (H1 → H2 → H3, no skipping). Contrast ≥ 4.5:1, touch target ≥ 44px.

---

## 8. SEO & meta (extended — content page)

- **`<title>`** = unique per article (editable from the CMS, in the selected language), fallback: "{title} | {brand} News". Index: "Real estate news and insights | {brand}".
- **`<meta name="description">`** = from the excerpt or a manual CMS field (≤ 155 chars).
- **Structured data (JSON-LD).** Article: `NewsArticle` (`headline`, `image`, `datePublished`, `dateModified`, `author{Person}`, `publisher{Organization, logo}`, `mainEntityOfPage`) + `BreadcrumbList`. Index: `Blog` + `BreadcrumbList`.
- **`hreflang`** per language (hy/ru/en) + `x-default`, **only on existing** translations (from `availableLocales`).
- **`canonical`** on every page (by slug); category/search/page variants: correct canonical/pagination (`rel=next/prev`).
- **OG / Twitter Card.** `og:type=article`, cover + title + excerpt; `twitter:card=summary_large_image`. Dynamic OG: `/api/og?type=news&slug=…`.
- **Sitemap.xml.** Auto-includes only published articles; `lastmod = updated_at`; news sitemap (Google News) for fresh articles (Phase 3).
- **SSR** of the entire body (not client-only): for crawling.
- **Internal linking.** Inline links in the body + related + category cross-links → topical authority.
- **E-E-A-T.** Author bio + credentials + visible `datePublished`/`dateModified` + sources/citations in the body.
- **Draft/sold(deleted).** Unpublished → `noindex` + 404; old slug → 301 (to not lose SEO juice).

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
