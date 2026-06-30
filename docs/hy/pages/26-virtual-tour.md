# Էջ 26 — VR / 360° Virtual Tour (360° շրջայց) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (հետևում է `03-property.md` gold standard-ին)։ Ներառում է՝ ակնարկ, սցենարներ, layout/չափեր/գույներ, բաժին առ բաժին վարք ու վիճակներ, microcopy (հայերեն), տեխնիկական մաս (component-ներ, props, data fields, API contract-ներ, validation), responsive, accessibility, analytics, SEO։

**URL.** Առանձին էջ չունի — **feature** է, որ ապրում է **property detail**-ի (`/property/[id]`) ներսում (viewer) + upload-վում **listing wizard**-ի (`/sell/new`, Step 4 Media) ներսում (uploader)։ Deep-link՝ `?tab=tour`։
**Roles.** Դիտում՝ բոլորը (Guest, User, Agent, Admin); ավելացում՝ owner (User/Agent)։
**Primary goal.** Գնորդը հեռակա «քայլի» գույքի մեջ՝ առանց ֆիզիկապես այցելելու։ Բարձրացնում է վստահությունն ու conversion-ը, պակասեցնում անիմաստ դիտումները, և դարձնում հայտարարությունն աչքի ընկնող (engagement signal)։

---

## 0. Ակնարկ (Overview)

360° tour-ը **conversion booster** է property էջի վրա, ոչ թե առանձին էջ։ Այն ապրում է gallery-ի tab-երում (`[🌐 360°]`) և բացվում է **միայն click-ից հետո** (lazy) — viewer library-ն (~150 KB) ու ծանր panorama asset-երը երբեք չպետք է ծանրացնեն property էջի LCP-ն։

Feature-ն ունի **երկու կողմ**.
- **ՄԱՍ Ա — Viewer** (property detail)՝ ինտերակտիվ panorama դիտակ՝ drag/swipe պտույտ, multi-room hotspot navigation, fullscreen, mobile gyroscope, optional VR mode։
- **ՄԱՍ Բ — Uploader** (listing wizard Step 4)՝ owner-ը ավելացնում է tour երեք եղանակով — 360° panorama photos, Matterport-style embed link, կամ video walkthrough։

Կրիտիկական սկզբունք՝ **graceful degradation**։ Tour չկա → tab չի ցուցադրվում (ոչ դատարկ tab)։ WebGL չկա → static wide image fallback։ Gyroscope/WebXR չկա → controls-ը պարզապես չեն հայտնվում, drag navigation-ը մնում է։ Slow connection → «Tap to load» placeholder՝ data խնայելու համար։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Արամը (mobile, viewer).** Արամը բացում է բնակարանի էջը հեռախոսում, gallery-ում տեսնում `[🌐 360°]` tab։ Click → «Tap to load 360° (8 MB)» placeholder (cellular)։ Tap → viewer-ը load-վում, ցույց է տալիս հյուրասենյակը։ Հայտնվում է prompt «🧭 Թեքիր սարքը՝ նայելու շուրջը» → թույլատրում է gyroscope-ը, պտտում հեռախոսը՝ նայելով առաստաղ ու հատակ։ Hotspot նետ → «➡ Խոհանոց» → smooth անցում։ → `tour360_open` + `tour_hotspot_used` event։

**Սցենար Բ — Վարձակալ Մարիան (desktop, viewer).** Մարիան comparison-ի մեջ է, սեղմում 360° tab-ը։ Drag-ով պտտում սենյակը, dropdown-ից ընտրում «Ննջասենյակ»։ Սեղմում **[⛶ Fullscreen]** → ամբողջ էկրան immersive walkthrough։ Տեսնում է, որ սենյակները լուսավոր են ու ընդարձակ → վստահությունը մեծացավ, գրում է վաճառողին։

**Սցենար Գ — Սեփականատեր Դավիթը (uploader).** Դավիթը listing wizard-ի Step 4-ում տեսնում է «360° / Virtual tour» բլոկ՝ subtle prompt «➕ Ավելացրու 360° շրջայց՝ +X% դիտում»։ Ընտրում է tab (A) panorama → drag&drop 3 equirectangular նկար։ Ամեն մեկին label է տալիս (Հյուրասենյակ / Ննջասենյակ / Խոհանոց), reorder անում drag-ով։ Upload → «Մշակվում է...» progress։ Hotspot editor-ով դնում է «դեպի խոհանոց» անցում։ → `property_media` rows ստեղծվեցին (type=tour360)։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — viewer gallery-ի տարածքում

```
┌────────────────────────────────────────────────────────────┐
│  PROPERTY GALLERY AREA (h-[480px] rounded-xl)              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      ⛶ │ │  ← fullscreen
│  │           360° PANORAMA (drag to look)                │ │
│  │                                                       │ │
│  │      ➡ (hotspot՝ դեպի խոհանոց)                        │ │
│  │                                              [🔍+][🔍−]│ │
│  │  ◀ ▶ (սենյակ)              [⟲ auto] [🥽 VR]           │ │
│  └──────────────────────────────────────────────────────┘ │
│  [📷 Լուսանկ. (29)] [🎥 Video] [🌐 360° Tour] [🗺] [📐]   │  ← tabs (360° active)
│  Սենյակ ▾: Հյուրասենյակ · Ննջ. · Խոհանոց · Սանհ.          │  ← room nav
└────────────────────────────────────────────────────────────┘
```

### Mobile (<768px) — full-bleed viewer

```
┌──────────────────────────┐
│ 360° PANORAMA (h-[280px])│
│  (touch drag / gyro)     │
│              ⛶   🧭       │  ← fullscreen, gyroscope
│  ◀ ●○○ ▶  [⟲]            │  ← room dots
├──────────────────────────┤
│ [📷][🎥][🌐][🗺][📐] tabs│
└──────────────────────────┘
   gyroscope prompt overlay:
   «🧭 Թեքիր սարքը՝ նայելու»
```

### Uploader (listing wizard Step 4) — desktop

```
┌──────── 360° / Virtual tour (optional) ────────┐
│ [📷 Panorama] [🔗 Embed link] [📹 Video]  tabs │
│ ┌──────────────────────────────────────────┐  │
│ │  📤 Քաշիր panorama-ները այստեղ            │  │
│ │     կամ սեղմիր ընտրելու համար             │  │
│ └──────────────────────────────────────────┘  │
│ ┌── uploaded ──┐ ┌──────────┐ ┌──────────┐    │
│ │ ⠿ Հյուրաս. ✎│ │⠿ Ննջ.  ✎│ │⠿ Խոհ.  ✎│    │  ← drag reorder + label
│ └──────────────┘ └──────────┘ └──────────┘    │
│ [✎ Hotspot editor]   «Մշակվում է... ▓▓▓░ 70%» │
└────────────────────────────────────────────────┘
```

### Design tokens (tour-ի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| Viewer container | `relative h-[480px] rounded-xl overflow-hidden bg-gray-900` |
| Control button | `w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70` |
| Hotspot pin | `w-8 h-8 rounded-full bg-white/90 animate-pulse shadow-lg` |
| Room dropdown | `bg-white/90 backdrop-blur rounded-lg text-sm px-3 py-1.5` |
| Active tab | `border-b-2 border-primary text-primary` |
| 360° badge (cover) | `bg-black/60 text-white text-xs px-2 py-1 rounded-md` + 🌐 |
| Gyro prompt | `absolute inset-x-0 bottom-4 bg-black/70 text-white text-sm text-center py-2` |
| Tap-to-load placeholder | `bg-gray-100 flex-center text-gray-500` + 🌐 icon |
| Uploader dropzone | `border-2 border-dashed border-gray-300 rounded-xl h-32 hover:border-primary` |
| Processing bar | `h-1.5 bg-primary rounded-full` (track `bg-gray-200`) |
| Panorama label chip | `bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Որտեղ է հայտնվում (entry points)

- **Gallery tab.** Property էջի վերին gallery-ի tab-երում՝ `[🌐 360° Tour]` (տես `03-property.md` §3.2)։ Tab disabled (`text-gray-300`) եթե tour բացակայում է — իրականում **ընդհանրապես չի ցուցադրվում**, որ դատարկ tab չլինի։
- **Cover badge.** Tour-ի առկայության դեպքում cover նկարի վրա՝ `[🌐 360°]` badge (նաև search card-ի վրա՝ ֆիլտրելի «virtual tour ունի»)։
- **Deep link.** `/property/8423?tab=tour` → ուղիղ բացում է 360° tab-ը (share-ի համար)։
- **Click → lazy embed.** 360° Tour tab click → viewer-ը embed-վում է gallery-ի տարածքում (dynamic import, ոչ թե էջի initial load-ին)։

### 3.2 Embedded viewer (բուն 360° դիտակ)

- **Panorama render.** Equirectangular panorama → render sphere-ի վրա (`photo-sphere-viewer` / pannellum / three.js)։ Mouse drag / touch swipe → պտտում տեսանկյունը 360°×180°։
- **Multi-room navigation.** Մի քանի սենյակ → hotspot նետեր/կետեր panorama-ի վրա («➡ դեպի խոհանոց»)։ Hotspot click → smooth transition։ Կողքին՝ սենյակների dropdown / thumbnail mini-map (Հյուրասենյակ · Ննջասենյակ · Խոհանոց · Սանհանգույց)։
- **Matterport / external embed.** Tour-ը embed link է → sandbox `<iframe loading="lazy">`։
- **Initial state.** Subtle auto-rotate, մինչև user-ը interact անի → կանգ։

### 3.3 Viewer controls

| Կոճակ | Վարք |
|-------|------|
| `[⛶ Fullscreen]` | Ամբողջ էկրան (ESC-ով դուրս), `requestFullscreen()` |
| `[🔍 +] / [🔍 −]` | Zoom (FOV փոփոխություն, սահմաններով) |
| `[⟲ Auto-rotate]` | Toggle ինքնապտույտ |
| `[🧭 Gyroscope]` | **Mobile only** — device orientation API (iOS permission prompt) |
| `[🥽 VR mode]` | WebXR / cardboard stereo split-screen — հայտնվում է **միայն** WebXR-supported browser-ում |
| `[ℹ️]` | Hotspot info popup՝ սենյակի անուն/մակերես (եթե metadata) |
| `[◀ ▶]` | Սենյակից սենյակ (multi-room) |
| `[✕]` | Փակել tour-ը → վերադարձ լուսանկարների tab |

- Բոլոր icon-only կոճակները՝ `aria-label`։ Mobile-ում `[🔍]`-ը թաքնված (pinch zoom-ով)։

### 3.4 Mobile / VR վարք

- **Gyroscope.** Mobile-ում առաջարկ՝ «🧭 Թեքիր սարքը՝ նայելու շուրջը» (iOS-ի համար՝ `DeviceOrientationEvent.requestPermission()`)։ Permission deny → drag fallback։
- **Pinch zoom** + touch drag։
- **VR headset.** VR mode → stereoscopic dual-view; cardboard-ի մեջ դնելով՝ immersive walkthrough։
- **Fallback.** Gyroscope/WebXR չկա → controls չեն ցուցադրվում, drag navigation-ը մնում է (չի կոտրվում)։

### 3.5 Uploader — որտեղ է ավելացվում

Listing wizard-ի **Step 4 — Media** բաժնում, photos/video-ից հետո՝ առանձին **«360° / Virtual tour»** բլոկ (optional, տես `04-listing-wizard.md` §Step 4)։

### 3.6 Uploader — supported inputs (3 տարբերակ, tab-երով)

- **(A) 360° panorama photos** — `[📤 Upload panorama]` drag&drop / click։
  - Multiple panorama (1 սենյակ = 1 panorama)։ Ամեն upload-ից հետո՝ սենյակին **label** տալ (Հյուրասենյակ / Ննջ. / …) + reorder (drag handle `⠿`)։
  - Multi-room դեպքում՝ optional **hotspot editor**՝ panorama-ի վրա drag-pin «դեպի X սենյակ» անցումներ։
- **(B) Matterport-style embed link** — `[🔗 Paste link]` input։ Validate URL (whitelisted host՝ Matterport / Kuula / և այլ)։ Preview thumbnail՝ embed-ի։
- **(C) Video walkthrough** — `[📹 Upload video]` / URL (YouTube / Vimeo)՝ քայլող video tour (ոչ ինտերակտիվ, fallback)։

### 3.7 Uploader — supported formats

- **Panorama photo.** JPG/PNG equirectangular (2:1 aspect, օր․ 4096×2048 / 8192×4096)։ Max ~25 MB / panorama։
- **Video.** MP4 / WebM (H.264), max ~200 MB կամ external URL (YouTube / Vimeo)։
- **Embed.** `https` URL only, whitelisted host-եր (security՝ sandbox iframe)։
- **Validation.** Սխալ aspect ratio panorama → warning «Սա equirectangular 360° նկար չի թվում»; չ-whitelist host → reject error toast «Այս host-ը չի աջակցվում»։

### 3.8 Uploader — processing / hosting

- **Storage.** Panorama/video → Supabase Storage / Cloudinary (`property_media`, type=`tour360`)։
- **Processing.** Upload → auto thumbnail/preview generation, compression, multi-resolution (tiled՝ արագ load խոշոր panorama-ի համար)։ Async job; wizard-ում progress bar + «Մշակվում է...» status։
- **Embed links** չեն hosted — պահվում է URL-ը + provider type։
- **Microcopy.** Processing-ի ընթացքում՝ «Մշակվում է... կարող ես շարունակել, պատրաստ կլինի մի քանի րոպեից»։

### 3.9 Fallback (երբ tour չկա)

- **Gallery-ում 360° tab չի ցուցադրվում** ընդհանրապես (ոչ դատարկ tab)։
- Search card-ի «360°» badge չի հայտնվում։
- Owner-ին wizard-ում՝ subtle prompt «➕ Ավելացրու 360° շրջայց՝ +X% դիտում» (encourage, ոչ պարտադիր)։

### 3.10 Performance / lazy-load

- **Lazy.** Viewer library (three.js / photo-sphere-viewer) + panorama asset-երը load-վում են **միայն** «360° Tour» tab-ի click-ի ժամանակ (`dynamic(() => ..., { ssr: false })`), ոչ թե property էջի initial load-ին → չեն ծանրացնում LCP-ն։
- **Progressive.** Low-res panorama preview նախ, ապա high-res tile-եր (blur-up)։
- **Mobile cellular.** «Tap to load 360° (X MB)» placeholder՝ data խնայելու համար։
- **iframe embed.** `loading="lazy"` + sandbox attributes։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **No tour** | 360° tab չի ցուցադրվում; cover badge չկա |
| **Tab idle (cellular)** | «Tap to load 360° (8 MB)» placeholder |
| **Viewer loading** | Spinner + low-res blur preview |
| **Viewer ready** | Ինտերակտիվ panorama + controls |
| **Transitioning room** | Smooth fade hotspot-ի click-ից հետո |
| **Gyro permission prompt** | «🧭 Թեքիր սարքը» overlay |
| **No WebGL** | Static wide image + «Քո browser-ը չի աջակցում 360°» |
| **No WebXR** | VR կոճակը թաքնված (drag-ը մնում է) |
| **Broken embed** | «Շրջայցը հասանելի չէ» + [Կրկին փորձել] |
| **Upload uploading** | Progress bar % |
| **Upload processing** | «Մշակվում է...» status |
| **Upload error** | Toast (aspect/host/size) + retry |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
ՄԱՍ Ա — Viewer (property detail)
<PropertyGallery>
 └─ <Tour360Tab>                              (client, lazy, ssr:false)
     ├─ <PanoramaViewer panoramas hotspots /> (photo-sphere-viewer)
     │   ├─ <Hotspot to={roomId} />
     │   └─ <ViewerControls fullscreen zoom gyro vr />
     ├─ <RoomNavigator rooms current onSelect />
     └─ <EmbedTour url provider />             (iframe, պայմանով)

ՄԱՍ Բ — Uploader (listing wizard Step 4)
<TourUploadBlock>                              (client)
 ├─ <TabSwitcher tabs={[panorama, embed, video]} />
 ├─ <PanoramaUploader onUpload validate />
 │   ├─ <PanoramaItem label order onLabel onReorder />
 │   └─ <HotspotEditor panorama rooms />
 ├─ <EmbedLinkInput onPaste validateHost />
 └─ <VideoUploader onUpload />
```

### Data fields used (տես 00-SPEC §7)

`property_media { id, property_id, type:'tour360', subtype:'panorama'|'embed'|'video', url, room_label, order, hotspots(json), provider }`։ Property-ի կողմից՝ `GET /api/properties/[id]` վերադարձնում է `media[]` որտեղ `type === 'tour360'`։

`hotspots` JSON օրինակ՝
```jsonc
{ "yaw": 120, "pitch": -5, "targetRoom": "kitchen", "label": "Խոհանոց" }
```

### API contract-ներ

**`POST /api/listings/[id]/media`** (panorama / video)
```jsonc
// multipart/form-data: file, type=tour360, subtype=panorama, roomLabel
// 201 OK
{
  "id": 991, "type": "tour360", "subtype": "panorama",
  "url": "https://.../pano-living.jpg",
  "roomLabel": "Հյուրասենյակ", "order": 0,
  "status": "processing"
}
// 422 { "error": "bad_aspect_ratio" }   → «Սա 360° նկար չի թվում»
// 413 { "error": "file_too_large", "maxMb": 25 }
```

**`POST /api/listings/[id]/media/embed`** (Matterport / external)
```jsonc
// request  { "url": "https://my.matterport.com/show/?m=ABC123" }
// 201      { "id": 992, "subtype": "embed", "provider": "matterport",
//            "thumbnail": "https://..." }
// 422      { "error": "host_not_whitelisted" }  → «Այս host-ը չի աջակցվում»
```

**`PATCH /api/listings/[id]/media/[mediaId]`** → `{ "roomLabel": "Ննջասենյակ", "order": 1, "hotspots": [...] }` → `200`

**`GET /api/properties/[id]`** → `media[]` ներառում է `tour360` items (url, room_label, hotspots)։

### Validation (zod)

```ts
const WHITELISTED_HOSTS = ["matterport.com", "my.matterport.com",
                           "kuula.co", "momento360.com"];

const embedSchema = z.object({
  url: z.string().url("Անվավեր հղում").refine(
    (u) => WHITELISTED_HOSTS.some((h) => new URL(u).hostname.endsWith(h)),
    "Այս host-ը չի աջակցվում",
  ),
});

const panoramaMeta = z.object({
  roomLabel: z.string().min(1, "Նշիր սենյակի անունը").max(40),
  order: z.number().int().min(0),
  // aspect ratio՝ server-side ստուգում (width / height ≈ 2.0 ± 0.1)
});
```

- **Aspect ratio.** Server-side՝ `width / height ≈ 2.0` (±5%) → այլապես 422։
- **Host whitelist.** Embed-ի համար՝ միայն whitelisted host (XSS/clickjacking պաշտպանություն)։
- **Signed URL.** Private asset-երը՝ Supabase signed URL-ներով։
- **Viewer.** Client-side dynamic import; WebXR API՝ VR mode-ի feature-detect-ով։

---

## 6. Responsive

- **≥1024px (lg).** Viewer gallery տարածքում `h-[480px]`; բոլոր controls տեսանելի; room dropdown կողքին; fullscreen՝ ամբողջ էկրան։
- **768–1023px (md).** Viewer `h-[360px]`; controls compact; room navigation՝ dropdown։
- **<768px (sm).** Full-bleed `h-[280px]`; touch drag + gyroscope prompt; zoom-ը՝ pinch (կոճակ չկա); room navigation՝ dot-եր (`●○○`); cellular-ում «Tap to load»։

---

## 7. Accessibility

- Viewer-ը՝ `role="application"` + `aria-label` «360 աստիճան շրջայց — {room}»։
- Keyboard՝ arrow keys pan (←/→ yaw, ↑/↓ pitch), `+`/`−` zoom, ESC fullscreen-ից դուրս։
- Բոլոր control կոճակները՝ `aria-label` (⛶ = «Ամբողջ էկրան», 🧭 = «Միացնել գիրոսկոպը», 🥽 = «VR ռեժիմ»)։
- Hotspot-ները՝ keyboard-focusable, Enter-ով անցում; `aria-label` «Անցնել {room}»։
- WebGL fallback static image-ը՝ `alt` տեքստով։
- Gyro/motion prompt-ը՝ `role="status"`; error placeholder-ը՝ `role="alert"`։

---

## 8. SEO & meta

- Structured data (JSON-LD)՝ `RealEstateListing → media`-ում tour-ի առկայության նշում։
- OG preview-ում tour badge; share link-ով կարող է բացել ուղիղ 360° tab (`?tab=tour`)։
- 360°-tour ունեցող հայտարարությունները search-ում ֆիլտրելի (`has_tour=true`) — ավելի բարձր engagement signal, որը կարող է բարձրացնել ranking-ը։
- Viewer-ը client-only է (`ssr:false`) → SEO-ի համար ապավինում ենք property էջի հիմնական SSR markup-ին (tour-ը չի ինդեքսավորվում առանձին)։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `tour360_open` | 360° tab click | `property_id` |
| `tour360_loaded` | Viewer ready | `property_id, load_ms` |
| `tour_room_changed` | Dropdown / hotspot room switch | `property_id, room` |
| `tour_hotspot_used` | Hotspot click | `property_id, target_room` |
| `tour_fullscreen` | Fullscreen բացում | `property_id` |
| `tour_gyro_enabled` | Gyroscope toggle | `property_id` |
| `tour_vr_entered` | VR mode | `property_id` |
| `tour_upload_started` | Panorama/video upload | `listing_id, subtype` |
| `tour_upload_completed` | Processing done | `listing_id, count` |
| `tour_embed_added` | Embed link saved | `listing_id, provider` |
