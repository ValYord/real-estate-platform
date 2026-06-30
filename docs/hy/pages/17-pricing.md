# Էջ 17 — Pricing / Advertise (Փաթեթներ / Pro) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/pro` (subscription tiers); `/advertise` (բրենդների/ads-ի landing)։
**Roles.** Բոլորը (Guest, User, Agent, Admin) կարող են դիտել; checkout պահանջում է login → Stripe Checkout (Phase 2)։
**Primary goal (conversion).** Գործակալին փոխարկել վճարովի tier-ի (**Pro / Premium**) — բացատրել արժեքը, ցույց տալ comparison table, և մղել **Stripe checkout**։ Monetization-ի գլխավոր էջն է։

---

## 0. Ակնարկ (Overview)

Սա platform-ի **monetization էջն է**։ Free օգտատերերը (User/Agent), ովքեր հասել են իրենց limit-ին (3 հայտարարություն, հիմնական analytics), կամ ուզում են featured placement ու Pro badge, գալիս են այստեղ։ Էջի աշխատանքն է՝ (1) արագ ցույց տալ tier-երի տարբերությունը մեկ comparison table-ով, (2) կառուցել արժեքի ընկալում (feature highlights, testimonials, social proof), և (3) հեռացնել checkout-ի շփումը (monthly/annual toggle, ընտրած currency, մեկ click դեպի Stripe)։

Էջը մեծ մասամբ **static / SSR** է (SEO-ի համար indexable), բայց toggle-ը, checkout կոճակները, FAQ accordion-ը client component-ներ են։ Tier-երի գները գալիս են `GET /api/plans`-ից (currency-aware)։ `/advertise`-ը առանձին flow է՝ բրենդների (բանկ, շինարար) համար, ոչ subscription։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գործակալ Տիգրանը (desktop).** Տիգրանն ունի 3 հայտարարություն Free tier-ով և ուզում է ավելացնել։ Բացում է `/pro`, տեսնում comparison table-ը։ Toggle-ը փոխում է «Տարեկան»-ի, գները ընկնում են «–20%» badge-ով։ Սեղմում է Pro-ի **[Ընտրել Pro]**, login-ից հետո անցնում Stripe Checkout, վճարում։ Webhook-ից հետո tier-ը դառնում Pro, redirect → `/pro/dashboard` toast-ով «Բարի գալուստ Pro»։

**Սցենար Բ — Premium-ի կարիք ունեցող Մարիամը (mobile).** Մարիամը գործակալություն ունի, 15 գործակալ։ Comparison table-ում տեսնում է «Team members՝ Մինչև 10» Premium-ում՝ չի բավարարում։ Scroll անում Enterprise բլոկ, սեղմում **[Կապ վաճառքի թիմի հետ]**, լրացնում form (ընկերություն, 15 գործակալ, email)։ → sales lead record, toast «Կկապվենք 24 ժամում»։

**Սցենար Գ — Արդեն բաժանորդ Կարենը.** Կարենն արդեն Pro է։ Բացում է `/pro`, Pro սյունակի CTA-ն ցույց է «Ձեր ընթացիկ փաթեթը» (disabled), Premium-ինը՝ «Անցնել Premium» (upgrade)։ FAQ-ից կարդում է «Ի՞նչ է լինում downgrade-ից հետո» և սեղմում «Manage billing» → Stripe portal։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — կենտրոնացված, full-width sections

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ HERO (centered, py-16)                                      │
│  H1 «Վաճառիր ավելի արագ՝ Pro գործիքներով»                  │
│  subtitle · [Տեսնել փաթեթները] · «1,200+ գործակալ»         │
├────────────────────────────────────────────────────────────┤
│         [Ամսական] ⟷ [Տարեկան –20%]  (toggle, centered)     │
├──────────────┬──────────────┬───────────────────────────────┤
│ FREE         │ PRO          │ PREMIUM ★ Ամենահայտնի         │
│ 0 ֏          │ 9,900 ֏/ամիս │ 24,900 ֏/ամիս                 │
│ [Սկսել]      │ [Ընտրել Pro] │ [Ընտրել Premium]             │
│ ── features ─┼──── ✓/— ─────┼──── ✓ ───────────────────────│
│ (comparison table — feature rows)                          │
├────────────────────────────────────────────────────────────┤
│ Feature highlights (4 icon cards)                          │
│ Enterprise bloc · [Կապ վաճառքի թիմի հետ]                  │
│ FAQ accordion                                              │
│ Testimonials carousel                                     │
│ Final CTA · FOOTER                                        │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — stacked tier cards

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ HERO (centered)          │
│ H1 · subtitle · CTA      │
├──────────────────────────┤
│ [Ամսական][Տարեկան –20%]  │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ FREE · 0 ֏           │ │
│ │ feature list · [CTA] │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ PRO · 9,900 ֏        │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ PREMIUM ★ · 24,900 ֏ │ │
│ └──────────────────────┘ │
│ Highlights · Enterprise  │
│ FAQ · Testimonials       │
│ FOOTER                   │
└──────────────────────────┘
```

- Desktop-ում tier-երը **comparison table** են (feature row-եր × 3 սյունակ)։ Mobile-ում՝ stacked **tier card**-եր (ամ tier-ի features-ը իր card-ում)։
- Premium սյունակը՝ highlighted (`ring-2 ring-primary`, «★ Ամենահայտնի» badge վերևում)։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Hero H1 | `text-4xl font-bold text-gray-900 text-center` |
| Hero subtitle | `text-lg text-gray-500 text-center` |
| Toggle | shadcn `Switch` / segmented, active՝ `bg-primary text-white` |
| Annual badge | `bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded` «–20%» |
| Tier card | `bg-white border border-gray-200 rounded-2xl p-6` |
| Tier card (Premium) | `ring-2 ring-primary shadow-lg` + «★ Ամենահայտնի» badge |
| Tier name | `text-lg font-semibold text-gray-900` |
| Tier price | `text-3xl font-bold` + `text-base text-gray-500` «/ամիս» |
| Feature ✓ | `text-green-600 w-5 h-5`; — (չկա)՝ `text-gray-300` |
| Comparison table | `border-collapse`, row hover՝ `bg-gray-50`, sticky header row |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full` |
| Disabled CTA | `bg-gray-100 text-gray-400 cursor-not-allowed` |
| Highlight card | `bg-gray-50 rounded-xl p-5`, icon՝ `text-primary w-8 h-8` |
| FAQ item | `border-b border-gray-200 py-4`, chevron rotate animation |
| Testimonial card | `bg-white border rounded-xl p-5`, ⭐ `text-amber-500` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Hero

- **H1.** «Վաճառիր ավելի արագ՝ Pro գործիքներով» (`text-4xl font-bold`, centered)։
- **Ենթավերնագիր.** «Շատ հայտարարություն, վիճակագրություն, featured placement, Pro badge»։
- **[Տեսնել փաթեթները]** primary → smooth-scroll comparison table-ին։
- **Social proof.** «1,200+ գործակալ արդեն օգտվում է» + agency logo strip (Phase 2)։

### 3.2 Monthly / Annual toggle

- **Switch.** `[Ամսական] [Տարեկան –20%]`։ Toggle-ը փոխում է table-ի **բոլոր** գները (client state)։
- **Annual.** «–20%» badge + helper «2 ամիս անվճար»։
- **Data.** `plan.price_monthly` / `plan.price_annual`, ցուցադրվում ընտրած currency-ով (header switcher)։ Annual գինը ցույց է տրվում որպես «/ամիս» (ամսական equivalent) + sub-label «{annual_total} ֏ տարեկան»։

### 3.3 Plan tiers comparison table (Free / Pro / Premium)

3 սյունակ՝ ամեն tier-ի վերևում՝ անուն, գին/ամիս, **CTA**։ Premium՝ «★ Ամենահայտնի» highlight։

| Feature row | Free | Pro | Premium |
|---|---|---|---|
| **Ակտիվ հայտարարություններ** | 3 | 25 | Անսահմ. |
| **Featured / promoted listings** | — | 2/ամիս | 10/ամիս |
| **Analytics (views, leads, charts)** | Հիմնական | Ընդլայնված | Լրիվ + export |
| **Pro badge պրոֆիլում** | — | ✓ | ✓ (Premium badge) |
| **Find-an-Agent ranking priority** | — | Միջին | Բարձր |
| **Lead inbox + request access** | — | ✓ | ✓ priority |
| **Bulk upload (CSV / multi)** | — | — | ✓ |
| **Team members** | — | 1 | Մինչև 10 |
| **Priority support** | — | Email | Email + հեռախ. |
| **Placement երաշխիք** | — | — | ✓ |

- **CTA կոճակներ** ամեն tier-ի տակ՝
  - **Free** → **[Սկսել անվճար]** → register / `/dashboard` (logged-in՝ ուղիղ)։
  - **Pro** → **[Ընտրել Pro]** → `POST /api/billing/checkout` (`plan=pro&cycle=monthly|annual`) → Stripe Checkout։
  - **Premium** → **[Ընտրել Premium]** → checkout (`plan=premium`)։
  - **Guest.** Checkout-ից առաջ login/register step (`?next=/pro&plan=...`)։
  - **Ընթացիկ tier.** CTA-ն դառնում է «Ձեր ընթացիկ փաթեթը» (disabled); ավելի բարձր tier-ը՝ «Անցնել {tier}» (upgrade); ավելի ցածրը՝ «Downgrade»։

### 3.4 Feature highlights (icon բլոկ-ներ)

- 4 քարտ՝ `grid grid-cols-2 md:grid-cols-4 gap-4`։ Ամ քարտ՝ icon + վերնագիր + կարճ նկարագ. + screenshot/illustration՝
  - **📊 Analytics** — «Տես ինչպես են աշխատում քո հայտարարությունները»
  - **⭐ Featured listings** — «Հայտնվիր որոնման վերևում»
  - **✓ Verified badge** — «Կառուցիր վստահություն»
  - **📥 Lead generation** — «Ստացիր ուղիղ հարցումներ գնորդներից»

### 3.5 Enterprise / Agency contact

- **Bloc.** «Մեծ գործակալությո՞ւն ես — custom փաթեթ քո թիմի համար»։
- **[Կապ վաճառքի թիմի հետ]** → contact form modal՝ ընկերության անվանում · գործակալների քանակ · email · հեռ. → `POST /api/leads/enterprise` → sales inbox։
- **Success.** «Շնորհակալություն — կկապվենք 24 ժամվա ընթացքում»։

### 3.6 FAQ accordion

- Collapse/expand items (accordion, multi-open)՝
  - «Ե՞րբ է գանձվում վճարը»
  - «Կարո՞ղ եմ չեղարկել ցանկացած պահի»
  - «Ի՞նչ է լինում հայտարարությունների հետ downgrade-ից հետո» (ավելորդ listings → archived, ոչ ջնջված)
  - «Ո՞ր արժույթներով կարող եմ վճարել»
  - «Կա՞ refund»
  - «Ի՞նչ է featured listing-ը»
- Ամ item՝ click → toggle, chevron rotate animation։

### 3.7 Testimonials

- Carousel / grid՝ գործակալների կարծիքներ՝ avatar, անուն, agency, quote, ⭐ rating։ Auto-rotate (pause on hover), ←/→ arrows։

### 3.8 Final CTA

- «Պատրա՞ստ ես սկսել» → **[Սկսել հիմա]** → smooth-scroll comparison table-ին (կամ ուղիղ checkout, եթե tier preselected է)։

### 3.9 `/advertise` (Ads / banners landing)

Առանձին flow՝ բրենդների/ընկերությունների (բանկ, շինարար) համար՝ **ոչ** subscription։
- **H1.** «Գովազդիր մեր հարթակում»։
- **Audience stats.** Այցելու/ամիս, demographics, քաղաքներ։
- **Ad placement-ների ցանկ.** Home banner · Search sidebar · Property page banner — ամեն մեկը՝ նկար + չափ + գին-from։
- **[Հարցում ուղարկել]** → media-kit / contact form → `POST /api/leads/ads`։
- Phase 3-ի self-serve ads platform-ի հղում (հետո)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading (plans)** | Skeleton՝ 3 tier card outline + toggle placeholder |
| **Loaded (guest/free)** | Բոլոր CTA-ները active, checkout → login step |
| **Loaded (Pro subscriber)** | Pro CTA՝ «Ձեր ընթացիկ փաթեթը» disabled; Premium՝ upgrade |
| **Loaded (Premium subscriber)** | Premium CTA disabled; «Manage billing» link |
| **Annual toggle on** | Բոլոր գները –20% + «2 ամիս անվճար» |
| **Checkout redirect** | Spinner «Տեղափոխվում ենք վճարման էջ...» → Stripe |
| **Payment success** | Redirect `/pro/dashboard` + toast «Բարի գալուստ {tier}» |
| **Payment failed/canceled** | Toast «Վճարումը չավարտվեց» + [Կրկին փորձել]; tier չի փոխվում |
| **Enterprise submitted** | «Կկապվենք 24 ժամում» success state |
| **Error (API fail)** | «Չհաջողվեց բեռնել փաթեթները» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<PricingPage> (Server Component, SSR)
 ├─ <PricingHero onScrollToTable />
 ├─ <BillingCycleToggle value onChange />          (client, state)
 ├─ <PlanComparison plans={Plan[]} cycle currency  (client)
 │              currentTier={tier} />
 │   └─ <PlanCtaButton plan currentTier onCheckout />
 ├─ <FeatureHighlights items={Highlight[]} />
 ├─ <EnterpriseContact />                          (client, form)
 ├─ <PricingFaq items={Faq[]} />                   (client, accordion)
 ├─ <Testimonials items={Testimonial[]} />         (client, carousel)
 └─ <FinalCta />

<AdvertisePage> (SSR)
 ├─ <AdvertiseHero />
 ├─ <AudienceStats />
 ├─ <AdPlacements items={Placement[]} />
 └─ <AdsContactForm />                             (client)
```

### Data fields used (Plan / Subscription — տես 00-SPEC §7)

`plan: { id, tier(free/pro/premium), price_monthly, price_annual, currency, features{listings, featured, analytics, badge, ranking, lead_inbox, bulk_upload, team_seats, support, placement_guarantee}, is_popular }`
`subscription: { user_id, tier, cycle, status(active/canceled/past_due), current_period_end, stripe_customer_id }`
`agents.subscription_tier` (free/pro/premium) — source of truth tier-sync-ից հետո։

### API contract-ներ

**`GET /api/plans?currency=AMD`**
```jsonc
// 200 OK
{
  "plans": [
    { "tier": "free",  "priceMonthly": 0,     "priceAnnual": 0,
      "currency": "AMD", "isPopular": false,
      "features": { "listings": 3, "featured": 0, "analytics": "basic",
                    "badge": false, "teamSeats": 0 } },
    { "tier": "pro",   "priceMonthly": 9900,  "priceAnnual": 95040,
      "currency": "AMD", "isPopular": false,
      "features": { "listings": 25, "featured": 2, "analytics": "extended",
                    "badge": true, "teamSeats": 1 } },
    { "tier": "premium","priceMonthly": 24900,"priceAnnual": 239040,
      "currency": "AMD", "isPopular": true,
      "features": { "listings": null, "featured": 10, "analytics": "full",
                    "badge": true, "teamSeats": 10 } }
  ],
  "currentTier": "free"
}
```

**`POST /api/billing/checkout`**
```jsonc
// request  { "plan": "pro", "cycle": "annual" }
// 200      { "checkoutUrl": "https://checkout.stripe.com/c/..." }  → redirect
// 401      { "error": "auth_required" }     → login (?next=/pro&plan=pro)
// 409      { "error": "already_subscribed" } → «Արդեն բաժանորդ ես»
```

**`POST /api/billing/portal`** → `200 { "portalUrl": "https://billing.stripe.com/..." }` (manage/cancel/payment)

**`POST /api/webhooks/stripe`** (server-to-server) — `checkout.session.completed`, `customer.subscription.updated|deleted` → tier sync (`agents.subscription_tier`), idempotent ըստ `event.id`, signature verify (`stripe-signature` header)։

**`POST /api/leads/enterprise`** → `{ company, agentsCount, email, phone }` → `201 { "leadId": ... }`
**`POST /api/leads/ads`** → `{ company, email, placement, message }` → `201`

### Validation (zod)

```ts
const checkoutSchema = z.object({
  plan: z.enum(["pro", "premium"]),
  cycle: z.enum(["monthly", "annual"]),
});

const enterpriseSchema = z.object({
  company: z.string().min(2, "Ընկերության անվանումը պարտադիր է").max(100),
  agentsCount: z.number().int().min(1).max(10000),
  email: z.string().email("Անվավեր email"),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար").optional(),
  message: z.string().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});
```

- **Currency.** Գները ցուցադրվում են header currency-ով; Stripe-ին գանձումը՝ settlement currency-ով (note FAQ-ում)։ Live exchange rate-ով display conversion։
- **Tax / VAT.** Երկրից կախված ցուցադրվում է Stripe Tax-ով (multi-country)։
- **Idempotency.** Webhook-ը idempotent՝ tier ակտիվանում է **միայն** success webhook-ից հետո (ոչ checkout redirect-ից)։
- **Failed payment.** Stripe `past_due` → grace period + email reminder; tier պահպանվում մինչ retry exhaust։

---

## 6. Responsive

- **≥1024px (lg).** Comparison table 3-սյունակ side-by-side; toggle centered; highlights 4-col։
- **768–1023px (md).** Comparison table՝ horizontal scroll կամ 3 stacked card; highlights 2-col։
- **<768px (sm).** Tier-երը՝ stacked card-եր (ամ tier՝ իր feature list-ով); toggle full-width; highlights 1-2 col; FAQ/testimonials full-width։

---

## 7. Accessibility

- Toggle-ը՝ `role="switch"` + `aria-checked`, keyboard-ով toggle-վող; գնի փոփոխությունը՝ `aria-live="polite"` որ screen reader-ը հայտնի։
- Comparison table-ը՝ ճիշտ `<th scope>` (column = tier, row = feature); ✓/— icon-ները՝ `aria-label="ներառված"` / «չի ներառվում»։
- CTA կոճակները՝ բացատրող text (ոչ միայն «Ընտրել»), disabled-ները՝ `aria-disabled` + tooltip պատճառով։
- FAQ accordion՝ `aria-expanded` + `aria-controls`, keyboard toggle (Enter/Space)։
- Testimonial carousel՝ pause control + `aria-roledescription="carousel"`։
- Contrast ≥ 4.5:1; touch target ≥ 44px։

---

## 8. SEO & meta

- `<title>` = «Pro փաթեթներ գործակալների համար — գին և հնարավորություններ | {brand}»։
- `<meta name="description">` = «Համեմատի՛ր Free, Pro և Premium փաթեթները։ Շատ հայտարարություն, analytics, featured placement»։
- Structured data (JSON-LD)՝ `Product` + `Offer[]` ամեն tier-ի համար (price, priceCurrency, billingDuration) + `FAQPage` (FAQ բաժնի համար)։
- `hreflang` (hy/ru/en), `canonical`։ `/pro` և `/advertise`՝ indexable։
- OG image՝ tier comparison preview (static)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `pricing_view` | Էջի load | — |
| `billing_cycle_toggled` | Monthly/Annual switch | `cycle` |
| `plan_cta_clicked` | Tier CTA click | `plan, cycle` |
| `checkout_started` | Stripe redirect | `plan, cycle, currency` |
| `checkout_completed` | Success webhook → return | `plan, cycle` |
| `checkout_failed` | Failed/canceled | `plan, reason` |
| `enterprise_lead_sent` | Enterprise form submit | `agents_count` |
| `ads_lead_sent` | Advertise form submit | `placement` |
| `faq_opened` | FAQ item expand | `question` |
| `manage_billing_clicked` | Subscriber → portal | `tier` |
