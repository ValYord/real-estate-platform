# 🏠 Real Estate Platform — Ամբողջական Արտադրանքի Փաստաթուղթ (Product Spec)

> **Աշխատանքային անվանում.** Real Estate Company (հետո կընտրենք բրենդ/անուն)
> **Տիպ.** Միջազգային անշարժ գույքի առք/վաճառք/վարձ հարթակ (Zillow / Realtor.com-ի ոճով)
> **Կարգավիճակ.** Նախագծման փուլ (Design / Spec)
> **Ամսաթիվ.** 2026-06-20
> **Լեզու.** Հայերեն + անգլերեն տեխնիկական տերմիններ

---

## 📑 Բովանդակություն

1. [Տեսլական և բիզնես մոդել](#1-տեսլական-և-բիզնес-մոդել)
2. [Թիրախ շուկա, լեզուներ, արժույթներ](#2-թիրախ-շուկա-լեզուներ-արժույթներ)
3. [Օգտատերերի տիպերը (Roles)](#3-օգտատերերի-տիպերը-roles)
4. [Տեխնոլոգիական ստեկ (Tech Stack)](#4-տեխնոլոգիական-ստեկ-tech-stack)
5. [Ամբողջական Sitemap](#5-ամբողջական-sitemap)
6. [Կառուցման փուլերը (Roadmap)](#6-կառուցման-փուլերը-roadmap)
7. [Տվյալների մոդել (Data Model)](#7-տվյալների-մոդել-data-model)
8. [Դիզայն համակարգ (Design System)](#8-դիզայն-համակարգ-design-system)
9. [Ընդհանուր տարրեր (Header / Footer)](#9-ընդհանուր-տարրեր)
10. [Էջ առ էջ մանրամասն (Page-by-Page Spec)](./pages/) — առանձin ֆայլերում
11. [Հաջորդ քայլերը](#11-հաջորդ-քայլերը)

---

## 1. Տեսլական և բիզնес մոդել

### Ի՞նչ ենք կառուցում
Անշարժ գույքի **հայտարարությունների հարթակ (listing marketplace)**, որտեղ՝
- Մարդիկ տեղադրում են վաճառվող կամ վարձով տրվող գույք
- Գնորդ/վարձակալները որոնում են, ֆիլտրում, պահում favorites, կապ հաստատում
- Գործակալները (agents) ունեն պրոֆեսիոնալ պրոֆիլ + վճարովի գործիքներ

### Բիզնես մոդելը (ընտրված՝ A + C)
**Կատալոգ մոդել (marketplace).** Գործարքը (փող, պայմանագիր, բանալիների փոխանցում) տեղի է ունենում հարթակից **դուրս**։ Հարթակը կապ է հաստատում գնորդի և վաճառողի միջև, բայց **չի մասնակցում ֆինանսական գործարքին**։

> ⚠️ **Կարևոր.** Մենք **ՉԵՆՔ** escrow/վճարում/փող պահում անում (Model B): դա պահանջում է ֆինանսական լիցենզիաներ ամեն երկրում։ Zillow-ն ու Realtor.com-ն էլ դա չեն անում ուղիղ։

### Ինչպես ենք փող աշխատելու (Monetization)
| Աղբյուր | Նկարագրություն | Փուլ |
|---------|----------------|------|
| **Pro բաժանորդագրություն** | Գործակալները վճարում են ամսական՝ շատ հայտարարության, վիճակագրության, badge-ի համար | Phase 2 |
| **Promoted listings** | Հայտարարությունը հայտնվում է վերևում / «Featured» | Phase 2 |
| **Реклама (Ads/Banners)** | Բանկեր, շինարարական ընկերություններ | Phase 3 |
| **Lead generation** | Գործակալներին վճարովի lead-եր | Phase 3 |

---

## 2. Թիրախ շուկա, լեզուներ, արժույթներ

### Աշխարհագրություն
- **Փուլ 1.** Հայաստան (Երևան + մարզեր)
- **Փուլ 2.** Նախկին ԽՍՀՄ ռուսալեզու երկրներ (Ռուսաստան, Վրաստան, Ղազախստան, Բելառուս, Ուկրաինա, և այլն)
- Համակարգը սկզբից կառուցվում է **multi-country**՝ ամեն գույք ունի `country` դաշտ

### Լեզուներ (եռալեզու սկզբից)
- 🇦🇲 Հայերեն (hy)
- 🇷🇺 Ռուսերեն (ru)
- 🇬🇧 Անգլերեն (en)
- **Տեխնիկապես.** `next-intl`, URL-ով՝ `/hy/...`, `/ru/...`, `/en/...`։ Default ըստ browser-ի լեզվի, ձեռքով փոխարկելի header-ից։

### Արժույթներ
- AMD (֏), RUB (₽), USD ($), EUR (€)
- Գույքի գինը պահվում է **իր բնօրինակ արժույթով** + ցուցադրվում փոխարկված (live exchange rate API)
- Օգտատերը ընտրում է ցուցադրման արժույթը header-ից

---

## 3. Օգտատերերի տիպերը (Roles)

Ընտրված մոդել՝ **C** (բոլորը կարող են տեղադրել, գործակալներն ունեն Pro):

| Role | Ով է | Ինչ կարող է անել |
|------|------|------------------|
| **Guest** (անանուն) | Չգրանցված այցելու | Որոնել, դիտել գույք, օգտվել հաշվիչից։ Չի կարող պահել/գրել/տեղադրել |
| **User** (սովորական) | Գրանցված անձ | Ամեն ինչ + favorites, saved searches, messages, տեղադրել գույք (սահմանափակ քանակ) |
| **Agent / Pro** | Գործակալ/գործակալություն | User + շատ հայտարարություն, Pro profile, analytics, promoted listings, bulk upload |
| **Admin** | Դու / թիմ | Մոդերացիա, օգտատերeր, գույքերի հաստատում, բողոքներ, վիճակագրություն |

**Trust/Verification.** Email + հեռախոս հաստատում բոլորի համար։ Agent-ի համար՝ լրացուցիչ՝ լիցենզիա/փաստաթուղթ (Phase 2)։

---

## 4. Տեխնոլոգիական ստեկ (Tech Stack)

| Շերտ | Տեխնոլոգիա | Ինչու |
|------|-----------|-------|
| **Framework** | Next.js 15 (App Router) + React + TypeScript | SSR/SEO, պրոֆեսիոնալ ստանդարտ |
| **Styling** | Tailwind CSS + shadcn/ui | Արագ, համահունչ, պրոֆեսիոնալ UI |
| **Database** | PostgreSQL (via Supabase) + PostGIS | Геолокация որոնման համար |
| **Auth** | Supabase Auth (email, phone, Google OAuth) | Գրանցում/մուտք |
| **File storage** | Supabase Storage / Cloudinary | Նկարներ, 360° tours, video |
| **Maps** | Mapbox GL JS (կամ MapLibre + OSM՝ անվճար) | Քարտեզ + clustering |
| **i18n** | next-intl | Եռալեզու |
| **Search** | Postgres full-text + filters → հետո Meilisearch | Արագ որոնում |
| **Image optimize** | next/image | Արագ բեռնում |
| **Forms** | react-hook-form + zod | Validation |
| **State** | React Query (server state) + Zustand (UI) | Տվյալների կառավարում |
| **Email** | Resend / Supabase | Notifications, alerts |
| **Hosting** | Vercel (web) + Supabase (backend) | Անվճար start, scale-ելի |
| **Payments** (Phase 2) | Stripe / local provider | Pro subscriptions |
| **Mobile** (հետո) | React Native (Expo) | iOS + Android, նույն API |
| **Analytics** | Plausible / PostHog | Օգտատերերի վարք |

### Архитектура (high-level)
```
[Browser / Mobile App]
        │  HTTPS
        ▼
[Next.js (Vercel)] ── SSR էջեր + API routes
        │
        ▼
[Supabase] ── PostgreSQL + Auth + Storage + Realtime
        │
        ├── Mapbox (քարտեզ)
        ├── Exchange Rate API (արժույթ)
        ├── Resend (email)
        └── Stripe (վճարում, Phase 2)
```

---

## 5. Ամբողջական Sitemap

### Top Navigation (Header մենյու)
```
BUY ▾ | SELL ▾ | RENT ▾ | MORTGAGE ▾ | FIND AN AGENT ▾ | NEWS & GUIDES ▾    [♡] [🔔] [Lang ▾] [Currency ▾] [Profile ▾ / Sign in]
```

### 26 Էջ-կաղապար (Master Page Templates)

| # | Page Template | URL (օրինակ) | Roles | Phase | Spec ֆայլ |
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
| 12 | **Home Value tool** («Zestimate») | `/home-value` | All | 🟡 P2 | `pages/12-home-value.md` |
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
| 26 | **VR / 360° Virtual tour** | (property-ի մաս) | All | 🟡 P2 | `pages/26-virtual-tour.md` |

🟢 **Phase 1 (CORE)** = 13 էջ՝ իրական աշխատող կայք
🟡 **Phase 2 (GROWTH)** = +10 էջ
🔵 **Phase 3 (ADVANCED)** = +3 էջ

---

## 6. Կառուցման փուլերը (Roadmap)

### 🟢 Phase 1 — MVP (Աշխատող կայք)
**Նպատակ.** Մարդը կարող է տեղադրել գույք, ուրիշը՝ որոնել, դիտել, պահել, գրել։
1. Setup (Next.js, Supabase, Tailwind, i18n, deploy pipeline)
2. Data model + auth
3. Header/Footer + design system
4. Home → Search+Map → Property detail (դիտելու flow)
5. Listing wizard (տեղադրելու flow)
6. Dashboard + My listings + Favorites + Messages
7. Settings + Notifications + Static pages
8. Trilingual + responsive + SEO basics
→ **Արդյունք.** Իրական, օգտագործելի կայք Հայաստանի համար։

### 🟡 Phase 2 — Growth
Agent profiles + Find an Agent, Pricing/Pro, Saved searches+alerts, Blog/Guides (SEO), Home value tool, Mortgage calculators, Compare, 360° tours, Admin panel, Payments (Stripe)։

### 🔵 Phase 3 — Advanced + Scale
Mortgage rates, Pro analytics, Landlord tools, Neighborhood/market trends, Meilisearch, multi-country rollout (РФ/СНГ)։

### 📱 Phase 4 — Mobile App
React Native (Expo), նույն Supabase backend-ով, push notifications։

---

## 7. Տվյալների մոդել (Data Model)

Հիմնական entity-ները (պարզեցված).

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

Աշխարհագրական որոնման համար՝ `properties.lat/lng` + PostGIS index (geo radius search, map bounds)։

---

## 8. Դիզայն համակարգ (Design System)

> Մանրամասները՝ `docs/DESIGN-SYSTEM.md` (առանձին ֆայլ)

- **Ոճ.** Մաքուր, լուսավոր, professional (Zillow/Realtor-ի պես)՝ շատ սպիտակ տարածք, մեծ նկարներ
- **Primary գույն.** (կընտրենք — օր․ կանաչ կամ կապույտ; Realtor=կարմիր, Zillow=կապույտ)
- **Տառատեսակ.** Inter / system fonts (հայերեն+ռուսերեն+լատին աջակցությամբ)
- **Components.** Button, Input, Card (property card), Modal, Dropdown, Tabs, Map, Gallery, Badge, Toast
- **Responsive.** Mobile-first, breakpoints՝ sm/md/lg/xl
- **Property Card** (ամենակարևոր կրկնվող բաղադրիչը)՝ նկար(slider), գին, ♡, սենյակ/մակերես/հարկ, հասցե, badge(NEW/REDUCED/FEATURED)

---

## 9. Ընդհանուր տարրեր

### Header (ամեն էջում)
**Ձախ.** Logo (→ Home)
**Կենտրոն (desktop).** BUY ▾ · SELL ▾ · RENT ▾ · MORTGAGE ▾ · FIND AN AGENT ▾ · NEWS & GUIDES ▾ (mega-menu dropdowns)
**Աջ.**
- 🔍 (mobile-ում որոնման icon)
- ♡ Favorites (→ `/favorites`, hover-ով preview)
- 🔔 Notifications (badge-ով քանակ)
- 🌐 Lang switcher (HY/RU/EN)
- 💱 Currency switcher (AMD/RUB/USD/EUR)
- **«Տեղադրել գույք»** (Primary button → wizard)
- 👤 Profile ▾ (Sign in/up | կամ՝ Dashboard, My listings, Settings, Sign out)

### Mega-menu բովանդակություն (ըստ realtor.com-ի)
- **BUY ▾** → Գույքեր վաճառքի · Նոր կառուցապատum · Բռնագանձված · Բաց դռներ · Շուկայի տրենդներ · Գնորդի խորհուrdներ
- **SELL ▾** → «Որքա՞ն արժե իմ տունը» · Վաճառքի գործիքներ · Վաճառքի խորհուրդներ · Վերջերս վաճառված
- **RENT ▾** → Բնակարաններ վարձով · Վարձակալի գործիքներ · Տանտիրոջ գործիքներ · Վարձի խորհուրդներ
- **MORTGAGE ▾** → Հաշվիչներ · Տոկոսադրույքներ · Pre-approval · Ֆինանս խորհուրդներ
- **FIND AN AGENT ▾** → Գտնել գործակալ · Համեմատել · Թիմեր/ընկերություններ · Ինչու գործակալ
- **NEWS & GUIDES ▾** → Նորություններ · Insights · Ուղեցույցներ · Տեսանյութեր

### Footer (ամեն էջում)
4-5 սյունակ՝
1. **Ընկերություն.** Մեր մասին, Կարիերա, Կապ, Press
2. **Գնորդ/Վաճառող.** Buy, Sell, Rent, Mortgage
3. **Ռեսուրսներ.** Guides, Blog, FAQ, Help center
4. **Իրավական.** Terms, Privacy, Cookie policy
5. **Կապ.** Սոց. ցանցեր, App Store/Google Play badge (Phase 4), Lang/Currency

---

## 11. Հաջորդ քայլերը

1. ✅ Այս փաստաթուղթը (արվեց)
2. ⏭️ **Էջ առ էջ մանրամասն spec** (`docs/pages/` — ամեն էջ առանձին ֆայլ, ո՛ր կոճակն ի՛նչ է անում)
3. ⏭️ Design system + wireframes (mockup-ներ)
4. ⏭️ Implementation plan (writing-plans skill-ով)
5. ⏭️ Phase 1 կառուցում

---

*Փաստաթուղթը կազմվել է քայլ առ քայլ brainstorming-ի արդյունքում։ Թարմացվում է աշխատանքի ընթացքում։*
