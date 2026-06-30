# Page 24 — Admin Panel 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, data fields, API contracts, validation), responsive, accessibility, analytics, SEO.

**URL.** `/admin` (dashboard) · `/admin/moderation` · `/admin/users` · `/admin/reports` · `/admin/listings` · `/admin/content` · `/admin/locations` · `/admin/settings`
**Roles.** **Admin** only (`role === 'admin'`). Everyone else → 403 + redirect `/`. The assumption is that a **moderator** tier (limited) will be added in Phase 3.
**Primary goal.** Give the platform operator **one central hub** from which to quickly moderate, manage users, resolve complaints, and monitor platform health. Every screen is optimized for **fast decision-making** (queue → preview → action in 2-3 clicks).

---

## 0. Overview

The admin panel is an **internal tool**, not a public page — so the UX priority is **density and speed**, not beauty or conversion. A typical admin opens the panel several times a day, glances at the pending-queue badge, and clears the queue in a few minutes. Therefore: (1) the sidebar badges always show the count requiring attention, (2) before every destructive action — confirm + a mandatory reason, (3) every action is recorded in the audit log, so that "who, when, what" can be reconstructed later.

The panel is rendered with **SSR** behind an auth guard; the data is live, via React Query (short `staleTime`, since moderation needs to be near real-time). The entire panel is `noindex, nofollow` — a search engine should never see it.

The panel has **8 main sections** (sidebar items), the busiest of which are **Moderation** and **Reports** (with a numeric badge). The rest are management/configuration sections with less frequent visits.

---

## 1. User scenarios

**Scenario A — Moderator Ani (morning queue).** Ani opens `/admin` and sees a **"Moderation 12"** badge in the sidebar. She clicks it and goes to the queue (oldest at the top). The first row: "3-room apartment in the Center." Click → the drawer opens from the right, showing the full listing as it would appear on the property page. The photos are good, the price is reasonable → she clicks **"✅ Approve"**, the drawer closes, and the next item is auto-selected. 12 items in 4 minutes. → A notification + email was sent to the owners.

**Scenario B — Admin David (fraud report).** On the Reports page he sees **"⚑ 3 complaints"** grouped against the same listing, with the reason "Fake price." Click → report detail with the reporters' history + listing preview. The price is indeed implausibly low (a scam pattern). He clicks **"🚫 Remove listing"** → reason modal → "Suspicious/fake price" → submit. Listing → archived, email to the owner, report → resolved. He adds an internal note: "Repeat scam, watch the owner."

**Scenario C — Admin Sona (verify agent).** On the Users page she filters by `role=agent, verified=no`. She sees a new agent who has uploaded a license. Click → user detail → "Documents" tab → she checks the license → **"✔️ Verify agent"**. Agent → `verified=true`, a ✓ badge appears on the profile, and a welcome email goes to the agent.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + content

```
┌──────────────────────────────────────────────────────────────┐
│ ADMIN TOP BAR (h-14, bg-gray-900 text-white)                 │
│ [≡] Admin · 🔍 Global search    [avatar ▾] [↗ To site]      │
├────────────────┬─────────────────────────────────────────────┤
│ SIDEBAR        │  CONTENT AREA (bg-gray-50, p-6)             │
│ (w-60, sticky) │                                             │
│ bg-white       │  ┌─ Page header ──────────────────────┐    │
│ border-r       │  │ H1 + date-range / search / filters │    │
│                │  └────────────────────────────────────┘    │
│ 📊 Dashboard   │                                             │
│ 🛡 Moderation12│  ┌─ Stat cards / Table / Editor ──────┐    │
│ 👥 Users       │  │                                    │    │
│ ⚑ Reports   3 │  │  (content depending on section)    │    │
│ 🏠 Listings    │  │                                    │    │
│ 📝 Content     │  └────────────────────────────────────┘    │
│ 📍 Locations   │                                             │
│ ⚙️ Settings    │  [◄ prev] Page 1 / 24 [next ►]  (pagination)│
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
            ▲ active item: bg-primary/10 text-primary border-l-2
```

### Mobile (<768px) — drawer sidebar

```
┌──────────────────────────┐
│ ☰  Admin       [avatar]  │  ← top bar h-14
├──────────────────────────┤
│ Page header (filters     │
│  collapse → bottom sheet)│
├──────────────────────────┤
│ Card / row list          │
│ (table → stacked cards)  │
│ ┌──────────────────────┐ │
│ │ thumb · title        │ │
│ │ owner · price · status│ │
│ │ [✅] [❌] [⋯]        │ │
│ └──────────────────────┘ │
│ ...                      │
├──────────────────────────┤
│ Pagination               │
└──────────────────────────┘
   ☰ → slide-in drawer (sidebar)
```

- The admin is a **desktop-first** tool. Mobile is supported (urgent approve/ban on the go), but the editors (content, settings) are desktop-optimized.
- The sidebar is sticky `top-14` on desktop; on mobile it's a drawer opened by `☰` (`bg-black/40` overlay).
- On mobile, tables become stacked cards (not horizontal scroll).

### Design tokens (for the admin panel)

| Element | Tailwind / value |
|------|------------------|
| Top bar | `h-14 bg-gray-900 text-white px-4 flex items-center` |
| Sidebar | `w-60 bg-white border-r border-gray-200 sticky top-14` |
| Sidebar active | `bg-primary/10 text-primary border-l-2 border-primary` |
| Sidebar badge | `ml-auto bg-red-500 text-white text-xs px-1.5 rounded-full` |
| Content bg | `bg-gray-50 min-h-screen p-6` |
| Page H1 | `text-2xl font-semibold text-gray-900` |
| Stat card | `bg-white rounded-xl border border-gray-200 p-5 shadow-sm` |
| Stat value | `text-3xl font-bold text-gray-900` |
| Stat trend ↑ | `text-sm text-green-600` (↓ `text-red-600`) |
| Table | `w-full text-sm`, header `bg-gray-50 text-gray-500 uppercase text-xs` |
| Table row hover | `hover:bg-gray-50 border-b border-gray-100` |
| Approve button | `bg-green-600 text-white h-9 px-3 rounded-md hover:bg-green-700` |
| Reject/Ban button | `bg-red-600 text-white h-9 px-3 rounded-md hover:bg-red-700` |
| Status badge active | `bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded` |
| Status badge pending | `bg-amber-100 text-amber-700` |
| Status badge banned/rejected | `bg-red-100 text-red-700` |
| Confirm modal | `bg-white rounded-xl p-6 max-w-md shadow-xl` |
| Drawer (preview) | `fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl` |

---

## 3. Section-by-section

### 3.1 Entry / Layout guard

- **Access guard.** Server-side check `user.role === 'admin'` in middleware (`/admin/*`). Not verified → 403 page "Access denied" + link "To home." Supabase RLS provides additional protection (row-level security + role check on every query).
- **Sidebar.** 8 items, each with icon + label + (conditionally) a pending count badge. Active item: `border-l-2 border-primary`. The badges are live (React Query `refetchInterval: 30s`): Moderation = pending listings count, Reports = open reports count.
- **Top bar.** `🔍 Global search` (user/listing/report by id/name/email) · admin avatar dropdown (`[Profile] [Audit log] [Sign out]`) · "↗ To site" (opens the public site in a new tab).
- **Microcopy.** 403 banner: "This section is available to admins only."

### 3.2 Dashboard (`/admin`)

The platform's state at a glance.

- **Date-range filter (top right).** `[Today] [7 days] [30 days] [Custom ▾]` — refreshes all stats and charts. Default: 30 days.
- **Stat cards (grid, `grid-cols-2 lg:grid-cols-3 gap-4`).** Each card: icon + label + a large number + trend chip (↑/↓ % vs the previous period):
  - 👥 **Users** — total + "+124 this month ↑8%"
  - 🏠 **Listings** — active / pending / sold / archived breakdown (mini bar)
  - 👁 **Views** — total views for the selected period
  - 💰 **Revenue** — Pro subscriptions + promoted (Phase 2; until payments: "—")
  - ✉️ **Leads / messages** — conversations created
  - ⚑ **Attention** — pending moderation + open reports (warning color `bg-amber-50` if >0)
- **Charts (Recharts).** Line: new users/listings over time; bar: listings by city; pie: sale vs rent.
- **Quick actions.** `[Moderation queue →]` · `[Open reports →]` · `[New users →]`.
- **Recent activity feed.** The last 10 actions (new registration / new listing / new report) with timestamp + link.
- **Data.** `GET /api/admin/stats?range=30d`.
- **Empty.** New platform → "No data yet — we're waiting for the first users."

### 3.3 Moderation queue (`/admin/moderation`)

Review of listings awaiting publication (`status=pending`) — **the most frequently used section**.

- **Tabs.** `[Pending (12)] [Approved] [Rejected] [All]`. Default: Pending.
- **Queue table.** Each row: ☐ checkbox · cover thumbnail (`w-16 h-12 rounded`) · title · owner (link) · type/deal · price · created date · "⏱ waiting 6h" (`text-amber-600` if >24h). Sort: FIFO (oldest at top).
- **Row click → preview drawer** (slide-in from the right, `w-[480px]`): the full listing as it would appear on the property page (gallery, description, details, map). A sticky action bar at the bottom of the drawer.
- **Actions (per item).**
  - **[✅ Approve]** → `status=active`, gets published, notification + email to the owner. Drawer closes, next item auto-selected. `POST /api/admin/listings/[id]/approve`
  - **[❌ Reject]** → **reason modal** (mandatory): dropdown (Bad photos / Duplicate / Suspicious price / Rule violation / Other) + free text. `status=rejected`, notification + email to the owner with the reason. `POST /api/admin/listings/[id]/reject {reason}`
  - **[✏️ Edit]** → admin fixes typo/category → `/admin/listings/[id]/edit` (full wizard access).
  - **[👤 Owner]** → user detail in admin.
- **Bulk actions.** Checkbox select → a toolbar appears at the top: `[Approve selected (5)]` / `[Reject selected]` (bulk reason).
- **Multi-admin lock.** When an item is opened, an optimistic lock → the other admin sees "🔒 Ani is reviewing" (to avoid double-action).
- **Microcopy.** Reject success toast: "Rejected — the reason was sent to the owner." Empty queue: "🎉 Nothing waiting for moderation."
- **Edge.** A rejected listing can be fixed by the owner and resubmitted → it returns to the top of the queue with a "↻ Resubmitted" tag.

### 3.4 Users management (`/admin/users`)

- **Search & filter bar.** Search: name/email/phone/id · filters (chips): role (user/agent/admin) · status (active/banned) · verified (yes/no) · country · registration date.
- **Users table.** ☐ · avatar · name · email · role badge · listings count · status (Active/Banned) · joined · last active. Pagination (25/page) + sortable columns.
- **Row click → User detail** (`/admin/users/[id]`): profile info · listings tab · conversations count · reports (against/by) · activity log · (for agents) a "Documents" tab with the license.
- **Actions (per user).**
  - **[🚫 Ban / Unban]** → confirm modal (mandatory reason). Ban → the user cannot log in/post, and their listings → hidden. `POST /api/admin/users/[id]/ban {reason}`
  - **[✔️ Verify agent]** → checks the license → `agent.verified=true`, verified badge. `POST /api/admin/users/[id]/verify`
  - **[🎚 Change role]** → dropdown (user ↔ agent ↔ admin). Confirm modal (the admin role with caution). `PATCH /api/admin/users/[id] {role}`
  - **[✉️ Send message]** → admin → user system message.
  - **[🗑 Delete]** (soft delete, confirm): GDPR-compliant anonymize (name → "Deleted user", PII scrubbed).
- **Edge.** An admin cannot ban/delete themselves or the last remaining admin (server-side guard → 409 "Cannot delete the last admin").

### 3.5 Reports / complaints (`/admin/reports`)

User complaints against listings/users/messages.

- **Tabs.** `[Open (3)] [In review] [Closed] [All]`.
- **Reports table.** Type (listing/user/message) · reported item (link) · reporter (link) · reason (spam/fraud/offensive/duplicate/wrong-info) · date · status. Sort: newest at top. **Group**: multiple reports for the same item together ("3 complaints" chip, priority high).
- **Row click → Report detail.** Complaint text · preview of the reported content · reporter's history · other complaints for the same item · internal notes thread.
- **Actions.**
  - **[👁 View item]** → opens listing/user/message preview.
  - **[✅ Dismiss]** → unfounded complaint → `status=closed` (no action). `POST /api/admin/reports/[id]/dismiss`
  - **[⚠️ Warn]** → warning to the owner (notification + email).
  - **[🚫 Remove/Ban]** → action against the item → report `resolved`. `POST /api/admin/reports/[id]/action {action_type}`
  - **[📝 Internal note]** — comment between admins (audit trail).
- **Edge.** Repeat complaints against the same item → auto-flag priority high (red row).

### 3.6 Listings management (`/admin/listings`)

Full control over any listing (not only pending).

- **Search & filter.** id/title/owner · status · deal type · property type · country/city · price range · featured (yes/no) · date.
- **Listings table.** ☐ · cover · title · owner · type/deal · price · status badge · views · featured ⭐ · created. Sort + pagination + bulk select.
- **Actions (per listing).**
  - **[✏️ Edit]** → full wizard access to any field. `PATCH /api/admin/listings/[id]`
  - **[🗑 Remove]** → confirm modal (reason) → `status=archived`, owner notification. `DELETE /api/admin/listings/[id]`
  - **[⭐ Promote / Feature]** → toggle `is_featured` (+ optional duration: 7/14/30 days). Appears at the top of home/search. `POST /api/admin/listings/[id]/feature {duration}`
  - **[⏸ Deactivate / ▶️ Activate]** → status toggle.
  - **[👤 Owner]** · **[📊 Statistics]** (views/favorites/leads).
- **Bulk.** Remove / feature / activate the selected items.

### 3.7 Content / Blog CMS (`/admin/content`)

Articles, news, guides (see `15-blog.md`, `16-guides.md`).

- **Tabs / filter.** `[Articles] [Guides]` · status (published/draft) · category · language.
- **Content table.** cover · title · category · author · status · published date · views. `[➕ New article]`.
- **Editor (create/edit).**
  - **Language tabs.** HY / RU / EN — separate title, slug, body (rich-text WYSIWYG) for each language.
  - Fields: cover image upload · category ▾ · tags · excerpt · SEO (meta title/description, OG image) · author.
  - `[💾 Save draft]` · `[🚀 Publish]` (`status=published`, `published_at`) · `[👁 Preview]` · `[🗑 Delete]`.
  - Data: `POST /api/admin/posts` · `PATCH /api/admin/posts/[id]` · `POST /api/admin/posts/[id]/publish`
- **Edge.** Untranslated language → fallback to default + warning "The RU/EN version is missing."

### 3.8 Locations & Categories (`/admin/locations`)

Geographic and classification data (the foundation for multi-country).

- **Sub-tabs.** `[Countries] [Cities] [Neighborhoods] [Property types] [Amenities]`.
- **Countries.** Table: name{hy,ru,en} · code · currency · active toggle · cities count. `[➕ Add country]`, edit, deactivate.
- **Cities.** Belongs to country ▾ · name{hy,ru,en} · lat/lng center · active. Tree view: country → city → neighborhood.
- **Neighborhoods.** Belongs to city · name{hy,ru,en} · (optional polygon/boundary geo).
- **Property types.** apartment/house/land/commercial/… · name{hy,ru,en} · icon · active.
- **Amenities.** Parking, elevator, furniture… · name{hy,ru,en} · icon · group (in/out).
- **Actions.** Add / edit (language tabs) / reorder (drag) / activate-deactivate.
- **Edge.** Deleting a city/type is forbidden if there are related listings → only **deactivate** (to preserve integrity). Attempt → 409 "Cannot delete — there are related listings."
- **Data.** `GET/POST/PATCH /api/admin/locations/*` · `/api/admin/categories/*`

### 3.9 Settings (`/admin/settings`)

Platform-wide settings.

- **Exchange rates.** Current AMD/RUB/USD/EUR rates (auto live API + manual override). `[🔄 Refresh now]` · last-updated timestamp. `GET/PATCH /api/admin/settings/rates`
- **Plans / Pricing (Pro).** Subscription tiers (free/pro/premium): price, listings limit, features list. `/api/admin/settings/plans`
- **Feature flags.** Toggles: moderation on/off · 360°-tours enabled · payments enabled · registration open · maintenance mode · new-country rollout. Real-time UI effect.
- **General.** Site name · default lang/currency · contact email · social links · footer text (multilingual).
- **Email templates.** Notification/alert email text (multilingual).
- **Data.** `GET/PATCH /api/admin/settings`.
- **Microcopy.** Warning on the maintenance mode toggle: "Enabling this will close the site for all visitors."

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton: sidebar + stat card outlines / table row shimmer |
| **Loaded (dashboard)** | Stat cards + charts + activity feed |
| **Empty queue** | "🎉 Nothing waiting for moderation" illustration |
| **Empty table** | "No results for the selected filter" + [Clear filters] |
| **Action loading** | Button spinner + disabled (optimistic update) |
| **Action success** | Toast (green) + row update / drawer close |
| **Confirm needed** | Modal: reason input + [Confirm] / [Cancel] |
| **Locked item** | "🔒 {admin} is reviewing" — actions disabled |
| **403 (non-admin)** | "Access denied" + [To home] |
| **Error (API fail)** | "Something went wrong" + [Try again] |
| **409 (guard)** | Inline error (e.g. "Cannot delete the last admin") |

---

## 5. Technical depth

### Component tree

```
<AdminLayout> (Server Component, auth guard)
 ├─ <AdminTopBar globalSearch admin />
 ├─ <AdminSidebar items={NavItem[]} badges={{moderation, reports}} />
 └─ <AdminContent>                          (depending on route)
     ├─ <DashboardPage stats charts feed /> (client, React Query)
     ├─ <ModerationQueue tab status />      (client)
     │   ├─ <QueueTable rows bulkSelect />
     │   └─ <ListingPreviewDrawer id />     (lazy)
     │       └─ <RejectReasonModal />
     ├─ <UsersTable filters />              (client)
     │   └─ <UserDetail id />
     ├─ <ReportsTable grouped />            (client)
     ├─ <ListingsTable filters />          (client)
     ├─ <ContentCMS />                      (client)
     │   └─ <PostEditor langTabs wysiwyg />
     ├─ <LocationsManager subTabs tree />   (client)
     └─ <SettingsPanel sections />          (client)
```

### Data fields used (see 00-SPEC §7)

`users{id, role, name, email, phone, avatar_url, email_verified, phone_verified, status, created_at, last_active}` · `agents{user_id, agency_name, license_no, verified, subscription_tier}` · `properties{id, owner_id, title, status, deal_type, property_type, price, currency, city, views_count, is_featured, created_at}` · `reports{id, target_type, target_id, reporter_id, reason, status, note, created_at}` · `blog_posts{id, slug, title, body, status, published_at}` · `admin_actions{id, admin_id, action, target_type, target_id, meta, created_at}` (audit log).

### API contracts

**`GET /api/admin/stats?range=30d`**
```jsonc
// 200 OK
{
  "range": "30d",
  "users": { "total": 8421, "new": 124, "trend": 8.0 },
  "listings": { "active": 3120, "pending": 12, "sold": 890, "archived": 210 },
  "views": 142300,
  "revenue": { "amount": 0, "currency": "AMD" },
  "leads": 1840,
  "attention": { "pendingModeration": 12, "openReports": 3 }
}
// 403 { "error": "forbidden" }
```

**`POST /api/admin/listings/[id]/approve`**
```jsonc
// 200 { "id": 8423, "status": "active" }   → owner notification + email
// 409 { "error": "already_moderated" }     → toast "Already reviewed"
```

**`POST /api/admin/listings/[id]/reject`**
```jsonc
// request  { "reason": "suspicious_price", "note": "The price is 5x below market" }
// 200      { "id": 8423, "status": "rejected" }
// 422      { "error": "reason_required" }
```

**`POST /api/admin/users/[id]/ban`** → `{ "reason": "spam" }` → `200 { "status": "banned" }` · `409 { "error": "cannot_ban_last_admin" }`

**`POST /api/admin/users/[id]/verify`** → `200 { "verified": true }`

**`POST /api/admin/reports/[id]/action`** → `{ "actionType": "remove_listing" }` → `200 { "status": "resolved" }`

**`POST /api/admin/listings/[id]/feature`** → `{ "duration": 14 }` → `200 { "isFeatured": true, "until": "2026-07-07" }`

### Validation (zod)

```ts
const rejectSchema = z.object({
  reason: z.enum(["bad_photos", "duplicate", "suspicious_price",
                  "rule_violation", "other"], {
    required_error: "Select a reason",
  }),
  note: z.string().max(500).optional(),
});

const banSchema = z.object({
  reason: z.string().min(3, "Specify the reason").max(500),
});
```

- **Auth.** All `/api/admin/*` routes: admin-only middleware + Supabase RLS (role check).
- **Audit.** Every mutating action → an `admin_actions` row (admin_id, action, target, meta).
- **Idempotency.** Approve/reject are idempotent — a duplicate submit → `409 already_moderated` (multi-admin race).
- **Guards.** Last-admin protection, self-ban protection, has-listings delete protection (server-side, 409).

---

## 6. Responsive

- **≥1024px (lg).** Sidebar `w-60` sticky + content; tables as full tables; preview drawer `w-[480px]`.
- **768–1023px (md).** Sidebar collapses → icon-only (`w-16`, hover tooltip); tables compact with horizontal scroll.
- **<768px (sm).** Sidebar → `☰` drawer; tables → stacked cards (thumb + key fields + action chips); filters → bottom sheet; editors get a "Best on desktop" banner.

---

## 7. Accessibility

- All icon-only action buttons have an `aria-label` (✅ = "Approve listing", 🚫 = "Ban user").
- Tables use `<table>` semantic markup, `<th scope="col">`, sort buttons with `aria-sort`.
- Drawer/modal: focus trap, ESC close, `role="dialog"` + `aria-labelledby`.
- The destructive button of the confirm modal is not autofocused (to avoid an accidental Enter); focus is on Cancel.
- Toasts: `role="status"`; errors: `role="alert"`.
- Contrast ≥ 4.5:1; sidebar badges convey meaning by more than color (number + color).

---

## 8. SEO & meta

- **`noindex, nofollow`** for all of `/admin/*` (`<meta name="robots" content="noindex, nofollow">` + `robots.txt` disallow). The admin panel should never appear in a search engine.
- The auth guard is the primary protection (not just noindex).
- `<title>` = "Admin · {section} | {brand}" (internal, not for SEO).
- `/admin/*` is not included in the sitemap.

---

## 9. Analytics events

> Internal (admin) analytics — a separate stream from public analytics, for audit/operational purposes.

| Event | Trigger | Payload |
|-------|---------|---------|
| `admin_listing_approved` | Approve click | `listing_id, admin_id` |
| `admin_listing_rejected` | Reject submit | `listing_id, admin_id, reason` |
| `admin_user_banned` | Ban submit | `user_id, admin_id, reason` |
| `admin_agent_verified` | Verify click | `user_id, admin_id` |
| `admin_report_resolved` | Report action | `report_id, action_type` |
| `admin_listing_featured` | Feature toggle | `listing_id, duration` |
| `admin_setting_changed` | Settings save | `setting_key` |
| `admin_post_published` | Publish click | `post_id` |
| `admin_bulk_action` | Bulk submit | `action, count` |
