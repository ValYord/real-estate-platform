# Page 21 — Settings 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard. Includes: overview, scenarios, layout/sizing/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, API contracts, validation), responsive, accessibility, SEO, analytics.

**URL.** `/settings` (deep-link tab: `/settings/profile`, `/settings/account`, `/settings/preferences`, `/settings/notifications`, `/settings/privacy`, `/settings/agent`)
**Roles.** User+ (for Agent: an additional Agent tab). Guest → redirect `/auth/login?next=/settings`.
**Primary goal.** The user manages their profile, account, preferences (language/currency/theme), notifications, and privacy in one place, with simple tabs, **without fear of clicking something wrong** (clear save behavior, confirm danger actions).

---

## 0. Overview

Settings is an "administrative" page — the user comes for something specific (change password, turn off a notification, delete account). Hence the principles: (1) **clear save model** — so the user never wonders "did it save?": form-style fields (name, bio) have an explicit **[Save]** button with a dirty state, while toggles (language, theme, notifications) are **instant save** + a "Saved" toast; (2) **safety** — destructive actions (account deletion, email change) require confirm + re-verify; (3) **deep-linkable tabs** — each tab has its own URL so that Settings links (e.g. from the notification dropdown → `/settings/notifications`) open the right tab directly.

The layout is vertical tabs (left) + the active tab's form (right). The page is client-side (form state, instant toggle), but the initial data is SSR pre-loaded (`GET /api/users/me`). Leaving a tab/page with unsaved changes triggers a confirm dialog.

---

## 1. User scenarios

**Scenario A — Language change, Gayane (instant).** Gayane wants a Russian interface. Settings → Preferences → from the Language radio she picks "Russian". The UI changes **immediately** (route `/hy/settings` → `/ru/settings`), toast "Saved" (in the Russian locale: "Сохранено"), `users.lang = ru`. No need to press a Save button.

**Scenario B — Password change, Arman (account security).** Arman suspects his password is compromised. Settings → Account → Change password: he enters current + new (strength meter green) + confirm → **[Update password]** → toast + with the checkbox he selects "Sign out other devices" → the other sessions log out.

**Scenario C — Account deletion, Sofi (danger zone).** Sofi wants to delete her account. Account tab → Danger zone → **[Delete account]** → a modal explains "These will be deleted: 2 listings, 5 favorites, all messages" and requires typing "DELETE" → the button becomes active → `DELETE` → logout → Home + toast "Your account has been deleted".

---

## 2. Layout & visual structure

### Desktop (≥1024px) — vertical tabs + form

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────┬─────────────────────────────────────────────┤
│ TABS NAV     │ FORM (selected tab)                          │
│ (w-56)       │  H2 «Profile»                                │
│              │                                               │
│ 👤 Profile   │  [avatar] [Change][Remove]                   │
│ 🔐 Account   │  Name      [____________]                     │
│ ⚙️ Preferenc.│  Phone     [+374 ______]                     │
│ 🔔 Notif.    │  Bio       [____________]                     │
│ 🔒 Privacy   │            [____________]                     │
│ 🏢 Agent     │                                               │
│              │  ───────────────────────────                  │
│              │  STICKY FOOTER (dirty):                       │
│              │  [Cancel]  [Save]                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px) — horizontal tabs + stacked

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ [👤][🔐][⚙️][🔔][🔒]  ◄ scroll-x tabs │
├──────────────────────────┤
│ H2 «Profile»            │
│ [avatar] [Change]        │
│ Name    [___________]    │
│ Phone   [___________]    │
│ Bio     [___________]    │
│                           │
│ ┌── sticky bottom ──┐    │
│ │ [Cancel] [Save]   │    │
│ └───────────────────┘    │
└──────────────────────────┘
```

- On mobile the tabs are horizontal scroll chips (`overflow-x-auto`), active: `border-b-2 border-primary`.
- The save footer: sticky below the form on desktop, `fixed bottom-0` on mobile (only in the dirty state).

### Design tokens

| Element | Tailwind / value |
|------|------------------|
| Tabs nav | `w-56 space-y-1` |
| Tab item | `flex items-center gap-2 px-3 h-10 rounded-lg text-gray-700 hover:bg-gray-50` |
| Tab active | `bg-primary/10 text-primary font-medium` |
| Section H2 | `text-xl font-semibold text-gray-900 mb-4` |
| Field row | `flex flex-col gap-1 mb-4 max-w-md` |
| Label | `text-sm font-medium text-gray-700` |
| Input | `h-11 rounded-lg border border-gray-300 px-3 focus:ring-2 focus:ring-primary/40` |
| Toggle (on) | `bg-primary` switch; (off) `bg-gray-300` |
| Save footer | `border-t border-gray-200 pt-4 mt-6 flex gap-3 justify-end` |
| Primary save | `bg-primary text-white h-10 rounded-lg px-4 disabled:opacity-50` |
| Cancel | `border border-gray-300 h-10 rounded-lg px-4 hover:bg-gray-50` |
| Danger zone | `border border-red-200 rounded-xl p-4 bg-red-50/50` |
| Danger button | `bg-red-600 text-white h-10 rounded-lg px-4 hover:bg-red-700` |
| Avatar | `w-20 h-20 rounded-full object-cover` |

---

## 3. Section-by-section

### 3.1 Layout & save behavior

- **Save model.** Two kinds:
  - **Form fields** (Profile name/phone/bio, Account changes) → an explicit **[Save]** / **[Cancel]** sticky footer, active only in the **dirty** state.
  - **Toggle/select** (Preferences, Notifications, Privacy) → **instant save** (auto-save on change) + toast "Saved"; on failure rollback + error toast.
- **Unsaved guard.** Leaving a tab/page with a dirty form → confirm dialog "You have unsaved changes. Save?" → [Save]/[Don't save]/[Stay].

### 3.2 Profile tab (`/settings/profile`)

| Field | Behavior / states |
|------|-------------------|
| **Avatar** | Click/drag-drop → upload → Supabase Storage; crop/resize modal; *uploading*: spinner overlay; **[Remove]** → default avatar (initials) |
| **Full name** | text, required 2–60; error "Name is required" |
| **Phone** | tel + country code; on change → **re-verify OTP** banner "The new number must be verified" → `/auth/verify` |
| **Bio / About** | textarea (shown on the public profile for Agents); max 500 |
| **Public username / slug** | (Agent only) → `/agent/[slug]`; unique check; error "This slug is taken" |

- **[Save]** → `PATCH /api/users/me` → toast "Profile saved".
- Avatar upload limit: max 5MB, jpg/png/webp; large file → error "The image is too large (max 5MB)".

### 3.3 Account tab (`/settings/account`)

**Change password.**
- Current password + New password + Confirm (zod min 8, strength meter).
- **[Update password]** → `POST /api/auth/change-password` → toast.
- Checkbox "Sign out other devices" → revoke the other sessions.
- *OAuth-only user* (Google, no password) → "Set password" flow (like forgot-password, no current password needed).
- Wrong current password → inline error "The current password is incorrect".

**Change email.**
- New email input → **[Change email]** → sends a confirm link to **both the old and the new** email; after confirmation, update + `email_verified` re-verify.
- Banner "A confirmation link was sent to {new-email}".

**Connected accounts.** Google OAuth: **[Connect]** / **[Disconnect]** (the last auth method cannot be disconnected — against lockout).

**Delete account (danger zone, red).**
- **[Delete account]** → **confirm modal**: lists what will be deleted (X listings, Y favorites, all messages — irreversible) + requires typing **"DELETE"** or password.
- → `DELETE /api/users/me` → logout → redirect Home + toast "Your account has been deleted".
- For active listings: a warning + soft-delete grace period (config, e.g. 30 days recoverable).

### 3.4 Preferences tab (`/settings/preferences`)

- **Language.** Radio: Armenian / Russian / English → update `users.lang` + **immediately** the route locale (`/hy` `/ru` `/en`), preserving the current page. Instant save.
- **Currency.** Dropdown: AMD (֏) / RUB (₽) / USD ($) / EUR (€) → `users.currency`; affects how prices are displayed everywhere (synced with the header switcher). Instant save.
- **Theme.** Light / Dark / System → instant, stored in localStorage + `users` preference; `System` follows the OS (`prefers-color-scheme`).

### 3.5 Notification settings tab (`/settings/notifications`)

Master toggles at the top: "Email notifications" / "Push" (global off → turns off all sub-toggles, disabled state).

Per-type toggle (email / push in separate columns):

| Event | Email | Push |
|-------|:----:|:----:|
| New message | ☑ | ☑ |
| Price drop on a favorite | ☑ | ☐ |
| Saved-search match | ☑ | ☐ |
| Listing approved/rejected | ☑ | ☑ |
| Listing expiring soon | ☑ | ☐ |
| New review (Agent) | ☑ | ☑ |
| Marketing / news | ☐ | ☐ |

- Each toggle: **instant save** (`PATCH /api/users/me/notification-prefs`) + toast.
- Link → `/notifications` (history, see `22-notifications.md`).
- The push channel is disabled if browser permission isn't granted ("Enable push in the browser").

### 3.6 Privacy tab (`/settings/privacy`)

- **Who can contact me.** dropdown: Everyone / Registered users only / No one.
- **Hide phone number.** toggle — when ON the number is not revealed on the public listing, leaving only message-based contact.
- **Search engine visibility** (Agent profile) — toggle: index/noindex the public profile (`/agent/[slug]` robots).
- All instant save.

### 3.7 Agent tab (Agent only — `/settings/agent`)

- **Agency name** — text, public, required.
- **License №** — text + document upload (verification, Phase 2).
- **Verification status** — badge: Pending (yellow) / Verified (blue ✓) / Rejected (red, + reason).
- **Subscription tier** — Free / Pro / Premium → link `/pro` (Phase 2).
- Save → `PATCH /api/agents/me` → toast.

---

## 4. Full list of states

| State | What is shown |
|-------|-------------------|
| **Loading** | Tab nav + field skeleton bars |
| **Pristine (form)** | Save footer hidden |
| **Dirty (form)** | Save footer sticky: [Cancel]/[Save] active |
| **Saving** | Save button spinner + disabled |
| **Saved** | Toast "Saved" |
| **Instant toggle saved** | Toggle animate + toast |
| **Validation error** | Inline error below the field |
| **Server error (unique)** | "This email/slug is taken" |
| **Re-verify needed** | Banner "The new number/email must be verified" |
| **Delete confirm** | Modal: DELETE typing pre-condition |
| **Unsaved leave** | Confirm dialog "Save your changes?" |
| **Avatar uploading** | Spinner overlay on the avatar |

---

## 5. Technical depth

### Component tree

```
<SettingsLayout> (client, SSR initial data)
 ├─ <SettingsTabs active onChange />        (deep-link aware)
 └─ <TabPanel>
     ├─ <ProfileForm user />                 (dirty + Save)
     │   └─ <AvatarUploader onUpload onRemove />
     ├─ <AccountSettings>
     │   ├─ <ChangePasswordForm />
     │   ├─ <ChangeEmailForm />
     │   ├─ <ConnectedAccounts />
     │   └─ <DeleteAccountDanger />          (confirm modal)
     ├─ <PreferencesForm />                  (instant toggles)
     ├─ <NotificationPrefsForm />            (instant toggles)
     ├─ <PrivacyForm />                      (instant toggles)
     └─ <AgentSettingsForm />                (Agent only)
 └─ <SaveBar dirty onSave onCancel />        (sticky, form tabs only)
 └─ <UnsavedGuard />                          (route leave confirm)
```

Props (key): `<AvatarUploader maxMB, accept, onUpload, onRemove />`; `<NotificationPrefsForm prefs: Record<EventType, {email, push}>, onChange />`; `<DeleteAccountDanger requireText="DELETE", impactSummary />`; `<SaveBar dirty, saving, onSave, onCancel />`.

### Data fields (users + agents — see 00-SPEC §7)

`users: id, role, name, email, phone, avatar_url, lang, currency, email_verified, phone_verified, notification_prefs(json), privacy(json)`
`agents: user_id, agency_name, license_no, bio, slug, verified, subscription_tier`

### API contracts

**`GET /api/users/me`** → `200 { id, name, email, phone, avatarUrl, lang, currency, role, notificationPrefs, privacy, agent? }`

**`PATCH /api/users/me`**
```jsonc
// request (partial) { "name": "...", "phone": "+374...", "lang": "ru", "currency": "USD" }
// 200 { "ok": true, "reverify": ["phone"] }   // reverify: if phone/email changed
// 422 { "error": "validation", "fields": { "phone": "invalid" } }
```

**`PATCH /api/users/me/notification-prefs`** → `{ "messages": { "email": true, "push": false } }` → `200 { "ok": true }`

**`POST /api/auth/change-password`** → `{ "current": "...", "new": "...", "revokeOthers": true }` → `200` · `401 { "error": "wrong_current" }`

**`POST /api/auth/change-email`** → `{ "newEmail": "..." }` → `200 { "confirmationSent": true }` · `409 { "error": "email_taken" }`

**`POST /api/upload/avatar`** (multipart) → `201 { "url": "..." }` · `413 { "error": "too_large" }`

**`PATCH /api/agents/me`** → `{ "agencyName": "...", "slug": "..." }` → `200` · `409 { "error": "slug_taken" }`

**`DELETE /api/users/me`** → `{ "confirm": "DELETE" }` → `200 { "deleted": true }` (soft-delete grace per config)

### Validation (zod)

```ts
const profileSchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  phone: z.string().regex(E164_BY_COUNTRY, "Invalid phone number"),
  bio: z.string().max(500).optional(),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/, "Latin letters, digits, hyphens only").optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, "The current password is required"),
  new: z.string().min(8, "At least 8 characters")
    .regex(/[a-zA-Z]/).regex(/[0-9]/),
  confirm: z.string(),
}).refine((d) => d.new === d.confirm, {
  path: ["confirm"], message: "Passwords don't match",
});
```

### Rules

- **Re-verify gate.** A phone/email change does not take effect until the OTP/link is verified (pending state).
- **Optimistic toggles.** Instant UI; `onError` → rollback + error toast.
- **Locale switch.** Re-route with the current path (`/settings` → `/ru/settings`).
- **RLS.** The user edits only their own record (`auth.uid()`).
- **GDPR.** Data-export link (Phase 2); delete: soft (grace) vs hard per config.

---

## 6. Responsive

- **≥1024px (lg).** Vertical tabs (`w-56`) + form (max-w-md); save footer sticky below the form.
- **768–1023px (md).** Tabs collapse or narrow; form full-width.
- **<768px (sm).** Tabs → horizontal scroll chips; form stacked full-width; save footer `fixed bottom-0` (when dirty); correct `inputmode` (tel/email).

---

## 7. Accessibility

- Tabs: `role="tablist"`, each tab `role="tab" aria-selected`, panel `role="tabpanel"`; keyboard ←/→ between tabs.
- Toggles: `role="switch" aria-checked` + a visible label.
- Save bar: `aria-live="polite"` (announces "Saved").
- Delete modal: `role="dialog"`, focus trap, Esc; destructive button: not default focus, requires typing "DELETE".
- Avatar uploader: keyboard-accessible (Enter → file picker), `aria-label`.
- Contrast ≥ 4.5:1; touch target ≥ 44px; error: `role="alert"`.

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated).
- `<title>` = "Settings — {brand}"; with tab: "Profile · Settings — {brand}".
- Excluded from the sitemap; no canonical.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `settings_view` | Page load | `tab` |
| `settings_tab_change` | Tab change | `tab` |
| `profile_saved` | [Save] profile | — |
| `avatar_uploaded` | Avatar upload success | — |
| `password_changed` | Password update success | `revoke_others` |
| `email_change_requested` | Change email submit | — |
| `pref_language_changed` | Language change | `lang` |
| `pref_currency_changed` | Currency change | `currency` |
| `pref_theme_changed` | Theme change | `theme` |
| `notif_pref_toggled` | Notification toggle | `event_type, channel, value` |
| `privacy_changed` | Privacy toggle | `setting, value` |
| `account_delete_confirmed` | Account deletion | — |
