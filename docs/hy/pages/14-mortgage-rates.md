# Էջ 14 — Mortgage Rates (Հիփոթեքի տոկոսադրույքներ) 🔵 Phase 3

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, formula-ներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API, validation), responsive, accessibility, SEO, analytics։

**URL.** `/mortgage/rates` — filter-ով՝ `?type=&term=&amount=&country=`; բանկի պրոֆիլ՝ `/mortgage/rates/[bankSlug]`
**Roles.** Բոլորը (դիտում); pre-approval հայտ՝ login (Guest → login modal `?next`-ով)։
**Primary goal (conversion).** Այցելուն համեմատի բանկերի rate-ները և սեղմի **«Get pre-approved»** (lead) կամ բացի partner bank-ի պրոֆիլը։ Lead-generation funnel դեպի partner banks։

> ⚠️ **Տվյալների աղբյուր.** Սկզբում rate-ները **ձեռքով են պահվում** (partner banks-ի feed-ից կամ admin-ի մուտքից, ոչ live API)։ Ամեն rate ունի `updated_at` և «Թարմացված՝ {ամսաթիվ}» badge։ Հետագայում՝ ավտոմատ feed partner բանկերից։ Սա **տեղեկատվական** է, ոչ պաշտոնական առաջարկ։

---

## 0. Ակնարկ (Overview)

Սա **համեմատման + lead էջն է CIS partner բանկերի համար**։ Մարդը, ով մտածում է հիփոթեքի մասին, ուզում է մեկ տեղում տեսնել՝ ո՛ր բանկն ի՛նչ rate է առաջարկում, և արագ դիմել։ Էջը պետք է՝ (1) ցույց տա համեմատելի **rates table** (sort/filter-ով), (2) տա context՝ **rate-ի տրենդ** + կենտրոնական բանկի key rate (CIS-ում կարևոր), (3) ամեն row-ից առաջարկի **pre-approval** lead capture, և (4) միշտ պահի **disclaimer + թարմացման ամսաթիվ** (legal/financial trust)։

CIS-ի համատեքստում կրիտիկական է **multi-country + multi-currency**՝ բանկը հասանելի է միայն իր երկրներում, USD/RUB/AMD rate-ները խիստ տարբեր են, և key rate-ը (refinance rate) անկայուն է։ Ուստի filter-ը երկիր/արժույթով սահմանափակում է relevant առաջարկները։

Page-ը **SSR** (SEO՝ rate-ները indexable են, country landing-ներ); table-ի sort/filter, chart-ը, pre-approval form-ը client component-ներ (React Query)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Աշոտը (desktop).** Աշոտը Երևանում փնտրում է հիփոթեք USD-ով։ Filter-ում ընտրում երկիր Հայաստան, արժույթ USD, ժամկետ 15 տ, գումար $80,000։ Table-ը ցույց է տալիս 6 բանկ, sort է անում ըստ rate ascending։ Ամենացածր rate-ի row-ը expand է անում՝ տեսնում commission, պահանջներ։ Սեղմում **[Get pre-approved]**, login է անում, լրացնում form-ը → հայտն ուղարկվում է բանկին։ → lead (`mr_preapproval_submitted`)։

**Սցենար Բ — Հետաքրքրասեր Մարինեն (mobile).** Մարինեն ուզում է հասկանալ՝ rate-ները բարձրանու՞մ են։ Table-ը mobile-ում card list է։ Scroll անում trend chart-ին՝ տեսնում, որ 12 ամսում AMD rate-ը 14%-ից իջել է 13%, key rate overlay-ն էլ ընկած։ Որոշում է սպասել/դիմել, սեղմում partner bank-ի logo-ն → bank profile։ → engagement (`mr_bank_profile_viewed`)։

**Սցենար Գ — Վրացի այցելու Նինոն (early country, desktop).** Նինոն ընտրում երկիր Վրաստան՝ դեռ partner չկա։ Table-ի փոխարեն տեսնում empty state «Շուտով քո երկրում» + email collect։ Թողնում email → waitlist։ → demand signal (`mr_waitlist_joined`)։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Հիփոթեքի տոկոսադրույքներ»                               │
│ subtitle «Համեմատիր {N} բանկ {country}-ում»                │
│ «Թարմացված՝ {ամսաթիվ}»  · disclaimer link                  │
├────────────────────────────────────────────────────────────┤
│ FILTER BAR (sticky, h-14, border-y)                         │
│ [Երկիր ▾][Արժույթ ▾][Տեսակ ▾][Ժամկետ ▾][Գումար __][Կիրառել]│
├────────────────────────────────────────────────────────────┤
│ ┌── RATES TABLE ───────────────────────────────────────────┐│
│ │ Բանկ │ Rate↑│ Ծրագիր │Ժամկ.│Կանխ.│Ամս.վճ.│Թարմ.│ CTA    ││
│ │ 🏦 X │ 11.9%│ առաջն. │15-20│ 20% │…֏    │06.01│[Դիմել] ││
│ │ 🏦 Y │ 12.4%│ …      │ …   │ …   │…     │…    │[Դիմել] ││
│ │  (click row → expand՝ պայմաններ, վճարներ, պահանջներ)     ││
│ └──────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ RATE TREND CHART (h-[300px], key-rate overlay)              │
├────────────────────────────────────────────────────────────┤
│ «Get pre-approved» CTA block (form)                         │
│ Partner bank profiles (logo grid)                           │
│ Educational links · DISCLAIMER block                        │
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 + «Թարմացված…»       │
│ [⚙ Ֆիլտր] (bottom-sheet)│
├──────────────────────────┤
│ ── Rate cards (list) ──  │
│ ┌──────────────────────┐ │
│ │ 🏦 X Bank      11.9% │ │
│ │ առաջն. · 15-20 տ     │ │
│ │ ~…֏/ամիս · 06.01     │ │
│ │ [Դիմել] (full-width) │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Trend chart (responsive) │
│ Pre-approval form        │
│ Bank profiles (scroll-x) │
│ DISCLAIMER · FOOTER      │
└──────────────────────────┘
```

- Filter bar-ը desktop-ում sticky `top-16`; mobile-ում **bottom-sheet** ([⚙ Ֆիլտր] button-ով)։
- Table-ը mobile-ում **card list** (բանկ + rate + key facts + CTA)։

### Design tokens

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` |
| «Թարմացված» badge | `text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded` |
| Filter bar | `bg-white border-y border-gray-200 h-14 flex items-center gap-3` |
| Table header | `text-sm font-medium text-gray-500 bg-gray-50` |
| Rate cell | `text-lg font-semibold text-gray-900` («սկսած» prefix `text-xs text-gray-400`) |
| Row hover | `hover:bg-gray-50 cursor-pointer` |
| Expanded row | `bg-gray-50 border-t border-gray-100` |
| Stale badge | `bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded` |
| Partner badge | `bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded` + ✓ |
| Row CTA | `bg-primary text-white h-9 px-4 rounded-lg text-sm hover:bg-primary/90` |
| Bank logo | `w-10 h-10 rounded object-contain` |
| Card | `shadow-sm border border-gray-200 rounded-xl` |
| Disclaimer | `text-xs text-gray-400 leading-relaxed` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Header / intro

- **Տեսք.** H1 + subtitle «Համեմատիր {N} բանկ {country}-ում» (live count)։
- **«Թարմացված՝ {ամսաթիվ}»** badge + disclaimer anchor (smooth scroll դեպի disclaimer block)։
- **Microcopy.** «Տոկոսադրույքները տեղեկատվական են և կարող են փոխվել»։

### 3.2 Filter / parameter bar

- **Տեսք.** Sticky `top-16`, horizontal `flex gap-3`։ Mobile՝ [⚙ Ֆիլտր] → bottom-sheet։
- **Դաշտեր.**
  - **Երկիր** (select) — multi-country; default ըստ geo/locale։
  - **Արժույթ** — AMD/RUB/USD/EUR (header currency, override-ելի)։
  - **Վարկի տեսակ** — առաջնային շուկա / երկրորդային / նորակառույց / refinance / պետական ծրագիր։
  - **Ժամկետ** — 10/15/20/25/30 տ։
  - **Վարկի գումար** (number) — ազդում է tier-ի վրա (որոշ բանկեր rate ըստ գումարի)։
  - **Կանխավճար %** (optional) — որոշ rate-ներ պայմանավորված են LTV-ով։
- **Վարք.** **[Կիրառել]** → re-query (URL `?...` sync); **[Մաքրել]** → reset։
- **Տեխ.** `<RatesFilterBar values onApply />`; URL query-ն single source of truth (shareable/indexable)։

### 3.3 Rates table — **comparison-ի կորիզ**

- **Columns.** Բանկ/Lender (logo + անուն → bank profile) · Տոկոսադրույք («սկսած X%») · Loan type/ծրագիր · Ժամկետ (min–max) · Կանխավճար (min down %) / max LTV · Մոտ. ամսական վճար · Թարմացված (`updated_at`) · [Դիմել]։
- **Ամսական վճար column.** Հաշվ. `amount`-ի և rate-ի base-ով՝ PMT formula-ով (տես `13-mortgage-calc.md` §3.2)։ Currency convert live FX-ով։
- **Behaviors.**
  - **Sort** — ըստ rate / ամսական վճար / բանկ անուն (asc/desc; default rate ascending)։
  - **Click row** → expand՝ պայմաններ, վճարներ (commission, ապահովագրություն), պահանջներ, link դեպի partner profile։
  - **Stale.** `updated_at` > 30 օր → «⚠️ Հնարավոր է հնացած» badge row-ի վրա։
- **Empty state.** Ընտրած filter-ի համար տվյալ չկա → «Այս պարամետրով առաջարկ չկա» + [Մաքրել ֆիլտրը]։
- **Mobile.** Table → card list; sort՝ dropdown card-երից վերև։
- **Տեխ.** `<RatesTable rows={Rate[]} sort onSort />`; amount-ից կախված ամսական վճարը client-side հաշվ. (pure function)։

### 3.4 Rate trend chart

- **Ի՞նչ է անում.** Recharts line chart՝ միջին rate-ի փոփոխությունը ժամանակի ընթացքում (12–24 ամիս), ըստ ընտրած երկիր/արժույթ/term։
- **Տեսք.** `h-[300px]`, tooltip hover-ով, legend term/արժույթով։
- **Lines.** Multiple հնարավոր՝ ըստ term (15 vs 30 տ) կամ ըստ արժույթ (RUB vs USD)։
- **Annotation.** Կենտրոնական բանկի refinance rate (key rate) overlay dashed line-ով, եթե հասանելի (CIS context-ում կարևոր signal)։
- **Data.** `GET /api/mortgage/rate-history?country&currency&term` → ամսական միջին rate (manual/aggregated)։
- **Empty state.** Քիչ history → «Բավարար տվյալ չկա տրենդի համար» (chart թաքցվում է)։

### 3.5 «Get pre-approved» CTA block

- **Ի՞նչ է անում.** Lead capture → ուղարկում է հայտ partner բանկ(եր)ին։
- **Form.** Անուն · Հեռախոս · Եկամուտ (range select) · Վարկի գումար · Երկիր · **consent checkbox** (տվյալների փոխանցում բանկին) → submit։
  - Guest → login/register prompt (lead-ի որակի համար)։
  - **POST `/api/mortgage/preapproval`** → ստեղծում lead, route relevant partner բանկ(եր)ին + email confirm։
- **Microcopy.** Button «Ուղարկել հայտ»; success «Հայտն ուղարկվեց — բանկը կկապվի քեզ հետ»; disclaimer «Սա միայն հայտ է, ոչ հաստատում»։

### 3.6 Partner bank profiles

- **Hub-ում.** Logo grid → ամեն մեկը `/mortgage/rates/[bankSlug]`։
- **Bank profile էջ.** Logo, նկարագիր (`description{hy,ru,en}`), հիփոթեքային ծրագրեր (աղյուսակ), rate-ներ, պայմաններ, մասնաճյուղ/կոնտակտ, **[Դիմել]** CTA, ✓ Partner badge։
- **Data.** `partner_banks`՝ `slug, name, logo, country[], description{hy,ru,en}, programs[], contact`։

### 3.7 Educational / related links

- **Guides.** «Ինչպե՞ս ստանալ հիփոթեք» · «Fixed vs floating rate» · «Ի՞նչ է LTV/DTI» · «Pre-approval-ի քայլերը» → `/guides/[slug]`։
- **Calculators.** → `/mortgage/calculators`։
- **Home value.** → `/home-value`։

### 3.8 Disclaimer block (պարտադիր, footer-ից վերև)

- Rate-ները տեղեկատվական են, փոփոխվում են, և **չեն հանդիսանում առաջարկ**։ Փաստացի պայմանները որոշում է բանկը։ Թարմացման ամսաթիվ + աղբյուր նշված։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Filter bar + table skeleton rows (shimmer) |
| **Loaded** | Filter bar + sorted table + trend chart + CTA + partners |
| **Filtered empty** | «Այս պարամետրով առաջարկ չկա» + [Մաքրել ֆիլտրը] |
| **No partners (early country)** | «Շուտով քո երկրում» + email collect waitlist |
| **Stale rows** | «⚠️ Հնարավոր է հնացած» badge `updated_at` > 30 օր row-երին |
| **Row expanded** | Inline պայմաններ/վճարներ/պահանջներ panel |
| **Pre-approval (guest)** | Submit → login modal `?next`-ով |
| **Pre-approval success** | «Հայտն ուղարկվեց» confirmation |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<MortgageRatesPage> (Server Component, SSR — SEO, country landing)
 ├─ <RatesHeader updatedAt count />
 ├─ <RatesFilterBar values onApply />              (client, URL-synced)
 ├─ <RatesTable rows sort onSort />                (client, React Query)
 │   └─ <RateRowExpanded conditions fees />
 ├─ <RateTrendChart points keyRate />              (client, Recharts)
 ├─ <PreApprovalCtaBlock />                        (client, rhf+zod)
 ├─ <PartnerBankGrid banks={Bank[]} />
 ├─ <RatesEducationLinks />
 └─ <RatesDisclaimer />
```

### Data fields used (տես 00-SPEC §7)

`mortgage_rates (նոր): id, bank_id, country, currency, loan_type, rate_pct, term_min, term_max, min_down_pct, max_ltv, amount_tier_min, amount_tier_max, commission_pct, conditions(json), updated_at, source`
`partner_banks (նոր): id, slug, name, logo, country[], description{hy,ru,en}, programs(json), contact, is_active`
`rate_history (նոր): country, currency, term, month, avg_rate_pct, key_rate_pct`
`preapproval_leads (նոր): id, user_id?, name, phone, income_range, loan_amount, country, bank_ids[], consent, created_at`

### API contract-ներ

**`GET /api/mortgage/rates?country=AM&currency=USD&type=primary&term=15&amount=80000&down=20`**
```jsonc
// 200 OK
{ "updatedAt": "2026-06-01",
  "items": [
    { "bankId": 3, "bankSlug": "ardshinbank", "bankName": "Ardshinbank", "logo": "...",
      "ratePct": 11.9, "loanType": "primary",
      "termMin": 15, "termMax": 20, "minDownPct": 20, "maxLtv": 80,
      "estMonthly": 658, "currency": "USD",
      "commissionPct": 1.0, "updatedAt": "2026-06-01", "stale": false }
  ] }
// 200 (empty) { "updatedAt": "...", "items": [] }
```

**`GET /api/mortgage/rate-history?country=AM&currency=AMD&term=20`**
```jsonc
// 200 OK
{ "points": [ { "month": "2025-07", "avgRatePct": 14.1, "keyRatePct": 9.5 } ] }
```

**`GET /api/mortgage/banks`** → `200 { "items": Bank[] }` · **`GET /api/mortgage/banks/[slug]`** → `200 { ...bankProfile }` · `404 not_found`

**`POST /api/mortgage/preapproval`**
```jsonc
// request { "name": "Աշոտ", "phone": "+374...", "incomeRange": "500k-800k",
//           "loanAmount": 80000, "country": "AM", "bankIds": [3], "consent": true }
// 201     { "leadId": 412 }
// 401     { "error": "auth_required" }   → login modal
// 422     { "error": "consent_required" }
```

### Validation (zod)

```ts
const preApprovalSchema = z.object({
  name: z.string().min(2, "Անունը պարտադիր է").max(50),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  incomeRange: z.enum(["lt300k","300k-500k","500k-800k","gt800k"]),
  loanAmount: z.number().positive("Գումարը պարտադիր է"),
  country: z.string().length(2),
  bankIds: z.array(z.number()).min(1, "Ընտրիր գոնե մեկ բանկ"),
  consent: z.literal(true, { errorMap: () => ({ message: "Համաձայնությունը պարտադիր է" }) }),
});
```

- **Stale guard.** `updated_at` > 30 օր → `stale: true` server-side (UI badge)։
- **Multi-country.** Բանկը հասանելի է միայն իր `country[]`-ում; filter-ը թաքցնում է irrelevant-ները։
- **Lead privacy.** Pre-approval տվյալները ուղարկվում են միայն ընտրած/relevant partner բանկին, consent checkbox-ով (GDPR/local)։
- Ամսական վճարը convert՝ live FX (`GET /api/fx`)։

---

## 6. Responsive

- **≥1024px (lg).** Full table (8 column), sticky filter bar (`top-16`), trend chart full-width։
- **768–1023px (md).** Table՝ նվազ column (Բանկ, Rate, Ամսական, CTA), մնացածը row expand-ում; filter bar wrap։
- **<768px (sm).** Table → **card list**; filter → **bottom-sheet** ([⚙ Ֆիլտր]); bank profiles scroll-x; chart `ResponsiveContainer`-ով։

---

## 7. Accessibility

- Table՝ ճիշտ `<table>` semantics (`<th scope>`, `<caption>`), sortable header՝ `aria-sort`; row expand՝ `aria-expanded`։
- Mobile card list՝ structured (բանկ անունը heading), CTA-ն `aria-label="Դիմել {bank} բանկին"`։
- Rate-ի փոփոխությունը ոչ միայն գույնով՝ trend chart-ին data table fallback; key-rate line-ը legend-ով նշված։
- Filter bar՝ բոլոր select-երը `<label>`-ով; bottom-sheet՝ focus trap + Esc փակում։
- Pre-approval form՝ inline error `role="alert"`, consent checkbox պարտադիր նշում։
- Touch target ≥ 44px; contrast ≥ 4.5:1։

---

## 8. SEO & meta

- `<title>` = «Հիփոթեքի տոկոսադրույքներ {country} — համեմատիր {N} բանկ | {brand}»; description՝ ամփոփ rate range։
- Country/currency landing-ներ՝ `/mortgage/rates?country=...` indexable variants (canonical խնամքով, primary տարբերակ self-canonical)։
- Bank profile էջեր՝ indexable (`/mortgage/rates/[bankSlug]`)։
- Structured data՝ `FinancialProduct` (ամեն rate / bank program) + `FAQPage` (educational)։
- `hreflang` (hy/ru/en), OG image՝ generic rates banner։
- Stale/empty country՝ `noindex` մինչ partner-ներ լինեն։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `mr_filter_applied` | [Կիրառել] | `country, currency, type, term, amount` |
| `mr_sorted` | Column sort | `column, dir` |
| `mr_row_expanded` | Row expand | `bank_id` |
| `mr_apply_clicked` | Row [Դիմել] | `bank_id, rate_pct` |
| `mr_preapproval_submitted` | Pre-approval form submit | `loan_amount, bank_ids` |
| `mr_bank_profile_viewed` | Bank profile բացում | `bank_slug` |
| `mr_trend_viewed` | Trend chart in-view | `country, currency` |
| `mr_waitlist_joined` | Early-country email collect | `country` |
| `mr_stale_shown` | Stale badge render | `bank_id` |
| `mr_guide_clicked` | Educational link | `slug` |
