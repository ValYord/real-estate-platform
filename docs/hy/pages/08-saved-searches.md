# Էջ 08 — Saved Searches + Alerts (Պահված որոնումներ) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ի կառուցվածքին։

**URL.** `/saved-searches` — օրինակ՝ `/hy/saved-searches`
**Roles.** User+ (login պարտադիր)։ Guest → login wall (ուղիղ) կամ login modal (search էջից «Պահել» սեղմելիս)։
**Primary goal (retention).** Օգտատիրոջը պահել ֆիլտրերը մեկ անգամ, ապա **ավտոմատ վերադարձնել** կայք՝ email ծանուցմամբ, երբ նոր համապատասխան գույք է հայտնվում։ Սա passive re-engagement-ի և long-term retention-ի գործիք է. մարդը դադարում է որոնել, բայց մենք շարունակում ենք բերել նրան համապատասխան առաջարկներ։

---

## 0. Ակնարկ (Overview)

Search-ը մարդուն տալիս է «հիմա ի՞նչ կա»; saved search-ը՝ «ի՞նչ կհայտնվի վաղը»։ Օգտատերը `/search`-ում կիրառում է ֆիլտրեր (օր․ «2 սենյականոց Արաբկիր մինչև 100,000 USD») և սեղմում **«Պահել որոնումը»**։ Մենք պահում ենք ֆիլտրերի JSON-ը + alert frequency-ն, ապա scheduled job-ը պարբերաբար ստուգում է properties-ի դեմ ու email ուղարկում, երբ նոր match կա։

Էջն ինքը պարզ է՝ պահված որոնումների ուղղահայաց ցուցակ, ամեն տող card՝ filter-summary chip-երով, alert frequency toggle-ով և actions-ով (բացել/խմբագրել/վերանվանել/ջնջել)։ Render-վում է **SSR**-ով; toggle-ները և CRUD-ը client-side React Query-ով։ Իրական բարդությունը **backend-ում** է՝ cron match-detection + Resend digest։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Վարձակալ Մարիան.** Մարիան որոնում է բնակարան Արաբկիրում, բայց բյուջեին համապատասխանող քիչ կա։ Search-ի toolbar-ից սեղմում է **[💾 Պահել որոնումը]**, անունը թողնում auto-generated «2 սեն. · Արաբկիր · ≤100K$», frequency՝ Daily։ Երեք օր անց email է ստանում՝ «3 նոր գույք քո որոնման համար», սեղմում card-ի վրա → property էջ։

**Սցենար Բ — Գնորդ Արամը.** Արամը 4 պահված որոնում ունի։ Բացում է `/saved-searches`, տեսնում մեկի կողքին «5 նոր» badge։ Սեղմում **[🔍 Բացել որոնումը]** → `/search` պահված ֆիլտրերով։ Մյուսի frequency-ն Instant-ից փոխում է Weekly՝ քիչ email-ի համար։

**Սցենար Գ — Ներդրող Դավիթը (unsubscribe).** Դավիթն այլևս չի փնտրում, email-ի ներքևից սեղմում է **[Անջատել]** (signed token, առանց login)։ Որոնման frequency-ն դառնում է Off; հաջորդ digest չի ուղարկվում։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Պահված որոնումներ        [♡ Ընտրանի]│
│ H1 «Պահված որոնումներ»  4                                   │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 2 սեն. · Արաբկիր · ≤100K$            «3 նոր»  «⋯»       │ │
│ │ [Վաճառք][Բնակարան][Երևան, Արաբկիր][2 սեն.][≤100K$]      │ │
│ │ Ծանուցում: (Անջատ)(Ակնթ.)(Օրական◉)(Շաբ.)   վերջին՝ 2ժ   │ │
│ │ [🔍 Բացել]  [✏️ Խմբագրել]  [🗑]                         │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Տուն · Ավան · ≤250K$                 «0 նոր»  «⋯»       │ │
│ │ …                                                       │ │
│ └────────────────────────────────────────────────────────┘ │
│ FOOTER                                                      │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Հետ  Պահված որ. (4)    │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ 2 սեն. · Արաբկիր «3»  │ │
│ │ [chip][chip][chip]   │ │
│ │ Ծանուցում [Օրական ▾]  │ │
│ │ [🔍 Բացել]      «⋯»  │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Տուն · Ավան    «0»    │ │
│ └──────────────────────┘ │
│ FOOTER                   │
└──────────────────────────┘
```

- Card list՝ `space-y-4`, ամեն card `shadow-sm border rounded-xl p-4`։
- Mobile-ում frequency-ն dropdown, actions-ը «⋯» menu-ի տակ։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-2xl font-semibold text-gray-900` |
| Card | `shadow-sm border border-gray-200 rounded-xl p-4` |
| Card title | `text-base font-medium text-gray-900` |
| Filter chip | `bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full` |
| «N նոր» badge | `bg-primary text-white text-xs font-semibold px-2 py-0.5 rounded-full` |
| «0 նոր» badge | `bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full` |
| Frequency segmented | `inline-flex rounded-lg border border-gray-200 p-0.5` |
| Active segment | `bg-primary text-white rounded-md px-3 py-1 text-xs` |
| Inactive segment | `text-gray-600 px-3 py-1 text-xs hover:bg-gray-50` |
| [Բացել] CTA | `bg-primary text-white h-9 rounded-lg px-4 text-sm font-medium` |
| [Ջնջել] | `text-gray-400 hover:text-red-500` |
| Empty illustration | `w-32 h-32 text-gray-300` (զանգ) |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Page header

- **Breadcrumbs.** `Գլխավոր › Պահված որոնումներ`։
- **H1.** «Պահված որոնումներ» + քանակ։
- **Subtitle.** «Ստացիր ծանուցում, երբ նոր գույք համապատասխանի քո չափանիշներին» (`text-gray-500 text-sm`)։
- **Cross-link.** **[♡ Ընտրանի]** → `/favorites` (վերին աջ)։

### 3.2 List of saved searches (card-ի անատոմիա)

Ուղղահայաց ցուցակ; ամեն տող = card.
- **Անվանում.** Օգտատիրոջ տվածը կամ auto-generated (օր․ «2 սեն. · Արաբկիր · ≤100K$»)։
- **Filter summary (chips).** Մարդկային-ընթեռնելի ֆիլտրերի ամփոփում chip-երով՝
  `Վաճառք · Բնակարան · Երևան, Արաբկիր · 2 սենյակ · 50–80 m² · ≤ 100,000 USD`։ Շատ chip → wrap; ավելորդը՝ «+2 ֆիլտր»։
- **«N նոր» badge.** Վերջին այցից/ծանուցումից հետո հայտնված համապատասխան listing-ների քանակ (`new_match_count`)։ 0 → gray «0 նոր»։
- **Alert frequency toggle** (տես 3.3) + վերջին ստուգման ժամ՝ «վերջին՝ 2ժ առաջ»։
- **Actions row** (տես 3.4)։

### 3.3 Alert frequency toggle

Ամեն saved search-ի համար segmented control (desktop) / dropdown (mobile).
- **Անջատ (Off)** — միայն պահում, առանց email։
- **Ակնթարթ (Instant)** — նոր match-ին պես (batched ~15 րոպեն մեկ՝ spam-ից խուսափելու)։
- **Օրական (Daily)** — օրը մեկ digest (default՝ առավոտ 09:00 user TZ)։
- **Շաբաթական (Weekly)** — շաբաթը մեկ digest։
- **States.** active segment `bg-primary text-white`; hover inactive `bg-gray-50`; click → optimistic update + `PATCH /api/saved-searches/[id] { alert_frequency }` + toast «Ծանուցումը թարմացվեց»։ Error → rollback։

### 3.4 Actions (ամեն card-ի վրա)

- **[🔍 Բացել որոնումը]** → `/search?[filters querystring]` (կիրառում է պահված ֆիլտրերը) + նշում search-ը «դիտված» (reset `new_match_count` → 0)։
- **[✏️ Խմբագրել ֆիլտրերը]** → modal՝ նույն controls-ը՝ ինչ `/search` (filter panel) → **[Պահպանել]** = `PATCH { filters }`։
- **[Aa Վերանվանել]** → inline edit / modal → `PATCH { name }`։
- **[🗑 Ջնջել]** → confirm → `DELETE /api/saved-searches/[id]` + toast + undo (5 վրկ)։
- **«⋯» menu** (mobile-ում)՝ նույն գործողությունները collapse-ված։

### 3.5 Ինչպես է ստեղծվում saved search-ը (search էջից)

- `/search` (`02-search.md`) ֆիլտրեր կիրառելուց հետո՝ toolbar-ում **[💾 Պահել որոնումը]** button (icon՝ 🔔)։
- Click →
  - **Guest** → login modal (`/auth/login?redirect=/search?...`)։
  - **User** → modal՝ «Անվանում» (prefilled auto-name) + alert frequency ընտրություն (default՝ Daily) → **[Պահպանել]** = `POST /api/saved-searches { name, filters, alert_frequency }`։
- Հաջողություն → toast «Որոնումը պահված է» + **[Տես պահված որոնումները]** → `/saved-searches`։
- Եթե նույն ֆիլտրերով արդեն կա → toast «Այս որոնումն արդեն պահված է» (dedupe ըստ filters hash)։

### 3.6 Email alert behavior (Resend)

- **Match logic.** Scheduled job (Supabase Edge Function / scheduled task) պարբերաբար գործարկում է ամեն active saved search-ի `filters`-ը properties-ի դեմ → գտնում `created_at > last_alerted_at` նոր match-երը։
- **Frequency-ով խմբավորում.**
  - Instant՝ batch ~15 րոպե, ուղարկվում է միայն եթե ≥1 նոր match։
  - Daily/Weekly՝ digest cron-ով (user TZ-ով)։
- **Email բովանդակություն (Resend template, ընտրած լեզվով).**
  - Subject՝ «3 նոր գույք քո որոնման համար՝ [search name]»։
  - Մինչև ~5 property card (նկար, գին, key facts) + **[Տես բոլորը]** → `/search?...`։
  - Ամեն card → `/property/[id]?utm=alert`։
  - Footer՝ **[Ծանուցումները կառավարել]** → `/saved-searches` · **[Անջատել]** (one-click off → frequency=off)։
- Ուղարկելուց հետո՝ `last_alerted_at = now()`; Resend delivery status-ը log-վում է։

### 3.7 Empty state

- Icon (զանգ `w-32 h-32 text-gray-300`) + «Դեռ պահված որոնում չունես»։
- Տեքստ՝ «Որոնիր գույք, կիրառիր ֆիլտրերը ու սեղմիր «Պահել որոնումը»՝ նոր առաջարկների մասին տեղեկանալու համար»։
- **[Սկսել որոնումը]** primary → `/search`։

### 3.8 Guest state

- Login wall card՝ «Մուտք գործիր՝ քո պահված որոնումները տեսնելու համար» + **[Մուտք գործել]** → `/auth/login?redirect=/saved-searches` · **[Գրանցվել]**։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Card skeleton (3–4 gray row shimmer) |
| **Loaded (≥1)** | Card list + frequency toggles + «N նոր» badges |
| **Empty (0)** | Զանգ illustration + «Դեռ պահված որոնում չունես» + [Սկսել որոնումը] |
| **Guest** | Login wall card |
| **Frequency saving** | Optimistic segment + toast «Ծանուցումը թարմացվեց» |
| **Edit filters open** | Filter modal (search controls) |
| **Deleting** | Optimistic remove + toast + [Հետ բերել] (5վ) |
| **Limit reached** | Save modal-ում warning «Հասել ես 10 պահված որոնման սահմանին» |
| **Filter drift** | Card-ում notice «Թարմացրու ֆիլտրերը» (ջնջված քաղաք/category) |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

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
 ├─ <EmptySavedSearches />  (պայմանով՝ count===0)
 └─ <SavedSearchesLoginWall /> (պայմանով՝ guest)
```

### Data fields used

`saved_searches(id, user_id, name, filters(json), alert_frequency, last_alerted_at, new_match_count, created_at)`։ `filters` JSON-ը նույն shape-ն ունի, ինչ `/search` query-ն (deal_type, property_type, city, district, rooms, area_min/max, price_min/max, currency, amenities[])։

### API contract-ներ

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
// 409     { "error": "duplicate" }   → toast «Արդեն պահված է»
// 422     { "error": "limit_reached" } → «10 որոնման սահման»
```

**`PATCH /api/saved-searches/[id]`** → `{ name? , filters? , alertFrequency? }` → `200`

**`DELETE /api/saved-searches/[id]`** → `200 { "deleted": true }` (undo = re-POST)

**Unsubscribe (signed, auth-free).** `GET /api/saved-searches/unsubscribe?token=<signed>` → `200` → frequency=off։

### Backend job (cron)

```
scheduled-task (~15min instant / daily 09:00 / weekly Mon 09:00)
  → ամեն active saved_search-ի համար:
      match = properties WHERE matches(filters) AND created_at > last_alerted_at
      եթե match.length ≥ 1:
          Resend digest (locale-based template)
          last_alerted_at = now(); new_match_count += match.length
```

### Validation (zod)

```ts
const savedSearchSchema = z.object({
  name: z.string().min(1, "Անվանումը պարտադիր է").max(60),
  filters: searchFiltersSchema,        // reuse /search-ի schema
  alertFrequency: z.enum(["off","instant","daily","weekly"]).default("daily"),
});
```

- **Limit.** User՝ max 10 saved search (Pro՝ ավելի)՝ abuse/cron load-ից խուսափելու։
- **Dedupe.** Նույն `filters` hash-ով կրկնակի save → 409։
- **Timezone.** Daily/Weekly digest-ը user-ի TZ-ով (settings-ից), default՝ Asia/Yerevan։
- **Unsubscribe token.** Signed (HMAC), expiry-less, one-click off առանց login-ի (deliverability)։

---

## 6. Responsive

- **≥1024px (lg).** Card full-width, frequency segmented control inline, actions row տեսանելի։
- **768–1023px (md).** Card full-width, actions-ը wrap։
- **<768px (sm).** Card stack; frequency-ն dropdown; actions-ը «⋯» menu; breadcrumbs «‹ Հետ»; edit filters-ը full-screen modal։

---

## 7. Accessibility

- Frequency segmented control՝ ARIA `radiogroup` / `radio`, ←/→ նավիգացիա, `aria-checked`։
- «N նոր» badge՝ `aria-label="3 նոր համապատասխան գույք"`։
- Filter chip-երը՝ decorative (`aria-hidden` եթե կրկնում են card title-ը) կամ կարդացվող summary։
- Delete confirm՝ focus trap modal, ESC փակում; toast undo՝ `role="status"`։
- Email-ները՝ `List-Unsubscribe` header + plaintext fallback; contrast ≥ 4.5:1; touch target ≥ 44px։

---

## 8. SEO & meta

- **noindex, nofollow** — անձնական, auth-gated (`robots: noindex, nofollow`)։
- `<title>` = «Պահված որոնումներ | {brand}»։
- Email digest-ները՝ proper `List-Unsubscribe` և `List-Unsubscribe-Post` header deliverability-ի համար, valid SPF/DKIM (Resend domain)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `saved_searches_view` | Էջի load | `count` |
| `saved_search_create` | Search-ից [Պահել] | `search_id, frequency` |
| `saved_search_open` | [🔍 Բացել որոնումը] | `search_id` |
| `saved_search_edit` | [✏️ Խմբագրել] save | `search_id` |
| `saved_search_rename` | [Aa Վերանվանել] | `search_id` |
| `saved_search_delete` | [🗑 Ջնջել] | `search_id` |
| `alert_frequency_changed` | Frequency toggle | `search_id, frequency` |
| `alert_email_sent` | Cron digest send | `search_id, match_count` |
| `alert_email_opened` | Email open pixel | `search_id` |
| `alert_property_click` | Email card click | `search_id, property_id` |
| `alert_unsubscribe` | Email [Անջատել] | `search_id` |
