# Էջ 21 — Settings (Կարգավորումներ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ին։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, API contract-ներ, validation), responsive, accessibility, SEO, analytics։

**URL.** `/settings` (deep-link tab՝ `/settings/profile`, `/settings/account`, `/settings/preferences`, `/settings/notifications`, `/settings/privacy`, `/settings/agent`)
**Roles.** User+ (Agent-ի համար՝ լրացուցիչ Agent tab)։ Guest → redirect `/auth/login?next=/settings`։
**Primary goal.** Օգտատերը կառավարում է իր պրոֆիլը, հաշիվը, նախընտրությունները (լեզու/արժույթ/theme), ծանուցումները և գաղտնիությունը՝ մեկ տեղում, պարզ tab-երով, **առանց վախի սխալ սեղմելու** (clear save behavior, confirm danger actions)։

---

## 0. Ակնարկ (Overview)

Settings-ը «վարչական» էջ է — օգտատերը գալիս է կոնկրետ բանի համար (փոխել գաղտնաբառ, անջատել ծանուցում, ջնջել հաշիվ)։ Ուստի սկզբունքները՝ (1) **clear save model** — որ օգտատերը երբեք չմտածի «արդյո՞ք պահպանվեց». form-բնույթի դաշտերը (անուն, bio) ունեն բացահայտ **[Պահպանել]** կոճակ dirty state-ով, իսկ toggle-ները (լեզու, theme, ծանուցումներ) **instant save** են + «Պահպանվեց» toast; (2) **safety** — destructive գործողությունները (հաշվի ջնջում, email փոխում) պահանջում են confirm + re-verify; (3) **deep-linkable tabs** — ամեն tab-ն ունի իր URL, որ Settings link-երը (օրինակ notification dropdown-ից → `/settings/notifications`) ուղիղ բացեն ճիշտ tab-ը։

Layout-ը vertical tabs (ձախ) + active tab-ի form (աջ)։ Էջը client-side է (form state, instant toggle), բայց initial data-ն SSR-ով pre-loaded (`GET /api/users/me`)։ Unsaved փոփոխությամբ tab/page leave-ը trigger-ում է confirm dialog։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Լեզու փոխում, Գայանե (instant).** Գայանեն ուզում է ռուսերեն ինտերֆեյս։ Settings → Preferences → Լեզու radio-ից ընտրում «Ռուսերեն»։ UI-ն **անմիջապես** փոխվում է (route `/hy/settings` → `/ru/settings`), toast «Պահպանվեց» (ռուսերեն locale-ում՝ «Сохранено»), `users.lang = ru`։ Save կոճակ սեղմել պետք չէ։

**Սցենար Բ — Գաղտնաբառ փոխում, Արման (account security).** Արմանը կասկածում է, որ գաղտնաբառը compromised է։ Settings → Account → Change password՝ մուտքագրում current + new (strength meter կանաչ) + confirm → **[Թարմացնել գաղտնաբառը]** → toast + checkbox-ով ընտրում «Դուրս բերել մյուս սարքերից» → մյուս session-ները logout։

**Սցենار Գ — Հաշվի ջնջում, Սոֆի (danger zone).** Սոֆին ուզում է ջնջել հաշիվը։ Account tab → Danger zone → **[Ջնջել հաշիվը]** → modal բացատրում է «Կջնջվեն՝ 2 հայտարարություն, 5 favorite, բոլոր հաղորդագրությունները»՝ պահանջում մուտքագրել «DELETE» → կոճակը active → `DELETE` → logout → Home + toast «Հաշիվդ ջնջվեց»։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — vertical tabs + form

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────┬─────────────────────────────────────────────┤
│ TABS NAV     │ FORM (selected tab)                          │
│ (w-56)       │  H2 «Պրոֆիլ»                                 │
│              │                                               │
│ 👤 Profile   │  [avatar] [Փոխել][Հեռացնել]                  │
│ 🔐 Account   │  Անուն     [____________]                     │
│ ⚙️ Preferenc.│  Հեռախոս   [+374 ______]                     │
│ 🔔 Notif.    │  Bio       [____________]                     │
│ 🔒 Privacy   │            [____________]                     │
│ 🏢 Agent     │                                               │
│              │  ───────────────────────────                  │
│              │  STICKY FOOTER (dirty):                       │
│              │  [Չեղարկել]  [Պահպանել]                       │
└──────────────┴─────────────────────────────────────────────┘
```

### Mobile (<768px) — horizontal tabs + stacked

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ [👤][🔐][⚙️][🔔][🔒]  ◄ scroll-x tabs │
├──────────────────────────┤
│ H2 «Պրոֆիլ»              │
│ [avatar] [Փոխել]         │
│ Անուն   [___________]    │
│ Հեռախոս [___________]    │
│ Bio     [___________]    │
│                           │
│ ┌── sticky bottom ──┐    │
│ │ [Չեղ.] [Պահպանել] │    │
│ └───────────────────┘    │
└──────────────────────────┘
```

- Mobile-ում tabs-ը՝ horizontal scroll chip-ներ (`overflow-x-auto`), active՝ `border-b-2 border-primary`։
- Save footer-ը՝ desktop-ում form-ի ներքև sticky, mobile-ում `fixed bottom-0` (dirty state-ի դեպքում միայն)։

### Design tokens

| Տարր | Tailwind / արժեք |
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

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Layout & save behavior

- **Save model.** Երկու տեսակ:
  - **Form fields** (Profile name/phone/bio, Account changes) → բացահայտ **[Պահպանել]** / **[Չեղարկել]** sticky footer, ակտիվ միայն **dirty** state-ում։
  - **Toggle/select** (Preferences, Notifications, Privacy) → **instant save** (auto-save on change) + toast «Պահպանվեց»; ձախողման դեպքում rollback + error toast։
- **Unsaved guard.** Dirty form-ով tab/page leave → confirm dialog «Չպահպանված փոփոխություններ կան։ Պահպանե՞լ» → [Պահպանել]/[Չպահպանել]/[Մնալ]։

### 3.2 Profile tab (`/settings/profile`)

| Դաշտ | Behavior / states |
|------|-------------------|
| **Avatar** | Click/drag-drop → upload → Supabase Storage; crop/resize modal; *uploading*՝ spinner overlay; **[Հեռացնել]** → default avatar (initials) |
| **Full name** | text, required 2–60; error «Անունը պարտադիր է» |
| **Phone** | tel + country code; փոփոխելիս → **re-verify OTP** banner «Նոր համարը պետք է հաստատվի» → `/auth/verify` |
| **Bio / Մասին** | textarea (Agent-ի համար ցուցադրվում է public profile-ում); max 500 |
| **Public username / slug** | (Agent only) → `/agent/[slug]`; unique check; error «Այս slug-ն զբաղված է» |

- **[Պահպանել]** → `PATCH /api/users/me` → toast «Պրոֆիլը պահպանվեց»։
- Avatar upload limit՝ max 5MB, jpg/png/webp; մեծ ֆայլ → error «Նկարը մեծ է (max 5MB)»։

### 3.3 Account tab (`/settings/account`)

**Change password.**
- Current password + New password + Confirm (zod min 8, strength meter)։
- **[Թարմացնել գաղտնաբառը]** → `POST /api/auth/change-password` → toast։
- Checkbox «Դուրս բերել մյուս սարքերից» → մյուս session-ների revoke։
- *OAuth-only user* (Google, password չունի) → «Set password» flow (forgot-password-ի պես, current password պետք չէ)։
- Սխալ current password → inline error «Ընթացիկ գաղտնաբառը սխալ է»։

**Change email.**
- Նոր email input → **[Փոխել email]** → ուղարկում է confirm link **հին ու նոր** email-երին; հաստատումից հետո update + `email_verified` re-verify։
- Banner «Հաստատման link ուղարկվեց {new-email}-ին»։

**Connected accounts.** Google OAuth՝ **[Connect]** / **[Disconnect]** (վերջին auth method-ը չի կարող disconnect լինել՝ lockout-ի դեմ)։

**Delete account (danger zone, կարմիր).**
- **[Ջնջել հաշիվը]** → **confirm modal**՝ թվարկում է ինչ կջնջվի (X listing, Y favorite, բոլոր messages — irreversible) + պահանջում մուտքագրել **«DELETE»** կամ password։
- → `DELETE /api/users/me` → logout → redirect Home + toast «Հաշիվդ ջնջվեց»։
- Active listing-ների դեպքում՝ նախազգուշացում + soft-delete grace period (config, օրինակ 30 օր recoverable)։

### 3.4 Preferences tab (`/settings/preferences`)

- **Լեզու.** Radio՝ Հայերեն / Ռուսերեն / Անգլերեն → update `users.lang` + **անմիջապես** route locale (`/hy` `/ru` `/en`)՝ պահպանելով ընթացիկ էջը։ Instant save։
- **Արժույթ.** Dropdown՝ AMD (֏) / RUB (₽) / USD ($) / EUR (€) → `users.currency`; ազդում է գների ցուցադրման վրա ամենուր (header switcher-ի հետ sync)։ Instant save։
- **Theme.** Light / Dark / System → instant, պահվում է localStorage + `users` preference; `System`՝ հետևում է OS-ին (`prefers-color-scheme`)։

### 3.5 Notification settings tab (`/settings/notifications`)

Master toggle-ներ վերևում՝ «Email-ով ծանուցումներ» / «Push-ով» (global off → անջատում է բոլոր sub-toggle-ները, disabled state)։

Per-type toggle (email / push առանձին սյունակ):

| Event | Email | Push |
|-------|:----:|:----:|
| Նոր հաղորդագրություն | ☑ | ☑ |
| Price drop favorite-ի վրա | ☑ | ☐ |
| Saved-search match | ☑ | ☐ |
| Listing հաստատվեց/մերժվեց | ☑ | ☑ |
| Listing ավարտվում է շուտով | ☑ | ☐ |
| Նոր review (Agent) | ☑ | ☑ |
| Marketing / news | ☐ | ☐ |

- Ամեն toggle՝ **instant save** (`PATCH /api/users/me/notification-prefs`) + toast։
- Link → `/notifications` (history, տես `22-notifications.md`)։
- Push channel-ը disabled՝ եթե browser permission չի տրված («Միացրու push browser-ում»)։

### 3.6 Privacy tab (`/settings/privacy`)

- **Ով կարող է կապ հաստատել ինձ հետ.** dropdown՝ Բոլորը / Միայն գրանցվածները / Ոչ ոք։
- **Թաքցնել հեռախոսահամարը.** toggle — ON-ի դեպքում public listing-ում համարը չի բացահայտվում, թողնում միայն message-ով կապ։
- **Search engine visibility** (Agent profile) — toggle՝ index/noindex public profile (`/agent/[slug]` robots)։
- Բոլորը instant save։

### 3.7 Agent tab (Agent only — `/settings/agent`)

- **Agency name** — text, public, required։
- **License №** — text + document upload (verification, Phase 2)։
- **Verification status** — badge՝ Pending (yellow) / Verified (blue ✓) / Rejected (red, + reason)։
- **Subscription tier** — Free / Pro / Premium → link `/pro` (Phase 2)։
- Save → `PATCH /api/agents/me` → toast։

---

## 4. Վիճակների ամբողջական ցանկ (States)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|-------------------|
| **Loading** | Tab nav + field skeleton bars |
| **Pristine (form)** | Save footer թաքնված |
| **Dirty (form)** | Save footer sticky՝ [Չեղարկել]/[Պահպանել] active |
| **Saving** | Save button spinner + disabled |
| **Saved** | Toast «Պահպանվեց» |
| **Instant toggle saved** | Toggle animate + toast |
| **Validation error** | Inline error դաշտի տակ |
| **Server error (unique)** | «Այս email/slug-ն զբաղված է» |
| **Re-verify needed** | Banner «Նոր համարը/email-ը պետք է հաստատվի» |
| **Delete confirm** | Modal՝ DELETE typing pre-condition |
| **Unsaved leave** | Confirm dialog «Պահպանե՞լ փոփոխությունները» |
| **Avatar uploading** | Spinner overlay avatar-ի վրա |

---

## 5. Տեխնիկական խորություն (Technical)

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

Props (key)՝ `<AvatarUploader maxMB, accept, onUpload, onRemove />`; `<NotificationPrefsForm prefs: Record<EventType, {email, push}>, onChange />`; `<DeleteAccountDanger requireText="DELETE", impactSummary />`; `<SaveBar dirty, saving, onSave, onCancel />`։

### Data fields (users + agents — տես 00-SPEC §7)

`users: id, role, name, email, phone, avatar_url, lang, currency, email_verified, phone_verified, notification_prefs(json), privacy(json)`
`agents: user_id, agency_name, license_no, bio, slug, verified, subscription_tier`

### API contract-ներ

**`GET /api/users/me`** → `200 { id, name, email, phone, avatarUrl, lang, currency, role, notificationPrefs, privacy, agent? }`

**`PATCH /api/users/me`**
```jsonc
// request (partial) { "name": "...", "phone": "+374...", "lang": "ru", "currency": "USD" }
// 200 { "ok": true, "reverify": ["phone"] }   // reverify՝ եթե phone/email փոխվել է
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
  name: z.string().min(2, "Անունը պարտադիր է").max(60),
  phone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  bio: z.string().max(500).optional(),
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/, "Միայն լատինատառ, թիվ, գծիկ").optional(),
});

const passwordSchema = z.object({
  current: z.string().min(1, "Ընթացիկ գաղտնաբառը պարտադիր է"),
  new: z.string().min(8, "Նվազագույնը 8 նիշ")
    .regex(/[a-zA-Z]/).regex(/[0-9]/),
  confirm: z.string(),
}).refine((d) => d.new === d.confirm, {
  path: ["confirm"], message: "Գաղտնաբառերը չեն համընկնում",
});
```

### Rules

- **Re-verify gate.** Phone/email փոփոխությունը ուժի մեջ չի մտնում, քանի դեռ OTP/link չհաստատվի (pending state)։
- **Optimistic toggles.** Instant UI; `onError` → rollback + error toast։
- **Locale switch.** Re-route ընթացիկ path-ով (`/settings` → `/ru/settings`)։
- **RLS.** User-ը խմբագրում է միայն իր record-ը (`auth.uid()`)։
- **GDPR.** Data-export link (Phase 2); delete՝ soft (grace) vs hard ըստ config։

---

## 6. Responsive

- **≥1024px (lg).** Vertical tabs (`w-56`) + form (max-w-md); save footer form-ի ներքև sticky։
- **768–1023px (md).** Tabs collapse կամ նեղ; form full-width։
- **<768px (sm).** Tabs → horizontal scroll chip-ներ; form stacked full-width; save footer `fixed bottom-0` (dirty-ի դեպքում); `inputmode` ճիշտ (tel/email)։

---

## 7. Accessibility

- Tabs՝ `role="tablist"`, ամեն tab `role="tab" aria-selected`, panel `role="tabpanel"`; keyboard ←/→ tab-երի միջև։
- Toggle-ները՝ `role="switch" aria-checked` + տեսանելի label։
- Save bar՝ `aria-live="polite"` («Պահպանվեց» հայտնում)։
- Delete modal՝ `role="dialog"`, focus trap, Esc; destructive կոճակը՝ ոչ default focus, պահանջում է «DELETE» typing։
- Avatar uploader՝ keyboard-accessible (Enter → file picker), `aria-label`։
- Contrast ≥ 4.5:1; touch target ≥ 44px; error՝ `role="alert"`։

---

## 8. SEO & meta

- `noindex, nofollow` (private, login-gated)։
- `<title>` = «Կարգավորումներ — {brand}»; tab-ով՝ «Պրոֆիլ · Կարգավորումներ — {brand}»։
- Sitemap-ից բացառված; canonical չկա։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `settings_view` | Էջի load | `tab` |
| `settings_tab_change` | Tab փոխում | `tab` |
| `profile_saved` | [Պահպանել] profile | — |
| `avatar_uploaded` | Avatar upload success | — |
| `password_changed` | Password update success | `revoke_others` |
| `email_change_requested` | Change email submit | — |
| `pref_language_changed` | Լեզու փոխում | `lang` |
| `pref_currency_changed` | Արժույթ փոխում | `currency` |
| `pref_theme_changed` | Theme փոխում | `theme` |
| `notif_pref_toggled` | Notification toggle | `event_type, channel, value` |
| `privacy_changed` | Privacy toggle | `setting, value` |
| `account_delete_confirmed` | Հաշվի ջնջում | — |
