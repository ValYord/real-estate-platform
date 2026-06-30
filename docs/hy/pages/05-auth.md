# Էջ 05 — Auth (Մուտք / Գրանցում) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ին։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/auth/login` · `/auth/register` · `/auth/forgot-password` · `/auth/reset` · `/auth/verify` · `/auth/callback` (OAuth)
**Roles.** Guest (արդեն մուտք գործածին՝ redirect → `/dashboard` կամ `?next`)։
**Primary goal.** Օգտատիրոջը գրանցել/մուտքագրել **արագ ու ապահով**՝ User կամ Agent role-ով, հաստատել email + հեռախոս, ապահովել Google OAuth-ով one-tap մուտք։ Auth-ը **gate-ն է** բոլոր gated գործողությունների համար (favorite, message, listing տեղադրում)։

---

## 0. Ակնարկ (Overview)

Auth flow-ն այն ճանապարհն է, որով guest-ը դառնում է հաշիվ ունեցող օգտատեր։ Այն **չի** կոնվերսիայի էջ ինքնին, բայց **blocking gate** է կոնվերսիայի համար. եթե այստեղ մարդը խրվում է (շփոթ ֆորմ, դանդաղ OTP, անհասկանալի error), կորում է lead-ը։ Ուստի սկզբունքները՝ (1) **minimal chrome** — ոչ mega-menu, ոչ ուշադրություն շեղող բան, միայն ֆորմ + logo + lang switcher; (2) **մեկ էկրան, մեկ որոշում** — ամեն էջում մեկ հիմնական գործողություն; (3) **anti-friction** — Google OAuth վերևում, password show/hide, inline validation, autofill աջակցություն; (4) **anti-abuse** — rate-limit, captcha, enumeration-resistant հաղորդագրություններ։

Auth-ի **բոլոր** էջերը render-վում են client-ի կողմից (`'use client'`), քանի որ Supabase Auth SDK-ն browser-ում է աշխատում; server-ում միայն session-ի ստուգում (middleware) և `/auth/callback` route handler-ը։ Auth էջերը պետք է **եռալեզու** լինեն (hy/ru/en) դեռ մինչև մուտքը, քանի որ guest-ի locale-ն արդեն հայտնի է URL-ից (`/hy/auth/login`)։

`?next=` պարամետրը կարմիր թելի պես անցնում է ամբողջ flow-ով՝ login → register → verify → OAuth callback, և վերջում օգտատիրոջը վերադարձնում է հենց այնտեղ, որտեղից սկսել էր (օրինակ՝ որ գույքի էջից favorite-ը սեղմել էր)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Նոր գնորդ Արամը (favorite gate, mobile).** Արամը գույքի էջում սեղմում է **♡**-ը, բայց logged-in չէ։ Բացվում է `/auth/login?next=/hy/property/8423/...`։ Արամը հաշիվ չունի, սեղմում է **«Գրանցվել»**, ընտրում **«Որպես անձ»**, լրացնում անուն/email/հեռախոս/գաղտնաբառ, սեղմում **[Գրանցվել]**։ Անցնում է `/auth/verify`՝ email-ին եկած 6-նիշ code-ը մուտքագրում, ապա SMS code-ը։ → redirect հենց այն գույքի էջ, և favorite-ը ավտոմատ կիրառվում է։

**Սցենար Բ — Վերադարձող Մարիան (Google one-tap, desktop).** Մարիան նախկինում գրանցվել է Google-ով։ Բացում է `/auth/login`, սեղմում **[Շարունակել Google-ով]**, ընտրում account-ը popup-ում, 1 վայրկյանում մտնում է → `/dashboard`։ Password չի մուտքագրում։

**Սցենար Գ — Մոռացված գաղտնաբառ, Դավիթ (reset).** Դավիթը չի հիշում գաղտնաբառը։ `/auth/login` → **[Մոռացե՞լ ես գաղտնաբառը]** → մուտքագրում email → տեսնում neutral հաղորդագրություն «Եթե այս email-ով հաշիվ կա, link ուղարկեցինք»։ Email-ից բացում է link-ը → `/auth/reset?token=...`, սահմանում նոր գաղտնաբառ (strength meter կանաչ), → բոլոր հին session-ները invalidate, redirect `/auth/login` toast-ով «Գաղտնաբառը թարմացվեց»։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — centered card

```
┌────────────────────────────────────────────────────────────┐
│                                          [🌐 HY ▾]          │
│                                                              │
│                     [ LOGO → Home ]                          │
│                                                              │
│              ┌──────────────────────────────┐              │
│              │  Card (max-w-[420px])          │              │
│              │  rounded-2xl shadow-lg p-8      │              │
│              │                                 │              │
│              │  H1 «Մուտք գործել»             │              │
│              │  subtitle (text-gray-500)       │              │
│              │                                 │              │
│              │  [ Շարունակել Google-ով ]       │              │
│              │  ──────── կամ ────────           │              │
│              │  Email   [____________]          │              │
│              │  Գաղտնաբառ [______] 👁           │              │
│              │  ☐ Հիշել ինձ   Մոռացե՞լ ես →    │              │
│              │  [   Մուտք գործել   ]            │              │
│              │                                 │              │
│              │  Հաշիվ չունե՞ս → Գրանցվել        │              │
│              └──────────────────────────────┘              │
│                 Terms · Privacy (text-xs)                    │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — full-width card

```
┌──────────────────────────┐
│ [LOGO]          [🌐 HY ▾]│
├──────────────────────────┤
│  H1 «Մուտք գործել»       │
│  subtitle                 │
│                           │
│ [ Շարունակել Google-ով ] │
│ ──────  կամ  ──────       │
│  Email   [____________]   │
│  Գաղտնաբառ [______] 👁    │
│  ☐ Հիշել   Մոռացե՞լ ես → │
│  [   Մուտք գործել   ]     │
│                           │
│  Հաշիվ չունե՞ս → Գրանցվել │
└──────────────────────────┘
```

- Card-ը կենտրոնացված է ուղղահայաց ու հորիզոնական (`min-h-screen flex items-center justify-center bg-gray-50`)։
- Auth էջերը **չունեն** mega-menu header/footer — միայն logo (վերին ձախ) + lang switcher (վերին աջ) + ֆոնում փոքր legal link-եր։
- Mobile-ում card-ի `shadow`-ը թեթևանում է, padding՝ `p-6`, լայնքը՝ `w-full` (եզրերին `px-4`)։

### Design tokens (auth էջերի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Card | `bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]` |
| H1 վերնագիր | `text-2xl font-semibold text-gray-900` |
| Subtitle | `text-sm text-gray-500 mt-1` |
| Input | `h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-primary/40 focus:border-primary` |
| Input (error) | `border-red-500 focus:ring-red-200` |
| Label | `text-sm font-medium text-gray-700 mb-1` |
| Inline error | `text-xs text-red-600 mt-1` (`role="alert"`) |
| Primary CTA | `bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50` |
| OAuth button | `border border-gray-300 h-11 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-gray-50` |
| Divider «կամ» | `flex items-center gap-3 text-xs text-gray-400` + `flex-1 h-px bg-gray-200` |
| Link | `text-primary font-medium hover:underline` |
| Strength meter | 4 bar՝ `h-1 rounded-full` (red/orange/yellow/green) |
| OTP box | `w-12 h-14 text-center text-2xl rounded-lg border` |
| Segmented role toggle | `grid grid-cols-2 gap-2`, ընտրված՝ `border-primary bg-primary/5 ring-1 ring-primary` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Ընդհանուր layout & `?next=` logic

- **Logo** (վերին ձախ, `h-8`) → Home (`/`)։
- **Lang switcher** (վերին աջ) — HY/RU/EN dropdown; ընտրությունը փոխում է route locale-ը՝ պահպանելով ընթացիկ path + `?next`-ը (`/hy/auth/login?next=...` → `/ru/auth/login?next=...`)։
- **`?next=` flow.** Ամեն gated CTA guest-ին ուղարկում է `/auth/login?next=<encoded-url>`։ Հաջող login/register/OAuth/verify-ից հետո → redirect `next`։ Default՝ `/dashboard`։
- **Open-redirect պաշտպանություն.** `next`-ը ընդունվում է **միայն** եթե relative internal path է (սկսվում է `/`-ով, բայց ոչ `//`-ով, չի պարունակում `http://`, `https://`)։ Հակառակ դեպքում fallback `/dashboard`։

```ts
function safeNext(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (/https?:/i.test(next)) return "/dashboard";
  return next;
}
```

### 3.2 `/auth/register` — Գրանցում

**Role choice (քայլ 0).** Ֆորմի վերևում segmented toggle՝ երկու card:
- **[👤 Որպես անձ]** — default ընտրված; subtitle «Փնտրում, պահում, տեղադրում եմ գույք»։
- **[🏢 Որպես գործակալ]** — subtitle «Pro գործիքներ, շատ հայտարարություն»; ընտրելիս ֆորմում **smooth expand**-ով բացվում են Agent դաշտերը (`agency_name`, `license_no`)։
- Ընտրությունը պահվում է `users.role` (`user`/`agent`)։ Hover՝ `border-gray-400`; active՝ `ring-1 ring-primary bg-primary/5`։

**Ֆորմի դաշտերը + states.**

| Դաշտ | Տիպ | States / վարք |
|------|-----|----------------|
| Full name | text | default → focus (ring) → error (red border + «Անունը պարտադիր է») |
| Email | email | blur-ին format check; submit-ին server unique check |
| Phone | tel + country dropdown (🇦🇲 +374 default) | format mask; error «Անվավեր հեռախոսահամար» |
| Password | password + 👁 toggle | typing-ին **strength meter** թարմացվում է live (4 bar) |
| Confirm password | password | live match check; mismatch → «Գաղտնաբառերը չեն համընկնում» |
| Agency name (Agent) | text | Agent role-ի դեպքում required |
| License № (Agent) | text/upload | optional Phase 1 |
| Terms checkbox | checkbox | unchecked → submit blocked, «Անհրաժեշտ է ընդունել պայմանները» |
| Marketing opt-in | checkbox | optional |

- **Password show/hide.** 👁 icon input-ի աջում; toggle-ով `type="password" ↔ "text"`; `aria-label="Ցույց տալ գաղտնաբառը"`։
- **Strength meter.** weak (1 bar, red) → fair (2, orange) → good (3, yellow) → strong (4, green)։ Տակը՝ hint «Նվազագույնը 8 նիշ, տառ և թիվ»։

**Կոճակներ.**
- **[Գրանցվել]** (primary submit) → `POST /api/auth/register`։
  - *Default* → *loading* (spinner + «Գրանցում…», button disabled, double-submit guard) → *success* → redirect `/auth/verify?next=...`։
  - *Email արդեն կա* → inline error «Այս email-ով հաշիվ արդեն գոյություն ունի» + link «Մուտք գործել»։
  - *Network error* → toast «Ինչ-որ բան սխալ գնաց, փորձիր կրկին»; ֆորմը պահպանում է մուտքագրվածը։
- **[Շարունակել Google-ով]** (OAuth, divider-ից վերև) → Supabase Google OAuth։
- **Footer link.** «Արդեն ունե՞ս հաշիվ → Մուտք գործել» → `/auth/login?next=...`։

### 3.3 `/auth/login` — Մուտք

**Դաշտերը.** Email · Password (show/hide) · ☐ Հիշել ինձ (երկար session)։

**Կոճակներ + states.**
- **[Մուտք գործել]** (primary) → `POST /api/auth/login` (Supabase `signInWithPassword`)։
  - *Success* → redirect `next` կամ `/dashboard`։
  - *Սխալ creds* → generic error «Սխալ email կամ գաղտնաբառ» (չբացահայտել՝ որն է սխալ — enumeration-ի դեմ)։
  - *Email չհաստատված* → banner «Հաստատիր email-դ՝ շարունակելու համար» + **[Կրկին ուղարկել code]** → `/auth/verify`։
  - *Rate-limited* (5 ձախողում/15ր) → «Չափից շատ փորձ։ Փորձիր 15 րոպեից» + captcha։
- **[Շարունակել Google-ով]** — նույն OAuth flow։
- **[Մոռացե՞լ ես գաղտնաբառը]** → `/auth/forgot-password`։
- **Footer.** «Հաշիվ չունե՞ս → Գրանցվել» → `/auth/register?next=...`։

### 3.4 `/auth/verify` — Email + Phone OTP հաստատում

Register-ից հետո պարտադիր gate։ Երկու քայլ՝ progress indicator-ով «Քայլ 1/2 · Email»։

**Email verification.**
- 6-նիշ OTP code email-ով (Resend)։ **OTP input** = 6 առանձին box, auto-advance մուտքագրելիս, paste-support (6 թիվ paste → լրացնում բոլորը), backspace-ով հետ։
- **[Հաստատել]** → `POST /api/auth/verify-email` → `users.email_verified = true` → անցում Phone քայլին։
- **[Կրկին ուղարկել code]** — **cooldown 60վրկ** countdown-ով (disabled՝ «Կրկին ուղարկել 0:45»)։
- *Սխալ/ժամկետանց code* → «Code-ը սխալ է կամ ժամկետանց» (valid 10ր)։

**Phone verification (SMS OTP).**
- Նույն 6-նիշ flow SMS-ով։ **[Հաստատել]** → `users.phone_verified = true`։
- **[Կրկին ուղարկել]** — նույն 60վրկ cooldown։
- **[Բաց թողնել առայժմ]** (skip) — հնարավոր է, բայց trust badge չի տրվում; որոշ գործողություններ (listing տեղադրում) պահանջում են `phone_verified` (config gate)։

**Ավարտ.** Երկուսն էլ հաստատելուց հետո → success toast «Հաշիվդ հաստատված է» + redirect `next` կամ `/dashboard`։

### 3.5 `/auth/forgot-password` — Վերականգնման խնդրանք

- **Email** input + **[Ուղարկել վերականգնման link]** → `POST /api/auth/forgot-password`։
- **Միշտ** ցույց է տալիս **նույն** neutral հաջողության հաղորդագրումը՝ «Եթե այս email-ով հաշիվ կա, link ուղարկեցինք» (enumeration-ի դեմ, անկախ՝ email-ը գոյություն ունի թե ոչ)։
- Email-ով գալիս է link → `/auth/reset?token=...` (valid 1ժ, single-use)։
- **[← Վերադառնալ մուտքին]** → `/auth/login`։

### 3.6 `/auth/reset` — Նոր գաղտնաբառ

- Page load-ին token-ը (`?token=`) validate է լինում; invalid/expired → error էջ «Link-ը ժամկետանց է կամ արդեն օգտագործված» + **[Կրկին խնդրել]** → `/auth/forgot-password`։
- **New password** + **Confirm** (նույն validation, strength meter)։
- **[Պահպանել նոր գաղտնաբառ]** → `POST /api/auth/reset` → token consume → **բոլոր active session-ները invalidate** (անվտանգություն) → success toast → redirect `/auth/login`։

### 3.7 `/auth/callback` — OAuth callback

- Server route handler (`app/auth/callback/route.ts`)։ Google consent-ից հետո code-ը exchange է լինում session-ի։
- Նոր user → role default `user`, email արդեն verified (Google-ից) → ուղարկում `/auth/verify` միայն phone-ի համար (եթե `phone_verified` պահանջվում է)։
- **Email collision** (Google email = գոյություն ունեցող password account) → Phase 1՝ error «Այս email-ով արդեն կա հաշիվ, մուտք գործիր գաղտնաբառով»; Phase 2՝ account linking։

---

## 4. Վիճակների ամբողջական ցանկ (States)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|-------------------|
| **Default** | Մաքուր ֆորմ, primary CTA active |
| **Focus** | Input-ը՝ `ring-2 ring-primary/40` |
| **Loading (submit)** | Button spinner + disabled, ֆորմի fields disabled |
| **Field error** | Red border + inline error (`role="alert"`) դաշտի տակ |
| **Server error (generic)** | Banner card-ի վերևում «Սխալ email կամ գաղտնաբառ» |
| **Email unverified** | Yellow banner + [Կրկին ուղարկել code] |
| **Rate-limited** | Banner «Չափից շատ փորձ» + captcha widget |
| **OAuth loading** | Google button spinner + redirect popup |
| **Success** | Toast + redirect (`next`/dashboard/verify) |
| **Token invalid (reset)** | Error էջ + [Կրկին խնդրել] |
| **Already logged-in** | Անմիջապես redirect `/dashboard` (ֆորմը չի render-վում) |
| **Network fail** | Toast «Ինչ-որ բան սխալ գնաց», ֆորմի data պահպանվում |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<AuthLayout>                          (client, minimal chrome)
 ├─ <Logo /> + <LangSwitcher />
 └─ <AuthCard>
     ├─ <RegisterForm />              (/auth/register)
     │   ├─ <RoleToggle value onChange />
     │   ├─ <GoogleButton next />
     │   ├─ <Divider />
     │   ├─ <Input ... /> ×N
     │   ├─ <PasswordInput strengthMeter />
     │   └─ <Button submit loading />
     ├─ <LoginForm />                 (/auth/login)
     ├─ <VerifyForm step="email|phone" /> (/auth/verify)
     │   └─ <OtpInput length={6} onComplete /> + <ResendButton cooldown={60} />
     ├─ <ForgotPasswordForm />        (/auth/forgot-password)
     └─ <ResetForm token />           (/auth/reset)
```

Props (key)՝ `<OtpInput length, value, onChange, onComplete, error />`; `<ResendButton cooldownSec, onResend, disabled />`; `<PasswordInput showStrength, autoComplete />`; `<RoleToggle value: 'user'|'agent', onChange />`։

### Data fields (users entity — տես 00-SPEC §7)

`id, role(user/agent), name, email, phone, avatar_url, lang, currency, email_verified, phone_verified, created_at` + (agent) `agency_name, license_no, verified, subscription_tier`։

### API contract-ներ

**`POST /api/auth/register`**
```jsonc
// request
{ "role": "user", "name": "Aram", "email": "aram@mail.am",
  "phone": "+37491234567", "password": "Secret123",
  "agencyName": null, "terms": true, "marketing": false }
// 201 { "userId": "uuid", "nextStep": "verify" }
// 409 { "error": "email_taken" }        → inline error + login link
// 422 { "error": "validation", "fields": { "phone": "invalid" } }
// 429 { "error": "rate_limited" }
```

**`POST /api/auth/login`**
```jsonc
// request { "email": "...", "password": "...", "remember": true }
// 200 { "userId": "uuid", "emailVerified": true }
// 401 { "error": "invalid_credentials" }   → generic error
// 403 { "error": "email_unverified" }       → verify banner
// 429 { "error": "rate_limited" }           → captcha
```

**`POST /api/auth/verify-email`** / **`verify-phone`** → `{ "code": "123456" }` → `200 { "verified": true }` · `400 { "error": "invalid_code" }` · `410 { "error": "expired" }`

**`POST /api/auth/resend-otp`** → `{ "channel": "email"|"phone" }` → `200 { "cooldown": 60 }` · `429`

**`POST /api/auth/forgot-password`** → `{ "email": "..." }` → **always** `200 { "ok": true }` (enumeration-resistant)

**`POST /api/auth/reset`** → `{ "token": "...", "password": "..." }` → `200 { "ok": true }` · `410 { "error": "token_invalid" }`

**`GET /api/auth/callback?code=...`** → session exchange → `302` redirect (`next`/verify/dashboard)

### Validation (zod)

```ts
const registerSchema = z.object({
  role: z.enum(["user", "agent"]),
  name: z.string().min(2, "Անունը պարտադիր է").max(60),
  email: z.string().email("Անվավեր email"),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  password: z.string().min(8, "Նվազագույնը 8 նիշ")
    .regex(/[a-zA-Z]/, "Պետք է պարունակի տառ")
    .regex(/[0-9]/, "Պետք է պարունակի թիվ"),
  confirm: z.string(),
  agencyName: z.string().min(2).max(80).optional(),
  terms: z.literal(true, { errorMap: () => ({ message: "Անհրաժեշտ է ընդունել պայմանները" }) }),
  marketing: z.boolean().default(false),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"], message: "Գաղտնաբառերը չեն համընկնում",
}).refine((d) => d.role !== "agent" || !!d.agencyName, {
  path: ["agencyName"], message: "Գործակալության անունը պարտադիր է",
});

const otpSchema = z.object({ code: z.string().length(6).regex(/^\d{6}$/) });
```

### Security

- **Rate-limit.** Login՝ 5/15ր ըստ IP+email; OTP resend՝ 60վրկ cooldown; forgot-password՝ 3/ժ ըստ email; register՝ 5/ժ ըստ IP։
- **Captcha** (hCaptcha/Turnstile)՝ register-ում, login-ում (3 ձախողումից հետո), forgot-password-ում։
- **Autocomplete.** `email`, `new-password` (register/reset), `current-password` (login) — password manager-ի համար։
- **Session.** Supabase JWT + refresh token; `remember me` → երկար refresh; reset-ից հետո բոլոր session-ները revoke։
- **RLS.** Բոլոր tables-ը RLS-ով; user-ը տեսնում է միայն իր record-ը։

---

## 6. Responsive

- **≥1024px.** Centered card max-w-[420px] `bg-gray-50` ֆոնի վրա, lang switcher՝ վերին աջ։
- **768–1023px.** Նույն card, թեթև padding։
- **<768px.** Card full-width (`px-4`), shadow թեթևացած; OTP box-երը՝ փոքրացած (`w-10 h-12`); virtual keyboard-ի համար `inputmode="numeric"` OTP-ին, `inputmode="email"` email-ին։

---

## 7. Accessibility

- Ամեն input-ին՝ կապված `<label>` (`htmlFor`); error-ը՝ `aria-describedby` + `role="alert"`։
- Password 👁 toggle՝ `aria-label` + `aria-pressed`։
- OTP input՝ `aria-label="Հաստատման կոդ, նիշ {n}"`, focus auto-move; screen reader-ին հայտնում է «Կոդը մուտքագրված է»։
- Submit error banner՝ `role="alert"` + focus տեղափոխվում է դեպի banner։
- Touch target ≥ 44px (input/button `h-11`); contrast ≥ 4.5:1; keyboard-only flow ամբողջական (Tab order տրամաբանական)։
- Google button՝ տեքստ + icon (ոչ միայն icon)։

---

## 8. SEO & meta

- Բոլոր auth էջերը՝ `noindex, nofollow` (robots meta)։
- Մաքուր title-ներ՝ «Մուտք — {brand}», «Գրանցում — {brand}», «Գաղտնաբառի վերականգնում — {brand}»։
- Canonical չկա; `hreflang` (hy/ru/en) պահպանվում է lang switcher-ի համար։
- OAuth callback՝ ոչ-indexable, `noindex`։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `auth_register_start` | Register էջի load | `role, has_next` |
| `auth_register_submit` | [Գրանցվել] click | `role` |
| `auth_register_success` | 201 response | `role, method=password` |
| `auth_login_submit` | [Մուտք գործել] click | — |
| `auth_login_success` | 200 response | `method=password\|google` |
| `auth_oauth_click` | Google button | `flow=login\|register` |
| `auth_verify_email_success` | Email OTP հաստատվեց | — |
| `auth_verify_phone_success` | Phone OTP հաստատվեց | — |
| `auth_verify_skip` | [Բաց թողնել] phone | — |
| `auth_otp_resend` | Resend code | `channel` |
| `auth_forgot_submit` | Forgot-password submit | — |
| `auth_reset_success` | Նոր գաղտնաբառ պահպանվեց | — |
| `auth_rate_limited` | 429 ստացում | `flow` |
