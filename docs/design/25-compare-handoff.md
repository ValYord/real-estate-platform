# Page 25 — Compare Properties: Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/25-compare.md`](../en/pages/25-compare.md) (deep v3) — read that
first for user scenarios, the full state table, the generic API contract,
accessibility and analytics requirements. This document does **not** repeat those
sections in full; it exists to close the gap between that generic spec and *this
specific codebase*, and to pin down the **MVP scope** for the current task (the
page-spec header tags the whole page "🟡 Phase 2"; the task tasking this handoff
explicitly pulls a scoped MVP forward — see §0 for exactly what that means and
what stays deferred).

Audited against the current tree: `components/search/PropertyCard.tsx`,
`components/search/ListingsPanel.tsx`, `components/favorites/FavoritesToolbar.tsx`
(already reserves a disabled "⚖ Compare" button for Phase 2 — do not touch it,
see D6), `app/api/properties/route.ts`, `app/api/properties/[id]/similar/route.ts`,
`lib/search/filtersSchema.ts` (the zod query-param pattern to mirror),
`lib/search/mockData.ts`, `lib/property/types.ts`, `types/database.ts`,
`store/currencyStore.ts` (the only existing Zustand store — in-memory, no
`persist`), `app/[locale]/favorites/page.tsx` and its `not-found.tsx` sibling
(empty-state / illustration conventions), `i18n/routing.ts` (`localePrefix:
'always'`), `vitest.config.ts` (`environment: 'node'` — no DOM, tests target
`lib/` schemas/helpers and API route handlers, not rendered React components —
see §9). Stack confirmed: Next.js 15 App Router, Tailwind v4 (`@theme` tokens, no
`tailwind.config.*`), `lucide-react` icons, `@tanstack/react-query`, `zustand@5`
(no `persist` usage yet but the middleware ships in the same package — no new
dependency needed), `next-intl` for locale-prefixed routing only (see D3 — page
*copy* is not translated anywhere in this app yet).

---

## 0. MVP scope for this task (read before building)

Build exactly the "In scope" list from the task brief. Everything else in the
generic page-spec (§3.1 Share / Print / `[+ Add]` modal, §3.4 Highlight-differences
toggle + best-value green marking, §3.5's Phase-3 distance row, mixed-deal-type
notice, analytics events beyond the trivial ones) is **explicitly deferred**. Do
not build it, do not stub it with a disabled button beyond what's noted below —
keep the diff minimal per `CLAUDE.md`.

**In scope:**
- Compare checkbox on `PropertyCard` (search grid only — not Favorites, not
  Property Detail; see D6), cap 4 selections, floating "Compare (n)" bar.
- `/compare?ids=...` (locale-prefixed) rendering the comparison table for the
  rows listed in §5.2.
- Remove a property from the table (no re-add-via-search picker for MVP — see
  D2; this is the task brief's explicit "otherwise removal only" fallback).
- Empty (0 selected) and under-minimum (1 selected) states.
- Unavailable (sold / deleted) column state.
- Client-side persistence of the selection (Zustand + `persist` to
  `localStorage`, synced with the `?ids=` URL param — see §6).
- `noindex` metadata on `/compare` (see D5 — no indexable marketing landing for
  MVP).

**Explicitly out of scope (do not build):** Share/copy-link, Print/PDF export,
Highlight-differences toggle, `[+ Add]` search/autocomplete modal, distance row,
mixed-deal-type notice, any change to `FavoritesToolbar.tsx`'s existing disabled
Compare button, any change to the Property Detail page.

---

## 1. Design decisions that deviate from the generic page spec

| # | Page-spec says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | `ids=12,45,78` (integers), `idsSchema` built on `z.number().int().positive()` | IDs are **UUID-shaped strings**, validated with a permissive safe-token pattern — see §5.1 for the exact schema. Do **not** use `z.string().uuid()` strictly. | `properties.id` is `uuid` in `types/database.ts` / `supabase/migrations`. But `lib/search/mockData.ts` (`SEED_PROPERTIES`) and `lib/property/mockData.ts` use plain non-UUID ids (`'1'`..`'6'`, `'m1'`..`'m5'`) for the no-Supabase-configured dev/test fallback that every other route in this repo already relies on (see `propertiesRoute.test.ts`, which forces the mock path via a placeholder Supabase URL). A strict `.uuid()` check would 400 the app's own seed data and break local dev/tests. Supabase's `.in('id', ids)` is parameterized either way, so the regex here is only about rejecting obviously-malformed input (empty, whitespace, oversized, exotic characters), not about format purity. |
| D2 | §3.3 `[+ Add]` modal (favorites list + search input) to add a property from `/compare` itself | **Not built for MVP.** Only `[✕ Remove]` ships. | Task brief: *"Ability to remove a property... and add another via a small search/autocomplete, if specified as MVP in the doc; otherwise removal only."* The page-spec tags the entire page "🟡 Phase 2" without a finer per-feature MVP/Phase split for the Add modal specifically, so the fallback clause applies. To compare more/different properties, the user goes back to `/search`, (de)selects checkboxes, and re-opens `/compare`. |
| D3 | §8 SEO: `/compare` (no ids) is an indexable static landing with an explainer; `/compare?ids=...` is noindex | **Both cases `noindex` for MVP.** No indexable marketing landing is built — `/compare` with no/invalid ids renders the same empty state as `?ids=` resolving to zero valid ids. | Task brief explicitly allows this simplification ("noindex is acceptable... per the doc if it says so"); building a separate SEO-optimized explainer page is out of scope and no other page in this app currently ships hreflang/indexable-landing infrastructure to hang it on. |
| D4 | §7 a11y / general spec assumes localized copy (`hy`/`ru`/`en`) throughout, `hreflang` | **Route is locale-prefixed** (`/[locale]/compare`, works through `i18n/routing.ts` — `localePrefix: 'always'`) but **page chrome copy is hardcoded English**, matching every comparable page shipped so far (`app/[locale]/favorites/page.tsx`, `not-found.tsx`, `FavoritesToolbar.tsx` all hardcode English strings directly — none of them pull from `messages/*.json`, which currently only has `nav`/`header`/`lang`/`currency`/`footer`/`search` namespaces). "i18n-aware route" in the acceptance criteria means: the URL correctly carries and round-trips the `[locale]` segment via `@/i18n/navigation`'s `Link`/`useRouter` (so a Russian-locale user stays on `/ru/compare?ids=...`), not that the compare table's own UI strings are translated. Property `title`/`address` fields *are* per-locale JSON already (`title.hy/ru/en`) — resolve those the same way `PropertyCard.tsx:68` does (`title['en'] ?? title['hy'] ?? Object.values(title)[0]`). |
| D5 | §5 `GET /api/properties?ids=...` as if it were a new/separate endpoint | **Extend the existing `app/api/properties/route.ts` GET handler** with an `ids` branch, checked before `parseSearchParams`/`filtersSchema` run. Do not create a second collection route. | That file already owns `GET /api/properties` and already has the Supabase-vs-mock-data-fallback scaffolding this needs; forking a parallel endpoint would duplicate the fallback logic and the two would drift. See §5.1 for the exact branch shape. |
| D6 | Compare checkbox appears on "search results `02-search.md` and favorites `07-favorites.md`" | **Search results grid only for this task.** `FavoritesToolbar.tsx` already has a disabled "⚖ Compare" button (`components/favorites/FavoritesToolbar.tsx:143-153`) explicitly commented `// Compare — Phase 2, disabled` — **leave it exactly as-is.** Do not enable it, do not add per-card checkboxes to `FavoriteCard.tsx`. | Task brief's in-scope list only names "PropertyCard in the existing search results grid." Touching Favorites is scope creep the reviewer checklist would flag ("no changes to... Search page layouts beyond adding the compare checkbox/bar" — Favorites isn't Search). Wiring Favorites up is a natural fast-follow once this ships, using the same `useCompareStore`. |
| D7 | Best-value / diff highlighting marks the "best" row value in green | Not built (belongs to the deferred Highlight-differences toggle, §0). Compare table for MVP is a plain fact table, no computed "best" marking. | Keeps the diff small and matches the task's explicit scope. |

---

## 2. Component inventory

```
app/[locale]/compare/
  page.tsx                          (NEW — Server Component shell: reads searchParams,
                                      validates `ids` at the boundary with lib/compare/schemas.ts,
                                      sets noindex metadata, renders <ComparePageClient />)

components/compare/
  ComparePageClient.tsx              (NEW — client: breadcrumbs + h1 + <CompareTable/>, owns the
                                       react-query fetch keyed by the parsed ids)
  CompareTable.tsx                   (NEW — client: renders the actual <table>, one <col> per
                                       property, sticky label column; renders per-state: loading
                                       skeleton / empty / under-minimum / table)
  CompareEmptyState.tsx              (NEW — 0-selected illustration + CTAs, reuses the
                                       not-found.tsx icon-circle pattern)
  CompareBar.tsx                     (NEW — client: fixed bottom bar, "Compare (n)" + [Compare →],
                                       reads useCompareStore; mounted from SearchPageClient only)
  CompareCheckbox.tsx                (NEW — small reusable checkbox pill used inside PropertyCard;
                                       role="checkbox", reads/writes useCompareStore)

lib/compare/
  types.ts                          (NEW — CompareProperty, CompareState, MAX_COMPARE=4, MIN_COMPARE=2)
  schemas.ts                        (NEW — idsQuerySchema + parseCompareIds(), §5.1)
  state.ts                          (NEW — pure helpers: deriveCompareState(ids, items) and
                                       isUnavailable(item); no DOM, unit-testable in the
                                       `environment: 'node'` vitest setup — see §9)
  mockData.ts                       (NEW — getMockPropertiesByIds(ids): CompareProperty[], reuses
                                       lib/search/mockData.ts SEED_PROPERTIES for the no-Supabase
                                       fallback path, see §5.1)
  mapCompareRow.ts                  (NEW — mapCompareRows(rows, ids): CompareProperty[], the
                                       Supabase-row → CompareProperty mapper used by the route
                                       branch in app/api/properties/route.ts, §5.1)

store/
  compareStore.ts                   (NEW — Zustand + persist middleware, §6)

components/search/
  PropertyCard.tsx                  (EDIT — mount <CompareCheckbox property={property} />)
  SearchPageClient.tsx              (EDIT — mount <CompareBar /> once, sibling to the results panel)

app/api/properties/
  route.ts                          (EDIT — add the `ids` branch ahead of filter parsing, §5.1)
```

Reuse, don't fork: `lib/utils.ts` (`cn`), the icon-circle empty-state pattern
from `app/[locale]/property/[id]/[slug]/not-found.tsx`, the `Scale` icon from
`lucide-react` (already used for the placeholder Compare button in
`FavoritesToolbar.tsx` — keep using the same icon for the checkbox so the two
surfaces read as the same feature once Favorites gets wired up later), the
breadcrumb markup from `app/[locale]/favorites/page.tsx:58-84` (desktop `Home ›
X` / mobile `‹ Back`), and the toast visual pattern from `FavoritesGrid.tsx`
(`fixed bottom-6 ... bg-gray-900 text-white rounded-xl`) if a toast is needed for
the max-reached case (§3).

---

## 3. Wireframes

### 3.1 PropertyCard — compare checkbox (new)

The photo overlay already has badges top-left (`absolute top-3 left-3`) and the
favorite heart top-right (`absolute top-3 right-3`). Add the compare checkbox at
**bottom-left** of the photo, same visual language as the heart button (white/90
pill, so it reads against any photo):

```
┌───────────────────────────────┐
│ [NEW]                    (♡)  │  ← existing badges / favorite
│                                │
│                                │
│ [☐ Compare]                   │  ← NEW, absolute bottom-3 left-3
├───────────────────────────────┤
│ 52M ֏                         │
│ 🛏 2  🛁 1  📐 75 m²  fl. 4/9  │
│ Arabkir, Yerevan               │
└───────────────────────────────┘
```

Checked state: `[☑ Compare]` — filled `bg-primary text-white`, same visual swap
the heart button already does (`isFav ? 'bg-primary text-white' : 'bg-white/90 ...'`).
At `MAX_COMPARE` (4) reached, unchecked cards' checkbox becomes disabled
(`opacity-50 cursor-not-allowed`) with `title="You can compare up to 4 properties"` —
no toast needed for this hover-discoverable disabled state; a toast is nice-to-have
only for a still-attempted click on a disabled checkbox (optional, skip if tight
on time — not in the acceptance criteria).

Must use `preventDefault()` + `stopPropagation()` in the click handler exactly
like `toggleFav` in `PropertyCard.tsx:62-66` does, since the checkbox lives
inside the card's enclosing `<Link>` (this app already nests interactive
controls inside the card's anchor for the heart and photo-nav arrows — follow
that established, if imperfect, pattern rather than restructuring the card).

### 3.2 Compare bar (floating, search results only)

```
┌──────────────────────────────────────────────┐
│  ⚖ 2 selected                    [Compare →] │   fixed bottom-4 inset-x-4 (mobile)
└──────────────────────────────────────────────┘     sm:inset-x-auto sm:right-6 sm:w-auto
```

- Appears only when `ids.length >= 1` (so the user sees progress after the first
  tap); `[Compare →]` is disabled (`opacity-50 cursor-not-allowed`, no navigation)
  while `ids.length < 2`, with `aria-disabled="true"` — clicking it while disabled
  does nothing (the under-minimum messaging lives on `/compare` itself, once the
  user does have 2+ and navigates there is the only case that matters for the
  "add at least 2" empty state per the acceptance criteria; the disabled button
  is just a lightweight discouragement, not required to explain itself further).
- `[Compare →]` navigates to `` `/compare?ids=${ids.join(',')}` `` via the
  locale-aware `useRouter()`/`Link` from `@/i18n/navigation`.
- Dismiss affordance: small `[✕]` at the bar's right edge that calls
  `useCompareStore().clear()` (not in the generic spec's ASCII but needed so the
  user isn't stuck with a persistent bar they don't want — cheap addition,
  consistent with `FavoritesGrid.tsx`'s toast dismiss `[✕]`).

### 3.3 `/compare?ids=...` — desktop table (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Compare                                               │
│ Compare  2/4                                                 │
├──────────┬─────────────┬─────────────┬─────────────────────┤
│ (sticky) │ 🖼      [✕] │ 🖼      [✕] │  ← photo click →      │
│ labels   │ Apt. Arabkir │ Apt. Kentron│    /property/[id]/[slug]│
├──────────┼─────────────┼─────────────┼─────────────────────┤
│ Price    │ 52,000,000 ֏│ 85,000,000 ֏│
│ Price/m² │ 693K ֏      │ 773K ֏      │
│ Area     │ 75 m²       │ 110 m²      │
│ Rooms    │ 2           │ 3           │
│ Bedrooms │ 2           │ 3           │
│ Bathrooms│ 1           │ 2           │
│ Floor    │ 4/9         │ 7/12        │
│ Year     │ —           │ —           │  ← mock fallback: no data, render "—"
│ Type     │ Apartment   │ Apartment   │
│ Deal type│ Sale        │ Sale        │
│ Amenities│ ✓ parking   │ — parking   │  ← one row per amenity key in the union
│          │ — elevator  │ ✓ elevator  │
│ District │ Arabkir     │ Kentron     │
│ City     │ Yerevan     │ Yerevan     │
└──────────┴─────────────┴─────────────┴─────────────────────┘
```

### 3.4 Mobile (<768px) — horizontal scroll

Same structure as the generic spec's §2 mobile block: sticky label column
`w-24`, each property column `min-w-[160px]`, `overflow-x-auto` on the table
wrapper. No changes from the generic spec here — implement it as drawn there.

### 3.5 Under-minimum (1 selected)

```
┌────────────────────────────────────────────────────────────┐
│ Compare  1/4                                                 │
├──────────┬─────────────┬─────────────────────────────────────┤
│ (sticky) │ 🖼      [✕] │  Add at least one more property      │
│ labels   │ Apt. Arabkir│  to compare.                         │
│          │             │  [Search properties →]                │
│ Price    │ 52,000,000 ֏│                                        │
│  ...     │ ...         │                                        │
└──────────┴─────────────┴─────────────────────────────────────┘
```

Render the one real column plus a placeholder column (dashed border,
`border-2 border-dashed border-gray-200 rounded-xl`) with the message above and
a `[Search properties →]` link to `/search`. This *is* a form of "table," but it
satisfies "shows the 'add at least 2' message instead of a broken table" — the
important thing the acceptance criteria is checking is that no comparison rows
render with only one column of real data implying a comparison that doesn't
exist. If simpler to implement, an alternative acceptable rendering is: hide the
data rows entirely and show only the message + the one property's photo/title
card + `[Search properties →]`. Either is fine; pick whichever is less code —
this is a state, not a pixel-perfect requirement.

### 3.6 Empty (0 selected / all ids invalid)

Reuse the icon-circle pattern from `not-found.tsx` verbatim (swap `Search` icon
for `Scale`):

```
        ┌────────────┐
        │     ⚖      │   w-32 h-32 rounded-full bg-gray-100
        └────────────┘
   No properties selected to compare

   Select properties from search results
   using the "Compare" checkbox on each card.

      [Search properties →]
```

### 3.7 Unavailable column (sold / deleted)

```
┌─────────────┐
│   ⚠         │   same icon-circle treatment, smaller: w-16 h-16
│ No longer   │
│ available   │
│   [✕ Remove]│
└─────────────┘
```

Renders **in place of** that column's data rows (the column still occupies its
slot in the table so the other columns don't visually jump) — see §7 for the
`sold` vs `not-found` distinction and exactly what data (if any) is still shown.

---

## 4. Layout tokens (exact classes)

| Element | Class string |
|---|---|
| Compare checkbox pill (unchecked) | `absolute bottom-3 left-3 flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-medium bg-white/90 text-gray-600 hover:bg-white shadow transition-colors` |
| Compare checkbox pill (checked) | same base classes, swap to `bg-primary text-white` |
| Compare checkbox pill (disabled, max reached) | add `opacity-50 cursor-not-allowed pointer-events-none` (keep it in the DOM, just visually inert — do not unmount it, so layout doesn't shift) |
| Compare bar (mobile) | `fixed bottom-4 inset-x-4 z-40 flex items-center justify-between gap-3 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg` |
| Compare bar (desktop) | `sm:inset-x-auto sm:left-auto sm:right-6 sm:w-auto sm:min-w-[280px]` |
| Compare bar CTA | `h-9 px-4 rounded-lg bg-white text-gray-900 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed` |
| H1 "Compare 2/4" | `text-2xl font-semibold text-gray-900` + count `text-base text-gray-500 font-normal ml-2` |
| Table wrapper | `overflow-x-auto` |
| Table | `w-full border-collapse` |
| Label cell (`<th scope="row">`) | `sticky left-0 z-10 bg-white text-sm text-gray-500 font-medium text-left p-3 border-b border-gray-100 whitespace-nowrap` |
| Value cell (`<td>`) | `text-sm text-gray-900 p-3 border-b border-gray-100 text-center min-w-[160px] sm:min-w-[200px]` |
| Column header cell | `p-3 border-b border-gray-100 align-top min-w-[160px] sm:min-w-[200px]` |
| Column photo | `w-full h-28 rounded-lg object-cover cursor-pointer` (wrap in `Link` to `/property/[id]/[slug]`) |
| `[✕ Remove]` | `absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-gray-500 hover:text-red-600 hover:bg-white flex items-center justify-center shadow transition-colors` |
| Missing value | render literal `—`, `text-gray-300` |
| Amenity ✓ | `text-green-600` (lucide `Check`, `aria-hidden`) |
| Amenity — | `text-gray-300` (literal dash, not an icon, for screen-reader simplicity) |
| Empty-state icon circle | `w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center` (icon `w-14 h-14 text-gray-300`) — identical to `not-found.tsx` |
| Unavailable column icon circle | same pattern, smaller: `w-16 h-16` / icon `w-8 h-8` |
| Under-minimum placeholder column | `border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center p-4 gap-2 text-sm text-gray-500` |

---

## 5. Data & API

### 5.1 `GET /api/properties?ids=...` (extend the existing route)

Add a branch **before** `parseSearchParams`/`filtersSchema.parse` runs in
`app/api/properties/route.ts`, so an `ids` request never touches the unrelated
filter-validation path:

```ts
// lib/compare/schemas.ts
import { z } from 'zod'

export const MAX_COMPARE = 4
export const MIN_COMPARE = 2

/**
 * Property ids in this codebase are UUIDs in production but plain short
 * strings ('1', 'm1', ...) in the mock/dev-fallback seed data (see
 * lib/search/mockData.ts). Validate a safe token shape, not a strict UUID —
 * Supabase's `.in()` is parameterized regardless, so this is about rejecting
 * garbage input gracefully (empty, whitespace, oversized), not format purity.
 */
const idToken = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9-]+$/)

/**
 * Parses a raw `?ids=` query value into a deduped, capped list of valid ids.
 * Never throws: malformed tokens are dropped, duplicates are dropped, and if
 * more than MAX_COMPARE valid ids remain only the first MAX_COMPARE are kept
 * — "reject gracefully," per the acceptance criteria, not a 400.
 */
export function parseCompareIds(raw: string | null): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  for (const token of raw.split(',')) {
    const result = idToken.safeParse(token)
    if (result.success) seen.add(result.data)
    if (seen.size >= MAX_COMPARE) break
  }
  return Array.from(seen)
}
```

Route branch:

```ts
// app/api/properties/route.ts — inside GET(), before filters parsing
const idsParam = request.nextUrl.searchParams.get('ids')
if (idsParam !== null) {
  const ids = parseCompareIds(idsParam)
  if (ids.length === 0) {
    return NextResponse.json({ items: [] })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('properties')
        .select(
          `id, slug, title, price, currency, deal_type, area_m2, rooms, bedrooms,
           bathrooms, floor, floors_total, year_built, property_type, status,
           city, district, amenities, property_media(url, sort_order)`,
        )
        .in('id', ids) // parameterized — supabase-js binds array values, no string concat

      if (!error && data) {
        return NextResponse.json({ items: mapCompareRows(data, ids) })
      }
    } catch {
      // fall through to mock data below
    }
  }

  return NextResponse.json({ items: getMockPropertiesByIds(ids) })
}
```

`mapCompareRows` builds `CompareProperty[]` **in the same order as the input
`ids`** (Supabase does not guarantee row order for `.in()`) and does **not**
drop `status === 'sold'` rows — those map to `CompareProperty.unavailable =
true` with the rest of their real fields still attached (title/photo still
render in the unavailable card per §3.7, since "sold" still has a row in the DB).
An id with **no matching row at all** (hard-deleted) becomes a synthetic
`{ id, unavailable: true, title: null, ...all other fields null }` entry — the
client can't tell "sold" from "deleted" from the API shape alone, and doesn't
need to; both render the same "No longer available" column with just `[✕
Remove]`, no photo.

```ts
// lib/compare/types.ts
export interface CompareProperty {
  id: string
  unavailable: boolean
  slug: string | null
  title: Record<string, string> | null
  price: number | null
  currency: 'AMD' | 'USD' | 'EUR' | 'RUB' | null
  dealType: 'sale' | 'rent' | null
  area: number | null
  rooms: number | null
  bedrooms: number | null
  bathrooms: number | null
  floor: number | null
  floorsTotal: number | null
  yearBuilt: number | null
  propertyType: string | null
  city: string | null
  district: string | null
  amenities: string[]
  cover: string | null
}
```

`price / m²` is **derived client-side** in `CompareTable.tsx`
(`price && area ? Math.round(price / area) : null`), not sent by the API —
keeps the payload a straight mirror of the columns and avoids a
divide-by-zero/null edge case living in two places.

`getMockPropertiesByIds` (new, `lib/compare/mockData.ts`) filters
`SEED_PROPERTIES` from `lib/search/mockData.ts` by id and maps
`PropertyListItem → CompareProperty`, filling `yearBuilt`/`propertyType`/
`amenities` with `null`/`[]` (the mock seed doesn't carry those fields — they
render as `—` / an empty amenities section, which is correct and expected in
mock/dev mode, not a bug).

### 5.2 Table rows (MVP set — trimmed from the generic spec's §3.2)

Photo · Title/address (header) · Price · Price/m² · Area · Rooms · Bedrooms ·
Bathrooms · Floor (`floor/floorsTotal`) · Year built · Property type · Deal type
· Amenities (one row per amenity key in the **union** across compared
properties — humanize `snake_case` → `Snake case`) · District · City.

(Dropped from the generic spec for MVP: the Phase-3 distance row, "Condition" —
not present in `properties`/`CompareProperty` at all, fold into a follow-up if
the schema grows it.)

---

## 6. Client state — `useCompareStore`

```ts
// store/compareStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MAX_COMPARE } from '@/lib/compare/schemas'

interface CompareState {
  ids: string[]
  toggle: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  setIds: (ids: string[]) => void
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return { ids: s.ids.filter((x) => x !== id) }
          if (s.ids.length >= MAX_COMPARE) return s
          return { ids: [...s.ids, id] }
        }),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      clear: () => set({ ids: [] }),
      setIds: (ids) => set({ ids: ids.slice(0, MAX_COMPARE) }),
    }),
    { name: 're-compare-ids' }, // localStorage key
  ),
)
```

- **Search grid → bar → `/compare`:** `PropertyCard`'s checkbox calls `toggle`;
  `CompareBar` reads `ids` and navigates to `` `/compare?ids=${ids.join(',')}` ``.
  Store state is what "survives navigation within search" (pagination/filter
  changes on `/search` don't remount the store — it's module-level Zustand
  state, not component state) plus a page reload (via `persist`/localStorage).
- **`/compare` → removing a column:** call `useCompareStore().remove(id)`, then
  update the URL via `router.replace(`/compare?ids=${newIds.join(',')}`, {
  scroll: false })` using `useRouter` from `@/i18n/navigation` — this is a
  client-side transition, not a full reload, satisfying "Removing a property...
  updates the URL/state without a full page reload."
- **`/compare` page load (deep link / shared URL):** `ComparePageClient` calls
  `setIds(parsedIdsFromUrl)` in a `useEffect` on mount so a shared link (guest,
  no prior localStorage state) becomes the source of truth and overwrites
  whatever was in the store — the URL wins over stale local state on direct
  navigation to `/compare`.
- Selecting a 5th property is a no-op (`toggle` above silently ignores it once
  `ids.length >= MAX_COMPARE`); the disabled checkbox from §3.1 is the primary
  affordance communicating the cap, no separate error state is required by the
  acceptance criteria.

---

## 7. State derivation (pure, unit-testable)

```ts
// lib/compare/state.ts
import type { CompareProperty } from './types'
import { MIN_COMPARE } from './schemas'

export type CompareViewState = 'empty' | 'under-minimum' | 'ready'

/** Derives which of the three page states to render from the parsed ids. */
export function deriveCompareState(ids: string[]): CompareViewState {
  if (ids.length === 0) return 'empty'
  if (ids.length < MIN_COMPARE) return 'under-minimum'
  return 'ready'
}

/** A CompareProperty is unavailable (sold or hard-deleted) — same UI either way. */
export function isUnavailable(item: CompareProperty): boolean {
  return item.unavailable
}
```

Keep this logic out of `CompareTable.tsx` and in this pure module — the vitest
setup runs with `environment: 'node'` (no DOM/RTL in this repo, see §9), so
anything that needs to be asserted by a test belongs in `lib/`, with components
staying thin renderers of already-derived state.

---

## 8. Page shell & SEO

```ts
// app/[locale]/compare/page.tsx (sketch)
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Compare properties | RE Platform',
    robots: { index: false, follow: false }, // D3 — noindex unconditionally for MVP
  }
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const raw = typeof sp.ids === 'string' ? sp.ids : undefined
  const ids = parseCompareIds(raw ?? null) // validated at the server boundary — never crashes on bad input
  return <ComparePageClient initialIds={ids} />
}
```

`ComparePageClient` is the client component that owns the `react-query`
`useQuery(['compare', ids], () => fetch('/api/properties?ids=' + ids.join(',')))`
call and renders `CompareEmptyState` / the under-minimum placeholder / `CompareTable`
per `deriveCompareState(ids)`. This matches the reviewer checklist's "compare
table can be a client component reading query params" note — the Server
Component (`page.tsx`) only does metadata + the boundary validation of `ids`,
nothing else.

---

## 9. Testing notes

Mirror the existing `__tests__/*.test.ts` conventions (`environment: 'node'`,
one file per unit, `propertiesRoute.test.ts`'s `beforeAll` env-var + mock-fallback
pattern for route tests). Suggested new files:

- `__tests__/compareSchemas.test.ts` — `parseCompareIds`: empty/undefined input
  → `[]`; valid comma list → array in order; duplicate ids deduped; malformed
  tokens (empty string, whitespace, `<script>`, way-too-long) dropped, not
  thrown; more than `MAX_COMPARE` valid ids → truncated to 4, no throw.
- `__tests__/compareState.test.ts` — `deriveCompareState([])` → `'empty'`;
  `(['a'])` → `'under-minimum'`; `(['a','b'])` / `(['a','b','c','d'])` →
  `'ready'`; `isUnavailable({ ...item, unavailable: true })` → `true` /
  `false` for a normal active item.
- `__tests__/propertiesRoute.test.ts` (extend, don't fork) — add cases for the
  new `ids` branch: `GET /api/properties?ids=1,2` (mock fallback, forced via
  the existing placeholder-Supabase-URL trick) returns `items` in the same
  order as the requested ids; an id with no seed match comes back as
  `{ id, unavailable: true, ... }` rather than a 500/throw; `?ids=` with only
  malformed tokens returns `{ items: [] }`, status 200 (not a 400 — "gracefully,"
  per the acceptance criteria, matches `parseCompareIds` never throwing).

These three files cover exactly the acceptance criteria's "Tests cover
ids-param validation, the under-minimum empty state, and the unavailable-listing
state." Component-level rendering assertions are not this repo's pattern (no
`@testing-library/react`/jsdom wired into `vitest.config.ts`) — don't add that
tooling for this task; keep the logic under test in `lib/`.

---

## 10. Accessibility

Follow the generic spec's §7 as-is for the parts that are in MVP scope: proper
`<table><thead><tbody>` semantics with `<th scope="row">` for labels and
`<th scope="col">` for the per-property column headers; `[✕ Remove]`
`aria-label="Remove {title} from comparison"`; photo `alt` = `{title} —
{district}`; horizontal scroll wrapper is a native `overflow-x-auto` div (already
keyboard-scrollable); contrast ≥ 4.5:1 (all tokens in §4 are drawn from
already-audited pairs elsewhere in this app); touch targets ≥ 44px (checkbox
pill `h-8`+padding, remove button `w-7 h-7` — round up to `w-8 h-8`/`44px` hit
area via padding if literal 28px reads too small, matching the heart button's
actual rendered hit area in `PropertyCard.tsx`).
