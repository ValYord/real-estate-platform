# Page 16 — Guides / Resource Center (Guides) 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO (extended), analytics.

**URL.** `/guides` (hub) · `/guides/[slug]` (guide) — e.g. `/hy/guides/arajin-bnakaran-gnelu-ughecuyc`
**Roles.** Everyone (Guest, User, Agent, Admin) can view; guides are created and updated through the Admin CMS (see `24-admin.md`).
**Primary goal.** High-intent "how to" SEO + conversion. A guide educates the user and directs them toward tools (calculators, home-value, search, agents).

---

## 0. Overview

Guides is the **evergreen content engine**: deep, step-by-step guides ("First apartment buying guide", "Complete selling guide", "Mortgage guide"). Unlike the blog, which becomes outdated quickly, a guide stays relevant for months/years and gets **updated** (rather than receiving a new date). The target is informational searches like "how to buy an apartment" or "how much down payment do I need", which bring **high-intent** visitors to the top of the funnel.

The conversion core of a guide: (1) downloadable checklist (PDF, lead capture), (2) inline tool CTAs (mortgage calc, home-value, search), (3) related guides cross-linking (topical authority).

**Difference from the Blog (`15-blog.md`).** Blog = timely news (`blog_posts`, `published_at`, `NewsArticle` schema). Guides = evergreen step-by-step (`guides`, `updated_at`, `HowTo`/`Article` schema, attachments). Different entity, different URL space, different structured data.

The page has **two templates**.
- **Guides Hub** (`/guides`) — thematic sections (journey stage) + guide cards + featured + search + CTA.
- **Guide Page** (`/guides/[slug]`) — header + cover + sticky TOC + step-by-step body + checklist download + tool CTAs + related.

Both render via **SSR**; the interactive parts (TOC scroll-spy, download, embedded calc) are client components.

---

## 1. User scenarios

**Scenario A — First-time buyer Armen (desktop).** Armen searched Google for "how to buy a first apartment in Armenia" and reached the "First apartment buying guide". The left sticky TOC shows him 7 steps. He reads "Step 3 — Budget", where a mortgage mini-calc is embedded → he calculates the monthly payment right there. At the bottom he clicks **"⬇ Download the checklist (PDF)"** → he receives the checklist. → `checklist_download` event, lead++.

**Scenario B — Seller Nare (mobile).** Nare opens the "Selling guide" on her phone. The TOC is a collapsible accordion. She reads "How to price", taps the inline CTA **"Value your home for free ▸"** → lands on `/home-value`. → the funnel worked (`guide_tool_cta_click`).

**Scenario C — Researcher Gayane (desktop).** On the hub, Gayane clicks the **"Mortgage / Finance"** section and sees 4 guides. She reads one, then from "Read also" at the end moves to a second. Internal linking keeps her on the site for 12 minutes. → topical authority + engagement signal.

---

## 2. Layout & visual structure

### Guides Hub — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Guides                                │
│ H1 «Guides» (text-3xl) · subtitle · 🔍 search              │
├────────────────────────────────────────────────────────────┤
│ ── Most popular guides (featured, 3 large cards) ──        │
├────────────────────────────────────────────────────────────┤
│ ## For buyers                                               │
│ ┌─card─┐ ┌─card─┐ ┌─card─┐  (grid-cols-3)                   │
│ │icon  │ │icon  │ │icon  │  title · «7 steps» · «12 min»   │
│ └──────┘ └──────┘ └──────┘                                  │
│ ## For sellers                                              │
│ ┌─card─┐ ┌─card─┐                                           │
│ ## Renter / Landlord                                        │
│ ## Mortgage / Finance                                       │
├────────────────────────────────────────────────────────────┤
│ CTA banner «Not sure where to start → Talk to an agent»    │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Guide Page — Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Guides › First apartment               │
├───────────────────┬────────────────────────────────────────┤
│ ► TOC (sticky      │ ◄ GUIDE BODY (max-w-[760px])           │
│   top-24,          │ H1 (text-4xl)                          │
│   scroll-spy)      │ «Updated 2026-06» · 12 min · expert    │
│ ✓ Step 1 Budget    │ intro paragraph                        │
│ • Step 2 Search    │ ┌── cover h-[420px] ──┐                 │
│ • Step 3 Viewing   │ └──────────────────────┘                │
│ • Step 4 Deal      │ ## Step 1 — Budget                      │
│ • Checklist        │   text · info box · image               │
│                    │   [⬇ Download checklist (PDF)]          │
│ ┌── download ──┐   │ ## Step 2 — Search                      │
│ │ checklist PDF │   │   [embedded mortgage mini-calc]        │
│ └───────────────┘  │   [Value your home ▸] CTA              │
│                    │ … steps …                               │
├───────────────────┴────────────────────────────────────────┤
│ CTA «Ready for the next step» · ── Related guides ──        │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐   ┌──────────────────────────┐
│ HEADER (h-14)            │   │ HEADER                   │
├──────────────────────────┤   ├──────────────────────────┤
│ H1 · 🔍 search           │   │ ‹ Back                   │
│ Featured (scroll-x)      │   │ H1 (text-2xl)            │
│ ## For buyers            │   │ Updated · 12 min         │
│ ┌─card (1-col)─┐         │   │ cover (full-bleed)       │
│ └──────────────┘         │   │ ▾ Table of contents (acc.)│
│ ## For sellers …         │   │ intro                    │
│ … sections stack …       │   │ ## Step 1 …              │
│ CTA banner               │   │ [⬇ Checklist (sticky)]   │
│ FOOTER                   │   │ tool CTAs · related      │
└──────────────────────────┘   │ FOOTER                   │
                               └──────────────────────────┘
```

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 (hub) | `text-3xl font-bold text-gray-900` |
| H1 (guide) | `text-4xl font-bold leading-tight` (mobile: `text-2xl`) |
| Section heading | `text-xl font-semibold border-t border-gray-200 pt-6 mt-8` |
| Guide card | `shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition` |
| Card icon | `w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center` |
| Card meta | `text-xs text-gray-400` ("7 steps · 12 min read") |
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

## 3. Section-by-section

### 3.1 Breadcrumbs

- **Appearance.** `text-sm text-gray-500`, separator `›`, rendered with `BreadcrumbList` structured data.
- **Hub.** `Home › Guides`. **Guide.** `Home › Guides › First apartment…`.
- **Mobile (guide).** `‹ Back` link → `/guides`.

### 3.2 Hub header & search

- **H1** `text-3xl`, subtitle: SEO text (1-2 sentences, max-w-2xl).
- **Search.** `🔍` + input, placeholder "Search guides…". Submit → `/guides?search=[q]` (SSR full-text `title`+`body`). Empty: "Nothing found" + suggested guides.

### 3.3 Featured / Popular guides

- "Most popular guides" — 3 large cards (cover + title + meta). Data: `guides ORDER BY views_count DESC LIMIT 3` or an Admin pin.
- **Click** → `/guides/[slug]`.

### 3.4 Thematic sections (hub categories)

- **Grouping by journey stage.** `For buyers · For sellers · Renter / Landlord · Mortgage / Finance`. Internal value: `buyer/seller/renter/finance`.
- Each section: H2 heading + guide cards grid (`grid-cols-3`, mobile 1).
- **Empty section** (no guides) → the entire section is hidden (no empty heading shown).

### 3.5 Guide card

- **Content.** icon/cover · title (`line-clamp-2`) · short description · "7 steps" badge · "12 min read" · progress bar (if logged in and started).
- **Behavior.** The entire card is clickable → `/guides/[slug]`. On hover: `shadow-md`, title turns `text-primary`.
- **Data.** `GET /api/guides?category=&search=&lang=`.

### 3.6 Hub CTA banner

- "Not sure where to start" + **[Talk to an agent]** → `/agents` · (optional) email signup.

### 3.7 Guide header & cover (guide page)

- **H1** (`text-4xl`): `title[locale]`.
- **Meta.** "Updated [date]" (not published — evergreen) · "12 min read" · author/expert avatar + credentials (E-E-A-T).
- **Intro.** Short paragraph: "What you'll learn from this guide" (bullet list, optional).
- **Cover.** `next/image priority`, `h-[420px] rounded-xl`, alt = title.

### 3.8 Table of contents (TOC) — sticky

- **Generation.** Auto from the body's H2/H3, with the list of steps.
- **Desktop.** Sticky left sidebar (`top-24`), scroll-spy active highlight (IntersectionObserver). When logged in: read steps marked ✓ (progress).
- **Mobile.** Collapsible accordion "▾ Table of contents".
- **Behavior.** Click anchor → smooth scroll + hash update.

### 3.9 Step-by-step body

- **Structure.** "Step 1 … Step N …" with H2; each section: explanation, image (alt+lazy), example, **info box** (💡 tip) / **warning box** (⚠️ caution).
- **Render.** CMS rich content (sanitized HTML/MDX), `prose` styling.
- **Language.** `body[locale]`; missing translation → fallback to default + badge "Available in Armenian only".

### 3.10 Downloadable checklist

- **Appearance.** Download card (`bg-primary/5 border`): "📋 First-buyer checklist" + **[⬇ Download (PDF)]**.
- **Behavior.** Click → downloads the PDF (`guide.attachments[]`, Supabase Storage signed URL). Phase 2: lead capture behind login (email gate). Track: `POST /api/guides/[slug]/download` → `download_count++`.
- **Edge.** No attachment → the entire card is hidden.

### 3.11 Embedded calculators / tool CTA

- **Inline embed.** Mortgage mini-calc (the same component from the property page, local state).
- **CTA buttons.** **[Calculate my mortgage]** → `/mortgage/calculators` · **[Value your home]** → `/home-value` · **[Search properties]** → `/search`. Each one an internal link (SEO funnel + `guide_tool_cta_click`).

### 3.12 Related guides & end CTA

- **Related guides.** 3-4 cards → `GET /api/guides/[slug]/related` (same category/tag).
- **End CTA.** "Ready for the next step" → search / agents / calculators.
- **Newsletter (inline, optional).** Email signup (the same component from the blog).

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading (hub)** | Featured skeleton + section card skeletons |
| **Loading (guide)** | Title bar + cover + prose line skeleton + TOC skeleton |
| **Loaded** | Full hub / guide |
| **Empty (search)** | "Nothing found" + suggested guides |
| **Untranslated** | hy/default fallback + badge "Available in Armenian only"; `hreflang` not set |
| **No checklist** | Download card hidden |
| **Progress (login)** | ✓ on read steps in the TOC (Phase 3) |
| **404 (bad slug)** | "Guide not found" + [Go to guides] |
| **Old slug** | 301 redirect to new slug |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<GuidesHubPage> (Server Component, SSR)
 ├─ <Breadcrumbs />
 ├─ <GuidesSearch defaultQuery />          (client)
 ├─ <FeaturedGuides guides />
 ├─ <GuideCategorySection title guides />   (×4 stages)
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

### Data fields used (`guides` — separate from `blog_posts`, see 00-SPEC §7)

`id, slug, title{hy,ru,en}, intro{hy,ru,en}, body{hy,ru,en}, cover, category, author_id, attachments[], reading_time, step_count, views_count, download_count, updated_at` + `author{id, name, avatar, credentials}`

### API contracts

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
// 401      { "error": "auth_required" }   → login modal (if lead-gate is enabled)
// 404      { "error": "attachment_not_found" }
```

### Validation (zod)

```ts
const downloadSchema = z.object({
  attachmentId: z.number().int().positive(),
});
// in lead-gate-enabled mode: email required
const leadGateSchema = z.object({
  email: z.string().email("Անվավեր էլ. հասցե"),
  attachmentId: z.number().int().positive(),
});
```

- Guide body: server-side sanitize (XSS) for the CMS HTML.
- Download URL: short-lived signed link (Supabase Storage), not a public direct URL.
- Download count: +1, dedupe by `session_id + attachment_id` (24h).

---

## 6. Responsive

- **≥1024px (lg).** Hub: 3-column grid with sections. Guide: two-column (sticky TOC left `top-24` + body).
- **768–1023px (md).** Hub: 2-column. Guide: body + collapsible TOC (rail hidden), download card inline.
- **<768px (sm).** Hub: 1-column, featured horizontal scroll. Guide: `‹ Back`, accordion TOC, full-bleed cover, **sticky bottom download bar** "⬇ Checklist".

---

## 7. Accessibility

- TOC: `<nav aria-label="Table of contents">`, active anchor: `aria-current`.
- Correct step heading hierarchy (H1 → H2 → H3, no skipping).
- Info/warning box: `role="note"` + visible icon + text (not color alone).
- Download button: `aria-label` ("Download checklist, PDF, 240KB"). Embedded calc: keyboard-accessible sliders.
- Tool CTA buttons: meaningful label (not "click here"). Contrast ≥ 4.5:1, touch target ≥ 44px.

---

## 8. SEO & meta (extended — evergreen content)

- **`<title>`** = unique per guide (target: "how to"/informational queries, editable from the CMS), fallback: "{title} — Guide | {brand}". Hub: "Real estate guides and resources | {brand}".
- **`<meta name="description">`** = from the intro or a manual CMS field (≤ 155 chars).
- **Structured data (JSON-LD).** Step-by-step guide: `HowTo` (`step[]`, `totalTime`, `tool`, `supply`) + `Article` (author, dateModified, publisher). If the guide has an FAQ section: `FAQPage`. + `BreadcrumbList`.
- **`hreflang`** (hy/ru/en) + `x-default`, **only on translated** variants (from `availableLocales`).
- **`canonical`** on every page (by slug). The slug does not change on update (evergreen URL stability).
- **OG / Twitter Card.** `og:type=article`, cover + title + intro. Dynamic OG: `/api/og?type=guide&slug=…`.
- **Sitemap.xml.** Auto-included, **high crawl priority** (evergreen, stable), `lastmod = updated_at`.
- **SSR** of the entire body (crawl).
- **Internal linking hub.** Guides cross-link to one another + blog + calculators + search → **topical authority cluster**.
- **E-E-A-T.** Author/expert credentials + visible update date + sources/citations in the body.
- **Freshness.** Periodic content updates → `dateModified` update (Google freshness signal).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `guides_hub_view` | Hub load | `category` |
| `guide_view` | Guide load (dedupe 24h) | `slug, category` |
| `guide_read_complete` | Last TOC step visible | `slug, reading_time` |
| `guide_section_view` | Step section scroll | `slug, step` |
| `guides_search` | Search submit | `query, results_count` |
| `checklist_download` | Download success | `slug, attachment_id` |
| `guide_tool_cta_click` | Tool CTA / inline link | `slug, target_url` |
| `embedded_calc_used` | Mini-calc slider | `slug` |
| `related_guide_click` | Related card click | `slug, target_slug` |
| `guide_card_click` | Hub card click | `slug, category` |
