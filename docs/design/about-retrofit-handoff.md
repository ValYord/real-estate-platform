# `/about` — Design-System Retrofit: Design → Dev Handoff

**Role.** Design spec for the SP4 retrofit task *"Retrofit /about onto the design system
(restyle only)"*. This is **not** a new build — About already shipped (see
[`docs/design/static-pages.md`](./static-pages.md) §5.1 for the original product/content spec,
still authoritative for copy and information architecture). This document is scoped purely to
*how* the existing markup should be re-expressed with `DESIGN_SYSTEM.md` tokens and
`components/ui`/`components/motion` primitives. Do not change data-fetching, routing,
auth/session gating, i18n keys, or copy.

**Audited against:** `app/[locale]/about/page.tsx` (16 raw-color hits — the heaviest page in the
SP4 queue, run first), `components/property/Breadcrumbs.tsx` (rendered inside `/about`'s subtree,
7 raw-color hits, **shared** with `/contact`, `/faq`, `/agent/[slug]`, `/property/[id]/[slug]`,
`components/static/LegalPage.tsx`), `components/static/JsonLd.tsx` (no visual output — a
`<script>` tag, out of scope), `DESIGN_SYSTEM.md`, `app/globals.css` `@theme` block, and the live
`/styleguide` route. Confirmed via `git grep`: **no page in the current tree consumes
`components/ui/Button`, `Card`, or `Badge` yet** — only `/styleguide` does. So this task is also
the first real consumer of `Button`/`Card`/`Badge`/`FadeIn`/`SlideIn`/`Stagger` in product code;
treat the small `Button.tsx`/`Stagger.tsx` additions in §3 as establishing precedent, not scope
creep.

---

## 0. Scope guardrails

- **Restyle only.** `t()`/`t.raw()` calls, the `values`/`stats`/`storyParagraphs` shape, the
  breadcrumb trail, the three CTA hrefs (`/sell/new`, `/search`, `/contact`), `generateMetadata`,
  and the `JsonLd` blocks are all unchanged. Only `className` strings (and, where noted, the
  wrapping element/component) change.
- **Shared-component note (read before touching `Breadcrumbs.tsx`):** `/about` is task #1 of the
  18-page SP4 queue and the first to touch `Breadcrumbs`. §2 below is this task's design for that
  component. Once merged, later retrofit tasks (`/contact`, `/faq`, `/agent/[slug]`,
  `/property/[id]/[slug]`, `/help`, `/terms`, `/cookies`) inherit it as already-on-system — they
  should verify, not re-litigate.
- **No new copy.** Every visual upgrade below (Cards for values/stats, Button-styled CTAs) reuses
  the exact same translated strings already in `messages/{hy,ru,en}.json`. If a section below
  reads like it's proposing new content, it isn't — re-check the mapping.

---

## 1. Token mapping (page.tsx)

| Current class | Replacement | Rationale |
|---|---|---|
| `text-gray-900` (H1, all H2s, value titles) | `text-text` | Primary heading/body text token. |
| `text-gray-600` (hero tagline, value body) | `text-muted` | Secondary/help text token. |
| `text-gray-700` (story paragraphs, secondary CTA label) | `text-text` | Primary prose copy — story paragraphs are the page's primary content, not secondary chrome, so they take the same token as the headings around them rather than `text-muted`. |
| `text-gray-500` (stat captions) | `text-muted` | Secondary/caption text token. |
| `border-gray-200` (all four section top-border dividers) | `border-border` | Default border token. |
| `border-gray-300` (secondary/tertiary CTA border) | *(removed — see §3, becomes `Button variant="secondary"`, which already carries `border-border`)* | Composed from the primitive instead of hand-rolled. |
| `hover:bg-gray-50` (secondary/tertiary CTA hover) | *(removed — see §3)* | `Button variant="secondary"` already defines `hover:bg-neutral-100`. |

No hard-coded hex or inline `style` exists in `page.tsx` today — nothing to convert there beyond
the class-name swaps above.

---

## 2. `components/property/Breadcrumbs.tsx` (shared — restyle now)

| Current class | Replacement | Rationale |
|---|---|---|
| Mobile back link `text-gray-600` | `text-muted` | Secondary nav text. |
| Mobile back "static" span `text-gray-600` | `text-muted` | Same. |
| Desktop trail `<ol>` `text-gray-500` | `text-muted` | Secondary nav text (matches token's "secondary/help text" purpose exactly). |
| Current-page `<span>` `text-gray-700` | `text-text` | The active/current crumb should read as primary text, one step up from the trail's muted default — `text-text` gives that contrast without introducing a class outside the two-token system. |
| Separator `ChevronRight` `text-gray-300` | `text-neutral-300` | Decorative low-contrast glyph. `text-muted` (`neutral-500`) is too dark for a separator glyph that should almost disappear; `DESIGN_SYSTEM.md` explicitly allows the raw `neutral-*` scale for exactly this kind of backing-scale need where no semantic token fits. This is the only raw-`neutral-*` use in the whole retrofit — everywhere else, a semantic token exists and must be used. |

No structural change: keep the mobile "‹ Back" / desktop full-trail split, the `itemScope`
microdata, and the `hover:text-primary`/focus-ring classes exactly as-is (they're already
token-correct — `text-primary` and `focus-visible:ring-primary` are semantic tokens, not raw
colors).

---

## 3. Two additive prerequisites (small, safe changes to shared primitives)

### 3.1 `components/ui/Button.tsx` — export the variant classes

`Button` only renders a native `<button>`. The About page's three CTAs are navigation links
(`Link href=...`), not form actions, so they can't use `<Button>` directly without breaking
semantics (a `<button>` with no `type="submit"`/`onClick` navigating nowhere is wrong; a `<Link>`
wrapped *inside* a `<button>` is invalid HTML). The correct, minimal-diff fix — and the one that
keeps this from becoming an ad-hoc reimplementation — is to export the existing `button` cva
instance so a `Link` can adopt the exact same variant classes:

```tsx
// components/ui/Button.tsx — add next to the existing `button` cva definition
export { button as buttonVariants }
```

This changes nothing about `Button`'s own rendering or props — it's a pure additional export,
safe for a page-scoped retrofit to introduce, and it's the standard cva/shadcn convention this
codebase already leans on (`VariantProps<typeof button>` is already exported as part of
`ButtonProps`). Future pages with link-styled CTAs (there are several in the SP4 queue) reuse this
export instead of re-deriving it.

### 3.2 `components/motion/Stagger.tsx` — accept a `className`

`Stagger` staggers its **direct children** — each direct child gets wrapped in its own
`motion.div` and animated in sequence (`components/motion/Stagger.tsx`: `Children.map(children,
child => <motion.div variants={item}>{child}</motion.div>)`). Its own outer wrapper is a bare
`motion.div` with no `className` prop today, which is fine for the `/styleguide` demo (cards just
stack vertically), but §4.4/§4.5 below need the outer wrapper to *also* carry the grid classes
(`grid grid-cols-1 md:grid-cols-3 gap-6`) so the staggered cards lay out in a grid instead of a
column. Add a `className` prop and merge it onto the outer `motion.div` with `cn`:

```tsx
// components/motion/Stagger.tsx
import { cn } from '@/lib/utils'

export interface StaggerProps {
  children: ReactNode
  gap?: number
  className?: string
}

export default function Stagger({ children, gap = 0.08, className }: StaggerProps) {
  const reduce = useReducedMotion()

  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-64px' }}
      variants={container(gap)}
    >
      {/* ...unchanged... */}
    </motion.div>
  )
}
```

**Important nesting rule this unlocks:** the `Card`s must be **direct children of `Stagger`**,
with the grid classes on `Stagger` itself via `className` — not `<Stagger><div className="grid
...">{cards}</div></Stagger>`. That wrong nesting would give `Stagger` exactly one child (the grid
div), which staggers as a single unit instead of staggering each card. §4.4/§4.5 show the correct
shape.

---

## 4. Section-by-section spec

### 4.1 Page shell

Keep `<main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">` as the outer wrapper — it's already
token-free. For the "modern-premium… spacious" brief, widen the vertical rhythm slightly:

```
py-8 sm:py-12
```

(from `py-6 sm:py-8`). This is a page-local spacing tweak, not a layout rebuild — the `max-w-5xl`
container, breadcrumb position, and section order are unchanged.

### 4.2 Hero

```tsx
<FadeIn>
  <header className="mt-6 max-w-[760px]">
    <h1 className="text-2xl lg:text-3xl font-bold text-text">{t('heroTitle')}</h1>
    <p className="mt-3 text-lg text-muted">{t('heroTagline')}</p>
  </header>
</FadeIn>
```

- **Motion:** `FadeIn` (no `delay` — it's the first thing on the page, and `FadeIn` fires on
  mount for above-the-fold content the same way it fires `whileInView` for scrolled-to content,
  since the viewport intersection is already true at load). This replaces having *no* entrance
  motion today — the hero currently has zero animation, so this is a pure addition, not a
  migration off a bespoke effect.
- Tokens only: `text-text` / `text-muted` as mapped in §1. Spacing bump `mt-4` → `mt-6` to match
  the shell's wider rhythm.

### 4.3 Our story

```tsx
<SlideIn>
  <section className="mt-12 max-w-[760px] border-t border-border pt-8 space-y-4">
    <h2 className="text-xl font-semibold text-text">{t('storyHeading')}</h2>
    {storyParagraphs.map((paragraph, index) => (
      <p key={index} className="text-text leading-relaxed">
        {paragraph}
      </p>
    ))}
  </section>
</SlideIn>
```

- **Motion:** `SlideIn` (default `direction="up"`) — this section is the first one the user
  scrolls to, so a scroll-triggered entrance reads as intentional rather than hero-adjacent noise.
- Tokens: `border-border`, `text-text` (heading), `text-text` (paragraphs, per §1's rationale).
  Section top padding bumped `pt-6` → `pt-8` and top margin `mt-10` → `mt-12` for the wider
  rhythm — consistent across all four `mt-10`/`pt-6` sections below.

### 4.4 Mission & values

This is the clearest "ad-hoc → primitive" upgrade: four plain `flex` rows become four `Card`s in
a `Stagger`, which both satisfies "compose from `components/ui`" and reads as more premium than
bare icon+text rows.

```tsx
<section className="mt-12 border-t border-border pt-8">
  <h2 className="text-xl font-semibold text-text">{t('missionHeading')}</h2>
  <Stagger className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
    {values.map((value, index) => {
      const Icon = VALUE_ICONS[index % VALUE_ICONS.length]
      return (
        <Card key={value.title}>
          <CardBody className="flex gap-3 items-start">
            <Icon className="w-10 h-10 text-primary flex-shrink-0" aria-hidden="true" />
            <div>
              <h3 className="font-semibold text-text">{value.title}</h3>
              <p className="text-sm text-muted mt-1">{value.body}</p>
            </div>
          </CardBody>
        </Card>
      )
    })}
  </Stagger>
</section>
```

- **Component:** `Card` (default variant — these are static, non-clickable, so **not**
  `variant="interactive"`) wrapping `CardBody`. Do not add `CardHeader`/`CardFooter` — a single
  `CardBody` matches the original single-block content and avoids inventing structure the copy
  doesn't have.
- **Motion:** `Stagger` (default `gap=0.08`), using the `className` addition from §3.2 to carry
  the grid layout directly on `Stagger`'s own wrapper. The four `Card`s are `Stagger`'s **direct
  children** (not nested one level down inside a plain grid `div`) so each one gets its own
  staggered entrance — see §3.2's nesting rule.
- Tokens: `border-border`, `text-text` (heading + value titles), `text-muted` (value body). Icon
  stays `text-primary` (already correct — semantic token, unchanged).

### 4.5 Statistics

Same treatment as §4.4 — three plain text blocks become three `Card` stat-tiles:

```tsx
<section className="mt-12 border-t border-border pt-8">
  <h2 className="text-xl font-semibold text-text">{t('statsHeading')}</h2>
  <Stagger className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
    {stats.map((stat) => (
      <Card key={stat.label}>
        <CardBody className="text-center sm:text-left">
          <p className="text-3xl font-bold text-primary">{stat.value}</p>
          <p className="text-sm text-muted mt-1">{stat.label}</p>
        </CardBody>
      </Card>
    ))}
  </Stagger>
</section>
```

- **Component:** `Card` + `CardBody`, same non-interactive default variant as §4.4 — these three
  tiles now visually rhyme with the four value cards above them instead of floating as bare text,
  which is the biggest single contributor to the "spacious, premium" feel the brief asks for.
- **Motion:** `Stagger` with the `className` grid layout, same direct-children nesting rule as
  §4.4.
- Tokens: `border-border`, `text-text` (heading), `text-primary` (stat value — already correct,
  unchanged), `text-muted` (stat label, replacing `text-gray-500`).

### 4.6 CTA row

```tsx
<Reveal>
  <section className="mt-12 border-t border-border pt-8 pb-4">
    <h2 className="text-xl font-semibold text-text">{t('ctaHeading')}</h2>
    <div className="mt-4 flex flex-wrap gap-3">
      <Link href="/sell/new" className={buttonVariants({ size: 'lg' })}>
        {t('ctaListLabel')}
      </Link>
      <Link
        href="/search"
        className={buttonVariants({ variant: 'secondary', size: 'lg' })}
      >
        {t('ctaSearchLabel')}
      </Link>
      <Link
        href="/contact"
        className={buttonVariants({ variant: 'secondary', size: 'lg' })}
      >
        {t('ctaContactLabel')}
      </Link>
    </div>
  </section>
</Reveal>
```

- **Component:** `buttonVariants` from §3 — `variant: 'primary'` (default, omit the prop) for
  "List a property" since it's the page's one primary action, `variant: 'secondary'` for
  "Search properties" / "Contact us" (previously both hand-rolled identically as
  bordered-gray secondary buttons — that 2-vs-1 hierarchy is preserved exactly, just via the
  primitive's `primary`/`secondary` variants instead of duplicated inline classes). `size="lg"`
  matches the original `h-12 px-6` dimensions (`Button`'s `lg` size is `h-12 px-6 text-base`).
  Drop the manual `focus-visible:ring-*`/`transition-colors` classes entirely — `buttonVariants`
  already bakes those in identically.
- **Motion:** `Reveal` — this is the page's terminal section, and tying its opacity/position
  directly to scroll progress (rather than a one-shot `whileInView` trigger) gives the CTA row a
  slightly different, "settling into place as you arrive" feel that marks it as the page's closing
  beat rather than just another repeated section entrance. This is the one section using `Reveal`
  instead of `FadeIn`/`SlideIn`/`Stagger` — intentional variety per the brief's "subtle motion,"
  not inconsistency.
- No remaining `border-gray-300`/`text-gray-700`/`hover:bg-gray-50` — all absorbed into
  `buttonVariants({ variant: 'secondary' })`.

---

## 5. Full import list (developer checklist)

```tsx
import Card, { CardBody } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import FadeIn from '@/components/motion/FadeIn'
import SlideIn from '@/components/motion/SlideIn'
import Stagger from '@/components/motion/Stagger'
import Reveal from '@/components/motion/Reveal'
```

(`Breadcrumbs`, `JsonLd`, `buildStaticMetadata`, `breadcrumbListJsonLd`, `organizationJsonLd`,
`safeLocale`, `Link`, the icon imports, and `VALUE_ICONS` are all unchanged from the current
file.)

---

## 6. What does *not* change

- No new `components/ui` or `components/motion` file is created — this task only adds the one
  export line to `Button.tsx` and the one `className` prop to `Stagger.tsx` (§3).
- No `Dialog`, `Tooltip`, `Field`, `Input`, `Select`, `Skeleton`, `Tabs`, `Accordion`, or `Switch`
  usage — About has no forms, tabs, accordions, or async loading state, so none of those
  primitives apply here. Do not force one in.
- No page-local `framer-motion` import — every animated block above goes through
  `components/motion`, per the reviewer checklist.
- `values.map`/`stats.map`/`storyParagraphs.map` keep their existing `key` props (`value.title`,
  `stat.label`, `index`) — unchanged.

---

## 7. Testing notes

`__tests__/staticSeo.test.ts` covers `buildStaticMetadata`/`breadcrumbListJsonLd`/
`organizationJsonLd` — pure functions, no markup assertions, so this retrofit does not touch it.
If any test elsewhere asserts on `/about`'s rendered class names (e.g. a snapshot or a
`getByText`/class-lookup test), update the expected strings to the new token classes
(`text-text`, `text-muted`, `border-border`) rather than deleting the assertion — behavior under
test (which text renders, which links exist, breadcrumb trail content) is unchanged, only the
class strings are. No new test files are required by this task; if a component's structure
changed enough to warrant a new rendering assertion (e.g. confirming the CTA links now carry
`buttonVariants` classes), add it alongside the existing static-page test conventions rather than
introducing a new testing library/setup.

---

## 8. Acceptance mapping

| Acceptance criterion | Where it's satisfied |
|---|---|
| No `gray/slate/zinc/stone-*`, no hard-coded hex, in the `/about` subtree | §1 (page.tsx) + §2 (`Breadcrumbs`, the only other component in the subtree) |
| Composed from `components/ui`; no ad-hoc reimplementation | `Card`/`CardBody` (§4.4–4.5), `buttonVariants` (§3, §4.6) replace bespoke divs/hand-rolled buttons |
| Entrance/scroll animation only via `components/motion`; reduced-motion works | `FadeIn`/`SlideIn`/`Stagger`/`Reveal` (§4.2–4.6) — all four already call `useReducedMotion()` internally, nothing further needed |
| Behavior unchanged | §0 — no copy, route, query, auth, or API changes anywhere in this spec |
| Existing tests updated, not deleted | §7 |
| SP3 visual-QA gate (2 PNGs, consistent with `/styleguide`) | Cards/Buttons/motion now literally the same primitives `/styleguide` renders, so visual consistency is structural, not incidental |
| Lint/test/build + reviewer checklist clean | No raw hex/px, primitives used, motion via `components/motion` (this doc's entire point) |

---

*End of `/about` retrofit handoff.*
