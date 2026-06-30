# Page 17 — Pricing / Advertise (Plans / Pro) 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical part (components, props, data fields, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/pro` (subscription tiers); `/advertise` (landing for brands/ads).
**Roles.** Everyone (Guest, User, Agent, Admin) can view; checkout requires login → Stripe Checkout (Phase 2).
**Primary goal (conversion).** Convert the agent to a paid tier (**Pro / Premium**) — explain the value, show the comparison table, and drive to **Stripe checkout**. This is the main monetization page.

---

## 0. Overview

This is the platform's **monetization page**. Free users (User/Agent) who have hit their limit (3 listings, basic analytics), or who want featured placement and a Pro badge, come here. The page's job is to: (1) quickly show the difference between tiers in a single comparison table, (2) build value perception (feature highlights, testimonials, social proof), and (3) remove checkout friction (monthly/annual toggle, selected currency, one click to Stripe).

The page is mostly **static / SSR** (indexable for SEO), but the toggle, checkout buttons, and FAQ accordion are client components. Tier prices come from `GET /api/plans` (currency-aware). `/advertise` is a separate flow for brands (bank, developer), not a subscription.

---

## 1. User scenarios

**Scenario A — Agent Tigran (desktop).** Tigran has 3 listings on the Free tier and wants to add more. He opens `/pro` and sees the comparison table. He flips the toggle to "Annual", and prices drop with a "–20%" badge. He clicks Pro's **[Choose Pro]**, after login goes to Stripe Checkout, and pays. After the webhook the tier becomes Pro, and he is redirected → `/pro/dashboard` with the toast "Welcome to Pro".

**Scenario B — Mariam, who needs Premium (mobile).** Mariam runs an agency with 15 agents. In the comparison table she sees "Team members: Up to 10" on Premium — not enough. She scrolls to the Enterprise block, clicks **[Contact sales]**, and fills in the form (company, 15 agents, email). → A sales lead record, toast "We'll be in touch within 24 hours".

**Scenario C — Karen, already a subscriber.** Karen is already on Pro. He opens `/pro`; the Pro column CTA shows "Your current plan" (disabled), and Premium's shows "Upgrade to Premium" (upgrade). From the FAQ he reads "What happens after a downgrade?" and clicks "Manage billing" → Stripe portal.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — centered, full-width sections

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ HERO (centered, py-16)                                      │
│  H1 "Sell faster with Pro tools"                           │
│  subtitle · [See the plans] · "1,200+ agents"             │
├────────────────────────────────────────────────────────────┤
│         [Monthly] ⟷ [Annual –20%]  (toggle, centered)      │
├──────────────┬──────────────┬───────────────────────────────┤
│ FREE         │ PRO          │ PREMIUM ★ Most popular        │
│ 0 ֏          │ 9,900 ֏/mo   │ 24,900 ֏/mo                  │
│ [Start]      │ [Choose Pro] │ [Choose Premium]             │
│ ── features ─┼──── ✓/— ─────┼──── ✓ ───────────────────────│
│ (comparison table — feature rows)                          │
├────────────────────────────────────────────────────────────┤
│ Feature highlights (4 icon cards)                          │
│ Enterprise bloc · [Contact sales]                         │
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
│ [Monthly][Annual –20%]   │
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

- On desktop the tiers form a **comparison table** (feature rows × 3 columns). On mobile: stacked **tier cards** (each tier's features in its own card).
- The Premium column is highlighted (`ring-2 ring-primary`, "★ Most popular" badge at the top).

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| Hero H1 | `text-4xl font-bold text-gray-900 text-center` |
| Hero subtitle | `text-lg text-gray-500 text-center` |
| Toggle | shadcn `Switch` / segmented, active: `bg-primary text-white` |
| Annual badge | `bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded` "–20%" |
| Tier card | `bg-white border border-gray-200 rounded-2xl p-6` |
| Tier card (Premium) | `ring-2 ring-primary shadow-lg` + "★ Most popular" badge |
| Tier name | `text-lg font-semibold text-gray-900` |
| Tier price | `text-3xl font-bold` + `text-base text-gray-500` "/mo" |
| Feature ✓ | `text-green-600 w-5 h-5`; — (absent): `text-gray-300` |
| Comparison table | `border-collapse`, row hover: `bg-gray-50`, sticky header row |
| Primary CTA | `bg-primary text-white h-12 rounded-lg w-full font-medium` |
| Secondary CTA | `border border-primary text-primary h-12 rounded-lg w-full` |
| Disabled CTA | `bg-gray-100 text-gray-400 cursor-not-allowed` |
| Highlight card | `bg-gray-50 rounded-xl p-5`, icon: `text-primary w-8 h-8` |
| FAQ item | `border-b border-gray-200 py-4`, chevron rotate animation |
| Testimonial card | `bg-white border rounded-xl p-5`, ⭐ `text-amber-500` |

---

## 3. Section-by-section

### 3.1 Hero

- **H1.** "Sell faster with Pro tools" (`text-4xl font-bold`, centered).
- **Subheading.** "More listings, statistics, featured placement, Pro badge".
- **[See the plans]** primary → smooth-scroll to the comparison table.
- **Social proof.** "1,200+ agents already use it" + agency logo strip (Phase 2).

### 3.2 Monthly / Annual toggle

- **Switch.** `[Monthly] [Annual –20%]`. The toggle changes **all** the table prices (client state).
- **Annual.** "–20%" badge + helper "2 months free".
- **Data.** `plan.price_monthly` / `plan.price_annual`, displayed in the selected currency (header switcher). The annual price is shown as "/mo" (monthly equivalent) + sub-label "{annual_total} ֏ per year".

### 3.3 Plan tiers comparison table (Free / Pro / Premium)

3 columns: above each tier: name, price/mo, **CTA**. Premium: "★ Most popular" highlight.

| Feature row | Free | Pro | Premium |
|---|---|---|---|
| **Active listings** | 3 | 25 | Unlimited |
| **Featured / promoted listings** | — | 2/mo | 10/mo |
| **Analytics (views, leads, charts)** | Basic | Extended | Full + export |
| **Pro badge on profile** | — | ✓ | ✓ (Premium badge) |
| **Find-an-Agent ranking priority** | — | Medium | High |
| **Lead inbox + request access** | — | ✓ | ✓ priority |
| **Bulk upload (CSV / multi)** | — | — | ✓ |
| **Team members** | — | 1 | Up to 10 |
| **Priority support** | — | Email | Email + phone |
| **Placement guarantee** | — | — | ✓ |

- **CTA buttons** below each tier:
  - **Free** → **[Start for free]** → register / `/dashboard` (logged-in: direct).
  - **Pro** → **[Choose Pro]** → `POST /api/billing/checkout` (`plan=pro&cycle=monthly|annual`) → Stripe Checkout.
  - **Premium** → **[Choose Premium]** → checkout (`plan=premium`).
  - **Guest.** A login/register step before checkout (`?next=/pro&plan=...`).
  - **Current tier.** The CTA becomes "Your current plan" (disabled); a higher tier: "Upgrade to {tier}" (upgrade); a lower one: "Downgrade".

### 3.4 Feature highlights (icon blocks)

- 4 cards: `grid grid-cols-2 md:grid-cols-4 gap-4`. Each card: icon + title + short description + screenshot/illustration:
  - **📊 Analytics** — "See how your listings perform"
  - **⭐ Featured listings** — "Appear at the top of search"
  - **✓ Verified badge** — "Build trust"
  - **📥 Lead generation** — "Get direct requests from buyers"

### 3.5 Enterprise / Agency contact

- **Bloc.** "Are you a large agency? A custom plan for your team".
- **[Contact sales]** → contact form modal: company name · number of agents · email · phone → `POST /api/leads/enterprise` → sales inbox.
- **Success.** "Thank you — we'll be in touch within 24 hours".

### 3.6 FAQ accordion

- Collapse/expand items (accordion, multi-open):
  - "When am I charged?"
  - "Can I cancel anytime?"
  - "What happens to my listings after a downgrade?" (extra listings → archived, not deleted)
  - "Which currencies can I pay with?"
  - "Is there a refund?"
  - "What is a featured listing?"
- Each item: click → toggle, chevron rotate animation.

### 3.7 Testimonials

- Carousel / grid: agent reviews: avatar, name, agency, quote, ⭐ rating. Auto-rotate (pause on hover), ←/→ arrows.

### 3.8 Final CTA

- "Ready to start?" → **[Start now]** → smooth-scroll to the comparison table (or direct checkout if a tier is preselected).

### 3.9 `/advertise` (Ads / banners landing)

A separate flow for brands/companies (bank, developer): **not** a subscription.
- **H1.** "Advertise on our platform".
- **Audience stats.** Visitors/month, demographics, cities.
- **List of ad placements.** Home banner · Search sidebar · Property page banner — each one: image + size + price-from.
- **[Send a request]** → media-kit / contact form → `POST /api/leads/ads`.
- A link to the Phase 3 self-serve ads platform (later).

---

## 4. Full list of page states

| State | What is displayed |
|-------|---------------------|
| **Loading (plans)** | Skeleton: 3 tier card outlines + toggle placeholder |
| **Loaded (guest/free)** | All CTAs active, checkout → login step |
| **Loaded (Pro subscriber)** | Pro CTA: "Your current plan" disabled; Premium: upgrade |
| **Loaded (Premium subscriber)** | Premium CTA disabled; "Manage billing" link |
| **Annual toggle on** | All prices –20% + "2 months free" |
| **Checkout redirect** | Spinner "Taking you to the payment page..." → Stripe |
| **Payment success** | Redirect `/pro/dashboard` + toast "Welcome to {tier}" |
| **Payment failed/canceled** | Toast "Payment was not completed" + [Try again]; tier doesn't change |
| **Enterprise submitted** | "We'll be in touch within 24 hours" success state |
| **Error (API fail)** | "Couldn't load the plans" + [Try again] |

---

## 5. Technical depth

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

### Data fields used (Plan / Subscription — see 00-SPEC §7)

`plan: { id, tier(free/pro/premium), price_monthly, price_annual, currency, features{listings, featured, analytics, badge, ranking, lead_inbox, bulk_upload, team_seats, support, placement_guarantee}, is_popular }`
`subscription: { user_id, tier, cycle, status(active/canceled/past_due), current_period_end, stripe_customer_id }`
`agents.subscription_tier` (free/pro/premium) — source of truth after tier-sync.

### API contracts

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
// 409      { "error": "already_subscribed" } → "You're already a subscriber"
```

**`POST /api/billing/portal`** → `200 { "portalUrl": "https://billing.stripe.com/..." }` (manage/cancel/payment)

**`POST /api/webhooks/stripe`** (server-to-server) — `checkout.session.completed`, `customer.subscription.updated|deleted` → tier sync (`agents.subscription_tier`), idempotent by `event.id`, signature verify (`stripe-signature` header).

**`POST /api/leads/enterprise`** → `{ company, agentsCount, email, phone }` → `201 { "leadId": ... }`
**`POST /api/leads/ads`** → `{ company, email, placement, message }` → `201`

### Validation (zod)

```ts
const checkoutSchema = z.object({
  plan: z.enum(["pro", "premium"]),
  cycle: z.enum(["monthly", "annual"]),
});

const enterpriseSchema = z.object({
  company: z.string().min(2, "Company name is required").max(100),
  agentsCount: z.number().int().min(1).max(10000),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number").optional(),
  message: z.string().max(1000).optional(),
  website: z.string().max(0).optional(), // honeypot
});
```

- **Currency.** Prices are displayed in the header currency; the Stripe charge is in the settlement currency (note in the FAQ). Display conversion via live exchange rate.
- **Tax / VAT.** Displayed via Stripe Tax depending on the country (multi-country).
- **Idempotency.** The webhook is idempotent: the tier activates **only** after the success webhook (not from the checkout redirect).
- **Failed payment.** Stripe `past_due` → grace period + email reminder; the tier is preserved until retries are exhausted.

---

## 6. Responsive

- **≥1024px (lg).** Comparison table 3-column side-by-side; toggle centered; highlights 4-col.
- **768–1023px (md).** Comparison table: horizontal scroll or 3 stacked cards; highlights 2-col.
- **<768px (sm).** Tiers: stacked cards (each tier with its feature list); toggle full-width; highlights 1-2 col; FAQ/testimonials full-width.

---

## 7. Accessibility

- The toggle: `role="switch"` + `aria-checked`, keyboard-toggleable; the price change: `aria-live="polite"` so the screen reader announces it.
- The comparison table: correct `<th scope>` (column = tier, row = feature); the ✓/— icons: `aria-label="included"` / "not included".
- The CTA buttons: descriptive text (not just "Choose"), the disabled ones: `aria-disabled` + tooltip with the reason.
- FAQ accordion: `aria-expanded` + `aria-controls`, keyboard toggle (Enter/Space).
- Testimonial carousel: pause control + `aria-roledescription="carousel"`.
- Contrast ≥ 4.5:1; touch target ≥ 44px.

---

## 8. SEO & meta

- `<title>` = "Pro plans for agents — price and features | {brand}".
- `<meta name="description">` = "Compare the Free, Pro, and Premium plans. More listings, analytics, featured placement".
- Structured data (JSON-LD): `Product` + `Offer[]` for each tier (price, priceCurrency, billingDuration) + `FAQPage` (for the FAQ section).
- `hreflang` (hy/ru/en), `canonical`. `/pro` and `/advertise`: indexable.
- OG image: tier comparison preview (static).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `pricing_view` | Page load | — |
| `billing_cycle_toggled` | Monthly/Annual switch | `cycle` |
| `plan_cta_clicked` | Tier CTA click | `plan, cycle` |
| `checkout_started` | Stripe redirect | `plan, cycle, currency` |
| `checkout_completed` | Success webhook → return | `plan, cycle` |
| `checkout_failed` | Failed/canceled | `plan, reason` |
| `enterprise_lead_sent` | Enterprise form submit | `agents_count` |
| `ads_lead_sent` | Advertise form submit | `placement` |
| `faq_opened` | FAQ item expand | `question` |
| `manage_billing_clicked` | Subscriber → portal | `tier` |
