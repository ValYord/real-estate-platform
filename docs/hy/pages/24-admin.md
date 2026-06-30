# Էջ 24 — Admin Panel (Ադմին վահանակ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, analytics, SEO։

**URL.** `/admin` (dashboard) · `/admin/moderation` · `/admin/users` · `/admin/reports` · `/admin/listings` · `/admin/content` · `/admin/locations` · `/admin/settings`
**Roles.** Միայն **Admin** (`role === 'admin'`)։ Մնացած բոլորի համար → 403 + redirect `/`։ Կա ենթադրություն, որ Phase 3-ում կավելանա **moderator** tier (limited)։
**Primary goal.** Հարթակի օպերատորին տալ **մեկ կենտրոն**՝ որտեղից արագ մոդերացիա անի, օգտատերերին կառավարի, բողոքները լուծի և platform-ի առողջությունը հետևի։ Ամեն էկրան օպտիմիզացված է **արագ որոշման** համար (queue → preview → action 2-3 click-ով)։

---

## 0. Ակնարկ (Overview)

Admin panel-ը **ներքին գործիք** է, ոչ թե public էջ — ուստի UX-ի առաջնահերթությունը **խտություն և արագություն** է, ոչ թե գեղեցկություն կամ conversion։ Տիպիկ admin-ը օրական մի քանի անգամ բացում է panel-ը, նայում pending queue-ի badge-ին և մի քանի րոպեում մաքրում հերթը։ Ուստի՝ (1) sidebar-ի badge-երը միշտ ցույց են տալիս ուշադրություն պահանջող քանակը, (2) ամեն destructive action-ից առաջ՝ confirm + պարտադիր պատճառ, (3) ամեն action՝ audit log-ում, որ հետո հնարավոր լինի վերականգնել «ով, երբ, ինչ»։

Panel-ը render-վում է **SSR**-ով auth guard-ի հետևում; տվյալները՝ live, React Query-ով (`staleTime` կարճ, քանի որ moderation-ը real-time-ի մոտ պետք է)։ Ամբողջ panel-ը՝ `noindex, nofollow` — search engine-ը երբեք չպետք է տեսնի այն։

Panel-ն ունի **8 հիմնական բաժին** (sidebar-ի կետեր), որոնցից ամենաթեժը՝ **Moderation** և **Reports** (թվային badge-ով)։ Մնացածը՝ կառավարման/կարգավորման բաժիններ՝ ավելի հազվադեպ այցելությամբ։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Մոդերատոր Անին (առավոտյան հերթ).** Անին բացում է `/admin`, sidebar-ում տեսնում **«Moderation 12»** badge։ Սեղմում է, անցնում queue-ին (ամենահինը վերև)։ Առաջին տողը՝ «3 սենյականոց բնակարան Կենտրոնում»։ Click → drawer-ը բացվում է աջից՝ ամբողջ հայտարարությունն ինչպես կերևա property էջում։ Նկարները լավն են, գինը՝ նորմալ → սեղմում է **«✅ Հաստատել»**, drawer-ը փակվում է, հաջորդ item-ը auto-select։ 12 item՝ 4 րոպեում։ → Owner-ներին notification + email գնաց։

**Սցենար Բ — Admin Դավիթը (fraud report).** Reports էջում տեսնում է **«⚑ 3 բողոք»** խմբավորված նույն հայտարարության դեմ՝ պատճառ «Կեղծ գին»։ Click → report detail՝ reporter-ների history + listing preview։ Գինը իրոք անհավանական ցածր է (scam pattern)։ Սեղմում է **«🚫 Հեռացնել հայտարարությունը»** → reason modal → «Կասկածելի/կեղծ գին» → submit։ Listing → archived, owner-ին email, report → resolved։ Internal note ավելացնում՝ «Կրկնվող scam, հետևել owner-ին»։

**Սցենար Գ — Admin Sona (verify agent).** Users էջում ֆիլտրում է `role=agent, verified=no`։ Տեսնում է նոր գործակալ, որ վերբեռնել է լիցենզիա։ Click → user detail → «Փաստաթղթեր» tab → ստուգում է լիցենզիան → **«✔️ Հաստատել գործակալին»**։ Agent → `verified=true`, profile-ին ✓ badge հայտնվեց, գործակալին welcome email։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — sidebar + content

```
┌──────────────────────────────────────────────────────────────┐
│ ADMIN TOP BAR (h-14, bg-gray-900 text-white)                 │
│ [≡] Admin · 🔍 Global search    [avatar ▾] [↗ Դեպի կայք]    │
├────────────────┬─────────────────────────────────────────────┤
│ SIDEBAR        │  CONTENT AREA (bg-gray-50, p-6)             │
│ (w-60, sticky) │                                             │
│ bg-white       │  ┌─ Page header ──────────────────────┐    │
│ border-r       │  │ H1 + date-range / search / filters │    │
│                │  └────────────────────────────────────┘    │
│ 📊 Dashboard   │                                             │
│ 🛡 Moderation12│  ┌─ Stat cards / Table / Editor ──────┐    │
│ 👥 Users       │  │                                    │    │
│ ⚑ Reports   3 │  │  (բաժնից կախված բովանդակություն)    │    │
│ 🏠 Listings    │  │                                    │    │
│ 📝 Content     │  └────────────────────────────────────┘    │
│ 📍 Locations   │                                             │
│ ⚙️ Settings    │  [◄ նախ.] Էջ 1 / 24 [հաջ. ►]  (pagination) │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
            ▲ active կետ՝ bg-primary/10 text-primary border-l-2
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
│ │ thumb · վերնագիր     │ │
│ │ owner · գին · status │ │
│ │ [✅] [❌] [⋯]        │ │
│ └──────────────────────┘ │
│ ...                      │
├──────────────────────────┤
│ Pagination               │
└──────────────────────────┘
   ☰ → slide-in drawer (sidebar)
```

- Admin-ը **desktop-first** գործիք է. mobile-ը աջակցվում է (հրատապ approve/ban ճանապարհին), բայց editor-ները (content, settings) desktop-օպտիմիզացված են։
- Sidebar-ը desktop-ում sticky `top-14`; mobile-ում՝ `☰`-ով բացվող drawer (`bg-black/40` overlay)։
- Աղյուսակները mobile-ում դառնում են stacked card-եր (ոչ horizontal scroll)։

### Design tokens (admin panel-ի համար)

| Տարր | Tailwind / արժեք |
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

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Մուտք / Layout guard

- **Access guard.** Server-side check `user.role === 'admin'` middleware-ում (`/admin/*`)։ Չստուգված → 403 page «Մուտքն արգելված է» + link «Դեպի գլխավոր»։ Supabase RLS՝ լրացուցիչ պաշտպանություն (row-level security + role check ամեն query-ի վրա)։
- **Sidebar.** 8 կետ, ամեն մեկը՝ icon + label + (պայմանով) pending count badge։ Active կետ՝ `border-l-2 border-primary`։ Badge-երը live (React Query `refetchInterval: 30s`)՝ Moderation = pending listings count, Reports = open reports count։
- **Top bar.** `🔍 Global search` (օգտատեր/հայտարարություն/report ըստ id/անուն/email) · admin avatar dropdown (`[Profile] [Audit log] [Դուրս գալ]`) · «↗ Դեպի կայք» (նոր tab-ով public site)։
- **Microcopy.** 403 banner՝ «Այս բաժինը հասանելի է միայն ադմիններին»։

### 3.2 Dashboard (`/admin`)

Platform-ի վիճակը՝ առաջին հայացքից։

- **Date-range filter (վերին աջ).** `[Այսօր] [7 օր] [30 օր] [Custom ▾]` — թարմացնում է բոլոր stat-երն ու chart-երը։ Default՝ 30 օր։
- **Stat cards (grid, `grid-cols-2 lg:grid-cols-3 gap-4`).** Ամեն card՝ icon + label + մեծ թիվ + trend chip (↑/↓ % vs նախորդ period)՝
  - 👥 **Օգտատերեր** — ընդհանուր + «+124 այս ամիս ↑8%»
  - 🏠 **Հայտարարություններ** — active / pending / sold / archived breakdown (mini bar)
  - 👁 **Դիտումներ** — ընդհանուր views ընտրած period-ի
  - 💰 **Եկամուտ** — Pro subscriptions + promoted (Phase 2; մինչ payments՝ «—»)
  - ✉️ **Leads / հաղորդագրություններ** — ստեղծված conversations
  - ⚑ **Ուշադրություն** — pending moderation + open reports (warning գույն `bg-amber-50` եթե >0)
- **Charts (Recharts).** Line՝ նոր օգտատեր/հայտարարություն ըստ ժամանակի; bar՝ հայտարարություններ ըստ քաղաքի; pie՝ sale vs rent։
- **Quick actions.** `[Մոդերացիայի հերթ →]` · `[Բաց բողոքներ →]` · `[Նոր օգտատերեր →]`։
- **Recent activity feed.** Վերջին 10 գործողություն (նոր registration / նոր listing / նոր report) timestamp + link-ով։
- **Data.** `GET /api/admin/stats?range=30d`։
- **Empty.** Նոր platform → «Դեռ տվյալ չկա — առաջին օգտատերերի սպասում ենք»։

### 3.3 Moderation queue (`/admin/moderation`)

Հրապարակման սպասող (`status=pending`) հայտարարությունների ստուգում — **ամենահաճախ օգտագործվող բաժինը**։

- **Tabs.** `[Սպասող (12)] [Հաստատված] [Մերժված] [Բոլորը]`։ Default՝ Սպասող։
- **Queue table.** Ամեն տող՝ ☐ checkbox · cover thumbnail (`w-16 h-12 rounded`) · վերնագիր · owner (link) · տիպ/deal · գին · ստեղծ. ամսաթիվ · «⏱ սպասում է 6 ժ» (`text-amber-600` եթե >24ժ)։ Sort՝ FIFO (ամենահինը վերև)։
- **Row click → preview drawer** (աջից slide-in, `w-[480px]`)՝ ամբողջ հայտարարությունն ինչպես կերևա property էջում (gallery, նկարագրություն, details, քարտեզ)։ Drawer-ի ներքևում sticky action bar։
- **Actions (ամեն item-ի վրա).**
  - **[✅ Հաստատել]** → `status=active`, հրապարակվում է, owner-ին notification + email։ Drawer փակվում, հաջորդ item auto-select։ `POST /api/admin/listings/[id]/approve`
  - **[❌ Մերժել]** → **reason modal** (պարտադիր)՝ dropdown (Վատ նկարներ / Կրկնակ / Կասկածելի գին / Կանոնների խախտում / Այլ) + free text։ `status=rejected`, owner-ին notification + email՝ պատճառով։ `POST /api/admin/listings/[id]/reject {reason}`
  - **[✏️ Խմբագրել]** → admin ուղղում է typo/category → `/admin/listings/[id]/edit` (full wizard access)։
  - **[👤 Owner]** → user detail admin-ում։
- **Bulk actions.** Checkbox select → toolbar հայտնվում է վերևում՝ `[Հաստատել ընտրվածները (5)]` / `[Մերժել ընտրվածները]` (bulk reason)։
- **Multi-admin lock.** Item-ը բացելիս optimistic lock → մյուս admin-ը տեսնում է «🔒 Ստուգում է Անին» (double-action-ից խուսափել)։
- **Microcopy.** Reject success toast՝ «Մերժվեց — owner-ին ուղարկվեց պատճառը»։ Empty queue՝ «🎉 Մոդերացիայի սպասող բան չկա»։
- **Edge.** Մերժվածը owner-ը կարող է ուղղել ու նորից ուղարկել → վերադառնում queue-ի վերև «↻ Կրկնակ» tag-ով։

### 3.4 Users management (`/admin/users`)

- **Search & filter bar.** Որոնում՝ անուն/email/հեռ./id · ֆիլտրեր (chip-եր)՝ role (user/agent/admin) · status (active/banned) · verified (yes/no) · երկիր · registration date։
- **Users table.** ☐ · avatar · անուն · email · role badge · listings count · status (Active/Banned) · joined · last active։ Pagination (25/էջ) + sort columns։
- **Row click → User detail** (`/admin/users/[id]`)՝ profile info · listings tab · conversations count · reports (against/by) · activity log · (agent-ի դեպքում) «Փաստաթղթեր» tab՝ լիցենզիա։
- **Actions (per user).**
  - **[🚫 Ban / Unban]** → confirm modal (պարտադիր պատճառ)։ Ban → user չի կարող login/post, հայտարարությունները → hidden։ `POST /api/admin/users/[id]/ban {reason}`
  - **[✔️ Հաստատել գործակալին]** → ստուգում է լիցենզիա → `agent.verified=true`, verified badge։ `POST /api/admin/users/[id]/verify`
  - **[🎚 Փոխել role]** → dropdown (user ↔ agent ↔ admin)։ Confirm modal (admin role-ը՝ զգուշությամբ)։ `PATCH /api/admin/users/[id] {role}`
  - **[✉️ Ուղարկել message]** → admin → user system message։
  - **[🗑 Ջնջել]** (soft delete, confirm)՝ GDPR-համապատասխան anonymize (անունը → «Ջնջված օգտատեր», PII մաքրում)։
- **Edge.** Admin-ը չի կարող ban/delete ինքն իրեն կամ վերջին մնացած admin-ին (server-side guard → 409 «Չի կարելի ջնջել վերջին ադմինին»)։

### 3.5 Reports / complaints (`/admin/reports`)

Օգտատերերի բողոքները հայտարարությունների/օգտատերերի/հաղորդագրությունների դեմ։

- **Tabs.** `[Բաց (3)] [Քննարկվող] [Փակված] [Բոլորը]`։
- **Reports table.** Տիպ (listing/user/message) · reported item (link) · reporter (link) · պատճառ (spam/fraud/offensive/duplicate/wrong-info) · ամսաթիվ · status։ Sort՝ նորը վերև։ **Group**՝ նույն item-ի մի քանի report միասին («3 բողոք» chip, priority high)։
- **Row click → Report detail.** Բողոքի տեքստ · reported content-ի preview · reporter-ի history · նույն item-ի այլ բողոքներ · internal notes thread։
- **Actions.**
  - **[👁 Դիտել item-ը]** → բացում է listing/user/message preview։
  - **[✅ Մերժել (Dismiss)]** → անհիմն բողոք → `status=closed` (no action)։ `POST /api/admin/reports/[id]/dismiss`
  - **[⚠️ Զգուշացնել]** → owner-ին warning (notification + email)։
  - **[🚫 Հեռացնել/Ban]** → action against item → report `resolved`։ `POST /api/admin/reports/[id]/action {action_type}`
  - **[📝 Ներքին նշում]** — admin-ների միջև comment (audit trail)։
- **Edge.** Կրկնակ բողոքները նույն item-ի դեմ → auto-flag priority high (red row)։

### 3.6 Listings management (`/admin/listings`)

Ցանկացած հայտարարության full control (ոչ միայն pending)։

- **Search & filter.** id/վերնագիր/owner · status · deal type · property type · երկիր/քաղաք · price range · featured (yes/no) · date։
- **Listings table.** ☐ · cover · վերնագիր · owner · տիպ/deal · գին · status badge · views · featured ⭐ · created։ Sort + pagination + bulk select։
- **Actions (per listing).**
  - **[✏️ Խմբագրել]** → full wizard access ցանկացած դաշտ։ `PATCH /api/admin/listings/[id]`
  - **[🗑 Հեռացնել]** → confirm modal (պատճառ) → `status=archived`, owner notification։ `DELETE /api/admin/listings/[id]`
  - **[⭐ Promote / Feature]** → toggle `is_featured` (+ optional ժամկետ՝ 7/14/30 օր)։ Հայտնվում է home/search-ի վերևում։ `POST /api/admin/listings/[id]/feature {duration}`
  - **[⏸ Ապաակտիվացնել / ▶️ Ակտիվացնել]** → status փոխարկում։
  - **[👤 Owner]** · **[📊 Վիճակագրություն]** (views/favorites/leads)։
- **Bulk.** Remove / feature / activate ընտրվածները։

### 3.7 Content / Blog CMS (`/admin/content`)

Հոդվածներ, նորություններ, ուղեցույցներ (տես `15-blog.md`, `16-guides.md`)։

- **Tabs / filter.** `[Հոդվածներ] [Ուղեցույցներ]` · status (published/draft) · category · language։
- **Content table.** cover · վերնագիր · category · author · status · published date · views։ `[➕ Նոր հոդված]`։
- **Editor (create/edit).**
  - **Language tabs.** HY / RU / EN — ամեն լեզվի համար առանձին title, slug, body (rich-text WYSIWYG)։
  - Դաշտեր՝ cover image upload · category ▾ · tags · excerpt · SEO (meta title/description, OG image) · author։
  - `[💾 Պահել draft]` · `[🚀 Հրապարակել]` (`status=published`, `published_at`) · `[👁 Preview]` · `[🗑 Ջնջել]`։
  - Data՝ `POST /api/admin/posts` · `PATCH /api/admin/posts/[id]` · `POST /api/admin/posts/[id]/publish`
- **Edge.** Չթարգմանված լեզու → fallback default-ին + warning «RU/EN տարբերակը բացակայում է»։

### 3.8 Locations & Categories (`/admin/locations`)

Աշխարհագրական և դասակարգման տվյալներ (multi-country-ի հիմքը)։

- **Sub-tabs.** `[Երկրներ] [Քաղաքներ] [Թաղամասեր] [Property types] [Amenities]`։
- **Countries.** Աղյուսակ՝ անուն{hy,ru,en} · code · currency · active toggle · cities count։ `[➕ Ավելացնել երկիր]`, edit, deactivate։
- **Cities.** Belongs to country ▾ · անուն{hy,ru,en} · lat/lng center · active։ Tree view՝ երկիր → քաղաք → թաղամաս։
- **Neighborhoods.** Belongs to city · անուն{hy,ru,en} · (optional polygon/boundary geo)։
- **Property types.** apartment/house/land/commercial/… · անուն{hy,ru,en} · icon · active։
- **Amenities.** Ավտոկայանատեղ, վերելակ, կահույք… · անուն{hy,ru,en} · icon · group (in/out)։
- **Actions.** Add / edit (language tabs) / reorder (drag) / activate-deactivate։
- **Edge.** Քաղաք/type ջնջելն արգելված է, եթե կան կապված հայտարարություններ → միայն **deactivate** (integrity պահպանելու համար)։ Փորձ → 409 «Չի կարելի ջնջել — կան կապված հայտարարություններ»։
- **Data.** `GET/POST/PATCH /api/admin/locations/*` · `/api/admin/categories/*`

### 3.9 Settings (`/admin/settings`)

Platform-wide կարգավորումներ։

- **Exchange rates.** Ընթացիկ AMD/RUB/USD/EUR դրույքները (auto live API + manual override)։ `[🔄 Թարմացնել հիմա]` · last-updated timestamp։ `GET/PATCH /api/admin/settings/rates`
- **Plans / Pricing (Pro).** Subscription tier-ներ (free/pro/premium)՝ գին, listings limit, features list։ `/api/admin/settings/plans`
- **Feature flags.** Toggle-ներ՝ moderation on/off · 360°-tours enabled · payments enabled · registration open · maintenance mode · new-country rollout։ Real-time UI ազդեցություն։
- **General.** Site name · default lang/currency · contact email · social links · footer text (multilingual)։
- **Email templates.** Notification/alert email-ների տեքստ (multilingual)։
- **Data.** `GET/PATCH /api/admin/settings`։
- **Microcopy.** Maintenance mode toggle-ի վրա warning՝ «Միացնելը կփակի կայքը բոլոր այցելուների համար»։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Skeleton՝ sidebar + stat card outline-ներ / table row shimmer |
| **Loaded (dashboard)** | Stat cards + charts + activity feed |
| **Empty queue** | «🎉 Մոդերացիայի սպասող բան չկա» illustration |
| **Empty table** | «Արդյունք չկա ընտրված ֆիլտրով» + [Մաքրել ֆիլտրերը] |
| **Action loading** | Կոճակը spinner + disabled (optimistic update) |
| **Action success** | Toast (green) + row update / drawer close |
| **Confirm needed** | Modal՝ պատճառ input + [Հաստատել] / [Չեղարկել] |
| **Locked item** | «🔒 Ստուգում է {admin}» — action-ները disabled |
| **403 (ոչ-admin)** | «Մուտքն արգելված է» + [Դեպի գլխավոր] |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |
| **409 (guard)** | Inline error (օր․ «Չի կարելի ջնջել վերջին ադմինին») |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<AdminLayout> (Server Component, auth guard)
 ├─ <AdminTopBar globalSearch admin />
 ├─ <AdminSidebar items={NavItem[]} badges={{moderation, reports}} />
 └─ <AdminContent>                          (route-ից կախված)
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

### Data fields used (տես 00-SPEC §7)

`users{id, role, name, email, phone, avatar_url, email_verified, phone_verified, status, created_at, last_active}` · `agents{user_id, agency_name, license_no, verified, subscription_tier}` · `properties{id, owner_id, title, status, deal_type, property_type, price, currency, city, views_count, is_featured, created_at}` · `reports{id, target_type, target_id, reporter_id, reason, status, note, created_at}` · `blog_posts{id, slug, title, body, status, published_at}` · `admin_actions{id, admin_id, action, target_type, target_id, meta, created_at}` (audit log)։

### API contract-ներ

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
// 409 { "error": "already_moderated" }     → toast «Արդեն ստուգված է»
```

**`POST /api/admin/listings/[id]/reject`**
```jsonc
// request  { "reason": "suspicious_price", "note": "Գինը շուկայից 5x ցածր է" }
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
    required_error: "Պատճառն ընտրեք",
  }),
  note: z.string().max(500).optional(),
});

const banSchema = z.object({
  reason: z.string().min(3, "Նշեք պատճառը").max(500),
});
```

- **Auth.** Բոլոր `/api/admin/*` route-երը՝ admin-only middleware + Supabase RLS (role check)։
- **Audit.** Ամեն mutating action → `admin_actions` row (admin_id, action, target, meta)։
- **Idempotency.** Approve/reject՝ idempotent — կրկնակ submit → `409 already_moderated` (multi-admin race)։
- **Guards.** Last-admin protection, self-ban protection, has-listings delete protection (server-side, 409)։

---

## 6. Responsive

- **≥1024px (lg).** Sidebar `w-60` sticky + content; աղյուսակները full table; preview drawer `w-[480px]`։
- **768–1023px (md).** Sidebar collapse → icon-only (`w-16`, hover tooltip); աղյուսակները՝ horizontal scroll-ով compact։
- **<768px (sm).** Sidebar → `☰` drawer; աղյուսակները → stacked card-ներ (thumb + key fields + action chip-եր); ֆիլտրերը → bottom sheet; editor-ները՝ «Լավագույնը desktop-ում» banner։

---

## 7. Accessibility

- Բոլոր icon-only action կոճակները՝ `aria-label` (✅ = «Հաստատել հայտարարությունը», 🚫 = «Արգելափակել օգտատիրոջը»)։
- Աղյուսակները՝ `<table>` semantic markup, `<th scope="col">`, sort կոճակները՝ `aria-sort`։
- Drawer/modal՝ focus trap, ESC փակում, `role="dialog"` + `aria-labelledby`։
- Confirm modal-ի destructive կոճակը՝ ոչ autofocus (պատահական Enter-ից խուսափել); focus-ը՝ Cancel-ի վրա։
- Toast-երը՝ `role="status"`; error-ները՝ `role="alert"`։
- Contrast ≥ 4.5:1; sidebar badge-երը՝ ոչ միայն գույնով (թիվ + գույն)։

---

## 8. SEO & meta

- **`noindex, nofollow`** ամբողջ `/admin/*`-ի համար (`<meta name="robots" content="noindex, nofollow">` + `robots.txt` disallow)։ Admin panel-ը երբեք search engine-ում չպետք է հայտնվի։
- Auth guard-ը՝ առաջնային պաշտպանություն (ոչ միայն noindex)։
- `<title>` = «Admin · {section} | {brand}» (ներքին, ոչ SEO-ի համար)։
- Sitemap-ում `/admin/*` չի ներառվում։

---

## 9. Analytics events

> Ներքին (admin) analytics — առանձին stream public analytics-ից, audit/operational purposes-ի համար։

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
