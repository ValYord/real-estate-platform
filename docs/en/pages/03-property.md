# Page 03 — Property Detail 🟢 Phase 1

> **Spec depth level.** Deep (v3, gold standard) — this is the template that the rest of the pages' specs will follow. Includes: overview, user scenarios, layout/sizes/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, analytics, SEO.

**URL.** `/property/[id]/[slug]` — example: `/hy/property/8423/yerevan-arabkir-2-senyak-bnakaran`
**Roles.** Everyone (Guest, User, Agent, Admin) can view; favorite/contact/report actions require login (Guest → login modal with `?next`).
**Primary goal (conversion).** The visitor views the property and **makes contact with the seller** — sends a message or reveals the phone number. Every element of the page serves this single goal.

---

## 0. Overview

This is the site's **most important conversion page**. The search page brings a person here, and it's right here that it's decided whether they will contact the seller or leave. So the page must: (1) quickly show the essentials (photo + price + key facts) without scrolling, (2) build trust (verified badge, agent rating, complete information), and (3) keep the **"Make contact"** action within reach at all times (sticky contact card on desktop, fixed bottom bar on mobile).

The page has **two modes**.
- **Visitor view** — someone else's property (default mode). In the right column: a contact card for getting in touch with the seller.
- **Owner view** — the visitor's own property (`owner_id == current_user.id`). Instead of the contact card, a management bar is shown (edit / analytics / delete).

The page is rendered with **SSR** (Server Component) for SEO and a fast first paint; the interactive sections (gallery lightbox, map, contact form, similar) are client components.

---

## 1. User scenarios

**Scenario A — Buyer Aram (mobile).** Aram clicked a property link from Facebook. The page opens on his phone. He sees the first photo full-width, swipes 8 photos, taps the 360° tab and rotates the room. Scrolling, he reads the description and sees the map. From the fixed bottom bar he taps **"📞 Call"**, the number opens in the phone dialer. → The lead is recorded (`phone_revealed` event).

**Scenario B — Renter Maria (desktop).** Maria is comparing 3 apartments. On this page she clicks the **♡** and adds it to favorites (toast "Added to favorites"). She reads the amenities, sees "Furnished ✓". From the contact card on the right she writes: "Hi, is a viewing possible on Saturday?". → A conversation is created, an email notification went to the seller.

**Scenario C — Owner Davit (owner view).** Davit opens his listing to check it. Instead of the contact card he sees **"📊 1,240 views · 18 favorites · 3 messages"** + an **"✏️ Edit"** button. He notices the price is out of date, clicks edit, and goes to the corresponding step of the listing wizard.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — two-column

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16 / 64px)                                │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs (h-10, text-sm, text-gray-500)                  │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ MAIN COLUMN (≈62%, max-w-760)  │ ► SIDEBAR (≈38%, w-380)  │
│                                   │                          │
│ ┌─── Photo gallery ───┐          │ ┌── Contact card ──┐     │
│ │ 1 large + 2×2 small  │          │ │ (sticky top-20)   │     │
│ │ h-[480px] rounded-xl │          │ │ avatar + name     │     │
│ └─────────────────────┘          │ │ ⭐ rating         │     │
│ [📷][🎥][🌐 360°][🗺][📐] tabs   │ │ [💬 Message]      │     │
│ Price (text-3xl bold)            │ │ [📞 Phone]        │     │
│ H1 title + 📍 address            │ │ quick form        │     │
│ Key facts row (icons)            │ │ anti-spam note    │     │
│ ── Description ──                 │ └──────────────────┘     │
│ ── Details (dl table)            │                          │
│ ── Amenities (grid) ──           │  (the card stays sticky  │
│ ── Floor plan ──                 │   with the scroll until  │
│ ── Map (h-[360px]) ──            │   it reaches the footer) │
│ ── Mortgage mini-calc ──         │                          │
├──────────────────────────────────┴─────────────────────────┤
│ Similar properties (carousel, full-width)                   │
│ Recently viewed (carousel)                                  │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — single column

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ Gallery (full-bleed,     │
│ swipe, h-[280px])  ♡ ⤴ ⚑ │
├──────────────────────────┤
│ Price text-2xl           │
│ H1 + 📍                  │
│ Key facts (wrap)         │
│ Description              │
│ Details                  │
│ Amenities                │
│ Map h-[260px]            │
│ Mortgage mini            │
│ Similar (scroll-x)       │
│ FOOTER                   │
├──────────────────────────┤
│ FIXED BOTTOM BAR (h-18)  │
│ [💬 Message] [📞 Call]  ♡│
└──────────────────────────┘
```

- The gallery is a full-width swipeable carousel, `h-[280px]`.
- The contact card **does not** become sticky at the top; instead, at the bottom there is a **fixed bottom bar** (`h-18 / 72px`, `bg-white border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`): `[💬 Message] [📞 Call]` + ♡.
- All sections stack one under another, full-width.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Price | `text-3xl font-bold text-gray-900` (rent: + `text-base font-normal text-gray-500` "/month") |
| Original currency (secondary) | `text-sm text-gray-400` (e.g. "≈ $880") |
| H1 title | `text-2xl font-semibold text-gray-900 leading-tight` |
| Section heading (H2) | `text-xl font-semibold`, above it `border-t border-gray-200 pt-6 mt-6` |
| Key facts icon | `w-5 h-5 text-gray-600`, row: `flex flex-wrap gap-6` |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium hover:bg-primary/90` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full hover:bg-primary/5` |
| Badge NEW | `bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md` |
| Badge REDUCED | `bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-md` |
| Badge FEATURED | `bg-amber-100 text-amber-700` |
| Badge Verified | `bg-blue-50 text-blue-600` + ✓ |
| Card shadow | `shadow-sm border border-gray-200 rounded-xl` |
| Gap between sections | `space-y-6` (24px) |
| Skeleton | `bg-gray-100 animate-pulse rounded-lg` |

---

## 3. Section-by-section

### 3.1 Breadcrumbs

- **Appearance.** `text-sm text-gray-500`, separator `›` (`text-gray-300`), hover: `text-primary underline`.
- **Content.** `Home › Yerevan › Arabkir › 2-room apartment`
- **Behavior.** Each segment is a link → the corresponding search (`/search?city=Yerevan`, `/search?city=Yerevan&district=Arabkir`). The last segment (the current property): active, `text-gray-700`, not clickable.
- **Mobile.** Only the last 2 segments are shown, with a `‹ Back` link (instead of browser back: a return to search).
- **Tech.** Rendered with `BreadcrumbList` structured data (schema.org).

### 3.2 Photo Gallery

- **Appearance (desktop).** Grid: 1 large on the left (60% width) + 2×2 small on the right. `h-[480px] rounded-xl overflow-hidden gap-2`. On the bottom-right small photo: a `"+25 photos"` overlay (`bg-black/50 text-white text-sm font-medium`).
- **Controls overlay (top-right, `absolute top-4 right-4`).** 3 round buttons (`w-10 h-10 rounded-full bg-white/90 backdrop-blur`):
  - **♡ Save** — toggle. States: default (outline ♡ `text-gray-700`), active (filled ❤️ `text-red-500`), hover (`scale-105`), loading (spinner). Guest → login modal. After click: optimistic toggle + toast "Added to favorites" / "Removed from favorites".
  - **⤴ Share** — opens a share modal: link copy (toast "Link copied"), Facebook, Telegram, WhatsApp, Email (`mailto:`).
  - **⚑ Report** — report modal: radio reason (Fake listing / Already sold / Incorrect information / Spam) + optional textarea → admin queue (`POST .../report`).
- **Media tabs (below the gallery).** `[📷 Photos (29)] [🎥 Video] [🌐 360°] [🗺 Map] [📐 Floor plan]` — a tab is disabled (`text-gray-300 cursor-not-allowed`) if that media is missing. Active tab: `border-b-2 border-primary text-primary`.
- **Click on the large photo** → full-screen **lightbox**: `bg-black/95`, ←/→ navigation, ESC to close, pinch/scroll zoom, thumbnail strip at the bottom, counter "5 / 29". Focus trap inside the lightbox.
- **States.**
  - *Loading*: gray skeleton blocks with shimmer animation.
  - *Only 1 photo*: full-width, without the grid (`h-[420px]`).
  - *0 photos* (shouldn't happen, but a guard): placeholder "No photos" with an icon.
- **Tech.** `<PropertyGallery media={Media[]} />`. `next/image` lazy-load; the first (LCP) photo: `priority`. The lightbox is a client component, lazy-loaded (`dynamic(() => ..., { ssr: false })`).

### 3.3 Main info block

- **Price.** `text-3xl font-bold`. Displayed in the selected currency (from the header currency switcher). Rent: "350,000 ֏ /month". Beside it in small: the original currency, if it differs ("≈ $880").
  - **Price history.** If the price has dropped: a red chip "↓ 5% — was 4,200,000 ֏" + sparkline (Phase 2).
- **Title (H1).** `text-2xl font-semibold`. Example: "2-room apartment in Arabkir". In the selected language (`title[locale]`).
- **Address.** `text-gray-600` + 📍 icon + a `"On the map"` anchor (smooth scroll to the map). If the owner hid the exact address (`hideExact: true`): only the district is shown — "Arabkir, Yerevan".
- **Key facts row.** Horizontal icons (`flex flex-wrap gap-6`): 🛏 3 beds · 🛁 2 baths · 📐 75 m² · 🏢 floor 4/9 · 📅 2018 · 🏷 Apartment. Null fields are skipped.
- **Badges.** NEW (`created_at` ≤ 7 days) · FEATURED (`is_featured`) · ✓ Verified (the owner is a verified agent).
- **Status banner.**
  - *Active*: no banner is shown.
  - *Pending*: yellow banner "Moderation in progress".
  - *Sold/Rented*: a dark overlay on the gallery + banner "This property is no longer available"; the contact CTAs disabled.

### 3.4 Body sections

**Description.** Full text (`whitespace-pre-line text-gray-700 leading-relaxed`), max 4 lines collapsed → "Read more ▾" / "Show less ▴" toggle. In the selected language; if there is no text in that language: a fallback to another language + a badge "Auto-translated" (Phase 2).

**Details.** A 2-column `dl` table (mobile: 1 column). Each row: label (`text-gray-500`) + value (`text-gray-900 font-medium`): Type · Condition · Heating · Balcony · Storage · Building material · Documents (ownership/cadastre). Only the filled fields are shown (nulls: hidden).

**Amenities.** Icon grid 3–4 columns (`grid grid-cols-2 md:grid-cols-4 gap-3`), ✓ green icon + label: Parking · Elevator · Furniture · Air conditioning · Security · Balcony · Internet. Missing amenities are not shown (or: a gray ✗ with a "Show all" toggle).

**Floor plan.** A photo (if there is one) → click to zoom in the lightbox. If there is none: the whole section is skipped (an empty heading is not shown).

**Map + neighborhood.** Embedded Mapbox `h-[360px] rounded-xl`, a 📍 pin on the property. If the owner hid the address: a circle is shown (approximate, ~300m radius) instead of an exact pin. Below it, "What's nearby" chips (school, store, transport — Phase 3).

**Mortgage mini-calc.** A card: "Approximate monthly payment ~X ֏/month", calculated from this price, 20% down payment, 10 years, 14% interest rate (default). Changing the sliders updates it in place (local state, without an API). → link "Detailed calculator" → `/mortgage/calculators?price=...&currency=...`.

### 3.5 Contact card (sidebar) — **the conversion core**

- **Appearance.** `shadow-sm border border-gray-200 rounded-xl p-5`, sticky `top-20`.
- **Header.** Avatar (`w-12 h-12 rounded-full`) + name + (if agent) agency name + ✓ Verified badge + ⭐ 4.8 (12). The whole block is clickable → agent profile (`/agent/[slug]`).
- **CTA buttons.**
  - **[💬 Send a message]** primary, full-width `h-12`. Guest → login modal (preserving `?next`). Logged-in → opens a thread, prefilled with "Hi, I'm interested in this property (#8423)". → `POST /api/conversations`.
  - **[📞 Show phone]** secondary. Click → reveals `+374 XX XXX XXX` + `tel:` link + `phone_revealed` event (lead++). For an anonymous visitor: a captcha once per session.
  - **[📅 Book a viewing]** (Phase 2) — calendar modal (day/time selection).
- **Quick form.** Name · Phone · Textarea (prefilled) · [Send]. Inline validation. Success: green "Sent — the seller will get in touch".
- **Anti-spam.** Rate-limit (5 messages/hour/user), captcha for Guests, honeypot hidden field, server-side dedupe.

### 3.6 Owner manage bar (owner view)

- Instead of the contact card (`owner_id == current_user`): `shadow-sm border rounded-xl p-5`.
- **Stats row.** "📊 1,240 views · 18 favorites · 3 messages" (live `views_count`).
- **Buttons.** **[✏️ Edit]** (→ `/listing/[id]/edit`) · **[⏸ Deactivate]** · **[🗑 Delete]** (confirm modal "Confirm deletion?").
- Status-appropriate microcopy: Pending: "Moderation in progress, usually within 24 hours".

### 3.7 Similar + Recently viewed

- **Similar properties.** "Similar properties" — a horizontal carousel, 4 PropertyCards, ←/→ arrows. Algorithm: same city + ±20% price + same property_type, limit 8. `GET .../similar`.
- **Recently viewed** (logged-in or localStorage): the last 6 viewed properties. Rendered client-side.

---

## 4. Page states

| State | What is displayed |
|-------|---------------------|
| **Loading** | Skeleton: gallery blocks + price bar + key facts bars + sidebar card outline (shimmer animation) |
| **Loaded (visitor)** | Full page + contact card on the right / fixed bottom bar on mobile |
| **Loaded (owner)** | Owner manage bar instead of the contact card |
| **404 / deleted** | "Property not found" illustration + [To search] button |
| **Sold / Rented** | A dark overlay on the gallery + banner "No longer available" + the similar ones active |
| **Pending (owner)** | Yellow banner "Still under admin review" |
| **Error (API fail)** | "Something went wrong" + [Retry] button |
| **Offline** | Cached version (PWA, Phase 4) or offline banner "No connection" |

---

## 5. Technical depth

### Component tree

```
<PropertyDetailPage> (Server Component, SSR)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <PropertyGallery media={Media[]} title city />
 │   └─ <Lightbox /> (client, lazy, ssr:false)
 ├─ <PropertyMainInfo property={Property} displayCurrency />
 ├─ <PropertyDescription text={string} locale />
 ├─ <PropertyDetailsTable details={Detail[]} />
 ├─ <AmenitiesGrid amenities={string[]} />
 ├─ <FloorPlan url={string|null} />
 ├─ <PropertyMap lat lng hideExact />           (client)
 ├─ <MortgageMiniCalc price currency />          (client, local state)
 ├─ <ContactCard owner={Owner} propertyId />     (client)
 │   └─ <OwnerManageBar property={Property} />   (conditional: isOwner)
 ├─ <SimilarProperties propertyId />             (client, React Query)
 └─ <RecentlyViewed />                           (client, localStorage)
```

### Data fields used (Property entity — see 00-SPEC §7)

`id, slug, title{hy,ru,en}, description{hy,ru,en}, deal_type, status, property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, country, region, city, district, address, lat, lng, hide_exact_address, amenities[], heating, condition, views_count, is_featured, created_at, owner{id, name, avatar, phone, role, agent{agency, verified, rating, reviews_count}}`

### API contracts

**`GET /api/properties/[id]`**
```jsonc
// 200 OK
{
  "id": 8423,
  "slug": "yerevan-arabkir-2-senyak-bnakaran",
  "dealType": "sale",
  "status": "active",
  "price": 52000000, "currency": "AMD",
  "title": { "hy": "2 սենյականոց բնակարան", "ru": "...", "en": "..." },
  "description": { "hy": "...", "ru": "...", "en": "..." },
  "area": 75, "rooms": 2, "bedrooms": 2, "bathrooms": 1,
  "floor": 4, "floorsTotal": 9, "yearBuilt": 2018,
  "location": { "city": "Yerevan", "district": "Arabkir",
                "lat": 40.20, "lng": 44.49, "hideExact": false },
  "amenities": ["parking", "elevator", "furniture"],
  "media": [
    { "type": "photo", "url": "...", "order": 0 },
    { "type": "tour360", "url": "..." }
  ],
  "owner": {
    "id": 12, "name": "Davit", "avatar": "...", "role": "agent",
    "agent": { "agency": "X Realty", "verified": true, "rating": 4.8, "reviews": 12 }
  },
  "viewsCount": 1240,
  "isOwner": false
}
// 404 { "error": "not_found" }
```

**`POST /api/conversations`**
```jsonc
// request  { "propertyId": 8423, "message": "Hi, is a viewing possible on Saturday?" }
// 201      { "conversationId": 551 }
// 401      { "error": "auth_required" }   → login modal
// 429      { "error": "rate_limited" }    → toast "Too many messages"
```

**`POST /api/favorites`** → `{ "propertyId": 8423 }` → toggle → `200 { "favorited": true }`

**`POST /api/properties/[id]/report`** → `{ "reason": "sold", "note": "..." }` → `202 Accepted`

**`GET /api/properties/[id]/similar`** → `200 { "items": PropertyCard[] }` (max 8)

### Validation (zod)

```ts
const contactSchema = z.object({
  name: z.string().min(2, "Name is required").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  message: z.string().min(5, "The message is too short").max(1000),
  // honeypot — must stay empty
  website: z.string().max(0).optional(),
});
```

- View count: +1 server-side, unique by `session_id + property_id` (24h dedupe).
- Favorite/report/conversation: all require auth (401 → login modal with `?next`).

---

## 6. Responsive

- **≥1024px (lg).** Two-column layout, sticky sidebar (`top-20`), gallery grid 1+2×2.
- **768–1023px (md).** Single column; the contact card: inline after the gallery (not sticky) + fixed bottom bar.
- **<768px (sm).** Gallery full-bleed swipe; all sections stack; **fixed bottom bar** (💬 / 📞 / ♡); breadcrumbs collapsed: "‹ Back".

---

## 7. Accessibility

- Gallery: alt text for each photo (`{title} — {city}, photo {n}`), keyboard ←/→ navigation, focus trap in the lightbox, ESC to close.
- All icon-only buttons: `aria-label` (♡ = "Add to favorites", ⤴ = "Share", ⚑ = "Report").
- Status banners: `role="status"`; errors: `role="alert"`.
- Contrast ≥ 4.5:1 for all text; touch target ≥ 44px (the CTAs `h-12`).
- The map: `aria-label` + tab-accessible controls; "Open in Google Maps" fallback link.

---

## 8. SEO & meta

- `<title>` = "{title} — {city}, {price} | {brand}"; `<meta name="description">` = the first 155 chars of the description.
- OG image: the first photo + price overlay (dynamic `/api/og?id=8423`).
- Structured data (JSON-LD): `RealEstateListing` + `Offer` (price, currency, availability) + `geo` (lat/lng) + `BreadcrumbList`.
- `hreflang` (hy/ru/en), `canonical` (with the slug: `/property/8423/...`).
- Sold/deleted property: `noindex` (but no 301, so that we can show the similar ones).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `property_view` | Page load (dedupe 24h) | `property_id` |
| `gallery_open_lightbox` | Lightbox open | `property_id` |
| `tour360_open` | 360° tab click | `property_id` |
| `favorite_add` / `favorite_remove` | ♡ toggle | `property_id` |
| `contact_message_sent` | Conversation creation | `property_id, conversation_id` |
| `phone_revealed` | Phone reveal | `property_id` |
| `share_clicked` | Share modal action | `property_id, channel` |
| `similar_clicked` | Similar card click | `property_id, target_id` |
| `mortgage_calc_used` | Slider change | `property_id` |
