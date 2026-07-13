# Page 10 — Agent Profile: Design → Dev Handoff (MVP)

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/10-agent-profile.md`](../en/pages/10-agent-profile.md) (deep spec) —
read that first for scenarios, full state table, accessibility and analytics intent.
This document does **not** repeat those sections wholesale; it closes the gap between
that generic spec and *this specific codebase* — exact components to create/reuse,
exact Tailwind tokens already in use, exact data model (this app stores "agent" as
role-flagged rows on `profiles`, not a separate `agents` table), and the deliberate
MVP trims called out by the task brief. A developer should be able to implement the
MVP directly from this file plus the product spec, without re-deriving decisions.

**Task scope reminder (MVP).** Visitor + owner core only. Explicitly **not** built in
this task: `/agency/[slug]`, the real Pro Dashboard page (placeholder route is fine),
admin moderation UI for reported reviews, dynamic OG image generation, and any
"Top Agent" ranking sophistication beyond a single cheap SQL window function.

Audited against `origin/main` (post Page 04/06/07/08/09/22 — Listing Wizard,
Dashboard, Favorites, Saved Searches, Messages, Notifications; `/settings` is
**not yet merged**, see D3/§5.6): `components/property/ContactCard.tsx`,
`OwnerManageBar.tsx`, `MobileBottomBar.tsx`, `Breadcrumbs.tsx`;
`components/search/PropertyCard.tsx`, `components/ui/Tabs.tsx`;
`components/dashboard/{OverviewCards,MyListings,DeleteConfirmModal}.tsx`;
`app/[locale]/property/[id]/[slug]/page.tsx`; `app/api/conversations/route.ts`,
`app/api/reports/route.ts`, `app/api/properties/[id]/report/route.ts`,
`app/api/messages/route.ts`; `lib/property/{types,schemas,mockData}.ts`,
`lib/search/{types,filtersSchema}.ts`, `lib/messages/{schemas,helpers}.ts`,
`lib/auth/{protectedPaths,rateLimit}.ts`; `supabase/migrations/0001…0007*.sql`;
`types/database.ts`. Every file reference and code excerpt below was checked
against the `origin/main` blob directly, not a possibly-stale local working
copy. Stack confirmed: Next.js 15 App Router, Tailwind v4 (`@theme` tokens, no
`tailwind.config.*`), `lucide-react`, `@tanstack/react-query`, `react-hook-form`
+ `@hookform/resolvers/zod`, `next-intl`, Supabase (`@supabase/ssr`).

---

## 1. Design decisions that deviate from the generic page spec

| # | Page-spec says | Decision for this codebase | Why |
|---|---|---|---|
| D1 | "Guest → login modal with `?next`" | **No modal component exists anywhere in this codebase.** Every guarded action (Write review, Send message, Show phone, Send request) fires its `POST`, and on `401` does `window.location.href = '/auth/login?next=' + encodeURIComponent(pathname + search)` — **exactly** the pattern already implemented in `ContactCard.tsx` and `MobileBottomBar.tsx` on the property page. Do not build a `LoginModal`; reuse the redirect. Middleware (`lib/auth/protectedPaths.ts`) must **not** list `/agent`— the profile itself is public; only the write actions are gated, client-side, same as `/property/[id]`. |
| D2 | `agent: { user_id, agency_name, license_no, bio{hy,ru,en}, specialties[], languages[], scope[], rating, reviews_count, verified, subscription_tier, avg_response_time, listings_active_count, deals_closed_count, created_at }` as if `agent` were its own entity | **There is no `agents` table.** This codebase already models "agent" as `profiles.role = 'agent'` plus agent-prefixed columns (`agent_slug`, `agent_rating`, `agent_review_count` from `0005_dashboard.sql`; `agency_name`, `license_no` from `0003_profile_agent_fields.sql`). Keep that convention: add the remaining fields as more `agent_*` columns on `profiles` (§3), not a new table. `agent.user_id` in the spec ⇒ simply `profiles.id`; `isOwner` ⇒ `profiles.id === session.user.id`. |
| D3 | `bio{hy,ru,en}` | `profiles.bio` (from `0001_init.sql`) is a single `TEXT` column, and as of this task's base commit **no route or component reads or writes it** (`/settings` and `app/api/users/*` don't exist on `main` yet — they're a separate, not-yet-merged task). Rather than repurpose an unowned column ambiguously, add a **new** `agent_bio JSONB NOT NULL DEFAULT '{}'` column, shaped `{hy?, ru?, en?}`, dedicated to the storefront bio. Leave `profiles.bio` untouched — it is not this task's column to redefine, and a future generic-profile task may still claim it for something else. |
| D4 | Agency name "links to `/agency/[slug]`" | `/agency/[slug]` is explicitly out of scope for this task. Render the agency name as **plain text** (`text-base text-gray-500`, no `<Link>`, no hover state) for the MVP. Do not stub a broken link. |
| D5 | "Top Agent" badge — "ranking ≤ top 5% in the city" | Compute with a single cheap query, not a ranking service: `NTILE(20)` window function over `profiles WHERE role='agent' AND agent_status='active'`, partitioned by `agent_scope[1]` (the agent's first/primary service city), ordered by `agent_rating DESC NULLS LAST, agent_review_count DESC`. Bucket `1` (top 1/20 = top 5%) ⇒ badge. Run this as part of `GET /api/agents/[slug]` (§7), not a cron job or precomputed table. |
| D6 | "Fast responder" badge (`avg_response_time < 2h`) in the header badges row | **Deferred.** Nothing in this codebase measures message response latency (checked `messages`/`conversations` — no timing columns, no aggregation job). Task's in-scope bullet for the header lists only "tier/Top Agent badges" — "Fast responder" is not mentioned. Do not add a badge backed by fabricated data; ship the header with Verified + Tier + Top Agent only. `avg_response_time`/`avg_response_hours` stays absent from the API response (§7), which is correct per spec §3.4 ("Null metrics are skipped"). |
| D7 | Stats row: "Sold / closed — if we track deal-close; otherwise hidden" | We **do** track it: `properties.status` already has a `'sold'` value (`0001_init.sql`). `dealsClosed = COUNT(properties WHERE owner_id = agent.id AND status = 'sold')`. Include this KPI card. |
| D8 | Listings tab bar: "`[All][For sale][For rent]`, active: `border-b-2 border-primary text-primary`" | The codebase already has **two** competing tab visual styles: `components/ui/Tabs.tsx` (generic, pill/rounded-full) and a hand-rolled underline style in `MyListings.tsx`/`ConversationList.tsx` (`border-b-2 border-primary text-primary`, `role="tablist"`/`role="tab"`). The product spec's visual (underline) matches the **second** style exactly, so copy that hand-rolled pattern (same ARIA shape) into the new `<AgentListingsTabs>` rather than reusing `<ui/Tabs>` (which would look inconsistent with the spec) or inventing a third style. |
| D9 | Review report → `POST /api/reports` | `app/api/reports/route.ts` already exists (Page 09) but only accepts `{ conversationId, reason, note? }` via `conversationReportSchema`. Extend it (do not fork a new route): add a `reviewReportSchema`, change the body validation to `z.union([conversationReportSchema, reviewReportSchema])`, add a nullable `review_id UUID REFERENCES reviews(id) ON DELETE CASCADE` column to `reports` (mirrors the existing nullable `conversation_id` pattern), and branch the ownership check (participant-of-conversation vs. any-authenticated-user-may-report-a-review — reviews are public content, so no "am I involved" check is needed, just auth). Same `202 Accepted` response shape. |
| D10 | §3.8 "Reply" button under each review, `POST /api/agents/[id]/reviews/[reviewId]/reply` | **Not in this task's acceptance criteria** (the task's in-scope bullet for Reviews stops at "Write a review… via `POST /api/agents/[id]/reviews`"; the Owner-view bullet only requires Edit/Preview/manage bar). Keep the `reply`/`replied_at` columns on `reviews` (so the UI can render a reply if one ever exists) but **do not build the reply endpoint or the "Reply" button** in this task. Leave a `// TODO(follow-up task): agent reply to review` comment at the spot in `ReviewItem.tsx` where the button would go. |
| D11 | "Other agents" carousel (§3.9) | The task's out-of-scope list only excludes the carousel's *ranking sophistication* ("beyond a simple same-city query"), not the section itself — unlike `/agency/[slug]` or Pro Dashboard, which are named outright as excluded features. Build it, but the query is exactly: `profiles WHERE role='agent' AND agent_status='active' AND id <> current AND agent_scope && ARRAY[current.agent_scope[1]] ORDER BY agent_rating DESC NULLS LAST LIMIT 8`. No specialty-similarity scoring. |
| D12 | OG image "dynamic `/api/og?agent=12`" | Out of scope per task brief. Ship `openGraph.images` with the agent's **avatar URL** (or omit `images` when no avatar), same fallback style already used on the property page (`ogImage = property.media.find(...)`.) No `/api/og` route. |
| D13 | Anti-spam: "captcha once per session" (phone reveal), "captcha for Guest" (request form) | No captcha library/integration exists anywhere in this codebase (checked `package.json`). Guests never reach these actions anyway — D1 gates them behind auth first via the `401` → redirect flow — so guest-captcha is moot. Keep only what's implementable now: the honeypot field (§8) + the existing `checkRateLimit` helper (`lib/auth/rateLimit.ts`, same call shape as `app/api/messages/route.ts`'s `checkRateLimit('messages:' + user.id, SEND_LIMIT.max, SEND_LIMIT.windowMs)`) for `POST /api/agent-leads` (5/hour/user, matching the spec's "5 messages/hour/user" and the task's explicit 429 acceptance criterion). Do not add a captcha dependency for this task. |

---

## 2. Data model

New migration file: **`supabase/migrations/0008_agent_profile.sql`**. Note:
`supabase/migrations/` currently has **two** files numbered `0007`
(`0007_saved_searches.sql` and `0007_notifications_phase1.sql` — two parallel
tasks landed on the same number). `0008` is the first number after both, so
it's unambiguous; this task is not responsible for renumbering the existing
collision, just don't make it a third `0007`. Follow the exact style of prior
migrations (`IF NOT EXISTS`, RLS enabled immediately after `CREATE TABLE`,
policy names `"<table>: <who> can <verb>"`).

### 2.1 `profiles` — new agent-storefront columns

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS agent_verified     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_status       TEXT        NOT NULL DEFAULT 'active'
                                                 CHECK (agent_status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS agent_bio          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS agent_specialties  TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_languages    TEXT[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_scope        TEXT[]      NOT NULL DEFAULT '{}';
  -- agent_scope[1] is treated as the "primary city" for the Top Agent /
  -- Other Agents queries (D5 / D11). Existing columns reused as-is:
  -- agency_name, license_no (0003), tier, created_at (0001),
  -- agent_slug, agent_rating, agent_review_count (0005).

CREATE INDEX IF NOT EXISTS profiles_agent_slug_idx
  ON profiles (agent_slug) WHERE agent_slug IS NOT NULL;
```

`profiles.tier` (`free|pro|premium`, from `0001_init.sql`) **is** the spec's
`subscription_tier` — reuse directly, no rename. Badge color mapping (§5):
`free` → no tier badge · `pro` → `bg-violet-100 text-violet-700` · `premium` →
`bg-amber-100 text-amber-700`.

`/agent/[slug]` resolves a row where `role = 'agent' AND agent_slug = :slug`.
`agent_status = 'suspended'` → 410-equivalent UI (§9). No row / `agent_slug IS
NULL` / `role <> 'agent'` → 404.

### 2.2 `reviews`

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating       SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text         TEXT        NOT NULL CHECK (char_length(text) BETWEEN 10 AND 1000),
  reply        TEXT,                    -- reserved for a follow-up task (D10); no writer in this task
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (agent_id <> author_id),         -- DB-level self-review guard, defense in depth under the 422 app check
  UNIQUE (agent_id, author_id)           -- DB-level one-review-per-author guard; makes the 409 race-safe
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews are public storefront content — anyone (including guests) can read them.
CREATE POLICY "reviews: public can select"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews: author can insert"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = author_id AND auth.uid() <> agent_id);

-- Keep profiles.agent_rating / agent_review_count in sync — same trigger
-- pattern as messages_touch_conversation() in 0006_messages_inbox.sql.
CREATE OR REPLACE FUNCTION reviews_touch_agent_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET agent_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE agent_id = NEW.agent_id),
      agent_review_count = (SELECT COUNT(*) FROM reviews WHERE agent_id = NEW.agent_id)
  WHERE id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS reviews_touch_agent_rating_trigger ON reviews;
CREATE TRIGGER reviews_touch_agent_rating_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION reviews_touch_agent_rating();
```

No `UPDATE`/`DELETE` policy for `reviews` in this task (no edit/delete flow in
scope; "Edit my review" mentioned in the product spec §3.6 is a nice-to-have the
task doesn't require — ship "already reviewed" 409 only, per the task's explicit
acceptance criterion, and skip the edit-in-place UI).

### 2.3 `agent_leads`

```sql
CREATE TABLE IF NOT EXISTS agent_leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deal_type      TEXT        NOT NULL CHECK (deal_type IN ('buy', 'sell', 'rent')),
  property_type  TEXT        NOT NULL,
  city           TEXT        NOT NULL,
  budget_min     NUMERIC(15, 2),
  budget_max     NUMERIC(15, 2),
  currency       TEXT        NOT NULL DEFAULT 'AMD' CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB')),
  rooms          SMALLINT,
  name           TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  message        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_leads: agent or author can select"
  ON agent_leads FOR SELECT
  USING (auth.uid() = agent_id OR auth.uid() = author_id);

CREATE POLICY "agent_leads: author can insert"
  ON agent_leads FOR INSERT
  WITH CHECK (auth.uid() = author_id);
```

(§1 D1 already established that the request form requires auth — the acceptance
criteria route Guests to login for "Send a request" too — so `author_id` is
always the session user; there is no anonymous-lead path in this task.)

### 2.4 `reports` — add the review-report target

```sql
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS review_id UUID REFERENCES reviews(id) ON DELETE CASCADE;
```

No new RLS policy needed — the existing `"reports: reporter can insert"` /
`"reports: reporter can select own"` policies (`0006_messages_inbox.sql`) key
only on `reporter_id` and already cover this column.

### 2.5 `types/database.ts`

Regenerate/hand-extend per the file's own header instructions
(`npm run db:types`, or hand-edit like every migration since `0003` has done —
**note**: `types/database.ts` on `main` is currently missing the `0003`/`0007`
columns entirely; this task should add its own `profiles` fields correctly and
is *not* responsible for backfilling the pre-existing drift, but must not make
it worse — add every new column from §2.1–§2.4 to the `Row`/`Insert`/`Update`
shapes, plus new `reviews` and `agent_leads` table blocks, mirroring the
`favorites`/`blocks` table blocks already there).

---

## 3. Component inventory (new + edited files)

```
app/[locale]/agent/[slug]/
  page.tsx                          (NEW — Server Component, SSR shell; mirrors
                                      app/[locale]/property/[id]/[slug]/page.tsx's
                                      fetch-with-mock-fallback + JSON-LD + Suspense shape)

app/api/agents/
  [slug]/route.ts                   (NEW — GET, profile payload; §7)
  [id]/listings/route.ts            (NEW — GET, paginated/filtered listings; §7)
  [id]/reviews/route.ts             (NEW — GET list + POST create; §7)

app/api/agent-leads/route.ts        (NEW — POST; §7)

app/api/conversations/route.ts      (EDIT — accept `agentId` as an alternative to
                                      `propertyId` in conversationSchema; §7)

app/api/reports/route.ts            (EDIT — accept a review-report body; D9)

components/agent/
  AgentHeader.tsx                   (NEW — Server Component; avatar, name, badges)
  AgentBio.tsx                      (NEW — Server Component with a client
                                      "Read more/Hide" toggle island, see §5.2)
  AgentStats.tsx                    (NEW — Server Component, pure KPI grid)
  AgentListingsTabs.tsx             (NEW — client; tabs + sort, see D8)
  AgentListingsGrid.tsx             (NEW — client, React Query; renders
                                      <PropertyCard> from components/search/PropertyCard.tsx)
  AgentReviews.tsx                  (NEW — client; summary + breakdown + list + pagination)
  ReviewItem.tsx                    (NEW — client, for the ⚑ Report affordance)
  WriteReviewModal.tsx              (NEW — client, lazy-loaded like components/property/Lightbox.tsx)
  AgentContactCard.tsx              (NEW — client; mirrors ContactCard.tsx's structure closely)
  RequestLeadModal.tsx              (NEW — client, lazy-loaded)
  ShareModal.tsx                    (NEW — client, lazy-loaded)
  AgentOwnerManageBar.tsx           (NEW — client; mirrors OwnerManageBar.tsx's chrome)
  AgentMobileBottomBar.tsx          (NEW — client; mirrors MobileBottomBar.tsx)
  OtherAgents.tsx                   (NEW — client, React Query; horizontal scroll carousel)
  StarRating.tsx                    (NEW — shared: read-only stars display + the
                                      selectable 1–5 input used by WriteReviewModal)

components/property/Breadcrumbs.tsx (REUSE as-is — generic `BreadcrumbItem[]` props already fit)

lib/agent/
  types.ts                          (NEW — AgentProfile, AgentStats, ReviewItem,
                                      AgentLeadInput, mirrors lib/property/types.ts's shape)
  schemas.ts                        (NEW — zod: reviewSchema, agentLeadSchema; §8)
  mockData.ts                       (NEW — dev/test fallback, mirrors lib/property/mockData.ts)

lib/messages/schemas.ts             (EDIT — add reviewReportSchema; D9)
lib/property/schemas.ts             (EDIT — conversationSchema: propertyId becomes
                                      optional, agentId added, refine "exactly one of
                                      the two is present"; §7)
```

Reuse, don't fork: `lib/utils.ts` (`cn`), `lib/locale.ts` (`safeLocale`),
`lib/auth/rateLimit.ts` (`checkRateLimit`, add an `AGENT_LEAD` preset), the
Supabase client helpers (`lib/supabase/server.ts` for RLS-scoped reads,
`lib/supabase/admin.ts` only where an insert must bypass RLS the way
`conversations`' `POST` handler already does for the initial message), and the
`PropertyListItem`/`PropertyCard` pair from Search — **do not** create a second
property-card shape for the listings grid.

---

## 4. Wireframes

Desktop/mobile layout structure matches the product spec §2 almost exactly; the
only structural deviation is D11 (Other Agents ships) and D6 (no "Fast responder"
chip in the badges row):

```
Desktop ≥1024px
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Home › Find an Agent › Yerevan › Anna Petrosyan              │  Breadcrumbs.tsx (reused)
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN (~64%, max-w-760)         │ ► SIDEBAR (~36%, w-360)  │
│ ┌── AgentHeader (card) ────────┐ │ ┌── AgentContactCard ──┐ │
│ │ avatar 96 · name · ✓          │ │ │ sticky top-20         │ │
│ │ agency (text, not link — D4)  │ │ │ avatar+name+✓+rating │ │
│ │ ⭐4.8(37) · 6y · 📍scope       │ │ │ [💬 Send a message]  │ │
│ │ 🇦🇲🇷🇺🇬🇧 · [Pro][Top Agent]   │ │ │ [📞 Show phone]      │ │
│ └────────────────────────────────┘ │ │ [📋 Send a request]  │ │
│ ── AgentBio (+ specialty chips) ── │ │ [⤴ Share]            │ │
│ ── AgentStats (4-5 KPI cards) ──── │ └───────────────────────┘ │
│ ── AgentListingsTabs + Grid ────── │  (OR AgentOwnerManageBar  │
│ ── AgentReviews ─────────────────  │   when isOwner — D-none,  │
│                                    │   see product spec §3.8)  │
├──────────────────────────────────┴─────────────────────────┤
│ OtherAgents (full-width horizontal scroll, D11)              │
│ FOOTER                                                        │
└────────────────────────────────────────────────────────────┘

Mobile <768px                       Fixed bottom bar (guest/visitor, not owner):
┌──────────────────────────┐        ┌──────────────────────────┐
│ HEADER (h-14)             │        │ [💬 Message] [📞 Call] ⤴ │  h-18, AgentMobileBottomBar.tsx
│ ‹ Agents                  │        └──────────────────────────┘
│ AgentHeader (avatar 80)   │
│ AgentBio                  │
│ AgentStats (2×2)          │
│ AgentListingsTabs + Grid  │
│ AgentReviews              │
│ OtherAgents (scroll)      │
│ FOOTER                    │
└──────────────────────────┘
```

`768–1023px (md)`: single column; `AgentContactCard`/`AgentOwnerManageBar` renders
inline right after `AgentHeader` (not sticky) **and** the fixed bottom bar still
shows (matches the product spec §6 exactly — same dual-surface behavior already
implemented for the property page at this breakpoint).

---

## 5. Design tokens & component specs

### 5.1 Tokens (delta from the product spec's §2 table — only where this codebase's actual convention differs)

| Element | Product spec suggested | **Use this instead** | Why |
|---|---|---|---|
| Verified badge | `bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md` + ✓ | `flex items-center gap-0.5 text-xs text-blue-600` + `CheckCircle` icon (no pill background) | Exact classes already shipped in `ContactCard.tsx:122-127` for the same concept (owner's agent-verified indicator). Reuse verbatim so the header badge and the sidebar's mini-badge read identically. |
| Rating stars | "amber-500" | `text-yellow-400 fill-yellow-400` (filled) / `text-gray-300` (empty) | Matches `ContactCard.tsx:130` (`text-yellow-400 fill-yellow-400`) — the only star-rating precedent in the codebase. Use consistently in `<StarRating readOnly>` and the breakdown bars. |
| Tier badge (Pro) | `bg-violet-100 text-violet-700` | same — no existing precedent, spec value adopted as-is | — |
| Tier badge (Premium) | `bg-amber-100 text-amber-700` | same | — |
| Top Agent badge | `bg-green-100 text-green-700` | same (also matches `new` property badge's green, acceptable overlap — different context) | — |
| Listings tabs | `border-b-2 border-primary text-primary` | same, **but implemented as the hand-rolled pattern**, not `<ui/Tabs>` (D8) | — |
| KPI card | `bg-gray-50 rounded-lg p-4 text-center` | same | Matches the visual weight of `dashboard/OverviewCards.tsx`'s cards (which use `bg-white border` instead — that's a *dashboard* card, this is a *public profile* card; keep the spec's flatter `bg-gray-50` so it doesn't look clickable, since these KPIs aren't links here). |
| Everything else in the spec's §2 token table (avatar sizing, name typography, contact card shadow/border/sticky offset, primary/secondary CTA classes, skeleton `bg-gray-100 animate-pulse`) | — | **use as specified** | Already the exact classes this codebase uses site-wide (verified against `ContactCard.tsx`, `OwnerManageBar.tsx`, `MyListings.tsx`). |

### 5.2 `<AgentBio>` — Server Component + a small client island

Render the bio server-side (SEO needs the text in the initial HTML — do not lazy
render it client-only). The 4-line clamp/expand toggle is the only client bit:

```
<AgentBio bio={agent.bio} locale={locale} specialties={agent.specialties} isOwner={isOwner} />
```

- `text-gray-700 leading-relaxed whitespace-pre-line`, `line-clamp-4` by default,
  a tiny client `<BioToggle>` (single `useState`) flips the clamp and swaps
  "Read more ▾" / "Hide ▴" (`text-sm text-primary font-medium`). Only mount
  `<BioToggle>`'s interactivity when the text actually overflows 4 lines
  (measure via `scrollHeight > clientHeight` in a `useEffect`, same technique
  already used nowhere else in this repo — keep it simple, no new dependency).
- Specialty chips: `bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full`,
  `flex flex-wrap gap-2`, sourced from `agent.specialties` (translate via
  `messages/{locale}.json` — add a small `specialty.<key>` map, do not render
  raw DB slugs like `new_construction`).
- Empty bio (visitor view): render nothing (the whole `<AgentBio>` section
  returns `null`). Owner-view inline prompt ("➕ Add your about text") is
  **out of scope** for this task (inline-edit affordances belong to the
  `/settings/agent` edit page, itself out of scope) — visitor-view fallback
  is enough to satisfy the acceptance criteria; owner sees the same empty
  section (no dead-end prompt to a page that doesn't exist yet).

### 5.3 `<AgentListingsTabs>` + `<AgentListingsGrid>`

- Tabs: `All | For sale | For rent`, underline style (D8), `role="tablist"`.
  State lives in the URL hash-less query string on the client (`useState`, not
  `useSearchParams` — this section doesn't need to be a bookmarkable URL per the
  product spec's own wording, "`#listings?deal=sale`" is a soft anchor, not a
  real query param requirement; keep it simple: local component state).
- Sort: plain `<select>`, same chrome as `FilterBar.tsx`'s sort `<select>`
  (`border border-gray-300 rounded-lg h-9 px-3 text-sm`), options `newest` /
  `price_asc` / `price_desc` (reuse `SortOption` values from
  `lib/search/filtersSchema.ts` — do not invent new sort keys).
- Grid: `useQuery(['agent-listings', agentId, deal, sort, page], …)` against
  `GET /api/agents/[id]/listings`; renders `<PropertyCard>` from
  `components/search/PropertyCard.tsx` with `PropertyListItem[]` — **the exact
  same component/type as `/search`**, per the product spec's explicit
  instruction "same PropertyCard component as in search/03."
  `grid grid-cols-1 md:grid-cols-2 gap-4`.
- Footer: "See all {total} listings" → `/search?agent={id}` link (query param
  `agent` needs to be recognized by `lib/search/filtersSchema.ts`'s
  `parseSearchParams` — if it isn't already, add it as a pass-through filter;
  check before assuming it needs new work).
- Empty: "No active listings at the moment" (`text-sm text-gray-500`,
  centered, `py-12`) + a simple gray icon (no new illustration asset needed —
  reuse the `Maximize`/house-shaped lucide icon already used for the
  no-photo placeholder in `PropertyCard.tsx`).

### 5.4 `<AgentReviews>` + `<WriteReviewModal>` + `<StarRating>`

- Summary header: `text-3xl font-bold` rating number + `(N reviews)` +
  breakdown bars (`bg-gray-200 h-2 rounded`, fill `bg-amber-400` per the
  product spec — this one specific bar-fill color is fine to keep even though
  §5.1 standardizes stars on `yellow-400`, since the bar and the star glyph
  are visually distinct elements and `amber-400`/`yellow-400` read as the same
  hue family; do not over-index on pixel-matching two different Tailwind
  amber/yellow scales here).
- `<StarRating>` two modes: `readOnly` (display, any decimal value, used in
  header/sidebar/summary) and interactive (`role="radiogroup"`, 5
  `role="radio" aria-checked`, ←/→ to move focus+selection, `aria-label="{n}
  stars"` per star — matches the product spec §7 exactly and the keyboard
  pattern already established for `<FrequencyToggle>`-style controls
  elsewhere in the design docs for this app).
- `<WriteReviewModal>`: lazy-loaded (`dynamic(() => import(...), { ssr: false
  })`, same pattern as `components/property/Lightbox.tsx`). Fields: star input
  (required) + `<textarea>` with a live counter ("42 / 1000"), `[Publish]` →
  `POST /api/agents/[id]/reviews`.
  - `401` → same redirect as D1 (should not normally fire — the CTA itself is
    only rendered for a logged-in session; still handle defensively in case
    the session expired mid-visit).
  - `409` → close modal, inline toast "You've already written a review for
    this agent." (no "Edit my review" flow — out of scope, §2.2).
  - `422 self_review_forbidden` → should never be reachable through the UI
    (the CTA is hidden when `isOwner`), but handle it the same way as any
    other server validation error (inline alert `role="alert"`) as a defense
    in depth.
- CTA visibility: hidden entirely when `isOwner`; when not logged in, render
  the same `[✍️ Write a review]` button but the click handler does the D1
  redirect instead of opening the modal (mirrors how `ContactCard.tsx`'s
  "Send a message" button is always visible and only branches to a redirect
  inside the click handler on `401` — **but** for review-writing we know
  auth state on the server already via SSR `isOwner`/`isLoggedIn` props, so
  gate the *modal open* client-side on a `isLoggedIn` prop passed down from
  the Server Component instead of waiting for a round-trip 401).
- `<ReviewItem>`: avatar, name, `<StarRating readOnly>`, `text-gray-400` date
  (relative — reuse `lib/messages/helpers.ts`'s relative-time formatter if its
  signature fits, per the same instruction the notifications design doc gave;
  check before writing a second one), review text, and a `⚑` icon button
  (`aria-label="Report review"`) that opens a tiny reason-select (`spam` /
  `abuse`/`other` — reuse `conversationReportSchema`'s enum values via the new
  `reviewReportSchema`, D9) → `POST /api/reports`. No "Agent reply" block is
  rendered from the UI in this task beyond a passive `review.reply` read (D10)
  — if `reply` is non-null (will always be `null` for now, no writer exists),
  render it in the `bg-gray-50 border-l-2 border-primary pl-3` block per spec;
  otherwise render nothing.
- Empty: "No reviews yet — be the first" + the same Write-review CTA.
- Sort: `<select>` Newest / Highest / Lowest, same chrome as §5.3's sort.
- Pagination: "Show more" button, page-by-page (`page++`, refetch, append) —
  same shape as `MyListings.tsx`'s load pattern, not infinite scroll (that's
  the Notifications-page pattern for a different page; keep this one a simple
  click-to-load-more per the product spec's own wording).

### 5.5 `<AgentContactCard>`

Structurally a near-clone of `components/property/ContactCard.tsx`, adapted:

- Header: avatar 48px + name + inline verified check + `<StarRating readOnly>`
  + `(N)` — same layout `ContactCard.tsx` already renders for `owner.agent`.
- `[💬 Send a message]`: `POST /api/conversations` with `{ agentId, message:
  "Hi, I'm interested in your services." }` (§7 — extended endpoint, not a new
  one). `401` → D1 redirect. `200/201` → `window.location.href =
  /messages/{conversationId}`, identical to `ContactCard.tsx`'s existing
  handler, just swap `propertyId` for `agentId` in the body.
- `[📞 Show phone]`: identical reveal-in-place behavior to `ContactCard.tsx`
  (`phoneVisible` state, then a `tel:` link). No captcha (D13). The
  `agent_phone_revealed` analytics event is a documented aspiration only
  (§10) — no analytics backend exists in this repo to actually call, same
  caveat every prior design doc in this codebase has noted.
- `[📋 Send a request]` → `<RequestLeadModal>`: fields per §8's
  `agentLeadSchema`, `[Send]` → `POST /api/agent-leads`. `401` → D1 redirect
  (this modal should also only be reachable once logged in per D1, but keep
  the defensive 401 handling). `201` → close modal, success banner "Your
  request has been sent — the agent will get in touch." (`role="status"`,
  green, same visual language as `ContactCard.tsx`'s `formSuccess` block).
  `429` → toast "Too many requests, please try again later."
- `[⤴ Share]` → `<ShareModal>`: link-copy via `navigator.clipboard.writeText`
  + toast "Link copied" (minimum required by the task). Facebook/Telegram/
  WhatsApp/Email share links are nice-to-have per the product spec but not
  required by the task's acceptance criteria ("Share (link copy at
  minimum)") — include them only if trivial (they're just `<a href="https://…">`
  intent links, no SDK needed), but link-copy is the one that must work.
- Sticky `top-20` on `lg:`, inline (non-sticky) on `md`, replaced by
  `<AgentMobileBottomBar>` below `md`.

### 5.6 `<AgentOwnerManageBar>`

Mirrors `OwnerManageBar.tsx`'s chrome (`shadow-sm border border-gray-200
rounded-xl p-5 space-y-5 sticky top-20`) but with the agent-specific button
set the task specifies:

- `[✏️ Edit profile]` → `/settings/agent` (**this route does not exist yet** —
  it's a different task's responsibility; link to it anyway per the task
  instruction "Edit/Preview buttons" — a 404 on that link is acceptable for
  this task, do not build a stub page for it, and do not skip the button).
- `[👁 Preview]` → toggles a `?preview=1` query param that the page reads
  server-side to render the visitor view (contact card instead of manage
  bar) while staying on the owner's own session — simplest possible
  implementation, no separate route needed.
- `[📊 Pro Dashboard]` → task explicitly allows "a placeholder route." Link to
  `/pro/dashboard` and let it 404 for now (same rationale as Edit profile) —
  **do not build a Pro Dashboard page**, that is explicitly out of scope.
- `[⭐ Promote]` → only rendered when `tier === 'free'`, links to `/pro`
  (also may 404 — out of scope to build).
- No stats grid inside this bar for the MVP (property page's
  `OwnerManageBar` shows views/favorites/messages because those numbers
  exist per-listing; there is no equivalent "agent-level" analytics
  aggregation in scope here — Pro Dashboard analytics is explicitly
  excluded by the task). Keep the bar to the four buttons above.

### 5.7 `<AgentMobileBottomBar>`

Direct clone of `MobileBottomBar.tsx`'s layout (`fixed bottom-0 … h-18`), two
buttons only (`[💬 Message] [📞 Call]`) + `⤴` icon button (share), no ♡
favorite button (that concept doesn't apply to an agent profile). Hidden when
`isOwner`.

### 5.8 `<OtherAgents>`

Horizontal scroll (`flex gap-4 overflow-x-auto`, not a JS carousel library —
no carousel dependency exists in `package.json`, and the property page's
`SimilarProperties.tsx`/`RecentlyViewed.tsx` already use plain scroll
containers for the equivalent "related items" pattern; copy that approach,
not a new one). Card: small avatar + name + rating + city, links to
`/agent/[slug]`. Query per D11.

---

## 6. Full list of page states

Matches the product spec §4 table; MVP-relevant notes only:

| State | What is displayed | Notes |
|---|---|---|
| Loading | Skeleton shimmer blocks (`bg-gray-100 animate-pulse rounded-lg`) for header/bio/stats/grid/sidebar | Rendered by the page's own `loading.tsx` (App Router convention — check whether other pages in this tree use `loading.tsx` or `<Suspense>` inline; property page uses inline `<Suspense>` only for the toast, so prefer a `app/[locale]/agent/[slug]/loading.tsx` file for the full-page skeleton, consistent with Next.js App Router idioms). |
| Loaded (visitor) | Full profile, `<AgentContactCard>` right column / `<AgentMobileBottomBar>` | |
| Loaded (owner) | `<AgentOwnerManageBar>` instead of contact card, no mobile bottom bar | |
| Unverified agent | No Verified badge; gray "Verification in progress" tag — **only shown above the free tier** per spec (`tier !== 'free' && !agent_verified`) | |
| 0 listings | "No active listings at the moment" (§5.3) | |
| 0 reviews | "No reviews yet — be the first" (§5.4) | |
| 404 / not found | Reuse the same not-found pattern as the property page: `notFound()` → Next's `not-found.tsx` at the appropriate segment, or a dedicated `app/[locale]/agent/[slug]/not-found.tsx` with "This profile was not found" + `[Find an Agent]` link (→ `/agents` if that route exists yet, else `/search` as a safe fallback — verify before wiring). |
| Suspended (`agent_status = 'suspended'`) | Distinct from 404: render a small page with "This profile is no longer available" + `[Find an Agent]`, **and** `generateMetadata` returns `robots: { index: false, follow: false }` (the task's "410-equivalent" — do not literally return an HTTP 410 status from a Server Component page; Next.js doesn't support arbitrary status codes from `page.tsx` easily, `noindex` + friendly copy satisfies the acceptance criterion's intent, matching how the property page handles `sold`/`archived` with `robots: { index: false }` rather than a real 410). |
| Error (API fail) | "Something went wrong" + `[Try again]` — same copy/pattern as `OverviewCards.tsx`'s error state | |

---

## 7. API contracts

**`GET /api/agents/[slug]`**
- 200: same JSON shape as the product spec §5 example, with these MVP
  adjustments: no `avg_response_time`/`avg_response_hours` field (D6); `badges`
  array only ever contains `top_agent` (never `fast_responder`, D6);
  `agencySlug` omitted (D4 — no agency route to link to).
- 404 `{ error: 'not_found' }` — no row, or `role <> 'agent'`, or `agent_slug`
  null.
- 410-shaped in body (`{ error: 'suspended' }`) with a `200` HTTP status is
  **not** correct — return a real `410` here (this is a route handler, unlike
  the page component, so an accurate HTTP status is easy and correct);
  `page.tsx` interprets that response and renders the suspended state (§6).
- Auth-aware: reads the session (if any) to compute `isOwner`.
- Falls back to `lib/agent/mockData.ts` when Supabase env vars are absent,
  exactly like `fetchProperty()` does in the property page — same
  `try { fetch(own API) } catch { getMock… }` shape.

**`GET /api/agents/[id]/listings?deal=sale|rent|all&sort=newest|price_asc|price_desc&page=1`**
- 200 `{ items: PropertyListItem[], total, page, pageSize }` — reuse
  `PropertyListItem` from `lib/search/types.ts` verbatim (§3).
- Query: `properties WHERE owner_id = :id AND status = 'active'` (+ `deal_type`
  filter when not `all`), same `ORDER BY` mapping as `filtersSchema`'s
  `SORT_OPTIONS` already implements for `/api/properties`.

**`POST /api/agents/[id]/reviews`**
- Body: `reviewSchema` (§8).
- 201 `{ reviewId }`.
- 401 `{ error: 'auth_required' }`.
- 409 `{ error: 'already_reviewed' }` — catch the `UNIQUE (agent_id,
  author_id)` violation (Postgres error code `23505`), same technique the
  saved-searches design doc specifies for its own unique-constraint 409 (do
  not pre-check-then-insert only — that has the same TOCTOU race noted there).
- 422 `{ error: 'self_review_forbidden' }` — check `author_id === agent.id`
  *before* attempting the insert (cheap, avoids relying solely on the DB
  `CHECK` constraint's less-specific error).

**`POST /api/agent-leads`**
- Body: `agentLeadSchema` (§8).
- 201 `{ leadId }`.
- 401 `{ error: 'auth_required' }`.
- 429 `{ error: 'rate_limited' }` — `checkRateLimit('agent-lead:' + userId, 5,
  60 * 60 * 1000)`, add an `AGENT_LEAD: { max: 5, windowMs: 60 * 60 * 1000 }`
  preset to `lib/auth/rateLimit.ts`'s `LIMITS` object (currently `LOGIN`,
  `REGISTER`, `FORGOT`, `OTP_RESEND` — same call shape as
  `app/api/messages/route.ts`'s existing `checkRateLimit(...)` usage).
- 422 `{ error: 'validation_error', fields }` on zod failure (same shape every
  other route in this codebase uses).

**`POST /api/conversations`** (edited, not new)
- `conversationSchema` becomes:
  ```ts
  export const conversationSchema = z
    .object({
      propertyId: z.string().uuid().optional(),
      agentId: z.string().uuid().optional(),
      message: z.string().min(1).max(2000),
    })
    .refine((d) => (d.propertyId == null) !== (d.agentId == null), {
      message: 'Exactly one of propertyId or agentId is required',
    })
  ```
- When `agentId` is present: `seller_id = agentId`, `property_id = NULL`
  (the `conversations` table already allows a nullable `property_id`, per
  `0001_init.sql` — no migration needed here). Self-message guard: `if
  (agentId === user.id) return 422 cannot_message_self`, same check already
  present for the property path.
- Existing-conversation lookup for the agent path: `.eq('property_id', null
  as never).eq('buyer_id', user.id).eq('seller_id', agentId)` — Supabase's
  `.is('property_id', null)` is the correct call for a null match (`.eq`
  does not match `NULL` in Postgres); use `.is()`, not `.eq()`.

**`POST /api/reports`** (edited, D9) — body becomes
`z.union([conversationReportSchema, reviewReportSchema])`; branch on which
key is present to decide the ownership check and which FK column to write.

---

## 8. Validation (zod)

```ts
// lib/agent/schemas.ts
import { z } from 'zod'

// Reuse the exact E164 pattern already defined in lib/property/schemas.ts —
// do not redefine a second phone regex; import it if it's exported, or
// promote it to lib/validation/phone.ts and import from both call sites if
// it currently isn't exported (check before duplicating).
export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(5),
  text: z.string().min(10, 'Review is too short').max(1000),
})
export type ReviewInput = z.infer<typeof reviewSchema>

export const agentLeadSchema = z.object({
  dealType: z.enum(['buy', 'sell', 'rent']),
  propertyType: z.string().min(1),
  city: z.string().min(2),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.enum(['AMD', 'RUB', 'USD', 'EUR']),
  rooms: z.number().int().positive().optional(),
  name: z.string().min(2, 'Name is required').max(50),
  phone: z.string().regex(E164_PHONE, 'Invalid phone number'), // same regex as contactSchema
  message: z.string().max(1000).optional(),
  website: z.string().max(0, 'Spam detected').optional(), // honeypot — identical convention to contactSchema
})
export type AgentLeadInput = z.infer<typeof agentLeadSchema>
```

```ts
// lib/messages/schemas.ts — addition
export const reviewReportSchema = z.object({
  reviewId: z.string().uuid('reviewId must be a UUID'),
  reason: z.enum(['spam', 'fraud', 'abuse', 'other'], {
    errorMap: () => ({ message: 'Invalid reason' }),
  }),
  note: z.string().max(500).optional(),
})
```

Note the task brief's example schema names the field `budgetMax`/`budgetMin` as
plain `z.number()` and phone as `E164_BY_COUNTRY` (a placeholder name in the
product doc, not a real export) — `E164_PHONE` from `lib/property/schemas.ts`
is this codebase's actual implementation of that requirement; reuse it,
naming it `E164_PHONE` consistently rather than inventing
`E164_BY_COUNTRY` as a new, redundant regex.

---

## 9. Responsive

Matches product spec §6 verbatim — no deviations beyond what's already covered
in §4/§5 (D8 tab style, dual-surface contact card at `md`).

---

## 10. Accessibility

Matches product spec §7 verbatim. Concrete implementation notes:
- `<StarRating>` interactive mode keyboard handling: copy the roving-tabindex
  arrow-key pattern from `components/ui/Tabs.tsx` (`ArrowLeft`/`ArrowRight`/
  `Home`/`End`) — same shape, different `role` (`radio` instead of `tab`).
- Modals (`WriteReviewModal`, `RequestLeadModal`, `ShareModal`): copy the
  focus-management + Escape-to-close + backdrop-click-to-close chrome from
  `components/dashboard/DeleteConfirmModal.tsx` verbatim (overlay `fixed
  inset-0 bg-black/40`, `role="dialog" aria-modal="true"
  aria-labelledby="…-title"`, focus moved to the first focusable control on
  mount, `Escape` handled via a `window` keydown listener, backdrop click
  closes via an `overlayRef` identity check). `DeleteConfirmModal.tsx` itself
  already uses `role="dialog"` (not `alertdialog` — that stricter role is
  reserved for its own destructive-confirmation use case), which is the
  correct role for these three non-destructive modals too.
- Success/error inline messages: `role="status"` / `role="alert"` — same
  convention as `ContactCard.tsx`'s `formSuccess` block.

---

## 11. SEO & meta

- `generateMetadata`: title `"{name} — real estate agent in {primaryCity} · ⭐
  {rating} | {BRAND}"` (fall back to no rating segment when `agent_rating` is
  null — a brand-new agent with 0 reviews), description = first 155 chars of
  `agent_bio[locale]` + `"{N} active listings · {N} reviews"`, exact pattern
  already implemented in the property page's `generateMetadata` (slice + city
  + price concat) — copy that shape.
- `alternates.canonical` + `alternates.languages` (hy/ru/en) — identical
  3-line object literal already used in the property page's
  `generateMetadata`.
- `openGraph.images`: avatar URL only (D12) — no dynamic OG endpoint.
- Suspended agent: `robots: { index: false, follow: false }` (§6).
- JSON-LD: `@graph` with `RealEstateAgent` (`aggregateRating: { ratingValue,
  reviewCount }` only — no per-review `review[]` array in this task, the
  product spec lists it but the task brief explicitly scopes to
  "aggregateRating only") + `BreadcrumbList`, same `<script
  type="application/ld+json">` injection pattern already used in
  `app/[locale]/property/[id]/[slug]/page.tsx`.

---

## 12. Test coverage checklist

Naming convention: flat files under `__tests__/*.test.ts` (see the existing
`conversationsApiRoutes.test.ts`, `favoritesSchemas.test.ts`,
`listingsRoute.test.ts` for the pattern of one file per route/schema group).
Suggested new files, matching the task's explicit acceptance criteria:

- `__tests__/agentReviewSchema.test.ts` — `reviewSchema` boundary cases
  (rating 0/6, text 9/1001 chars).
- `__tests__/agentReviewsRoute.test.ts` — duplicate-review 409 (insert twice,
  assert the second returns 409 via the unique-constraint path), self-review
  422 (`author_id === agent_id`), 401 when unauthenticated, 201 happy path,
  and that `profiles.agent_rating`/`agent_review_count` update after insert
  (trigger behavior, §2.2).
- `__tests__/agentLeadSchema.test.ts` — `agentLeadSchema` including the
  honeypot field (`website` non-empty → validation failure) and phone regex.
- `__tests__/agentLeadsRoute.test.ts` — 201 happy path, 429 after 6 requests
  within the window. **No existing test in this repo exercises a 429
  rate-limit path yet** (checked — `checkRateLimit`/`LIMITS` has no dedicated
  test file); write this one from scratch, calling the route handler
  repeatedly against the same `userId` and asserting the 6th call returns
  429, mirroring the request-building helpers already used in
  `conversationsApiRoutes.test.ts` for POSTing to a route handler in tests.
- `__tests__/agentListingsRoute.test.ts` — `deal` filter (`sale`/`rent`/`all`)
  and `sort` param correctness against a seeded/mock property set.
- `__tests__/agentProfileRoute.test.ts` — 404 (no slug match), 410 (suspended),
  200 shape, `isOwner` true/false branching.
- `__tests__/conversationsRoute.test.ts` (existing file — extend, don't
  duplicate) — add cases for the `agentId` branch: happy path, self-message
  422, and the mutual-exclusivity refine (`both` or `neither` of
  propertyId/agentId → 422).

---

## 13. Explicit MVP exclusions (recap, for the reviewer's benefit)

Do not add in this task, even if convenient: `/agency/[slug]` route, a real
`/pro/dashboard` page, an admin moderation UI/queue for `reports`, a
`/api/og` dynamic image endpoint, review-reply write endpoint (D10),
captcha integration (D13), "Fast responder" badge/metric (D6), a
sophisticated Other-Agents ranking beyond the D11 same-primary-city query,
or a `LoginModal` component (D1) — every guarded action reuses the
established `401` → `/auth/login?next=…` redirect already proven on the
property page.
