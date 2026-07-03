# Page 27 — Schedule a Tour / Request a Viewing 🟡 Phase 2

> **Spec depth level.** Deep (v1) — follows the `03-property.md` gold standard structure. Includes: overview, scenarios, layout/sizes/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data, API), responsive, accessibility, SEO, analytics.

**URL.**
- Inline widget embedded on `/property/[id]/[slug]` (main entry point)
- Standalone confirmation: `/tours/[token]/confirmed`
- User tour list: `/tours` (sub-section of `/dashboard`)

**Roles.** Guest (read-only calendar, must log in to confirm) · User · Agent · Admin  
**Primary goal (conversion).** Let a prospective buyer or renter **book a confirmed in-person, video, or self-guided viewing** of a specific property with zero phone calls, and notify the owner/agent instantly.

---

## 0. Overview

Every major international real-estate portal now offers frictionless tour scheduling directly on the listing page. Zillow integrated **ShowingTime** instant-booking (calendar-style time-slot picker, [Zillow instant tour FAQ](https://zillow.zendesk.com/hc/en-us/articles/47519663140883-Instant-tour-scheduling-FAQ-for-landlords)); Redfin launched **"Book It Now"** for on-demand in-person tours and a separate **Open House Schedule** page where users collect multiple open houses into a personal calendar ([Redfin Book It Now](https://www.redfin.com/news/redfin-book-it-now/), [Redfin Open House Schedule](https://support.redfin.com/hc/en-us/articles/360001432252-Open-House-Schedule)); Idealista offers a "Contactar / Solicitar visita" flow built into every listing.

In the Armenian/Yerevan context, in-person property viewings are nearly universal before any transaction — buyers and renters routinely call agents, which creates friction and lost leads. Local competitors (estate.am, bnakaran.com, myrealty.am) currently have no online scheduling; offering a structured booking flow is a significant differentiator ([estate.am](https://www.estate.am/en), [bnakaran.com](https://www.bnakaran.com/en)).

This page documents:
1. The **Schedule-a-Tour widget** embedded on the property detail page (Page 03).
2. The **standalone confirmation page** the requester sees after booking.
3. The **My Tours** list in the user dashboard (Page 06 sub-section).

The scheduling widget supports **three tour modes**: in-person, live video call (WhatsApp / Zoom link generated), and self-guided (for developments with a lockbox code). Mode availability is set by the property owner/agent when creating the listing (Phase 2 listing wizard extension).

---

## 1. User scenarios

**Scenario A — Renter Ani (mobile, guest → User).** Ani finds a 2-bedroom apartment in Arabkir on the search map. She opens the property detail page and taps **[Schedule a Tour]** in the sticky bottom bar. A bottom sheet opens with a date-picker, time slots for the next 7 days, and tour-type chips (📍 In-person · 📹 Video). She selects Thursday at 14:00, picks In-person — a login modal appears ("Sign in to confirm your tour"). She registers in 30 seconds (Google OAuth). The tour request is submitted → she sees the confirmation screen "Tour requested — Thursday, 14:00, Arabkir" and receives an email. The seller receives a notification and has 24 h to accept or propose an alternative time.

**Scenario B — Buyer Aram (desktop, logged-in).** Aram has been watching a house in Kanaker. He scrolls to the **"Schedule a Tour"** section mid-page, sees that Saturday 11:00 is available (green slot), clicks it, selects "In-person", leaves a note "Please also show the parking area", and clicks **[Request Tour]**. He is already logged in → instant confirmation toast + email.

**Scenario C — Open-house visitor Meline (mobile).** The listing has an upcoming open-house event (set by the agent — "Saturday 12:00–15:00, come without prior appointment"). Meline taps **[Save Open House →]** from the property card. The event is added to her `/tours` calendar. She gets a reminder push notification 1 hour before the event.

**Scenario D — Agent Gevorg (owner side).** Gevorg receives a push + email: "Aram has requested a tour for Saturday at 11:00". He opens `/dashboard/tours`, sees the request with Aram's name, phone (masked), and note. He taps **[Confirm]** → Aram gets an email/push "Tour confirmed — Saturday 11:00. Address: …". Alternatively, Gevorg taps **[Propose another time]** → picks Sunday 10:00 → Aram gets a counter-proposal notification.

---

## 2. Layout & visual structure

### 2.1 Tour Widget (embedded in Property Detail — desktop ≥1024px)

```
┌─────────────────────────────────────────────────────┐
│  📅  Schedule a Tour                                 │
│ ┌──────── Tour type ──────────────────────────────┐ │
│ │ [📍 In-person ●]  [📹 Video]  [🚪 Self-guided]  │ │
│ └────────────────────────────────────────────────┘ │
│ ┌──────── Date picker (7-day strip) ─────────────┐ │
│ │ Mo 30  Tu 1  We 2  [Th 3]  Fr 4  Sa 5  Su 6   │ │
│ │         (today)   (selected)                   │ │
│ └────────────────────────────────────────────────┘ │
│ ┌──────── Time slots ────────────────────────────┐ │
│ │ [09:00] [10:00] [11:00] [14:00●] [15:00] …    │ │
│ │  (filled/busy slots shown dimmed, unavailable) │ │
│ └────────────────────────────────────────────────┘ │
│ ┌──────── Note (optional) ───────────────────────┐ │
│ │ Message to owner (max 300 chars)               │ │
│ └────────────────────────────────────────────────┘ │
│  [Request Tour]  (primary, full-width)              │
│  🔒 Guest: "Sign in to confirm"                     │
│  Already have a tour?  [View my tours →]            │
└─────────────────────────────────────────────────────┘
```

The widget sits in the **right-side sticky column** of the property detail page (`/property/[id]`) at the same level as the contact card, or just below it on pages without an agent sidebar.

### 2.2 Open-house banner (on property detail)

```
┌────────────────────────────────────────────────┐
│ 🚪 Open House — Saturday 3 July · 12:00–15:00  │
│ No appointment needed · Come and see            │
│                [Save to My Calendar →]          │
└────────────────────────────────────────────────┘
```

Displayed only when the listing has an `open_house_events` record with `starts_at` in the future.

### 2.3 Mobile (<768px) — bottom sheet

On mobile the widget collapses into a **sticky bottom bar** on the property detail page:

```
┌───────────────────────────────────────────────┐
│ [💬 Contact]            [📅 Schedule a Tour]  │  ← sticky footer bar
└───────────────────────────────────────────────┘
```

Tapping **[📅 Schedule a Tour]** opens a **bottom sheet** (`fixed bottom-0`, `rounded-t-2xl`, slide-up animation):

```
┌──────────────────────────────────┐
│ ▬                                │ ← drag handle
│ 📅 Schedule a Tour               │
│ [In-person][Video][Self-guided]  │
│ ← Mo Tu We Th Fr Sa Su →        │
│ [09:00][10:00][11:00][14:00]…   │
│ Note: ______________________     │
│ [Request Tour]                   │
└──────────────────────────────────┘
```

### 2.4 Confirmation page (`/tours/[token]/confirmed`)

```
┌────────────────────────────────────────┐
│  ✅  Tour requested!                   │
│                                        │
│  Property: Apt. Arabkir, 75m²          │
│  Date: Thursday, 3 July · 14:00        │
│  Type: In-person                       │
│  Status: ⏳ Pending owner confirmation  │
│                                        │
│  [Add to Google Calendar]              │
│  [Add to Apple Calendar]               │
│                                        │
│  We'll email you when the owner        │
│  confirms. Expect a reply within 24h.  │
│                                        │
│  [Back to listing]  [View My Tours →]  │
└────────────────────────────────────────┘
```

### 2.5 My Tours list (`/tours` or `/dashboard?tab=tours`)

```
┌────────────────────────────────────────────────────┐
│ My Tours                              [Upcoming ▾] │
├────────────────────────────────────────────────────┤
│ 🖼  Apt. Arabkir · Thu 3 Jul 14:00  ⏳ Pending     │
│     📍 In-person  [Cancel] [Message owner]         │
├────────────────────────────────────────────────────┤
│ 🖼  House Kanaker · Sat 5 Jul 11:00  ✅ Confirmed  │
│     📍 In-person  [Add to Calendar] [Get directions]│
├────────────────────────────────────────────────────┤
│ 🚪 Open House · Apt. Kentron · Sat 5 Jul 12-15:00 │
│     No appointment · [Remove from calendar]        │
└────────────────────────────────────────────────────┘
```

### Design tokens

| Element | Tailwind / value |
|---------|-----------------|
| Widget container | `bg-white border border-gray-200 rounded-2xl p-5 shadow-sm` |
| Tour-type chip (active) | `bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium` |
| Tour-type chip (inactive) | `border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm hover:border-primary` |
| Date strip day (selected) | `bg-primary text-white rounded-xl w-12 h-14 flex flex-col items-center justify-center` |
| Date strip day (default) | `border border-gray-200 text-gray-700 rounded-xl w-12 h-14 hover:border-primary cursor-pointer` |
| Date strip day (disabled) | `bg-gray-50 text-gray-300 rounded-xl w-12 h-14 cursor-not-allowed` |
| Time slot (available) | `border border-gray-300 rounded-lg px-3 py-2 text-sm hover:border-primary cursor-pointer` |
| Time slot (selected) | `bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium` |
| Time slot (busy) | `bg-gray-100 text-gray-400 rounded-lg px-3 py-2 text-sm cursor-not-allowed line-through` |
| Note textarea | `w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-20 focus:ring-2 focus:ring-primary` |
| [Request Tour] button | `w-full bg-primary text-white rounded-xl h-12 font-medium hover:bg-primary/90` |
| Bottom sheet | `fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 p-5` |
| Status badge pending | `bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs` |
| Status badge confirmed | `bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs` |
| Status badge cancelled | `bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs` |
| Open-house banner | `bg-blue-50 border border-blue-200 rounded-xl p-4` |

---

## 3. Section-by-section

### 3.1 Tour type selector

Three chips (shown only for types the owner has enabled on this listing):

| Type | Icon | Description |
|------|------|-------------|
| **In-person** | 📍 | Meet the owner/agent at the property |
| **Video call** | 📹 | Live walkthrough via WhatsApp / Zoom; link is sent on confirmation |
| **Self-guided** | 🚪 | For new-development show-flats; a door code is sent on confirmation |

Default: **In-person** (always enabled unless explicitly disabled by owner).  
If only one type is available, chips are not shown — the single type is pre-selected.

### 3.2 Date strip (7-day)

- Shows today + next 6 days (scroll-x on mobile for +14-day range).
- **Disabled days:** owner has set non-working days (e.g. Sunday), or the property is `inactive/sold`.
- **Fully booked days:** all slots taken → day chip greyed, tooltip "No slots available this day".
- Navigation arrows on desktop (←/→) to shift the 7-day window by ±7.

### 3.3 Time slots

- Populated after a day is selected, via `GET /api/tours/slots?property_id=&date=`.
- Slots are generated from the owner's **availability schedule** (set in pro-dashboard or listing settings): e.g. Mon–Fri 09:00–18:00 in 1-hour slots.
- Already-booked slots (confirmed or pending) for that day are shown as **busy** (dimmed, not clickable) — privacy: no info about who booked.
- **Instant Book** (if owner enabled it): selecting a slot and clicking [Request Tour] auto-confirms without owner action. **Review & Confirm** (default): request goes pending.
- Default slot duration: **30 minutes** (configurable by owner: 30/45/60 min).

### 3.4 Note field

- Optional free-text message to the owner, max 300 characters.
- Placeholder: "Any questions or requests for the viewing? (optional)".
- Visible to owner in the tour request notification.

### 3.5 [Request Tour] button

- **Guest:** click → login modal ("Sign in to schedule a tour"). After auth → form state preserved, auto-submit.
- **User (logged-in):** click → `POST /api/tours` → redirect to `/tours/[token]/confirmed`.
- **Loading state:** spinner on the button, disabled.
- **Error:** inline error message below the button (e.g. "Slot no longer available — please choose another time").

### 3.6 Open-house banner

Shown above the tour widget when `open_house_events` contains a future event for this property:
- **Title.** "Open House — {day}, {date} · {start_time}–{end_time}"
- **Subtitle.** "No appointment needed · Come and see"
- **[Save to My Calendar →]** → adds an `open_house` entry to the user's `/tours` list (guest → login). Sends a reminder notification 1 hour before.
- Multiple events: each in its own banner (max 3 shown; if more: "See all {n} open-house dates →").

### 3.7 Confirmation page (`/tours/[token]/confirmed`)

- Shows: property thumbnail + address, selected date/time, tour type, status badge.
- **[Add to Google Calendar]** / **[Add to Apple Calendar]** (`.ics` download) — always shown.
- **[Get directions]** (Google Maps link to the property address) — shown when confirmed.
- **[Back to listing]** + **[View My Tours →]**.
- If status is `pending`: "The owner usually confirms within 24 hours."
- If status is `confirmed` (instant-book): "Your tour is confirmed! See you {date} at {time}."

### 3.8 My Tours list (`/tours`)

- Tabs: **Upcoming** / **Past** / **Open Houses**.
- Each row: property thumbnail → click opens `/property/[id]`; date/time; tour type icon; status badge.
- **Actions per status:**
  - `pending` → [Cancel] · [Message owner] (→ `/messages`)
  - `confirmed` → [Add to Calendar] · [Get directions] · [Cancel]
  - `counter_proposed` → [Accept new time] · [Decline] · [Propose another]
  - `cancelled` → [Rebook] (re-opens the widget)
  - `completed` → [Leave a review] (agent review, → Page 10)
- **Empty state.** "No upcoming tours. Browse properties and schedule a viewing." + [Search properties →].

### 3.9 Owner/Agent side (in Pro Dashboard — Page 18)

This widget has a mirrored **owner view** in the Pro Dashboard (`/pro/dashboard?tab=tours`):
- List of incoming tour requests with requester name + masked phone.
- Actions: [Confirm] / [Decline] / [Propose another time] / [Mark as Completed].
- **Availability settings:** set working days/hours and slot duration (saved to `agent_availability` table).
- **Instant Book toggle:** if on, confirmed without manual review.

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------|
| **Widget loading** | Skeleton date strip + slot grid shimmer |
| **Day not selected** | Time slot grid hidden; prompt "Select a date above" |
| **Day selected, slots loading** | Slot grid shimmer |
| **Slots available** | Clickable time slot chips |
| **All slots busy** | Day chip greyed; "No availability — try another day" |
| **Slot selected** | Chip highlighted primary; [Request Tour] active |
| **Guest — click Request Tour** | Login modal (form state preserved after auth) |
| **Submitting** | Button spinner + disabled |
| **Success (pending)** | Redirect to `/tours/[token]/confirmed` · pending badge |
| **Success (instant-book)** | Redirect to `/tours/[token]/confirmed` · confirmed badge |
| **Slot taken (race condition)** | Inline error "Slot just became unavailable — choose another" |
| **Property sold/inactive** | Widget replaced with "This property is no longer available" banner |
| **My Tours empty** | Illustration + "No upcoming tours" + [Search properties] |
| **My Tours loading** | Row skeletons |
| **Counter-proposal received** | Row status badge `counter_proposed` + [Accept]/[Decline] |
| **Open-house saved** | Banner button changes to "✓ Saved" + toast |

---

## 5. Technical depth

### Component tree

```
<PropertyDetailPage>            (existing Page 03)
 └─ <TourSchedulerWidget propertyId availability openHouseEvents />   (client)
     ├─ <TourTypeSelector types enabled onSelect />
     ├─ <DateStrip availableDays onSelect />
     ├─ <TimeSlotGrid slots isLoading onSelect />
     ├─ <TourNoteInput value onChange />
     ├─ <RequestTourButton isLoggedIn isLoading onSubmit />
     ├─ <OpenHouseBanner events onSave />                              (conditional)
     └─ <LoginGateModal open onClose onAuth />                        (lazy)

<TourConfirmedPage token />                                           (Server Component)
 ├─ <TourStatusCard tour property />
 ├─ <CalendarExportButtons icsUrl googleUrl />
 └─ <DirectionsLink address />

<ToursListPage userId />                                              (Server + Client tabs)
 ├─ <ToursTabs upcoming past openHouses />                            (client)
 └─ <TourRow tour onCancel onRebook onAcceptCounter />                (client, ×N)
```

### Data model extensions

```sql
-- New table
tour_requests
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   int  REFERENCES properties(id) ON DELETE CASCADE,
  requester_id  uuid REFERENCES users(id),
  owner_id      uuid REFERENCES users(id),
  tour_type     text CHECK (tour_type IN ('in_person','video','self_guided')),
  requested_at  timestamptz NOT NULL,           -- the chosen date+time slot
  duration_min  int  DEFAULT 30,
  note          text,
  status        text DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','declined',
                                    'counter_proposed','cancelled','completed')),
  counter_at    timestamptz,                    -- owner counter-proposal time
  token         uuid DEFAULT gen_random_uuid() UNIQUE, -- for confirmation URL
  created_at    timestamptz DEFAULT now()

open_house_events
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   int  REFERENCES properties(id) ON DELETE CASCADE,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  notes         text,
  created_at    timestamptz DEFAULT now()

agent_availability                              -- owner scheduling config
  owner_id      uuid REFERENCES users(id) PRIMARY KEY,
  working_days  int[]  DEFAULT '{1,2,3,4,5}',  -- 0=Sun … 6=Sat
  start_hour    int    DEFAULT 9,
  end_hour      int    DEFAULT 18,
  slot_min      int    DEFAULT 30,
  instant_book  bool   DEFAULT false
```

### API contracts

**`GET /api/tours/slots?property_id={id}&date={YYYY-MM-DD}`**
```jsonc
// 200 OK
{
  "date": "2026-07-03",
  "slots": [
    { "time": "09:00", "available": true  },
    { "time": "10:00", "available": false },   // already booked
    { "time": "11:00", "available": true  },
    { "time": "14:00", "available": true  }
  ],
  "instantBook": false
}
// 404 { "error": "property_not_found" }
// 400 { "error": "date_in_past" }
```

**`POST /api/tours`** (auth required)
```jsonc
// Request
{
  "propertyId": 8423,
  "tourType": "in_person",
  "requestedAt": "2026-07-03T14:00:00+04:00",
  "note": "Please show the parking area"
}
// 201 Created
{
  "id": "tour-uuid",
  "token": "confirm-token-uuid",
  "status": "pending",   // or "confirmed" if instantBook=true
  "requestedAt": "2026-07-03T14:00:00+04:00",
  "confirmUrl": "/tours/confirm-token-uuid/confirmed"
}
// 409 { "error": "slot_taken" }         → slot was just booked by someone else
// 400 { "error": "property_inactive" }  → listing is no longer active
// 401 → login required
```

**`PATCH /api/tours/[id]`** (owner action)
```jsonc
// Confirm
{ "action": "confirm" }
// Counter-propose
{ "action": "counter_propose", "counterAt": "2026-07-05T10:00:00+04:00" }
// Decline
{ "action": "decline" }
// 200 OK { "status": "confirmed" | "counter_proposed" | "declined" }
```

**`GET /api/tours?userId={id}&status=upcoming`** → paginated list for My Tours view.

**`POST /api/open-house/save`** (auth required) — saves an open-house event to user's calendar.

### Validation (zod)

```ts
const requestTourSchema = z.object({
  propertyId: z.number().int().positive(),
  tourType: z.enum(["in_person", "video", "self_guided"]),
  requestedAt: z.string().datetime({ offset: true }),   // ISO 8601 with timezone
  note: z.string().max(300).optional(),
});
// Client-side: also validate requestedAt > now() + 1 hour (min lead time)
```

### Notifications triggered

| Event | Recipient | Channel |
|-------|-----------|---------|
| Tour requested | Owner/Agent | Push + Email |
| Tour confirmed | Requester | Push + Email |
| Tour declined | Requester | Push + Email |
| Counter-proposal | Requester | Push + Email |
| Counter accepted | Owner | Push |
| 24 h reminder | Requester | Push + Email |
| 1 h reminder (open house) | Saved attendees | Push |
| Tour cancelled (by user) | Owner | Push + Email |

All notifications use the existing `notifications` table (Page 22) with `type = 'tour_*'` and `payload` containing `tour_id`, `property_id`, `requestedAt`.

---

## 6. Responsive

- **≥1024px (lg).** Tour widget in the right sticky sidebar of the property detail; date strip shows 7 days horizontally; time slots in a 3–4 column grid.
- **768–1023px (md).** Widget still inline (below the gallery, above the map); date strip 5 days + scroll-x; time slots 2-column grid.
- **<768px (sm).** Widget collapsed into the sticky bottom bar; full-screen bottom sheet on tap; date strip scrolls horizontally; time slots in a 2-column grid; note field below slots. My Tours list is a full-width card stack.
- **Keyboard (desktop).** Arrow keys navigate the date strip and time slot grid; Tab moves between sections; Enter selects.

---

## 7. Accessibility

- The tour widget is a `<section aria-labelledby="tour-widget-heading">`.
- Tour-type chips: `role="radiogroup"` / `role="radio"`, `aria-checked`.
- Date strip: each day is a `<button>` with `aria-label="Thursday, 3 July"` and `aria-disabled` for unavailable days; `aria-pressed` for selected.
- Time slots: `role="listbox"` + `role="option"` per slot; `aria-selected`; `aria-disabled` for busy slots.
- Bottom sheet: `role="dialog"`, `aria-modal="true"`, focus-trap on open, `Esc` to dismiss; focus returns to the trigger button on close.
- Busy time slots include a visually-hidden `<span>` "Unavailable" (not only `line-through`).
- Status badges in My Tours: `aria-label="Status: Confirmed"` (not color-only).
- Contrast ≥ 4.5:1 everywhere; touch targets ≥ 44 × 44px.
- `aria-live="polite"` region announces slot availability changes after day selection.

---

## 8. SEO & meta

- The widget itself is embedded in `/property/[id]` — no separate SEO page for the scheduling widget.
- `/tours` (My Tours list): `noindex` (private, user-specific).
- `/tours/[token]/confirmed`: `noindex` (personal confirmation).
- Structured data extension on `/property/[id]`: add `potentialAction` of type `ReserveAction` targeting the tour booking endpoint (supports Google's reservation rich results).
  ```json
  {
    "@type": "ReserveAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.am/hy/property/8423/arabkir-apt#schedule-tour",
      "inLanguage": ["hy", "ru", "en"],
      "actionPlatform": ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"]
    },
    "result": { "@type": "Reservation", "name": "Property tour" }
  }
  ```
- `hreflang` inherited from the parent property detail page.
- Open Graph: no special tags needed beyond the property page's existing OG.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `tour_widget_view` | Widget becomes visible in viewport | `property_id, has_open_house` |
| `tour_type_select` | Tour-type chip click | `property_id, tour_type` |
| `tour_date_select` | Date strip day click | `property_id, date, available_slots_count` |
| `tour_slot_select` | Time slot click | `property_id, date, time, tour_type` |
| `tour_request_submit` | [Request Tour] click (logged-in) | `property_id, tour_type, date, time, has_note` |
| `tour_request_login_gate` | [Request Tour] click (guest) | `property_id` |
| `tour_request_success` | 201 response | `property_id, tour_id, status` |
| `tour_request_error` | Non-2xx response | `property_id, error_code` |
| `tour_confirmed_view` | Confirmation page load | `tour_id, status` |
| `tour_calendar_export` | [Add to Calendar] click | `tour_id, calendar_type` (google/apple) |
| `open_house_save` | [Save to My Calendar] click | `property_id, event_id` |
| `tour_list_view` | `/tours` page load | `tab, count` |
| `tour_cancel` | [Cancel] in My Tours | `tour_id` |
| `tour_rebook` | [Rebook] in My Tours | `tour_id, property_id` |
| `tour_counter_accept` | [Accept new time] in My Tours | `tour_id` |
| `tour_counter_decline` | [Decline] in My Tours | `tour_id` |

---

## Sources

- Zillow Instant Tour Scheduling FAQ: [https://zillow.zendesk.com/hc/en-us/articles/47519663140883-Instant-tour-scheduling-FAQ-for-landlords](https://zillow.zendesk.com/hc/en-us/articles/47519663140883-Instant-tour-scheduling-FAQ-for-landlords)
- Zillow Instant Book (TechCrunch): [https://techcrunch.com/2023/01/24/zillow-introduces-calendly-like-instant-booking-for-rental-property-tours/](https://techcrunch.com/2023/01/24/zillow-introduces-calendly-like-instant-booking-for-rental-property-tours/)
- Redfin "Book It Now": [https://www.redfin.com/news/redfin-book-it-now/](https://www.redfin.com/news/redfin-book-it-now/)
- Redfin Open House Schedule: [https://support.redfin.com/hc/en-us/articles/360001432252-Open-House-Schedule](https://support.redfin.com/hc/en-us/articles/360001432252-Open-House-Schedule)
- Redfin Video Chat Tours: [https://www.redfin.com/guides/live-video-chat-tours](https://www.redfin.com/guides/live-video-chat-tours)
- Estate.am (Armenian competitor — no scheduling feature): [https://www.estate.am/en](https://www.estate.am/en)
- Bnakaran.com (Armenian competitor — no scheduling feature): [https://www.bnakaran.com/en](https://www.bnakaran.com/en)
- Armenia real estate market 2026: [https://annamelkonyan1996.substack.com/p/armenia-real-estate-market-in-2026](https://annamelkonyan1996.substack.com/p/armenia-real-estate-market-in-2026)
