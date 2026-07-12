# Design Spec — Saved Searches + Alerts Page

**Page URL:** `/saved-searches` (locale-prefixed via `i18n/navigation`, e.g. `/hy/saved-searches`)
**Touch point:** `/search` — the FilterBar's existing **[🔔 Save search]** button (already scaffolded in `components/search/FilterBar.tsx` as the `onSaveSearch` prop; currently stubbed with `alert(...)` in `SearchPageClient.tsx`).
**Product doc:** `docs/en/pages/08-saved-searches.md` (Phase 2, first Phase 2 page)
**Version:** 1.0
**Date:** 2026-07-12
**Builds on:** the completed Phase 1 Search page (`components/search/*`, `lib/search/filtersSchema.ts`) and the Favorites page (`components/favorites/*`), whose patterns this spec deliberately reuses so the implementation stays consistent with the rest of the codebase.

---

## 0. Purpose & scope

A saved search lets a user store a filter combination once and get emailed when a new matching property appears. This spec covers:

- The `/saved-searches` list page (SSR shell + client CRUD).
- The **single** touch point on `/search`: the Save-search modal opened from the toolbar's Bell button.
- API contracts and the `saved_searches` migration shape (for the developer to implement).

**Explicitly out of scope** (per task): the cron/scheduled match-detection job and the Resend email templates. `new_match_count` and `last_alerted_at` are plain columns, updatable only via the CRUD API in this iteration — the alert-sending pipeline is separate follow-up work. Do not add any UI that implies a live cron is running (e.g. no "next digest in..." countdown).

**No other page changes.** `components/favorites/FavoritesToolbar.tsx` already links to `/saved-searches` (Bell icon, "Saved searches" label) — that cross-link exists and needs no change.

---

## 1. Design tokens

All tokens below reuse the site-wide scale already defined in `app/globals.css` (`--color-primary: #2563eb`) and the conventions established on the Favorites/Search pages. No new global tokens are introduced.

### 1.1 Colors

| Token | Tailwind class | Usage |
|-------|-----------------|-------|
| `primary` | `text-primary` / `bg-primary` | Active frequency segment, [Open] CTA, active filter chip (search page) |
| `primary-subtle` | `bg-primary/5` | Hover on outline buttons |
| `gray-900` | `text-gray-900` | H1, card title |
| `gray-700` | `text-gray-700` | Filter chip text, inactive segment (hover) |
| `gray-500` | `text-gray-500` | Subtitle, "last: 2h ago", breadcrumbs |
| `gray-400` | `text-gray-400` | "0 new" badge text, disabled/delete icon |
| `gray-300` | `text-gray-300` | Empty-state bell illustration |
| `gray-200` | `border-gray-200` | Card border, dropdown border |
| `gray-100` | `bg-gray-100` | Filter chip background, "0 new" badge background, skeleton |
| `red-500` | `text-red-500` (hover) | Delete icon hover |
| `red-600` | `bg-red-600` | Destructive confirm button (mirrors `DeleteConfirmModal`) |

### 1.2 Typography

| Element | Tailwind classes |
|---------|-------------------|
| H1 | `text-2xl font-semibold text-gray-900` |
| Subtitle | `text-sm text-gray-500` |
| Card title (name) | `text-base font-medium text-gray-900` |
| Filter chip | `text-xs` |
| "N new" badge | `text-xs font-semibold` |
| "last: 2h ago" | `text-xs text-gray-400` |
| Segment label | `text-xs` |
| Modal title | `text-base font-semibold text-gray-900` (matches `DeleteConfirmModal`'s `#delete-modal-title`) |

### 1.3 Spacing

| Context | Tailwind |
|---------|----------|
| Card list | `space-y-4` |
| Card padding | `p-4` |
| Chips row gap | `gap-2 flex-wrap` |
| Actions row gap | `gap-2` |
| Page container | `max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4` (identical to `app/[locale]/favorites/page.tsx`) |

### 1.4 Shadows & borders

| Element | Tailwind |
|---------|----------|
| Card | `shadow-sm border border-gray-200 rounded-xl` |
| Filter chip | `rounded-full` |
| "N new" badge | `rounded-full` |
| Frequency segmented wrapper | `inline-flex rounded-lg border border-gray-200 p-0.5` |
| Modal | `bg-white rounded-2xl shadow-xl` (matches `DeleteConfirmModal`) |

### 1.5 Interactive states

| State | Spec |
|-------|------|
| Frequency segment — active | `bg-primary text-white rounded-md px-3 py-1 text-xs` |
| Frequency segment — inactive | `text-gray-600 px-3 py-1 text-xs hover:bg-gray-50` |
| Frequency segment — optimistic pending | segment updates immediately on click; on API failure, revert to prior value + error toast (same rollback shape as `useFavoriteToggle`) |
| Delete — optimistic | card fades out (`opacity-0` after 200ms, same transition timing as `FavoriteCard`/`FavoritesGrid`), toast with 5s Undo, `DELETE` fired immediately |
| Focus ring | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` everywhere (site-wide convention) |
| Touch targets | ≥ 44px (`min-h-[44px]` / `w-11 h-11` per existing button sizing) |

---

## 2. Layout & wireframes

### 2.1 Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                          │
├──────────────────────────────────────────────────────────────  ┤
│ Home › Saved searches                        [♡ Favorites]     │  ← breadcrumb row, mirrors FavoritesPage
│ Saved searches  4                                               │  ← H1 + count (text-base text-gray-500)
│ Get notified when a new property matches your criteria          │  ← subtitle
├──────────────────────────────────────────────────────────────  ┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 2 rm · Arabkir · ≤100K$                    "3 new"        │   │
│ │ [Sale][Apartment][Yerevan, Arabkir][2 rooms][≤100,000 $]  │   │
│ │ Alert: (Off)(Instant)(Daily◉)(Weekly)     last: 2h ago    │   │
│ │ [🔍 Open search] [✏️ Edit] [Aa Rename] [🗑]               │   │
│ └──────────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ House · Avan · ≤250K$                       "0 new"        │   │
│ │ …                                                          │   │
│ └──────────────────────────────────────────────────────────┘   │
│ FOOTER                                                          │
└──────────────────────────────────────────────────────────────  ┘
```

### 2.2 Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Back                   │  ← same pattern as FavoritesPage mobile breadcrumb
│ Saved searches (4)       │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 2 rm · Arabkir  "3"  │ │
│ │ [chip][chip][chip]   │ │
│ │ Alert [Daily ▾]      │ │  ← <select> instead of segmented control
│ │ [🔍 Open]      "⋯"   │ │  ← "⋯" opens the actions menu (Edit/Rename/Delete)
│ └──────────────────────┘ │
│ FOOTER                   │
└──────────────────────────┘
```

---

## 3. Component specifications

### 3.0 File layout (proposed)

```
app/[locale]/saved-searches/page.tsx          (Server Component, SSR, in-place guest gate — NOT in PROTECTED_PATHS,
                                                same pattern as app/[locale]/favorites/page.tsx)
components/saved-searches/
 ├─ SavedSearchesLoginWall.tsx                 (mirrors FavoritesLoginWall.tsx)
 ├─ EmptySavedSearches.tsx                     (mirrors EmptyFavorites.tsx)
 ├─ SavedSearchList.tsx                        (client, React Query — mirrors FavoritesGrid.tsx: owns
 │                                               optimistic state + undo/toast)
 ├─ SavedSearchCard.tsx
 ├─ FilterChips.tsx
 ├─ NewMatchBadge.tsx
 ├─ FrequencyToggle.tsx
 ├─ SavedSearchActionsMenu.tsx                 (mobile "⋯" menu — mirrors components/dashboard/ListingActionsMenu.tsx)
 ├─ RenameModal.tsx
 └─ EditFiltersModal.tsx                       (lazy-loaded: dynamic(() => import(...), { ssr: false }))

components/search/
 └─ SaveSearchModal.tsx                        (new — opened from FilterBar's Bell button via SearchPageClient)

lib/saved-searches/
 ├─ schemas.ts                                 (zod: savedSearchSchema, reuses lib/search/filtersSchema.ts)
 ├─ types.ts
 ├─ filtersHash.ts                             (stable hash of a Filters object, used client-side for the
 │                                               "already saved" pre-check and mirrored server-side for the
 │                                               DB unique index — see §5)
 └─ unsubscribeToken.ts                        (HMAC sign/verify helpers — built now so the follow-up email
                                                 work can call it; NOT wired to any email sending in this task)

app/api/saved-searches/
 ├─ route.ts                                   (GET, POST)
 ├─ [id]/route.ts                              (PATCH, DELETE)
 └─ unsubscribe/route.ts                       (GET — auth-free)
```

### 3.1 `<SavedSearchesLoginWall>`

Direct copy of the pattern in `components/favorites/FavoritesLoginWall.tsx`:
- Same card chrome (`max-w-md`, icon circle, heading, sign-in/sign-up buttons).
- Icon: `Bell` in a `bg-primary/10` circle instead of the heart/red circle (keep it visually distinct from Favorites).
- Copy: "Sign in to see your saved searches" / "Save your filters and we'll email you when a new match appears."
- CTAs: `Sign in` → `/auth/login?next=/saved-searches`, `Sign up` → `/auth/register`.
- **`/saved-searches` must NOT be added to `lib/auth/protectedPaths.ts`** — like `/favorites`, the guest state is rendered in place by the page, not redirected by middleware.

### 3.2 `<EmptySavedSearches>`

Direct copy of `components/favorites/EmptyFavorites.tsx`:
- `Bell` icon, `w-32 h-32 text-gray-300`, `strokeWidth={1}`.
- Heading: "You don't have any saved searches yet".
- Body: "Search for a property, apply filters, and tap 'Save search' to learn about new offers."
- CTA: `[Start a search]` primary → `/search`.

### 3.3 Page header (in `page.tsx`, Server Component)

Reuse the exact breadcrumb/H1 block structure from `app/[locale]/favorites/page.tsx` (desktop `Home › Saved searches`, mobile `‹ Back`), with:
- H1: "Saved searches" + `{count} saved {count === 1 ? 'search' : 'searches'}` (same inline-count styling as the Favorites H1).
- Subtitle (only when `count > 0`, same conditional pattern as Favorites): "Get notified when a new property matches your criteria."
- Cross-link top-right: `[♡ Favorites]` → `/favorites` (same button chrome as the Favorites page's `[🔔 Saved searches]` link in `FavoritesToolbar`, mirrored).
- `metadata`: `title: 'Saved searches | RE Platform'`, `robots: { index: false, follow: false }` (identical shape to the Favorites page metadata).

### 3.4 `<SavedSearchList>` (client, React Query)

Owns all interaction state, mirroring `FavoritesGrid.tsx`'s architecture:
- `useQuery(['saved-searches'], fetchSavedSearches)` against `GET /api/saved-searches`. No pagination needed (max 10 items).
- Local `localItems` state synced from query data, so optimistic frequency-changes and deletes render immediately without waiting for a refetch.
- Loading: 3–4 skeleton rows, `bg-gray-100 animate-pulse rounded-xl h-32` (rougher card-height version of the Favorites `SkeletonCard`).
- Error: "Something went wrong" + `[Try again]` (identical copy/button to `FavoritesGrid`'s error state).
- Empty (`localItems.length === 0`): renders `<EmptySavedSearches />`.
- Renders `<SavedSearchCard>` per item.
- Delete + undo: **exact same 5-second-countdown toast pattern as `FavoritesGrid`** (`toast.type`, `undoSecondsLeft`, `undoTimerRef`, `undoCountdownRef`) — fire `DELETE /api/saved-searches/[id]` immediately on remove, keep the removed item in a ref, and on Undo click, re-`POST /api/saved-searches` with the same `{ name, filters, alertFrequency }` (this creates a **new** row/id — acceptable, since the original row is already hard-deleted; the dedupe unique index in §5 must not block this recreate, since there is no longer a row with that filters hash for this user).

### 3.5 `<SavedSearchCard>`

Props: `search: SavedSearchItem`, `onFrequencyChange`, `onOpen`, `onEdit`, `onRename`, `onDelete`.

- **Name** — `text-base font-medium text-gray-900`.
- **`<NewMatchBadge count={search.newMatchCount} />`** — top-right of the name row.
- **`<FilterChips filters={search.filters} />`** — see 3.6.
- **`<FrequencyToggle value={search.alertFrequency} onChange={...} />`** — see 3.7. Inline on the same row: `last: {relativeTime(search.lastAlertedAt)}` (`text-xs text-gray-400`; render "never" if `lastAlertedAt` is null — remember, no cron runs yet in this task, so this will read "never" for all newly created rows; that's expected).
- **Actions row** — desktop: `[🔍 Open search]` (primary pill, `bg-primary text-white h-9 rounded-lg px-4 text-sm font-medium`), `[✏️ Edit]`, `[Aa Rename]` (both `text-gray-600 hover:text-gray-900`), `[🗑]` (`text-gray-400 hover:text-red-500`, `aria-label="Delete saved search"`). Mobile: `[🔍 Open]` stays inline; Edit/Rename/Delete collapse into `<SavedSearchActionsMenu>` (see 3.9).
- **Filter-drift notice** (optional, when a saved filter value no longer resolves — e.g. a deleted city/district): a small `bg-yellow-50 text-yellow-700 text-xs rounded-md px-2 py-1` strip: "Update your filters" linking to Edit. Not required for the initial implementation if the drift-detection isn't feasible without the cron job; acceptable to defer, but do not fake it with a static message.

### 3.6 `<FilterChips>`

Props: `filters: Filters` (the same `Filters` type from `lib/search/filtersSchema.ts` — **do not invent a parallel filters shape**).

Renders a `flex flex-wrap gap-2` row of `bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full` chips, generated with the **same label vocabulary FilterBar already uses** so a saved search reads identically to how the filter bar displayed it:
- Deal: "Sale" / "Rent" (labels from `FilterBar`'s `DEAL_OPTIONS`).
- Type(s): "Apartment", "Apartment +1" for multiple.
- Location: `district ? `${city}, ${district}` : city`.
- Beds: `${beds}+ beds` (matches `FilterBar`'s `bedsLabel`).
- Price: reuse `FilterBar`'s price-label formatting (`up to 60M ֏` / `20–60M ֏`) — but the currency in the product doc examples is USD ("≤100K$"), so format per the filter's actual currency, not a hardcoded one.
- Overflow: show at most 5 chips, then a "+N filters" chip that expands the rest on click (`aria-expanded`).

### 3.7 `<FrequencyToggle>`

Props: `value: 'off' | 'instant' | 'daily' | 'weekly'`, `onChange: (next) => Promise<void>`.

- **Desktop (≥768px).** Segmented control, `role="radiogroup"` with 4 `role="radio" aria-checked` buttons: Off / Instant / Daily / Weekly. ←/→ moves focus between segments (arrow-key handling mirrors the keyboard pattern already used in `ListingActionsMenu`'s ArrowUp/ArrowDown).
- **Mobile (<768px).** Native `<select>` with the same 4 options (matches the doc's "dropdown" requirement and avoids cramming a 4-way segmented control into a narrow card).
- **Interaction.** On change: update local state immediately (optimistic), call `PATCH /api/saved-searches/[id] { alertFrequency }`. Success → toast "Notification updated" (reuse the existing toast look from `FavoritesGrid`, `bg-gray-900 text-white`, no undo action). Failure → revert to the previous value + error toast "Something went wrong, please try again" (same copy as `FavoritesGrid`'s rollback toast).

### 3.8 `<NewMatchBadge>`

- `count > 0`: `bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full`, text `"{count} new"`, `aria-label="{count} new matching properties"`.
- `count === 0`: `bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full`, text `"0 new"`.

### 3.9 `<SavedSearchActionsMenu>` (mobile "⋯" menu)

Directly modeled on `components/dashboard/ListingActionsMenu.tsx` (same trigger button, `MoreHorizontal` icon, outside-click + Escape close, Arrow-key navigation, `role="menu"`/`role="menuitem"`), with menu items: Edit (pencil icon) · Rename (text-cursor icon) · Delete (trash icon, `variant: 'danger'`).

### 3.10 `[🔍 Open search]` action

- Navigates to `/search?{querystring}` where the querystring is produced by `filtersToParams(search.filters)` from `lib/search/filtersSchema.ts` — **do not write a second serializer**; the saved `filters` object is already shaped like the `Filters` type, so the existing helper round-trips it directly.
- Fires `PATCH /api/saved-searches/[id] { newMatchCount: 0 }` (fire-and-forget, no loading UI needed) so the badge clears once the user has "seen" the results. Note this is a plain column update per the task scope — no cron/read-tracking logic needed beyond this.

### 3.11 `<RenameModal>` (Aa Rename)

Small modal, same chrome as `DeleteConfirmModal` (overlay, `role="dialog"`, focus the input on open, Escape/backdrop-click closes): single text input (prefilled with the current name, `maxLength={60}`, matches the `name` field's zod `.max(60)`), `[Cancel]` / `[Save]` → `PATCH { name }`.

### 3.12 `<EditFiltersModal>`

Lazy-loaded (`dynamic(..., { ssr: false })`, same pattern as `components/property/Lightbox.tsx`). Reuses the same fields as `/search`'s filter bar — deal, type, city/district, price min/max, beds/baths, area min — stacked vertically instead of the horizontal pill bar (a modal needs a different layout, not different fields or validation). `[Cancel]` / `[Save]` → `PATCH { filters }`, validated by the same `filtersSchema` used on `/search`.

### 3.13 `<SaveSearchModal>` (the `/search` touch point)

This is the **one** new piece of UI on the Search page. It replaces the current stub:

```tsx
// components/search/SearchPageClient.tsx — replace this:
const handleSaveSearch = useCallback(() => {
  alert('Sign in to save your search')
}, [])
```

**Guest flow.** Do **not** hard-redirect immediately (unlike `useFavoriteToggle`'s ♡ redirect) — the user is mid-session with live filters on screen, and losing that context to a full navigation on a single misclick is worse UX than for a single ♡ tap. Instead, open a small **login-prompt modal** (`SignInPromptModal` — same dialog chrome as `DeleteConfirmModal`; content copied from `FavoritesLoginWall`'s heading/body/button pair) with `[Sign in]` → `/auth/login?next=/search&{current querystring}` and `[Sign up]` → `/auth/register`. This satisfies "opens a login modal for guests" while keeping the redirect target consistent with the rest of the codebase's `?next=` convention.

**Authenticated flow.**
1. Click **[🔔 Save search]** → modal opens with:
   - **Name** input, prefilled with an auto-generated name built from the current filters (e.g. `"2 rm · Arabkir · ≤100K$"` — reuse the same label vocabulary as `<FilterChips>`/`FilterBar`, joined with `" · "`; fall back to `"{deal} search"` if no distinguishing filters are set), editable, `maxLength={60}`.
   - **Alert frequency** — same 4-option control as `<FrequencyToggle>` but as a plain radio group (no need for the segmented-control chrome inside a modal), default **Daily**.
   - `[Cancel]` / `[Save]`.
2. **[Save]** → `POST /api/saved-searches { name, filters, alertFrequency }`.
   - `201` → close modal, toast "Search saved" with an action button `[View saved searches]` → `/saved-searches` (same toast shape as elsewhere, `bg-gray-900 text-white`, action button instead of Undo).
   - `409` (duplicate, same filters hash already saved) → keep modal open is unnecessary; close it and show toast "This search is already saved."
   - `422` with `{ error: "limit_reached" }` → inline warning inside the modal (not a toast, since the user needs to see it before deciding what to do): "You've reached the limit of 10 saved searches." + `[Manage saved searches]` link → `/saved-searches`. Do not close the modal automatically on this error.
3. Client-side dedupe pre-check (nice-to-have, reduces round-trips): compute `filtersHash(filters)` (see `lib/saved-searches/filtersHash.ts`) and compare against a lightweight `GET /api/saved-searches` cache the modal already has from the page's own query — but the **server-side check is authoritative**; never skip the 409 handling because of a client-side guess.

**No other change to `/search`'s filtering/map behavior.** `FilterBar`, `ListingsPanel`, `SearchMap`, `ResultsHeader` are untouched; only `onSaveSearch` (already an existing prop) gets a real implementation, plus the new `<SaveSearchModal>` mounted in `SearchPageClient`.

---

## 4. Page states

| State | What is shown |
|-------|----------------|
| **Loading** | 3–4 skeleton rows (`bg-gray-100 animate-pulse rounded-xl h-32`) |
| **Loaded (≥1)** | Card list, frequency toggles, "N new" badges |
| **Empty (0)** | `<EmptySavedSearches />` |
| **Guest** | `<SavedSearchesLoginWall />` |
| **Frequency saving** | Optimistic segment + toast "Notification updated"; rollback + error toast on failure |
| **Edit filters open** | `<EditFiltersModal>` |
| **Deleting** | Optimistic fade + toast + `[Undo (5s)]` |
| **Limit reached** | Inline warning inside `<SaveSearchModal>`: "You've reached the limit of 10 saved searches" |
| **Duplicate** | Toast "This search is already saved" |
| **Error (API fail)** | "Something went wrong" + `[Try again]` |

---

## 5. Technical depth (for the developer)

### 5.1 Data model

Suggested migration file: `supabase/migrations/0007_saved_searches.sql` (next number after `0006_messages_inbox.sql`).

```
saved_searches
  id                UUID        PK, default gen_random_uuid()
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
  name              TEXT        NOT NULL  (≤ 60 chars, enforced by zod at the API layer)
  filters           JSONB       NOT NULL  (same shape as lib/search/filtersSchema.ts's Filters)
  filters_hash      TEXT        GENERATED ALWAYS AS (md5(filters::text)) STORED
  alert_frequency   TEXT        NOT NULL DEFAULT 'daily' CHECK (alert_frequency IN ('off','instant','daily','weekly'))
  last_alerted_at   TIMESTAMPTZ NULL      (plain column, no cron writes it yet)
  new_match_count   INTEGER     NOT NULL DEFAULT 0
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()

  UNIQUE (user_id, filters_hash)   -- DB-level dedupe: makes the 409 race-safe, not just an app-layer check
```

Notes:
- `filters_hash` as a **generated/stored column + unique index** is important: an app-layer "check then insert" for dedupe has a TOCTOU race (two rapid double-clicks could both pass the pre-check). Let the unique index be the source of truth; catch the Postgres unique-violation error in the `POST` handler and translate it to `409`.
- The 10-per-user limit is enforced in the `POST` route handler with a `count`-only query scoped by RLS (`.select('id', { count: 'exact', head: true }).eq('user_id', user.id)`) before inserting — same technique already used in `app/[locale]/favorites/page.tsx` for the favorites count. A DB trigger is not necessary for this; the API is the only write path.
- RLS: enable on the table, and every policy scoped to `auth.uid() = user_id`, matching the `blocks`/`reports` policy style in `0006_messages_inbox.sql`:
  ```sql
  ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "saved_searches: owner can select" ON saved_searches
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "saved_searches: owner can insert" ON saved_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "saved_searches: owner can update" ON saved_searches
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "saved_searches: owner can delete" ON saved_searches
    FOR DELETE USING (auth.uid() = user_id);
  ```
- The unsubscribe route (§5.4) is the one path that must read/write a row **without** a logged-in session. It should use the service-role client (server-only, as already established by `lib/supabase/admin.ts` for other admin-only paths) strictly scoped to the single row identified by the verified token payload — never a broad query. Confirm `lib/supabase/admin.ts` is only ever imported from route handlers, never from a client component or a module a client component imports (per `CLAUDE.md`).

### 5.2 Validation (zod) — reuse the `/search` filters schema

```ts
// lib/saved-searches/schemas.ts
import { z } from 'zod'
import { filtersSchema } from '@/lib/search/filtersSchema'

export const alertFrequencySchema = z.enum(['off', 'instant', 'daily', 'weekly'])

export const savedSearchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  filters: filtersSchema,
  alertFrequency: alertFrequencySchema.default('daily'),
})

export const patchSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  filters: filtersSchema.optional(),
  alertFrequency: alertFrequencySchema.optional(),
  newMatchCount: z.literal(0).optional(),   // the only way the client can mutate this in this task — reset-to-zero on "Open"
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' })
```

### 5.3 API contracts

**`GET /api/saved-searches`** — 200: `{ items: SavedSearchItem[], total }`; 401 if no session (`{ error: 'auth_required' }`).

**`POST /api/saved-searches`** — body validated by `savedSearchSchema`.
- 201 `{ id }`
- 401 `{ error: 'auth_required' }`
- 409 `{ error: 'duplicate' }` (unique-violation on `(user_id, filters_hash)`)
- 422 `{ error: 'limit_reached' }` (count ≥ 10) or `{ error: 'validation_error', fields }` (zod failure)

**`PATCH /api/saved-searches/[id]`** — body validated by `patchSavedSearchSchema`; verify the row's `user_id` matches the session user (defense in depth on top of RLS) before updating; 200 `{ updated: true }`; 404 if not owned/found.

**`DELETE /api/saved-searches/[id]`** — 200 `{ deleted: true }`; 404 if not owned/found. (Undo is a client-side re-`POST`, not a server-side "undo" endpoint — matches the Favorites undo pattern.)

**`GET /api/saved-searches/unsubscribe?token=<signed>`** — auth-free.
- Verify the HMAC signature (see 5.4) before touching the database. Invalid/expired/tampered token → 400, generic "This link is no longer valid" page (do not leak which part failed).
- Valid → set `alert_frequency = 'off'` on the referenced row (service-role client, single-row scoped update) → simple confirmation page/response ("Notifications turned off for this search."). No login required.

### 5.4 Unsubscribe token (build now, do not wire to email yet)

```ts
// lib/saved-searches/unsubscribeToken.ts
// payload: { savedSearchId: string }
// token = base64url(JSON.stringify(payload)) + '.' + base64url(HMAC_SHA256(payload_json, secret))
// secret: process.env.SAVED_SEARCH_UNSUB_SECRET — server-only env var, never NEXT_PUBLIC_*
```

This utility has no caller in this task (the email digest that would embed the unsubscribe link is explicitly out of scope) — it exists so the follow-up cron/email work can import it without redesigning the token format later. Cover it with a unit test (sign → verify round-trip, tampered payload rejected, wrong secret rejected).

### 5.5 What NOT to build in this task

- No scheduled job / Supabase Edge Function / cron trigger.
- No Resend template or email-sending code.
- No `alert_email_sent` / `alert_email_opened` wiring — the analytics events table in §9 documents the eventual event names for parity with the product doc, but none of them need a real dispatch call in this codebase (the same is true of the Search and Favorites pages' analytics tables — they're aspirational documentation, not wired to a live analytics backend anywhere in this repo yet).

---

## 6. Responsive

- **≥1024px (lg).** Card full-width, frequency segmented control inline, actions row visible inline.
- **768–1023px (md).** Card full-width, actions row wraps.
- **<768px (sm).** Frequency as `<select>`; actions collapse into `<SavedSearchActionsMenu>` ("⋯"); breadcrumbs become "‹ Back"; `<EditFiltersModal>` goes full-screen (`fixed inset-0` instead of the centered dialog).

---

## 7. Accessibility

- `<FrequencyToggle>` desktop control: `role="radiogroup"` / `role="radio"` with `aria-checked`, ←/→ to move focus between segments (mirrors the ArrowUp/ArrowDown handling already in `ListingActionsMenu`).
- `<NewMatchBadge>`: `aria-label="{count} new matching properties"`.
- `<SavedSearchActionsMenu>`: same `role="menu"`/`role="menuitem"` + focus-trap + Escape-close as `ListingActionsMenu`.
- Delete undo toast: `role="status" aria-live="polite"` (identical to `FavoritesGrid`'s toast).
- All modals (`RenameModal`, `EditFiltersModal`, `SaveSearchModal`, `SignInPromptModal`): `role="dialog"`, `aria-modal="true"`, focus the first sensible control on open, Escape + backdrop-click closes (copy `DeleteConfirmModal`'s effect hooks verbatim).
- Touch targets ≥ 44px; contrast ≥ 4.5:1 (site-wide baseline, nothing page-specific here).

---

## 8. SEO & meta

- `robots: { index: false, follow: false }` — personal, auth-gated page (identical to the Favorites page's metadata).
- `<title>Saved searches | RE Platform</title>`.
- No JSON-LD needed (not a discoverable/shareable page).

---

## 9. Analytics events (documentation only — see §5.5)

| Event | Trigger | Payload |
|-------|---------|---------|
| `saved_searches_view` | Page load | `count` |
| `saved_search_create` | `[Save]` in `<SaveSearchModal>` | `search_id, frequency` |
| `saved_search_open` | `[🔍 Open search]` | `search_id` |
| `saved_search_edit` | `<EditFiltersModal>` save | `search_id` |
| `saved_search_rename` | `<RenameModal>` save | `search_id` |
| `saved_search_delete` | `[🗑 Delete]` | `search_id` |
| `alert_frequency_changed` | `<FrequencyToggle>` change | `search_id, frequency` |

(Email-pipeline events — `alert_email_sent`, `alert_email_opened`, `alert_property_click`, `alert_unsubscribe` — are deferred to the follow-up cron/email task along with the pipeline itself.)

---

## 10. Test coverage checklist (for the developer)

Per the acceptance criteria, at minimum:
- **Component tests.** `<SavedSearchCard>` in each state (0 new / N new, each frequency value, delete → undo countdown → restore). `<FilterChips>` label generation for a representative filters object. `<SaveSearchModal>` guest vs. authenticated flow, 409/422 handling.
- **API tests.** `GET/POST /api/saved-searches` (401 guest, 201 success, 409 duplicate via the unique index, 422 over-limit, 422 zod validation failure). `PATCH/DELETE /api/saved-searches/[id]` (404 on not-owned, 200 success). `GET /api/saved-searches/unsubscribe` (valid token → 200 + `alert_frequency=off`, tampered/invalid token → 400, no session required in either case).
- **RLS.** A test (or documented manual check) confirming a second user's client cannot read/update/delete another user's `saved_searches` row.
- **Unit test.** `unsubscribeToken.ts` sign/verify round-trip + tamper rejection.

---

*End of Saved Searches + Alerts Page Design Spec v1.0*
