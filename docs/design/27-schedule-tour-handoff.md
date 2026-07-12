# Page 27 — Schedule a Tour (MVP): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/27-schedule-tour.md`](../en/pages/27-schedule-tour.md) (deep v1,
Phase 2) — read it first for the competitive framing, the three user scenarios,
and full microcopy tone. This document does **not** repeat those; it exists to
close the gap between that Phase-2 spec (which assumes owner availability
calendars, instant-book, self-guided lockbox codes, and a login-gated flow)
and *this specific MVP task*, which is deliberately much smaller. §1 lists every
place this document overrides the page spec, and why — implement per this
document, not per the page spec, wherever the two disagree.

**Scope of this task** (per the assigning ticket): a "Schedule a tour" CTA +
booking modal reachable from the existing Property Detail page
(`/property/[id]/[slug]`, Page 03) only. Guests may submit without an account.
`POST /api/tours` with zod validation + rate limiting/honeypot. Owner/agent is
notified through the existing Page 22 notifications infra. New `tours` table
with RLS. **No** calendar-management UI, video-call provider integration,
SMS reminders, or reschedule/cancel flows — see §1 for the full list of what
that cuts from the page spec.

Audited against the current tree: `app/[locale]/property/[id]/[slug]/page.tsx`,
`components/property/ContactCard.tsx`, `components/property/MobileBottomBar.tsx`,
`components/property/OwnerManageBar.tsx`, `components/agent/AgentContactCard.tsx`
+ `components/agent/RequestLeadModal.tsx` (closest existing precedent — a
lead-capture modal with the exact same shape: zod schema, honeypot, rate limit,
`role="dialog"`), `app/api/agent-leads/route.ts`, `app/api/conversations/route.ts`,
`lib/auth/rateLimit.ts`, `lib/property/schemas.ts`, `lib/agent/schemas.ts`,
`lib/notifications/{types,helpers,navigation}.ts`,
`supabase/migrations/{0001_init,0002_rls_policies,0007_notifications_phase1,0008_agent_profile}.sql`,
`types/database.ts`, `__tests__/{agentLeadsRoute,agentLeadSchema,messagesMigration}.test.ts`.
Stack confirmed: Next.js 15 App Router, Tailwind v4 (`@theme` tokens, no
`tailwind.config.*`), `lucide-react` icons, `react-hook-form` + `@hookform/resolvers/zod`
for all existing forms in `components/property` / `components/agent`, `zod`,
Supabase (`@supabase/ssr`), no date-picker dependency anywhere in the repo —
don't add one; the page spec's own design already specifies a plain Tailwind
day-chip strip (§2.5's token table), which needs no library.

---

## 1. MVP scope cuts from the Phase-2 page spec

| # | Page-spec says (§ ref) | MVP decision for this task | Why |
|---|---|---|---|
| C1 | 3 tour types: in-person / video / **self-guided** (§3.1) | **2 types only: `in_person`, `video`.** No self-guided chip. | Self-guided needs a lockbox/door-code to hand out on confirmation and owner-side setup — that's listing/owner configuration, which the task explicitly puts out of scope ("agent/staff-side calendar/availability management UI"). |
| C2 | Owner **availability schedule** (`agent_availability` table: working days/hours, slot duration, Instant Book toggle) drives which time slots are bookable (§3.3, §5) | **Not built.** Time slots are a **fixed daily grid** (see §4.3 below) with no busy/available distinction — there is no owner calendar to check against yet. Every submission is a *request*, never an instant confirmation. | Owner/staff calendar UI is explicitly out of scope for this task. Building the request UI against a schedule table that has no management UI would produce dead configuration nobody can edit. |
| C3 | `GET /api/tours/slots?property_id=&date=` (§5) | **Not built.** | Only exists to query the availability engine cut in C2. The date/time UI in §4.3 needs no server round-trip — it renders the fixed grid client-side and only hits the network on submit. |
| C4 | Owner actions: Confirm / Decline / Propose another time; Pro Dashboard "tours" tab (§3.9) | **Not built.** `tours.status` has exactly one value (`'pending'`) for now — see §5. | Task explicitly excludes "agent/staff-side calendar/availability management UI" and "rescheduling/cancellation flows." |
| C5 | `/tours/[token]/confirmed` standalone page, `/tours` "My Tours" list, calendar export (.ics / Google / Apple), directions link (§2.4, §2.5, §3.7, §3.8) | **Not built.** Success is communicated **inline on the property page** (toast + banner) — see §6. | The task's acceptance criteria require only that the owner is notified via existing surfaces; it does not require a requester-facing tour list. Building one here would be net-new page surface the ticket didn't ask for. |
| C6 | Open-house banner / `open_house_events` (§2.2, §3.6) | **Not built.** | Separate feature (no open-house concept anywhere else in this codebase); not mentioned in this task's acceptance criteria. |
| C7 | `[Request Tour]` **requires auth**; guest click opens a login-gate modal, form state preserved, auto-submits after auth (§3.5) | **Guests may submit directly, no login gate.** `name` + `phone` become **required form fields** captured in the modal itself. | Task requirement: "Guests can submit the form... and are not forced to log in." This is the biggest behavioral deviation from the page spec — flagged explicitly because it also means `requestTourSchema` (§5) must gain `name`/`phone`, which the page-spec version doesn't have (it assumed the session always supplies them). |
| C8 | Video call → "WhatsApp / Zoom link generated"; self-guided → "door code sent" (§0, §3.1) | **Preference only.** `tour_type = 'video'` is stored; nothing is provisioned or sent. | Task explicitly excludes "video-call provider integration (just capture the preference)." |
| C9 | Notifications sent via **Push + Email** (§5 "Notifications triggered") | **In-app `notifications` row only** (Page 22 infra, already shipped). No email/push pipeline exists in this codebase yet (the saved-searches feature made the identical call for its own alert pipeline — see `docs/design/saved-searches-page.md` §0). | Task: "reuse existing messages/notifications infrastructure... rather than building a new email system." |
| C10 | `property_id INT` in the `tour_requests` SQL sketch (§5) | **`UUID`.** | This codebase's `properties.id` is `UUID` (see `supabase/migrations/0001_init.sql`), not `int` — the page spec was written generically before this schema existed. Same for `requester_id`/`owner_id` → `profiles(id) UUID`. |
| C11 | Table name `tour_requests` (§5) | **Table name `tours`**, per this task's own wording ("New `tours` table/migration"). | Follow the task instruction over the older page-spec sketch. |

Everything in §1 that says "not built" must not be stubbed with dead UI either
(no disabled self-guided chip, no fake availability toggle) — per this
codebase's own convention (`docs/design/22-notifications-handoff.md`'s
"no dead JS/DOM" principle), ship only what's real.

---

## 2. File inventory

```
components/
  property/
    ContactCard.tsx                 (EDIT — add "Schedule a tour" button, §3.1)
    MobileBottomBar.tsx             (EDIT — add "Tour" control, §3.2)
    ScheduleTourModal.tsx           (NEW — client, the booking modal, §4)
app/
  [locale]/property/[id]/[slug]/
    page.tsx                        (EDIT — fetch viewer session for prefill, thread isAvailable/currentUser, §3.3)
  api/
    tours/
      route.ts                      (NEW — POST /api/tours, §6)
lib/
  tours/
    schemas.ts                      (NEW — tourRequestSchema + TOUR_TYPES + lead-time constants, §7)
    helpers.ts                      (NEW — pure helpers: date-strip generation, ISO-with-offset builder, slot list, §4.3/§7 — unit-testable, no fetch/DOM per this codebase's `lib/*/helpers.ts` convention)
  auth/
    rateLimit.ts                    (EDIT — add `LIMITS.TOUR_REQUEST`, §8)
  notifications/
    types.ts                        (EDIT — add `'tour_requested'` to NotificationType + payload fields, §9)
    helpers.ts                      (EDIT — KNOWN_TYPES, toPayload, notificationText, NOTIFICATION_ICON, §9)
    navigation.ts                   (EDIT — notificationHref + stale-target check, §9)
supabase/migrations/
  0009_tours.sql                   (NEW — tours table, RLS, notifications type CHECK extension, §5)
types/
  database.ts                       (EDIT — add `tours` Row/Insert/Update/Relationships block mirroring `agent_leads`, §5)
__tests__/
  tourSchema.test.ts                 (NEW, mirrors agentLeadSchema.test.ts)
  toursRoute.test.ts                 (NEW, mirrors agentLeadsRoute.test.ts)
  toursMigration.test.ts             (NEW, mirrors messagesMigration.test.ts — static RLS assertions)
  toursHelpers.test.ts               (NEW — date-strip/ISO-builder pure functions)
```

Reuse, don't fork: the honeypot field pattern, the `cn()` helper
(`lib/utils.ts`), the `checkRateLimit`/`LIMITS` module, the bottom-center toast
shell from `FavoritesGrid.tsx:309-321` (§6.4 below), and the `role="dialog"` /
focus-trap-on-Escape pattern from `RequestLeadModal.tsx` /
`DeleteConfirmModal.tsx` (§10).

---

## 3. Where the CTA lives (no other property-page changes)

### 3.1 Desktop — `ContactCard.tsx`

Add a **third button** below "Show phone", in the same tertiary style
`AgentContactCard.tsx` already uses for its own "Send a request" button
(`components/agent/AgentContactCard.tsx:119-125`):

```tsx
<button
  onClick={() => setShowTourModal(true)}
  disabled={!isAvailable}
  className="w-full h-12 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
>
  <CalendarClock className="w-4 h-4" aria-hidden="true" />
  Schedule a tour
</button>
```

`ContactCard` needs two new props to support this and stay consistent with
what `MobileBottomBar` already receives from `page.tsx`:

```ts
interface ContactCardProps {
  owner: PropertyOwner
  propertyId: string
  isAvailable: boolean                                    // NEW — mirrors MobileBottomBar's existing prop
  currentUser: { name: string | null; phone: string | null } | null   // NEW — prefill, §3.3
}
```

State + mount, same shape as `AgentContactCard`'s `showRequestModal` /
`requestSent`:

```tsx
const [showTourModal, setShowTourModal] = useState(false)
const [tourRequested, setTourRequested] = useState(false)
// ...
{tourRequested && (
  <p role="status" className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
    Tour requested — the owner will confirm soon.
  </p>
)}
{showTourModal && (
  <ScheduleTourModal
    propertyId={propertyId}
    currentUser={currentUser}
    onClose={() => setShowTourModal(false)}
    onSent={() => { setShowTourModal(false); setTourRequested(true) }}
  />
)}
```

Don't remove or restructure the existing "Send a message" / "Show phone" /
quick-contact-form block — only append.

### 3.2 Mobile — `MobileBottomBar.tsx`

Add a 4th control to the existing sticky bar. To keep 4 controls readable at
common phone widths (~360px) without cramming, keep **Message** and the new
**Tour** button as the two `flex-1` labeled buttons (most important actions,
most legible), and shrink **Call** to an icon-only square button matching
**Favorite**'s existing treatment — a scoped visual change, not a functional
one (`tel:` link still works, just loses its inline label):

```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] h-18 flex items-center px-3 gap-2 pb-safe">
  {/* Message — flex-1, unchanged except gap/px on the parent */}
  {/* NEW: Tour — flex-1, same shape as Message but outline/primary style */}
  <button
    onClick={() => setShowTourModal(true)}
    disabled={!isAvailable}
    className="flex-1 h-12 border border-primary text-primary rounded-lg font-medium flex items-center justify-center gap-2 transition-colors hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  >
    <CalendarClock className="w-4 h-4" aria-hidden="true" />
    Tour
  </button>
  {/* Call — now w-12 h-12 icon-only, aria-label="Call", same border-gray-200 treatment as Favorite */}
  {/* Favorite — unchanged, w-12 h-12 */}
</div>
```

Add the same `currentUser` prop as `ContactCard`; `isAvailable` is already a
prop here — reuse it, don't add a second flag.
Manual QA note: verify at a 360px viewport that 4 controls don't overflow;
if `gap-2`/`px-3` isn't enough, reduce `Tour`'s label to icon-only with
`aria-label="Schedule a tour"` before shipping — don't let the bar wrap or
clip.

### 3.3 `page.tsx` — fetch the viewer's identity for prefill

`page.tsx` currently never touches Supabase directly (it fetches the property
through the internal `/api/properties/[id]` route). Add a small, guarded
session lookup — guarded the same way every route handler in this codebase
guards Supabase calls, so local/dev/test runs without Supabase env vars still
render the page instead of throwing:

```tsx
async function fetchCurrentUser(): Promise<{ name: string | null; phone: string | null } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project-id')) return null

  const { createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  return { name: profile?.full_name ?? null, phone: profile?.phone ?? null }
}
```

Call it alongside `fetchProperty(id)` in `PropertyDetailPage`, pass the result
as `currentUser` to both `<ContactCard>` and `<MobileBottomBar>`, and pass
`isAvailable` (already computed at `page.tsx:200`) to `<ContactCard>` too (it
currently only flows to `PropertyGallery` and `MobileBottomBar` — extend it,
don't duplicate the `active`/`pending` check).

---

## 4. `ScheduleTourModal` — wireframe, fields, tokens

```
┌──────────────────────────────────────────────┐
│ Schedule a tour                          [X] │  h2, role="dialog"
│ ┌── Tour type ──────────────────────────────┐ │
│ │ [📍 In-person ●]      [📹 Video]         │ │  role="radiogroup"
│ └────────────────────────────────────────────┘ │
│ ┌── Date (next 14 days, horizontal scroll) ─┐ │
│ │ Fri 12  [Sat 13]  Sun 14  Mon 15  Tue 16 →│ │
│ └────────────────────────────────────────────┘ │
│ ┌── Time ────────────────────────────────────┐ │
│ │ [09:00] [10:00] [11:00●] [12:00] [13:00]…  │ │  role="listbox"
│ └────────────────────────────────────────────┘ │
│ Your name        [___________________]        │  required
│ Phone             [___________________]        │  required
│ Message (optional, 300 chars) [_____________]  │
│ (honeypot input, hidden)                       │
│ [ Request Tour ]                                │  primary, full-width
│ Anti-spam protected. Your data is safe.        │  (matches ContactCard's existing microcopy)
└──────────────────────────────────────────────┘
```

Reuse `RequestLeadModal.tsx`'s exact shell (`fixed inset-0 bg-black/40 z-50`
overlay, `bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh]
overflow-y-auto` panel, `role="dialog" aria-modal="true"
aria-labelledby="schedule-tour-title"`, close-on-backdrop-click, `<X>` button)
— don't re-derive it.

### 4.1 Tour type selector

```tsx
<fieldset role="radiogroup" aria-label="Tour type">
  {TOUR_TYPES.map((t) => (
    <label key={t} className={cn(
      'rounded-lg px-4 py-2 text-sm font-medium cursor-pointer',
      value === t
        ? 'bg-primary text-white'
        : 'border border-gray-300 text-gray-700 hover:border-primary',
    )}>
      <input type="radio" className="sr-only" value={t} {...register('tourType')} />
      {t === 'in_person' ? '📍 In-person' : '📹 Video call'}
    </label>
  ))}
</fieldset>
```

Both chips always shown (no per-listing enable/disable in MVP, per C1/C2).
Default: `in_person`.

### 4.2 Date strip

Tokens straight from the page spec's §2 table (already Tailwind-only, no
library needed):

| Element | Class |
|---|---|
| Day (selected) | `bg-primary text-white rounded-xl w-12 h-14 flex flex-col items-center justify-center flex-shrink-0` |
| Day (default) | `border border-gray-200 text-gray-700 rounded-xl w-12 h-14 hover:border-primary cursor-pointer flex-shrink-0` |
| Strip container | `flex gap-2 overflow-x-auto pb-1` |

14 days starting today (`lib/tours/helpers.ts`'s `buildDateOptions(now, days=14)`
— pure function, unit test it directly rather than only through the component).
No disabled/greyed days in MVP (C2 — no owner working-days config to check
against).

### 4.3 Time slots

Fixed grid, **not** owner-configured (C2/C3): hourly slots **09:00–19:00**
(`09:00, 10:00, ... 19:00` — 11 slots), same for every day of the week.
`lib/tours/helpers.ts`'s `buildTimeSlots(selectedDate, now)` filters out any
slot earlier than `now + MIN_LEAD_MS` **only when `selectedDate` is today** —
this is the one piece of "availability" logic MVP has, and it exists purely
to satisfy the min-lead-time rule the API also enforces (§7), not to model
real busy/free state. No slot is ever rendered "busy" — there's no data
source for that in MVP.

| Element | Class |
|---|---|
| Slot (selected) | `bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium` |
| Slot (available) | `border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-primary cursor-pointer` |
| Slot (past — today only) | `bg-gray-50 text-gray-300 rounded-lg px-3 py-2 text-sm cursor-not-allowed` |
| Grid | `grid grid-cols-3 sm:grid-cols-4 gap-2` |

### 4.4 Name / phone / message / honeypot

Same fields, same validation, same JSX shape as `ContactCard.tsx`'s existing
quick-contact form (`components/property/ContactCard.tsx:202-246`) — literally
reuse that markup pattern (input classes, error `<p>` under each field,
honeypot `<input>` block). Prefill from `currentUser` via `defaultValues`:

```tsx
useForm<TourRequestInput>({
  resolver: zodResolver(tourRequestSchema),
  defaultValues: {
    propertyId,
    tourType: 'in_person',
    name: currentUser?.name ?? '',
    phone: currentUser?.phone ?? '',
  },
})
```

Guests (`currentUser === null`) see empty, required `name`/`phone` fields —
same required-ness as logged-in users, just not prefilled. Message field:
`optional, max 300` (not the page-spec's 300 as "note" — keep the field named
`note` in the schema for continuity with the page-spec's contract, but label
it "Message to owner (optional)" in the UI to match this task's wording).

---

## 5. Data model — `supabase/migrations/0009_tours.sql`

```sql
-- ─────────────────────────────────────────────────────────────────────────
-- Migration 0009_tours.sql
-- Page 27 — Schedule a Tour (MVP scope — see docs/design/27-schedule-tour-handoff.md §1).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tours (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for guest requesters
  tour_type      TEXT        NOT NULL CHECK (tour_type IN ('in_person', 'video')),
  requested_at   TIMESTAMPTZ NOT NULL,
  name           TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  note           TEXT,
  -- Single value in MVP (no confirm/decline/counter-propose workflow — see
  -- handoff §1 C4). Extend this CHECK the same way 0007_notifications_phase1.sql
  -- extended notifications_type_check, if/when that workflow ships.
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status = 'pending'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Requester can read their own tour requests (logged-in requesters only —
-- guests have no auth.uid() and can't read anything back, by design).
CREATE POLICY "tours: requester can select own"
  ON tours FOR SELECT
  USING (auth.uid() = requester_id);

-- Listing owner/agent can read requests made against their own listings.
CREATE POLICY "tours: owner can select own listings requests"
  ON tours FOR SELECT
  USING (auth.uid() = owner_id);

-- Defense-in-depth INSERT policy for any future user-scoped client path
-- (today's POST /api/tours always inserts via the service-role admin client,
-- per §6, precisely because guest rows have requester_id = NULL and no
-- auth.uid() to check) — same rationale as notifications' own INSERT policy
-- in 0007_notifications_phase1.sql.
CREATE POLICY "tours: requester can insert own"
  ON tours FOR INSERT
  WITH CHECK (auth.uid() = requester_id OR requester_id IS NULL);

CREATE INDEX IF NOT EXISTS tours_owner_created_idx
  ON tours (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tours_requester_idx
  ON tours (requester_id)
  WHERE requester_id IS NOT NULL;

-- "Already requested" de-dup (states table in the ticket's acceptance
-- criteria): one pending request per (property, requester) for logged-in
-- users, one pending request per (property, phone) for guests. The route
-- (§6) catches the resulting unique_violation (23505) and returns 409.
CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_user
  ON tours (property_id, requester_id)
  WHERE requester_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_guest_phone
  ON tours (property_id, phone)
  WHERE requester_id IS NULL AND status = 'pending';

-- Extend the existing notifications type CHECK (same pattern as
-- 0007_notifications_phase1.sql) to allow the new producer this task adds.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'message',
      'price_drop',
      'saved_search_match',
      'listing_approved',
      'listing_rejected',
      'listing_expiring',
      'new_review',
      'tour_requested'
    ));
```

`types/database.ts`: add a `tours` block mirroring `agent_leads`'s exact shape
(`types/database.ts:647-711`) — `Row`/`Insert`/`Update`/`Relationships`,
`requester_id` and `note` nullable, `status: 'pending'` as the literal type.

---

## 6. `POST /api/tours`

Mirrors `app/api/agent-leads/route.ts` structurally, with two differences:
auth is optional (guests allowed, C7), and the property's owner is looked up
server-side rather than trusted from the client (same as
`handlePropertyConversation` in `app/api/conversations/route.ts:240-253` does
for `owner_id` — never trust a client-supplied owner id).

```
201 { id: string }
400 invalid_json | property_inactive
404 not_found                          (unknown/deleted property)
409 already_requested                  (unique index hit, §5)
422 validation_error { fields }        (zod)
429 rate_limited
500 server_error
```

Logic outline:

1. Parse body; on JSON parse failure → 400 `invalid_json`.
2. `tourRequestSchema.parse(body)`; on `ZodError` → 422 `validation_error`
   with `err.flatten().fieldErrors` (exact shape `agent-leads` returns).
3. Honeypot (`input.website`): if non-empty, return `201 { id: 'discarded' }`
   **without** touching the database — identical bot-fooling behavior to
   `app/api/agent-leads/route.ts:38-41`.
4. `createServerClient()`, `auth.getUser()` — **do not** reject when
   `user` is `null`; this is the one endpoint in this codebase that allows an
   anonymous caller through past this point (document that inline with a
   comment, since every other POST route in `app/api` requires auth — a
   reviewer should not "fix" this back to a 401).
5. Rate limit key: `user ? \`tour:user:${user.id}\` : \`tour:ip:${request.headers.get('x-forwarded-for') ?? 'unknown'}\``,
   using a new `LIMITS.TOUR_REQUEST` preset (§8). On limit hit → 429
   `rate_limited`.
6. Look up the property server-side: `supabase.from('properties').select('id, owner_id, status').eq('id', input.propertyId).single()`.
   Missing → 404 `not_found`. `status` not in `('active', 'pending')` → 400
   `property_inactive`.
7. Insert via the **admin client** (`lib/supabase/admin.ts`'s
   `createAdminClient()`), not the user-scoped client — required because
   guest rows need `requester_id = NULL`, which the RLS INSERT policy in §5
   allows but only from a service-role context is it safe to also accept
   logged-in users' rows through the same code path without re-deriving two
   insert branches:
   ```ts
   const insertResult = await adminSupabase.from('tours').insert({
     property_id: input.propertyId,
     owner_id: property.owner_id,
     requester_id: user?.id ?? null,
     tour_type: input.tourType,
     requested_at: input.requestedAt,
     name: input.name,
     phone: input.phone,
     note: input.note ?? null,
   }).select('id').single()
   ```
   On a unique-violation error (`insertResult.error.code === '23505'`) → 409
   `already_requested`. Any other insert error → 500 `server_error`.
8. On success, create the owner notification (§9) via the same admin client,
   **best-effort** — if the notification insert fails, still return 201 (the
   tour row is the source of truth; log nothing to console per this
   codebase's no-`console.log` rule, just don't let a notification failure
   fail the whole request).
9. Return `201 { id: row.id }`.

---

## 7. Validation — `lib/tours/schemas.ts`

```ts
import { z } from 'zod'

/** Accepts a generic E.164 phone number (matches lib/property/schemas.ts). */
const E164_PHONE = /^\+[1-9]\d{6,14}$/

export const TOUR_TYPES = ['in_person', 'video'] as const
export type TourType = (typeof TOUR_TYPES)[number]

/** Min lead time before a request can be booked (page-spec §5's own rule). */
export const MIN_LEAD_MS = 60 * 60 * 1000 // 1 hour
/** Near-term booking window (MVP substitute for a real availability calendar — see handoff §1 C2). */
export const MAX_LEAD_DAYS = 14

export const tourRequestSchema = z
  .object({
    propertyId: z.string().uuid('propertyId must be a UUID'),
    tourType: z.enum(TOUR_TYPES),
    requestedAt: z.string().datetime({ offset: true }),
    name: z.string().min(2, 'Name is required').max(50),
    phone: z.string().regex(E164_PHONE, 'Invalid phone number'),
    note: z.string().max(300).optional(),
    /** Honeypot — must stay empty to pass the spam filter. */
    website: z.string().max(0, 'Spam detected').optional(),
  })
  .refine(
    (v) => {
      const t = new Date(v.requestedAt).getTime()
      if (Number.isNaN(t)) return false
      const now = Date.now()
      return t >= now + MIN_LEAD_MS && t <= now + MAX_LEAD_DAYS * 24 * 60 * 60 * 1000
    },
    { message: 'Requested time must be between 1 hour and 14 days from now', path: ['requestedAt'] },
  )

export type TourRequestInput = z.infer<typeof tourRequestSchema>
```

Note for `__tests__/tourSchema.test.ts`: the `.refine()` uses `Date.now()`, so
tests need `vi.setSystemTime(...)` / `vi.useFakeTimers()` around any case that
exercises the lead-time boundary, rather than computing `requestedAt` once at
module load — mirror whatever this suite already does for other
time-sensitive schemas (check `__tests__/` for an existing
`vi.setSystemTime` usage before inventing a new pattern; if none exists yet,
this is a fine place to introduce it cleanly, scoped with `beforeEach`/`afterEach`).

`lib/tours/helpers.ts` (pure, unit-testable, no fetch/DOM — same rule as
`lib/notifications/helpers.ts`):

```ts
export function buildDateOptions(now: Date, days = 14): { date: string; label: string }[]
export function buildTimeSlots(selectedDate: string, now: Date): { time: string; disabled: boolean }[]
export function buildRequestedAtIso(date: string, time: string): string // combines using the *browser's* local offset when called client-side
```

---

## 8. Rate limiting — `lib/auth/rateLimit.ts`

Add one preset, same shape/placement as `AGENT_LEAD`:

```ts
/** 5 tour requests per hour per user, or per IP for guests (docs/design/27-schedule-tour-handoff.md §6) */
TOUR_REQUEST: { max: 5, windowMs: 60 * 60 * 1000 },
```

No new infra — reuse `checkRateLimit` as-is (in-memory, per-instance, already
documented as "sufficient for Phase 1" at the top of that file).

---

## 9. Notification integration

Owner-only notification (requesters — including guests — are not notified in
MVP; there's no "My Tours" surface for them to read a confirmation from, per
C5). Payload carries everything the owner needs to act (call/message the
requester directly), since there is no in-app reply flow in MVP.

**`lib/notifications/types.ts`**
```ts
export type NotificationType =
  | 'message'
  | 'price_drop'
  | 'saved_search_match'
  | 'listing_approved'
  | 'listing_rejected'
  | 'listing_expiring'
  | 'new_review'
  | 'tour_requested'                 // NEW

export interface NotificationPayload {
  // ...existing fields unchanged...
  requestedAt?: string               // NEW — ISO datetime of the requested tour
  tourType?: 'in_person' | 'video'   // NEW
  // `name` and `title` (property title) are already fields on this interface — reuse them
}
```

**`lib/notifications/helpers.ts`**
- `KNOWN_TYPES`: append `'tour_requested'`.
- `toPayload()`: append `requestedAt`/`tourType` string reads, same
  `typeof record.x === 'string'` guard style as the existing fields.
- `notificationText()`: add a case —
  ```ts
  case 'tour_requested':
    return `${p.name ?? 'Someone'} requested a tour of "${p.title ?? 'your listing'}"`
  ```
- `NOTIFICATION_ICON`: add `tour_requested: { emoji: '📅', bg: 'bg-teal-50' }`
  (next unused color in the existing palette — every other entry uses a
  distinct `*-50` background).

**`lib/notifications/navigation.ts`**
- `notificationHref`: add `case 'tour_requested': return p.propertyId ? \`/property/${p.propertyId}\` : null` — routes the owner to the listing itself (no dedicated tour-detail page in MVP, C5).
- `resolveNotificationTarget`: add `'tour_requested'` to the `isPropertyTarget`
  boolean so the existing stale-target existence check covers it for free.

**Route-side insert** (in `POST /api/tours`, step 8 of §6):
```ts
await adminSupabase.from('notifications').insert({
  user_id: property.owner_id,
  type: 'tour_requested',
  title: 'Tour requested',
  body: `${input.name} requested a ${input.tourType === 'video' ? 'video' : 'in-person'} tour`,
  metadata: {
    propertyId: input.propertyId,
    name: input.name,
    requestedAt: input.requestedAt,
    tourType: input.tourType,
  },
})
```
This satisfies the acceptance criterion end-to-end: the owner sees a new row
in the header bell dropdown and on `/notifications` (existing surfaces, zero
new UI), clicking it navigates to the property, and the row text/icon render
correctly through the existing `NotificationRow`/`TypeIcon` components once
the type/helper edits above land.

---

## 10. States

| State | UI |
|---|---|
| Idle / form | As in §4. |
| **Submitting** | Submit button shows `Loader2` spinner + `disabled`, exact pattern as `RequestLeadModal.tsx`'s `isSubmitting`. |
| **Success** | Modal closes (`onSent`); parent shows the inline `role="status"` green banner (§3.1) **and** a bottom-center toast reusing `FavoritesGrid.tsx:309-321`'s shell verbatim (`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ... bg-gray-900 text-white`, success tone), text: "Tour requested — the owner will confirm soon." Auto-dismiss ~4s. |
| **Already requested (409)** | Modal stays open; form area is replaced by an info block (not red — this isn't an error): `bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700 text-center`, text "You already have a pending tour request for this property. The owner will be in touch." + a `[Close]` button. |
| **Rate limited (429)** | Inline `role="alert"` text below the submit button, same as `RequestLeadModal.tsx:64`: "Too many requests — please try again later." |
| **Property inactive (400 `property_inactive`)** | Same inline `role="alert"` slot: "This property is no longer available." (Should rarely trigger — the trigger button is already `disabled` when `!isAvailable`, §3.1/§3.2 — this is the server-side backstop for the race where status changes between page load and submit.) |
| **Validation error (422)** | Per-field errors under each input, same as every other form in this codebase (`errors.name?.message` etc.). |
| **Generic error (500 / network)** | Same inline `role="alert"` slot: "Something went wrong, please try again." (verbatim `RequestLeadModal.tsx:67` copy). |

---

## 11. Accessibility

Reuse `RequestLeadModal.tsx`'s dialog implementation exactly (it already
satisfies the page-spec's §7 requirements for a bottom-sheet/dialog: focus
management is minimal today — bring it in line with `DeleteConfirmModal.tsx`'s
slightly more complete version, which additionally auto-focuses on mount and
closes on `Escape` via a `keydown` listener; port that same `useEffect` pair
into `ScheduleTourModal` since booking is a more consequential action than
the delete-confirm's own use case). Additional MVP-specific requirements:

- Tour-type chips: `role="radiogroup"` on the fieldset, each `<label>`/hidden
  `<input type="radio">` pair — native radio semantics, no custom
  `aria-checked` needed.
- Date strip: each day is a `<button type="button">` with
  `aria-label="{Weekday}, {Month} {Day}"` and `aria-pressed` for the selected
  day (no `aria-disabled` days exist in MVP, C2).
- Time slots: `role="listbox"` wrapper, `role="option"` + `aria-selected` per
  slot button; past-today slots get `aria-disabled="true"` and a
  visually-hidden "Unavailable" span (matches page-spec §7's requirement,
  which still applies even though MVP's only "unavailable" reason is
  min-lead-time, not owner busy-state).
- Contrast/touch targets: all new interactive elements reuse existing
  Tailwind tokens already contrast-checked elsewhere in this file tree
  (`bg-primary`/`text-white`, `border-gray-300`/`text-gray-700`) — no new
  colors besides the `bg-teal-50` notification icon background in §9, which
  only needs to satisfy the icon-on-background pairing rule already validated
  for the other six types in `docs/design/22-notifications-handoff.md` §8
  (teal-600-on-teal-50 is the same contrast class as the existing amber/green/
  purple pairs — verify in-browser during review regardless).

---

## 12. Test plan

Four new files, each mirroring an exact existing precedent — don't invent new
test infrastructure:

1. **`__tests__/tourSchema.test.ts`** — mirrors `__tests__/agentLeadSchema.test.ts`.
   Cover: valid payload passes; missing `name`/`phone`/`tourType`/`propertyId`
   each fail with the right field; honeypot (`website` non-empty) fails;
   `requestedAt` below `MIN_LEAD_MS` fails; `requestedAt` beyond
   `MAX_LEAD_DAYS` fails; a mid-window `requestedAt` passes. Use
   `vi.setSystemTime` to pin "now" for the boundary cases (§7 note).
2. **`__tests__/toursRoute.test.ts`** — mirrors `__tests__/agentLeadsRoute.test.ts`'s
   mock-Supabase-client harness. Cover: 422 on bad body; 201 + `{ id }` on a
   valid **guest** submission (`getUser` resolves `{ user: null }` — assert
   this does *not* 401, unlike every other route this harness pattern is
   normally used to test); 201 on a valid **logged-in** submission;
   404 when the property doesn't exist; 400 `property_inactive` when
   `status` isn't active/pending; 409 `already_requested` when the insert
   mock returns a `code: '23505'` error; 429 after `LIMITS.TOUR_REQUEST.max`
   calls from the same key within the window (same assertion shape as
   `agentLeadsRoute.test.ts`'s own 429 case).
3. **`__tests__/toursMigration.test.ts`** — mirrors `__tests__/messagesMigration.test.ts`'s
   static SQL-text assertions (this codebase's documented stand-in for "no
   live Supabase instance in CI to exercise RLS against" — see that file's
   own header comment). Assert: `ALTER TABLE tours ENABLE ROW LEVEL SECURITY`
   present; the requester-select policy's `USING` clause contains
   `auth.uid() = requester_id`; the owner-select policy's `USING` clause
   contains `auth.uid() = owner_id`; **no** policy grants an unqualified
   `USING (true)` read; the two partial unique indexes exist (regex on
   `CREATE UNIQUE INDEX ... tours_one_pending_per_user` /
   `..._per_guest_phone`); `notifications_type_check` includes
   `'tour_requested'`. Include the same "manual verification checklist"
   doc-comment block `messagesMigration.test.ts` uses, adapted: "As user A
   (owner of property X), `select * from tours` — only rows where A is
   `owner_id` or `requester_id` should return."
4. **`__tests__/toursHelpers.test.ts`** — `buildDateOptions` returns exactly
   `days` entries starting at `now`'s date; `buildTimeSlots` marks
   pre-lead-time slots `disabled: true` only when `selectedDate` is today's
   date, never on future dates; `buildRequestedAtIso` round-trips through
   `new Date(...)` back to the same date/time components.

All four run under the existing `npm test` (Vitest) — no new test runner or
config. `npm run lint` and `npm run build` must stay clean (no `any`, no
`console.log`, Server Component boundary respected — `ScheduleTourModal.tsx`
is the only new/edited file that needs `'use client'`; `page.tsx`,
`route.ts`, `schemas.ts`, `helpers.ts`, and the migration are all
server-side/isomorphic).

---

## 13. Developer handoff checklist

Design-complete; the following is out of this document's scope (Designer
role) and belongs to implementation:

- [ ] `supabase/migrations/0009_tours.sql` per §5, applied and `types/database.ts` updated to match.
- [ ] `lib/tours/schemas.ts` + `lib/tours/helpers.ts` per §7.
- [ ] `lib/auth/rateLimit.ts`: add `LIMITS.TOUR_REQUEST` per §8.
- [ ] `app/api/tours/route.ts` per §6 (guest-allowed, server-side owner lookup, admin-client insert, honeypot, rate limit, 409 dedup, best-effort notification).
- [ ] `lib/notifications/{types,helpers,navigation}.ts` edits per §9.
- [ ] `components/property/ScheduleTourModal.tsx` (new, client) per §4.
- [ ] `components/property/ContactCard.tsx` edit per §3.1 (+ new `isAvailable`/`currentUser` props).
- [ ] `components/property/MobileBottomBar.tsx` edit per §3.2 (+ new `currentUser` prop; Call button becomes icon-only — verify at 360px per the manual QA note).
- [ ] `app/[locale]/property/[id]/[slug]/page.tsx` edit per §3.3 (guarded session fetch; thread `currentUser` + `isAvailable` to both children) — **no other change to this file**.
- [ ] Four test files per §12.
- [ ] No service-role key (`createAdminClient`) imported anywhere under `components/` or other client-rendered modules — it's used only inside `app/api/tours/route.ts`.
- [ ] `npm run lint`, `npm test`, `npm run build` all green before merge.
