# Էջ 19 — Landlord Tools (Տանտիրոջ գործիքներ) 🔵 Phase 3

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, sub-tool առ sub-tool վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API, validation), responsive, accessibility, SEO, analytics։

**URL.** `/landlord` (hub) + sub-tools՝ `/landlord/rentals`, `/landlord/screening`, `/landlord/lease`, `/landlord/rent`, `/landlord/list`
**Roles.** User+ (login պարտադիր բոլոր գործիքների համար); մաս function-ներ՝ Pro (`/pro`)։
**Primary goal.** Տանտիրոջ համար մեկ տեղում հավաքել վարձակալության կառավարման գործիքները՝ unit-երի dashboard, վարձակալի screening, lease գեներացիա, online վճարների հավաք, listing shortcut։ Retention + Pro upsell։

> ⚠️ **Իրավական/licensing.** Screening (background check), lease-ի իրավական ուժը, online rent collection-ը **խիստ կախված են երկրից** (Հայաստան vs Ռուսաստան vs այլ CIS)։ Rent collection-ը պահանջում է local payment licensing → **Phase 3+**, per-country rollout։ Բոլոր template-ները՝ «խորհրդատվական, ոչ իրավաբանական խորհուրդ» disclaimer-ով։

---

## 0. Ակնարկ (Overview)

Սա **retention + Pro upsell գործիք հավաքածուն է** այն օգտատերերի համար, ովքեր ունեն վարձով տրվող գույք։ Listing marketplace-ը նրանց բերում է վարձակալ, բայց landlord tools-ը պահում է նրանց հարթակում՝ unit-երը կառավարելու, վարձակալներին screening անելու, lease ստեղծելու և (ուր legal) վարձ հավաքելու համար։ Որքան շատ tool-եր օգտագործի, այնքան բարձր է Pro subscription-ի conversion-ը։

Կրիտիկական սահմանափակում՝ **հարթակը catalog է, ոչ escrow** (00-SPEC §1)։ Rent collection-ը երբեք **փող չի պահում** հարթակում — վճարը գնում է landlord-ի account-ին ուղիղ payment provider-ով։ Screening-ը **ավտոմատ background pull չի անում** (CIS-ում infrastructure-ը սահմանափակ է, legal-ը զգայուն)՝ սկզբում միայն application + ինքնահայտարարություն + ձեռքով review։

Hub-ը marketing landing է (**SSR, indexable**); sub-tool dashboard-ները **login-gated, noindex, RLS owner-scoped** (օգտատերը տեսնում է միայն իր units/applications/leases)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Տանտեր Կարենը (desktop).** Կարենն ունի 3 վարձով բնակարան։ Բացում է `/landlord`, hub-ում տեսնում quick stats «3 ակտիվ · 1,200,000 ֏/ամիս · 1 ուշացած»։ Անցնում **Manage rentals** → unit-ի detail → Payments tab՝ տեսնում, որ մեկ վարձակալ ուշացրել է։ Սեղմում **[💬 Գրել վարձակալին]** → messages thread։ → engagement (`ll_message_tenant`)։

**Սցենար Բ — Նոր տանտեր Անին (mobile).** Անին առաջին անգամ վարձով է տալիս բնակարան։ Hub-ը դատարկ է՝ տեսնում onboarding «Ավելացրու քո առաջին վարձով գույքը»։ Անցնում **Create a lease** → ընտրում հայերեն template, long-term → լրացնում կողմեր, վարձ 250,000 ֏, դեպոզիտ, կանոններ → **[Generate / Preview]** → PDF preview → **[⬇️ Download PDF]**։ → activation (`ll_lease_generated`)։

**Սցենար Գ — Վարձակալ Դավիթը (screening link).** Դավիթը ստանում է landlord-ի share link-ը։ Բացում, լրացնում application form (անուն, զբաղվածություն, եկամուտ, references), նշում **consent checkbox**, submit։ Landlord-ի inbox-ում հայտնվում է «New» application։ Landlord-ը review է անում, **[Հաստատել]** → անցնում lease creation-ի, tenant data prefilled։ → funnel (`ll_application_submitted` → `ll_application_approved`)։

---

## 2. Layout & visual structure

### Hub desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ H1 «Տանտիրոջ գործիքներ»  subtitle                          │
│ ┌── QUICK STATS (եթե ունի units) ─────────────────────────┐│
│ │ 3 ակտիվ │ 1.2M ֏/ամիս │ 2 բաց հայտ │ 1 ուշացած         ││
│ └──────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────┤
│ ┌─ TOOL CARDS GRID (grid-cols-3 gap-4) ───────────────────┐│
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐                     ││
│ │ │🏢 Manage│ │👤 Screen│ │📄 Lease │                     ││
│ │ │ rentals │ │ tenants │ │ generate│                     ││
│ │ │ [Բացել] │ │ [Բացել] │ │ [Բացել] │                     ││
│ │ └─────────┘ └─────────┘ └─────────┘                     ││
│ │ ┌─────────┐ ┌─────────┐                                 ││
│ │ │💳 Collect│ │➕ List   │  (Collect rent՝ country-gated) ││
│ │ │ rent     │ │ rental  │                                 ││
│ │ └─────────┘ └─────────┘                                 ││
│ └──────────────────────────────────────────────────────────┘│
│ FOOTER                                                       │
└────────────────────────────────────────────────────────────┘
```

### Sub-tool desktop (օր․ Manage rentals — sidebar nav + content)

```
┌──────────────┬─────────────────────────────────────────────┐
│ SUB-NAV      │ CONTENT                                      │
│ (w-56)       │ Units grid / unit detail (tabs)             │
│ ▸ Rentals    │ ┌── Unit card ──┐ ┌── Unit card ──┐         │
│ ▸ Screening  │ │ նկար·հասցե     │ │ Occupied      │         │
│ ▸ Lease      │ │ Vacant badge  │ │ վարձ·վարձակալ │         │
│ ▸ Rent       │ └───────────────┘ └───────────────┘         │
│ ▸ List       │ [+ Ավելացնել unit]                          │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ H1 + quick stats (wrap)  │
│ ── Tool cards (stack) ── │
│ 🏢 Manage rentals [Բացել]│
│ 👤 Screen tenants        │
│ 📄 Create a lease        │
│ 💳 Collect rent (gated)  │
│ ➕ List your rental      │
├──────────────────────────┤
│ FOOTER                   │
└──────────────────────────┘
(sub-tool-երում sub-nav → top tabs / dropdown)
```

### Design tokens

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-3xl font-bold text-gray-900` |
| Quick stat | `text-2xl font-bold` + label `text-xs text-gray-500` |
| Tool card | `shadow-sm border border-gray-200 rounded-xl p-5 hover:shadow-md` |
| Tool icon | `w-10 h-10 text-primary` |
| Status Occupied | `bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded` |
| Status Vacant | `bg-gray-100 text-gray-600` |
| Status Listed | `bg-blue-50 text-blue-600` |
| Payment Ուշացած | `bg-red-100 text-red-700` |
| Payment Վճարված | `bg-green-100 text-green-700` |
| App status New | `bg-blue-50 text-blue-600`, Approved `bg-green-100 text-green-700`, Rejected `bg-gray-100 text-gray-500` |
| Disclaimer | `text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded p-3` |
| Country-gated badge | `bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded` («Շուտով») |
| Primary CTA | `bg-primary text-white h-11 rounded-lg px-5 font-medium hover:bg-primary/90` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Hub (`/landlord`)

- **Header / intro.** H1 «Տանտիրոջ գործիքներ» + subtitle «Կառավարիր քո վարձով գույքը մեկ տեղում»։
- **Quick stats** (եթե ունի units)՝ ակտիվ վարձ., ամսական եկ., բաց application-ներ, ուշացած վճարներ։
- **Tool cards (4–5 grid).** Ամեն card՝ icon + անուն + 1 տող + [Բացել]՝
  1. **Manage rentals** → `/landlord/rentals`
  2. **Screen tenants** → `/landlord/screening`
  3. **Create a lease** → `/landlord/lease`
  4. **Collect rent online** → `/landlord/rent` *(Phase 3+, country-gated՝ unsupported երկրում «Շուտով» badge + disabled)*
  5. **List your rental** → `/sell/new?dealType=rent`
- **Onboarding (դատարկ).** «Սկսիր՝ ավելացրու քո առաջին վարձով գույքը» → CTA։

### 3.2 Sub-tool 1 — Manage Rentals (`/landlord/rentals`)

- **Նպատակ.** Dashboard քո վարձով տրվող unit-երի։
- **Units list/grid.** Ամեն unit՝ նկար, հասցե, status (Occupied / Vacant / Listed), ընթացիկ վարձ, վարձակալ, lease-ի ավարտ։
- **[+ Ավելացնել unit]** → form (հասցե, type, m², վարձ, currency) կամ import existing listing-ից։
- **Unit detail (click).**
  - **Tabs.** Overview · Tenant · Lease · Payments · Documents։
  - **Tenant card.** Անուն, կոնտակտ, lease ժամկետ։
  - **Payment status.** Վճարված/ուշացած badge, հաջորդ վճարի ամսաթիվ (link → rent collection)։
  - **Actions.** `[✏️ Խմբագրել]` · `[📄 Lease]` · `[💬 Գրել վարձակալին]` · `[📊 Income report]`։
- **Income overview.** Ամսական եկամուտ (Recharts bar chart), occupancy rate, ուշացած վճարներ։
- **Data.** `rental_units`, `leases`, `rent_payments`։

### 3.3 Sub-tool 2 — Screen Tenants (`/landlord/screening`)

- **Նպատակ.** Վարձակալի հայտ + ստուգում (legal-limited per country)։

> ⚠️ Background/credit check-ը **շատ երկրներում սահմանափակ կամ արգելված** է առանց համաձայնության։ Հայաստանում/CIS-ում full credit-check infrastructure-ը սահմանափակ է → սկզբում միայն **application + ինքնահայտարարություն + landlord-ի ձեռքով review**, ոչ ավտոմատ background pull։

- **Create application link.** Landlord-ը ստեղծում է application unit-ի համար → shareable link/QR վարձակալին։
- **Application form (վարձակալը լրացնում).** Անուն, կոնտակտ, ID (optional), զբաղվածություն/եկամուտ, ընթացիկ բնակություն, references, ինքնահայտարարություն, **consent checkbox**։
- **Applications inbox (landlord).** Ստացված հայտեր ըստ unit-ի՝ status (New / Reviewing / Approved / Rejected)։
- **Application detail.** Տվյալներ + կցված փաստաթուղթ + **[Հաստատել]** / **[Մերժել]** + notes։ Approve → անցում lease creation-ի (prefill tenant data)։
- **Background check (Phase 3+, country-gated).** Միայն ուր legal + provider կա; consent-ով; հստակ «per-country availability» note։
- **Data.** `tenant_applications`։
- **Disclaimer.** «Հետևիր տեղական օրենքին; խտրականությունն արգելված է; screening-ը պահանջում է վարձակալի համաձայնություն»։

### 3.4 Sub-tool 3 — Create a Lease (`/landlord/lease`)

- **Նպատակ.** Վարձակալության պայմանագրի template/գեներատոր լրացվող դաշտերով։
- **Template select.** Ըստ երկրի/լեզվի (hy/ru/en) + deal type (long-term / short-term)։
- **Lease form (fields → document).**
  - Կողմեր՝ տանտեր (անուն, ID) + վարձակալ (prefill screening-ից)։
  - Գույք՝ հասցե, m², նկարագիր։
  - Ժամկետ՝ start/end ամսաթիվ, երկարացման պայման։
  - Վարձ՝ գումար + currency + վճարման օր + ուշացման տույժ։
  - Դեպոզիտ (security deposit) գումար։
  - Կոմունալ՝ ով է վճարում (ցանկ)։
  - Կանոններ՝ ընտանի կենդանի, ենթավարձ, ծխել, repair պատասխանատվություն։
  - Ստորագրության բլոկ։
- **[Generate / Preview]** → render lease document (PDF preview)։
  - **Output.** Fields → template merge → PDF (`leases` + Supabase Storage)։
- **Actions.** `[⬇️ Download PDF]` · `[✉️ Ուղարկել վարձակալին ստորագրման]` (e-sign՝ Phase 3+, provider-dependent) · `[💾 Պահել draft]`։
- **Data.** `lease_templates` (per country/lang), `leases`։
- **Disclaimer.** «Template-ը խորհրդատվական է, ոչ իրավաբանական խորհուրդ; ստուգիր տեղական օրենքի հետ համապատասխանությունը»։

### 3.5 Sub-tool 4 — Collect Rent Online (`/landlord/rent`) — Phase 3+

- **Նպատակ.** Online վարձի հավաք payment provider-ի ինտեգրմամբ։

> ⚠️ **Country-gated.** Կախված է local payment licensing-ից և provider-ից (օր․ local acquiring / банковский перевод)։ Հասանելի է միայն supported երկրներում; մնացածում՝ «Շուտով» + manual tracking only։

- **Setup.** Landlord-ը կապում է payout account (provider onboarding/KYC)։
- **Rent schedule per unit.** Գումար, currency, due day, recurring → ստեղծում է invoice-ներ։
- **Tenant payment.** Վարձակալը ստանում է link/reminder → վճարում (card/transfer ըստ provider-ի)։
- **Dashboard.** Վճարված/սպասվող/ուշացած, history, receipt-ներ, auto-reminder (email/notification)։
- **Manual fallback.** Ուր online չկա՝ landlord-ը ձեռքով նշում «վճարված» + receipt upload (tracking only, no money movement)։
- **Data.** `rent_payments`։
- **Disclaimer.** Հարթակը **փող չի պահում/escrow չի անում** (consistent product model-ի հետ); վճարը գնում է landlord-ի account ուղիղ provider-ով։

### 3.6 Sub-tool 5 — List Your Rental (shortcut)

- **Ի՞նչ է անում.** Արագ link դեպի listing wizard՝ rent mode-ով։
- **[List your rental]** → `/sell/new?dealType=rent` (prefill unit data եթե rentals-ից բացված)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Hub (empty)** | Onboarding CTA «Ավելացրու քո առաջին վարձով գույքը», stats թաքցված |
| **Hub (with units)** | Quick stats + tool cards grid |
| **Rentals loading** | Unit card skeleton grid (shimmer) |
| **Rentals empty** | «Դեռ unit չունես» + [+ Ավելացնել unit] |
| **Screening inbox empty** | «Դեռ հայտ չկա» + [Ստեղծել application link] |
| **Lease draft** | Form-ի կողքին live PDF preview |
| **Rent (gated country)** | «Շուտով քո երկրում» + manual tracking only banner |
| **Country unsupported (tool)** | Tool card disabled «Շուտով» + waitlist |
| **Pro-gated feature** | «Հասանելի է Pro-ով» + [Անցնել Pro] (`/pro`) |
| **Error (API fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<LandlordHub> (Server Component, SSR — marketing landing)
 ├─ <LandlordQuickStats stats />               (client, auth)
 └─ <ToolCardGrid cards countryGated />

<RentalsPage> (login-gated, RLS)
 ├─ <UnitGrid units onAdd />                    (client, React Query)
 └─ <UnitDetail tabs={Overview|Tenant|Lease|Payments|Documents} />
     └─ <IncomeChart data />                    (Recharts)

<ScreeningPage>
 ├─ <ApplicationLinkGenerator unitId />
 └─ <ApplicationsInbox status />  └─ <ApplicationDetail onApprove onReject />

<LeasePage>
 ├─ <TemplateSelect country lang dealType />
 └─ <LeaseForm fields /> ──► <LeasePdfPreview />   (rhf+zod)

<RentCollectionPage> (Phase 3+, country-gated)
 ├─ <PayoutSetup /> · <RentSchedule unitId /> · <PaymentsDashboard />
```

### Data fields used (նոր entity-ներ, տես 00-SPEC §7)

`rental_units: id, owner_id, property_id?, address, type, area_m2, rent, currency, status(occupied/vacant/listed), tenant_id?, created_at`
`tenant_applications: id, unit_id, applicant_name, contact, employment, income, references, declaration, status(new/reviewing/approved/rejected), consent, documents[], created_at`
`lease_templates: id, country, lang, deal_type, body`
`leases: id, unit_id, fields(json), pdf_url, status(draft/sent/signed), created_at`
`rent_payments: id, unit_id, period, amount, currency, status(paid/pending/overdue), provider_ref?, paid_at`

### API contract-ներ

**`GET /api/landlord/rentals`** (login, RLS)
```jsonc
// 200 OK
{ "units": [
  { "id": 14, "address": "Արաբկիր, Կոմիտաս 12", "status": "occupied",
    "rent": 250000, "currency": "AMD", "tenantName": "Դավիթ",
    "leaseEnds": "2026-12-01", "paymentStatus": "paid" }
] }
// 401 { "error": "auth_required" }
```

**`POST /api/landlord/applications`** (create link) → `{ "unitId": 14 }` → `201 { "applicationLink": "https://.../apply/abc123" }`
**`GET /api/landlord/applications?unit=14`** → `200 { "items": Application[] }`
**`PATCH /api/landlord/applications/[id]`** → `{ "status": "approved", "notes": "..." }` → `200`

**`POST /api/landlord/leases`**
```jsonc
// request { "unitId": 14, "templateId": 2, "fields": { "rent": 250000, "deposit": 250000, ... } }
// 201     { "leaseId": 77, "pdfUrl": "https://.../leases/77.pdf" }
// 422     { "error": "invalid_input", "field": "endDate" }
```
**`GET /api/landlord/leases/[id]/pdf`** → `200` (PDF stream)

**`POST /api/landlord/rent/setup`** / **`POST /api/landlord/rent/invoice`** *(Phase 3+, provider, country-gated)* → `403 { "error": "country_unsupported" }` ուր licensing չկա։

### Validation (zod)

```ts
const applicationSchema = z.object({
  applicantName: z.string().min(2, "Անունը պարտադիր է").max(80),
  contact: z.string().min(5, "Կոնտակտը պարտադիր է"),
  employment: z.string().max(200).optional(),
  income: z.number().nonnegative().optional(),
  declaration: z.string().max(2000).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Համաձայնությունը պարտադիր է" }) }),
});

const leaseSchema = z.object({
  unitId: z.number(),
  templateId: z.number(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  rent: z.number().positive("Վարձը պարտադիր է"),
  deposit: z.number().nonnegative(),
}).refine(v => v.endDate > v.startDate, {
  message: "Ավարտը պետք է լինի սկզբից հետո", path: ["endDate"],
});
```

- **RLS owner-scoped.** Landlord-ը տեսնում է միայն իր units/applications/leases (Supabase RLS policy `owner_id = auth.uid()`)։
- **Consent gating.** Screening/background՝ առանց tenant consent → blocked (422)։
- **No money escrow.** Rent collection-ը երբեք չի պահում փող հարթակում; provider-ով ուղիղ landlord account։
- **Country gating.** Rent/screening provider features՝ `403 country_unsupported` ուր licensing չկա → UI «Շուտով»։

---

## 6. Responsive

- **≥1024px (lg).** Hub՝ tool cards 3 սյունակ; sub-tool՝ sidebar nav (`w-56`) + content; unit grid 3 սյունակ; lease form կողքին live PDF preview։
- **768–1023px (md).** Tool cards 2 սյունակ; sub-nav → top tabs; unit grid 2 սյունակ; PDF preview form-ից ներքև։
- **<768px (sm).** Tool cards stack; sub-nav → dropdown; unit grid 1 սյունակ; lease preview full-width modal; chart-ները `ResponsiveContainer`-ով։

---

## 7. Accessibility

- Unit/application card-երը՝ structured headings; status badge-երը տեքստով (ոչ միայն գույն)։
- Tabs (`Overview/Tenant/Lease/Payments`)՝ `role="tablist"`/`tab`/`tabpanel`, keyboard ←/→։
- Lease form՝ բոլոր դաշտերը `<label>`-ով; inline error `role="alert"`; consent checkbox պարտադիր նշում, error հստակ։
- PDF preview-ին՝ «Ներբեռնել PDF» tekstual fallback (preview-ը decorative, ոչ միակ access)։
- Income chart-ին data table fallback; touch target ≥ 44px; contrast ≥ 4.5:1։
- Application link generator՝ QR-ի կողքին copy-able URL (ոչ միայն QR)։

---

## 8. SEO & meta

- **Hub** (`/landlord`)՝ indexable marketing landing՝ `<title>` = «Տանտիրոջ գործիքներ — lease, screening, rent | {brand}»; description՝ գործիքների ամփոփում։
- Sub-tool dashboard-ները (`/landlord/rentals` և այլն)՝ **noindex** (private, login-gated, RLS)։
- Structured data՝ `FAQPage` (hub-ի «Ինչպես աշխատում է» բաժին) + `Service` (գործիք)։
- `hreflang` (hy/ru/en) hub/marketing էջերի համար; OG image՝ generic landlord banner։
- Country-unsupported tool-երը hub-ում տեսանելի են, բայց sub-page-երը՝ `noindex`։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `ll_hub_viewed` | Hub load | `has_units` |
| `ll_tool_opened` | Tool card [Բացել] | `tool` |
| `ll_unit_added` | [+ Ավելացնել unit] success | `unit_id` |
| `ll_message_tenant` | [💬 Գրել վարձակալին] | `unit_id` |
| `ll_app_link_created` | Application link ստեղծում | `unit_id` |
| `ll_application_submitted` | Tenant application submit | `unit_id` |
| `ll_application_approved` | [Հաստատել] | `application_id` |
| `ll_lease_generated` | [Generate / Preview] | `lease_id, country` |
| `ll_lease_downloaded` | [⬇️ Download PDF] | `lease_id` |
| `ll_rent_setup` | Payout account setup | `country` |
| `ll_country_gated` | Country-gated tool տեսնում | `tool, country` |
| `ll_pro_upsell_clicked` | [Անցնել Pro] | `feature` |
