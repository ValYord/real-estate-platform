# 🏠 Real Estate Platform — Complete Product Spec

> **Working name.** Real Estate Company (brand/name to be chosen later)
> **Type.** International real-estate buy/sell/rent platform (Zillow / Realtor.com style)
> **Status.** Design / Spec phase
> **Date.** 2026-06-20
> **Language.** Armenian + English technical terms

---

## 📑 Table of Contents

1. [Vision and business model](#1-vision-and-business-model)
2. [Target market, languages, currencies](#2-target-market-languages-currencies)
3. [User types (Roles)](#3-user-types-roles)
4. [Tech Stack](#4-tech-stack)
5. [Complete Sitemap](#5-complete-sitemap)
6. [Build phases (Roadmap)](#6-build-phases-roadmap)
7. [Data Model](#7-data-model)
8. [Design System](#8-design-system)
9. [Shared elements (Header / Footer)](#9-shared-elements)
10. [Page-by-Page Spec](./pages/) — in separate files
11. [Next steps](#11-next-steps)

---

## 1. Vision and business model

### What we are building
A real-estate **listing marketplace**, where:
- People post properties for sale or rent
- Buyers/renters search, filter, save favorites, and make contact
- Agents have a professional profile + paid tools

### Business model (chosen: A + C)
**Catalog model (marketplace).** The transaction (money, contract, handover of keys) happens **outside** the platform. The platform connects buyer and seller, but **does not participate in the financial transaction**.

> ⚠️ **Important.** We do **NOT** do escrow/payment/holding money (Model B): that requires financial licenses in every country. Zillow and Realtor.com don't do it directly either.

### How we make money (Monetization)
| Source | Description | Phase |
|---------|----------------|------|
| **Pro subscription** | Agents pay monthly for more listings, analytics, and a badge | Phase 2 |
| **Promoted listings** | A listing appears at the top / as "Featured" | Phase 2 |
| **Advertising (Ads/Banners)** | Banks, construction companies | Phase 3 |
| **Lead generation** | Paid leads for agents | Phase 3 |

---

## 2. Target market, languages, currencies

### Geography
- **Phase 1.** Armenia (Yerevan + regions)
- **Phase 2.** Former USSR Russian-speaking countries (Russia, Georgia, Kazakhstan, Belarus, Ukraine, etc.)
- The system is built **multi-country** from the start — every property has a `country` field

### Languages (trilingual from the start)
- 🇦🇲 Armenian (hy)
- 🇷🇺 Russian (ru)
- 🇬🇧 English (en)
- **Technically.** `next-intl`, via URL: `/hy/...`, `/ru/...`, `/en/...`. Default based on browser language, manually switchable from the header.

### Currencies
- AMD (֏), RUB (₽), USD ($), EUR (€)
- The property price is stored **in its original currency** + displayed converted (live exchange rate API)
- The user selects the display currency from the header

---

## 3. User types (Roles)

Chosen model: **C** (everyone can post, agents have Pro):

| Role | Who | What they can do |
|------|------|------------------|
| **Guest** (anonymous) | Unregistered visitor | Search, view properties, use the calculator. Cannot save/message/post |
| **User** (regular) | Registered person | Everything + favorites, saved searches, messages, post properties (limited count) |
| **Agent / Pro** | Agent/agency | User + many listings, Pro profile, analytics, promoted listings, bulk upload |
| **Admin** | You / team | Moderation, users, property approval, complaints, analytics |

**Trust/Verification.** Email + phone verification for everyone. For agents, additionally: license/document (Phase 2).

---

## 4. Tech Stack

| Layer | Technology | Why |
|------|-----------|-------|
| **Framework** | Next.js 15 (App Router) + React + TypeScript | SSR/SEO, professional standard |
| **Styling** | Tailwind CSS + shadcn/ui | Fast, consistent, professional UI |
| **Database** | PostgreSQL (via Supabase) + PostGIS | Geolocation for search |
| **Auth** | Supabase Auth (email, phone, Google OAuth) | Registration/login |
| **File storage** | Supabase Storage / Cloudinary | Photos, 360° tours, video |
| **Maps** | Mapbox GL JS (or MapLibre + OSM, free) | Map + clustering |
| **i18n** | next-intl | Trilingual |
| **Search** | Postgres full-text + filters → later Meilisearch | Fast search |
| **Image optimize** | next/image | Fast loading |
| **Forms** | react-hook-form + zod | Validation |
| **State** | React Query (server state) + Zustand (UI) | Data management |
| **Email** | Resend / Supabase | Notifications, alerts |
| **Hosting** | Vercel (web) + Supabase (backend) | Free start, scalable |
| **Payments** (Phase 2) | Stripe / local provider | Pro subscriptions |
| **Mobile** (later) | React Native (Expo) | iOS + Android, same API |
| **Analytics** | Plausible / PostHog | User behavior |

### Architecture (high-level)
```
[Browser / Mobile App]
        │  HTTPS
        ▼
[Next.js (Vercel)] ── SSR pages + API routes
        │
        ▼
[Supabase] ── PostgreSQL + Auth + Storage + Realtime
        │
        ├── Mapbox (map)
        ├── Exchange Rate API (currency)
        ├── Resend (email)
        └── Stripe (payment, Phase 2)
```

---

## 5. Complete Sitemap

### Top Navigation (Header menu)
```
BUY ▾ | SELL ▾ | RENT ▾ | MORTGAGE ▾ | FIND AN AGENT ▾ | NEWS & GUIDES ▾    [♡] [🔔] [Lang ▾] [Currency ▾] [Profile ▾ / Sign in]
```

### 26 Master Page Templates

| # | Page Template | URL (example) | Roles | Phase | Spec file |
|---|---------------|--------------|-------|-------|-----------|
| 1 | **Home** | `/` | All | 🟢 P1 | `pages/01-home.md` |
| 2 | **Search results + Map** | `/search`, `/buy`, `/rent` | All | 🟢 P1 | `pages/02-search.md` |
| 3 | **Property detail** | `/property/[id]` | All | 🟢 P1 | `pages/03-property.md` |
| 4 | **Create/Edit listing wizard** | `/sell/new`, `/listing/[id]/edit` | User+ | 🟢 P1 | `pages/04-listing-wizard.md` |
| 5 | **Auth** (login/register/reset/verify) | `/auth/*` | Guest | 🟢 P1 | `pages/05-auth.md` |
| 6 | **User Dashboard** | `/dashboard` | User+ | 🟢 P1 | `pages/06-dashboard.md` |
| 7 | **Favorites / Saved listings** | `/favorites` | User+ | 🟢 P1 | `pages/07-favorites.md` |
| 8 | **Saved searches + Alerts** | `/saved-searches` | User+ | 🟡 P2 | `pages/08-saved-searches.md` |
| 9 | **Messages / Inbox** | `/messages` | User+ | 🟢 P1 | `pages/09-messages.md` |
| 10 | **Agent / Agency profile** | `/agent/[slug]` | All | 🟡 P2 | `pages/10-agent-profile.md` |
| 11 | **Find an Agent** (catalog + compare) | `/agents` | All | 🟡 P2 | `pages/11-find-agent.md` |
| 12 | **Home Value tool** ("Zestimate") | `/home-value` | All | 🟡 P2 | `pages/12-home-value.md` |
| 13 | **Mortgage calculators hub** | `/mortgage/calculators` | All | 🟡 P2 | `pages/13-mortgage-calc.md` |
| 14 | **Mortgage rates** | `/mortgage/rates` | All | 🔵 P3 | `pages/14-mortgage-rates.md` |
| 15 | **Blog / News system + article** | `/news`, `/news/[slug]` | All | 🟡 P2 | `pages/15-blog.md` |
| 16 | **Guides / Resource center** | `/guides`, `/guides/[slug]` | All | 🟡 P2 | `pages/16-guides.md` |
| 17 | **Pricing / Advertise (Pro)** | `/pro`, `/advertise` | All | 🟡 P2 | `pages/17-pricing.md` |
| 18 | **Pro Dashboard + Analytics** | `/pro/dashboard` | Agent | 🔵 P3 | `pages/18-pro-dashboard.md` |
| 19 | **Landlord tools** (screen, lease, rent) | `/landlord/*` | User+ | 🔵 P3 | `pages/19-landlord.md` |
| 20 | **Neighborhood / Market trends** | `/neighborhood/[area]` | All | 🔵 P3 | `pages/20-neighborhood.md` |
| 21 | **Settings** | `/settings` | User+ | 🟢 P1 | `pages/21-settings.md` |
| 22 | **Notifications** | `/notifications` | User+ | 🟢 P1 | `pages/22-notifications.md` |
| 23 | **Static** (About/Contact/FAQ/Terms/Privacy) | `/about` ... | All | 🟢 P1 | `pages/23-static.md` |
| 24 | **Admin panel** | `/admin/*` | Admin | 🟡 P2 | `pages/24-admin.md` |
| 25 | **Compare properties** | `/compare` | All | 🟡 P2 | `pages/25-compare.md` |
| 26 | **VR / 360° Virtual tour** | (part of property) | All | 🟡 P2 | `pages/26-virtual-tour.md` |

🟢 **Phase 1 (CORE)** = 13 pages, a real working site
🟡 **Phase 2 (GROWTH)** = +10 pages
🔵 **Phase 3 (ADVANCED)** = +3 pages

---

## 6. Build phases (Roadmap)

### 🟢 Phase 1 — MVP (Working site)
**Goal.** A person can post a property, another can search, view, save, message.
1. Setup (Next.js, Supabase, Tailwind, i18n, deploy pipeline)
2. Data model + auth
3. Header/Footer + design system
4. Home → Search+Map → Property detail (viewing flow)
5. Listing wizard (posting flow)
6. Dashboard + My listings + Favorites + Messages
7. Settings + Notifications + Static pages
8. Trilingual + responsive + SEO basics
→ **Result.** A real, usable site for Armenia.

### 🟡 Phase 2 — Growth
Agent profiles + Find an Agent, Pricing/Pro, Saved searches+alerts, Blog/Guides (SEO), Home value tool, Mortgage calculators, Compare, 360° tours, Admin panel, Payments (Stripe).

### 🔵 Phase 3 — Advanced + Scale
Mortgage rates, Pro analytics, Landlord tools, Neighborhood/market trends, Meilisearch, multi-country rollout (Russia/CIS).

### 📱 Phase 4 — Mobile App
React Native (Expo), with the same Supabase backend, push notifications.

---

## 7. Data Model

The main entities (simplified).

```
users
  id, role(guest/user/agent/admin), name, email, phone,
  avatar_url, lang, currency, email_verified, phone_verified,
  created_at

agents (extends user)
  user_id, agency_name, license_no, bio, rating, reviews_count,
  verified, subscription_tier(free/pro/premium)

properties
  id, owner_id, title{hy,ru,en}, description{hy,ru,en},
  deal_type(sale/rent), status(active/pending/sold/draft/archived),
  property_type(apartment/house/land/commercial/...),
  price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total,
  year_built, country, region, city, address, lat, lng,
  amenities[], created_at, updated_at, views_count, is_featured

property_media
  id, property_id, type(photo/video/tour360), url, order

favorites
  user_id, property_id, created_at

saved_searches
  id, user_id, filters(json), alert_frequency(instant/daily/weekly)

messages / conversations
  conversation_id, property_id, buyer_id, seller_id,
  message_id, sender_id, body, read, created_at

notifications
  id, user_id, type, payload(json), read, created_at

reviews (agent)
  id, agent_id, author_id, rating, text, created_at

blog_posts
  id, slug, title{hy,ru,en}, body{hy,ru,en}, cover, category,
  author_id, published_at

reports (moderation)
  id, property_id/user_id, reason, status, created_at
```

For geographic search: `properties.lat/lng` + PostGIS index (geo radius search, map bounds).

---

## 8. Design System

> Details in `docs/DESIGN-SYSTEM.md` (separate file)

- **Style.** Clean, light, professional (like Zillow/Realtor): lots of white space, large photos
- **Primary color.** (to be chosen — e.g. green or blue; Realtor=red, Zillow=blue)
- **Typeface.** Inter / system fonts (with Armenian+Russian+Latin support)
- **Components.** Button, Input, Card (property card), Modal, Dropdown, Tabs, Map, Gallery, Badge, Toast
- **Responsive.** Mobile-first, breakpoints: sm/md/lg/xl
- **Property Card** (the most important recurring component): photo (slider), price, ♡, rooms/area/floor, address, badge (NEW/REDUCED/FEATURED)

---

## 9. Shared elements

### Header (on every page)
**Left.** Logo (→ Home)
**Center (desktop).** BUY ▾ · SELL ▾ · RENT ▾ · MORTGAGE ▾ · FIND AN AGENT ▾ · NEWS & GUIDES ▾ (mega-menu dropdowns)
**Right.**
- 🔍 (search icon on mobile)
- ♡ Favorites (→ `/favorites`, preview on hover)
- 🔔 Notifications (count badge)
- 🌐 Lang switcher (HY/RU/EN)
- 💱 Currency switcher (AMD/RUB/USD/EUR)
- **"Post a property"** (Primary button → wizard)
- 👤 Profile ▾ (Sign in/up | or: Dashboard, My listings, Settings, Sign out)

### Mega-menu content (modeled on realtor.com)
- **BUY ▾** → Properties for sale · New construction · Foreclosed · Open houses · Market trends · Buyer tips
- **SELL ▾** → "What's my home worth" · Selling tools · Selling tips · Recently sold
- **RENT ▾** → Apartments for rent · Renter tools · Landlord tools · Renting tips
- **MORTGAGE ▾** → Calculators · Rates · Pre-approval · Finance tips
- **FIND AN AGENT ▾** → Find an agent · Compare · Teams/companies · Why an agent
- **NEWS & GUIDES ▾** → News · Insights · Guides · Videos

### Footer (on every page)
4-5 columns:
1. **Company.** About us, Careers, Contact, Press
2. **Buyer/Seller.** Buy, Sell, Rent, Mortgage
3. **Resources.** Guides, Blog, FAQ, Help center
4. **Legal.** Terms, Privacy, Cookie policy
5. **Contact.** Social networks, App Store/Google Play badge (Phase 4), Lang/Currency

---

## 11. Next steps

1. ✅ This document (done)
2. ⏭️ **Page-by-page detailed spec** (`docs/pages/` — each page a separate file, what each button does)
3. ⏭️ Design system + wireframes (mockups)
4. ⏭️ Implementation plan (with the writing-plans skill)
5. ⏭️ Phase 1 build

---

*This document was compiled step by step as a result of brainstorming. It is updated as work proceeds.*
