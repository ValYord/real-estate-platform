# Design Spec — `/help` Retrofit onto the Design System

**Route:** `/help` (`app/[locale]/help/page.tsx` + `components/help/HelpPageClient.tsx`)
**Type:** Restyle only — no data-fetching, routing, i18n key, auth, or API contract changes.
**Reference:** `DESIGN_SYSTEM.md` (tokens/primitives/motion source of truth), `/styleguide`
(live rendering of every primitive referenced below).
**Source content spec:** `docs/design/static-pages.md` §3.6/§4.10/§4.11/§5.7 (layout/copy —
unchanged by this retrofit).

This document tells the developer, section by section, exactly which token classes,
`components/ui` primitives, and `components/motion` wrappers to swap in. It does not change
copy, hrefs, category order, icon mapping, filtering logic (`lib/faq/filter.ts`), or the
server/client split between `page.tsx` and `HelpPageClient.tsx`.

---

## 0. Scope guardrails

- **Files to touch:** `app/[locale]/help/page.tsx`, `components/help/HelpPageClient.tsx`. That's
  the entire page-local subtree — there is no `components/help/*` beyond `HelpPageClient.tsx`
  today, and this spec does not ask the developer to extract new shared components.
- **Files NOT to touch (out of scope, do not "fix" even though they still use legacy classes):**
  - `components/property/Breadcrumbs.tsx` — a sitewide navigation primitive shared with
    property, dashboard, and every other route, not just the static-pages group. Retrofitting it
    is a separate, wider-blast-radius task; pulling it in here would violate "do not fold in any
    other page's retrofit." Leave its `text-gray-*`/`border-gray-*` classes as-is.
  - `components/static/JsonLd.tsx` — no visual output (renders a `<script>` tag only), nothing to
    restyle.
  - Any other static page (`/about`, `/cookies`, `/contact`, `/terms`, `/faq`) or their
    components — out of scope per the task brief, even where markup looks similar.
- Because `Breadcrumbs` stays untouched, the acceptance grep for stray `gray-`/`slate-`/`zinc-`/
  `stone-` utilities should be scoped to `app/[locale]/help/page.tsx` and
  `components/help/HelpPageClient.tsx` specifically, not a whole-tree grep that would also catch
  `Breadcrumbs.tsx`.
- No component in this subtree currently has a dedicated render/snapshot test (only
  `__tests__/faqFilter.test.ts`, which tests the pure `lib/faq/filter.ts` logic and is untouched
  by this restyle — no class-name assertions exist there to update). If the developer adds any
  new test coverage while touching this page, it should assert on tokens (`text-muted`,
  `border-border`, …), never on raw `gray-*`.

---

## 1. Page shell — `app/[locale]/help/page.tsx`

The `<main>` wrapper, `JsonLd`, and `Breadcrumbs` lines are already token-clean (`max-w-4xl
mx-auto px-4 py-6 sm:py-8` uses spacing utilities, not color) — leave them exactly as they are.

## 2. Hero header (`<header>`)

Current: `text-2xl lg:text-3xl font-bold text-gray-900` / `mt-2 text-gray-600`.

| Element | Tokens | Primitive | Motion |
|---|---|---|---|
| `<h1>` | `text-2xl lg:text-3xl font-semibold text-text` | plain heading (no primitive — H1 is not a component) | `FadeIn` (default delay) |
| `<p>` subtitle | `mt-2 text-muted` | — | inside the same `FadeIn` |

- Swap `font-bold` → `font-semibold`: matches `/styleguide`'s H1 (`text-4xl font-semibold
  tracking-tight text-text`) and DESIGN_SYSTEM's typography guidance ("`font-medium` /
  `font-semibold` for weight" — no `font-bold` anywhere in the token system).
  `text-gray-900` → `text-text`, `text-gray-600` → `text-muted`.
- Wrap the whole `<header>` in a single `FadeIn` (import from `components/motion/FadeIn`). This
  is above-the-fold content, so `whileInView` resolves essentially on mount — that's the intended
  "entrance" feel used consistently across the retrofitted pages, not a scroll-reveal trick.

```tsx
<FadeIn>
  <header className="mt-4">
    <h1 className="text-2xl lg:text-3xl font-semibold text-text">{t('title')}</h1>
    <p className="mt-2 text-muted">{t('subtitle')}</p>
  </header>
</FadeIn>
```

## 3. Search + popular articles — `components/help/HelpPageClient.tsx` (client)

### 3.1 Search input

Current: hand-rolled `<input>` with `border-gray-300`, plus a `text-gray-400` leading icon.

- Replace the raw `<input>` with the **`Input`** primitive (`components/ui/Input.tsx`) — it
  already bakes in `h-11 rounded-md border border-border bg-surface px-3 text-text
  placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary/40`. Keep the leading
  `Search` icon absolutely positioned (Input has no built-in icon slot), just retoken it:
  `text-gray-400` → `text-muted`. Pass `className="pl-9"` to `Input` so text clears the icon.
- Keep the `sr-only` `<label htmlFor="help-search">` exactly as-is — `Field` is not the right fit
  here (it always renders a *visible* label, and this input intentionally uses an icon + visible
  placeholder instead), so a bare `Input` + `sr-only` label is the correct, primitive-composed
  pattern, not an ad-hoc reimplementation.
- No motion wrapper needed on the input itself (it's inline with the header rhythm below); let it
  ride inside the `FadeIn` from §3.3 below, or give it its own `FadeIn` with a tiny stagger —
  either is acceptable. This spec recommends folding it into the same wrapper as the "Popular
  articles" heading so the two feel like one entrance beat (see §3.3).

```tsx
<div className="relative max-w-xl">
  <Search
    className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2"
    aria-hidden="true"
  />
  <label htmlFor="help-search" className="sr-only">{t('searchLabel')}</label>
  <Input
    id="help-search"
    type="search"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
    placeholder={t('searchPlaceholder')}
    className="pl-9"
  />
</div>
```

### 3.2 "Popular articles" heading

`text-xl font-semibold text-gray-900` → `text-xl font-semibold text-text` (matches the H2 token
used everywhere else on this page — see §4).

### 3.3 Empty state ("Nothing found")

Current: `text-gray-900 font-medium` / `text-sm text-gray-500`.

- `text-gray-900` → `text-text`, `text-gray-500` → `text-muted`. No primitive needed (it's two
  centered `<p>` tags) and no motion wrapper — this is a live filter result toggling in/out as the
  user types, not a page entrance; animating it via a scroll-triggered primitive would look wrong
  (it isn't scrolling into view, it's replacing content). Leave it a plain, unanimated block.

### 3.4 Popular articles list

Current: `<ul className="mt-4 divide-y divide-gray-200">` of `<Link>`s styled `text-gray-700
hover:text-primary`.

- `divide-gray-200` → `divide-border`. Link text: `text-gray-700` → `text-text` (hover stays
  `hover:text-primary`, that's a token already, and the color-transition-on-hover is exactly the
  "trivial hover feedback → plain Tailwind" case from DESIGN_SYSTEM — keep
  `transition-colors`, no motion wrapper on the hover state itself).
- **Do not** wrap the `<ul>`/`<li>` items individually in `Stagger`: `Stagger`'s own root renders
  a plain `<div>` and wraps each child in another `<div>`, which breaks the `<ul><li>` contract
  (only `<li>` may be a direct child of `<ul>`) and would silently invalidate the `divide-y`
  styling. Instead, wrap the **whole "Popular articles" `<section>`** (heading + search-adjacent
  spacing + list + empty state) in one `FadeIn`, so it enters as a single beat right after the
  header. This keeps the list semantically intact while still honoring "entrance goes through
  components/motion."

```tsx
<FadeIn delay={0.05}>
  <div className="mt-4">
    {/* search input from §3.1 */}
  </div>
  <section className="mt-8">
    <h2 className="text-xl font-semibold text-text">{t('popularHeading')}</h2>
    {filtered.length === 0 ? (
      <div className="mt-4 text-center py-8">
        <p className="text-text font-medium">{t('noResultsHeading')}</p>
        <p className="text-sm text-muted mt-1">{t('noResultsBody')}</p>
      </div>
    ) : (
      <ul className="mt-4 divide-y divide-border">
        {filtered.map((article) => (
          <li key={article.id}>
            <Link
              href={article.href}
              className="block py-3 text-text hover:text-primary transition-colors"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
</FadeIn>
```

## 4. Categories section — `app/[locale]/help/page.tsx`

Current: `border-t border-gray-200`, H2 `text-gray-900`, cards `border-gray-200
hover:border-primary hover:shadow-sm`, card title `text-gray-900`, card description
`text-gray-500`.

| Element | Tokens | Primitive | Motion |
|---|---|---|---|
| Section wrapper | `border-t border-border` | — | `FadeIn` around the `<h2>` |
| `<h2>` | `text-xl font-semibold text-text` | — | (inside the `FadeIn` above) |
| Card grid | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` (unchanged — spacing only) | — | — |
| Each category card | icon `text-primary` (unchanged token), title `text-text`, description `text-sm text-muted` | **`Card`** (`variant="interactive"`) nested inside the existing `Link` | `SlideIn` (`direction="up"`), one per card, staggered by index |

- Replace the hand-rolled `div`-via-`Link` card (`block p-5 rounded-xl border border-gray-200
  hover:border-primary hover:shadow-sm transition-all …`) with the real **`Card`** primitive
  (`components/ui/Card.tsx`, `variant="interactive"` — it already ships `hover:shadow-md
  transition-shadow cursor-pointer` on `bg-surface`/`border-border`/`shadow-sm`/`rounded-lg`).
  `Link` stays the outer, focusable, `href`-carrying element (an `<a>` wrapping a `<div>` is valid
  HTML); `Card` becomes its visual shell:

  ```tsx
  <Link
    key={category.id}
    href={category.href}
    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
  >
    <Card variant="interactive" className="h-full p-5">
      <Icon className="w-8 h-8 text-primary" aria-hidden="true" />
      <h3 className="mt-3 font-semibold text-text">{category.title}</h3>
      <p className="text-sm text-muted mt-1">{category.description}</p>
    </Card>
  </Link>
  ```

  - `rounded-lg` on the `Link` matches `Card`'s own default radius so the focus ring traces the
    card's corners exactly.
  - Dropping the page-local `hover:border-primary hover:shadow-sm` in favor of `Card`'s
    `variant="interactive"` (`hover:shadow-md`) is intentional: it's the system's one documented
    "hoverable card" treatment (see `/styleguide` → Cards → "Interactive card"), so category cards
    now look and behave like every other interactive card in the product instead of a one-off.
  - `focus-visible:ring-primary/40` (not the old bare `ring-primary`) matches the ring opacity
    `Button`/`Input` already use — keeps focus rings visually consistent across primitives.
- **Motion:** wrap each card's `Link` (not the grid wrapper) in its own `SlideIn` with
  `direction="up"` and an index-based `delay` (e.g. `delay={index * 0.05}`), the same pattern
  `/styleguide` uses for its 3-column `SlideIn` grid demo. **Do not** wrap the grid in `Stagger`:
  `Stagger`'s props don't accept a `className`, so there is no way to put the `grid grid-cols-…`
  utility on its root — nesting the grid *inside* `Stagger` collapses every card into a single
  flex/stacked child instead of a 2/3-column grid. Per-item `SlideIn` with a small delay increment
  reproduces the staggered-entrance feel while keeping the CSS grid intact:

  ```tsx
  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {categories.map((category, index) => {
      const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]
      return (
        <SlideIn key={category.id} direction="up" delay={index * 0.05}>
          <Link href={category.href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <Card variant="interactive" className="h-full p-5">
              {/* … */}
            </Card>
          </Link>
        </SlideIn>
      )
    })}
  </div>
  ```

## 5. CTA section ("Still need help?") — `app/[locale]/help/page.tsx`

Current: `border-t border-gray-200`, text `font-medium text-gray-900`, primary link `bg-primary
text-white`, secondary link `border-gray-300 text-gray-700 hover:bg-gray-50`.

| Element | Tokens | Notes |
|---|---|---|
| Section wrapper | `border-t border-border` | spacing unchanged |
| "Still need help?" text | `font-medium text-text` | — |
| **Contact us** link | `bg-primary text-primary-fg hover:bg-primary/90 shadow-sm` | mirrors `Button`'s `primary` variant classes |
| **FAQ** link | `bg-surface text-text border border-border hover:bg-neutral-100` | mirrors `Button`'s `secondary` variant classes |

- `Button` (`components/ui/Button.tsx`) only renders a `<button>` — it has no anchor/`asChild`
  mode, so it cannot be used directly for a navigating `Link`. Rather than inventing new
  colors, copy `Button`'s own `primary`/`secondary` variant classes verbatim onto the `Link`s so
  they render pixel-identical to a real `Button` (`primary-fg` not `white` for text-on-primary —
  `text-primary-fg` is the correct token, since `--color-primary-fg` is what the design system
  reserves for text-on-primary-background, not a hardcoded white):

  ```tsx
  <section className="mt-10 border-t border-border pt-6 pb-4 text-center">
    <p className="font-medium text-text">{t('stillNeedHelp')}</p>
    <div className="mt-3 flex justify-center gap-3">
      <Link
        href="/contact"
        className="h-11 px-4 rounded-md bg-primary text-primary-fg font-medium text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {t('ctaContact')}
      </Link>
      <Link
        href="/faq"
        className="h-11 px-4 rounded-md bg-surface text-text border border-border font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {t('ctaFaq')}
      </Link>
    </div>
  </section>
  ```

  (`rounded-md` replaces the old `rounded-lg` to match `Button`'s own radius exactly —
  `Button`'s cva base is `rounded-md`.)
- **Motion:** wrap the whole CTA `<section>` in one `FadeIn`. It's a single, small, centered block
  — no per-item stagger needed (there are only two links, both dismissed together, not a list).
- **Hover/tap on both links:** stays plain Tailwind (`hover:bg-primary/90`,
  `hover:bg-neutral-100`, `transition-colors`) — this is exactly the "trivial hover/tap feedback"
  case DESIGN_SYSTEM says never needs a `components/motion` wrapper.

## 6. Full composition order (top → bottom)

1. `JsonLd` (unchanged)
2. `Breadcrumbs` (unchanged, out of scope)
3. `FadeIn` → hero `<header>` (§2)
4. `HelpPageClient` (`'use client'`, unchanged boundary), internally:
   - search `Input` (§3.1, no separate wrapper — rides in the section `FadeIn`)
   - `FadeIn delay={0.05}` → "Popular articles" heading + list/empty-state (§3.3–3.4)
5. Categories `<section>`: `FadeIn` → `<h2>`, then the grid with one `SlideIn direction="up"
   delay={index * 0.05}` per card (§4)
6. CTA `<section>`: `FadeIn` (§5)

This gives a gentle top-to-bottom entrance cascade (header → search/list → category grid →
CTA) without any bespoke `framer-motion` calls in page code, and every wrapper already honors
`prefers-reduced-motion` via `useReducedMotion()` internally — no extra work needed for that.

## 7. Token substitution cheat-sheet (for the diff review)

| Before | After |
|---|---|
| `text-gray-900` | `text-text` |
| `text-gray-700` | `text-text` |
| `text-gray-600` | `text-muted` |
| `text-gray-500` | `text-muted` |
| `text-gray-400` | `text-muted` |
| `border-gray-200` | `border-border` |
| `border-gray-300` | `border-border` |
| `divide-gray-200` | `divide-border` |
| `hover:bg-gray-50` | `hover:bg-neutral-100` |
| `bg-primary text-white` (CTA link) | `bg-primary text-primary-fg` |
| `font-bold` (H1) | `font-semibold` |
| `rounded-xl` (category card) | `rounded-lg` (via `Card` primitive default) |
| `ring-primary` (focus ring) | `ring-primary/40` (matches `Button`/`Input`) |

No hex values or raw `px` sizes exist in this page today, so there's nothing to convert there —
just confirm none get introduced while doing the above.

## 8. Visual QA checklist

- [ ] Desktop (≥1024px) and mobile (<768px) renders of `/en/help` read consistently with
      `/styleguide`'s type scale, card treatment, and button styling.
- [ ] Category grid: 1 col mobile → 2 col `sm:` → 3 col `lg:`, each card's entrance staggers
      subtly on first scroll into view; no layout shift from the `SlideIn` wrapper (it should not
      change card height/width, only add a mount transform).
  - [ ] With `prefers-reduced-motion: reduce` simulated, header/list/cards/CTA all render
      immediately with no transform/opacity animation (falls back to the plain `<div>` branch in
      every `components/motion` wrapper).
- [ ] Search box: icon vertically centered, placeholder legible against `bg-surface`, focus ring
      visible and matches `Input`'s default treatment elsewhere in the app.
- [ ] Empty search state centers correctly and doesn't animate oddly when toggling in/out while
      typing.
- [ ] Both CTA links are visually indistinguishable from a real `Button` `primary`/`secondary` at
      `size="md"` (same height, radius, hover, focus ring).
