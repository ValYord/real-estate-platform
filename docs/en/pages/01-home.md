# Page 01 — Home 🟢 Phase 1

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/sizes/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data, API), responsive, accessibility, SEO, analytics.

**URL.** `/` → `/hy`, `/ru`, `/en` (locale prefix)
**Roles.** Everyone (Guest, User, Agent, Admin) — same page, small differences in the logged-in state (header CTA, recently viewed).
**Primary goal (conversion).** Push the visitor **toward search**. The page's #1 action is the hero search; the secondary goal is to take owners toward the listing wizard ("Post a property").

---

## 0. Overview

Home is the **gateway** of the site. 60–70% of people come to search, so the page's above-the-fold area is entirely dedicated to the hero search with tabs (Buy / Rent / Sell / Estimate). The lower sections are secondary entry points: quick-cards, featured carousel, browse-by-city, property-type shortcuts — all of which ultimately lead to `/search` with the corresponding filter.

The page is rendered with **SSR** (Server Component) for SEO and a fast first paint. The static part of the hero (title, tabs) appears instantly; the dynamic sections (featured, stats, blog) are brought in with a server-side data fetch or streaming. The interactive elements (search autocomplete, carousel, favorite toggle) are client components.

Home **has no owner/visitor mode** (unlike the property page), but it has **guest vs logged-in** nuances: the favorite ♡ buttons work immediately in the logged-in state; for a guest they open a login modal; the "Post a property" CTA takes a guest to `/auth/register?next=/sell/new`, and a logged-in user straight to `/sell/new`.

---

## 1. User scenarios

**Scenario A — Buyer Ani (mobile, guest).** Ani arrived at the home page from Google. She sees the hero — "Find your home in Armenia", selects the **"Buy"** tab, types "Arabk…" in the input, autocomplete suggests "Arabkir, Yerevan", she taps it, then **[🔍 Search]**. → She goes to `/search?deal=sale&city=Yerevan&district=Arabkir`.

**Scenario B — Owner Karen (desktop, logged-in).** Karen wants to sell his apartment. Scrolling, he reaches the **"Selling a property?"** banner and clicks **[Post a property]**. Since he is logged in → `/sell/new` wizard opens directly. → The listing flow has started.

**Scenario C — Browser Mariam (desktop, guest).** Mariam doesn't yet know what she wants. She sees the **"Browse by city"** section and clicks the Gyumri card → `/search?city=Gyumri`. Then she comes back and clicks the ♡ on a property in the featured carousel → a login modal opens: "Sign in to save".

---

## 2. Layout & visual structure

### Desktop (≥1024px) — single column, full-width sections

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ ╔════════════ HERO (h-[520px], bg-image + overlay) ═══════╗ │
│ ║  H1 "Find your home in Armenia" (text-4xl)            ║ │
│ ║  subtitle (text-lg text-white/80)                     ║ │
│ ║  ┌ tabs ─────────────────────────────────────┐         ║ │
│ ║  │ [Buy][Rent][Sell][Estimate]               │         ║ │
│ ║  ├────────────────────────────────────────────┤         ║ │
│ ║  │ [🔍 City, district, address…   ] [Search]  │         ║ │
│ ║  └────────────────────────────────────────────┘         ║ │
│ ╚═════════════════════════════════════════════════════════╝ │
├────────────────────────────────────────────────────────────┤
│ QUICK CARDS (4-col grid)  [New][Reduced][Open House][Sold]  │
├────────────────────────────────────────────────────────────┤
│ FEATURED CAROUSEL  "Featured properties"  ◄ card card card ►│
├────────────────────────────────────────────────────────────┤
│ BROWSE BY CITY (image grid)  Yerevan · Gyumri · Vanadzor … │
├────────────────────────────────────────────────────────────┤
│ PROPERTY TYPE SHORTCUTS (icon row)  Apt · House · Land …    │
├────────────────────────────────────────────────────────────┤
│ ╔ POST-LISTING CTA banner (bg-primary)  [Post a property] ╗ │
├────────────────────────────────────────────────────────────┤
│ TOOLS (3-col)  Mortgage calculator · Estimate · Find agent │
├────────────────────────────────────────────────────────────┤
│ STATS strip  "10,000+ properties · 500+ agents · 3 countries"│
├────────────────────────────────────────────────────────────┤
│ LATEST BLOG (3-col)  article · article · article          │
├────────────────────────────────────────────────────────────┤
│ FOOTER (5 columns)                                          │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — single-column stack

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ HERO (h-[440px])        │
│  H1 (text-2xl)          │
│  tabs (scroll-x)        │
│  [🔍 input full-width]  │
│  [Search full-width]    │
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

- In the hero's search card, on mobile the input and the button stack vertically (`flex-col gap-2`).
- Featured and type-shortcuts horizontally scroll on mobile (`overflow-x-auto snap-x`).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Hero container | `relative h-[520px] md:h-[520px] h-[440px] bg-cover bg-center` |
| Hero overlay | `absolute inset-0 bg-black/40` |
| H1 (hero) | `text-4xl md:text-4xl text-2xl font-bold text-white leading-tight` |
| Subtitle | `text-lg text-white/80 mt-3` |
| Search card | `bg-white rounded-xl shadow-lg p-2 max-w-2xl` |
| Tab (active) | `bg-primary text-white rounded-md px-4 h-10 font-medium` |
| Tab (inactive) | `text-gray-600 hover:bg-gray-100 rounded-md px-4 h-10` |
| Search input | `h-12 flex-1 text-base px-4 outline-none` |
| Primary search button | `bg-primary text-white h-12 px-6 rounded-lg font-medium hover:bg-primary/90` |
| Quick card | `border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-primary transition` |
| Section heading (H2) | `text-2xl font-semibold text-gray-900 mb-6` |
| Section wrapper | `max-w-7xl mx-auto px-4 py-12` |
| CTA banner | `bg-primary text-white rounded-2xl p-8 md:p-12` |
| Stats number | `text-3xl font-bold text-primary` |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Header

→ See `00-PRODUCT-SPEC.md` § 9 (the same on every page). On Home the header is `sticky top-0`; at the start of the scroll (over the hero) it can be transparent/translucent, and after scrolling: `bg-white shadow-sm` (transition).

### 3.2 Hero + search

- **Background.** A large photo (Yerevan/residential building) or a subtle video loop; with a `bg-black/40` overlay on top for text contrast. The photo is `priority` (LCP element), `next/image` fill, `object-cover`.
- **Title (H1).** `text-4xl font-bold text-white`. In the selected language (`t("home.hero.title")`). Example: "Find your home in Armenia".
- **Subtitle.** A short trust sentence: "10,000+ verified listings in one place".
- **Search tabs.** `[Buy] [Rent] [Sell] [Estimate]`. The active tab is `bg-primary text-white`, the rest are ghost. Changing the tab changes the input placeholder and the submit destination (local state, not navigation).
  - **Tab "Buy"** → submit goes to `/search?deal=sale&...`
  - **Tab "Rent"** → `/search?deal=rent&...`
  - **Tab "Sell"** → the input is hidden, a single button **[Post a property →]** is shown → `/sell/new` (guest → register)
  - **Tab "Estimate"** → input placeholder "Enter the address for an estimate" → submit → `/home-value?address=...`
- **Search input + autocomplete.** A large input, placeholder depending on the tab ("City, district, address…"). While typing, an autocomplete dropdown opens (`debounce 300ms`, `min 2 chars`) with city/district/address suggestions, each with an icon (📍 location, 🏙 city).
  - **States.** *default* (placeholder gray), *focus* (`ring-2 ring-primary`), *typing→loading* (spinner on the right of the input), *results* (dropdown 5–8 rows), *no-match* ("Nothing found — try another place"), *error* (silent fallback: free-text submit).
- **[🔍 Search] button.** Primary, `h-12`. Click → navigate to the selected tab's destination. If the input is empty → goes to `/search` without a location filter (all). The Enter key in the input = submit.

### 3.3 Quick cards (browse shortcuts)

- **Appearance.** 4-column grid (`grid grid-cols-2 md:grid-cols-4 gap-4`). Each card: icon + title + counter (`text-sm text-gray-500`).
- **Cards.**
  - **🆕 New listings** "1,240 new" → `/search?sort=newest`
  - **📉 Price reduced** "320 properties" → `/search?price_reduced=true`
  - **🚪 Open house days** "18 this week" → `/search?open_house=true` (Phase 2)
  - **✅ Recently sold** → `/search?status=sold`
- **Behavior.** The whole card is clickable (`<Link>`). Hover: `shadow-md border-primary`. The counters are live DB count queries (cached 5 minutes). Loading: a skeleton bar instead of the counter.

### 3.4 Featured / Promoted carousel

- **Appearance.** "Featured properties" H2 + a horizontal carousel of **PropertyCard**s (4 visible on desktop, scroll-x on mobile). ←/→ arrow buttons on desktop (`absolute`, `bg-white shadow rounded-full`).
- **Card.** See the PropertyCard component (photo slider, price, ♡, beds/area, address, badge). Card click → `/property/[id]/[slug]`. ♡ toggle: logged-in → optimistic + toast "Added to favorites"; guest → login modal.
- **[See all →]** → `/search` (with the default filter).
- **States.** *Loading*: 4 skeleton cards; *Empty* (no featured): the whole section is hidden (not rendered); *Error*: inline "Couldn't load" + [Retry].

### 3.5 Browse by city

- **Appearance.** Image grid (`grid grid-cols-2 md:grid-cols-4 gap-4`): each card has the city's photo + name overlay (`bg-gradient-to-t from-black/60`) + listing count "Yerevan · 4,200 properties".
- **Cards.** Yerevan, Gyumri, Vanadzor, Dilijan, Abovyan, Hrazdan… (Phase 2: +Moscow, Tbilisi). Click → `/search?city=Yerevan`.
- **Behavior.** Hover: `scale-[1.02]` zoom + overlay darkening. The counts come from the DB.

### 3.6 Property type shortcuts

- **Appearance.** Icon-card row (`flex flex-wrap gap-3` on desktop, scroll-x on mobile). Each shortcut: icon (`w-6 h-6`) + label, `border rounded-lg px-5 py-4 hover:border-primary`.
- **Types.** 🏢 Apartment · 🏡 House/Detached · 🌳 Land · 🏬 Commercial · 🏗 New construction. Click → `/search?type=apartment` (and so on).

### 3.7 Post-listing CTA banner

- **Appearance.** Full-width colored banner (`bg-primary text-white rounded-2xl`), text on the left, button on the right (on mobile: stacked).
- **Microcopy.** Title "Selling a property?" · subtext "Post for free in 5 minutes and reach thousands of buyers" · **[Post a property]** (white button on primary).
- **Behavior.** Click → logged-in: `/sell/new`; guest: `/auth/register?next=/sell/new`.

### 3.8 Tools

- **Appearance.** 3-column card grid (`grid grid-cols-1 md:grid-cols-3 gap-6`): icon + title + short description + "Open →" link.
- **Cards.** 🧮 Mortgage calculator → `/mortgage/calculators` · 📊 Home valuation → `/home-value` · 🧑‍💼 Find an agent → `/agents`.

### 3.9 Stats strip

- **Appearance.** Centered horizontal strip (`flex flex-wrap justify-center gap-12`): each stat is a large number (`text-3xl font-bold text-primary`) + label (`text-sm text-gray-500`).
- **Content.** "10,000+ listings · 500+ agents · 3 countries". The numbers come live from the DB (cached, falling back to static if the query fails).

### 3.10 Latest from blog

- **Appearance.** 3-column card grid: cover photo + category badge + title + date. Card click → `/news/[slug]`.
- **[All articles →]** → `/news`.
- **State.** *Empty* (no articles): the whole section is hidden.

### 3.11 Footer

→ See `00-PRODUCT-SPEC.md` § 9 (5 columns, the same on every page).

---

## 4. Page states

| State | What is displayed |
|-------|---------------------|
| **Loading (first paint)** | The hero static appears immediately; featured/cities/blog: skeleton cards |
| **Loaded (guest)** | Full page; ♡ and "Post": login/register gate |
| **Loaded (logged-in)** | The same + ♡ works immediately; profile menu in the header; "Recently viewed" row (if there is history) |
| **Autocomplete loading** | Spinner on the right of the input, dropdown "Searching…" |
| **Autocomplete empty** | Dropdown "Nothing found" |
| **Featured/blog error** | Inline "Couldn't load" + [Retry], the rest of the page normal |
| **Stats fallback** | API failed → static round numbers (e.g. "10,000+") |
| **Offline** | Cached version (PWA, Phase 4) or offline banner "No connection" |

---

## 5. Technical depth

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

- **Featured.** `properties` where `is_featured = true AND status = 'active'`, `LIMIT 10` → PropertyCard fields: `id, slug, title{locale}, price, currency, deal_type, area_m2, rooms, bedrooms, city, district, property_media[0..n], is_featured, created_at`.
- **Counts.** `new` (`created_at` ≤ 7d), `reduced` (price drop flag), `open_house`, `sold` (`status='sold'`).
- **Cities.** Static list + `COUNT(*)` per `city` (cached).
- **Blog.** `blog_posts` where `published_at IS NOT NULL` ORDER BY `published_at DESC` LIMIT 3 → `slug, title{locale}, cover, category, published_at`.
- **Stats.** `COUNT(properties)`, `COUNT(agents)`, `COUNT(DISTINCT country)`.

### API contracts

**`GET /api/home/summary`** (a single aggregated call for SSR)
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
// 200 partial — if a section fails it is null/[], the page doesn't break
```

**`GET /api/geo/autocomplete?q=arab&locale=hy`**
```jsonc
// 200 OK
{ "items": [
  { "type": "district", "label": "Արաբկիր, Երևան", "city": "Yerevan", "district": "Arabkir" },
  { "type": "city", "label": "Արարատ", "city": "Ararat" }
] }
// 200 { "items": [] }   → "Nothing found"
```

### Validation (zod) — hero search

```ts
const heroSearchSchema = z.object({
  deal: z.enum(["sale", "rent"]).default("sale"),
  q: z.string().max(120).optional(),         // free-text location
  city: z.string().optional(),
  district: z.string().optional(),
});
// q empty → allowed (all); navigate to /search with URLSearchParams
```

- Autocomplete debounce 300ms, min 2 chars; protected from XSS (labels escaped).
- Featured/blog/counts: ISR/cache (revalidate 300s). Stats fallback static if the query times out.

---

## 6. Responsive

- **≥1024px (lg).** Hero `h-[520px]`, search card horizontal (input + button side by side), all grids 3–4 columns.
- **768–1023px (md).** Quick cards 2-col, featured/tools 2–3 col, hero `h-[480px]`.
- **<768px (sm).** Hero `h-[440px]`, search card vertical stack; quick cards 2-col; featured + type shortcuts horizontal scroll (`snap-x`); footer: accordion; the "Search" button full-width.

---

## 7. Accessibility

- The hero's background photo is `alt=""` (decorative); the H1 is the page's only `<h1>`, with a semantic heading hierarchy (the sections: `<h2>`).
- Search tabs: `role="tablist"`, each tab `role="tab" aria-selected`, the input linked via `aria-controls`.
- Autocomplete: `role="listbox"`, the options `role="option"`, ←/↓ keyboard navigation, Enter to select, Esc to close (combobox pattern).
- All icon-only/clickable cards: accessible name (`aria-label` or a visible label).
- The carousel arrows: `aria-label` ("Next", "Previous"); scrolling is keyboard accessible.
- Contrast ≥ 4.5:1 (the hero overlay ensures the contrast of the white text); touch target ≥ 44px.

---

## 8. SEO & meta

- `<title>` = "{brand} — Real estate in Armenia | Buy, sell, rent"; `<meta name="description">` = trilingual, ~155 chars.
- `hreflang` tags (hy/ru/en) + `canonical` (locale root).
- Structured data (JSON-LD): `Organization` (logo, sameAs social networks) + `WebSite` + `SearchAction` (sitelinks search box → `/search?q={query}`).
- Hero photo: optimized `next/image`, `priority`, correct `sizes` (target LCP < 2.5s).
- Internal linking: quick-cards, cities, type-shortcuts: crawlable `<a href>` (not just JS onClick).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `home_view` | Page load | `locale, is_logged_in` |
| `hero_tab_change` | Tab change | `tab` (sale/rent/sell/estimate) |
| `hero_search_submit` | [Search] click / Enter | `deal, q, city, district` |
| `autocomplete_select` | Selecting a suggestion | `type, label` |
| `quick_card_click` | Quick card click | `card` (new/reduced/open_house/sold) |
| `featured_card_click` | Featured card click | `property_id, position` |
| `favorite_add` / `favorite_remove` | ♡ toggle (featured) | `property_id` |
| `city_card_click` | Browse-by-city click | `city` |
| `type_shortcut_click` | Type shortcut click | `type` |
| `post_listing_cta_click` | "Post a property" banner | `is_logged_in` |
| `tool_click` | Tools card click | `tool` (mortgage/home_value/agents) |
| `blog_card_click` | Latest blog card click | `slug` |
