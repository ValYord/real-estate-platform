# Page 20 — Neighborhood / Market Trends (MVP): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/20-neighborhood.md`](../en/pages/20-neighborhood.md) — read that first for
the full user scenarios, page states, and the generic (larger) API/technical contract. This
document closes the gap between that generic spec and *this specific codebase* and pins down
the MVP visual/interaction design. Out of scope for this task (per the task brief — build
none of this, not even stubbed): the Mapbox POI map section (§3.7 of the product doc), the
Demographics section (§3.8), `/api/og` dynamic image generation, and sitemap.xml automation.

**This spec follows `DESIGN_SYSTEM.md`.** Every section below names the exact `components/ui`
primitive and `components/motion` wrapper to use, and every color/spacing/radius/shadow value
is a token utility (`bg-surface`, `text-muted`, `border-border`, `rounded-xl`, `shadow-md`, …),
never a raw `gray-*`/hex value. This is a **brand-new route** — there is no legacy styling to
preserve here, so unlike some in-flight retrofit tasks elsewhere in this repo, nothing here
should reference `gray-*`/`slate-*` utilities at all.

Audited against the current tree:

- `components/property/Breadcrumbs.tsx` — the existing `Breadcrumbs` component (`items:
  {label, href?}[]`), already emits `schema.org/BreadcrumbList` microdata and the mobile
  "‹ Back" collapse. **Reuse this component as-is** — do not fork it. (Its internal markup
  still uses raw `gray-*` classes; that's pre-existing and out of this task's scope to fix.)
- `app/[locale]/property/[id]/[slug]/page.tsx` — the `generateMetadata` + JSON-LD pattern to
  copy: a plain `jsonLd` object with `@graph: [...]`, emitted via `<script type="application/
  ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />` near the top of the
  returned JSX; `alternates.canonical` + `alternates.languages` for `hy`/`ru`/`en`; conditional
  `robots: { index: false, ... }`. Copy this shape exactly (see §9).
- `components/search/PropertyCard.tsx` (named export `PropertyCard`, from
  `lib/search/types.ts`'s `PropertyListItem`) — the card to reuse for Active listings. It is
  rendered today in `components/search/ListingsPanel.tsx` inside a plain CSS grid; there is no
  shared carousel component, but `components/property/SimilarProperties.tsx` hand-rolls the
  exact horizontal-scroll pattern to copy (a `ref` scroll container, `scrollBy({left, behavior:
  'smooth'})`, prev/next buttons) — see §4.4 for how this task's version differs (design-system
  buttons instead of hand-rolled ones).
- `app/api/properties/route.ts` (existing search endpoint, already returns
  `{ items: PropertyListItem[], ... }` shaped exactly for `PropertyCard`) — **the Active
  listings carousel calls this endpoint** (`?city=&district=&deal=&status=active`), not a new
  market-specific listings endpoint. The task's three new endpoints
  (`/api/market/[area]`, `/trends`, `/sold`) cover aggregates only. This directly satisfies the
  task brief's "reuse the existing PropertyCard/search components — do not fork them."
- `components/search/SaveSearchModal.tsx` (props `{filters: Filters, onClose, onSaved,
  onDuplicate}`) + `components/search/SignInPromptModal.tsx` (props `{redirectTo, onClose}`) +
  `lib/auth/hasSessionCookie.ts` — the exact three pieces `components/search/
  SearchPageClient.tsx` wires together for its `[🔔 Save search]` button (lines 42-44, 111-117,
  208-230). **"Get an alert" on this page reuses this exact trio**, pre-filling `filters` with
  `{ city, district, deal: 'sale' }` for the area — see §4.7.
- `supabase/migrations/0001_init.sql` — the `properties` table: `price`, `currency`
  (`AMD`/`USD`/`EUR`/`RUB`), `deal_type`, `city`, `district` (free-text, nullable),
  `area_m2`, `status` (`active`/`draft`/`pending`/`archived`/`sold`), `listed_at`, `updated_at`,
  `location GEOGRAPHY(POINT, 4326)`. **There is no `sold_at`, `sold_price`, or price-history
  table** — see D3/D4 below for how the aggregation design copes with that gap.
- `lib/home-value/staticAddressIndex.ts` — the closest thing to a canonical district list
  already in the codebase (9 real Yerevan districts + Gyumri/Vanadzor city-centers, each with
  `lat/lng`). This is the seed for the new area registry (§2) — reuse the same district
  spelling/vocabulary so `district=Arabkir` round-trips identically everywhere.
- `store/currencyStore.ts` + `components/layout/CurrencySwitcher.tsx` — confirmed **UI-only,
  no live FX conversion anywhere in this codebase** (see the store's own doc comment). Prior
  handoffs (`docs/design/12-home-value-handoff.md` D6, `docs/design/13-mortgage-calc-handoff.md`
  D2) already made the same call for similar aggregate-computing pages: **this page does not
  wire the header currency switcher either** (D1 below) — same reasoning, applied consistently.
- `app/[locale]/property/[id]/[slug]/not-found.tsx` — the existing 404 pattern is hand-rolled
  Tailwind (`bg-primary text-white rounded-lg` buttons, not `Button`). Per this task being new
  and design-system-first, **this page's 404 is built from `components/ui/{Card,Button}`
  instead** — see §4.8. Do not copy the raw-Tailwind button markup.

---

## 1. Design decisions & scope clarifications

| # | Product-spec / generic assumption | Decision for this codebase | Why |
|---|---|---|---|
| D1 | "Currency switching... quick stats, chart axis, sold list re-render live (Scenario C)" | **Not built.** All amounts render in the currency the aggregate is computed in (AMD for totals, matching `properties.currency` default; USD for $/m², matching the product doc's own API example). The header `CurrencySwitcher` does not affect this page. | No live FX anywhere in this codebase (confirmed in `store/currencyStore.ts`); two prior handoffs already made this exact call for aggregate pages. Averaging/reconverting prices across currencies without real FX would silently corrupt the median — worse than a fixed-currency MVP. |
| D2 | Hero "background is a Mapbox static map with the neighborhood boundary polygon overlay" | **No Mapbox in the hero.** The hero is a solid token-driven gradient (`bg-gradient-to-br from-primary to-neutral-900`, see §4.2) with no map imagery. | The task brief explicitly excludes the Mapbox POI map section as future work; a static-map hero image depends on the same Mapbox token/integration risk. Per the brief's own instruction ("leave sections out entirely rather than stubbing broken UI"), a gradient hero is a complete, non-broken design rather than a half-wired map embed. |
| D3 | "Recently sold" needs address/price/date/$-per-m² per sold record | `properties` has no `sold_at`/`sold_price` — only `status='sold'` and `updated_at`. The sold table's **Date column uses `updated_at`** (the timestamp the row most recently transitioned to `status='sold'`) and **Price column uses `price`** (the listing's stored price; there is no separately-tracked final sale price). Label the section heading "Recently sold" as today, but do not invent a "vs list price" column (the product doc marks it optional) — there is no original-list-price history to diff against. | Matches the product spec's own "on-the-fly aggregate from properties + sold records" framing — `properties` *is* the sold record in this schema. Flagging the approximation here rather than quietly presenting `updated_at` as if it were a verified closing date. |
| D4 | Market activity: "Sale-to-list ratio (97%)" | **Likely renders as the hidden/"—" edge case**, not a fabricated percentage, unless the developer finds a real signal for it. No column distinguishes "original list price" from "current price" in this schema. | The product doc's own §3.6 Edge rule already covers this exactly: "Insufficient data → individual metric hidden or '—'." Nothing new to invent — just don't skip implementing the *rule*, even though this particular metric will likely always take the "—" branch today. |
| D5 | `/api/market/[area]/poi`, Mapbox layer toggles, Demographics | **Not built** (explicit task-brief exclusion). No disabled/greyed-out placeholder card either — omit the sections entirely, matching how `NeighborhoodMap`/`Demographics` simply don't appear in the component tree below. | Per task brief; matches the `docs/design/26-virtual-tour-viewer-handoff.md` precedent of omitting rather than stubbing out-of-scope pieces. |
| D6 | "[area] slug" registry | New `lib/market/areaRegistry.ts`, seeded from the same district vocabulary as `lib/home-value/staticAddressIndex.ts` (Arabkir, Kentron, Avan, Malatia-Sebastia, Nor Nork, Davtashen, Erebuni, Ajapnyak, Shengavit — all `city: 'Yerevan'`), slugged as `{city-kebab}-{district-kebab}` (e.g. `yerevan-arabkir`). This is a **closed list** — `generateStaticParams()` pre-renders exactly these slugs; any other slug 404s via `notFound()`, never an open wildcard. Each entry also carries `name: Record<Locale, string>` (hy/ru/en), following the exact `Record<Locale, string>` shape `property.title` already uses. | Satisfies the acceptance criteria's "validate the slug against a known-areas registry/list, not a wildcard/open pattern" using data that's already established and spelled consistently elsewhere in the app, instead of inventing a parallel district vocabulary. |
| D7 | PostGIS / SRID 4326 spatial filtering | The primary aggregation filter is a **plain equality match** on `properties.city` + `properties.district` (both already plain text columns per row — no spatial query needed for "which properties are in this area"). The **"Nearby neighborhoods" list** (§4.6) is where SRID 4326 spatial logic actually earns its place: sort the other registry entries by `ST_Distance` (or an equivalent parameterized geography calculation) from the current area's registry centroid, using the `properties.location GEOGRAPHY(POINT,4326)` column's same SRID for consistency, called through a parameterized Supabase RPC — never a string-built query. | `district` is already a reliable per-row tag for "which area," so text equality is both simpler and correct; forcing a spatial radius query for that would be over-engineering. Nearby-neighborhood ranking is the one place a real distance calculation is the right tool, which is also where the acceptance criteria's SRID 4326 requirement is meant to bite. |
| D8 | 12-month/5-year trend series ("price-history" implied) | Computed by grouping matching `properties` rows (active **and** sold) by month of `listed_at` (or `updated_at` for sold rows), taking the median `price`/`price_per_m2` per month bucket — an approximation, since there's no true point-in-time price-history table. | Same "on-the-fly aggregate" framing as D3; documenting the method so the developer doesn't need to guess, and so the `pointCount < 6` sparse-guard is understood as "fewer than 6 populated month-buckets," not "fewer than 6 raw rows." |

---

## 2. Component inventory (new files)

```
app/[locale]/neighborhood/
  [area]/
    page.tsx                        (NEW — Server Component, ISR: export const revalidate = 86400;
                                      generateStaticParams() from lib/market/areaRegistry.ts;
                                      dynamicParams = false — closed slug set, D6;
                                      generateMetadata; notFound() for an unregistered slug)
    not-found.tsx                   (NEW — design-system 404, §4.8)

components/neighborhood/
  AreaHero.tsx                      (NEW — Server; gradient hero + <QuickStats>)
  QuickStats.tsx                    (NEW — Server; 4 stat cards, graceful per-card hide)
  PriceTrendChart.tsx               (NEW — Client; Recharts + <Tabs> period/deal/metric toggles,
                                      sparse-data fallback, sr-only data table, §4.3)
  ActiveListingsCarousel.tsx        (NEW — Client; React Query against the EXISTING
                                      /api/properties endpoint, reuses <PropertyCard>, §4.4)
  RecentlySoldTable.tsx             (NEW — Server; hidden entirely when empty, §4.5)
  MarketActivityStats.tsx           (NEW — Server; stat cards + market-type <Badge>, §4.6)
  NearbyNeighborhoods.tsx           (NEW — Server; link list, §4.6)
  AlertCtaButton.tsx                (NEW — Client; wraps SaveSearchModal/SignInPromptModal
                                      exactly like SearchPageClient does, pre-filled filters, §4.7)

lib/market/
  areaRegistry.ts                   (NEW — AREA_REGISTRY: AreaDefinition[], getAreaBySlug(),
                                      listNearbyAreas(slug, n), D6/D7)
  schemas.ts                        (NEW — zod: trendsQuerySchema, soldQuerySchema per product
                                      doc §5)
  types.ts                          (NEW — MarketSummary, TrendPoint, SoldRecord, MarketActivity)

app/api/market/[area]/
  route.ts                          (NEW — GET, D6 slug validation → 404)
  trends/route.ts                   (NEW — GET, zod query validation, D8 aggregation)
  sold/route.ts                     (NEW — GET, D3 field mapping)
```

Reuse, don't fork: `components/property/Breadcrumbs`, `components/search/PropertyCard`,
`components/search/SaveSearchModal`, `components/search/SignInPromptModal`,
`lib/auth/hasSessionCookie`, `lib/search/filtersSchema` (`Filters`, `filtersToParams`),
`components/ui/{Card,CardHeader,CardBody,CardFooter,Button,Badge,Tabs,Skeleton}`,
`components/motion/{FadeIn,SlideIn,Stagger}`, `lib/locale` (`Locale`, `safeLocale`, `LOCALES`).

---

## 3. Wireframes

### 3.1 Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                                  │
├────────────────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Yerevan › Arabkir            (Breadcrumbs reuse)  │
├────────────────────────────────────────────────────────────────────────┤
│ ┌──── AreaHero (h-[320px], bg-gradient-to-br from-primary to-neutral-900) ──┐ │
│ │ H1 "Arabkir, Yerevan — real estate market"  (text-white)                │ │
│ │ subtitle (text-white/80)                                                │ │
│ │ [Median][Active][$/m²][YoY]  ← QuickStats, Card overlay row, Stagger    │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────┬─────────────────────────────────┤
│ ◄ MAIN (≈64%, space-y-8)              │ ► ASIDE (≈36%, space-y-8)       │
│ H2 "Median price trend"               │ H2 "Market activity"            │
│ Tabs×3 (period/deal/metric)           │ 4× small Card stat + Badge chip │
│ Recharts AreaChart, h-[300px]         │ H2 "Nearby neighborhoods"       │
│ H2 "Active listings (184)"            │ links list                      │
│ Stagger(PropertyCard carousel) [See all]│                                │
│ H2 "Recently sold"                    │                                │
│ table                                 │                                │
├───────────────────────────────────────┴─────────────────────────────────┤
│ CTA row: [Search here] (primary) · [Get an alert] (secondary)          │
│ FOOTER                                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)             │
├──────────────────────────┤
│ ‹ Back  (Breadcrumbs mobile)│
│ AreaHero (h-[220px])      │
│ H1 (text-2xl)             │
│ QuickStats — grid-cols-2  │
│ H2 "Price trend"           │
│ Tabs (horizontal scroll)  │
│ chart h-[240px]           │
│ H2 "Active listings"       │
│ carousel (overflow-x-auto)│
│ H2 "Market activity"       │
│ stat cards — grid-cols-2  │
│ H2 "Recently sold"         │
│ table (overflow-x-auto)   │
│ H2 "Nearby neighborhoods"  │
│ links                     │
│ CTA (stacked, full-width) │
│ FOOTER                    │
└──────────────────────────┘
```

No fixed bottom action bar (the product doc's mobile spec suggests one) — the two CTAs already
sit at the natural end of the content and this page has no persistent filter/alert state to
surface at all times the way `/search` does; adding one would be a second, redundant place to
find the same two buttons. Keep it to the in-flow CTA row.

---

## 4. Section-by-section design

### 4.1 Breadcrumbs

Reuse `<Breadcrumbs items={[{label: 'Home', href: '/'}, {label: city, href: '/search?city=...'},
{label: districtName}]} />` verbatim — identical construction to the property page's breadcrumb
array (§0 above), just without the trailing property-title segment. Sits in the page's
`max-w-7xl mx-auto px-4` container, `py-2` (component's own default).

### 4.2 Area hero & quick stats

**Hero container** (`AreaHero.tsx`, Server): `relative h-[320px] md:h-[320px] rounded-xl
overflow-hidden bg-gradient-to-br from-primary to-neutral-900` (mobile: `h-[220px]`, per D2 —
no Mapbox image). A subtle radial highlight is fine as a second layer for visual interest
(`absolute inset-0 bg-[radial-gradient(circle_at_top_right,theme(colors.accent/15),transparent_60%)]`
— acceptable as it's composed from existing `accent` token opacity, not a new hex).

- **H1**: `text-3xl md:text-3xl font-semibold text-white tracking-tight` (mobile `text-2xl`) —
  `"{areaName}, {city} — real estate market"`.
- **Subtitle**: `text-white/80 text-base max-w-2xl mt-2` — one or two generated sentences (e.g.
  `"{count} active listings in {areaName}, with a median price of {median}."` — assembled from
  the same aggregate the API already returns, not separate CMS copy, to avoid a second content
  source to keep in sync).
- **Entrance**: wrap the H1 + subtitle block in `<SlideIn direction="up">` — a below-the-fold-free
  hero is the one place an on-load (not scroll-triggered) entrance reads as premium rather than
  gimmicky; `SlideIn` still respects `prefers-reduced-motion` automatically.

**QuickStats** (`QuickStats.tsx`, Server, rendered inside the hero, absolutely positioned along
the bottom edge or immediately below H1/subtitle on a `flex flex-wrap gap-3` row): up to 4 stat
cards, **each entirely omitted (not rendered as an empty/"—" card) when its metric is `null`**:

```tsx
<Card className="bg-surface/95 backdrop-blur border-none shadow-md min-w-[140px]">
  <CardBody className="p-4">
    <p className="text-2xl font-bold text-text">{value}</p>
    <p className="text-xs text-muted">{label}</p>
  </CardBody>
</Card>
```

- Median price → `text-2xl font-bold text-text`, label "Median price".
- Active listings → same, label "Active listings".
- Average $/m² → same, label "Avg. price / m²".
- YoY change → value row includes a `lucide-react` `TrendingUp`/`TrendingDown` icon **and** the
  signed percentage **and** a text suffix, e.g. `<span className="inline-flex items-center gap-1
  text-success"><TrendingUp className="w-4 h-4" aria-hidden /> +4.2% <span className="text-xs
  font-normal text-muted">vs last year</span></span>` (decline: `text-danger` + `TrendingDown`).
  This satisfies §7's "text + color, not color alone" — the ▲/▼ direction is read from the icon
  and the "vs last year" wording, not the color alone.

Wrap the whole stat row in `<Stagger gap={0.06}>` so the (up to 4) cards fade/lift in one after
another as the hero enters view — a small but distinctly "premium" touch that costs nothing
extra to build since `Stagger` already exists.

### 4.3 Median price + trend chart

`PriceTrendChart.tsx` (Client). Container: `<Card><CardHeader>` with the section H2 ("Median
price trend") + the three toggle `<Tabs>` rows; `<CardBody>` holds the chart.

**Toggles** — reuse `components/ui/Tabs.tsx` **verbatim**, three independent instances (each is
its own `role="tablist"`, so give each a distinct `label` prop for a11y):

```tsx
<Tabs label="Time period" options={[{value:'12m',label:'12 months'},{value:'5y',label:'5 years'}]} value={period} onChange={setPeriod} />
<Tabs label="Deal type" options={[{value:'sale',label:'Sale'},{value:'rent',label:'Rent'}]} value={deal} onChange={setDeal} />
<Tabs label="Metric" options={[{value:'total',label:'Total price'},{value:'per_m2',label:'$/m²'}]} value={metric} onChange={setMetric} />
```

On mobile these three `Tabs` stack vertically (`flex flex-col gap-2 md:flex-row md:gap-4`) —
`Tabs` already has its own `overflow-x-auto` for the scroll-chip mobile treatment inside each row.

**Chart** (following the `dataviz` skill's procedure — single time series → **area chart**,
sequential/one-hue color job, no legend needed for one series):

```tsx
<ResponsiveContainer width="100%" height={300}>  {/* 240 on mobile via a container query / useMediaQuery */}
  <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
    <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="0" />
    <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
    <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={56} />
    <Tooltip content={<TrendTooltip />} />
    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2}
          fill="var(--color-primary)" fillOpacity={0.1}
          dot={{ r: 4, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }}
          activeDot={{ r: 5, fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2 }} />
  </AreaChart>
</ResponsiveContainer>
```

- Single series → **no legend box** (the H2 + active toggle state already say what's plotted);
  a one-line caption above the chart states it explicitly anyway for the text alternative:
  `"Median {metric === 'total' ? 'total price' : 'price per m²'} · {deal === 'sale' ? 'Sale' :
  'Rent'} · {period === '12m' ? 'last 12 months' : 'last 5 years'}"` (`text-sm text-muted`).
- **Tooltip** (`TrendTooltip`, small custom component): a `Card`-styled popover
  (`bg-surface border border-border shadow-md rounded-md px-3 py-2`) — value leads
  (`text-sm font-semibold text-text`), date follows (`text-xs text-muted`), per the dataviz
  skill's "values lead, labels follow" rule.
- **Recharts is a new dependency** (not in `package.json` today) — add it; the task's own
  acceptance criteria names Recharts explicitly, and no existing chart library exists to reuse
  instead (confirmed: no other page in this repo renders a chart yet).

**Accessible fallback (§7 requirement).** The chart container carries `role="img"
aria-label="Median {metric}, {deal}, {period}: from {series[0].date} at {series[0].value} to
{series.at(-1).date} at {series.at(-1).value}"`. Directly beneath it (visually `sr-only`, always
in the DOM — not gated behind a toggle click, so it's reachable without JS interaction beyond
what's already rendered) render the same series as a real `<table>`:

```tsx
<table className="sr-only">
  <caption>{captionText}</caption>
  <thead><tr><th>Date</th><th>Value</th></tr></thead>
  <tbody>{series.map(p => <tr key={p.date}><td>{p.date}</td><td>{formatValue(p.value)}</td></tr>)}</tbody>
</table>
```

**Sparse-data fallback (`pointCount < 6`, per D8).** Replace the `<Card>`'s body entirely —
no chart, no `sr-only` table — with a centered message, no entrance animation (fallback/empty
states don't animate in, matching the convention already established on other pages' error
cards):

```tsx
<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
  <BarChart3 className="w-10 h-10 text-muted" aria-hidden />
  <p className="text-text font-medium">Not enough data for this area yet</p>
  <p className="text-sm text-muted max-w-sm">Check back as more listings and sales are recorded in {areaName}.</p>
</div>
```

**Entrance.** Wrap the whole `<Card>` in `<FadeIn>` (scroll-triggered, once) — this section
sits below the fold on both breakpoints, so a scroll-reveal (not an on-load slide) is correct.

### 4.4 Active listings

`ActiveListingsCarousel.tsx` (Client, React Query against the existing `/api/properties`
endpoint — see §0). `<Card>`less section (the carousel is full-bleed, not boxed, to match how
`SimilarProperties` reads on the property page):

```tsx
<section>
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-text">Active listings ({activeCount})</h2>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm" onClick={() => scroll('left')} aria-label="Scroll left"><ChevronLeft className="w-4 h-4" /></Button>
      <Button variant="ghost" size="sm" onClick={() => scroll('right')} aria-label="Scroll right"><ChevronRight className="w-4 h-4" /></Button>
      <Link href={`/search?city=${city}&district=${district}`}>
        <Button variant="secondary" size="sm">See all</Button>
      </Link>
    </div>
  </div>
  <Stagger gap={0.05}>
    <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
      {items.map(p => <div key={p.id} className="flex-shrink-0 w-72 snap-start"><PropertyCard property={p} /></div>)}
    </div>
  </Stagger>
</section>
```

`PropertyCard` is used completely unmodified — its own `bg-white border-gray-200` styling stays
as-is (it's a shared component out of this task's scope to restyle). Fetch: `GET
/api/properties?city={city}&district={district}&deal=sale&status=active&sort=newest`, slice to
the first 12 for the carousel; the `[See all]` link uses `filtersToParams` semantics
(`/search?city=...&district=...`) so the same query keeps working once the user lands on
`/search`.

**Edge — 0 active listings.** Replace the scroll row with a `Card` empty state: `"No active
listings in {areaName} right now."` + an inline `<AlertCtaButton>` ("Get an alert" — see §4.7)
so the zero-result state still converts.

**Entrance.** `Stagger` on the visible cards (as above) — since it's a horizontal row, the
stagger still reads left-to-right as each card fades/lifts in on scroll-into-view, no different
mechanically from a staggered vertical list.

### 4.5 Recently sold

`RecentlySoldTable.tsx` (Server — no interaction needed, so no client boundary). **Section is
omitted entirely (not an empty-state card) when there are zero sold records**, per the product
doc's own edge rule.

```tsx
<section>
  <h2 className="text-xl font-semibold text-text mb-4">Recently sold</h2>
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead className="bg-neutral-100 text-muted text-xs uppercase tracking-wide">
        <tr><th className="text-left px-4 py-2">Area</th><th className="text-right px-4 py-2">Price</th>
            <th className="text-right px-4 py-2">Date</th><th className="text-right px-4 py-2">$/m²</th></tr>
      </thead>
      <tbody>
        {items.map((row) => (
          <tr key={row.id} className="border-t border-border hover:bg-neutral-50 transition-colors">
            <td className="px-4 py-2.5 text-text">{row.district}</td>{/* D3: generalized, never row.address */}
            <td className="px-4 py-2.5 text-right text-text font-medium">{formatPrice(row.price, row.currency)}</td>
            <td className="px-4 py-2.5 text-right text-muted">{formatDate(row.soldAt)}</td>
            <td className="px-4 py-2.5 text-right text-muted">{row.pricePerM2 ? formatPrice(row.pricePerM2, row.currency) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
```

**Privacy (D3).** The Area/Address column shows `district` only — **never** the row's exact
`address` value. This is the entire "generalization," and it's enforced structurally (the API
response for `/sold` simply never includes `address` — see acceptance criteria's data-shape
note, not just a UI-layer omission).

**Entrance.** Wrap the section in `<FadeIn>` (scroll-triggered).

### 4.6 Market activity & nearby neighborhoods (aside column)

`MarketActivityStats.tsx` (Server), inside a single `<Card>`:

```tsx
<Card>
  <CardHeader><h2 className="text-base font-semibold text-text">Market activity</h2></CardHeader>
  <CardBody className="space-y-3">
    {daysOnMarket != null && <StatRow label="Days on market" value={`${daysOnMarket} days`} />}
    {saleToList != null && <StatRow label="Sale-to-list ratio" value={`${Math.round(saleToList * 100)}%`} />}
    {inventory != null && <StatRow label="Inventory" value={String(inventory)} />}
    {marketType && (
      <div className="pt-2">
        <Badge variant={marketType === 'sellers' ? 'warning' : marketType === 'buyers' ? 'primary' : 'neutral'}>
          {marketType === 'sellers' ? '📈 Seller’s market' : marketType === 'buyers' ? '📉 Buyer’s market' : '⚖️ Balanced market'}
        </Badge>
      </div>
    )}
  </CardBody>
</Card>
```

(`StatRow` = a tiny two-cell `flex justify-between` row, `text-sm text-muted` label /
`text-sm font-medium text-text` value — not worth its own file if it's only used here, but
extract it if it's needed a second time.) Each `StatRow` line is individually omitted when its
value is `null` (D4's "—" rule is satisfied by *omitting* the row rather than printing a literal
em dash, which reads cleaner in a short stat list — either is acceptable, omission is preferred
here since the label itself would be meaningless attached to a placeholder).

The `Badge` variant choice (`warning` for seller's, `primary` for buyer's, `neutral` for
balanced) plus the emoji + text label satisfies §7's "text + color, not color alone" for the
market-type chip — the label text is definitive even if the color didn't render.

`NearbyNeighborhoods.tsx` (Server), a second `<Card>` immediately below:

```tsx
<Card>
  <CardHeader><h2 className="text-base font-semibold text-text">Nearby neighborhoods</h2></CardHeader>
  <CardBody>
    <ul className="space-y-2">
      {nearby.map((n) => (
        <li key={n.slug}>
          <Link href={`/neighborhood/${n.slug}`} className="text-primary hover:underline text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
            {n.name}
          </Link>
        </li>
      ))}
    </ul>
  </CardBody>
</Card>
```

Both aside cards enter via `<SlideIn direction="right" delay={0.1}>` on desktop (aside column
slides in from the right as the two-column section scrolls into view) — on mobile, where the
aside stacks below main content, `SlideIn`'s `direction="up"` default kicks in instead; don't
hand-write a breakpoint switch for this, it's a nice-to-have symmetry, not worth extra code —
just use `direction="up"` everywhere if simplicity is preferred; either reads fine.

### 4.7 CTA row

Bottom of the main content column, spans full width, `flex flex-col sm:flex-row gap-3`:

```tsx
<Link href={`/search?city=${city}&district=${district}`}>
  <Button variant="primary" size="lg">Search properties in {areaName}</Button>
</Link>
<AlertCtaButton city={city} district={districtRaw} areaName={areaName} />
```

`AlertCtaButton.tsx` (Client) — mirrors `SearchPageClient`'s wiring **exactly**:

```tsx
'use client'
export default function AlertCtaButton({ city, district, areaName }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const pathname = usePathname() // current /neighborhood/[area] path, for redirectTo

  const handleClick = () => {
    if (hasSessionCookie()) setModalOpen(true)
    else setSignInOpen(true)
  }

  return (
    <>
      <Button variant="secondary" size="lg" onClick={handleClick}>Get an alert for {areaName}</Button>
      {modalOpen && (
        <SaveSearchModal
          filters={{ deal: 'sale', city, district, sort: 'newest', page: 1 }}
          onClose={() => setModalOpen(false)}
          onSaved={() => setModalOpen(false) /* + toast, matching SearchPageClient's own pattern */}
          onDuplicate={() => setModalOpen(false)}
        />
      )}
      {signInOpen && <SignInPromptModal redirectTo={pathname} onClose={() => setSignInOpen(false)} />}
    </>
  )
}
```

No new modal is designed here — `SaveSearchModal`/`SignInPromptModal` are used completely
unmodified (their own internal styling is out of this task's scope), only the trigger button and
the pre-filled `filters` object are new.

### 4.8 404 — unregistered area slug

`app/[locale]/neighborhood/[area]/not-found.tsx` (NEW). Unlike the legacy property-page 404
(§0), this is built from the design system since it's new code:

```tsx
<main className="max-w-xl mx-auto px-4 py-24 flex flex-col items-center text-center">
  <div className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center mb-8" aria-hidden="true">
    <MapPin className="w-14 h-14 text-muted" />
  </div>
  <h1 className="text-2xl font-semibold text-text mb-3">This area was not found</h1>
  <p className="text-muted mb-8">
    We don&apos;t have market data for this neighborhood yet. Try searching instead.
  </p>
  <Link href="/search">
    <Button variant="primary" size="lg">
      <Search className="w-4 h-4" aria-hidden /> Back to search
    </Button>
  </Link>
</main>
```

No entrance animation on a 404 (matches the "error/empty states don't animate in" convention
used throughout this spec).

### 4.9 Loading state

Server Component + ISR means there's normally no client loading spinner for the page shell
itself (the HTML is pre-rendered). The one genuinely client-fetched piece is
`ActiveListingsCarousel` (React Query) — while its request is in flight, render `Skeleton`
cards in the same `w-72` slot width as real cards (`<Skeleton className="w-72 h-64 flex-shrink-0
rounded-xl" />` × 4, in a non-scrolling row) instead of the empty-state or a spinner — keeps
layout stable and matches `components/ui/Skeleton`'s existing usage pattern elsewhere.

---

## 5. Micro-interactions & animation summary

| Element | Interaction | Implementation |
|---|---|---|
| Hero H1/subtitle | On-load entrance (not scroll — always in first viewport) | `SlideIn direction="up"` |
| QuickStats cards | Staggered entrance alongside hero | `Stagger gap={0.06}` wrapping the stat-card row |
| Chart `<Card>` | Scroll reveal | `FadeIn` |
| Tabs (period/deal/metric) | Active/idle + hover/focus | Built into `components/ui/Tabs` already (`bg-primary text-white` active, `hover:border-primary hover:text-primary` idle, `focus-visible:ring-2 ring-primary`) — no new work |
| Chart line/area/dot | Hover (crosshair + tooltip) | Recharts' own `<Tooltip>` + `activeDot`; snaps to nearest X per the dataviz skill's crosshair rule |
| Active-listings scroll buttons | Hover/tap | `Button variant="ghost"` default hover/focus states — no custom styling needed |
| `PropertyCard` (carousel) | Staggered entrance on scroll into view | `Stagger gap={0.05}` wrapping the flex row |
| Recently-sold table rows | Hover | Plain Tailwind `hover:bg-neutral-50 transition-colors` (trivial row feedback — no motion wrapper per the "hover/tap → plain Tailwind" rule) |
| Aside cards (Market activity, Nearby) | Scroll reveal | `SlideIn direction="right" delay={0.1}` (desktop) / `direction="up"` (mobile, or just use `"up"` everywhere for simplicity) |
| CTA buttons | Hover/tap | `Button`'s built-in `hover:bg-primary/90`/`hover:bg-neutral-100` + focus ring — no custom styling |
| Nearby-neighborhood links | Hover | Plain `hover:underline` — trivial, no wrapper |
| 404 / sparse-data / empty-listings fallbacks | None | Conditional render only, no entrance — consistent with how every other fallback/error state in this codebase (and this spec) is treated |

No new `framer-motion` usage anywhere in page/feature code — every orchestrated/entrance/
scroll-triggered animation goes through `FadeIn`/`SlideIn`/`Stagger`, all of which already
respect `prefers-reduced-motion` via `useReducedMotion()`.

---

## 6. Design tokens used (all pre-existing — nothing new to add to `@theme`)

| Element | Token / utility |
|---|---|
| Hero background | `bg-gradient-to-br from-primary to-neutral-900` |
| Hero H1/subtitle text | `text-white` / `text-white/80` |
| Stat card | `bg-surface/95 backdrop-blur shadow-md` (via `Card` + `className` override) |
| Stat value | `text-2xl font-bold text-text` |
| Stat label | `text-xs text-muted` |
| YoY up | `text-success` + `TrendingUp` icon | YoY down | `text-danger` + `TrendingDown` icon |
| Section H2 | `text-xl font-semibold text-text` (aside cards use `text-base font-semibold text-text` inside `CardHeader`) |
| Chart line/area/dots | `stroke="var(--color-primary)"`, `fill="var(--color-primary)" fillOpacity={0.1}`, dot ring `stroke="var(--color-surface)"` |
| Chart grid/axis | `stroke="var(--color-border)"`, tick `fill: 'var(--color-muted)'` |
| Chart tooltip | `bg-surface border border-border shadow-md rounded-md` |
| Market chip — seller's | `Badge variant="warning"` |
| Market chip — buyer's | `Badge variant="primary"` |
| Market chip — balanced | `Badge variant="neutral"` |
| Sold table header row | `bg-neutral-100 text-muted` |
| Sold table row hover | `hover:bg-neutral-50` |
| Nearby link | `text-primary hover:underline` |
| Card / container | `Card` (`rounded-lg border-border bg-surface shadow-sm`) |
| Skeleton | `components/ui/Skeleton` |
| Focus ring (all interactive elements) | `focus-visible:ring-2 focus-visible:ring-primary/40` (matches `Button`/`Tabs` built-ins) |

---

## 7. Responsive

- **≥1024px (lg).** Two columns: main (chart/listings/sold, ~64%) + aside (market activity/
  nearby, ~36%); hero `h-[320px]`; QuickStats `flex-wrap` row of 4.
- **768–1023px (md).** Single column (aside stacks below main); QuickStats `grid-cols-4`; chart
  full-width `h-[300px]`.
- **<768px (sm).** Breadcrumbs collapse to "‹ Back" (built into `Breadcrumbs`); hero `h-[220px]`,
  H1 `text-2xl`; QuickStats `grid-cols-2`; the three chart `Tabs` rows stack vertically, each
  horizontally scrollable; listings/sold table `overflow-x-auto`; CTA row stacks
  `flex-col`, both buttons full-width (`w-full` on `Button`, achieved via a wrapping `className`,
  not a `Button` prop change).

---

## 8. Accessibility

- Chart: `role="img"` + `aria-label` summarizing the series (§4.3); an always-present `sr-only`
  `<table>` text alternative — never gated behind an extra click.
- Breadcrumbs: existing `Breadcrumbs` component already emits `schema.org/BreadcrumbList`
  microdata and `aria-current="page"` on the last crumb — no changes needed.
- `Tabs` (period/deal/metric): already `role="tablist"`/`role="tab"` with roving tabindex and
  arrow-key navigation (component reused unmodified).
- QuickStats YoY / market-type chip: text + icon + color, never color alone (§4.2, §4.6).
- Carousel scroll buttons: `aria-label="Scroll left"`/`"Scroll right"`.
- `PropertyCard`, `SaveSearchModal`, `SignInPromptModal`: inherit whatever a11y behavior those
  components already have (favorite toggle `aria-pressed`, modal `role="dialog"` +
  `aria-modal` + Escape/backdrop-close, etc.) — nothing new to design since they're reused as-is.
- Touch targets ≥ 44px (`Button` `size="lg"` is `h-12`; `size="md"` is `h-11` — both already
  clear the bar); contrast ≥ 4.5:1 (token pairs like `text-text`/`bg-surface`,
  `text-white`/`bg-primary` already meet this per the design system's own token choices).
- Nearby-neighborhood links and the "See all" link: standard focusable `<Link>`s with the
  existing site-wide `focus-visible:ring-2 ring-primary` treatment.

---

## 9. SEO & meta

Follows the exact `generateMetadata` + JSON-LD shape from `app/[locale]/property/[id]/[slug]/
page.tsx` (§0), adapted:

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale: rawLocale, area } = await params
  const locale = safeLocale(rawLocale)
  const def = getAreaBySlug(area)
  if (!def) return { title: `Area not found | ${BRAND}` }

  const summary = await fetchMarketSummary(area) // same fetch the page itself uses
  const areaName = def.name[locale]
  const year = new Date().getFullYear() // stamped server-side per request, not inside a cached pure function

  const title = `${areaName}, ${def.city} real estate: prices, trends ${year} | ${BRAND}`
  const description = buildDescription(summary, areaName).slice(0, 155) // "{areaName}: median {X}, {N} active, {±Y}% YoY."

  const isThin = summary === null || summary.activeCount + summary.soldCount30d < MIN_CONTENT_THRESHOLD

  return {
    title,
    description,
    robots: isThin ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: `/${locale}/neighborhood/${area}`,
      languages: { hy: `/hy/neighborhood/${area}`, ru: `/ru/neighborhood/${area}`, en: `/en/neighborhood/${area}` },
    },
  }
}
```

**JSON-LD** (`@graph`, same `<script type="application/ld+json">` pattern), three entries:

- `Place` — `name`, `address: { '@type': 'PostalAddress', addressLocality: city, addressRegion:
  district }`, `geo: { '@type': 'GeoCoordinates', latitude, longitude }` (from the registry
  centroid — no boundary polygon in MVP, per D2).
- `Dataset` — `name`, `description`, `dateModified` (the ISR page's last-regenerated timestamp —
  pass through from the aggregate fetch, not `new Date()` inside the render, so it's stable
  across a single revalidation cycle), `variableMeasured: ['medianPrice', 'activeCount',
  'pricePerM2', 'yoyChange']`.
- `BreadcrumbList` — built from the same array passed to `<Breadcrumbs>`, mirroring the property
  page's `breadcrumbs.map(...)` construction exactly.

**Thin-data `noindex` (§8 of the product doc).** A page is thin when there's effectively nothing
area-specific to show yet — define the threshold in `lib/market/types.ts` as a named constant
(e.g. `MIN_CONTENT_THRESHOLD = 3`, "fewer than 3 combined active+recently-sold rows") rather than
a magic number inline, so it's one visible, testable rule instead of scattered conditionals.

---

## 10. Page states

| State | What renders |
|---|---|
| **Loading (client pieces only)** | `ActiveListingsCarousel` shows `Skeleton` cards (§4.9); everything else is server-rendered, no spinner |
| **Loaded (full data)** | Hero + QuickStats (all 4), chart, listings carousel, sold table, market activity, nearby links, CTA |
| **Sparse data** | Only populated QuickStats cards render; chart shows the "Not enough data" fallback (§4.3); sold table omitted if empty (§4.5); market-activity rows omitted individually (§4.6) |
| **0 active listings** | Carousel replaced by an empty-state `Card` + inline `AlertCtaButton` (§4.4) |
| **404 (unregistered slug)** | `not-found.tsx` (§4.8) |
| **Error (a sub-fetch fails, e.g. `/trends` 500)** | That section only shows "Something went wrong" text (`text-sm text-danger`) — no page-wide crash; the rest of the page (server-rendered hero/stats) still renders since it doesn't depend on the failed client fetch |

---

## 11. What NOT to build (explicit exclusions, per the task brief)

- No Mapbox map, no POI layer toggles, no `[🏫][🛒][🚇][🏥][🌳]` chips — omit §3.7 of the
  product doc entirely, hero included (D2).
- No Demographics section (§3.8 of the product doc).
- No `/api/og` dynamic OG image — use a static `openGraph` fallback (site default) if one already
  exists elsewhere in `layout.tsx`; do not build a per-area image pipeline.
- No sitemap.xml automation.
- No live currency-switcher wiring (D1).
- No "vs list price" sold-table column, no fabricated "sale-to-list ratio" number (D3/D4).

---

## 12. Test coverage checklist (for the developer)

Per the acceptance criteria, at minimum:

- **API tests.** `GET /api/market/[area]` (known slug → 200 with real aggregate shape;
  unregistered slug → 404 `{ error: 'area_not_found' }`). `GET /api/market/[area]/trends`
  (zod-valid `period`/`deal`/`metric` combos → 200; invalid enum value → 400; `pointCount < 6` →
  `{ series: [], pointCount, insufficient: true }`, never a fabricated series). `GET /api/market/
  [area]/sold` (200 with generalized `district`-only address field, never raw `address`).
- **Component tests.** `<QuickStats>` with each metric individually `null` (card omitted, not
  blanked). `<PriceTrendChart>` sparse-data fallback render (`pointCount < 6` → fallback copy,
  no `<AreaChart>` in the tree). `<MarketActivityStats>` with each metric `null` (row omitted).
  `<AlertCtaButton>` guest vs. authenticated branch (mock `hasSessionCookie`).
- **404.** A request for an unregistered area slug renders `not-found.tsx`, not a crash and not
  an empty 200 page.
- **SEO.** `generateMetadata` returns `robots: { index: false }` for a thin-data fixture and no
  `robots` override for a well-populated one; `alternates.languages` includes all three locales.
- **Registry.** `getAreaBySlug` unit tests (known slug → definition, unknown slug → `undefined`,
  never throws).

---

*End of Neighborhood / Market Trends Page Design Spec v1.0*
