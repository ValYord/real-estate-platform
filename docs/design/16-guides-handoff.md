# Page 16 — Guides Hub + Guide Page: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/16-guides.md`](../en/pages/16-guides.md) (deep spec: Admin-CMS-authored
guides, PDF checklist + lead-gate, embedded mortgage mini-calc, login-gated TOC
progress, `views_count`-ranked featured, `/api/guides/*` REST contracts). This
document does **not** repeat that spec in full; it pins down the **MVP scope**
for the current task (public hub + guide page, seeded sample content, no CMS,
no PDF/lead-capture, reuse-only tool CTAs) and closes the gap between the
generic spec and *this specific codebase*.

**No `DESIGN_SYSTEM.md` and no `components/ui`/`components/motion` exist in
this repo** (verified: no shadcn install, no `framer-motion`/`motion`
dependency in `package.json`, no `@tailwindcss/typography` plugin). Every
shipped page in this codebase (`favorites`, `mortgage-calculators`,
`home-value`, `property/[id]/[slug]`, `search`) is built from plain Tailwind
utility classes plus a handful of hand-rolled, reused primitives
(`components/property/Breadcrumbs.tsx`, the card pattern in
`components/search/PropertyCard.tsx`, `lib/utils.ts`'s `cn()`, `lucide-react`
icons). This spec follows that established convention — it does **not**
introduce a component library, a motion library, or a typography plugin.

Audited against the current tree: `components/property/Breadcrumbs.tsx`
(generic `items`/`className` props + `itemScope`/`itemType="BreadcrumbList"`
microdata — reuse verbatim, do not fork), `components/search/PropertyCard.tsx`
(card shell pattern: `rounded-xl border border-gray-200 overflow-hidden
hover:shadow-md transition-all`, whole-card `<Link>` wrapper, `line-clamp`
title), `app/[locale]/mortgage-calculators/page.tsx` and
`app/[locale]/home-value/page.tsx` (Server Component shell + `generateMetadata`
+ hardcoded-English chrome copy convention, confirmed real, indexable,
locale-prefixed, already-shipped routes — see D8), `app/[locale]/search/page.tsx`
(SSR reads `searchParams`, zod-parses with a `.catch()` fallback, never throws
on bad input), `app/[locale]/favorites/page.tsx` (SSR page querying Supabase
directly with `createServerClient()`, no intermediate `/api/*` hop — see D6),
`app/[locale]/property/[id]/[slug]/page.tsx` (JSON-LD `<script
type="application/ld+json">` pattern, `@graph` array combining multiple
`@type`s, per-locale text fallback chain `locale → en → hy → first key`),
`lib/locale.ts` (`safeLocale()`), `i18n/routing.ts` (`localePrefix: 'always'`,
`hy`/`ru`/`en`), `components/layout/Header.tsx` / `Footer.tsx` (**already
link** to `/guides`, `/guides?category=buyer|seller|renter|finance`,
`/guides?category=selling-tips|renting-tips`, and `/guides/why-an-agent` — see
D7/D9, this is a real pre-existing-dead-link risk this task must close),
`supabase/migrations/0002_rls_policies.sql` and `0010_home_value_estimates.sql`
(RLS policy naming/shape convention, service-role-only write pattern),
`supabase/seed.sql` (existing dev-seed convention to extend), `vitest.config.ts`
(`environment: 'node'`, no jsdom/RTL — logic-only unit tests), `package.json`
(no `sanitize-html`/`dompurify`/`isomorphic-dompurify` installed — see D2).

---

## 0. MVP scope for this task (read before building)

Build exactly the "Scope" list from the task brief: a `guides` table (own
migration, distinct from `blog_posts`), a hub (`/guides`) with thematic
sections + featured + server-driven search, a guide page (`/guides/[slug]`)
with `HowTo`/`Article` JSON-LD + inline tool CTAs (linking to **existing**
routes only) + related guides, seeded via migration/seed script (no Admin CMS
editor).

**Explicitly deferred (do not build, do not stub):** downloadable PDF
checklist / `ChecklistDownload` / lead-capture email-gate / `download_count`
/ Supabase Storage signed URLs; Admin CMS editor for guides; guide
versioning/history UI; embedded interactive mortgage mini-calc **inside**
guide body (only static CTA links to the already-built tool pages —
acceptance criteria says "reuse existing links, do not build new tool
integrations"); login-gated TOC read-progress (✓ per step); `views_count`
-based ranking (no view-tracking pipeline exists yet in this codebase —
see D10); `FAQPage` JSON-LD; `/api/guides/*` REST layer (see D6);
`hreflang`/OG dynamic image route `/api/og`; sitemap wiring (no `app/sitemap.ts`
exists yet anywhere in this repo — flag as a pre-existing gap, not something
to newly invent for guides alone).

If, while implementing, any of the above starts creeping back in (e.g. "just
add a quick PDF link" or "let's add an admin form for this") — **stop and flag
it**; it is out of scope per the task's acceptance criteria.

---

## 1. Design decisions that deviate from / resolve gaps in the generic page spec

| # | Page-spec / task tension | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Generic spec's token table references a typography-plugin-style `prose prose-gray max-w-none prose-a:text-primary prose-img:rounded-xl` class for the guide body. | **No `@tailwindcss/typography` plugin exists or is added.** Body content is rendered from **structured blocks** (see D2), each with its own explicit Tailwind classes drawn from the doc's per-element token table (§2: H2 `text-2xl font-semibold scroll-mt-24`, info box `bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg`, etc.), not a `prose` wrapper around opaque HTML. | No page in this repo uses the typography plugin; adding an npm dependency for one page's body copy is disproportionate, and it wouldn't compose with block-typed content anyway (D2 removes the need for prose-over-raw-HTML). |
| D2 | Generic spec: `body[locale]` is a rich-HTML/MDX string from an Admin CMS, sanitized server-side (XSS) before render (`<GuideBody html={string} />`, `dangerouslySetInnerHTML`). | **No CMS in this task**, so there is no untrusted-HTML input path at all. Store guide body as a **typed JSON block array** per locale: `type GuideBlock = { kind: 'heading'; text: string; level: 2 | 3 } | { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] } | { kind: 'info'; text: string } | { kind: 'warning'; text: string } | { kind: 'tool_cta'; tool: 'mortgage' \| 'home_value' \| 'search'; label: string }`. `GuideBody` maps this array to plain JSX per `kind` — **no `dangerouslySetInnerHTML` anywhere**, no sanitizer dependency needed. Seeded directly as JSON in the migration/seed script. | Removes an entire XSS-sanitization concern (and its untested dependency) for content that, in this task, is only ever written by a trusted seed script/service-role — not by any CMS or user input. Cleanly satisfies "no admin CMS" without half-building an HTML pipeline nothing will ever populate safely. If Admin CMS ships later (24-admin.md), it authors the *same* block JSON shape (a block editor), not raw HTML — no rework needed. |
| D3 | Generic spec's component tree includes `<ChecklistDownload attachments />` (client), `attachments[]` field, `POST /api/guides/[slug]/download`, Supabase Storage signed URLs, `leadGateSchema` (email required). | **None of this is built.** No `attachments` column, no download component, no download route. The TOC's "• Checklist" list item and the mobile "sticky bottom download bar" are dropped from the layout. | Task brief explicitly lists "downloadable PDF checklist/lead-capture flow" as out of scope. Building the column/table shape without any working download path would be dead schema; better to add it together with the real feature later. |
| D4 | Generic spec: `<TableOfContents headings progress />` is a client component with `IntersectionObserver` scroll-spy **and** login-gated read-progress checkmarks (✓ per step, Phase 3). | Build TOC in two layers: (1) **headings are precomputed at seed time** as a plain `{ id, text, level }[]` column (`toc` jsonb) — no runtime HTML/DOM parsing needed since body is already block-typed (D2) and every `heading` block already carries the anchor text; (2) a **small client component** (`GuideToc.tsx`) does scroll-spy highlighting (`IntersectionObserver`) and the mobile collapsible-accordion behavior only — **no login/progress checkmarks**. | Progress-tracking requires a user-progress table + auth-aware read state, which is Phase-3 scope not requested here. Precomputing `toc` at seed time (instead of parsing headings from HTML at request time) is trivial because content is already block-typed, and keeps the client component's job to pure scroll-spy/accordion UI, matching the "interactive parts are client components" line in the generic spec's overview without over-building. |
| D5 | Generic spec: guide body embeds an interactive `<MortgageMiniCalc />` (the same widget as the property page) inline mid-step, in addition to CTA buttons. | **CTA links only** — `tool_cta` blocks (D2) render as `<Link>` buttons to `/mortgage-calculators`, `/home-value`, `/search` (exact routes verified to exist and be indexable — §6). No embedded calculator widget inside the guide body. | Acceptance criteria states verbatim: "reuse existing links... do not build new tool integrations." Embedding `components/property/MortgageMiniCalc.tsx` inside a guide page is a new integration surface (new props/context, new local state ownership inside prose flow) beyond a link — out of scope for this MVP. |
| D6 | Generic spec defines a `/api/guides`, `/api/guides/[slug]`, `/api/guides/[slug]/related`, `/api/guides/[slug]/download` REST layer that the SSR pages call. | **No new `/api/guides/*` routes.** Both `app/[locale]/guides/page.tsx` and `app/[locale]/guides/[slug]/page.tsx` query Supabase **directly** server-side via `createServerClient()` (anon key; RLS's public-SELECT-published policy is the only access boundary needed for these public reads — see §4). Related guides are fetched with a second direct query in the same Server Component (same category, `updated_at DESC`, excluding the current slug, `LIMIT 4`), not a separate endpoint. | Matches this repo's own precedent: `app/[locale]/favorites/page.tsx` queries Supabase directly for its count; `search`/`property` pages go through `/api/*` only because they already had that layer for client-side re-fetching (infinite scroll, filter changes) — guides has **no client-side re-fetch requirement** in this MVP (search is a full-page SSR reload via URL param, §7), so an API layer would be pure unused indirection. Keeps the diff minimal per `CLAUDE.md`. |
| D7 | Generic spec: featured guides = `ORDER BY views_count DESC LIMIT 3` or "Admin pin." | Add a simple `featured boolean NOT NULL DEFAULT false` column. Hub featured section = `WHERE featured = true AND status = 'published' ORDER BY updated_at DESC LIMIT 3`; if fewer than 3 rows are flagged, backfill the remainder with the most-recently-updated published guides (still excluding duplicates). Seed script flags 2–3 sample guides `featured = true`. `views_count` is **not** added — there is no view-tracking pipeline anywhere in this codebase yet (no `lib/analytics/*`, no `guide_view` write path), so a column nothing ever increments would be dead/misleading. | No CMS pin-UI exists to set `featured` either, but a boolean the seed script sets is much cheaper to reason about and test than a view counter with no writer, and matches the doc's own fallback ("...or an Admin pin"). |
| D8 | — (repo-specific finding, not a spec/task tension) | **Verified before writing any CTA:** `/mortgage-calculators`, `/home-value`, and `/search` all exist today as real, SSR, indexable, locale-prefixed pages (`app/[locale]/mortgage-calculators/page.tsx`, `app/[locale]/home-value/page.tsx`, `app/[locale]/search/page.tsx`). Tool CTAs must link to exactly these three paths (via the `Link` helper from `@/i18n/navigation`, which auto-prefixes the current locale) — not `/mortgage/calculators` (a route that does **not** exist; see the note in `docs/design/13-mortgage-calc-handoff.md` D1 about this exact naming trap) and not a bare, non-locale-prefixed `href`. | Directly satisfies the acceptance criterion "Inline tool CTAs link to existing, already-built routes only... verify the target routes exist in the repo — no placeholder 404 links." |
| D9 | — (repo-specific finding) | `components/layout/Header.tsx` **already** links to `/guides?category=buyer`, `?category=seller`, `?category=renter`, `?category=finance`, `?category=selling-tips`, `?category=renting-tips`, and a hardcoded slug `/guides/why-an-agent`. This task's seed data **must** include: (a) at least one published guide per canonical category `buyer/seller/renter/finance` (so those four nav links are never empty), and (b) a guide with `slug = 'why-an-agent'` (so that direct nav link is never a 404). The two non-canonical category values in nav (`selling-tips`, `renting-tips`) are a **pre-existing nav inconsistency** — this task does not add a 5th/6th category to chase them (see D-taxonomy below); instead the hub's category filter must degrade gracefully (§7: unknown category → "No guides in this category yet" state, never a 500/exception). | Prevents this task from shipping a page that is itself fine but leaves already-existing nav links (written before this task, presumably in anticipation of it) pointing at empty or 404 results. Flagging, not silently "fixing" `selling-tips`/`renting-tips` in `Header.tsx`, keeps the diff scoped to this task (those look like Phase-2 blog-tag values from a different page's nav, not this page's taxonomy — a nav audit is a separate task). |
| D10 | Generic spec's E-E-A-T author block: `author: { id, name, avatar, credentials }`, implying an authors table/join and an Admin-managed profile. | **Flatten to inline columns** on `guides` itself: `author_name text`, `author_credentials text` (both nullable, plain strings). No `author_id` FK, no join, no avatar upload. | No Admin CMS exists to manage author profiles in this task, and there's no existing `agents`/`profiles` linkage requirement in the acceptance criteria. Two plain text columns still satisfy the doc's E-E-A-T intent ("visible... credentials") in the `Article` JSON-LD's `author.name` field without inventing an entities/relations layer for content nothing here writes to yet. |
| D11 | Generic spec: `updated_at` display as "Updated {date}" (evergreen, no `published_at`). | Keep both `status` (`'draft' \| 'published'`, drives RLS §4) and `updated_at` (drives display + `dateModified` + related-guides ordering + `lastmod`-equivalent), but **no `published_at`** column — matches the doc's own explicit distinction from `blog_posts`. | Directly what the task brief asks for ("distinct from `blog_posts`... `updated_at`, etc."). |

---

## 2. Component inventory

```
supabase/migrations/
  0011_guides.sql                    (NEW — table + RLS policies, §4)

supabase/seed.sql                    (EDIT — append INSERT statements for
                                       ~6-8 sample guides covering all 4
                                       categories + `why-an-agent` + 2-3
                                       `featured = true`, §5)

app/[locale]/guides/
  page.tsx                           (NEW — Server Component, SSR hub:
                                       generateMetadata + direct Supabase
                                       query for featured/sections/search,
                                       §6/§7)
  [slug]/
    page.tsx                         (NEW — Server Component, SSR guide:
                                       generateMetadata + JSON-LD + direct
                                       Supabase query + related-guides query,
                                       §8/§9)
    not-found.tsx                    (NEW — "Guide not found" + [Go to
                                       guides] link, mirrors
                                       app/[locale]/property/[id]/[slug]/not-found.tsx
                                       and app/[locale]/agent/[slug]/not-found.tsx)

components/guides/
  GuideCard.tsx                      (NEW — server, pure-props: icon/cover,
                                       title `line-clamp-2`, excerpt, "N min
                                       read" meta, whole-card <Link>; mirrors
                                       components/search/PropertyCard.tsx's
                                       shell classes minus the client-only
                                       favorite/photo-nav bits)
  FeaturedGuides.tsx                 (NEW — server, pure-props: 3 large cards)
  GuideCategorySection.tsx           (NEW — server, pure-props: H2 + grid of
                                       <GuideCard>, renders nothing when
                                       `guides.length === 0`, §6.4)
  GuidesSearchForm.tsx               (NEW — server-renderable native <form
                                       method="get">, NOT a client component —
                                       see §7, no onSubmit JS needed for a GET
                                       form)
  HubCtaBanner.tsx                   (NEW — server, pure-props: static "Talk
                                       to an agent" banner → /agents)
  GuideHeader.tsx                    (NEW — server, pure-props: H1, "Updated
                                       {date}" + reading time + author line,
                                       cover image)
  GuideToc.tsx                       (NEW — client, `'use client'`: scroll-spy
                                       IntersectionObserver on desktop,
                                       collapsible <details> on mobile — no
                                       login/progress, D4)
  GuideBody.tsx                      (NEW — server, pure-props: maps
                                       GuideBlock[] to JSX per `kind`, §6.9;
                                       no dangerouslySetInnerHTML, D2)
  InfoBox.tsx / WarningBox.tsx        (NEW — server, tiny pure-props wrappers,
                                       `role="note"`, §9)
  ToolCtaButton.tsx                  (NEW — server, pure-props: one of the 3
                                       fixed CTA targets, D5/D8)
  RelatedGuides.tsx                  (NEW — server, pure-props: 3-4
                                       <GuideCard>, data passed in from the
                                       page's direct query, D6 — NOT a client
                                       React-Query component)

lib/guides/
  types.ts                          (NEW — Guide, GuideCard, GuideBlock,
                                       GuideCategory types)
  schemas.ts                        (NEW — guidesSearchParamsSchema,
                                       guideCategorySchema, §7)
  content.ts                        (NEW — pure helpers: readingTimeMinutes,
                                       buildTocFromBlocks (dev/test aid),
                                       pickLocalizedText fallback chain,
                                       unit-tested, §11)
```

Reuse, don't fork: `components/property/Breadcrumbs.tsx` (import directly —
its `itemScope`/`itemType="https://schema.org/BreadcrumbList"` microdata
already satisfies §3.1's "rendered with BreadcrumbList structured data"
requirement, no separate `BreadcrumbList` JSON-LD block needed), the card
shell classes from `components/search/PropertyCard.tsx`
(`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all
duration-200 hover:shadow-md`), `lib/utils.ts`'s `cn()`, `lib/locale.ts`'s
`safeLocale()`, the `Link` helper from `@/i18n/navigation` (auto-prefixes
locale — use for every internal href, including the tool CTAs), and the
Server-Component-shell + `generateMetadata` pattern from
`app/[locale]/mortgage-calculators/page.tsx` / `app/[locale]/home-value/page.tsx`.

---

## 3. Wireframes

### 3.1 Guides Hub — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Guides                                                │
│ H1 "Guides" (text-3xl font-bold)                             │
│ Subtitle (text-sm text-gray-500, max-w-2xl)                  │
│ [🔍 Search guides…            ] [Search]  (GET form)         │
├────────────────────────────────────────────────────────────┤
│ ── Most popular guides ── (3 large cards, grid-cols-3)       │
├────────────────────────────────────────────────────────────┤
│ ## For buyers                                                │
│ ┌─card─┐ ┌─card─┐ ┌─card─┐   grid-cols-3                     │
│ ## For sellers          (hidden entirely if 0 guides)         │
│ ## Renter / Landlord                                          │
│ ## Mortgage / Finance                                        │
├────────────────────────────────────────────────────────────┤
│ CTA banner "Not sure where to start? Talk to an agent"       │
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Guides Hub — search results view (`/guides?search=budget`)

```
Home › Guides
H1 "Guides"
[🔍 budget                     ] [Search]
"6 guides matching “budget”"                    (results heading replaces
                                                  Featured + category sections)
┌─card─┐ ┌─card─┐ ┌─card─┐ ┌─card─┐             (flat grid, no category
                                                  grouping while searching)
— or, if zero matches —
"Nothing found for “budget”."
"Try one of these guides instead:"
┌─card─┐ ┌─card─┐ ┌─card─┐                        (3 featured guides as
                                                    suggestions)
```

### 3.3 Guide Page — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Guides › First apartment buying guide                 │
├───────────────────┬────────────────────────────────────────┤
│ ► TOC (sticky      │ H1 (text-4xl font-bold leading-tight)   │
│   top-24)          │ "Updated Jun 10, 2026" · "12 min read"  │
│ • Step 1 Budget    │  · by {author_name} ({author_credentials})│
│ • Step 2 Search    │ Intro paragraph                          │
│ • Step 3 Viewing   │ ┌── cover, h-[420px] rounded-xl ──┐       │
│ • Step 4 Deal      │ └───────────────────────────────────┘    │
│                    │ ## Step 1 — Budget           (scroll-mt-24)│
│  (no download card │   paragraph(s)                            │
│   — D3)            │   💡 info box                              │
│                    │   [Calculate my mortgage ▸] → /mortgage-  │
│                    │                                calculators │
│                    │ ## Step 2 — Search                        │
│                    │   [Value your home ▸] → /home-value       │
│                    │   [Search properties ▸] → /search         │
│                    │   ⚠ warning box                            │
│                    │ … more steps …                             │
├───────────────────┴────────────────────────────────────────┤
│ "Ready for the next step" end CTA → /search /agents /calc     │
│ ── Related guides ── (3-4 cards, same category)               │
│ FOOTER                                                         │
└────────────────────────────────────────────────────────────┘
```

### 3.4 Mobile (<768px)

```
Hub:                              Guide:
┌──────────────────────────┐     ┌──────────────────────────┐
│ H1 · 🔍 search             │     │ ‹ Back                     │
│ Featured (scroll-x, snap)  │     │ H1 (text-2xl)              │
│ ## For buyers               │     │ Updated · 12 min · author  │
│ ┌─card (1-col)─┐            │     │ cover (full-bleed)          │
│ …sections stack…            │     │ ▾ Table of contents (acc.) │
│ CTA banner                  │     │ intro                       │
│ FOOTER                      │     │ ## Step 1 …                 │
└──────────────────────────┘     │ tool CTA buttons (full-width)│
                                  │ related guides                │
                                  │ FOOTER                         │
                                  └──────────────────────────┘
```

No sticky bottom download bar (D3 — no checklist in this MVP).

---

## 4. Data model (`supabase/migrations/0011_guides.sql`)

```sql
CREATE TYPE guide_category AS ENUM ('buyer', 'seller', 'renter', 'finance');
CREATE TYPE guide_status AS ENUM ('draft', 'published');

CREATE TABLE IF NOT EXISTS guides (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT           NOT NULL UNIQUE,
  category          guide_category NOT NULL,
  status            guide_status   NOT NULL DEFAULT 'draft',
  featured          BOOLEAN        NOT NULL DEFAULT false,
  title             JSONB          NOT NULL,  -- { hy, ru, en } — at least one key
  excerpt           JSONB          NOT NULL,  -- { hy, ru, en }, ≤ 155 chars each
  body              JSONB          NOT NULL,  -- { hy, ru, en }, each a GuideBlock[]
  toc               JSONB          NOT NULL DEFAULT '{}'::jsonb, -- { hy, ru, en } → {id,text,level}[]
  cover_url         TEXT,
  author_name       TEXT,
  author_credentials TEXT,
  reading_time      INT            NOT NULL DEFAULT 5,
  step_count        INT            NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX guides_category_idx ON guides (category) WHERE status = 'published';
CREATE INDEX guides_updated_at_idx ON guides (updated_at DESC);
CREATE INDEX guides_slug_idx ON guides (slug);

ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Public: only published guides are readable, by anyone (incl. anonymous)
CREATE POLICY "guides: published are public"
  ON guides
  FOR SELECT
  USING (status = 'published');

-- No INSERT/UPDATE/DELETE policy is created for the anon/authenticated roles
-- at all — this table is written exclusively via the service-role client
-- (the seed script / a future Admin CMS), which bypasses RLS by design. This
-- mirrors the task brief's own wording ("INSERT/UPDATE restricted to service
-- role") and the repo's existing pattern in
-- 0010_home_value_estimates.sql (service-role-only writer, RLS policy is
-- defense-in-depth for the narrower authenticated-write case only — here
-- there is no authenticated-write case at all, so no policy is needed).
```

`updated_at` auto-touch: reuse whatever `moddatetime`/trigger convention the
existing migrations already use for other tables (check
`0001_init.sql`/`0004_listing_wizard.sql` for the exact trigger name before
adding a new one — don't duplicate a differently-named trigger function for
the same job).

`GuideBlock` (`lib/guides/types.ts`, D2):

```ts
export type GuideBlock =
  | { kind: 'heading'; id: string; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'info'; text: string }
  | { kind: 'warning'; text: string }
  | { kind: 'tool_cta'; tool: 'mortgage' | 'home_value' | 'search'; label: string }
```

`toc[locale]` is derived once at seed time from that locale's `heading`
blocks (`{ id, text, level }[]`) — not recomputed at request time.

---

## 5. Seed data (`supabase/seed.sql`, append)

Minimum for acceptance criteria + D9:

| slug | category | featured | locales seeded |
|---|---|---|---|
| `why-an-agent` | buyer | true | hy, ru, en (Header links here directly) |
| `first-apartment-buying-guide` | buyer | true | hy, ru, en |
| `complete-selling-guide` | seller | true | hy, ru, en |
| `renters-guide-to-armenia` | renter | false | hy, en |
| `landlord-basics` | renter | false | hy, en |
| `mortgage-basics` | finance | false | hy, ru, en |
| `down-payment-explained` | finance | false | hy, en |

7 guides ⇒ every canonical category has ≥1, ≥3 are `featured = true` (D7's
fallback-to-recent still exercises the "fewer than 3 flagged" branch if the
seed script only flags 2), and one row's `slug` matches the hardcoded
`Header.tsx` link. Two rows deliberately seed only `hy`/`en` (not `ru`) to
exercise the per-locale fallback chain (D11-adjacent) in the guide page and
prove the "Available in {locale} only" style gap is handled without crashing
— rendered as a quiet fallback-to-`en` (no extra "translation missing" badge
UI in this MVP; that's the doc's `hreflang`/badge nuance, not required by
this task's acceptance criteria, but the fallback itself must not 500).

---

## 6. Hub page (`/guides`) — layout tokens

| Element | Class string |
|---|---|
| H1 | `text-3xl font-bold text-gray-900` |
| Subtitle | `text-sm text-gray-500 mt-1 max-w-2xl` |
| Search input | `h-11 w-full border border-gray-300 rounded-lg pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary` with a `Search` (lucide) icon absolutely positioned `left-3 top-1/2 -translate-y-1/2 text-gray-400` |
| Search submit button | `h-11 px-5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors` |
| Section heading (H2) | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8` |
| Section grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5` |
| Guide card | `bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md p-5` (mirrors `PropertyCard.tsx`'s shell exactly) |
| Card icon (fallback when no cover) | `w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center` |
| Card title | `text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors` |
| Card meta | `text-xs text-gray-400 mt-2` (e.g. "7 steps · 12 min read") |
| Featured card (large) | same shell, `sm:col-span-1 lg:row-span-1`, cover `h-40 rounded-t-xl` above the text block |
| Hub CTA banner | `bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-10` |
| Skeleton (N/A — SSR only, no client loading state on first paint) | — |

Mobile featured row: `flex gap-4 overflow-x-auto snap-x snap-mandatory
-mx-4 px-4 pb-2` with each card `w-64 flex-shrink-0 snap-start` (matches
the doc's "featured horizontal scroll" responsive note, §6 of the generic
spec, plain CSS scroll-snap — no JS carousel library needed).

---

## 7. Search & category filtering (server-driven, shareable URL)

`app/[locale]/guides/page.tsx` reads `searchParams` (`search`, `category`)
and validates with `lib/guides/schemas.ts`:

```ts
import { z } from 'zod'

export const guideCategorySchema = z.enum(['buyer', 'seller', 'renter', 'finance'])

export const guidesSearchParamsSchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    // strip ILIKE wildcard-injection characters before building the pattern —
    // the Supabase client's .ilike() is parameterized (no string-concatenated
    // SQL either way), but a user-supplied '%'/'_' would still change the
    // *meaning* of their own search (e.g. matching everything), so normalize
    // it out rather than surprise them with unrelated results.
    .transform((s) => s.replace(/[%_]/g, ''))
    .optional()
    .catch(undefined),
  category: guideCategorySchema.optional().catch(undefined),
})
```

Same `.catch()`-to-safe-default convention as `lib/favorites/schemas.ts`'s
`favoriteSortSchema` and `app/[locale]/search/page.tsx`'s try/catch around
`parseSearchParams` — **malformed input never throws**, it silently falls
back to "no filter" (shows the default hub) rather than a 500 (D9's "never
error on an unknown category" requirement).

Query construction (direct Supabase call per D6):

```ts
let query = supabase.from('guides').select('*').eq('status', 'published')
if (parsed.category) query = query.eq('category', parsed.category)
if (parsed.search) {
  query = query.or(
    `title->>en.ilike.%${parsed.search}%,title->>hy.ilike.%${parsed.search}%,` +
    `title->>ru.ilike.%${parsed.search}%,excerpt->>en.ilike.%${parsed.search}%`
  )
}
```

(Use the Supabase JS client's own parameter binding for `.or()`/`.ilike()` —
never hand-build the surrounding SQL string beyond the fixed template above;
`parsed.search` is already wildcard-stripped and length-capped before it
reaches this call.)

Because both `search` and `category` are plain `searchParams` read by a
Server Component with no client-side re-fetch, the resulting URLs
(`/guides?search=budget`, `/guides?category=buyer`) are fully shareable and
crawlable, satisfying the acceptance criterion verbatim. `GuidesSearchForm`
is a **plain server-rendered `<form method="get" action="/guides">`** — no
`'use client'`, no `onSubmit` handler, no JS required for the core
search-and-reload behavior (progressive enhancement; this is simpler than
the generic spec's implied client component and still meets "shareable/
crawlable").

Empty-section rule (§3.4 of the generic spec): a category section with 0
guides renders **nothing** (no heading), and an out-of-taxonomy `category`
value (already stripped by the zod `.catch()` above, so this specifically
covers `selling-tips`/`renting-tips` from D9) falls through to "no filter
matched" → render a single message: `"No guides in this category yet."` +
link back to `/guides` (unfiltered) — never a crash, never a blank white page.

---

## 8. Guide page (`/guides/[slug]`) — layout tokens

| Element | Class string |
|---|---|
| H1 | `text-2xl sm:text-4xl font-bold leading-tight text-gray-900` |
| Meta line | `text-sm text-gray-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-2` ("Updated {date}" · "{n} min read" · "by {author_name}") |
| Cover | `next/image`, `priority`, `w-full h-[220px] sm:h-[420px] object-cover rounded-xl mt-6`, `alt={title}` |
| TOC nav (desktop) | `hidden lg:block sticky top-24 w-56 flex-shrink-0`, `<nav aria-label="Table of contents">` |
| TOC link (default) | `block text-sm text-gray-600 hover:text-primary py-1.5 pl-3 border-l-2 border-transparent transition-colors` |
| TOC link (active, `aria-current="true"`) | `text-primary font-medium border-l-2 border-primary pl-3` |
| TOC (mobile) | `<details className="lg:hidden border border-gray-200 rounded-lg p-3 mt-4"><summary className="text-sm font-medium text-primary cursor-pointer select-none">Table of contents</summary>...</details>` |
| Body wrapper | `max-w-[760px] mt-6 space-y-4` |
| Step heading (H2) | `text-2xl font-semibold scroll-mt-24 mt-8` |
| Sub-heading (H3) | `text-lg font-semibold scroll-mt-24 mt-6` |
| Paragraph | `text-base text-gray-700 leading-relaxed` |
| List | `list-disc pl-5 space-y-1 text-gray-700` |
| Info box | `bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg flex gap-2 items-start text-sm text-blue-900` (💡 icon or `Info` lucide icon, `role="note"`) |
| Warning box | `bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg flex gap-2 items-start text-sm text-amber-900` (`AlertTriangle` lucide icon, `role="note"`) |
| Tool CTA button | `inline-flex items-center gap-1.5 border border-primary text-primary h-11 rounded-lg px-5 font-medium hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` |
| End CTA section | `bg-primary/5 border border-primary/20 rounded-xl p-6 mt-10` |
| Related guides heading | `text-xl font-semibold mt-10 mb-4` |
| Related guides grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5` |

Two-column layout (desktop): `<div className="lg:flex lg:gap-10 lg:items-start">` wrapping `<GuideToc>` (fixed `w-56`) and the body column (`flex-1 min-w-0`) — same structural idiom as the property page's `lg:grid lg:grid-cols-[minmax(0,1fr)_380px]`, just flex instead of grid since there's no fixed-px sidebar here.

---

## 9. `HowTo` / `Article` JSON-LD (§9 of the generic spec, MVP-scoped)

Always emit `Article` (every guide qualifies); additionally emit `HowTo`
when the guide's blocks contain ≥ 2 `heading` blocks at `level: 2` (i.e. it
actually has "Step 1 / Step 2 / …" structure — derived straight from the
already-stored `body`/`toc`, no extra CMS field). Combine via `@graph`,
exactly like `property/[id]/[slug]/page.tsx` already does for
`RealEstateListing` + `BreadcrumbList`:

```ts
const steps = toc[locale].filter((h) => h.level === 2)

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: title,
      description: excerpt,
      image: coverUrl ? [coverUrl] : undefined,
      dateModified: guide.updated_at,
      author: guide.author_name ? { '@type': 'Person', name: guide.author_name } : undefined,
      publisher: { '@type': 'Organization', name: 'RE Platform' },
    },
    ...(steps.length >= 2
      ? [
          {
            '@type': 'HowTo',
            name: title,
            step: steps.map((s) => ({ '@type': 'HowToStep', name: s.text })),
          },
        ]
      : []),
  ],
}
```

`BreadcrumbList` structured data is already covered by reusing
`components/property/Breadcrumbs.tsx`'s microdata (D-reuse) — do **not**
duplicate it a third way inside this `jsonLd` object.

`canonical` = `/${locale}/guides/${slug}` (slug is stable — no redirect
table in this MVP; the doc's "301 → old slug" state is Phase-3/CMS-editing
scope, not applicable when nothing can rename a slug yet).

---

## 10. Full list of page states (MVP subset of the generic spec's §4)

| State | What is displayed |
|---|---|
| Loaded (hub) | Full hub: featured + sections, or search results |
| Loaded (guide) | Full guide |
| Empty (search, 0 results) | "Nothing found for “{query}”." + 3 featured guides as suggestions |
| Empty (category, 0 results / unknown category) | "No guides in this category yet." + link back to `/guides` |
| Untranslated (guide missing one locale) | Silent fallback to `en` → `hy` → first available key (no crash); no "Armenian only" badge in this MVP (deferred, not required by acceptance criteria) |
| 404 (bad slug) | `not-found.tsx`: "Guide not found" + `[Go to guides]` link to `/guides` |
| No checklist | N/A — checklist card never renders at all in this MVP (D3), not a conditional state |
| Progress (login) | N/A — deferred (D4) |
| Old slug / 301 | N/A — deferred (no slug-rename path exists yet) |

---

## 11. Accessibility

- `GuideToc`: `<nav aria-label="Table of contents">`, active link gets
  `aria-current="true"` (not just a color change).
- Heading hierarchy: H1 (guide title) → H2 (steps) → H3 (sub-points), no
  skipped levels — enforced by the `GuideBlock` type only allowing `level: 2
  | 3`.
- `InfoBox`/`WarningBox`: `role="note"`, icon + text together (never color
  alone) — exact pattern already used for the generic spec's info/warning
  boxes.
- Tool CTA buttons: descriptive label text (e.g. "Calculate my mortgage",
  never "Click here"), contrast ≥ 4.5:1 (primary-on-white border variant,
  already audited elsewhere in this app), touch target ≥ 44px (`h-11`).
- Search input: `<label htmlFor="guides-search" className="sr-only">Search
  guides</label>` (visible placeholder text is not a substitute for a
  programmatic label).
- Cards: the whole card is one `<Link>` (like `PropertyCard.tsx`), with a
  single accessible name (the title) — no duplicate nested interactive
  elements inside a guide card (no per-card secondary buttons in this MVP,
  unlike the property card's favorite/compare controls).

---

## 12. SEO & metadata (MVP subset of the generic spec's §8)

- `<title>` — guide: `"{title} — Guide | RE Platform"`; hub: `"Real estate
  guides and resources | RE Platform"`.
- `<meta name="description">` — from `excerpt[locale]` (already ≤ 155 chars
  by seed-data convention, §5).
- `canonical` — every page, per §9.
- `alternates.languages` — only for locales actually present as **non-empty**
  keys in that guide's `title`/`body` JSON (mirrors the property page's
  `alternates.languages` pattern) — a guide seeded only `hy`/`en` (§5) emits
  only those two `hreflang` entries, no `ru`.
- `openGraph` — `type: 'article'`, cover image, title, excerpt (same shape
  as the property page's `openGraph` block); no dynamic `/api/og` route in
  this MVP (that's new infra, not requested by the acceptance criteria).
- SSR of the entire body (already true — Server Component, no client fetch
  gate on first paint).
- Internal linking: guide cards cross-link within the hub; related-guides
  block cross-links within a category; tool CTAs cross-link to
  `/mortgage-calculators`/`/home-value`/`/search` (D8) — this is the
  "topical authority cluster" the generic spec asks for, built entirely from
  links already specified above, no extra component needed.

---

## 13. Testing notes

Matches this repo's convention (`environment: 'node'`, `__tests__/*.test.ts`,
logic-only — see `docs/design/13-mortgage-calc-handoff.md` §10 for the
precedent this repeats):

- `__tests__/guidesSchemas.test.ts` — `guidesSearchParamsSchema`: valid
  `search`/`category` parse; `%`/`_` stripped from `search`; over-length
  `search` (>100 chars) rejected/caught; unknown `category` value falls
  through `.catch(undefined)` rather than throwing; `guideCategorySchema`
  accepts exactly the 4 canonical values and rejects e.g. `'selling-tips'`.
- `__tests__/guidesContent.test.ts` — `pickLocalizedText` fallback chain
  (`locale` present → returned as-is; `locale` missing, `en` present →
  falls back to `en`; both missing → falls back to `hy`; all missing →
  first available key); `readingTimeMinutes` (word-count-based, sane
  rounding, never returns 0); a pure helper that derives "has HowTo steps"
  (≥ 2 level-2 headings) from a `GuideBlock[]` fixture, both the true and
  false branches.
- No component-render tests (no `@testing-library/react`/jsdom wired into
  `vitest.config.ts`, consistent with every other page in this repo) — keep
  all testable logic in `lib/guides/`, with `GuideBody.tsx`/`GuideCard.tsx`
  staying thin pure-props renderers.
- Manual/SSR smoke check (per acceptance criteria): load `/hy/guides`,
  `/ru/guides`, `/en/guides`, and `/en/guides/why-an-agent` and confirm
  server-rendered HTML contains the guide content (view-source, not just
  "renders after JS") for all three locales.

---

## 14. Explicit follow-ups (not part of this task)

- Admin CMS editor for guides (block editor authoring the same `GuideBlock[]`
  shape, D2) — `24-admin.md`.
- Downloadable PDF checklist, lead-capture email gate, `download_count`,
  Supabase Storage signed URLs (D3).
- Guide versioning/history UI.
- Login-gated TOC read-progress checkmarks (D4).
- Embedded interactive mortgage mini-calc inside guide body (D5) — CTA link
  only for now.
- `views_count`-based featured ranking + the event pipeline
  (`guide_view`, `guides_search`, `checklist_download`,
  `guide_tool_cta_click`, etc. from the generic spec's §9) — no analytics
  infra exists in this repo yet to hang these on.
- `FAQPage` JSON-LD for guides with an FAQ section.
- `/api/guides/*` REST layer, if a future client-side use case (e.g. an
  Admin preview pane, infinite-scroll hub) actually needs one (D6).
- Old-slug 301 redirects (needs a CMS slug-rename event to exist first).
- `app/sitemap.ts` — no sitemap exists anywhere in this repo yet; wiring
  guides into one is a whole-site concern, not specific to this task.
- "Available in {locale} only" badge UI (currently a silent fallback, §10).
