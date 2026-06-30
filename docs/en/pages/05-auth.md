# Page 05 — Auth (Login / Register) 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard. Includes: overview, scenarios, layout/sizing/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/auth/login` · `/auth/register` · `/auth/forgot-password` · `/auth/reset` · `/auth/verify` · `/auth/callback` (OAuth)
**Roles.** Guest (already logged-in users: redirect → `/dashboard` or `?next`).
**Primary goal.** Register/log in the user **quickly and securely** with a User or Agent role, verify email + phone, and enable one-tap login via Google OAuth. Auth is the **gate** for all gated actions (favorite, message, listing creation).

---

## 0. Overview

The auth flow is the path by which a guest becomes an account holder. It is **not** a conversion page in itself, but it is a **blocking gate** for conversion: if a person gets stuck here (confusing form, slow OTP, unclear error), the lead is lost. Hence the principles: (1) **minimal chrome** — no mega-menu, nothing distracting, just the form + logo + lang switcher; (2) **one screen, one decision** — a single primary action per page; (3) **anti-friction** — Google OAuth at the top, password show/hide, inline validation, autofill support; (4) **anti-abuse** — rate-limiting, captcha, enumeration-resistant messages.

**All** auth pages render on the client (`'use client'`), since the Supabase Auth SDK runs in the browser; on the server there is only session checking (middleware) and the `/auth/callback` route handler. Auth pages must be **trilingual** (hy/ru/en) even before login, since the guest's locale is already known from the URL (`/hy/auth/login`).

The `?next=` parameter runs like a red thread through the entire flow — login → register → verify → OAuth callback — and at the end returns the user to exactly where they started (for example, the property page from which they tapped favorite).

---

## 1. User scenarios

**Scenario A — New buyer Aram (favorite gate, mobile).** Aram taps the **♡** on a property page but is not logged in. `/auth/login?next=/hy/property/8423/...` opens. Aram has no account, taps **"Register"**, chooses **"As a person"**, fills in name/email/phone/password, taps **[Register]**. He moves on to `/auth/verify`: he enters the 6-digit code that arrived by email, then the SMS code. → redirect to that very property page, and the favorite is applied automatically.

**Scenario B — Returning Maria (Google one-tap, desktop).** Maria previously registered with Google. She opens `/auth/login`, taps **[Continue with Google]**, picks her account in the popup, and logs in within 1 second → `/dashboard`. No password entered.

**Scenario C — Forgotten password, David (reset).** David doesn't remember his password. `/auth/login` → **[Forgot your password?]** → enters email → sees a neutral message "If an account exists for this email, we've sent a link". From the email he opens the link → `/auth/reset?token=...`, sets a new password (strength meter green), → all old sessions are invalidated, redirect to `/auth/login` with a toast "Password updated".

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
│              │  H1 «Log in»                   │              │
│              │  subtitle (text-gray-500)       │              │
│              │                                 │              │
│              │  [ Continue with Google ]       │              │
│              │  ──────── or ────────            │              │
│              │  Email   [____________]          │              │
│              │  Password [______] 👁           │              │
│              │  ☐ Remember me   Forgot? →      │              │
│              │  [   Log in   ]                  │              │
│              │                                 │              │
│              │  No account? → Register          │              │
│              └──────────────────────────────┘              │
│                 Terms · Privacy (text-xs)                    │
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — full-width card

```
┌──────────────────────────┐
│ [LOGO]          [🌐 HY ▾]│
├──────────────────────────┤
│  H1 «Log in»             │
│  subtitle                 │
│                           │
│ [ Continue with Google ] │
│ ──────  or  ──────        │
│  Email   [____________]   │
│  Password [______] 👁     │
│  ☐ Remember   Forgot? →  │
│  [   Log in   ]           │
│                           │
│  No account? → Register   │
└──────────────────────────┘
```

- The card is centered both vertically and horizontally (`min-h-screen flex items-center justify-center bg-gray-50`).
- Auth pages have **no** mega-menu header/footer — only the logo (top left) + lang switcher (top right) + small legal links in the background.
- On mobile the card's `shadow` lightens, padding is `p-6`, width is `w-full` (with `px-4` at the edges).

### Design tokens (for auth pages)

| Element | Tailwind / value |
|------|------------------|
| Card | `bg-white rounded-2xl shadow-lg p-8 w-full max-w-[420px]` |
| H1 title | `text-2xl font-semibold text-gray-900` |
| Subtitle | `text-sm text-gray-500 mt-1` |
| Input | `h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-primary/40 focus:border-primary` |
| Input (error) | `border-red-500 focus:ring-red-200` |
| Label | `text-sm font-medium text-gray-700 mb-1` |
| Inline error | `text-xs text-red-600 mt-1` (`role="alert"`) |
| Primary CTA | `bg-primary text-white h-11 rounded-lg w-full font-medium hover:bg-primary/90 disabled:opacity-50` |
| OAuth button | `border border-gray-300 h-11 rounded-lg w-full flex items-center justify-center gap-2 hover:bg-gray-50` |
| Divider "or" | `flex items-center gap-3 text-xs text-gray-400` + `flex-1 h-px bg-gray-200` |
| Link | `text-primary font-medium hover:underline` |
| Strength meter | 4 bars: `h-1 rounded-full` (red/orange/yellow/green) |
| OTP box | `w-12 h-14 text-center text-2xl rounded-lg border` |
| Segmented role toggle | `grid grid-cols-2 gap-2`, selected: `border-primary bg-primary/5 ring-1 ring-primary` |

---

## 3. Section-by-section

### 3.1 General layout & `?next=` logic

- **Logo** (top left, `h-8`) → Home (`/`).
- **Lang switcher** (top right) — HY/RU/EN dropdown; the selection changes the route locale while preserving the current path + `?next` (`/hy/auth/login?next=...` → `/ru/auth/login?next=...`).
- **`?next=` flow.** Every gated CTA sends the guest to `/auth/login?next=<encoded-url>`. After a successful login/register/OAuth/verify → redirect to `next`. Default: `/dashboard`.
- **Open-redirect protection.** `next` is accepted **only** if it is a relative internal path (starts with `/` but not `//`, contains no `http://`, `https://`). Otherwise fall back to `/dashboard`.

```ts
function safeNext(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  if (/https?:/i.test(next)) return "/dashboard";
  return next;
}
```

### 3.2 `/auth/register` — Register

**Role choice (step 0).** A segmented toggle at the top of the form, two cards:
- **[👤 As a person]** — selected by default; subtitle "I search for, save, and list properties".
- **[🏢 As an agent]** — subtitle "Pro tools, many listings"; selecting it **smoothly expands** the Agent fields in the form (`agency_name`, `license_no`).
- The selection is stored in `users.role` (`user`/`agent`). Hover: `border-gray-400`; active: `ring-1 ring-primary bg-primary/5`.

**Form fields + states.**

| Field | Type | States / behavior |
|------|-----|----------------|
| Full name | text | default → focus (ring) → error (red border + "Name is required") |
| Email | email | format check on blur; server unique check on submit |
| Phone | tel + country dropdown (🇦🇲 +374 default) | format mask; error "Invalid phone number" |
| Password | password + 👁 toggle | **strength meter** updates live on typing (4 bars) |
| Confirm password | password | live match check; mismatch → "Passwords don't match" |
| Agency name (Agent) | text | required for the Agent role |
| License № (Agent) | text/upload | optional in Phase 1 |
| Terms checkbox | checkbox | unchecked → submit blocked, "You must accept the terms" |
| Marketing opt-in | checkbox | optional |

- **Password show/hide.** 👁 icon at the right of the input; toggle switches `type="password" ↔ "text"`; `aria-label="Show password"`.
- **Strength meter.** weak (1 bar, red) → fair (2, orange) → good (3, yellow) → strong (4, green). Below it: hint "At least 8 characters, a letter and a number".

**Buttons.**
- **[Register]** (primary submit) → `POST /api/auth/register`.
  - *Default* → *loading* (spinner + "Registering…", button disabled, double-submit guard) → *success* → redirect `/auth/verify?next=...`.
  - *Email already exists* → inline error "An account with this email already exists" + link "Log in".
  - *Network error* → toast "Something went wrong, please try again"; the form preserves what was entered.
- **[Continue with Google]** (OAuth, above the divider) → Supabase Google OAuth.
- **Footer link.** "Already have an account? → Log in" → `/auth/login?next=...`.

### 3.3 `/auth/login` — Login

**Fields.** Email · Password (show/hide) · ☐ Remember me (long session).

**Buttons + states.**
- **[Log in]** (primary) → `POST /api/auth/login` (Supabase `signInWithPassword`).
  - *Success* → redirect `next` or `/dashboard`.
  - *Wrong credentials* → generic error "Wrong email or password" (don't reveal which is wrong — against enumeration).
  - *Email not verified* → banner "Verify your email to continue" + **[Resend code]** → `/auth/verify`.
  - *Rate-limited* (5 failures/15 min) → "Too many attempts. Try again in 15 minutes" + captcha.
- **[Continue with Google]** — the same OAuth flow.
- **[Forgot your password?]** → `/auth/forgot-password`.
- **Footer.** "No account? → Register" → `/auth/register?next=...`.

### 3.4 `/auth/verify` — Email + Phone OTP verification

A mandatory gate after registration. Two steps, with a progress indicator "Step 1/2 · Email".

**Email verification.**
- 6-digit OTP code by email (Resend). The **OTP input** = 6 separate boxes, auto-advance on entry, paste support (paste 6 digits → fills all), back via backspace.
- **[Verify]** → `POST /api/auth/verify-email` → `users.email_verified = true` → move to the Phone step.
- **[Resend code]** — **60s cooldown** with a countdown (disabled: "Resend in 0:45").
- *Wrong/expired code* → "The code is wrong or expired" (valid for 10 min).

**Phone verification (SMS OTP).**
- The same 6-digit flow via SMS. **[Verify]** → `users.phone_verified = true`.
- **[Resend]** — the same 60s cooldown.
- **[Skip for now]** (skip) — possible, but no trust badge is granted; some actions (listing creation) require `phone_verified` (config gate).

**Completion.** After both are verified → success toast "Your account is verified" + redirect `next` or `/dashboard`.

### 3.5 `/auth/forgot-password` — Recovery request

- **Email** input + **[Send recovery link]** → `POST /api/auth/forgot-password`.
- **Always** shows the **same** neutral success message: "If an account exists for this email, we've sent a link" (against enumeration, regardless of whether the email exists).
- A link arrives by email → `/auth/reset?token=...` (valid 1h, single-use).
- **[← Back to login]** → `/auth/login`.

### 3.6 `/auth/reset` — New password

- On page load the token (`?token=`) is validated; invalid/expired → error page "The link is expired or already used" + **[Request again]** → `/auth/forgot-password`.
- **New password** + **Confirm** (same validation, strength meter).
- **[Save new password]** → `POST /api/auth/reset` → token consumed → **all active sessions invalidated** (security) → success toast → redirect `/auth/login`.

### 3.7 `/auth/callback` — OAuth callback

- A server route handler (`app/auth/callback/route.ts`). After Google consent, the code is exchanged for a session.
- New user → role default `user`, email already verified (from Google) → sent to `/auth/verify` for phone only (if `phone_verified` is required).
- **Email collision** (Google email = existing password account) → Phase 1: error "An account with this email already exists, log in with your password"; Phase 2: account linking.

---

## 4. Full list of states

| State | What is shown |
|-------|-------------------|
| **Default** | Clean form, primary CTA active |
| **Focus** | Input: `ring-2 ring-primary/40` |
| **Loading (submit)** | Button spinner + disabled, form fields disabled |
| **Field error** | Red border + inline error (`role="alert"`) below the field |
| **Server error (generic)** | Banner above the card "Wrong email or password" |
| **Email unverified** | Yellow banner + [Resend code] |
| **Rate-limited** | Banner "Too many attempts" + captcha widget |
| **OAuth loading** | Google button spinner + redirect popup |
| **Success** | Toast + redirect (`next`/dashboard/verify) |
| **Token invalid (reset)** | Error page + [Request again] |
| **Already logged-in** | Immediate redirect to `/dashboard` (form not rendered) |
| **Network fail** | Toast "Something went wrong", form data preserved |

---

## 5. Technical depth

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

Props (key): `<OtpInput length, value, onChange, onComplete, error />`; `<ResendButton cooldownSec, onResend, disabled />`; `<PasswordInput showStrength, autoComplete />`; `<RoleToggle value: 'user'|'agent', onChange />`.

### Data fields (users entity — see 00-SPEC §7)

`id, role(user/agent), name, email, phone, avatar_url, lang, currency, email_verified, phone_verified, created_at` + (agent) `agency_name, license_no, verified, subscription_tier`.

### API contracts

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
  name: z.string().min(2, "Name is required").max(60),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  password: z.string().min(8, "At least 8 characters")
    .regex(/[a-zA-Z]/, "Must contain a letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirm: z.string(),
  agencyName: z.string().min(2).max(80).optional(),
  terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  marketing: z.boolean().default(false),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"], message: "Passwords don't match",
}).refine((d) => d.role !== "agent" || !!d.agencyName, {
  path: ["agencyName"], message: "Agency name is required",
});

const otpSchema = z.object({ code: z.string().length(6).regex(/^\d{6}$/) });
```

### Security

- **Rate-limit.** Login: 5/15 min by IP+email; OTP resend: 60s cooldown; forgot-password: 3/h by email; register: 5/h by IP.
- **Captcha** (hCaptcha/Turnstile): on register, on login (after 3 failures), on forgot-password.
- **Autocomplete.** `email`, `new-password` (register/reset), `current-password` (login) — for password managers.
- **Session.** Supabase JWT + refresh token; `remember me` → long refresh; after reset all sessions are revoked.
- **RLS.** All tables with RLS; the user sees only their own record.

---

## 6. Responsive

- **≥1024px.** Centered card max-w-[420px] on a `bg-gray-50` background, lang switcher: top right.
- **768–1023px.** The same card, lighter padding.
- **<768px.** Card full-width (`px-4`), lighter shadow; OTP boxes shrunk (`w-10 h-12`); for the virtual keyboard `inputmode="numeric"` on OTP, `inputmode="email"` on email.

---

## 7. Accessibility

- Each input: a linked `<label>` (`htmlFor`); the error: `aria-describedby` + `role="alert"`.
- Password 👁 toggle: `aria-label` + `aria-pressed`.
- OTP input: `aria-label="Verification code, digit {n}"`, focus auto-move; announces "Code entered" to the screen reader.
- Submit error banner: `role="alert"` + focus moves to the banner.
- Touch target ≥ 44px (input/button `h-11`); contrast ≥ 4.5:1; full keyboard-only flow (logical Tab order).
- Google button: text + icon (not icon only).

---

## 8. SEO & meta

- All auth pages: `noindex, nofollow` (robots meta).
- Clean titles: "Login — {brand}", "Register — {brand}", "Password recovery — {brand}".
- No canonical; `hreflang` (hy/ru/en) preserved for the lang switcher.
- OAuth callback: non-indexable, `noindex`.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `auth_register_start` | Register page load | `role, has_next` |
| `auth_register_submit` | [Register] click | `role` |
| `auth_register_success` | 201 response | `role, method=password` |
| `auth_login_submit` | [Log in] click | — |
| `auth_login_success` | 200 response | `method=password\|google` |
| `auth_oauth_click` | Google button | `flow=login\|register` |
| `auth_verify_email_success` | Email OTP verified | — |
| `auth_verify_phone_success` | Phone OTP verified | — |
| `auth_verify_skip` | [Skip] phone | — |
| `auth_otp_resend` | Resend code | `channel` |
| `auth_forgot_submit` | Forgot-password submit | — |
| `auth_reset_success` | New password saved | — |
| `auth_rate_limited` | 429 received | `flow` |
