# Page 26 — 360° Virtual Tour Viewer (Part A): Design → Dev Handoff

**Role.** Design spec for implementation. Product/UX spec of record is
[`docs/en/pages/26-virtual-tour.md`](../en/pages/26-virtual-tour.md) — read that
first for the full user scenarios, analytics events, SEO and the generic (larger)
technical contract. This document closes the gap between that generic spec and
*this specific codebase*, and pins down the MVP visual/interaction design for
**PART A — the viewer only** (property detail page). Part B (listing-wizard
uploader) is out of scope — see §0.

Audited against the current tree: `components/property/PropertyGallery.tsx`
(already reserves a `[🌐 360°]` tab key, currently rendered **disabled** whenever
`hasTour360` is false — see D1, this must change), `components/property/Lightbox.tsx`
(lazy-loaded via `next/dynamic(..., { ssr: false })` — the pattern to copy for the
viewer), `components/property/PropertyMap.tsx` (the closest existing precedent for
"heavy client-only library, imperatively mounted into a `ref` div, with a graceful
`mapError` fallback card" — copy this shape for the WebGL/broken-embed fallbacks),
`app/api/properties/[id]/route.ts` + `lib/property/types.ts` (`PropertyMedia`,
`PropertyDetail` — where `tourType`/`tourData` need to be threaded through),
`supabase/migrations/0001_init.sql` (table is named `properties`, not `listings`
— see D2), `app/globals.css` (Tailwind v4 `@theme`, only two custom tokens exist:
`--color-primary` (`#2563eb`) and `--font-sans`; everything else is stock
Tailwind gray scale). Stack confirmed: **no `components/ui` primitives library and
no `components/motion` wrapper library exist in this codebase** — every component
is hand-built with Tailwind utility classes, `clsx`/`tailwind-merge` (`cn()` in
`lib/utils.ts`), and `lucide-react` icons. This spec follows that convention: it
names exact Tailwind classes and exact `lucide-react` icon names to use, the same
way every other page in this repo is built. Do not introduce a UI/motion library
for this task.

---

## 0. MVP scope for this task (read before building)

**In scope (Part A only):**
- `[🌐 360°]` tab in `PropertyGallery`'s existing tab bar, shown **only** when
  tour data exists (not merely disabled — see D1).
- Lazy-loaded viewer (`next/dynamic(..., { ssr: false })`), fetched only on tab
  click.
- Three tour renderers: panorama (drag/swipe, via a panorama-viewer library of
  the developer's choice, e.g. `photo-sphere-viewer`), embed (`<iframe>`), video
  (`<video>`).
- Fullscreen toggle.
- Fallback states: tap-to-load, WebGL-unavailable, no-gyroscope (silently omit,
  don't block drag), malformed-data, broken-embed.

**Explicitly out of scope for this task (do not build):**
- Part B — the listing-wizard uploader (`/sell/new` Step 4), any upload UI,
  processing/progress bars, hotspot editor.
- VR / WebXR stereo mode (`[🥽 VR mode]` button). Feature-detect only if trivial;
  do not build the stereo split-view.
- Multi-room hotspot navigation, room dropdown/mini-map, `[◀ ▶]` room switcher,
  `[ℹ️]` hotspot info popup. The task brief explicitly allows stubbing this to a
  **single-panorama view** when the authoring format for multi-room hotspots
  doesn't already exist — it doesn't (see D3) — so this spec designs for exactly
  one panorama / one embed / one video per listing. Note the limitation in the
  PR description, per the task brief.
- The cover "🌐 360°" badge and search-card "has tour" filter (§3.9 in the page
  spec) are **not required by this task's acceptance criteria**. §7 below
  designs it anyway as a small optional addition since it's cheap and reuses an
  existing visual pattern — treat it as nice-to-have, not blocking.

---

## 1. Design decisions that deviate from the generic page spec

| # | Page-spec / generic assumption | Decision for this codebase | Why |
|---|---|---|---|
| D1 | Tab "is disabled (`text-gray-300`)... actually it's not shown at all" | `PropertyGallery.tsx`'s `TABS` array today renders **every** tab, including `tour360`, and merely applies `isDisabled` styling (`text-gray-300 border-gray-100 cursor-not-allowed`) when `!hasTour360`. That contradicts the requirement. **Filter the array before mapping**: build the rendered tab list as `TABS.filter(t => t.key !== 'tour360' || hasTour360)` so the 360° entry is omitted from the DOM entirely when there's no tour, while `video`/`floorplan` keep their existing disabled-grey treatment (unchanged — out of scope). | Matches doc §3.9 exactly ("not shown at all... no empty tab") and the task's acceptance criteria ("tested with a listing fixture that has none"). |
| D2 | "listings table" | The actual table is `properties` (see `supabase/migrations/0001_init.sql:32`). Add `tour_type` / `tour_data` as nullable columns on `properties`, not on `property_media` (which already has an unrelated `media_type = 'virtual_tour'` value used for photo/video *files* — leave that column alone). | Task's acceptance criteria says "listings table (or equivalent)"; `properties` is the equivalent in this schema. Two different concepts share the word "tour" — don't conflate them. |
| D3 | `property_media { ..., hotspots(json), ... }` multi-room authoring format | Not present in this codebase (no `hotspots` column anywhere, no wizard uploader yet). Per the task brief's explicit fallback clause, this spec designs `tour_data` as a **single scene**: one array of panorama image URLs (for future multi-image-per-scene support, e.g. tiles) *or* one embed URL *or* one video URL — no hotspot graph, no room list. | Building a new authoring format is Part B / a separate task. Keeps this task's diff minimal per `CLAUDE.md`. |
| D4 | 3-tier responsive (`≥1024 lg` / `768–1023 md` / `<768 sm`) with three distinct viewer heights (480 / 360 / 280) | `PropertyGallery.tsx` today only has **two** tiers (`hidden md:block` desktop vs `md:hidden` mobile carousel, breakpoint at 768px) — there is no intermediate tablet layout anywhere in this component. Collapse the viewer to the **same two tiers**: `h-[480px]` at `md:` and up, `h-[280px]` below `md:`. | Introducing a third breakpoint tier that nothing else in the gallery uses would look inconsistent and adds branching the rest of the component doesn't have. |
| D5 | Doc's viewer control corner (`⛶` fullscreen top-right of the panorama) | `PropertyGallery`'s outer wrapper already anchors Save/Share/Report at `absolute top-4 right-4` (desktop) / `top-3 right-3` (mobile) **regardless of active tab** (only the inner content swaps — see §2). Putting the viewer's own fullscreen/zoom/auto-rotate controls in that same corner would collide. **Move the viewer's own control cluster to `bottom-4 right-4`** (desktop) / `bottom-3 right-3` (mobile) instead — see §3.3. | Avoids a literal button-on-button collision; keeps the "save/share/report a property" affordance tab-independent, which is the correct product behavior anyway (you can still favorite a listing while looking at its tour). |
| D6 | VR mode button `[🥽 VR mode]`, gyroscope button `[🧭]` as persistent controls | Out of scope per task brief. Gyroscope becomes a **one-time dismissible banner prompt** (mobile + `DeviceOrientationEvent` support only), not a toggle button, since there's nothing to toggle back to once granted. No VR button is rendered at all (feature-detection code may exist per acceptance criteria, but no UI is designed for it in this task). | Matches "keep hotspot navigation only if trivially supported... otherwise stub" instruction, applied to VR/gyro controls too — the smallest UI that satisfies the acceptance criteria. |

---

## 2. Structural change required in `PropertyGallery.tsx`

Today, `activeTab` is tracked in state and used **only** for tab styling — the
desktop grid and mobile carousel always render `photos` regardless of which tab
is selected (there is no `{activeTab === 'photo' && ...}` guard anywhere). To
make the 360° tab (or any tab) actually show different content, the photo
grid/carousel block must become conditional:

```
{activeTab === 'photo' && ( ...existing desktop grid / mobile carousel... )}
{activeTab === 'tour360' && hasTour360 && (
  <Tour360Tab
    tourType={tourType}
    tourData={tourData}
    title={title}
    city={city}
  />
)}
```

The outer `relative` wrapper (desktop) / `relative h-[280px] bg-gray-100
overflow-hidden` wrapper (mobile) and the Save/Share/Report button cluster
**stay exactly where they are, unconditional** — only the inner visual content
swaps. This keeps the container's rounded-xl / height / overlay-button chrome
identical across tabs, which is what makes the tab switch feel like one
continuous surface instead of a page jump.

---

## 3. Section-by-section design

### 3.1 Tab bar entry (`components/property/PropertyGallery.tsx` — edit)

No new visual design needed — reuse the existing tab button exactly as styled
today (`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg
whitespace-nowrap border transition-colors`, active state `border-primary
text-primary bg-primary/5`, `Globe` icon already imported from `lucide-react`).
The only change is D1 (filter, don't disable) and D2/D3 data wiring.

### 3.2 Tap-to-load placeholder (initial state after tab click, before the panorama library or heavy asset is fetched)

Container: `relative h-[480px] md:h-[480px] rounded-xl overflow-hidden bg-gray-100
flex flex-col items-center justify-center gap-3 text-center px-6` (mobile:
`h-[280px]`) — this is the same visual family as `PropertyMap.tsx`'s `mapError`
fallback (`bg-gray-100 rounded-xl flex flex-col items-center justify-center
gap-3`), reused here for consistency.

- Icon: `Globe` (lucide-react), `className="w-10 h-10 text-gray-400"`.
- Text: `<p className="text-gray-600 font-medium">Tap to load 360° tour</p>`.
- Optional subtext when a size hint is available: `<p className="text-sm
  text-gray-400">~8 MB · uses mobile data</p>`.
- The whole card is the tap target: `role="button" tabIndex={0}` on the
  container, `onClick`/`onKeyDown` (Enter/Space) triggers the dynamic import +
  fetch. Hover/focus feedback: `hover:bg-gray-200 transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
  focus-visible:ring-inset` (matches every other interactive card/button in this
  codebase).
- This state is skippable — if you want to keep it simple for desktop/broadband,
  it's fine to show it on all connections for MVP (the doc only *requires* it on
  cellular; detecting connection type reliably is out of scope). Simplicity over
  `navigator.connection` sniffing.

### 3.3 Viewer loading state (after tap, before the panorama/library/asset is ready)

Same container, but:
- Background: the tour's first/only image (if `tour_type === 'panorama'`) shown
  blurred as a low-effort "progressive" cue: `<Image fill className="object-cover
  blur-xl scale-110 opacity-60" />` behind the spinner. For `embed`/`video`
  types, keep the plain `bg-gray-900` (no blur image available pre-load).
- Spinner centered: `<Loader2 className="w-8 h-8 text-white animate-spin" />`
  (white, since it sits over a dark/blurred background — matches the
  `Loader2 animate-spin` convention already used 6× across
  `components/property/*.tsx`).
- `<p role="status" className="text-white text-sm mt-2">Loading 360° tour…</p>`.

### 3.4 Panorama viewer — ready state

Container unchanged: `relative h-[480px] md:h-[480px] rounded-xl overflow-hidden
bg-gray-900` (mobile `h-[280px]`). The panorama library mounts imperatively into
a `ref` div that fills the container, exactly like `PropertyMap.tsx`'s
`containerRef` — do not wrap the library in a React-idiomatic child-component
tree; mount/unmount it in a `useEffect`, same shape as `PropertyMap`'s
`import('mapbox-gl').then(...)` block.

**Entrance.** No library-specific transition needed; add a plain CSS fade so the
swap from the loading state doesn't pop: track a `ready` boolean, render the
mounted viewer div with `className={cn('absolute inset-0 transition-opacity
duration-300', ready ? 'opacity-100' : 'opacity-0')}`. This is the "entrance
animation" for this section — implemented with a Tailwind transition + a
boolean, no animation library needed.

**Auto-rotate.** Starts `true` on mount; the panorama slowly auto-rotates until
the user's first `pointerdown`/`touchstart`, then auto-rotate is set to `false`
permanently for that session (matches doc §3.2 "subtle auto-rotate until the
user interacts → stop"). Respect `prefers-reduced-motion: reduce` — if set,
never start auto-rotate (this codebase has no existing `motion-reduce:`
convention to follow, so add the check via `window.matchMedia
('(prefers-reduced-motion: reduce)').matches` in the same effect that
initializes the viewer).

### 3.5 Viewer controls (panorama type only)

A single control cluster, bottom-right of the container (see D5):
`absolute bottom-4 right-4 flex items-center gap-2` (desktop), `bottom-3 right-3
gap-1.5` (mobile). Each button:

```
className="w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white
  flex items-center justify-center transition-colors hover:bg-black/70
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
```
(mobile: `w-8 h-8`, matching the existing mobile-vs-desktop `w-10/w-8` scaling
already used for the Save/Share/Report buttons in this same component). This is
the doc's own token-table value (`Control button: w-10 h-10 rounded-full
bg-black/50 backdrop-blur text-white hover:bg-black/70`) — reuse verbatim.

| Button | Icon (`lucide-react`) | Shown when | `aria-label` |
|---|---|---|---|
| Zoom out | `ZoomOut` | Desktop only (`hidden md:flex`) — mobile uses pinch | `"Zoom out"` |
| Zoom in | `ZoomIn` | Desktop only | `"Zoom in"` |
| Auto-rotate toggle | `RotateCw` (add `text-primary` tint or a small dot indicator when active — no separate "off" icon, toggle the color instead) | Always | `"Toggle auto-rotate"` (`aria-pressed`) |
| Fullscreen | `Maximize` / `Minimize` (swap icon on `fullscreenchange`) | Always | `"Enter fullscreen"` / `"Exit fullscreen"` |

Tap/click feedback: rely on the existing `hover:bg-black/70` + native `:active`
opacity dip already used elsewhere in this file (no custom `active:` class
exists in the codebase for these pill buttons — don't invent one; consistency
beats novelty here).

### 3.6 Gyroscope prompt (mobile only, feature-detected)

Only rendered when `window.DeviceOrientationEvent` exists **and** the viewport
is `<768px`. One-shot banner, doc's exact token:

```
className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-sm
  text-center py-2 px-4"
role="status"
```

Text: `"🧭 Tilt your device to look around"` with a small inline `Compass`
icon instead of the emoji glyph (`<Compass className="w-4 h-4 inline
mr-1.5" aria-hidden="true" />` — this codebase uses `lucide-react` icons, not
emoji, inside component markup; emoji only appear in the product-spec prose).
Tapping the banner (or any panorama drag) calls
`DeviceOrientationEvent.requestPermission()` (iOS 13+) if present, then hides
the banner permanently for the session (`sessionStorage` or component state —
component state is enough for MVP). Permission denied → banner just closes,
drag/swipe navigation is untouched (already the default interaction, nothing to
fall back to).

**No gyroscope / no WebXR available →** render nothing extra. No button, no
banner, no placeholder — literally omit, per doc §3.4 ("the controls simply
don't appear, and drag navigation remains").

### 3.7 Embed type (`tour_type === 'embed_url'`)

```
<div className="relative h-[480px] md:h-[480px] rounded-xl overflow-hidden bg-gray-900">
  <iframe
    src={tourData.embedUrl}
    loading="lazy"
    sandbox="allow-scripts allow-same-origin allow-popups"
    className="w-full h-full border-0"
    title={`360° virtual tour — ${title}`}
  />
  {/* fullscreen control only — reuse the same bottom-right pill, Maximize/Minimize */}
</div>
```
No zoom/auto-rotate controls (the embedded provider owns its own UI). Fullscreen
targets the outer wrapper `div`, not the iframe itself, so our pill stays
visible/clickable while fullscreen (`requestFullscreen()` on the wrapper).

**Broken embed state** (iframe fails to load / times out — pick a reasonable
client-side heuristic, e.g. a `postMessage`/`onload` timeout of ~8s): swap the
whole container for the same `bg-gray-100 rounded-xl flex flex-col
items-center justify-center gap-3` fallback card (§3.2's family) with
`AlertTriangle` icon (`text-gray-400`), text `"The tour is unavailable"`,
`role="alert"`, and a `[Try again]` button styled as the small secondary button
already used in this file's modals (`px-4 py-2 rounded-lg border border-gray-200
hover:bg-gray-50 transition-colors text-sm focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-primary`).

### 3.8 Video type (`tour_type === 'video'`)

```
<div className="relative h-[480px] md:h-[480px] rounded-xl overflow-hidden bg-gray-900">
  <video
    src={tourData.videoUrl}
    controls
    playsInline
    preload="none"
    className="w-full h-full object-contain"
  />
</div>
```
Use the browser's native `controls` (includes its own fullscreen button) — do
**not** duplicate a custom fullscreen pill here; native `<video controls>`
already exposes one, and reimplementing it adds risk for zero benefit at MVP
scope. `preload="none"` keeps this consistent with the "never load heavy assets
before interaction" requirement — the tap-to-load placeholder (§3.2) still gates
the initial mount either way.

### 3.9 WebGL-unavailable fallback (panorama type only)

Feature-detect once (e.g. try creating a `WebGLRenderingContext` on a throwaway
canvas — put this check in a small `lib/tour360/` helper, not inline, so it's
unit-testable per the acceptance criteria). When WebGL is unavailable, skip
mounting the panorama library entirely and render a static wide image instead,
same container:

```
<div className="relative h-[480px] md:h-[480px] rounded-xl overflow-hidden bg-gray-900">
  <Image src={tourData.panoramaUrls[0]} alt={`${title} — 360° panorama (static preview)`}
    fill className="object-cover" />
  <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
    Your browser doesn't support 360° view
  </div>
</div>
```
(Badge token reused verbatim from the doc's token table.) No controls overlay
in this state — it's a flat image, not an interactive viewer.

### 3.10 Malformed `tour_data` (zod validation fails)

Same fallback card family as §3.7's broken-embed state (`bg-gray-100
rounded-xl flex flex-col items-center justify-center gap-3`, `AlertTriangle`,
`role="alert"`), text `"This tour couldn't be loaded"`. No retry button here
(retrying won't fix bad data) — this state should be rare/theoretical (it
means the DB row itself is malformed), so keep it minimal. Log nothing to the
console (per `CLAUDE.md` — no `console.log`); if you want server-side
visibility, that's a server-side concern outside this component.

### 3.11 Fullscreen

`requestFullscreen()` / `document.exitFullscreen()` on the viewer's outer
container (the same element for all three tour types, so the control position
and icon logic is shared). Listen for the native `fullscreenchange` event to
keep the `Maximize`/`Minimize` icon in sync (covers ESC-to-exit, which requires
no extra handling — the browser does it natively, just listen for the event).
While fullscreen, the container should fill the viewport — no new classes
needed beyond what `requestFullscreen()` does natively; don't fight the
browser's own fullscreen layout with `fixed`/`z-50` overrides.

---

## 4. Micro-interactions & animation summary

| Element | Interaction | Implementation |
|---|---|---|
| Tab button (🌐 360°) | Hover / focus | Already covered by existing `transition-colors` + `focus-visible:ring-2 ring-primary` on the shared tab button — no new work. |
| Tap-to-load card | Hover / focus / tap | `hover:bg-gray-200 transition-colors`, `focus-visible:ring-2 ring-primary ring-inset`. |
| Loading → ready swap | Entrance | `transition-opacity duration-300`, `opacity-0 → opacity-100` once the panorama library reports ready (or the iframe/video is mounted). |
| Auto-rotate | Continuous (until first interaction) | Handled inside the panorama library's own render loop, not CSS. Gate on `prefers-reduced-motion` per §3.4. |
| Control pills (zoom/rotate/fullscreen) | Hover / tap | `hover:bg-black/70 transition-colors`, `focus-visible:ring-2 ring-white` — matches every other on-photo pill button in `PropertyGallery.tsx`/`Lightbox.tsx`. |
| Auto-rotate toggle "on" state | Active indicator | Icon tint `text-primary` (via a conditional class, no new token) instead of a second icon — keep the icon set minimal. |
| Gyro banner | Entrance / dismiss | Simple conditional render (mount/unmount), no animation required — it's a one-shot prompt, not worth a transition. |
| Broken/malformed fallback card | Entrance | Conditional render is enough; do not animate error states in (per this codebase's convention — none of the existing error/fallback cards in `PropertyGallery.tsx`/`PropertyMap.tsx` animate in). |
| Fullscreen enter/exit | Icon swap | Instant icon swap on `fullscreenchange`, no transition — matches the instant `fav ? <Heart filled/> : <Heart/>` swap pattern already in this file. |

No stagger/list animations apply to this feature (there is no list — MVP is a
single scene). No new dependency (`framer-motion` or similar) is needed or
should be added; everything above is achievable with Tailwind `transition-*`
utilities plus component state, matching how every other interactive element in
`components/property/*.tsx` is already built.

---

## 5. Design tokens used (all pre-existing — nothing new to add to `@theme`)

| Element | Class |
|---|---|
| Viewer container | `relative h-[480px] rounded-xl overflow-hidden bg-gray-900` (mobile: `h-[280px]`) |
| Fallback / placeholder container | `bg-gray-100 rounded-xl flex flex-col items-center justify-center gap-3` |
| Control pill (desktop) | `w-10 h-10 rounded-full bg-black/50 backdrop-blur text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white` |
| Control pill (mobile) | `w-8 h-8 rounded-full bg-black/50 backdrop-blur text-white` |
| Gyro prompt banner | `absolute inset-x-0 bottom-0 bg-black/70 text-white text-sm text-center py-2 px-4` |
| Cover/overlay badge (optional, §7) | `bg-black/60 text-white text-xs px-2 py-1 rounded-md` |
| Active tab | `border-primary text-primary bg-primary/5` (already in use) |
| Secondary button (Try again) | `px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm` (already in use, `PropertyGallery.tsx` modals) |
| Focus ring (all interactive elements) | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` (on light backgrounds) or `focus-visible:ring-white` (on dark/photo backgrounds) |
| Primary brand color | `--color-primary` (`#2563eb`, Tailwind `primary`) — no new color needed |

---

## 6. Responsive (see D4 for why this collapses the doc's 3-tier table to 2)

- **`md:` and up (≥768px).** Viewer `h-[480px]`; zoom buttons visible; auto-rotate
  + fullscreen pills visible; no gyro banner (desktop has no orientation
  sensor).
- **`<768px`.** Viewer `h-[280px]`, full-bleed within the existing mobile
  carousel wrapper; zoom buttons hidden (`hidden md:flex`), pinch-to-zoom
  relied on instead (native to the panorama library); auto-rotate + fullscreen
  pills at `w-8 h-8`; gyro banner shown once if `DeviceOrientationEvent`
  exists.

---

## 7. Optional / nice-to-have (not required by acceptance criteria)

Cover badge on the gallery's main photo when a tour exists, doc §3.1:
`absolute top-4 left-4` (desktop) / `top-3 left-3` (mobile) — opposite corner
from the existing Save/Share/Report cluster, so it doesn't collide —
`bg-black/60 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1`
with a `Globe` icon (`w-3 h-3`) + text `"360°"`. Only render this on the
`'photo'` tab (it's a cover-image affordance, not shown once the user is
already inside the 360° tab). Build this only if it doesn't cost extra time —
it is explicitly not graded by the acceptance criteria.

---

## 8. Accessibility (summary — see the page spec §7 for the full list)

- Viewer container: `role="application"` + `aria-label={`360-degree tour — ${title}`}`.
- All icon-only pills: `aria-label` (see §3.5 table), `aria-pressed` on the
  auto-rotate toggle.
- Fallback/error cards: `role="alert"`; loading/gyro banners: `role="status"`.
- Tap-to-load card: `role="button" tabIndex={0}`, Enter/Space activates.
- Keyboard: arrow keys pan the panorama (yaw/pitch) once the library has focus
  — most panorama libraries (e.g. `photo-sphere-viewer`) provide this out of
  the box; verify whichever library is chosen exposes it rather than building
  custom key handling.
- Static WebGL-fallback `<Image>`: real `alt` text (§3.9), not `alt=""`.

---

## 9. What to flag in the PR description

Per the task brief: explicitly note that multi-room hotspot navigation is
**not implemented** — MVP ships a single scene per tour type (one panorama /
one embed / one video), because no multi-room authoring format exists yet in
this codebase (see D3). This is a known, intentional limitation, not a bug.
