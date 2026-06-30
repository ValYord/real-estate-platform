# Էջ 04 — Create / Edit Listing Wizard (Հայտարարություն ավելացնել) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, քայլ առ քայլ վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data, API, validation), responsive, accessibility, SEO, analytics։

**URL.** `/sell/new` (նոր) · `/listing/[id]/edit` (խմբագրում) · auto-save draft-ի դեպքում՝ `/sell/new?draft=[id]`
**Roles.** User, Agent (login պարտադիր; Guest → `/auth/register?next=/sell/new`)։
**Primary goal (conversion).** Օգտատերը **հասցնի մինչև «Հրապարակել»**՝ որակյալ, ամբողջական հայտարարությամբ։ Որքան քիչ շփում (friction) և քիչ լքում (drop-off), այնքան շատ ու որակյալ գույք կայքում։

---

## 0. Ակնարկ (Overview)

Listing wizard-ը **supply-side-ի կորիզն է** — առանց հայտարարությունների կայքը դատարկ է։ Ուստի flow-ը պետք է լինի՝ (1) **հեշտ ու քայլ առ քայլ** (6 փոքր քայլ, ոչ մեկ հսկա ֆորմ), (2) **ներողամիտ** (auto-save draft ամեն քայլից հետո, որ ոչինչ չկորչի), և (3) **որակ ապահովող** (per-step validation, min 1 նկար, բավարար նկարագրություն)։

6 քայլ՝ `[1 Տիպ] → [2 Տեղ] → [3 Մանրամասն] → [4 Մեդիա] → [5 Գին] → [6 Կոնտակտ + Preview]`։ Վերևում progress bar (Step N/6)։ Ամեն քայլ ունի `[← Հետ]` և `[Շարունակել →]`; վերջին քայլում՝ `[💾 Draft]` և `[🚀 Հրապարակել]`։

Render՝ **client-heavy** (ֆորմ, drag-drop, map pin, live preview)։ Wizard state-ը պահվում է `react-hook-form`-ով; ամեն քայլ ունի իր zod schema; auto-save-ը debounce-ով PATCH է անում draft-ը։ Edit ռեժիմում նույն wizard-ն է՝ նախալրացված, ցանկացած step ուղիղ բացելի։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Սեփականատեր Հովհաննեսը (mobile, առաջին անգամ).** Հովհաննեսը home-ից սեղմել է «Տեղադրել գույք»։ Քանի որ logged-in է → բացվում է wizard-ը։ Step 1՝ ընտրում «Վաճառք» + «Բնակարան»։ Step 2՝ քաղաք Երևան, քարտեզի pin-ը քաշում ճիշտ շենքին։ Հեռախոսը զանգում է, դուրս է գալիս — draft-ը auto-save եղավ։ Կես ժամ հետո վերադառնում dashboard-ից, draft-ը շարունակում Step 3-ից։

**Սցենար Բ — Գործակալ Նարեն (desktop, Pro).** Նարեն 5-րդ հայտարարությունն է ավելացնում։ Step 4-ում drag-drop անում 18 նկար, քաշելով դասավորում, առաջինը նշում cover։ Step 6-ում տեսնում live preview-ն, սեղմում **[🚀 Հրապարակել]** → property էջ + toast «Հրապարակվեց»։

**Սցենար Գ — User Աննան (limit hit).** Աննան անվճար user է, արդեն ունի 5 active հայտարարություն։ «Տեղադրել»-ին սեղմելիս տեսնում modal՝ «Հասել ես անվճար սահմանին (5/5)։ Ապաակտիվացրու հին հայտարարություն կամ անցիր Pro-ի»։ → [Կառավարել հայտարարությունները] / [Դիտել Pro-ն]։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — կենտրոնացված ֆորմ + կողային ամփոփում

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (h-16) — wizard-ում minimal (logo + «Պահպանված ✓»)  │
├────────────────────────────────────────────────────────────┤
│ PROGRESS BAR  ①Տիպ ─②Տեղ ─③Մանր.─④Մեդիա─⑤Գին ─⑥Preview     │
│               ●━━━━●━━━━○━━━━○━━━━○━━━━○   (Step 2/6)        │
├──────────────────────────────────┬─────────────────────────┤
│ ◄ STEP CONTENT (max-w-2xl)       │ ► SUMMARY (sticky, w-72) │
│                                   │  «Քո հայտարարությունը»   │
│  [Step-ի դաշտերը]                 │  Տիպ՝ Բնակարան, Վաճառք   │
│   ...                             │  Տեղ՝ Երևան, Արաբկիր     │
│   ...                             │  (live աճում է քայլերով) │
│                                   │  💾 Auto-saved 12:04     │
│  ┌──────────────┬──────────────┐  │                          │
│  │ [← Հետ]      │ [Շարունակել →]│ │                          │
│  └──────────────┴──────────────┘  │                          │
└──────────────────────────────────┴─────────────────────────┘
```

### Mobile (<768px) — full-width, fixed nav

```
┌──────────────────────────┐
│ HEADER (h-14) «Պահ. ✓»  │
├──────────────────────────┤
│ Step 2/6  ●━━●━━○━━○━━○━━○│
├──────────────────────────┤
│ Քայլի վերնագիր          │
│ [դաշտ]                  │
│ [դաշտ]                  │
│ [Map pin (h-[240px])]   │
│ ...(scroll)             │
├──────────────────────────┤
│ FIXED BOTTOM NAV (h-16) │
│ [← Հետ]   [Շարունակել →]│
└──────────────────────────┘
```

- Mobile-ում summary sidebar-ը չկա; փոխարենը progress bar-ը compact (Step N/6 + dots)։
- Նավիգացիան (`[Հետ]`/`[Շարունակել]`)՝ fixed bottom bar `border-t shadow-[0_-2px_8px_rgba(0,0,0,0.06)]`։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Progress step (done) | `bg-primary text-white rounded-full w-8 h-8` + ✓ |
| Progress step (active) | `border-2 border-primary text-primary rounded-full w-8 h-8` |
| Progress step (todo) | `border border-gray-300 text-gray-400 rounded-full w-8 h-8` |
| Progress connector | `h-0.5 flex-1 bg-gray-200` (done՝ `bg-primary`) |
| Step content | `max-w-2xl mx-auto px-4 py-8 space-y-6` |
| Field label | `text-sm font-medium text-gray-700 mb-1.5` |
| Required mark | `text-red-500` (`*`) |
| Input | `h-11 w-full border border-gray-300 rounded-lg px-3 focus:ring-2 focus:ring-primary` |
| Card-select (option) | `border border-gray-200 rounded-xl p-4 hover:border-primary cursor-pointer` |
| Card-select (selected) | `border-primary bg-primary/5 ring-1 ring-primary` |
| Error text | `text-sm text-red-600 mt-1` |
| Error field | `border-red-400 focus:ring-red-400` |
| Primary nav button | `bg-primary text-white h-11 px-6 rounded-lg font-medium disabled:opacity-50` |
| Secondary nav button | `border border-gray-300 text-gray-700 h-11 px-6 rounded-lg` |
| Publish button | `bg-green-600 text-white h-12 rounded-lg font-medium hover:bg-green-700` |
| Auto-save badge | `text-xs text-gray-400` («💾 Պահպանված 12:04») |
| Upload dropzone | `border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary` |

---

## 3. Քայլ առ քայլ (Step-by-step)

### 3.0 Ընդհանուր wizard վարք

- **Progress bar.** Click-ելի միայն **արդեն լրացված/այցելած** step-երին (առաջ ցատկելը՝ արգելված մինչև ընթացիկ step-ի validation)։ Edit ռեժիմում՝ բոլորը clickable։
- **Nav.** `[← Հետ]` միշտ active (Step 1-ում թաքնված); `[Շարունակել →]` disabled մինչև ընթացիկ step-ի required դաշտերի validation-ը pass լինի։
- **Auto-save.** Ամեն դաշտի `onChange`-ից 1.5s debounce հետո → `PATCH /api/listings/[id]` (status=draft)։ Badge թարմացվում է «💾 Պահպանված HH:MM»; ձախողման դեպքում «⚠ Չպահվեց — կրկին փորձում ենք»։
- **Leave warning.** Չպահված փոփոխությամբ դուրս գալիս (route change / tab close)՝ `beforeunload` + confirm «Չպահված փոփոխությունները կկորչեն»։

### 3.1 Step 1 — Deal & Property type

- **Deal type.** Երկու մեծ radio card՝ `( ) Վաճառք` `( ) Վարձ` (icon + label, card-select ոճ)։
- **Property type.** Card-select grid (`grid grid-cols-2 md:grid-cols-3 gap-3`)՝ 🏢 Բնակարան · 🏡 Տուն/Առանձնատուն · 🌳 Հող · 🏬 Կոմերցիոն · 🏗 Նորակառույց · 🚗 Գարաժ։
- **Վարք.** Type-ի ընտրությունը **պայմանավորում է հաջորդ քայլերի դաշտերը** (օր․ Հող-ի դեպքում Step 3-ում չկան ննջասենյակ/հարկ; Կոմերցիոնի դեպքում՝ commercial-specific)։
- **Validation.** Երկուսն էլ պարտադիր → `[Շարունակել →]` disabled մինչև ընտրություն։
- **Microcopy.** Վերնագիր «Ի՞նչ ես տեղադրում» · ենթատեքստ «Ընտրիր գործարքի և գույքի տեսակը»։

### 3.2 Step 2 — Location

- **Դաշտեր.** Երկիր ▾ (Հայաստան default) · Քաղաք ▾/autocomplete · Թաղամաս ▾ · Հասցե (input) · Շենք/բնակարան № (optional)։
- **Map pin.** Mapbox `h-[300px] rounded-xl` + քաշելի 📍 marker (drag → lat/lng)։ Հասցե/քաղաք ընտրելիս pin-ը auto-center; user-ը ճշտում է drag-ով։ Reverse-geocode-ով pin-ի շարժը կարող է թարմացնել հասցեն (առաջարկ)։
- **«Թաքցնել ճշգրիտ հասցեն» checkbox.** Միացնելիս property էջում ցույց է տրվում միայն թաղամասը + approximate circle (ոչ ճշգրիտ pin)։
- **Validation.** Քաղաք **պարտադիր** + map pin **պարտադիր** (lat/lng set)։ Հասցեն optional (բայց խրախուսվում է)։
- **Microcopy.** «Որտե՞ղ է գույքը» · pin hint «Քաշիր նշանը ճշգրիտ տեղում» · checkbox label «Թաքցնել ճշգրիտ հասցեն (ցույց տալ միայն թաղամասը)»։

### 3.3 Step 3 — Details

- **Թվային դաշտեր.** Մակերես (m²) `*` · Սենյակ · Ննջասենյակ · Սանհանգույց · Հարկ / Ընդհանուր հարկ · Շինության տարի։ (Type-ից կախված՝ ոմանք թաքնված, օր․ Հող → միայն մակերես/նպատակ)։
- **Վիճակ (condition).** Select՝ Նորակառույց · Վերանորոգված · Լավ · Վերանորոգման կարիք։
- **Toggle-ներ.** Ջեռուցում · Պատշգամբ · Ավտոկայանատեղի · Վերելակ։
- **Amenities.** Checkbox grid (`grid grid-cols-2 md:grid-cols-3 gap-2`)՝ Կահույք · Կոնդիցիոներ · Անվտանգություն · Ինտերնետ · Պահեստ · և այլն։
- **Վերնագիր `*`.** Input + auto-suggest (օր․ «2 սենյականոց բնակարան Արաբկիրում»՝ կազմված type+rooms+district-ից)։
- **Նկարագրություն `*`.** Textarea (min 30 նիշ), counter; AI-assist «Բարելավել տեքստը» — Phase 2։
- **Multi-language tabs.** `[HY] [RU] [EN]` վերնագրի/նկարագրության համար։ HY պարտադիր; RU/EN optional + «Auto-translate առաջարկ» (Phase 2)։ Tab-ի badge ցույց է տալիս՝ որ լեզվով լրացված է։
- **Validation.** Մակերես > 0, վերնագիր 5–120 նիշ, նկարագրություն ≥ 30 նիշ։ Inline error սխալ դաշտի տակ։
- **Microcopy.** «Գույքի մանրամասները» · description placeholder «Նկարագրիր գույքը՝ վերանորոգում, դիրք, ենթակառուցվածք…»։

### 3.4 Step 4 — Media (Նկար/Video/360°)

- **Drag & drop uploader.** Dropzone (`border-dashed`) կամ click → file picker (multiple)։ Upload-ը՝ direct-to-Storage (Supabase signed URL), progress bar ամեն ֆայլի վրա, auto-compress + thumbnail։
- **Grid + reorder.** Վերբեռնված նկարները thumbnail grid; **drag to reorder**; առաջինը = **cover** (badge «Cover»)։ Ամեն նկարի վրա ✕ delete + ⠿ drag handle։
- **Limits.** Min **1** / Max **30** նկար; ֆայլ ≤ 10MB; ֆորմատ՝ jpg/png/webp։
- **Video** (optional)՝ URL (YouTube/Vimeo) կամ upload։
- **360° tour** (optional)՝ URL/file (տես `26-virtual-tour.md`)։
- **Floor plan** (optional)՝ նկար upload։
- **Վիճակներ.** *uploading* (per-file progress), *success* (✓ thumbnail), *error* («Չհաջողվեց — [Կրկին]»), *too-large* («Ֆայլը մեծ է, max 10MB»), *bad-format* («Միայն JPG/PNG/WebP»)։
- **Validation.** **Min 1 նկար** (առանց նկարի՝ չի հրապարակվի — `[Շարունակել →]` disabled)։
- **Microcopy.** «Ավելացրու լուսանկարներ» · ենթատեքստ «Առաջին նկարը կլինի գլխավորը։ Քաշելով դասավորիր» · empty dropzone «Քաշիր նկարներն այստեղ կամ սեղմիր ընտրելու համար»։

### 3.5 Step 5 — Price

- **Գին `*`** + **Արժույթ ▾** (AMD/RUB/USD/EUR)։ Input-ը thousand-separator-ով format (52,000,000)։
- **Rent-ի դեպքում.** «/ամիս» suffix + «Կոմունալ ներառվա՞ծ» toggle + Դեպոզիտ (input) + Նվազագույն վարձակալության ժամկետ։
- **«Գինը պայմանավորելի» checkbox.** Property էջում ցույց է տրվում «Պայմանավորելի» badge։
- **Market hint** (Phase 2)՝ «Նման գույքերի միջին գին այս թաղամասում՝ ~X ֏» (info chip, ոչ blocking)։
- **Validation.** Գին > 0, արժույթ ընտրված; rent → depozit/term optional բայց validated եթե լրացված։
- **Microcopy.** «Որքա՞ն» · negotiable label «Գինը պայմանավորելի է»։

### 3.6 Step 6 — Contact & Preview

- **Contact.** Անուն (profile-ից prefilled) · Հեռախոս (prefilled, country-format validation) · «Ինչպե՞ս կապվեն» radio՝ Հեռախոս + chat / Միայն chat։
- **Preview.** **Live preview**՝ ինչպես կերևա property էջը (gallery, գին, key facts, նկարագրություն)՝ embedded կամ «Բացել preview» modal-ով։
- **Terms checkbox `*`.** «Համաձայն եմ կանոնների հետ» (link → terms)։
- **Կոճակներ.**
  - **[💾 Պահել որպես draft]** — status=draft, redirect dashboard «Իմ հայտարարությունները», toast «Պահվեց որպես սևագիր»։
  - **[🚀 Հրապարակել]** — primary green։ Click → final full-form validation (բոլոր step-երը)։ Pass → `POST .../publish` → status=`active` (կամ `pending` եթե moderation միացած) → redirect `/property/[id]/[slug]` + toast «Հրապարակվեց 🎉»։ Եթե moderation→ «Ուղարկվեց ստուգման, սովորաբար մինչև 24 ժամ»։
- **Validation.** Terms պարտադիր; որևէ նախորդ step-ի incomplete լինելու դեպքում՝ inline summary «Լրացրու՝ Step 4 — նկար» + jump link։

### 3.7 Edit mode (`/listing/[id]/edit`)

- Նույն wizard, **նախալրացված** տվյալով (GET-ով բերված)։
- Ցանկացած step ուղիղ բացելի (ոչ պարտադիր հերթականություն)։
- Կոճակներ՝ **[Պահել փոփոխությունները]** + **[Չեղարկել]** (վերադարձ առանց save)։
- Active հայտարարության խմբագրումը կարող է վերադարձնել `pending` (re-moderation, Phase 2)։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **New (Step 1)** | Դատարկ wizard, draft id ստեղծվում է առաջին փոփոխությունից |
| **Draft resume** | Dashboard-ից → wizard նախալրացված, վերջին step-ից |
| **Auto-saving** | Badge «💾 Պահպանվում է…» → «Պահպանված HH:MM» |
| **Auto-save fail** | «⚠ Չպահվեց — կրկին փորձում ենք» (retry backoff) |
| **Step invalid** | Required դաշտերը highlight, `[Շարունակել]` disabled |
| **Upload in progress** | Per-file progress bar, `[Շարունակել]` հասանելի մնում 1 ✓ նկարից հետո |
| **Upload error** | «Չհաջողվեց բեռնել [Կրկին]» |
| **Limit reached** | Modal «5/5 անվճար — ապաակտիվացրու / անցիր Pro» |
| **Publishing** | Button spinner «Հրապարակվում է…», դաշտերը locked |
| **Published** | Redirect property էջ + toast «Հրապարակվեց 🎉» |
| **Published (pending)** | Redirect + banner «Ուղարկվեց ստուգման ~24ժ» |
| **Leave attempt** | Confirm «Չպահված փոփոխությունները կկորչեն» |
| **Edit (not owner/404)** | «Հասանելիություն չկա» / «Չգտնվեց» + [Դեպի dashboard] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<ListingWizard> (client — react-hook-form, multi-step)
 ├─ <WizardHeader autosaveStatus />
 ├─ <ProgressBar steps current onJump />
 ├─ <WizardSummary draft />                       (desktop sticky)
 ├─ <StepRouter step>
 │   ├─ <Step1TypeDeal />                          (card-select)
 │   ├─ <Step2Location />
 │   │   └─ <DraggablePinMap lat lng onMove />     (Mapbox)
 │   ├─ <Step3Details propertyType />              (conditional fields)
 │   ├─ <Step4Media />
 │   │   └─ <MediaUploader max=30 onReorder />     (drag-drop, signed URL)
 │   ├─ <Step5Price dealType />
 │   └─ <Step6ContactPreview />
 │       └─ <ListingPreview property />            (reuses property-detail blocks)
 ├─ <WizardNav onBack onNext canNext />            (fixed bottom mobile)
 └─ <PublishActions onDraft onPublish />           (Step 6)
```

### Data fields used (00-SPEC §7)

`properties`՝ `id, owner_id, title{hy,ru,en}, description{hy,ru,en}, deal_type, status(draft/pending/active), property_type, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, country, region, city, district, address, lat, lng, hide_exact_address, amenities[], heating, condition, negotiable, updated_at` + `property_media` (`id, property_id, type, url, order`)։

### API contract-ներ

**`POST /api/listings`** (ստեղծում է draft առաջին փոփոխությունից)
```jsonc
// request  { "dealType": "sale", "propertyType": "apartment" }
// 201      { "id": 9001, "status": "draft" }
// 403      { "error": "limit_reached", "limit": 5, "active": 5 }   → upgrade modal
```

**`PATCH /api/listings/[id]`** (auto-save, ամեն քայլ)
```jsonc
// request (partial)  { "city": "Yerevan", "district": "Arabkir",
//                      "lat": 40.20, "lng": 44.49, "hideExact": false }
// 200      { "id": 9001, "status": "draft", "savedAt": "2026-06-23T12:04:11Z" }
// 422      { "error": "validation", "fields": { "area_m2": "must be > 0" } }
```

**`POST /api/listings/[id]/media`** (signed-URL flow)
```jsonc
// 1) request  { "fileName": "img1.jpg", "contentType": "image/jpeg", "size": 2400000 }
// 1) 200      { "uploadUrl": "https://storage/...signed", "mediaId": 51, "order": 0 }
// 2) PUT файл → Storage; ապա confirm:
// POST .../media/51/confirm  → 200 { "url": "https://.../img1.webp", "thumb": "..." }
// 413 { "error": "file_too_large", "max": 10485760 }
// 415 { "error": "unsupported_type" }
```

**`POST /api/listings/[id]/publish`**
```jsonc
// 200      { "id": 9001, "status": "active", "slug": "yerevan-arabkir-2-senyak-bnakaran" }
// 200      { "id": 9001, "status": "pending" }   // moderation միացած
// 422      { "error": "incomplete", "missing": ["media", "price"] }
// 403      { "error": "limit_reached" }
```

### Validation (zod) — per-step + final

```ts
const step1 = z.object({
  dealType: z.enum(["sale", "rent"]),
  propertyType: z.enum(["apartment","house","land","commercial","newdev","garage"]),
});
const step2 = z.object({
  country: z.string().default("AM"),
  city: z.string().min(1, "Քաղաքը պարտադիր է"),
  district: z.string().optional(),
  address: z.string().max(200).optional(),
  lat: z.number(), lng: z.number(),              // pin պարտադիր
  hideExact: z.boolean().default(false),
});
const step3 = z.object({
  areaM2: z.coerce.number().positive("Մակերեսը պարտադիր է"),
  rooms: z.coerce.number().int().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  title: z.object({ hy: z.string().min(5, "Վերնագիրը կարճ է").max(120) }),
  description: z.object({ hy: z.string().min(30, "Նկարագրությունը կարճ է").max(5000) }),
  amenities: z.array(z.string()).optional(),
});
const step4 = z.object({
  media: z.array(z.object({ url: z.string().url(), order: z.number() }))
          .min(1, "Ավելացրու գոնե 1 նկար").max(30, "Առավելագույնը 30 նկար"),
});
const step5 = z.object({
  price: z.coerce.number().positive("Գինը պարտադիր է"),
  currency: z.enum(["AMD","RUB","USD","EUR"]),
  negotiable: z.boolean().default(false),
});
const step6 = z.object({
  contactName: z.string().min(2).max(50),
  contactPhone: z.string().regex(E164_BY_COUNTRY, "Անվավեր հեռախոսահամար"),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "Անհրաժեշտ է համաձայնություն" }) }),
});
const publishSchema = step1.merge(step2).merge(step3).merge(step4).merge(step5).merge(step6);
```

- **Ownership.** PATCH/publish-ը ստուգում է `owner_id == current_user.id` (else 403)։
- **Limits.** Active listings count՝ user → 5 (free), agent → ըստ tier-ի; check `POST /listings`-ում ու publish-ում։
- **Auto-save debounce 1.5s**; idempotent PATCH; optimistic badge, server-confirmed `savedAt`։

### Moderation (Phase 2)

- Publish → status=`pending` → admin queue (spam/duplicate/quality)։ Approve → `active`, Reject → `rejected` + պատճառ owner-ին (notification)։
- Phase 1-ում՝ ուղիղ `active` (moderation flag off)։

---

## 6. Responsive

- **≥1024px (lg).** Կենտրոնական ֆորմ (`max-w-2xl`) + sticky summary sidebar (`w-72`); nav-ը content-ի ներքևում inline; progress bar՝ լրիվ label-երով։
- **768–1023px (md).** Summary sidebar թաքնված; ֆորմ full-width centered; progress bar compact։
- **<768px (sm).** Full-width; progress bar = «Step N/6» + dots; nav-ը **fixed bottom bar** (`[← Հետ] [Շարունակել →]`); map pin `h-[240px]`; media grid 2-col; multi-language tabs scroll-x։

---

## 7. Accessibility

- Wizard-ը՝ `aria-label="Հայտարարության ստեղծում, քայլ N 6-ից"`; progress bar՝ `role="progressbar" aria-valuenow`։
- Step-երի միջև անցումից հետո focus-ը տեղափոխվում է step-ի վերնագրին (`tabindex=-1`), screen reader-ը հայտարարում է նոր քայլը (`aria-live`)։
- Ամեն դաշտ՝ կապված `<label htmlFor>`; error-ները `aria-describedby` + `aria-invalid`; required-ները `aria-required`։
- Card-select-երը՝ `role="radio"`/`radiogroup`, keyboard ←/→ ընտրություն։
- Drag-drop reorder-ը՝ keyboard fallback (↑/↓ կոճակ ամեն նկարի վրա «Տեղափոխել վեր/վար»)։
- Auto-save badge՝ `aria-live="polite"`; upload progress՝ `aria-valuenow`; touch target ≥ 44px։

---

## 8. SEO & meta

- Wizard-ը **private flow** է → `<meta name="robots" content="noindex, nofollow">` (`/sell/new`, `/listing/[id]/edit`)։
- Draft/pending գույքերը հանրային property էջ չունեն (404/owner-only preview)։ Միայն `active` գույքն է indexable (տես `03-property.md` §8)։
- `/sell` intro էջը (առանց wizard-ի, guest-ի համար marketing landing) կարող է լինել indexable; ինքը wizard-ը՝ ոչ։
- Canonical/hreflang wizard-ի համար անկապ է (noindex)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `wizard_start` | `/sell/new` load | `entry_point, is_edit` |
| `wizard_step_view` | Step render | `step, listing_id` |
| `wizard_step_complete` | [Շարունակել →] success | `step` |
| `wizard_step_back` | [← Հետ] | `step` |
| `draft_autosaved` | Auto-save success | `listing_id, step` |
| `media_upload` | Նկար upload success | `listing_id, count` |
| `media_upload_error` | Upload ձախողում | `listing_id, reason` |
| `media_reorder` | Reorder / cover փոխում | `listing_id` |
| `limit_reached` | Active-limit modal | `limit, active` |
| `listing_saved_draft` | [💾 Draft] | `listing_id` |
| `listing_published` | [🚀 Հրապարակել] success | `listing_id, deal_type, property_type, status` |
| `publish_validation_fail` | Incomplete publish | `listing_id, missing[]` |
| `wizard_abandon` | Leave-warning confirm exit | `step, listing_id` |
