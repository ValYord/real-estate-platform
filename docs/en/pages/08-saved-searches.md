# Page 08 — Saved Searches + Alerts 🟡 Phase 2

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard structure.

**URL.** `/saved-searches` — example: `/hy/saved-searches`
**Roles.** User+ (login required). Guest → login wall (direct) or login modal (when tapping "Save" from the search page).
**Primary goal (retention).** Let the user save their filters once, then **automatically bring them back** to the site via email notification when a new matching property appears. This is a tool for passive re-engagement and long-term retention: the user stops searching, but we keep bringing them relevant offers.

---

## 0. Overview

Search tells the user "what's available now"; a saved search tells them "what will appear tomorrow". On `/search`, the user applies filters (e.g. "2-room apartment in Arabkir up to 100,000 USD") and taps **"Save search"**. We store the filters JSON + the alert frequency, then a scheduled job periodically checks against properties and sends an email when there is a new match.

The page itself is simple: a vertical list of saved searches, each row a card with filter-summary chips, an alert frequency toggle, and actions (open/edit/rename/delete). It is rendered with **SSR**; toggles and CRUD run client-side with React Query. The real complexity is on the **backend**: cron match-detection + Resend digest.

---

## 1. User scenarios

**Scenario A — Tenant Maria.** Maria is searching for an apartment in Arabkir, but few match her budget. From the search toolbar she taps **[💾 Save search]**, keeps the auto-generated name "2 rm · Arabkir · ≤100K$", frequency: Daily. Three days later she gets an email: "3 new properties for your search", taps a card → property page.

**Scenario B — Buyer Aram.** Aram has 4 saved searches. He opens `/saved-searches` and sees a "5 new" badge next to one. He taps **[🔍 Open search]** → `/search` with the saved filters. For another he changes the frequency from Instant to Weekly to get fewer emails.

**Scenario C — Investor David (unsubscribe).** David is no longer searching; from the bottom of an email he taps **[Turn off]** (signed token, no login). The search's frequency becomes Off; no further digest is sent.

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Home › Saved searches            [♡ Favorites]│
│ H1 "Saved searches"  4                                      │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 2 rm · Arabkir · ≤100K$              "3 new"  "⋯"       │ │
│ │ [Sale][Apartment][Yerevan, Arabkir][2 rm][≤100K$]       │ │
│ │ Alert: (Off)(Instant)(Daily◉)(Weekly)   last: 2h        │ │
│ │ [🔍 Open]  [✏️ Edit]  [🗑]                              │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ House · Avan · ≤250K$                "0 new"  "⋯"       │ │
│ │ …                                                       │ │
│ └────────────────────────────────────────────────────────┘ │
│ FOOTER                                                      │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)           │
├──────────────────────────┤
│ ‹ Back  Saved srch. (4)  │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 2 rm · Arabkir  "3"  │ │
│ │ [chip][chip][chip]   │ │
│ │ Alert [Daily ▾]      │ │
│ │ [🔍 Open]       "⋯"  │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ House · Avan    "0"  │ │
│ └──────────────────────┘ │
│ FOOTER                   │
└──────────────────────────┘
```

- Card list: `space-y-4`, each card `shadow-sm border rounded-xl p-4`.
- On mobile the frequency is a dropdown, actions are under a "⋯" menu.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| H1 | `text-2xl font-semibold text-gray-900` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-4` |
| Card title | `text-base font-medium text-gray-900` |
| Filter chip | `bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full` |
| "N new" badge | `bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full` |
| "0 new" badge | `bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full` |
| Frequency segmented | `inline-flex rounded-lg border border-gray-200 p-0.5` |
| Active segment | `bg-primary text-white rounded-md px-3 py-1 text-xs` |
| Inactive segment | `text-gray-600 px-3 py-1 text-xs hover:bg-gray-50` |
| [Open] CTA | `bg-primary text-white h-9 rounded-lg px-4 text-sm font-medium` |
| [Delete] | `text-gray-400 hover:text-red-500` |
| Empty illustration | `w-32 h-32 text-gray-300` (bell) |

---

## 3. Section-by-section

### 3.1 Page header

- **Breadcrumbs.** `Home › Saved searches`.
- **H1.** "Saved searches" + count.
- **Subtitle.** "Get notified when a new property matches your criteria" (`text-gray-500 text-sm`).
- **Cross-link.** **[♡ Favorites]** → `/favorites` (top right).

### 3.2 List of saved searches (anatomy of a card)

Vertical list; each row = card.
- **Name.** User-provided or auto-generated (e.g. "2 rm · Arabkir · ≤100K$").
- **Filter summary (chips).** A human-readable summary of the filters as chips:
  `Sale · Apartment · Yerevan, Arabkir · 2 rooms · 50–80 m² · ≤ 100,000 USD`. Many chips → wrap; the overflow becomes "+2 filters".
- **"N new" badge.** Count of matching listings that appeared since the last visit/notification (`new_match_count`). 0 → gray "0 new".
- **Alert frequency toggle** (see 3.3) + the last check time: "last: 2h ago".
- **Actions row** (see 3.4).

### 3.3 Alert frequency toggle

For each saved search, a segmented control (desktop) / dropdown (mobile).
- **Off** — only saves, no email.
- **Instant** — as soon as there's a new match (batched ~every 15 minutes to avoid spam).
- **Daily** — one digest per day (default: 09:00 in the user's TZ).
- **Weekly** — one digest per week.
- **States.** active segment `bg-primary text-white`; hover inactive `bg-gray-50`; click → optimistic update + `PATCH /api/saved-searches/[id] { alert_frequency }` + toast "Notification updated". Error → rollback.

### 3.4 Actions (on each card)

- **[🔍 Open search]** → `/search?[filters querystring]` (applies the saved filters) + marks the search as "viewed" (reset `new_match_count` → 0).
- **[✏️ Edit filters]** → modal with the same controls as `/search` (filter panel) → **[Save]** = `PATCH { filters }`.
- **[Aa Rename]** → inline edit / modal → `PATCH { name }`.
- **[🗑 Delete]** → confirm → `DELETE /api/saved-searches/[id]` + toast + undo (5 sec).
- **"⋯" menu** (on mobile): the same actions collapsed.

### 3.5 How a saved search is created (from the search page)

- After applying filters on `/search` (`02-search.md`): the toolbar's **[💾 Save search]** button (icon: 🔔).
- Click →
  - **Guest** → login modal (`/auth/login?redirect=/search?...`).
  - **User** → modal: "Name" (prefilled auto-name) + alert frequency choice (default: Daily) → **[Save]** = `POST /api/saved-searches { name, filters, alert_frequency }`.
- Success → toast "Search saved" + **[View saved searches]** → `/saved-searches`.
- If one with the same filters already exists → toast "This search is already saved" (dedupe by filters hash).

### 3.6 Email alert behavior (Resend)

- **Match logic.** A scheduled job (Supabase Edge Function / scheduled task) periodically runs each active saved search's `filters` against properties → finds new matches with `created_at > last_alerted_at`.
- **Grouping by frequency.**
  - Instant: batched ~15 minutes, sent only if ≥1 new match.
  - Daily/Weekly: digest via cron (in the user's TZ).
- **Email content (Resend template, in the chosen language).**
  - Subject: "3 new properties for your search: [search name]".
  - Up to ~5 property cards (image, price, key facts) + **[View all]** → `/search?...`.
  - Each card → `/property/[id]?utm=alert`.
  - Footer: **[Manage notifications]** → `/saved-searches` · **[Turn off]** (one-click off → frequency=off).
- After sending: `last_alerted_at = now()`; the Resend delivery status is logged.

### 3.7 Empty state

- Icon (bell `w-32 h-32 text-gray-300`) + "You don't have any saved searches yet".
- Text: "Search for a property, apply filters, and tap 'Save search' to learn about new offers".
- **[Start a search]** primary → `/search`.

### 3.8 Guest state

- Login wall card: "Sign in to see your saved searches" + **[Sign in]** → `/auth/login?redirect=/saved-searches` · **[Sign up]**.

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------------|
| **Loading** | Card skeleton (3–4 gray row shimmer) |
| **Loaded (≥1)** | Card list + frequency toggles + "N new" badges |
| **Empty (0)** | Bell illustration + "You don't have any saved searches yet" + [Start a search] |
| **Guest** | Login wall card |
| **Frequency saving** | Optimistic segment + toast "Notification updated" |
| **Edit filters open** | Filter modal (search controls) |
| **Deleting** | Optimistic remove + toast + [Undo] (5s) |
| **Limit reached** | Warning in save modal "You've reached the limit of 10 saved searches" |
| **Filter drift** | Notice on card "Update your filters" (deleted city/category) |
| **Error (API fail)** | "Something went wrong" + [Try again] |

---

## 5. Technical depth

### Component tree

```
<SavedSearchesPage> (Server Component, SSR, auth-gated)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <SavedSearchesHeader count={number} />
 ├─ <SavedSearchList>                                  (client, React Query)
 │   └─ <SavedSearchCard search>                        (×N)
 │       ├─ <FilterChips filters={FilterJson} />
 │       ├─ <NewMatchBadge count />
 │       ├─ <FrequencyToggle value onChange />
 │       └─ <SearchActions onOpen onEdit onRename onDelete />
 ├─ <EditFiltersModal />   (lazy, reuse search filter panel)
 ├─ <EmptySavedSearches />  (conditional: count===0)
 └─ <SavedSearchesLoginWall /> (conditional: guest)
```

### Data fields used

`saved_searches(id, user_id, name, filters(json), alert_frequency, last_alerted_at, new_match_count, created_at)`. The `filters` JSON has the same shape as the `/search` query (deal_type, property_type, city, district, rooms, area_min/max, price_min/max, currency, amenities[]).

### API contracts

**`GET /api/saved-searches`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 31,
      "name": "2 սեն. · Արաբկիր · ≤100K$",
      "filters": {
        "dealType": "sale", "propertyType": "apartment",
        "city": "Yerevan", "district": "Arabkir",
        "rooms": 2, "areaMin": 50, "areaMax": 80,
        "priceMax": 100000, "currency": "USD"
      },
      "alertFrequency": "daily",
      "newMatchCount": 3,
      "lastAlertedAt": "2026-06-23T09:00:00Z"
    }
  ],
  "total": 4
}
// 401 { "error": "auth_required" }
```

**`POST /api/saved-searches`**
```jsonc
// request { "name": "...", "filters": { ... }, "alertFrequency": "daily" }
// 201     { "id": 31 }
// 409     { "error": "duplicate" }   → toast "Already saved"
// 422     { "error": "limit_reached" } → "Limit of 10 searches"
```

**`PATCH /api/saved-searches/[id]`** → `{ name? , filters? , alertFrequency? }` → `200`

**`DELETE /api/saved-searches/[id]`** → `200 { "deleted": true }` (undo = re-POST)

**Unsubscribe (signed, auth-free).** `GET /api/saved-searches/unsubscribe?token=<signed>` → `200` → frequency=off.

### Backend job (cron)

```
scheduled-task (~15min instant / daily 09:00 / weekly Mon 09:00)
  → for each active saved_search:
      match = properties WHERE matches(filters) AND created_at > last_alerted_at
      if match.length ≥ 1:
          Resend digest (locale-based template)
          last_alerted_at = now(); new_match_count += match.length
```

### Validation (zod)

```ts
const savedSearchSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  filters: searchFiltersSchema,        // reuse /search schema
  alertFrequency: z.enum(["off","instant","daily","weekly"]).default("daily"),
});
```

- **Limit.** User: max 10 saved searches (Pro: more) to avoid abuse/cron load.
- **Dedupe.** Saving again with the same `filters` hash → 409.
- **Timezone.** Daily/Weekly digest in the user's TZ (from settings), default: Asia/Yerevan.
- **Unsubscribe token.** Signed (HMAC), expiry-less, one-click off without login (deliverability).

---

## 6. Responsive

- **≥1024px (lg).** Card full-width, frequency segmented control inline, actions row visible.
- **768–1023px (md).** Card full-width, actions wrap.
- **<768px (sm).** Card stack; frequency as dropdown; actions in a "⋯" menu; breadcrumbs "‹ Back"; edit filters as a full-screen modal.

---

## 7. Accessibility

- Frequency segmented control: ARIA `radiogroup` / `radio`, ←/→ navigation, `aria-checked`.
- "N new" badge: `aria-label="3 new matching properties"`.
- Filter chips: decorative (`aria-hidden` if they repeat the card title) or a readable summary.
- Delete confirm: focus-trap modal, ESC closes; toast undo: `role="status"`.
- Emails: `List-Unsubscribe` header + plaintext fallback; contrast ≥ 4.5:1; touch target ≥ 44px.

---

## 8. SEO & meta

- **noindex, nofollow** — personal, auth-gated (`robots: noindex, nofollow`).
- `<title>` = "Saved searches | {brand}".
- Email digests: proper `List-Unsubscribe` and `List-Unsubscribe-Post` headers for deliverability, valid SPF/DKIM (Resend domain).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `saved_searches_view` | Page load | `count` |
| `saved_search_create` | [Save] from search | `search_id, frequency` |
| `saved_search_open` | [🔍 Open search] | `search_id` |
| `saved_search_edit` | [✏️ Edit] save | `search_id` |
| `saved_search_rename` | [Aa Rename] | `search_id` |
| `saved_search_delete` | [🗑 Delete] | `search_id` |
| `alert_frequency_changed` | Frequency toggle | `search_id, frequency` |
| `alert_email_sent` | Cron digest send | `search_id, match_count` |
| `alert_email_opened` | Email open pixel | `search_id` |
| `alert_property_click` | Email card click | `search_id, property_id` |
| `alert_unsubscribe` | Email [Turn off] | `search_id` |
