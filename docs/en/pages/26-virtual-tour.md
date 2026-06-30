# Page 26 — VR / 360° Virtual Tour 🟡 Phase 2

> **Spec depth level.** Deep (follows the `03-property.md` gold standard). Includes: overview, scenarios, layout/dimensions/colors, section-by-section behavior and states, microcopy (English), technical section (components, props, data fields, API contracts, validation), responsive, accessibility, analytics, SEO.

**URL.** Has no dedicated page — it is a **feature** that lives inside the **property detail** (`/property/[id]`) (viewer) + is uploaded inside the **listing wizard** (`/sell/new`, Step 4 Media) (uploader). Deep-link: `?tab=tour`.
**Roles.** Viewing: everyone (Guest, User, Agent, Admin); adding: owner (User/Agent).
**Primary goal.** Let the buyer "walk" through the property remotely, without physically visiting. It increases trust and conversion, reduces pointless viewings, and makes the listing stand out (engagement signal).

---

## 0. Overview

The 360° tour is a **conversion booster** on the property page, not a standalone page. It lives in the gallery tabs (`[🌐 360°]`) and opens **only after a click** (lazy) — the viewer library (~150 KB) and heavy panorama assets should never weigh down the property page's LCP.

The feature has **two sides**:
- **PART A — Viewer** (property detail): an interactive panorama viewer with drag/swipe rotation, multi-room hotspot navigation, fullscreen, mobile gyroscope, optional VR mode.
- **PART B — Uploader** (listing wizard Step 4): the owner adds a tour in three ways — 360° panorama photos, a Matterport-style embed link, or a video walkthrough.

A critical principle: **graceful degradation**. No tour → the tab is not shown (no empty tab). No WebGL → static wide image fallback. No gyroscope/WebXR → the controls simply don't appear, and drag navigation remains. Slow connection → a "Tap to load" placeholder to save data.

---

## 1. User scenarios

**Scenario A — Buyer Aram (mobile, viewer).** Aram opens the apartment's page on his phone and sees a `[🌐 360°]` tab in the gallery. Click → "Tap to load 360° (8 MB)" placeholder (cellular). Tap → the viewer loads and shows the living room. A prompt appears: "🧭 Tilt your device to look around" → he allows the gyroscope, rotates the phone to look at the ceiling and floor. Hotspot arrow → "➡ Kitchen" → smooth transition. → `tour360_open` + `tour_hotspot_used` event.

**Scenario B — Tenant Maria (desktop, viewer).** Maria is in the middle of a comparison and clicks the 360° tab. She rotates the room by dragging, selects "Bedroom" from the dropdown. She clicks **[⛶ Fullscreen]** → a full-screen immersive walkthrough. She sees that the rooms are bright and spacious → her confidence grows, and she writes to the seller.

**Scenario C — Owner David (uploader).** In Step 4 of the listing wizard, David sees a "360° / Virtual tour" block with a subtle prompt "➕ Add a 360° tour: +X% views." He selects tab (A) panorama → drag&drops 3 equirectangular images. He labels each (Living room / Bedroom / Kitchen) and reorders them by dragging. Upload → "Processing..." progress. With the hotspot editor he sets up a "to the kitchen" transition. → `property_media` rows were created (type=tour360).

---

## 2. Layout & visual structure

### Desktop (≥1024px) — viewer in the gallery area

```
┌────────────────────────────────────────────────────────────┐
│  PROPERTY GALLERY AREA (h-[480px] rounded-xl)              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                                                      ⛶ │ │  ← fullscreen
│  │           360° PANORAMA (drag to look)                │ │
│  │                                                       │ │
│  │      ➡ (hotspot: to the kitchen)                     │ │
│  │                                              [🔍+][🔍−]│ │
│  │  ◀ ▶ (room)              [⟲ auto] [🥽 VR]            │ │
│  └──────────────────────────────────────────────────────┘ │
│  [📷 Photos (29)] [🎥 Video] [🌐 360° Tour] [🗺] [📐]     │  ← tabs (360° active)
│  Room ▾: Living room · Bedroom · Kitchen · Bathroom       │  ← room nav
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
   "🧭 Tilt your device to look"
```

### Uploader (listing wizard Step 4) — desktop

```
┌──────── 360° / Virtual tour (optional) ────────┐
│ [📷 Panorama] [🔗 Embed link] [📹 Video]  tabs │
│ ┌──────────────────────────────────────────┐  │
│ │  📤 Drag the panoramas here               │  │
│ │     or click to select                    │  │
│ └──────────────────────────────────────────┘  │
│ ┌── uploaded ──┐ ┌──────────┐ ┌──────────┐    │
│ │ ⠿ Living. ✎ │ │⠿ Bdrm. ✎│ │⠿ Kitch. ✎│    │  ← drag reorder + label
│ └──────────────┘ └──────────┘ └──────────┘    │
│ [✎ Hotspot editor]   "Processing... ▓▓▓░ 70%" │
└────────────────────────────────────────────────┘
```

### Design tokens (for the tour)

| Element | Tailwind / value |
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

## 3. Section-by-section

### 3.1 Where it appears (entry points)

- **Gallery tab.** In the tabs of the property page's top gallery: `[🌐 360° Tour]` (see `03-property.md` §3.2). The tab is disabled (`text-gray-300`) if a tour is missing — actually it's **not shown at all**, so there's no empty tab.
- **Cover badge.** When a tour is present, a `[🌐 360°]` badge on the cover image (also on the search card: filterable "has virtual tour").
- **Deep link.** `/property/8423?tab=tour` → opens the 360° tab directly (for sharing).
- **Click → lazy embed.** 360° Tour tab click → the viewer is embedded in the gallery area (dynamic import, not on the page's initial load).

### 3.2 Embedded viewer (the actual 360° viewer)

- **Panorama render.** Equirectangular panorama → rendered on a sphere (`photo-sphere-viewer` / pannellum / three.js). Mouse drag / touch swipe → rotates the viewpoint 360°×180°.
- **Multi-room navigation.** Multiple rooms → hotspot arrows/dots on the panorama ("➡ to the kitchen"). Hotspot click → smooth transition. Alongside: a room dropdown / thumbnail mini-map (Living room · Bedroom · Kitchen · Bathroom).
- **Matterport / external embed.** The tour is an embed link → sandboxed `<iframe loading="lazy">`.
- **Initial state.** Subtle auto-rotate until the user interacts → stop.

### 3.3 Viewer controls

| Button | Behavior |
|-------|------|
| `[⛶ Fullscreen]` | Full screen (exit with ESC), `requestFullscreen()` |
| `[🔍 +] / [🔍 −]` | Zoom (FOV change, within limits) |
| `[⟲ Auto-rotate]` | Toggle auto-rotation |
| `[🧭 Gyroscope]` | **Mobile only** — device orientation API (iOS permission prompt) |
| `[🥽 VR mode]` | WebXR / cardboard stereo split-screen — appears **only** in a WebXR-supported browser |
| `[ℹ️]` | Hotspot info popup: room name/area (if metadata) |
| `[◀ ▶]` | From room to room (multi-room) |
| `[✕]` | Close the tour → return to the photos tab |

- All icon-only buttons have an `aria-label`. On mobile, `[🔍]` is hidden (use pinch zoom).

### 3.4 Mobile / VR behavior

- **Gyroscope.** On mobile, a prompt: "🧭 Tilt your device to look around" (for iOS: `DeviceOrientationEvent.requestPermission()`). Permission deny → drag fallback.
- **Pinch zoom** + touch drag.
- **VR headset.** VR mode → stereoscopic dual-view; placing it in a cardboard → immersive walkthrough.
- **Fallback.** No gyroscope/WebXR → controls are not shown, and drag navigation remains (nothing breaks).

### 3.5 Uploader — where it is added

In the listing wizard's **Step 4 — Media** section, after photos/video: a separate **"360° / Virtual tour"** block (optional, see `04-listing-wizard.md` §Step 4).

### 3.6 Uploader — supported inputs (3 options, in tabs)

- **(A) 360° panorama photos** — `[📤 Upload panorama]` drag&drop / click.
  - Multiple panoramas (1 room = 1 panorama). After each upload: give the room a **label** (Living room / Bedroom / …) + reorder (drag handle `⠿`).
  - For multi-room: an optional **hotspot editor**: drag-pin "to room X" transitions on the panorama.
- **(B) Matterport-style embed link** — `[🔗 Paste link]` input. Validate URL (whitelisted host: Matterport / Kuula / etc.). Preview thumbnail of the embed.
- **(C) Video walkthrough** — `[📹 Upload video]` / URL (YouTube / Vimeo): a walking video tour (non-interactive, fallback).

### 3.7 Uploader — supported formats

- **Panorama photo.** JPG/PNG equirectangular (2:1 aspect, e.g. 4096×2048 / 8192×4096). Max ~25 MB / panorama.
- **Video.** MP4 / WebM (H.264), max ~200 MB or external URL (YouTube / Vimeo).
- **Embed.** `https` URL only, whitelisted hosts (security: sandbox iframe).
- **Validation.** Wrong aspect ratio panorama → warning "This doesn't look like an equirectangular 360° image"; non-whitelisted host → reject error toast "This host is not supported."

### 3.8 Uploader — processing / hosting

- **Storage.** Panorama/video → Supabase Storage / Cloudinary (`property_media`, type=`tour360`).
- **Processing.** Upload → auto thumbnail/preview generation, compression, multi-resolution (tiled for fast loading of large panoramas). Async job; progress bar + "Processing..." status in the wizard.
- **Embed links** are not hosted — the URL + provider type is stored.
- **Microcopy.** During processing: "Processing... you can continue, it'll be ready in a few minutes."

### 3.9 Fallback (when there is no tour)

- **The 360° tab is not shown at all in the gallery** (no empty tab).
- The "360°" badge on the search card does not appear.
- For the owner in the wizard: a subtle prompt "➕ Add a 360° tour: +X% views" (encourage, not mandatory).

### 3.10 Performance / lazy-load

- **Lazy.** The viewer library (three.js / photo-sphere-viewer) + panorama assets load **only** when the "360° Tour" tab is clicked (`dynamic(() => ..., { ssr: false })`), not on the property page's initial load → they don't weigh down the LCP.
- **Progressive.** Low-res panorama preview first, then high-res tiles (blur-up).
- **Mobile cellular.** "Tap to load 360° (X MB)" placeholder to save data.
- **iframe embed.** `loading="lazy"` + sandbox attributes.

---

## 4. Complete list of page states

| State | What is displayed |
|-------|---------------------|
| **No tour** | 360° tab is not shown; no cover badge |
| **Tab idle (cellular)** | "Tap to load 360° (8 MB)" placeholder |
| **Viewer loading** | Spinner + low-res blur preview |
| **Viewer ready** | Interactive panorama + controls |
| **Transitioning room** | Smooth fade after a hotspot click |
| **Gyro permission prompt** | "🧭 Tilt your device" overlay |
| **No WebGL** | Static wide image + "Your browser doesn't support 360°" |
| **No WebXR** | VR button hidden (drag remains) |
| **Broken embed** | "The tour is unavailable" + [Try again] |
| **Upload uploading** | Progress bar % |
| **Upload processing** | "Processing..." status |
| **Upload error** | Toast (aspect/host/size) + retry |

---

## 5. Technical depth

### Component tree

```
PART A — Viewer (property detail)
<PropertyGallery>
 └─ <Tour360Tab>                              (client, lazy, ssr:false)
     ├─ <PanoramaViewer panoramas hotspots /> (photo-sphere-viewer)
     │   ├─ <Hotspot to={roomId} />
     │   └─ <ViewerControls fullscreen zoom gyro vr />
     ├─ <RoomNavigator rooms current onSelect />
     └─ <EmbedTour url provider />             (iframe, conditional)

PART B — Uploader (listing wizard Step 4)
<TourUploadBlock>                              (client)
 ├─ <TabSwitcher tabs={[panorama, embed, video]} />
 ├─ <PanoramaUploader onUpload validate />
 │   ├─ <PanoramaItem label order onLabel onReorder />
 │   └─ <HotspotEditor panorama rooms />
 ├─ <EmbedLinkInput onPaste validateHost />
 └─ <VideoUploader onUpload />
```

### Data fields used (see 00-SPEC §7)

`property_media { id, property_id, type:'tour360', subtype:'panorama'|'embed'|'video', url, room_label, order, hotspots(json), provider }`. From the property side: `GET /api/properties/[id]` returns `media[]` where `type === 'tour360'`.

`hotspots` JSON example:
```jsonc
{ "yaw": 120, "pitch": -5, "targetRoom": "kitchen", "label": "Kitchen" }
```

### API contracts

**`POST /api/listings/[id]/media`** (panorama / video)
```jsonc
// multipart/form-data: file, type=tour360, subtype=panorama, roomLabel
// 201 OK
{
  "id": 991, "type": "tour360", "subtype": "panorama",
  "url": "https://.../pano-living.jpg",
  "roomLabel": "Living room", "order": 0,
  "status": "processing"
}
// 422 { "error": "bad_aspect_ratio" }   → "This doesn't look like a 360° image"
// 413 { "error": "file_too_large", "maxMb": 25 }
```

**`POST /api/listings/[id]/media/embed`** (Matterport / external)
```jsonc
// request  { "url": "https://my.matterport.com/show/?m=ABC123" }
// 201      { "id": 992, "subtype": "embed", "provider": "matterport",
//            "thumbnail": "https://..." }
// 422      { "error": "host_not_whitelisted" }  → "This host is not supported"
```

**`PATCH /api/listings/[id]/media/[mediaId]`** → `{ "roomLabel": "Bedroom", "order": 1, "hotspots": [...] }` → `200`

**`GET /api/properties/[id]`** → `media[]` includes `tour360` items (url, room_label, hotspots).

### Validation (zod)

```ts
const WHITELISTED_HOSTS = ["matterport.com", "my.matterport.com",
                           "kuula.co", "momento360.com"];

const embedSchema = z.object({
  url: z.string().url("Invalid link").refine(
    (u) => WHITELISTED_HOSTS.some((h) => new URL(u).hostname.endsWith(h)),
    "This host is not supported",
  ),
});

const panoramaMeta = z.object({
  roomLabel: z.string().min(1, "Enter the room name").max(40),
  order: z.number().int().min(0),
  // aspect ratio: server-side check (width / height ≈ 2.0 ± 0.1)
});
```

- **Aspect ratio.** Server-side: `width / height ≈ 2.0` (±5%) → otherwise 422.
- **Host whitelist.** For embeds: only whitelisted hosts (XSS/clickjacking protection).
- **Signed URL.** Private assets: via Supabase signed URLs.
- **Viewer.** Client-side dynamic import; WebXR API: with feature-detect for VR mode.

---

## 6. Responsive

- **≥1024px (lg).** Viewer in the gallery area `h-[480px]`; all controls visible; room dropdown alongside; fullscreen: full screen.
- **768–1023px (md).** Viewer `h-[360px]`; compact controls; room navigation: dropdown.
- **<768px (sm).** Full-bleed `h-[280px]`; touch drag + gyroscope prompt; zoom: pinch (no button); room navigation: dots (`●○○`); on cellular "Tap to load".

---

## 7. Accessibility

- The viewer: `role="application"` + `aria-label` "360-degree tour — {room}".
- Keyboard: arrow keys pan (←/→ yaw, ↑/↓ pitch), `+`/`−` zoom, ESC to exit fullscreen.
- All control buttons have an `aria-label` (⛶ = "Fullscreen", 🧭 = "Enable gyroscope", 🥽 = "VR mode").
- Hotspots: keyboard-focusable, transition with Enter; `aria-label` "Go to {room}".
- The WebGL fallback static image has `alt` text.
- The gyro/motion prompt: `role="status"`; the error placeholder: `role="alert"`.

---

## 8. SEO & meta

- Structured data (JSON-LD): note the presence of a tour in `RealEstateListing → media`.
- A tour badge in the OG preview; the share link can open the 360° tab directly (`?tab=tour`).
- Listings with a 360° tour are filterable in search (`has_tour=true`) — a higher engagement signal that can boost ranking.
- The viewer is client-only (`ssr:false`) → for SEO we rely on the property page's main SSR markup (the tour is not indexed separately).

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `tour360_open` | 360° tab click | `property_id` |
| `tour360_loaded` | Viewer ready | `property_id, load_ms` |
| `tour_room_changed` | Dropdown / hotspot room switch | `property_id, room` |
| `tour_hotspot_used` | Hotspot click | `property_id, target_room` |
| `tour_fullscreen` | Fullscreen open | `property_id` |
| `tour_gyro_enabled` | Gyroscope toggle | `property_id` |
| `tour_vr_entered` | VR mode | `property_id` |
| `tour_upload_started` | Panorama/video upload | `listing_id, subtype` |
| `tour_upload_completed` | Processing done | `listing_id, count` |
| `tour_embed_added` | Embed link saved | `listing_id, provider` |
