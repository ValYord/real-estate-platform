# Page 15 — Blog / News Index + Article (`/news`): Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/15-blog.md`](../en/pages/15-blog.md) (deep spec: full
Blog Index + Article templates, TOC scroll-spy, reading-progress bar,
double opt-in newsletter, `GET /api/news/[slug]/related` as a standalone
endpoint, Google News sitemap, analytics events, admin CMS in Page 24). This
document does **not** repeat that spec in full; it exists to pin down the
**MVP scope** for the current task and to close the gap between the generic
spec and *this specific codebase*.

Audited against the current tree: `app/[locale]/search/page.tsx`,
`app/[locale]/property/[id]/[slug]/page.tsx` and `app/[locale]/agent/[slug]/page.tsx`
(the three "SSR page.tsx self-fetches its own internal `/api/*` route"
shell patterns — `generateMetadata` + conditional `alternates.languages`,
`@graph` JSON-LD via `<script type="application/ld+json">`, `notFound()` on
missing/unpublished, `safeLocale()` from `lib/locale.ts`), `docs/design/17-pricing-handoff.md`
D2/D3 (the newer "query Supabase directly in the Server Component, no
internal API hop" alternative — not used here, see D2 below for why),
`app/api/favorites/route.ts` and `app/api/agent-leads/route.ts` (the
JSON-parse guard → zod guard → session/rate-limit guard → typed-response
route-handler shape and honeypot pattern — mirrored exactly for
`POST /api/newsletter/subscribe`), `lib/auth/rateLimit.ts` (`checkRateLimit(key,
max, windowMs)` + `LIMITS` presets, IP-keyed for pre-auth endpoints — see
`HOME_VALUE_ESTIMATE`), `supabase/migrations/0009_plans.sql` and
`supabase/migrations/0010_home_value_estimates.sql` (RLS + idempotent-migration
style, and the "documented RLS check" static-regex test convention in
`__tests__/homeValueMigration.test.ts`, mirrored for `blogMigration.test.ts`),
`supabase/seed.sql` (the `DO $$ ... $$` dev-only demo-data convention — used
here for sample posts instead of migration-embedded seed, see D1), `types/database.ts`
(`Json`, `UserTier`-style enum aliases, `plans`/`home_value_estimates` Row/Insert/Update
shape to mirror for `blog_posts`/`newsletter_subscribers`), `lib/property/types.ts`
+ `components/property/PropertyDescription.tsx` (the `{ hy?, ru?, en? }`
per-locale JSONB content shape with a `text[locale] ?? text.en ?? text.hy ?? text.ru`
fallback chain — the same shape `blog_posts.title/excerpt/body` uses),
`components/property/Breadcrumbs.tsx` (reused as-is, no new breadcrumb
component needed), `components/search/ListingsPanel.tsx` (button-based
client-fetch pagination — **not** reused, see D5: this page needs
link-based SSR pagination instead), `messages/en.json` + `i18n/request.ts`
(confirmed only `messages/*.json` at repo root is live) and
`components/layout/Header.tsx` (`nav.newsGuides` **already** links "News" →
`/news` — no header edit needed, see D8), `middleware.ts` /
`lib/auth/protectedPaths.ts` (`/news` is not, and must not be added to,
`PROTECTED_PATHS` — fully public, matches "Everyone" in the roles line),
`vitest.config.ts` (`environment: 'node'`, no DOM/RTL — tests target
`lib/` pure functions, route handlers, and the migration-shape check only).

---

## 0. MVP scope for this task (read before building)

Build exactly the "In scope" list below. Everything else in the generic
page-spec is **explicitly deferred** — see §10.

**In scope:**
- `/[locale]/news` — SSR index: featured hero + category chips + search form
  + card grid + pagination + newsletter banner (§2–§4).
- `/[locale]/news/category/[category]` — same index template, filtered to one
  category via a real path segment (crawlable URL), not a query param (§1 D3).
- `/[locale]/news/[slug]` — SSR article: header + cover + TOC (static, no
  scroll-spy) + body + share row + author bio + newsletter banner + related
  posts, with `NewsArticle` + `BreadcrumbList` JSON-LD (§5, §8).
- `blog_posts` table (migration + RLS: public can read only published rows;
  no write policy — service-role only, Page 24's concern) + a handful of
  seed posts for local/dev/demo via `supabase/seed.sql` (§5.1, D1).
- `newsletter_subscribers` table (migration + RLS: anon/authenticated can
  insert, nobody can read back) + `NewsletterForm` client component + `POST
  /api/newsletter/subscribe` (zod-validated, rate-limited, honeypot) (§5.4).
- `GET /api/news` (list, paginated, category + search + locale query params)
  and `GET /api/news/[slug]` (detail + embedded related posts) — internal
  routes the two page shells self-fetch, same pattern as `/api/properties`
  and `/api/agents/[slug]` (§1 D2).
- Basic SEO per page: `<title>`, meta description, canonical, conditional
  hreflang (only for locales the post actually has content in, §8).

**Explicitly out of scope for this task (do not build):** reading-progress
bar, TOC scroll-spy (`IntersectionObserver`), double opt-in / confirmation
email, real ESP integration (Mailchimp/SendGrid/etc.), `GET
/api/news/[slug]/related` as a *standalone* route (related posts are
embedded in the detail response instead, §1 D6), admin CMS editor (Page 24),
comments, author profile pages (`/news/author/[id]`), `sitemap.xml` /
Google News sitemap, dynamic OG image generation (`/api/og`), analytics
event wiring, full-text search over `body` (search scans `title` +
`excerpt` only, §1 D4).

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Task brief: "seed a few sample posts via the migration or a seed script for local/dev/demo purposes only." `0009_plans.sql` seeded its reference rows **inside** the migration itself. | Seed sample `blog_posts` rows in **`supabase/seed.sql`** (the existing `DO $$ ... $$` dev-only block, alongside the notifications seed), **not** inside `supabase/migrations/0011_blog.sql`. | `plans` is universal reference/config data needed in every environment including production (real tier pricing). Sample blog posts are demo content explicitly scoped "local/dev/demo purposes only" by the task brief — `seed.sql` is this repo's documented mechanism for exactly that (its own header comment says "never run against a hosted/production project"), whereas a migration runs everywhere forever. Keep `lib/blog/defaultPosts.ts` (§5.3, the Supabase-unconfigured fallback) as the single source of truth both files transcribe, same as `lib/plans/defaultPlans.ts` ↔ `0009_plans.sql`'s seed. |
| D2 | Newer precedent (`docs/design/17-pricing-handoff.md` D2/D3) has `page.tsx` query Supabase directly, skipping an internal API route. Older precedent (`search`, `property/[id]/[slug]`, `agent/[slug]`) has `page.tsx` `fetch()` its own `/api/*` route. | Follow the **older, more common** pattern: `GET /api/news` and `GET /api/news/[slug]` are real internal route handlers; `page.tsx` calls them with `fetch(..., { next: { revalidate: 60 } })` (index/category) or `{ cache: 'no-store' }` (article, so `published_at`/`updated_at` edits show immediately, mirroring `property/[id]/[slug]/page.tsx`'s "always fresh" comment). | Pricing's direct-Supabase-read was justified there specifically because the page needed **auth-aware** data (`profiles.tier`) alongside catalog data in one pass. `/news` has no such per-user personalization — it's the same "public catalog list + public catalog detail" shape as `/search` and `/property`, so the majority precedent applies, keeping the API routes reusable (e.g. a future related-posts widget elsewhere in the site can hit `/api/news` without duplicating query logic). |
| D3 | Task brief's one-line index bullet says "category filter (query param driven, server-rendered)"; the deep spec (`15-blog.md` §3.3) and the task's own **Routes** line both explicitly require `/news/category/[category]` as "a separate crawlable URL, not just a client-side filter." | Category filtering is a **path segment** (`/news/category/[category]`), not a `?category=` query param. The phrase "query param driven" in the brief is read as shorthand for "URL-driven, not client-state-driven" (as opposed to a `useState`-only filter with no URL change) — the concrete route is the one enumerated in the task's own Routes list and the full spec. `/news` itself only accepts `?search=` and `?page=`. | Resolves the one internal inconsistency in the brief in favor of the two places that agree with each other (Routes list + full spec §3.3's explicit "important for SEO" callout) and against a one-line paraphrase in the scope bullet. A segment-based category URL is unambiguously more crawlable/shareable than a query param — the stated goal of that acceptance criterion either way. |
| D4 | Full spec: "SSR full-text search across the `title` + `body` field for the selected language." | Search (`?search=`) runs `ilike` against `title->>locale` **and** `excerpt->>locale` only, not `body`. | `body` is full article HTML (largest column, most expensive `ilike` scan, and matches would need to strip tags to be meaningful). `excerpt` is a short human-written summary that already carries the article's key terms for a small MVP corpus. Documented here as a explicit, intentional scope cut — full-text search across `body` (ideally via a `tsvector` generated column + GIN index) is a good Phase 2 follow-up, not this task. |
| D5 | `components/search/ListingsPanel.tsx`'s pagination is `<button onClick={onPageChange}>` driven by client-side React Query state — the established in-repo pagination component. | **Do not reuse it.** Build `components/news/NewsPagination.tsx` as a Server Component rendering plain `<Link href="/news?page=N">` (or `/news/category/x?page=N`) elements — real anchors, no client JS, no `onClick`. | The acceptance criteria requires pagination "via URL query/segment, not client-only state, so pages remain crawlable/shareable" — `ListingsPanel`'s model is a client SPA re-fetch on a single URL (`/search` never changes its own address bar per page), which is exactly the anti-pattern the acceptance criteria rules out for this page. `/news` is a full SSR page-load-per-page site, matching how Google actually crawls a paginated blog index. |
| D6 | Full spec: `GET /api/news/[slug]/related` is a separate endpoint, fetched client-side via "React Query" in `<RelatedArticles>`. | `GET /api/news/[slug]` returns the detail **and** an embedded `relatedPosts: BlogPostCard[]` (max 4, same category, most recent, excluding self) in one response. `RelatedArticles` is a plain Server Component that receives `relatedPosts` as a prop — no client fetch, no React Query (not a dependency in this repo; `package.json` has no `@tanstack/react-query`). | This MVP's article page is 100% SSR with no client-side re-fetching need for related posts (they don't change without a full page navigation anyway). One query on the server avoids a second network round-trip the browser would otherwise have to make, and avoids introducing a data-fetching library this repo doesn't already use. |
| D7 | Full spec: newsletter signup is "double opt-in" — `202 { status: 'pending_confirmation' }`, confirmation email, a later token-verify endpoint. | Task brief for this task explicitly narrows it: "do not wire a real ESP integration, just persist + confirmation UI." `POST /api/newsletter/subscribe` inserts the row directly and returns `201 { subscribed: true }` (or `409 { error: 'already_subscribed' }` if the email already exists) — no token, no second endpoint, no "pending" state. | Matches the task's own explicit instruction. A double-opt-in flow needs an outbound email sender, which is the real-ESP-integration this task is told **not** to build; a stub "pending_confirmation" status that never actually gets confirmed would be a fake affordance, worse than an honest immediate-success message. |
| D8 | Full spec assumes the page is reachable from primary nav. | **No `Header.tsx`/`Footer.tsx` edit needed.** `components/layout/Header.tsx`'s `NAV_ITEMS` already has a `newsGuides` mega-menu entry whose first link is `{ label: 'News', href: '/news' }` (lines ~76–81) — this task fills in a real, working page behind an already-existing link. The mega-menu's other links (`/news/insights`, `/news/videos`) point to pages **outside** this task's scope; leave them as-is (they 404 today and continue to until their own tasks ship — not a regression this task introduces). | Zero-risk: the page becomes reachable the moment it's deployed, with no change to shared chrome. |
| D9 | Full spec's card/related/index responses assume server-resolved, locale-specific strings (e.g. `"title": "Երևանի շուկայի..."`, a single string). Existing precedent (`PropertyListItem.title`, `AgentProfile.bio`) returns the **full** `{ hy?, ru?, en? }` object and resolves it at render time. | `/api/news` and `/api/news/[slug]` return the full `title`/`excerpt`/`body` JSONB objects (all populated locale keys), **not** a single pre-resolved string. Locale resolution happens in the rendering component via the same `text[locale] ?? text.en ?? text.hy ?? text.ru` chain as `PropertyDescription.tsx`. A `locale=` query param is still accepted by `GET /api/news`, but only to scope the `ilike` search match (§1 D4) — not to shape the response. | Consistency with every other content entity in this codebase (`properties`, `agents`) beats consistency with the generic spec's illustrative JSON, which was written narrowly for one locale. Returning the full object also means the exact same API response can render any of the three locale routes without a re-fetch, and lets the "Available in Armenian only" fallback badge (§3) be computed client/server-side from which keys are actually present. |
| D10 | No sanitizer (`isomorphic-dompurify` or similar) is a dependency in this repo, and this task adds **no** write path for `body` HTML — only seed SQL (developer-authored, trusted) and, later, Page 24's admin CMS. | Render `body[locale]` via `dangerouslySetInnerHTML` **without** adding a new sanitization dependency in this task. | Adding a sanitizer now, unasked, for a write path that doesn't exist yet in this codebase would be scope creep. **Flag prominently for Page 24**: the moment an admin (or any non-developer) can write `blog_posts.body`, that write path (or this render path) **must** sanitize the HTML before either storing or rendering it — ship that together with the CMS editor, not as an afterthought. This handoff is not signing off on skipping sanitization forever, only on not building it against a write path that doesn't exist in this task. |
| D11 | A blog post `slug` could theoretically collide with the literal path segment `"category"` — `/news/category` (with no third segment) would resolve to `app/[locale]/news/[slug]/page.tsx` with `slug: "category"`, not to the category route (which requires a second segment). | Document as a **known constraint**: never allow a post with `slug = "category"` (or, generally, any slug equal to a future reserved top-level segment under `/news`). No runtime guard is added in this task (there is no write path to guard — see D10) but flag it for whoever builds Page 24's slug-editing UI: validate against a reserved-words list before insert. | Cheap to document now, before any admin UI exists to accidentally create the collision; expensive to discover later as a live 404 on a real published article. |

---

## 2. Component inventory

```
app/[locale]/news/
  page.tsx                          (NEW — index Server Component. Reads
                                      ?search=&page= from searchParams,
                                      generateMetadata (title/description/
                                      canonical/hreflang, §8), fetches
                                      GET /api/news, renders <NewsIndexView
                                      category={null} .../>)

app/[locale]/news/category/[category]/
  page.tsx                          (NEW — category Server Component.
                                      Validates the [category] segment
                                      against BLOG_CATEGORIES (lib/blog/
                                      schemas.ts) — notFound() if not a
                                      known category. Reads ?page= only
                                      (§1 D4 — no combined search+category
                                      in MVP). Same rendering as index via
                                      <NewsIndexView category={category} .../>)

app/[locale]/news/[slug]/
  page.tsx                          (NEW — article Server Component.
                                      Fetches GET /api/news/[slug]
                                      ({ cache: 'no-store' }), notFound() on
                                      404. generateMetadata with conditional
                                      hreflang (§8). Renders JSON-LD
                                      (NewsArticle + BreadcrumbList) +
                                      <ArticleHeader/> + <TableOfContents/>
                                      + <ArticleBody/> + <ShareRow/> +
                                      <AuthorBio/> + <NewsletterForm/> +
                                      <RelatedArticles/>)

components/news/
  NewsIndexView.tsx                  (NEW — Server Component: shared render
                                       tree for /news and /news/category/[x].
                                       Props: { posts, page, totalPages,
                                       total, category, search, locale }.
                                       Renders <FeaturedHero/> (page 1, no
                                       search/category filter active only —
                                       §3.2) + <CategoryChips/> +
                                       <NewsSearchForm/> + grid of
                                       <ArticleCard/> + <NewsPagination/> +
                                       <NewsletterForm source="news_index"/>)
  FeaturedHero.tsx                   (NEW — Server Component: full-width
                                       clickable hero for posts[0] when
                                       page===1 && !category && !search)
  CategoryChips.tsx                  (NEW — Server Component: plain <Link>
                                       row, `aria-current="page"` on the
                                       active chip — no client JS, §1 D5-style
                                       reasoning)
  NewsSearchForm.tsx                 (NEW — Server Component: native
                                       `<form action="/news" method="GET">`,
                                       `<input name="search" defaultValue=.../>`
                                       — works with zero JS, still a real
                                       navigable/shareable URL on submit)
  ArticleCard.tsx                    (NEW — Server Component: grid card)
  NewsPagination.tsx                 (NEW — Server Component: <Link>-based
                                       numbered pagination, §1 D5)
  NewsletterForm.tsx                 (NEW — 'use client': owns email input +
                                       submit state, POSTs to
                                       /api/newsletter/subscribe, inline
                                       role="status"/role="alert" message —
                                       no shared toast, §7)
  ArticleHeader.tsx                  (NEW — Server Component: category
                                       badge, H1, meta row, cover image
                                       (`next/image priority`))
  TableOfContents.tsx                (NEW — Server Component: static
                                       `<nav aria-label="Table of contents">`
                                       list of anchor links from
                                       `headings: TocHeading[]` — no
                                       scroll-spy, §0)
  ArticleBody.tsx                    (NEW — Server Component: renders
                                       heading-id-annotated HTML via
                                       `dangerouslySetInnerHTML`, `prose`
                                       classes, §1 D10)
  AuthorBio.tsx                      (NEW — Server Component: avatar + name
                                       + bio card, from the post's embedded
                                       author fields, §5.1)
  ShareRow.tsx                       (NEW — 'use client': share-intent links
                                       (Facebook/Telegram/WhatsApp/X/mailto)
                                       + "Copy link" via `navigator.clipboard`)
  RelatedArticles.tsx                (NEW — Server Component: "Read also"
                                       grid of `<ArticleCard/>`, receives
                                       `relatedPosts` as a prop, §1 D6)

lib/blog/
  types.ts                           (NEW — BlogCategory, LocalizedText,
                                       BlogPostCard, BlogPostDetail,
                                       TocHeading, NewsQueryInput,
                                       NewsletterSubscribeInput/Response)
  schemas.ts                         (NEW — BLOG_CATEGORIES, newsQuerySchema,
                                       newsletterSubscribeSchema, §5.1/§5.4)
  mapBlogPostRow.ts                  (NEW — DB row → BlogPostCard /
                                       BlogPostDetail mappers, §5.2)
  defaultPosts.ts                    (NEW — DEFAULT_POSTS fallback config,
                                       mirrors supabase/seed.sql verbatim,
                                       §5.3, §1 D1)
  readingTime.ts                     (NEW — computeReadingTimeMinutes(html),
                                       pure, §5.5)
  toc.ts                             (NEW — annotateHeadings(html) → { html,
                                       headings }, pure, §5.5)
  localize.ts                        (NEW — resolveLocalized(text, locale),
                                       availableLocales(text), pure, §1 D9)

app/api/news/
  route.ts                           (NEW — GET: category?/search?/page?/
                                       locale? query → paginated
                                       BlogPostCard[], §5.2)

app/api/news/[slug]/
  route.ts                           (NEW — GET: BlogPostDetail +
                                       relatedPosts, 404 for missing/
                                       unpublished, §5.2/§1 D6)

app/api/newsletter/subscribe/
  route.ts                           (NEW — POST: zod + honeypot +
                                       rate-limit + insert, §5.4)

supabase/migrations/
  0011_blog.sql                      (NEW — blog_posts + newsletter_subscribers
                                       tables + RLS, no seed data, §5.1)

supabase/
  seed.sql                           (EDIT — append a DO block inserting 5
                                       sample published blog_posts rows,
                                       §1 D1, §5.3)

types/database.ts
  (EDIT — add blog_posts + newsletter_subscribers Table entries + a
  BlogCategory type alias alongside the existing UserTier-style aliases)
```

Reuse, don't fork: `safeLocale()` (`@/lib/locale`), `Link`/`redirect`
(`@/i18n/navigation`), `Breadcrumbs` (`@/components/property/Breadcrumbs` —
already generic, takes `{ label, href? }[]`, no new breadcrumb component
needed), `cn()` (`@/lib/utils`), `checkRateLimit`/`LIMITS`
(`@/lib/auth/rateLimit` — add one new preset, §5.4), the honeypot field
convention from `lib/agent/schemas.ts`'s `agentLeadSchema` (`website: z.string().max(0).optional()`),
and the JSON-parse-guard → zod-guard → session/rate-limit-guard → typed-response
shape from `app/api/favorites/route.ts` / `app/api/agent-leads/route.ts`.

---

## 3. Wireframes

### 3.1 Index / category — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10) · Home › News  (or  Home › News › Financing)│
│ H1 «News & Insights» (text-3xl)                             │
├────────────────────────────────────────────────────────────┤
│ ┌──── FEATURED HERO (index page 1 only, h-[420px]) ───────┐ │
│ │ cover image + gradient overlay                           │ │
│ │ [Market] badge · H2 title · excerpt · author · date      │ │
│ └─────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ [All][Buying][Selling][Rent][Financing][Market][News]  🔍__ │
├────────────────────────────────────────────────────────────┤
│ ┌─card─┐  ┌─card─┐  ┌─card─┐    (grid-cols-3, gap-6)        │
│ │ img  │  │ img  │  │ img  │                                │
│ │badge │  │badge │  │badge │                                │
│ │title │  │title │  │title │                                │
│ │meta  │  │meta  │  │meta  │                                │
│ └──────┘  └──────┘  └──────┘                                │
├────────────────────────────────────────────────────────────┤
│ NEWSLETTER banner (bg-primary/5, rounded-2xl)               │
│ ‹ 1 2 3 … › pagination  (real <Link>s, §1 D5)                │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

The category route renders the identical tree with `FeaturedHero` omitted
(only the index's page 1 shows a hero — a category page's "featured" post
would just duplicate card #1, so it's skipped there entirely, not
re-derived per category) and the active chip pointing at the current
category.

### 3.2 Article — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › News › Market › Title                   │
├──────────┬──────────────────────────────────┬──────────────┤
│ ► SHARE  │ ◄ ARTICLE (max-w-[720px])         │ ► TOC        │
│ (sticky) │ [Market] badge                    │ (sticky      │
│ FB       │ H1 (text-4xl)                     │  top-24,     │
│ TG       │ author · date · 6 min read        │  static list,│
│ WA       │ ┌── cover h-[420px] rounded-xl ──┐│  no scroll-  │
│ X        │ └────────────────────────────────┘│  spy, §0)    │
│ 🔗       │ Body (prose)…                     │ • Section 1  │
│          │ ── Author bio ──                  │ • Section 2  │
├──────────┴──────────────────────────────────┴──────────────┤
│ NEWSLETTER (inline)                                          │
│ ── Read also (related, up to 4 cards) ──                     │
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

No reading-progress bar (deferred, §0) — the top of the header is the top
of the viewport, nothing fixed above it.

### 3.3 Mobile (<768px)

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ HEADER (h-14)             │   │ HEADER                   │
├──────────────────────────┤   ├──────────────────────────┤
│ H1                        │   │ ‹ Back                   │
│ FEATURED (h-[240px])      │   │ [Market] badge            │
│ [chips scroll-x →]        │   │ H1 (text-2xl)             │
│ 🔍 search (full-width)    │   │ author · date · 6 min     │
│ ┌──card (1-col)──┐        │   │ cover (full-bleed)        │
│ │ img            │        │   │ ▾ Table of contents (acc.)│
│ │ title · meta   │        │   │ Body…                     │
│ └────────────────┘        │   │ [share row]               │
│ … cards stack …           │   │ author bio · newsletter   │
│ NEWSLETTER                │   │ Read also (scroll-x)      │
│ ‹ 1 2 3 › (real links)    │   │ FOOTER                    │
│ FOOTER                    │   └──────────────────────────┘
└──────────────────────────┘
```

Mobile TOC is a native `<details><summary>▾ Table of contents</summary>...</details>`
disclosure (server-rendered, zero JS — same "acceptable simpler alternative"
reasoning `docs/design/17-pricing-handoff.md` §2 used for its FAQ accordion).

---

## 4. Layout tokens (exact classes)

Reuses this app's existing primitives (`bg-primary`, `text-gray-*`, focus
rings) rather than introducing new ones.

| Element | Class string |
|---|---|
| H1 (index) | `text-3xl font-bold text-gray-900` |
| H1 (article) | `text-4xl font-bold leading-tight` (mobile: `text-2xl`) |
| Category badge | `bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full` |
| Card | `block bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow` |
| Card cover wrapper | `relative aspect-[16/9]` (`next/image fill className="object-cover"`) |
| Card title | `text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-primary` |
| Card excerpt | `text-sm text-gray-600 line-clamp-2 mt-1` |
| Meta row | `text-xs text-gray-400 flex items-center gap-2 mt-3` |
| Grid | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` |
| Chip (idle) | `inline-flex items-center h-9 px-3.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Chip (active) | `bg-primary text-white hover:bg-primary` + `aria-current="page"` |
| Chip row | `flex gap-2 flex-wrap md:flex-nowrap md:overflow-visible overflow-x-auto` |
| Search input | `h-11 w-full md:w-64 rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Featured hero wrapper | `relative h-[240px] md:h-[420px] rounded-2xl overflow-hidden group` |
| Featured overlay | `absolute inset-0 bg-gradient-to-t from-black/70 to-transparent` |
| Featured title | `text-white text-xl md:text-2xl font-bold` |
| Body prose | `prose prose-gray max-w-none prose-a:text-primary prose-img:rounded-xl` |
| TOC nav | `hidden lg:block sticky top-24 text-sm` |
| TOC link (idle) | `block py-1 text-gray-500 hover:text-primary` |
| TOC link H3 (nested) | add `pl-3` |
| Newsletter banner | `bg-primary/5 border border-primary/15 rounded-2xl p-6` |
| Newsletter input | same as search input, `w-full sm:w-auto sm:flex-1` |
| Newsletter submit | `h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50` |
| Newsletter inline status (success) | `text-sm text-green-700 mt-2` |
| Newsletter inline status (error) | `text-sm text-red-600 mt-2` |
| Pagination link (idle) | `w-9 h-9 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Pagination link (active) | `bg-primary text-white` + `aria-current="page"` |
| Share button | `w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| Author bio card | `flex items-start gap-4 border-t border-gray-200 pt-6 mt-8` |

---

## 5. Data & API

### 5.1 Migration — `supabase/migrations/0011_blog.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011_blog.sql
-- Page 15 — Blog / News (/news). Adds `blog_posts` and
-- `newsletter_subscribers`. No write API for blog_posts ships in this task —
-- Page 24 (admin CMS) is the only intended writer, using the service-role
-- client (lib/supabase/admin.ts), which bypasses RLS entirely. Sample posts
-- are NOT seeded here (see supabase/seed.sql — this is demo content, not
-- universal reference data; see docs/design/15-blog-handoff.md D1).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT        NOT NULL UNIQUE,
  category       TEXT        NOT NULL
                   CHECK (category IN ('buying', 'selling', 'renting', 'financing', 'market', 'news')),
  -- { "hy": "...", "ru": "...", "en": "..." } — any subset of keys may be
  -- present; missing locales fall back at render time (lib/blog/localize.ts).
  title          JSONB       NOT NULL DEFAULT '{}',
  excerpt        JSONB       NOT NULL DEFAULT '{}',
  -- Sanitized HTML per locale. No runtime sanitizer is wired in this task —
  -- only trusted, developer-authored content (seed.sql / this migration)
  -- populates this column right now. Page 24 MUST sanitize on write before
  -- any non-developer authoring path ships (docs/design/15-blog-handoff.md D10).
  body           JSONB       NOT NULL DEFAULT '{}',
  cover_image    TEXT,
  author_name    TEXT        NOT NULL,
  author_avatar  TEXT,
  -- { "hy": "...", "ru": "...", "en": "..." } — short bio/credentials text.
  -- Simple embedded fields, not a full author-profile system (out of scope).
  author_bio     JSONB,
  is_featured    BOOLEAN     NOT NULL DEFAULT false,
  -- NULL = draft/unpublished. A future value = scheduled (RLS policy below
  -- already excludes it from public SELECT until that instant passes).
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts (published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS blog_posts_category_published_idx
  ON blog_posts (category, published_at DESC) WHERE published_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — public SELECT limited to published rows. No INSERT/UPDATE/DELETE
-- policy is created, so RLS default-denies all writes for the anon/
-- authenticated roles; only the service-role key (which bypasses RLS) can
-- write. Same "no policy = deny" pattern as 0009_plans.sql.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts: public can select published"
  ON blog_posts
  FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- `newsletter_subscribers` — insert-only from anon/authenticated, no public
-- read (not even of the row you just inserted — the API response doesn't
-- need to read it back, it just echoes the input on success).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'news_index'
                CHECK (source IN ('news_index', 'article', 'footer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive uniqueness (the API layer also lower-cases email before
-- insert, §5.4 — this index is defense in depth against any bypass of that).
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_lower_idx
  ON newsletter_subscribers (lower(email));

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_subscribers: anon can insert"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT policy → RLS denies all reads for anon/authenticated. Only the
-- service-role key (a future ESP export job, out of scope) can read rows.
```

Add matching `Database['public']['Tables']` entries to `types/database.ts`
(`blog_posts` and `newsletter_subscribers`, `Row`/`Insert`/`Update`, exactly
the shape `plans`/`home_value_estimates` already use — `title`/`excerpt`/
`body`/`author_bio` typed as `Json`, narrowed to `LocalizedText` by
`mapBlogPostRow.ts` at the boundary, not loosened to `any`). Add
`export type BlogCategory = 'buying' | 'selling' | 'renting' | 'financing' | 'market' | 'news'`
alongside the existing `UserTier`/`Currency`-style aliases near the top of
the file.

### 5.2 `lib/blog/types.ts` + `mapBlogPostRow.ts`

```ts
// lib/blog/types.ts
import type { Locale } from '@/lib/locale'

export type BlogCategory = 'buying' | 'selling' | 'renting' | 'financing' | 'market' | 'news'

/** Per-locale content — any subset of keys may be present. */
export type LocalizedText = Partial<Record<Locale, string>>

export interface BlogAuthor {
  name: string
  avatar: string | null
  /** Short bio/credentials shown on the article page. May be entirely absent. */
  bio: LocalizedText | null
}

export interface BlogPostCard {
  id: string
  slug: string
  category: BlogCategory
  title: LocalizedText
  excerpt: LocalizedText
  coverImage: string | null
  author: BlogAuthor
  isFeatured: boolean
  publishedAt: string
  readingTimeMinutes: number
}

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

export interface BlogPostDetail extends Omit<BlogPostCard, 'excerpt'> {
  excerpt: LocalizedText
  /** Body HTML per locale, already annotated with heading ids (lib/blog/toc.ts). */
  body: LocalizedText
  updatedAt: string | null
  headings: TocHeading[]
  relatedPosts: BlogPostCard[]
}

export interface NewsListResponse {
  items: BlogPostCard[]
  page: number
  totalPages: number
  total: number
}

export interface NewsletterSubscribeInput {
  email: string
  source: 'news_index' | 'article' | 'footer'
}

export interface NewsletterSubscribeResponse {
  subscribed: true
}
```

```ts
// lib/blog/mapBlogPostRow.ts
import type { BlogPostCard, BlogAuthor, BlogCategory, LocalizedText } from './types'
import { computeReadingTimeMinutes } from './readingTime'
import type { Locale } from '@/lib/locale'

export interface BlogPostRow {
  id: string
  slug: string
  category: string
  title: unknown
  excerpt: unknown
  body: unknown
  cover_image: string | null
  author_name: string
  author_avatar: string | null
  author_bio: unknown
  is_featured: boolean
  published_at: string
}

/** DB row (snake_case, loosely-typed JSONB) → BlogPostCard (camelCase, typed).
 *  Reading time is derived from the requested locale's body text (falls
 *  back through the same locale chain as lib/blog/localize.ts) — callers
 *  that only need the card list should select `body` too so this stays
 *  accurate (see app/api/news/route.ts's comment on that trade-off). */
export function mapBlogPostRow(row: BlogPostRow, locale: Locale): BlogPostCard {
  const author: BlogAuthor = {
    name: row.author_name,
    avatar: row.author_avatar,
    bio: (row.author_bio as LocalizedText | null) ?? null,
  }

  const bodyText = (row.body as LocalizedText)[locale]
    ?? (row.body as LocalizedText).en
    ?? (row.body as LocalizedText).hy
    ?? (row.body as LocalizedText).ru
    ?? ''

  return {
    id: row.id,
    slug: row.slug,
    category: row.category as BlogCategory,
    title: row.title as LocalizedText,
    excerpt: row.excerpt as LocalizedText,
    coverImage: row.cover_image,
    author,
    isFeatured: row.is_featured,
    publishedAt: row.published_at,
    readingTimeMinutes: computeReadingTimeMinutes(bodyText),
  }
}
```

### 5.3 `lib/blog/defaultPosts.ts` (fallback + seed source of truth)

Typed fallback used when Supabase isn't configured (same
`supabaseUrl.includes('your-project-id')` guard as `app/[locale]/search/page.tsx`)
or the query errors — mirrors `lib/plans/defaultPlans.ts`. **This is also
the content `supabase/seed.sql`'s new `DO` block transcribes into SQL
`INSERT` statements** (§1 D1) — keep both in sync.

```ts
// lib/blog/defaultPosts.ts (excerpt — 5 posts total, one per non-"all"
// category except one extra "market" post so pagination/related both have
// something to show)
export const DEFAULT_POSTS = [
  {
    slug: 'yerevan-market-trends-2026',
    category: 'market' as const,
    title: { hy: 'Երևանի շուկայի տրենդները 2026', ru: 'Тренды рынка Еревана в 2026', en: 'Yerevan market trends for 2026' },
    excerpt: { hy: 'Գները կայունացել են...', ru: 'Цены стабилизировались...', en: 'Prices have stabilized across most districts this year.' },
    body: { en: '<h2>Overview</h2><p>...</p><h2>What changed</h2><p>...</p>' },
    coverImage: '/images/blog/market-2026.jpg',
    authorName: 'Lilit Hakobyan',
    authorAvatar: null,
    authorBio: { en: 'Lilit covers the Yerevan housing market for RE Platform.' },
    isFeatured: true,
  },
  // ...4 more, one each for buying/selling/renting/financing — see the
  // seed.sql DO block for the literal SQL transcription of all 5.
]
```

### 5.4 API routes

**`GET /api/news`** — `?category=&search=&page=&locale=`

```ts
// lib/blog/schemas.ts
import { z } from 'zod'

export const BLOG_CATEGORIES = ['buying', 'selling', 'renting', 'financing', 'market', 'news'] as const

export const newsQuerySchema = z.object({
  category: z.enum(BLOG_CATEGORIES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  locale: z.enum(['hy', 'ru', 'en']).default('hy'),
})
```

```ts
// app/api/news/route.ts (sketch)
const PAGE_SIZE = 12

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsed = newsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_params', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }
  const { category, search, page, locale } = parsed.data

  // Falls back to DEFAULT_POSTS (filtered/paginated in-process) when
  // Supabase isn't configured — same guard as app/[locale]/search/page.tsx.
  const supabase = await createServerClient() // anon-scoped; RLS already
                                                // restricts to published rows
  let query = supabase
    .from('blog_posts')
    .select('id, slug, category, title, excerpt, body, cover_image, author_name, author_avatar, author_bio, is_featured, published_at', { count: 'exact' })
    .order('published_at', { ascending: false })

  if (category) query = query.eq('category', category)
  if (search) {
    // ilike across the requested locale's title/excerpt only — §1 D4.
    query = query.or(`title->>${locale}.ilike.%${search}%,excerpt->>${locale}.ilike.%${search}%`)
  }
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const { data, count, error } = await query
  // ...map rows via mapBlogPostRow(row, locale), compute totalPages, return
  // NewsListResponse. On !data/error, fall back to DEFAULT_POSTS.
}
```

`body` is selected here purely to compute `readingTimeMinutes` per card
(§1 D9's mapper) — it is **not** included in the JSON response (stripped
after mapping). Flagged as a follow-up: if the catalog grows large, add a
stored/generated `reading_time_minutes` column instead of selecting full
`body` for every list query — out of scope for this MVP's expected volume
(a few dozen posts).

**`GET /api/news/[slug]`** — detail + embedded related posts (§1 D6)

```ts
// app/api/news/[slug]/route.ts (sketch)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  const locale = /* z.enum(['hy','ru','en']).catch('hy').parse(request.nextUrl.searchParams.get('locale')) */

  const supabase = await createServerClient()
  const { data: row } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  // RLS already hides unpublished/future rows from this anon-scoped query —
  // a missing row here means "not found or not yet published", both 404.

  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { html, headings } = annotateHeadings(
    (row.body as LocalizedText)[locale] ?? (row.body as LocalizedText).en ?? '',
  )

  const { data: relatedRows } = await supabase
    .from('blog_posts')
    .select('id, slug, category, title, excerpt, body, cover_image, author_name, author_avatar, author_bio, is_featured, published_at')
    .eq('category', row.category)
    .neq('id', row.id)
    .order('published_at', { ascending: false })
    .limit(4)

  const detail: BlogPostDetail = {
    ...mapBlogPostRow(row, locale),
    body: { [locale]: html },
    updatedAt: row.updated_at !== row.created_at ? row.updated_at : null,
    headings,
    relatedPosts: (relatedRows ?? []).map((r) => mapBlogPostRow(r, locale)),
  }
  return NextResponse.json(detail)
}
```

**`POST /api/newsletter/subscribe`**

```ts
// lib/blog/schemas.ts (continued)
export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  source: z.enum(['news_index', 'article', 'footer']).default('news_index'),
  // Honeypot — must stay empty. Same convention as lib/agent/schemas.ts.
  website: z.string().max(0).optional(),
})
```

```ts
// app/api/newsletter/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { newsletterSubscribeSchema } from '@/lib/blog/schemas'
import { checkRateLimit, LIMITS } from '@/lib/auth/rateLimit'
import { createServerClient } from '@/lib/supabase/server'

/** Postgres unique-violation error code (unique index on lower(email)). */
const UNIQUE_VIOLATION = '23505'

/**
 * POST /api/newsletter/subscribe
 *
 * Body: { email: string, source?: 'news_index'|'article'|'footer' }
 * No auth required (public form). Rate-limited 3/hour/IP. Honeypot field
 * `website` must stay empty (bots get a fake 201).
 *
 * 201 { subscribed: true } · 400 invalid_json · 409 already_subscribed ·
 * 422 validation_error · 429 rate_limited · 500 server_error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  let input: ReturnType<typeof newsletterSubscribeSchema.parse>
  try {
    input = newsletterSubscribeSchema.parse(body)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'validation_error', fields: err.flatten().fieldErrors },
        { status: 422 },
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Honeypot: silently accept but do nothing (bots get a fake success).
  if (input.website) {
    return NextResponse.json({ subscribed: true }, { status: 201 })
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const rate = checkRateLimit(`newsletter-subscribe:${ip}`, LIMITS.NEWSLETTER_SUBSCRIBE.max, LIMITS.NEWSLETTER_SUBSCRIBE.windowMs)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  try {
    const supabase = await createServerClient()
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: input.email, source: input.source })

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: 'already_subscribed' }, { status: 409 })
      }
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ subscribed: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
```

Add to `lib/auth/rateLimit.ts`'s `LIMITS`:
```ts
/** 3 newsletter signups per hour per IP (docs/design/15-blog-handoff.md §5.4) */
NEWSLETTER_SUBSCRIBE: { max: 3, windowMs: 60 * 60 * 1000 },
```

Uses the ordinary anon-scoped `createServerClient()` (not
`lib/supabase/admin.ts`) — the RLS `INSERT` policy already permits this for
the `anon`/`authenticated` roles, so no service-role bypass is needed, and
this keeps the write correctly subject to RLS (defense in depth: if the
policy is ever accidentally narrowed, this route fails safely instead of
silently keeping working via a bypass).

### 5.5 `lib/blog/readingTime.ts` + `lib/blog/toc.ts`

```ts
// lib/blog/readingTime.ts
const WORDS_PER_MINUTE = 200

/** Strips HTML tags and estimates reading time from word count. Pure, unit-testable. */
export function computeReadingTimeMinutes(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
```

```ts
// lib/blog/toc.ts
import type { TocHeading } from './types'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

/**
 * Single pass over the body HTML: extracts H2/H3 headings into a TOC list
 * AND rewrites those same tags to carry a matching `id` attribute, in one
 * function — so the rendered anchors and the TOC's hrefs can never drift
 * out of sync (a two-pass extract-then-separately-rewrite implementation
 * would risk numbering the "n-th duplicate heading" differently in each
 * pass). Pure, unit-testable.
 */
export function annotateHeadings(html: string): { html: string; headings: TocHeading[] } {
  const seen = new Map<string, number>()
  const headings: TocHeading[] = []

  const annotated = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (match, levelStr: string, attrs: string, inner: string) => {
      const level = Number(levelStr) as 2 | 3
      const text = inner.replace(/<[^>]*>/g, '').trim()
      if (!text) return match

      const base = slugify(text)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const id = count === 0 ? base : `${base}-${count}`

      headings.push({ id, text, level })
      return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`
    },
  )

  return { html: annotated, headings }
}
```

### 5.6 `lib/blog/localize.ts` (fallback chain + hreflang helper)

```ts
// lib/blog/localize.ts
import type { Locale } from '@/lib/locale'
import type { LocalizedText } from './types'

/** Same fallback chain as components/property/PropertyDescription.tsx. */
export function resolveLocalized(text: LocalizedText, locale: Locale): string {
  return text[locale] ?? text.en ?? text.hy ?? text.ru ?? ''
}

/** Which locales actually have content — drives conditional hreflang (§8). */
export function availableLocales(text: LocalizedText): Locale[] {
  return (['hy', 'ru', 'en'] as const).filter((l) => Boolean(text[l]?.trim()))
}
```

---

## 6. Content & i18n strategy

**UI chrome (buttons, labels, "Read also", "Subscribe", empty states) is
hardcoded English**, not wired through `next-intl` — consistent with every
page shipped so far *except* `/pro` (`docs/design/17-pricing-handoff.md` D1,
which was a deliberate one-off because that task's acceptance criteria
explicitly required translated static copy; this task's acceptance criteria
does not). **Article/card content** (`title`, `excerpt`, `body`, author
`bio`) is genuinely per-locale, sourced from the `blog_posts` JSONB columns
with the fallback chain in §5.6 — this is what makes `/hy/news/[slug]`,
`/ru/news/[slug]`, and `/en/news/[slug]` render real, distinct content per
locale (satisfying "render via SSR for hy/ru/en"), without needing a
`messages/*.json` edit. No `messages/en.json`/`hy.json`/`ru.json` changes
ship with this task.

---

## 7. Accessibility

- Cover/card images: meaningful `alt` (post title in the rendered locale,
  not empty).
- Category chips: real `<Link>`s in a `<nav aria-label="Categories">`, the
  active one gets `aria-current="page"` (not color alone).
- TOC: `<nav aria-label="Table of contents">`, plain anchor links (no
  scroll-spy in MVP, §0) — still fully keyboard-navigable.
- Share buttons: `aria-label` per channel ("Share on Facebook", "Copy
  link"); the copy-link action's confirmation is `role="status"
  aria-live="polite"`, not color/icon alone.
- `NewsletterForm`: `<label>` (visually hidden if needed) tied to the email
  `<input>`; on error, `aria-invalid="true"` + `role="alert"` on the
  message; on success, `role="status"`.
- Body prose: correct heading hierarchy is the CMS author's responsibility
  (H1 is the page's own title, never duplicated inside `body` — Page 24
  should enforce H2-starts-first when it ships); this task only renders
  whatever hierarchy the seed content already uses correctly.
- Contrast ≥ 4.5:1 (all tokens in §4 reuse already-audited pairs from other
  pages); touch targets ≥ 44px (`h-11` inputs/buttons, `h-9`/`w-9` chips and
  pagination links — bump chip height to `h-10`/`w-10` on touch if a real
  device audit flags 36px as too tight; not a blocking issue for this spec).

---

## 8. Page shell & SEO

### 8.1 Metadata (all three routes)

```ts
// app/[locale]/news/[slug]/page.tsx (metadata sketch)
export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params
  const locale = safeLocale(rawLocale)
  const post = await fetchPost(slug, locale) // via GET /api/news/[slug]
  if (!post) return { title: `Article not found | ${BRAND}` }

  const title = resolveLocalized(post.title, locale)
  const description = resolveLocalized(post.excerpt, locale).slice(0, 155)
  const locales = availableLocales(post.title) // §5.6 — only real translations

  const languages: Record<string, string> = {}
  for (const l of locales) languages[l] = `/${l}/news/${post.slug}`
  if (locales.length > 0) languages['x-default'] = `/${locales[0]}/news/${post.slug}`

  return {
    title: `${title} | ${BRAND} News`,
    description,
    alternates: {
      canonical: `/${locale}/news/${post.slug}`,
      // Omit `languages` entirely if the post has no locale variants at all
      // (matches the full spec's "hreflang not set" untranslated state).
      ...(locales.length > 0 ? { languages } : {}),
    },
    openGraph: {
      type: 'article',
      title,
      description,
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
  }
}
```

`/news` and `/news/category/[category]` follow the same shape without the
per-post fetch (`title`/`description` are static strings — "News and
insights | {brand}" / "{Category} news and insights | {brand}" — canonical
is `/${locale}/news` or `/${locale}/news/category/${category}`, `languages`
unconditionally `{ hy, ru, en }` since the index page's own chrome always
exists in every locale, only the *content inside it* varies).

### 8.2 JSON-LD

**Article page — `NewsArticle` + `BreadcrumbList`.** Spot-checked against
schema.org's `NewsArticle` required/recommended fields:

```ts
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'NewsArticle',
      headline: title,                                    // required
      description,                                         // recommended
      image: post.coverImage ? [post.coverImage] : [],      // required
      datePublished: post.publishedAt,                      // required
      dateModified: post.updatedAt ?? post.publishedAt,     // recommended
      author: {                                             // required
        '@type': 'Person',
        name: post.author.name,
      },
      publisher: {                                          // required
        '@type': 'Organization',
        name: BRAND,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
        },
      },
      mainEntityOfPage: {                                   // required
        '@type': 'WebPage',
        '@id': `${SITE_URL}/${locale}/news/${post.slug}`,
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.label,
        ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
      })),
    },
  ],
}
```

`SITE_URL` = `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com'`,
matching the placeholder-domain convention already used in
`property/[id]/[slug]/page.tsx` (that file hardcodes `example.com` inline —
prefer the env var here since it's already read elsewhere in this repo,
e.g. `search/page.tsx`, but either is acceptable; don't block on this).
`logo.png` is a placeholder path — confirm the actual brand logo asset path
in `public/` before shipping (if none exists yet, use a text-only
`publisher` without `logo` rather than a broken URL — `logo` is
recommended, not strictly required, so omitting it beats pointing at a
404).

**Index/category page — `Blog` + `BreadcrumbList`** (lighter-weight, no
per-article required fields to satisfy):

```ts
{
  '@type': 'Blog',
  name: category ? `${categoryLabel} — News` : 'News & Insights',
  url: `${SITE_URL}/${locale}/news${category ? `/category/${category}` : ''}`,
}
```

### 8.3 Explicitly deferred SEO surface (§0/§10)

`sitemap.xml` (no `app/sitemap.ts` exists in this repo yet — adding one is a
cross-cutting concern touching every content type, not scoped to this
task), Google News sitemap, dynamic OG image generation (`/api/og`),
`robots.txt` changes. None of these block the acceptance criteria, which
asks for per-page SSR + valid JSON-LD + crawlable pagination — all of which
ship in this task without a sitemap.

---

## 9. Testing notes

Mirror `__tests__/homeValueMigration.test.ts`'s "documented RLS check"
convention (static regex assertions against the migration SQL text — there
is no live Postgres in CI) and `__tests__/favoritesRoute.test.ts`'s route
handler mocking style (`environment: 'node'`, top-level
`vi.mock('@/lib/supabase/server', ...)`). Suggested new files:

- `__tests__/blogMigration.test.ts` — static checks against
  `supabase/migrations/0011_blog.sql`: `blog_posts` and
  `newsletter_subscribers` both `CREATE TABLE IF NOT EXISTS`; both `ALTER
  TABLE ... ENABLE ROW LEVEL SECURITY`; `blog_posts`'s only policy is
  `FOR SELECT` and its `USING` clause contains `published_at IS NOT NULL`
  and `published_at <= NOW()` (not `USING (true)`); exactly one policy on
  `blog_posts` (no accidental public write grant); `newsletter_subscribers`'s
  only policy is `FOR INSERT` (no `FOR SELECT` policy exists at all — grep
  for the table name should show exactly one `CREATE POLICY` block); the
  policy's `TO` clause includes `anon`. Include the same **manual
  verification checklist** as a comment block (as user A, an anon key, and
  a draft/future-dated post — confirm draft/future rows never appear in
  `select * from blog_posts` for anon; confirm `insert into
  newsletter_subscribers` works with the anon key and `select * from
  newsletter_subscribers` returns 0 rows with the anon key).
- `__tests__/newsletterSubscribeSchema.test.ts` — valid email accepted +
  lower-cased/trimmed; missing `@`, empty string, and non-string rejected;
  non-empty `website` (honeypot) doesn't fail validation itself (route
  handles it, not the schema) but is present on the parsed output for the
  route to check; `source` defaults to `'news_index'` when omitted, rejects
  an unknown enum value.
- `__tests__/newsletterSubscribeRoute.test.ts` — **covers the acceptance
  criteria's required valid + invalid cases directly**: valid email → 201
  `{ subscribed: true }` and the mocked `.insert()` was called with the
  lower-cased email; invalid email (`"not-an-email"`) → 422
  `validation_error` with a `fields.email` message, `.insert()` never
  called; malformed JSON body → 400 `invalid_json`; duplicate email (mock
  `.insert()` rejecting with `code: '23505'`) → 409 `already_subscribed`;
  honeypot filled → 201 without ever calling `.insert()`; 4th request from
  the same IP within the window → 429 `rate_limited` — follow
  `agentLeadsRoute.test.ts`'s pattern exactly: give that one test its own
  unique IP value (e.g. `x-forwarded-for: '203.0.113.99'`) not shared with
  any other test in the file, then loop the `POST` call 4 times in a row and
  assert only the last response is 429 (the rate-limit store is
  module-level and persists across tests in the same file/process, so a
  shared IP/key across tests would make results order-dependent — a fresh,
  never-reused key per test is what keeps this deterministic, not an
  explicit reset call, since `checkRateLimit` exposes no reset function).
- `__tests__/blogReadingTime.test.ts` — `computeReadingTimeMinutes`: strips
  tags before counting (`<p>` doesn't count as a word); a short string
  still returns `≥ 1`; roughly 400 words of plain text → `2`.
- `__tests__/blogToc.test.ts` — `annotateHeadings`: extracts `h2`/`h3` in
  document order with correct `level`; ignores `h1`/`h4`+; slugifies
  Armenian/Cyrillic/Latin headings without crashing (non-Latin scripts must
  produce a non-empty, URL-safe id — exercise all three); two identical
  heading texts get `id`/`id-1` and the **rendered HTML's own `id`
  attributes** match the returned `headings[].id` values 1:1 (assert both
  outputs together, not just the `headings` array in isolation — this is
  the property the single-pass design in §5.5 exists to guarantee); a
  heading with only inline markup and no text (`<h2><img/></h2>`) is
  skipped, not given an empty id.
- `__tests__/blogLocalize.test.ts` — `resolveLocalized`: exact-locale hit;
  falls through `en → hy → ru` when the requested locale is missing;
  returns `''` for a fully-empty object. `availableLocales`: returns only
  keys with non-whitespace content, in `['hy','ru','en']` order regardless
  of key insertion order.
- `__tests__/blogNewsQuerySchema.test.ts` — `newsQuerySchema`: accepts all 6
  category values + `undefined`; rejects an unknown category string;
  `page` coerces `"2"` → `2`, defaults to `1` when absent, rejects `0`/
  negative; `search` trims whitespace and rejects a >100-char string.
- `__tests__/blogMapRow.test.ts` (optional, cheap) — `mapBlogPostRow`:
  snake_case row → camelCase `BlogPostCard`; `readingTimeMinutes` reflects
  the selected locale's body length, not another locale's.

Component-level rendering assertions are not this repo's pattern (no
`@testing-library/react`/jsdom in `vitest.config.ts`) — keep all asserted
logic in `lib/blog/`, matching every prior page's testing footprint.

---

## 10. Explicitly out of scope — flag in review if present

Per §0: reading-progress bar, TOC scroll-spy / `IntersectionObserver`,
double opt-in / confirmation email, any real ESP integration (Mailchimp,
SendGrid, Resend, etc. — this task **only** persists to
`newsletter_subscribers` and shows a confirmation message), a standalone
`GET /api/news/[slug]/related` route, admin CMS editor UI (Page 24),
comment system, author profile pages (`/news/author/[id]`), `sitemap.xml` /
Google News sitemap, `/api/og` dynamic image generation, analytics event
wiring (`news_index_view`, `article_view`, etc.), full-text search across
`body`, HTML sanitizer dependency (flagged for Page 24 instead, §1 D10). If
any of these show up in the diff, it's scope creep against this task.
