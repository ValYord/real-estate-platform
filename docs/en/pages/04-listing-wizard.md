# Page 04 — Create / Edit Listing Wizard (Add a Listing) 🟢 Phase 1

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/sizing/colors, step-by-step behavior and states, microcopy (English), technical section (components, props, data, API, validation), responsive, accessibility, SEO, analytics.

**URL.** `/sell/new` (new) · `/listing/[id]/edit` (edit) · for auto-saved drafts: `/sell/new?draft=[id]`
**Roles.** User, Agent (login required; Guest → `/auth/register?next=/sell/new`).
**Primary goal (conversion).** Get the user **all the way to "Publish"** with a high-quality, complete listing. The less friction and the lower the drop-off, the more high-quality properties on the site.

---

## 0. Overview

The listing wizard is the **core of the supply side** — without listings, the site is empty. The flow must therefore be: (1) **easy and step-by-step** (6 small steps, not one giant form), (2) **forgiving** (auto-save the draft after every step so nothing is lost), and (3) **quality-ensuring** (per-step validation, min 1 photo, sufficient description).

6 steps: `[1 Type] → [2 Location] → [3 Details] → [4 Media] → [5 Price] → [6 Contact + Preview]`. A progress bar at the top (Step N/6). Each step has `[← Back]` and `[Continue →]`; on the last step: `[💾 Draft]` and `[🚀 Publish]`.

Render: **client-heavy** (form, drag-drop, map pin, live preview). The wizard state is held in `react-hook-form`; each step has its own zod schema; auto-save does a debounced PATCH on the draft. Edit mode reuses the same wizard, pre-filled, with any step directly accessible.

---

## 1. User scenarios

**Scenario A — Owner Hovhannes (mobile, first time).** Hovhannes tapped "List a property" from the home page. Since he is logged in → the wizard opens. Step 1: he selects "Sale" + "Apartment". Step 2: city Yerevan, drags the map pin to the right building. His phone rings, he leaves — the draft was auto-saved. Half an hour later he returns from the dashboard and continues the draft from Step 3.

**Scenario B — Agent Nare (desktop, Pro).** Nare is adding her 5th listing. In Step 4 she drag-drops 18 photos, reorders them by dragging, marks the first as the cover. In Step 6 she sees the live preview, taps **[🚀 Publish]** → property page + toast "Published".

**Scenario C — User Anna (limit hit).** Anna is a free user and already has 5 active listings. When she taps "List", she sees a modal: "You've reached the free limit (5/5). Deactivate an old listing or switch to Pro." → [Manage listings] / [View Pro].

---

## 2. Layout & visual structure

### Desktop (≥1024px) — centered form + side summary

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (h-16) — minimal in wizard (logo + «Saved ✓»)        │
├────────────────────────────────────────────────────────────┤
│ PROGRESS BAR  ①Type ─②Loc. ─③Det. ─④Media─⑤Price─⑥Preview  │
│               ●━━━━●━━━━○━━━━○━━━━○━━━━○   (Step 2/6)        │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ STEP CONTENT (max-w-2xl)       │ ► SUMMARY (sticky, w-72) │
│                                   │  «Your listing»          │
│  [Step fields]                    │  Type: Apartment, Sale   │
│   ...                             │  Location: Yerevan, Arabkir │
│   ...                             │  (grows live per step)   │
│                                   │  💾 Auto-saved 12:04     │
│  ┌──────────────┬──────────────┐  │                          │
│  │ [← Back]     │ [Continue →] │  │                          │
│  └──────────────┴──────────────┘  │                          │
└──────────────────────────────────┴─────────────────────────┘
```

### Mobile (<768px) — full-width, fixed nav

```
┌──────────────────────────┐
│ HEADER (h-14) «Saved ✓»  │
├──────────────────────────┤
│ Step 2/6  ●━━●━━○━━○━━○━━○│
├──────────────────────────┤
│ Step title               │
│ [field]                  │
│ [field]                  │
│ [Map pin (h-[240px])]    │
│ ...(scroll)              │
├──────────────────────────┤
│ FIXED BOTTOM NAV (h-16)  │
│ [← Back]   [Continue →]  │
└──────────────────────────┘
```

- On mobile there is no summary sidebar; instead the progress bar is compact (Step N/6 + dots).
- The navigation (`[Back]`/`[Continue]`) is a fixed bottom bar `border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Progress step (done) | `bg-primary text-white rounded-full w-8 h-8` + ✓ |
| Progress step (active) | `border-2 border-primary text-primary rounded-full w-8 h-8` |
| Progress step (todo) | `border border-gray-300 text-gray-400 rounded-full w-8 h-8` |
| Progress connector | `h-0.5 flex-1 bg-gray-200` (done: `bg-primary`) |
| Step content | `max-w-2xl mx-auto px-4 py-8 space-y-6` |
| Field label | `text-sm font-medium text-gray-700 mb-1.5` |
| Required mark | `text-red-500` (`*`) |
| Input | `h-11 w-full border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-primary` |
| Card-select (option) | `border border-gray-200 rounded-xl p-4 hover:border-primary cursor-pointer` |
| Card-select (selected) | `border-primary bg-primary/5 ring-1 ring-primary` |
| Error text | `text-sm text-red-600 mt-1` |
| Error field | `border-red-400 focus:ring-red-400` |
| Primary nav button | `bg-primary text-white h-11 px-6 rounded-lg font-medium disabled:opacity-50` |
| Secondary nav button | `border border-gray-300 text-gray-700 h-11 px-6 rounded-lg` |
| Publish button | `bg-green-600 text-white h-12 rounded-lg font-medium hover:bg-green-700` |
| Auto-save badge | `text-xs text-gray-400` («💾 Saved 12:04») |
| Upload dropzone | `border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary` |

---

## 3. Step-by-step

### 3.0 General wizard behavior

- **Progress bar.** Clickable only for **already completed/visited** steps (jumping ahead is blocked until the current step's validation passes). In edit mode, all are clickable.
- **Nav.** `[← Back]` is always active (hidden on Step 1); `[Continue →]` is disabled until the current step's required fields pass validation.
- **Auto-save.** 1.5s debounce after each field's `onChange` → `PATCH /api/listings/[id]` (status=draft). The badge updates to "💾 Saved HH:MM"; on failure, "⚠ Not saved — retrying".
- **Leave warning.** When leaving with unsaved changes (route change / tab close): `beforeunload` + confirm "Unsaved changes will be lost".

### 3.1 Step 1 — Deal & Property type

- **Deal type.** Two large radio cards: `( ) Sale` `( ) Rent` (icon + label, card-select style).
- **Property type.** Card-select grid (`grid grid-cols-2 md:grid-cols-3 gap-3`): 🏢 Apartment · 🏡 House/Detached · 🌳 Land · 🏬 Commercial · 🏗 New development · 🚗 Garage.
- **Behavior.** The type selection **determines the fields of the following steps** (e.g. for Land there are no bedroom/floor fields in Step 3; for Commercial there are commercial-specific ones).
- **Validation.** Both are required → `[Continue →]` is disabled until a selection is made.
- **Microcopy.** Title "What are you listing?" · subtext "Choose the deal type and property type".

### 3.2 Step 2 — Location

- **Fields.** Country ▾ (Armenia default) · City ▾/autocomplete · District ▾ · Address (input) · Building/apt № (optional).
- **Map pin.** Mapbox `h-[300px] rounded-xl` + a draggable 📍 marker (drag → lat/lng). The pin auto-centers when an address/city is selected; the user fine-tunes it by dragging. Moving the pin can update the address via reverse geocoding (suggestion).
- **"Hide exact address" checkbox.** When enabled, the property page shows only the district + an approximate circle (no precise pin).
- **Validation.** City **required** + map pin **required** (lat/lng set). Address is optional (but encouraged).
- **Microcopy.** "Where is the property?" · pin hint "Drag the marker to the exact spot" · checkbox label "Hide exact address (show district only)".

### 3.3 Step 3 — Details

- **Numeric fields.** Area (m²) `*` · Rooms · Bedrooms · Bathrooms · Floor / Total floors · Year built. (Some are hidden depending on type, e.g. Land → area/purpose only).
- **Condition.** Select: New development · Renovated · Good · Needs renovation.
- **Toggles.** Heating · Balcony · Parking · Elevator.
- **Amenities.** Checkbox grid (`grid grid-cols-2 md:grid-cols-3 gap-2`): Furniture · Air conditioning · Security · Internet · Storage · etc.
- **Title `*`.** Input + auto-suggest (e.g. "2-room apartment in Arabkir", composed from type+rooms+district).
- **Description `*`.** Textarea (min 30 chars), counter; AI-assist "Improve the text" — Phase 2.
- **Multi-language tabs.** `[HY] [RU] [EN]` for the title/description. HY required; RU/EN optional + "Auto-translate suggestion" (Phase 2). A tab badge shows which language is filled in.
- **Validation.** Area > 0, title 5–120 chars, description ≥ 30 chars. Inline error below the offending field.
- **Microcopy.** "Property details" · description placeholder "Describe the property: renovation, location, infrastructure…".

### 3.4 Step 4 — Media (Photo/Video/360°)

- **Drag & drop uploader.** Dropzone (`border-dashed`) or click → file picker (multiple). Upload is direct-to-Storage (Supabase signed URL), with a progress bar per file, auto-compress + thumbnail.
- **Grid + reorder.** Uploaded photos form a thumbnail grid; **drag to reorder**; the first one = **cover** (badge "Cover"). Each photo has ✕ delete + ⠿ drag handle.
- **Limits.** Min **1** / Max **30** photos; file ≤ 10MB; format: jpg/png/webp.
- **Video** (optional): URL (YouTube/Vimeo) or upload.
- **360° tour** (optional): URL/file (see `26-virtual-tour.md`).
- **Floor plan** (optional): image upload.
- **States.** *uploading* (per-file progress), *success* (✓ thumbnail), *error* ("Failed — [Retry]"), *too-large* ("File is too large, max 10MB"), *bad-format* ("Only JPG/PNG/WebP").
- **Validation.** **Min 1 photo** (without a photo it won't publish — `[Continue →]` disabled).
- **Microcopy.** "Add photos" · subtext "The first photo will be the main one. Drag to reorder." · empty dropzone "Drag photos here or click to choose".

### 3.5 Step 5 — Price

- **Price `*`** + **Currency ▾** (AMD/RUB/USD/EUR). Input formatted with a thousands separator (52,000,000).
- **For rent.** "/month" suffix + "Utilities included?" toggle + Deposit (input) + Minimum rental term.
- **"Price negotiable" checkbox.** The property page shows a "Negotiable" badge.
- **Market hint** (Phase 2): "Average price for similar properties in this district: ~X ֏" (info chip, non-blocking).
- **Validation.** Price > 0, currency selected; for rent → deposit/term optional but validated if filled.
- **Microcopy.** "How much?" · negotiable label "Price is negotiable".

### 3.6 Step 6 — Contact & Preview

- **Contact.** Name (prefilled from profile) · Phone (prefilled, country-format validation) · "How should they reach you?" radio: Phone + chat / Chat only.
- **Preview.** **Live preview** of how the property page will look (gallery, price, key facts, description), embedded or via an "Open preview" modal.
- **Terms checkbox `*`.** "I agree to the terms" (link → terms).
- **Buttons.**
  - **[💾 Save as draft]** — status=draft, redirect to the dashboard "My listings", toast "Saved as draft".
  - **[🚀 Publish]** — primary green. Click → final full-form validation (all steps). Pass → `POST .../publish` → status=`active` (or `pending` if moderation is on) → redirect `/property/[id]/[slug]` + toast "Published 🎉". If moderation → "Submitted for review, usually within 24 hours".
- **Validation.** Terms required; if any prior step is incomplete, an inline summary "Complete: Step 4 — photo" + jump link.

### 3.7 Edit mode (`/listing/[id]/edit`)

- The same wizard, **pre-filled** with data (fetched via GET).
- Any step is directly accessible (no required order).
- Buttons: **[Save changes]** + **[Cancel]** (return without save).
- Editing an active listing may return it to `pending` (re-moderation, Phase 2).

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------------|
| **New (Step 1)** | Empty wizard, draft id is created on the first change |
| **Draft resume** | From dashboard → wizard pre-filled, at the last step |
| **Auto-saving** | Badge "💾 Saving…" → "Saved HH:MM" |
| **Auto-save fail** | "⚠ Not saved — retrying" (retry backoff) |
| **Step invalid** | Required fields highlighted, `[Continue]` disabled |
| **Upload in progress** | Per-file progress bar, `[Continue]` stays available after 1 ✓ photo |
| **Upload error** | "Failed to upload [Retry]" |
| **Limit reached** | Modal "5/5 free — deactivate / switch to Pro" |
| **Publishing** | Button spinner "Publishing…", fields locked |
| **Published** | Redirect to property page + toast "Published 🎉" |
| **Published (pending)** | Redirect + banner "Submitted for review ~24h" |
| **Leave attempt** | Confirm "Unsaved changes will be lost" |
| **Edit (not owner/404)** | "No access" / "Not found" + [To dashboard] |

---

## 5. Technical depth

### Component tree

```
<ListingWizard> (client — react-hook-form, multi-step)
 ├─ <WizardHeader autosaveStatus />
 ├─ <ProgressBar steps current onJump />
 ├─ <WizardSummary draft />                       (desktop sticky)
 ├─ <StepRouter step>
 │   ├─ <Step1TypeDeal />                          (card-select)
 │   ├─ <Step2Location />
 │   │   └─ <DraggablePinMap lat lng onMove />     (Mapbox)
 │   ├─ <Step3Details propertyType />              (conditional fields)
 │   ├─ <Step4Media />
 │   │   └─ <MediaUploader max=30 onReorder />     (drag-drop, signed URL)
 │   ├─ <Step5Price dealType />
 │   └─ <Step6ContactPreview />
 │       └─ <ListingPreview property />            (reuses property-detail blocks)
 ├─ <WizardNav onBack onNext canNext />            (fixed bottom mobile)
 └─ <PublishActions onDraft onPublish />           (Step 6)
```

### Data fields used (00-SPEC §7)

`properties`: `id, owner_id, title{hy,ru,en}, description{hy,ru,en}, deal_type, status(draft/pending/active), property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, country, region, city, district, address, lat, lng, hide_exact_address, amenities[], heating, condition, negotiable, updated_at` + `property_media` (`id, property_id, type, url, order`).

### API contracts

**`POST /api/listings`** (creates a draft on the first change)
```jsonc
// request  { "dealType": "sale", "propertyType": "apartment" }
// 201      { "id": 9001, "status": "draft" }
// 403      { "error": "limit_reached", "limit": 5, "active": 5 }   → upgrade modal
```

**`PATCH /api/listings/[id]`** (auto-save, every step)
```jsonc
// request (partial)  { "city": "Yerevan", "district": "Arabkir",
//                      "lat": 40.20, "lng": 44.49, "hideExact": false }
// 200      { "id": 9001, "status": "draft", "savedAt": "2026-06-23T12:04:11Z" }
// 422      { "error": "validation", "fields": { "area_m2": "must be > 0" } }
```

**`POST /api/listings/[id]/media`** (signed-URL flow)
```jsonc
// 1) request  { "fileName": "img1.jpg", "contentType": "image/jpeg", "size": 2400000 }
// 1) 200      { "uploadUrl": "https://storage/...signed", "mediaId": 51, "order": 0 }
// 2) PUT file → Storage; then confirm:
// POST .../media/51/confirm  → 200 { "url": "https://.../img1.webp", "thumb": "..." }
// 413 { "error": "file_too_large", "max": 10485760 }
// 415 { "error": "unsupported_type" }
```

**`POST /api/listings/[id]/publish`**
```jsonc
// 200      { "id": 9001, "status": "active", "slug": "yerevan-arabkir-2-senyak-bnakaran" }
// 200      { "id": 9001, "status": "pending" }   // moderation on
// 422      { "error": "incomplete", "missing": ["media", "price"] }
// 403      { "error": "limit_reached" }
```

### Validation (zod) — per-step + final

```ts
const step1 = z.object({
  dealType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["apartment","house","land","commercial","newdev","garage"]),
});
const step2 = z.object({
  country: z.string().default("AM"),
  city: z.string().min(1, "City is required"),
  district: z.string().optional(),
  address: z.string().max(200).optional(),
  lat: z.number(), lng: z.number(),              // pin required
  hideExact: z.boolean().default(false),
});
const step3 = z.object({
  areaM2: z.coerce.number().positive("Area is required"),
  rooms: z.coerce.number().int().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  title: z.object({ hy: z.string().min(5, "Title is too short").max(120) }),
  description: z.object({ hy: z.string().min(30, "Description is too short").max(5000) }),
  amenities: z.array(z.string()).optional(),
});
const step4 = z.object({
  media: z.array(z.object({ url: z.string().url(), order: z.number() }))
          .min(1, "Add at least 1 photo").max(30, "Maximum 30 photos"),
});
const step5 = z.object({
  price: z.coerce.number().positive("Price is required"),
  currency: z.enum(["AMD","RUB","USD","EUR"]),
  negotiable: z.boolean().default(false),
});
const step6 = z.object({
  contactName: z.string().min(2).max(50),
  contactPhone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Agreement is required" }) }),
});
const publishSchema = step1.merge(step2).merge(step3).merge(step4).merge(step5).merge(step6);
```

- **Ownership.** PATCH/publish checks `owner_id == current_user.id` (else 403).
- **Limits.** Active listings count: user → 5 (free), agent → by tier; checked in `POST /listings` and on publish.
- **Auto-save debounce 1.5s**; idempotent PATCH; optimistic badge, server-confirmed `savedAt`.

### Moderation (Phase 2)

- Publish → status=`pending` → admin queue (spam/duplicate/quality). Approve → `active`, Reject → `rejected` + reason to the owner (notification).
- In Phase 1: straight to `active` (moderation flag off).

---

## 6. Responsive

- **≥1024px (lg).** Centered form (`max-w-2xl`) + sticky summary sidebar (`w-72`); nav inline below the content; progress bar with full labels.
- **768–1023px (md).** Summary sidebar hidden; form full-width centered; progress bar compact.
- **<768px (sm).** Full-width; progress bar = "Step N/6" + dots; nav is a **fixed bottom bar** (`[← Back] [Continue →]`); map pin `h-[240px]`; media grid 2-col; multi-language tabs scroll-x.

---

## 7. Accessibility

- The wizard: `aria-label="Create a listing, step N of 6"`; progress bar: `role="progressbar" aria-valuenow`.
- After moving between steps, focus moves to the step title (`tabindex=-1`), and the screen reader announces the new step (`aria-live`).
- Each field: linked `<label htmlFor>`; errors via `aria-describedby` + `aria-invalid`; required ones via `aria-required`.
- Card-selects: `role="radio"`/`radiogroup`, keyboard ←/→ selection.
- Drag-drop reorder: keyboard fallback (↑/↓ button on each photo "Move up/down").
- Auto-save badge: `aria-live="polite"`; upload progress: `aria-valuenow`; touch target ≥ 44px.

---

## 8. SEO & meta

- The wizard is a **private flow** → `<meta name="robots" content="noindex, nofollow">` (`/sell/new`, `/listing/[id]/edit`).
- Draft/pending properties have no public property page (404/owner-only preview). Only `active` properties are indexable (see `03-property.md` §8).
- The `/sell` intro page (without the wizard, a marketing landing for guests) may be indexable; the wizard itself is not.
- Canonical/hreflang are irrelevant for the wizard (noindex).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `wizard_start` | `/sell/new` load | `entry_point, is_edit` |
| `wizard_step_view` | Step render | `step, listing_id` |
| `wizard_step_complete` | [Continue →] success | `step` |
| `wizard_step_back` | [← Back] | `step` |
| `draft_autosaved` | Auto-save success | `listing_id, step` |
| `media_upload` | Photo upload success | `listing_id, count` |
| `media_upload_error` | Upload failure | `listing_id, reason` |
| `media_reorder` | Reorder / cover change | `listing_id` |
| `limit_reached` | Active-limit modal | `limit, active` |
| `listing_saved_draft` | [💾 Draft] | `listing_id` |
| `listing_published` | [🚀 Publish] success | `listing_id, deal_type, property_type, status` |
| `publish_validation_fail` | Incomplete publish | `listing_id, missing[]` |
| `wizard_abandon` | Leave-warning confirm exit | `step, listing_id` |
