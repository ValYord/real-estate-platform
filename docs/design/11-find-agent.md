# Page 11 — Find an Agent: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/11-find-agent.md`](../en/pages/11-find-agent.md) (deep spec) —
read that first for scenarios, the full page-state table, accessibility and
analytics intent. This document does **not** repeat those sections wholesale;
it closes the gap between that generic spec and *this specific codebase* —
exact components to create/reuse, exact Tailwind tokens already in use, the
exact data model this page reads (the `agents`/`profiles` tables already
shipped by Page 10, unmodified), and the deliberate MVP trims called out by
the task brief. A developer should be able to implement the MVP directly from
this file plus the task's acceptance criteria, without re-deriving decisions.

**Task scope reminder (MVP).** Build the `/agents` directory: SSR list of
agent cards, a filter bar (city / specialty / language / minimum rating), a
sort control, pagination, empty/loading states, and basic SEO — all backed by
one new `GET /api/agents` endpoint. Explicitly **not** built in this task: the
`🏢 Teams / Companies` tab and `/agency/[slug]` (agency-level directory), the
"Compare offers" broadcast flow and the `agent-requests`/proposals machinery,
the "Request an agent" quick-contact modal on cards, the map view, "Become an
agent" onboarding, the agent claim/verification workflow, indexable
`/agents/[city]` landing slugs, and any Pro/promoted-placement ranking —
sort is a plain deterministic `ORDER BY`. None of these are in the task's
acceptance criteria; do not build them speculatively.

Audited against `origin/main` at commit `343ace7` (post Page 10 — Agent /
Agency Profile MVP, the immediately preceding task this page builds on):
`supabase/migrations/0008_agent_profile.sql` (the `agents` /
`agent_reviews` / `agent_leads` tables — **reused as-is, no schema change**);
`lib/agent/{types,schemas,mockData}.ts`; `app/api/agents/[slug]/route.ts`,
`app/api/agents/[id]/listings/route.ts`, `app/api/agents/[id]/reviews/route.ts`;
`components/agent/OtherAgents.tsx` (the closest existing precedent for
"query a list of agents and render cards"); `app/[locale]/agent/[slug]/page.tsx`
(already links its breadcrumb and the suspended-state CTA to `/agents` —
this task is what makes that link resolve); `app/[locale]/search/page.tsx` +
`components/search/{SearchPageClient,FilterBar,ListingsPanel,EmptyState}.tsx` +
`lib/search/filtersSchema.ts` (the closest existing precedent for
"URL-synced filters + sort + pagination + React Query", reused throughout
this spec); `components/favorites/SortBottomSheet.tsx` (mobile bottom-sheet
chrome, reused for the mobile filter sheet); `lib/supabase/admin.ts`;
`lib/locale.ts` (`LOCALES = ['hy','ru','en']`); `i18n/navigation.ts`.
Stack confirmed: Next.js 15 App Router, Tailwind v4 (`@theme` tokens, no
`tailwind.config.*`), `lucide-react`, `@tanstack/react-query`, `next-intl`,
Supabase (`@supabase/ssr` + `@supabase/supabase-js` admin client), `zod`.

---

## 1. Design decisions that deviate from the generic page spec

| # | Page-spec / naive reading says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Generic REST convention would return `422` for query-validation failures (and that **is** what every sibling agent endpoint does: `[slug]`, `[id]/listings`, `[id]/reviews` all reply `422 { error: 'invalid_params' }`) | **This task's own acceptance criteria is explicit and literal: "invalid params return a 400 with a clear error, not a 500."** `GET /api/agents` replies `400 { error: 'invalid_params', fields }` on a `ZodError`, not `422`. This is an intentional, documented inconsistency with the three sibling routes above — do not "fix" it to match them; the task brief is the source of truth for this endpoint's contract. |
| D2 | Product spec models `agent` as a standalone entity with `subscription_tier`, `avg_response_time`, etc. as if querying one flat table | Page 10 already shipped the real shape: **`agents`** (1:1 on `profiles.id`, holds `bio/specialties/languages/scope/verified/status/avg_response_hours/deals_closed_count`) joined to **`profiles`** (holds `full_name/avatar_url/agency_name/agent_slug/agent_rating/agent_review_count/tier/created_at`). The directory query is a join of these two tables — see §2.2. Do not re-flatten them into a new table; do not add columns to either table for this task (the one exception, D3, is additive and mirrors an existing trigger pattern). |
| D3 | Product spec's "Most listings" sort implies a per-agent live count, sortable and paginable | A per-row `COUNT(*)` subquery that also needs to **sort and paginate** the full filtered set can't be expressed as a cheap PostgREST query, and building a materialized view / RPC is disproportionate for an MVP sort option. Instead: add **one** denormalized counter column, `agents.listings_active_count INTEGER NOT NULL DEFAULT 0`, kept in sync by a trigger on `properties` — the exact same pattern already shipped for `profiles.agent_rating`/`agent_review_count` via `agent_reviews_sync_profile_stats()` in `0008_agent_profile.sql`. This makes "Most listings" a plain indexed `ORDER BY listings_active_count DESC`. See §2.1. |
| D4 | Product spec's hero has a separate autocomplete search bar (`GET /api/geo/cities`) **and** a sidebar city filter | Building a geo-autocomplete endpoint is not in this task's acceptance criteria and would duplicate the filter bar's own city field. There is already a precedent for "city filter without an autocomplete backend": `components/search/FilterBar.tsx`'s `CityInput` — a plain debounced (400 ms) text input with a `MapPin` icon and Enter-to-commit, no API call. Reuse that exact component/pattern for the one and only city field on this page; there is no separate hero search bar. |
| D5 | Product spec: `[👤 Agents] [🏢 Teams/Companies]` tabs | Teams/Companies is out of scope (task brief: "agency-level directory" excluded). Ship **no tab control at all** — a tab bar with a single working tab and one permanently-disabled tab is worse UX than no tabs. If/when `/agency/[slug]` ships, add the tab bar in that follow-up task, not as a disabled stub here. |
| D6 | Product spec's agent card has **[Profile]** and **[💬 Contact]** as two separate buttons plus "whole card click → profile" | The task's acceptance criteria for the card lists only: avatar, name, ✓ Verified, rating, city/scope, specialties, active-listings count, "linking to `/agent/[slug]`" — no quick-contact action is listed, and quick contact would need its own modal + `POST` endpoint that isn't in scope (see task brief's out-of-scope list, which implicitly covers this by omission — contact happens on the profile page, which already has a full `AgentContactCard` from Page 10). Ship the card as a **single whole-card `<Link>`** to `/agent/[slug]`, no inner buttons, no nested-interactive-element accessibility problem to solve. |
| D7 | Product spec's "Compare CTA banner" / "How it works" / "Are you an agent?" sections | All three are marketing/funnel content wrapped around the (out of scope) Compare-offers flow and agent onboarding. Cut entirely for the MVP — the page is filters + results + pagination, full stop. |
| D8 | Task brief's exact query-param names: `city, specialty, lang, minRating, page` | Matches this codebase's existing `snake_case`-in-URL / `camelCase`-in-code split used by `lib/search/filtersSchema.ts` for everything **except** `minRating`, which the task brief gives already camelCase and single-word — keep it verbatim as `minRating` in the URL too (do not invent `min_rating`); it isn't a compound the rest of the app snake_cases, and matching the brief exactly matters for the acceptance criteria's "shareable/bookmarkable" wording (whatever shape ships, it must round-trip through the URL, which it does either way — verbatim is simply the literal contract given). |
| D9 | Suspended/deleted exclusion — could be read as "the existing `agents: public can select USING (true)` RLS policy already covers this" | It does **not**. That policy intentionally allows reading suspended rows too (Page 10's single-profile route relies on getting the row back so it can distinguish `404` vs `410`). The directory query therefore **must** add an explicit `.eq('status', 'active')` filter at the query level — RLS alone does not hide suspended agents here. "Deleted" agents need no special filter: `agents.user_id REFERENCES profiles(id) ON DELETE CASCADE` means a deleted profile's `agents` row is already gone. This is called out because it's exactly the kind of mistake CLAUDE.md's reviewer checklist and this task's acceptance criteria both flag ("Suspended/deleted agents never appear in results (enforced at the query level, not just UI)"). |

---

## 2. Data model

New migration file: **`supabase/migrations/0009_agent_directory.sql`** (first
free number after `0008_agent_profile.sql`).

### 2.1 `agents` — one additive column + sync trigger + indexes

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0009_agent_directory.sql
-- Page 11 — Find an Agent (MVP). No new tables: the directory reads the
-- `agents`/`profiles` tables shipped by 0008_agent_profile.sql as-is. This
-- migration adds only what the directory's filters/sort need:
--   • agents.listings_active_count — denormalized counter (see D3), synced
--     by trigger the same way profiles.agent_rating/agent_review_count are
--     synced by agent_reviews_sync_profile_stats() in 0008.
--   • GIN indexes on the array columns the filter bar queries by (&&/@>).
--   • a btree index supporting the "Top rated" sort.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE agents ADD COLUMN IF NOT EXISTS listings_active_count INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows once.
UPDATE agents a
SET listings_active_count = (
  SELECT COUNT(*) FROM properties p WHERE p.owner_id = a.user_id AND p.status = 'active'
);

CREATE OR REPLACE FUNCTION agents_sync_listings_active_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_owner UUID;
BEGIN
  -- Recompute for every owner_id touched by this change (covers status
  -- flips, deletes, and the rare case of owner_id changing).
  FOR affected_owner IN
    SELECT DISTINCT owner_id FROM (
      SELECT NEW.owner_id AS owner_id WHERE TG_OP IN ('INSERT', 'UPDATE')
      UNION
      SELECT OLD.owner_id AS owner_id WHERE TG_OP IN ('UPDATE', 'DELETE')
    ) touched
  LOOP
    UPDATE agents
    SET listings_active_count = (
      SELECT COUNT(*) FROM properties WHERE owner_id = affected_owner AND status = 'active'
    )
    WHERE user_id = affected_owner;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS agents_sync_listings_active_count_trg ON properties;
CREATE TRIGGER agents_sync_listings_active_count_trg
  AFTER INSERT OR UPDATE OF status, owner_id OR DELETE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION agents_sync_listings_active_count();

-- Filter performance: specialties/languages/scope are queried with && (overlap)
-- or @> (contains); scope additionally supports the exact single-city .contains()
-- pattern already used by components/agent/OtherAgents.tsx.
CREATE INDEX IF NOT EXISTS agents_specialties_gin_idx ON agents USING GIN (specialties);
CREATE INDEX IF NOT EXISTS agents_languages_gin_idx   ON agents USING GIN (languages);
CREATE INDEX IF NOT EXISTS agents_scope_gin_idx        ON agents USING GIN (scope);
CREATE INDEX IF NOT EXISTS agents_status_idx           ON agents (status);
CREATE INDEX IF NOT EXISTS agents_listings_active_count_idx ON agents (listings_active_count DESC);

-- "Top rated" sort reads profiles.agent_rating; add the matching index there
-- if 0005_dashboard.sql didn't already add one (IF NOT EXISTS makes this safe
-- either way).
CREATE INDEX IF NOT EXISTS profiles_agent_rating_idx ON profiles (agent_rating DESC NULLS LAST);
```

No RLS changes: `agents` already has `"agents: public can select" USING (true)`
(0008) — sufficient for a directory read, **provided the application-layer
query adds `.eq('status', 'active')`** (D9). No new table, so no new policy
to write.

### 2.2 Query shape (for `GET /api/agents`, §3)

Query **from `agents`**, embedding `profiles` with `!inner` (so profile
columns can be filtered/sorted without a second round trip) — this direction
matters because the array columns that need `.contains()`/`.overlaps()` live
on `agents`, and those methods take a plain top-level column name; only the
`profiles`-side filters (`role`, `agent_slug IS NOT NULL`, `agent_rating`)
need the dotted `profiles.<column>` / `{ foreignTable: 'profiles' }` forms:

```ts
let query = admin
  .from('agents')
  .select(
    `user_id, verified, specialties, languages, scope, listings_active_count,
     profiles!inner(id, full_name, avatar_url, agency_name, agent_slug,
                     agent_rating, agent_review_count, tier, created_at, role)`,
    { count: 'exact' },
  )
  .eq('status', 'active')                      // D9 — exclude suspended, query level
  .eq('profiles.role', 'agent')
  .not('profiles.agent_slug', 'is', null)       // unlisted without a public slug — same guard as OtherAgents.tsx

if (city) query = query.contains('scope', [city])
if (specialties.length) query = query.overlaps('specialties', specialties)
if (languages.length) query = query.overlaps('languages', languages)
if (minRating !== undefined) query = query.gte('profiles.agent_rating', minRating)

switch (sort) {
  case 'listings':
    query = query.order('listings_active_count', { ascending: false })
    break
  case 'newest':
    query = query.order('created_at', { foreignTable: 'profiles', ascending: false })
    break
  default: // 'rating'
    query = query.order('agent_rating', { foreignTable: 'profiles', ascending: false, nullsFirst: false })
      .order('agent_review_count', { foreignTable: 'profiles', ascending: false })
}

query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
```

**Implementation note for the developer:** verify `.eq('profiles.role', ...)`
(dotted embedded-filter syntax) and `.order(col, { foreignTable })` against
the installed `@supabase/supabase-js` version — both are documented
PostgREST/supabase-js features, but if either doesn't resolve as expected
against the live schema, the fallback is to swap the query to run **from
`profiles`** with `agents!inner(...)` embedded instead (mirrors
`app/api/agents/[slug]/route.ts`'s existing two-step profiles→agents lookup,
just with array filters expressed via `.filter('agents.specialties', 'ov', '{a,b}')`,
the raw-operator escape hatch `.filter()` always supports for embedded
columns). Either direction is fine; keep the chosen one consistent with the
tests in §13.

---

## 3. API contract

### 3.1 Zod schema — `lib/agents/schemas.ts`

```ts
import { z } from 'zod'
import { LOCALES } from '@/lib/locale'

/**
 * Canonical specialty vocabulary — matches the chip labels already rendered
 * by components/agent/AgentBio.tsx and the values seeded in
 * lib/agent/mockData.ts (apartments, new_construction, commercial, rentals),
 * extended with the two additional options the product spec's filter
 * checkbox group lists (houses, land). Do not invent a second vocabulary.
 */
export const AGENT_SPECIALTIES = [
  'apartments', 'houses', 'commercial', 'land', 'new_construction', 'rentals',
] as const
export type AgentSpecialty = (typeof AGENT_SPECIALTIES)[number]

export const AGENT_SORT_OPTIONS = ['rating', 'listings', 'newest'] as const
export type AgentSort = (typeof AGENT_SORT_OPTIONS)[number]

export const agentsQuerySchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
  specialty: z
    .union([z.array(z.enum(AGENT_SPECIALTIES)), z.enum(AGENT_SPECIALTIES).transform((v) => [v])])
    .optional(),
  lang: z
    .union([z.array(z.enum(LOCALES)), z.enum(LOCALES).transform((v) => [v])])
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(AGENT_SORT_OPTIONS).default('rating'),
  page: z.coerce.number().int().positive().default(1),
})

export type AgentsQuery = z.infer<typeof agentsQuerySchema>

/** Parse URLSearchParams into the query schema (repeated ?specialty=/&lang= supported). */
export function parseAgentsSearchParams(params: URLSearchParams): AgentsQuery {
  const specialty = params.getAll('specialty')
  const lang = params.getAll('lang')
  return agentsQuerySchema.parse({
    city: params.get('city') ?? undefined,
    specialty: specialty.length > 0 ? specialty : undefined,
    lang: lang.length > 0 ? lang : undefined,
    minRating: params.get('minRating') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: params.get('page') ?? undefined,
  })
}

/** Serialize back to a query string (used by the client filter bar + SSR page). */
export function agentsQueryToParams(q: Partial<AgentsQuery>): URLSearchParams {
  const p = new URLSearchParams()
  if (q.city) p.set('city', q.city)
  q.specialty?.forEach((s) => p.append('specialty', s))
  q.lang?.forEach((l) => p.append('lang', l))
  if (q.minRating !== undefined) p.set('minRating', String(q.minRating))
  if (q.sort && q.sort !== 'rating') p.set('sort', q.sort)
  if (q.page && q.page > 1) p.set('page', String(q.page))
  return p
}
```

This mirrors `lib/search/filtersSchema.ts`'s `parseSearchParams` /
`filtersToParams` pair exactly (array handling via `getAll`/`append`,
zod-defaults-after-`undefined`-stripping) — reuse that shape, don't invent a
new one.

### 3.2 `GET /api/agents?city=&specialty=&lang=&minRating=&sort=&page=`

```jsonc
// 200 OK
{
  "items": [
    {
      "id": "a1000000-0000-4000-8000-000000000001",
      "slug": "anna-petrosyan-yerevan",
      "name": "Anna Petrosyan",
      "avatar": null,
      "agencyName": "X Realty",
      "verified": true,
      "tier": "pro",
      "rating": 4.8,
      "reviewsCount": 37,
      "languages": ["hy", "ru", "en"],
      "scope": ["Yerevan", "Kotayk"],
      "specialties": ["apartments", "new_construction", "commercial", "rentals"],
      "listingsActive": 24
    }
  ],
  "total": 37,
  "page": 1,
  "pageSize": 12
}
// 400 { "error": "invalid_params", "fields": { "minRating": "Number must be less than or equal to 5" } }   ← D1
```

No 401/403/404/410 — this endpoint is fully public, matching the product
spec's "Everyone (Guest, User, Agent, Admin) can view."

### 3.3 Route handler — `app/api/agents/route.ts` (new file; coexists with
the existing `app/api/agents/[slug]/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { parseAgentsSearchParams } from '@/lib/agents/schemas'
import { filterSortPaginateMockAgents } from '@/lib/agents/mockData'
import type { AgentsListResponse } from '@/lib/agents/types'

const PAGE_SIZE = 12

export async function GET(request: NextRequest): Promise<NextResponse> {
  let query: ReturnType<typeof parseAgentsSearchParams>
  try {
    query = parseAgentsSearchParams(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: 'invalid_params', fields: err.flatten().fieldErrors },
        { status: 400 }, // D1 — this endpoint's contract is 400, not the sibling routes' 422
      )
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey && !supabaseUrl.includes('your-project-id')) {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      // ... build & run the query from §2.2, map rows to AgentListItem ...
      // return NextResponse.json(response) on success
    } catch {
      // Fall through to mock data
    }
  }

  return NextResponse.json(filterSortPaginateMockAgents(query, PAGE_SIZE))
}
```

`lib/agents/mockData.ts` exports a small fixture set (extend
`lib/agent/mockData.ts`'s `MOCK_AGENT` + `MOCK_OTHER_AGENTS` with
`specialties`/`languages`/`scope`/`listingsActive`, **plus at least one
`status: 'suspended'` fixture agent** so the "never appear in results" test
in §13 has something real to assert against) and a pure
`filterSortPaginateMockAgents(query, pageSize)` function so the exact same
filter/sort/paginate logic is exercised whether or not Supabase env vars are
configured — same "shared pure function" shape as
`app/api/agents/[id]/listings/route.ts`'s `applyMockFilters`.

---

## 4. Component tree & file layout

```
app/[locale]/agents/page.tsx           (Server Component, SSR)
 └─ <AgentsPageClient
      initialData={AgentsListResponse}
      initialQuery={AgentsQuery} />    (client)
      ├─ <AgentFilters />               (client — city/specialty/language/rating + Clear)
      │   └─ <AgentFilterSheet />       (mobile bottom-sheet wrapper, same chrome as SortBottomSheet.tsx)
      ├─ <AgentSortDropdown />          (client)
      ├─ <AgentResultsGrid />           (grid + skeletons + pagination, mirrors ListingsPanel.tsx)
      │   └─ <AgentCard agent={AgentListItem} />
      └─ <EmptyAgents onClearFilters />

lib/agents/
 ├─ types.ts       (AgentListItem, AgentsListResponse)
 ├─ schemas.ts      (§3.1)
 └─ mockData.ts     (§3.3)

app/api/agents/
 └─ route.ts        (GET — new; §3.3)

supabase/migrations/
 └─ 0009_agent_directory.sql   (§2.1)
```

`components/agents/` (plural — the directory) is a **new** sibling folder to
the existing `components/agent/` (singular — the profile page), matching how
`components/search/` and `components/favorites/` are each named after their
own route segment. Do not add these files under `components/agent/`.

---

## 5. Component specifications

### 5.1 `app/[locale]/agents/page.tsx` (Server Component)

Mirrors `app/[locale]/search/page.tsx`'s shape:
1. Read `searchParams`, parse with `parseAgentsSearchParams` (§3.1); on a
   `ZodError` (a hand-edited/garbage URL), fall back to the all-defaults
   query rather than crashing the page — the API route is what returns 400
   for programmatic/API callers, but a human landing on a malformed URL
   should still get a working page with defaults, same as `/search` does.
2. `fetch(`${baseUrl}/api/agents?${agentsQueryToParams(query)}`, { next: { revalidate: 60 } })`
   for the SSR initial payload (same `revalidate: 60` as `/search`, since
   this is public, non-personalized data).
3. Render `<AgentsPageClient initialData initialQuery />` plus the JSON-LD
   `<script>` (§11) and a plain `<h1>Find your real estate agent</h1>` +
   subheading (`text-gray-500`) above the client island — **not** inside it,
   so it's present in the initial HTML for SEO/no-JS regardless of hydration.
4. `generateMetadata` builds title/description/canonical/hreflang (§11).

### 5.2 `<AgentsPageClient>` (client)

Owns filter/sort/page state and the React Query call, exactly like
`SearchPageClient.tsx`:

```ts
const queryKey = ['agents', agentsQueryToParams(query).toString()]
const { data, isFetching } = useQuery({
  queryKey,
  queryFn: () => fetch(`/api/agents?${agentsQueryToParams(query)}`).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch agents')
    return r.json() as Promise<AgentsListResponse>
  }),
  initialData,
  placeholderData: keepPreviousData,
  staleTime: 30 * 1000,
})
```

- `handleFiltersChange(updates)` merges into `query`, resets `page: 1` when
  any filter (not sort) changes, and calls `router.push('/agents?' + params, { scroll: false })`
  wrapped in `startTransition` — identical to `SearchPageClient`'s
  `pushFilters`. This is what makes filtering **shareable/bookmarkable and
  SSR-read-on-load**, per the acceptance criteria: the URL is the single
  source of truth, `page.tsx` reads it on first load, the client only ever
  pushes updates to it.
- `handleClearFilters()` → `router.push('/agents')` (no query string at all).
- `handlePageChange(page)` → same push, keeps other params, scrolls results
  into view (`scroll: false` on the router push + a manual
  `resultsRef.current?.scrollIntoView({ block: 'start' })`, matching the
  scroll-preservation intent of `ListingsPanel`'s pagination).

### 5.3 `<AgentFilters>` (client)

Desktop (`≥1024px`): `<aside className="w-72 flex-shrink-0">`, `<fieldset>`
per group with a visible `<legend className="text-sm font-medium text-gray-700 mb-2">`:

- **City** — reuse `CityInput` from `components/search/FilterBar.tsx` verbatim
  (same debounce/Enter-commit behavior, same `MapPin` icon), copied into this
  folder as `components/agents/CityInput.tsx` (or extracted to a shared
  location if the developer prefers — either is fine, just don't
  reimplement the debounce logic from scratch).
- **Specialty** — `<fieldset>` with 6 checkboxes (`AGENT_SPECIALTIES`), each
  toggling membership in the `specialty` array param. Labels: "Apartments",
  "Houses", "Commercial", "Land", "New construction", "Rentals" (Title-Case
  of the enum values, `_` → space).
- **Language** — `<fieldset>` with 3 chip-toggle buttons (🇦🇲 hy · 🇷🇺 ru ·
  🇬🇧 en), same visual language as the language chips already rendered on
  the profile page (`bg-gray-50 border border-gray-200 text-sm px-2 py-0.5 rounded`,
  active state: `bg-primary/10 border-primary text-primary`).
- **Minimum rating** — `role="radiogroup"`, 3 options: "Any" (clears
  `minRating`), "⭐ 4+", "⭐ 4.5+".
- **`[Clear filters]`** — `text-sm text-gray-500 hover:text-gray-900`,
  rendered **only** when `city || specialty.length || lang.length || minRating`
  is truthy (same conditional-render convention as `/search`'s clear button).

Mobile (`<768px`): a `[⚙ Filters (N)]` button (`N` = active-filter count,
badge same style as `FavoritesToolbar`'s counters) opens `<AgentFilterSheet>`
— a bottom sheet built on the **exact chrome** of
`components/favorites/SortBottomSheet.tsx` (backdrop, `role="dialog"`,
Escape-to-close, body-scroll lock, `translate-y-full` → `translate-y-0`
transition, safe-area padding), but containing the same fieldset content as
the desktop sidebar instead of a single-select list. A `[Apply]` button at
the bottom commits all pending changes in one `router.push` (avoids one push
per checkbox tap) and closes the sheet.

### 5.4 `<AgentSortDropdown>` (client)

Native `<select>` (`h-9 text-sm border border-gray-300 rounded-md`, matches
the sort-dropdown token from the product spec's tokens table), 3 options:

| value | label |
|---|---|
| `rating` (default) | Top rated |
| `listings` | Most listings |
| `newest` | Newest |

On change: `handleFiltersChange({ sort: value })` — does **not** reset `page`
to 1 per se, but since the resulting order is different, resetting to page 1
is the correct UX and matches `/search`'s `FilterBar` sort behavior (sort
changes go through the same `onFiltersChange` path as every other filter,
which already resets page).

### 5.5 `<AgentResultsGrid>` (client)

Mirrors `ListingsPanel.tsx` structure:
- Header row: `"{total} agents"` (`text-sm text-gray-500`) + `<AgentSortDropdown>`.
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` (per product
  spec §2 "1-col mobile, 2-col md, 3-col lg").
- Loading (first load, `isFetching && items.length === 0`): 6
  `bg-gray-100 animate-pulse rounded-xl h-40` skeleton cards (token from the
  product spec's tokens table) — **not** the property `SkeletonCard`'s `h-72`,
  agent cards are shorter.
- Re-fetch (filters changed, previous data still shown): grid dims to
  `opacity-60` via `keepPreviousData`, same as `ListingsPanel`.
- Empty (`!isFetching && items.length === 0`): `<EmptyAgents onClearFilters />`.
- Pagination: reuse `ListingsPanel`'s exact numbered-pagination component
  (`buildPageNumbers` helper + Prev/Next buttons) — extract it to a shared
  `components/ui/Pagination.tsx` if convenient, or duplicate it verbatim;
  either is acceptable, but don't redesign the pagination UX.
- `role="status" aria-live="polite"` sr-only "Loading agents…" announcement
  while fetching, same as `ListingsPanel`.

### 5.6 `<AgentCard>` (presentational)

Single whole-card `<Link href={`/agent/${agent.slug}`}>` (D6 — no nested
buttons):

```tsx
<Link
  href={`/agent/${agent.slug}`}
  className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
>
  <div className="flex items-start gap-3">
    {/* Avatar w-16 h-16 rounded-full; initials placeholder bg-primary/10 text-primary, same pattern as AgentHeader.tsx */}
    <div>
      <p className="font-medium text-gray-900 flex items-center gap-1">
        {agent.name}
        {agent.verified && <CheckCircle className="w-4 h-4 text-blue-600" aria-hidden="true" />}
      </p>
      {agent.agencyName && <p className="text-sm text-gray-500">{agent.agencyName}</p>}
      <span className="flex items-center gap-1 text-sm text-gray-700 mt-1">
        <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
        {agent.rating.toFixed(1)} <span className="text-gray-400">({agent.reviewsCount})</span>
      </span>
    </div>
  </div>
  {/* language chips row — bg-gray-50 border border-gray-200 text-xs px-2 py-0.5 rounded, same token as the profile page */}
  {/* 📍 {agent.scope.join(' · ')} — text-sm text-gray-500 */}
  {/* specialty chips — bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full, max 3 + "+N" overflow chip (same overflow convention as FilterChips in the Saved Searches spec) */}
  <p className="text-sm text-gray-500 mt-2">{agent.listingsActive} active listings</p>
</Link>
```

This is a near-exact scale-up of `components/agent/OtherAgents.tsx`'s card
(same avatar/verified/rating shape, already proven in this codebase) with
the scope/specialties/listings-count rows added per the acceptance criteria.
Reuse `OtherAgents.tsx`'s avatar-with-initials-fallback markup rather than
reinventing it.

### 5.7 `<EmptyAgents>`

```tsx
<div role="status" className="text-center py-16 text-gray-500">
  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" aria-hidden="true" />
  <p className="text-base font-medium text-gray-900 mb-1">No agents match your filters</p>
  <p className="text-sm mb-4">Try removing a filter or searching a different city.</p>
  <button onClick={onClearFilters} className="text-primary text-sm font-medium hover:underline">
    Clear filters
  </button>
</div>
```

The heading string is **verbatim from this task's acceptance criteria**
("No agents match your filters") — note this differs slightly from the
product spec's generic wording ("No agents found for these filters"); the
task brief wins (see also D1 for the same precedence rule applied to the API
status code).

---

## 6. Wireframes

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 "Find your real estate agent"                             │
│ "Verified professionals in Armenia and beyond"                │
├──────────────────┬─────────────────────────────────────────┤
│ ◄ FILTERS (w-72) │ ► RESULTS                                │
│ City [_________] │  "37 agents"           [Sort: Top rated▾]│
│ Specialty ☐☐☐☐☐☐ │  ┌────────┐ ┌────────┐ ┌────────┐        │
│ Language 🇦🇲🇷🇺🇬🇧 │  │ card   │ │ card   │ │ card   │        │
│ Rating ○Any ○4+  │  └────────┘ └────────┘ └────────┘        │
│        ○4.5+     │  ┌────────┐ ┌────────┐ ┌────────┐        │
│ [Clear filters]  │  │ card   │ │ card   │ │ card   │        │
│                  │  └────────┘ └────────┘ └────────┘        │
│                  │  ◄ 1 2 3 … ►                              │
├──────────────────┴─────────────────────────────────────────┤
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 · subheading           │
│ [⚙ Filters (2)] [Sort ▾] │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ agent card (1-col)   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ agent card            │ │
│ └──────────────────────┘ │
│ ◄ 1 2 3 … ►               │
│ FOOTER                   │
└──────────────────────────┘
```

Filters open as a bottom sheet (§5.3), not inline — same interaction model
as the product spec calls for, built on `SortBottomSheet.tsx`'s chrome.

---

## 7. Design tokens (this page)

All reused from the tokens already established on the Agent Profile page
(`docs/design/10-agent-profile.md` §… / `components/agent/*`) and the
product spec's own tokens table — no new tokens introduced.

| Element | Tailwind |
|---|---|
| H1 | `text-3xl font-bold text-gray-900` |
| Subheading | `text-gray-500` |
| Filter `<legend>` | `text-sm font-medium text-gray-700` |
| Sort dropdown | `h-9 text-sm border border-gray-300 rounded-md` |
| Agent card | `bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition` |
| Card avatar | `w-16 h-16 rounded-full` (initials fallback: `bg-primary/10 text-primary`, same as `AgentHeader.tsx`) |
| Verified badge | `text-blue-600` `CheckCircle` icon (matches `OtherAgents.tsx`, not the boxed `bg-blue-50` badge used on the profile header — cards are denser) |
| Language chip | `bg-gray-50 border border-gray-200 text-xs px-2 py-0.5 rounded` |
| Specialty chip | `bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full` |
| Skeleton card | `bg-gray-100 animate-pulse rounded-xl h-40` |
| Empty state | `text-center py-16 text-gray-500` |
| Focus ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` (site-wide) |

---

## 8. Page states

| State | What is shown |
|---|---|
| **Loading (first paint)** | 6 skeleton cards (`h-40`), filters sidebar renders immediately (static, not data-dependent) |
| **Loaded (results)** | Card grid + `"{N} agents"` count + sort dropdown |
| **Re-fetching (filter change)** | Previous grid stays visible at `opacity-60` (`keepPreviousData`) |
| **Empty (0 results)** | `<EmptyAgents>` — "No agents match your filters" + `[Clear filters]` |
| **Error (API fail)** | "Something went wrong" + `[Try again]` (same copy/button as `ListingsPanel`'s sibling error states across the app) |
| **Mobile filter sheet open** | `<AgentFilterSheet>` bottom sheet, backdrop, focus-trapped |

Not built (see task scope reminder): Teams tab, Compare modal, region-specific
empty state, guest-captcha state, duplicate-request state — none of those
apply once the Compare/broadcast flow is out of scope.

---

## 9. Responsive

- **≥1024px (lg).** Sidebar filters (`w-72`, static/always visible) + results
  grid 3-col.
- **768–1023px (md).** Filters collapse to the `[⚙ Filters]` sheet trigger
  (same breakpoint the sheet appears at, per product spec); results grid 2-col.
- **<768px (sm).** Filters: bottom-sheet with active-count badge; results
  1-col; sort dropdown sits next to the filters trigger in a single row.

---

## 10. Accessibility

- Filter groups: `<fieldset>` + `<legend>` for Specialty and Language;
  `role="radiogroup"` for Minimum rating (mirrors the ARIA shape already used
  for `<FrequencyToggle>` in the Saved Searches spec).
- `<AgentCard>` is a single `<a>` (via `<Link>`) — no nested interactive
  elements, so no `aria-label` disambiguation is needed (this is exactly why
  D6 drops the inner `[Profile]`/`[Contact]` buttons: two levels of
  interactive elements inside one card is an accessibility footgun this MVP
  simply avoids by not having the second action at all).
- `<AgentFilterSheet>`: `role="dialog" aria-modal="true"`, Escape + backdrop
  click to close, focuses the first field on open — identical hooks to
  `SortBottomSheet.tsx`.
- Loading/empty: `role="status"`; error: `role="alert"`.
- Contrast ≥ 4.5:1; touch targets ≥ 44px (site-wide baseline).

---

## 11. SEO & meta

- `<title>` — with an active `city` filter: `"Real estate agents in {city} — Find and compare | RE Platform"`;
  without: `"Find a real estate agent | RE Platform"`.
- `<meta name="description">` — `"Find a verified agent by city, language, and specialty. {total}+ professionals."`
  (`{total}` from the SSR fetch's response).
- **Canonical.** Always points at the bare `/{locale}/agents` (no query
  string) — this task ships no indexable `/agents/[city]` landing slugs
  (task scope reminder), so canonical collapsing every filter combination to
  the base URL is the correct anti-duplicate-content choice per the product
  spec §8 ("canonical to the filter-less base URL").
- **`robots`.** When any filter/sort/page param is present in the request URL,
  set `robots: { index: false, follow: true }` (filtered views aren't worth
  indexing without a landing slug to give them a stable canonical identity);
  the bare `/agents` URL is indexable.
- **hreflang.** `alternates.languages` for `hy`/`ru`/`en`, each pointing at
  the same-path `/agents` under that locale prefix (same shape as
  `app/[locale]/agent/[slug]/page.tsx`'s `alternates` block).
- **JSON-LD**, in the Server Component (`page.tsx`), same `@graph` pattern as
  `/search`'s and `/agent/[slug]`'s:
  ```jsonc
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "name": "Real estate agents{ in {city}}",
        "numberOfItems": total,
        "itemListElement": items.slice(0, 10).map((a, i) => ({
          "@type": "ListItem", "position": i + 1, "name": a.name, "url": `/agent/${a.slug}`
        }))
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "/" },
          { "@type": "ListItem", "position": 2, "name": "Find an Agent", "item": "/agents" }
        ]
      }
    ]
  }
  ```

---

## 12. Analytics events (documentation only — not wired in this task)

Same status as every prior page's analytics table in this codebase (Search,
Favorites, Saved Searches, Agent Profile): documented for parity with the
product spec, **no live analytics backend exists anywhere in this repo to
dispatch to**, so none of these need a real call in this task.

| Event | Trigger | Payload |
|---|---|---|
| `agents_search` | Filter/sort apply | `filters` |
| `agent_card_clicked` | Card → profile | `agent_id, position` |

(The product spec's `compare_flow_started`, `agent_request_sent`,
`request_guest_captcha`, `agent_quick_contact`, `agent_self_cta_clicked`
events all belong to the out-of-scope Compare/broadcast flow and quick-contact
button — omitted here, not deferred-but-listed, since the features that would
fire them don't exist in this task.)

---

## 13. Test coverage checklist (for the developer)

Per the acceptance criteria ("Tests cover the filter API: valid/invalid
params, pagination, exclusion of suspended agents"), at minimum, following
the existing `agentListingsRoute.test.ts` pattern (mock-data-fallback path,
`NEXT_PUBLIC_SUPABASE_URL` set to the `your-project-id` placeholder so the
route exercises `lib/agents/mockData.ts` without a live Supabase instance):

- **`__tests__/agentsQuerySchema.test.ts`** — `agentsQuerySchema`/`parseAgentsSearchParams`:
  defaults (`sort: 'rating'`, `page: 1`) when no params given; repeated
  `?specialty=` / `?lang=` params parse to arrays; a single `?specialty=`
  parses to a one-element array (the `.transform` branch); `minRating`
  coerces `"4.5"` → `4.5` and rejects `"9"` (out of `0..5` range) and `"abc"`
  (non-numeric); an unknown `specialty`/`lang` enum value throws `ZodError`.
- **`__tests__/agentsListRoute.test.ts`** — `GET /api/agents`:
  - `400` (not `422` — D1) on an invalid param, e.g. `?minRating=9` or
    `?specialty=lease`, with a `fields` object identifying the bad param.
  - `200` with correct `total`/`page`/`pageSize` and no-filter default order
    (`sort=rating`) when no query params are given.
  - City filter (`?city=Yerevan`) returns only agents whose `scope` contains
    that city.
  - Specialty filter (`?specialty=rentals`) returns only agents whose
    `specialties` overlaps `['rentals']`; combining two `?specialty=` values
    is an OR (overlap), not an AND.
  - Language filter (`?lang=ru`) returns only agents whose `languages`
    contains `'ru'`.
  - `minRating` filter excludes agents below the threshold.
  - `sort=listings` orders descending by `listingsActive`; `sort=newest`
    orders descending by member-since; default `sort=rating` orders
    descending by rating.
  - Pagination: `?page=2` with a small `PAGE_SIZE` fixture returns the
    second slice, not a duplicate of page 1; `total` stays constant across
    pages.
  - **Suspended-agent exclusion**: the mock fixture set includes at least one
    `status: 'suspended'` agent (§3.3) — assert it never appears in `items`
    for any filter/sort/page combination, and that `total` does not count it.
  - An agent with `agent_slug: null` (no public slug yet) never appears
    (mirrors `OtherAgents.tsx`'s existing guard).
- **`__tests__/agentDirectoryMigration.test.ts`** — static SQL-content check
  on `0009_agent_directory.sql` (same "no live Supabase in CI" pattern as
  `savedSearchesMigration.test.ts`/`messagesMigration.test.ts`): asserts the
  migration adds `listings_active_count`, creates the sync trigger function
  and trigger, and creates the GIN/btree indexes listed in §2.1. Document (in
  a comment, not a runnable test) the manual RLS check: querying `agents` as
  an anonymous/anon-key client returns 0 rows where `status = 'suspended'`
  is expected to be **absent from the app query**, not enforced by RLS —
  i.e. this is a reminder to re-verify D9 against a live project before
  shipping, since RLS alone will happily return suspended rows if the
  `.eq('status', 'active')` application-layer filter is ever accidentally
  dropped.
- **Component tests** (optional but recommended, no existing precedent
  mandates them for this page specifically): `<AgentCard>` renders
  verified/unverified and 0-review states without crashing; `<EmptyAgents>`
  renders the exact acceptance-criteria string.

CI must stay green end to end: `npm run lint`, `npm test`, `npm run build`.

---

*End of Find an Agent Page Design Spec v1.0.*
