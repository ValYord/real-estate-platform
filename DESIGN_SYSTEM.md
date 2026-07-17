# Design System

## Overview

This is the single source of truth for the platform's visual language: a **modern-premium**
direction built on warm neutrals, a deep-blue primary, and an amber accent, with restrained,
purposeful motion. It exists so every page — built by hand or by an agent — looks and behaves
like part of one product instead of a patchwork of one-off styles.

All tokens live in `app/globals.css` (`@theme` block). All reusable UI lives in `components/ui/`.
All animation lives in `components/motion/`. Pages should compose these, not reinvent them.

## Tokens

Defined in the `@theme` block of `app/globals.css` and exposed as Tailwind utilities.

### Color

| Token | Tailwind utility | Purpose |
|---|---|---|
| `--color-primary` / `--color-primary-fg` | `bg-primary`, `text-primary`, `text-primary-fg` | Deep blue brand color; primary actions |
| `--color-accent` / `--color-accent-fg` | `bg-accent`, `text-accent`, `text-accent-fg` | Amber accent; highlights, "dev only" badges, etc. |
| `--color-success` | `bg-success`, `text-success` | Positive/confirmation state |
| `--color-warning` | `bg-warning`, `text-warning` | Caution state |
| `--color-danger` | `bg-danger`, `text-danger` | Destructive/error state |
| `--color-bg` | `bg-bg` | Page background (aliases `neutral-50`) |
| `--color-surface` | `bg-surface` | Card/panel/input surfaces (white) |
| `--color-border` | `border-border` | Default border color |
| `--color-text` | `text-text` | Primary body/heading text |
| `--color-muted` | `text-muted` | Secondary/help text |
| `--color-neutral-50` … `--color-neutral-950` | `bg-neutral-100`, `border-neutral-200`, etc. | Warm neutral scale backing the semantic tokens above |

Use the semantic tokens (`bg-surface`, `text-muted`, `border-border`, …) in page/feature code rather
than reaching for a raw `neutral-*` step — they carry intent and stay correct if the palette shifts.

### Typography

`--font-sans` (Geist Sans, via `var(--font-geist-sans)`) is the only font family; there's no
separate heading font. Use Tailwind's standard type scale (`text-xs` … `text-5xl` for display)
with `font-medium` / `font-semibold` for weight — see `/styleguide` for the scale rendered live.

### Radii

| Token | Tailwind utility |
|---|---|
| `--radius-sm` (0.375rem) | `rounded-sm` |
| `--radius-md` (0.5rem) | `rounded-md` |
| `--radius-lg` (0.75rem) | `rounded-lg` |
| `--radius-xl` (1rem) | `rounded-xl` |

### Shadow

| Token | Tailwind utility |
|---|---|
| `--shadow-sm` | `shadow-sm` |
| `--shadow-md` | `shadow-md` |
| `--shadow-lg` | `shadow-lg` |

### Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Micro-interactions (page-exit transitions) |
| `--duration-base` | 220ms | Default entrance/hover transitions |
| `--duration-slow` | 400ms | Larger/slower entrances |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | General-purpose easing |
| `--ease-entrance` | `cubic-bezier(0, 0, 0, 1)` | Elements entering the viewport |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving/unmounting |

These motion tokens describe the timing values used inside `components/motion/*`; when using the
motion primitives you don't need to reference them directly, they're already baked in.

## UI primitives

All in `components/ui/`, built with `class-variance-authority` (`cva`) and the shared `cn` helper
(`components/ui/variants.ts`, `clsx` + `tailwind-merge`) for class composition.

### Button — `components/ui/Button.tsx`

Props: `variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'` (default `primary`),
`size?: 'sm' | 'md' | 'lg'` (default `md`), `loading?: boolean` (disables the button and shows a
spinner), plus all native `<button>` attributes.

```tsx
import Button from '@/components/ui/Button'

<Button variant="secondary" size="sm" loading={isSaving}>
  Save changes
</Button>
```

### Card — `components/ui/Card.tsx`

`Card` props: `variant?: 'default' | 'interactive'` (interactive adds hover shadow + pointer
cursor). Slot components `CardHeader`, `CardBody`, `CardFooter` add consistent padding and
top/bottom borders; all accept native `<div>` attributes.

```tsx
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card'

<Card variant="interactive">
  <CardHeader><h3>Listing title</h3></CardHeader>
  <CardBody>Details…</CardBody>
  <CardFooter><Button size="sm">View</Button></CardFooter>
</Card>
```

### Badge — `components/ui/Badge.tsx`

Props: `variant?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'` (default
`neutral`).

```tsx
import Badge from '@/components/ui/Badge'

<Badge variant="success">Verified</Badge>
```

### Input — `components/ui/Input.tsx`

Native `<input>` attributes only, styled consistently (height, border, focus ring). No variants.

```tsx
import Input from '@/components/ui/Input'

<Input type="email" placeholder="you@example.com" />
```

### Select — `components/ui/Select.tsx`

Native `<select>` attributes; children are plain `<option>` elements. Same visual treatment as
`Input`.

```tsx
import Select from '@/components/ui/Select'

<Select defaultValue="">
  <option value="" disabled>Select a type…</option>
  <option value="apartment">Apartment</option>
</Select>
```

### Field — `components/ui/Field.tsx`

Wraps a label + optional hint/error around any input control. Props: `label: string`,
`htmlFor: string`, `hint?: string`, `error?: string`, `children: ReactNode`. When `error` is set it
takes precedence over `hint` and renders with `role="alert"`.

```tsx
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

<Field label="Email address" htmlFor="email" hint="We'll never share your email.">
  <Input id="email" type="email" />
</Field>
```

### Skeleton — `components/ui/Skeleton.tsx`

A pulsing placeholder `<div>`; no variants — size and shape come from `className` (e.g.
`h-6 w-2/3`, `size-16 rounded-full`).

```tsx
import Skeleton from '@/components/ui/Skeleton'

<Skeleton className="h-4 w-full" />
```

### Dialog — `components/ui/Dialog.tsx` (`'use client'`)

Controlled modal rendered via a portal with overlay-click-to-close and Escape-to-close. Props:
`open: boolean`, `onOpenChange: (open: boolean) => void`, `children: ReactNode`. Companion
components `DialogTitle` and `DialogBody` style the heading and content area.

```tsx
import Dialog, { DialogTitle, DialogBody } from '@/components/ui/Dialog'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTitle>Confirm delete</DialogTitle>
  <DialogBody>This action cannot be undone.</DialogBody>
</Dialog>
```

### Tooltip — `components/ui/Tooltip.tsx` (`'use client'`)

Props: `content: string`, `children: ReactNode` (must be a single valid element — it receives
cloned hover/focus handlers), `className?: string`. Shows a `role="tooltip"` bubble on
hover/focus.

```tsx
import Tooltip from '@/components/ui/Tooltip'

<Tooltip content="Saved to your favorites">
  <Button variant="secondary">Save</Button>
</Tooltip>
```

## Motion primitives

All in `components/motion/`, all `'use client'`, all built on `framer-motion`, and all call
`useReducedMotion()` (`components/motion/useReducedMotion.ts`, backed by the
`prefers-reduced-motion` media query) to render a plain, unanimated `<div>` when the user has
requested reduced motion. You never need to branch on reduced motion yourself — just use the
wrapper.

- **`FadeIn`** (`FadeIn.tsx`) — props: `delay?: number`. Fades and lifts content into view once,
  on scroll (`whileInView`).
- **`SlideIn`** (`SlideIn.tsx`) — props: `direction?: 'up' | 'down' | 'left' | 'right'` (default
  `up`), `delay?: number`. Slides + fades in from the given direction, once, on scroll.
- **`Stagger`** (`Stagger.tsx`) — props: `gap?: number` (default `0.08`, seconds between
  children), `className?: string` (layout classes for the outer container, e.g. `flex flex-wrap
  gap-3` — needed since each direct child is wrapped in its own per-item `motion.div`). Wraps each
  direct child in its own fade/lift animation, staggered by `gap`.
- **`Reveal`** (`Reveal.tsx`) — no props beyond `children`. Ties opacity/position directly to
  scroll progress as the element crosses the viewport (`useScroll` + `useTransform`), rather than
  firing once.

**When to use which:** simple hover/tap/active state feedback (button hover, focus rings, color
transitions) → plain Tailwind (`transition-colors`, `hover:*`), no wrapper needed. Anything
orchestrated, scroll-triggered, or an entrance/exit (page transitions, lists appearing in
sequence, content revealing on scroll) → reach for one of these primitives instead of hand-rolling
`framer-motion` calls.

## Living reference

`/styleguide` (`app/[locale]/styleguide/page.tsx`) renders every token and primitive above with
real markup. It is **dev-only** — it calls `notFound()` in production — so treat it as living
documentation, not a page shipped to users. When in doubt about how something looks or composes,
check it there before guessing.

## Usage rules

- **Tokens only.** No hard-coded hex colors or raw pixel values in components or pages — use the
  Tailwind utilities backed by tokens (`bg-primary`, `text-muted`, `shadow-md`, `rounded-lg`, …).
- **Compose from `components/ui`.** Don't re-implement a button, card, badge, input, select,
  field, skeleton, dialog, or tooltip inline — use the existing primitive, extending via
  `className` (merged safely through `cn`) rather than duplicating its styles.
- **Animate only via `components/motion`.** Don't call `framer-motion` directly in page/feature
  code for entrances, scroll reveals, or staggered lists — wrap with `FadeIn`,
  `SlideIn`, `Stagger`, or `Reveal` so `prefers-reduced-motion` is respected
  automatically. (Route-level page transitions are planned; they'll be wired into the layout
  during page integration.)

## For the Designer agent (SP2)

When writing a page spec, name the tokens and primitives each section should use rather than
describing raw styles: e.g. "hero → `SlideIn` (direction up) wrapping a `Card` (`variant=
interactive`) on `bg-surface`, `shadow-lg`, `rounded-xl`" or "listing grid → `Stagger` of `Card`s
with `Badge variant="accent"` for status." Reference primitives by name and props (`Button
variant="primary" size="lg"`, `FadeIn delay={0.1}`) and tokens by Tailwind utility, not by hex/px
value. This keeps specs implementable directly against `components/ui` and `components/motion`
and is what a future Designer-agent upgrade should target when generating page specs.
