# Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, modern-premium design system (tokens, UI primitives, motion primitives, living styleguide, docs + reviewer enforcement) so every page has a consistent professional look.

**Architecture:** Centralized tokens in the Tailwind `@theme` layer feed variant-driven UI primitives (`components/ui/`, one `cva`/tailwind-variants config) and `prefers-reduced-motion`-aware Framer Motion wrappers (`components/motion/`). A dev-only `/styleguide` route renders everything; `DESIGN_SYSTEM.md` + CLAUDE.md rules govern usage. Built in an isolated clone on `feat/design-system`, delivered as a PR.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind v4 (`@theme` in `app/globals.css`) + `class-variance-authority` (cva) + `framer-motion` (`motion`) + Geist variable font + vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-design-system-design.md`

**Note on granularity:** Foundational/pattern tasks (tokens, variant helper, Button, one input, motion primitives) carry full code. Repetitive sibling primitives carry an exact interface + variant table + test list — implement them by following the Button pattern; do not invent new patterns.

---

### Task 1: Dependencies + variant helper

**Files:**
- Modify: `package.json` (add deps)
- Create: `components/ui/variants.ts`
- Test: `__tests__/uiVariants.test.ts`

- [ ] **Step 1: Install deps**

```bash
npm i framer-motion class-variance-authority geist
npm i -D @testing-library/react @testing-library/jest-dom
```
Expected: added to package.json/package-lock.

- [ ] **Step 2: Write failing test for the variant helper**

`__tests__/uiVariants.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { cn } from '../components/ui/variants'

describe('cn', () => {
  it('merges class names and de-dupes conflicting tailwind utilities', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', false && 'hidden', 'font-medium')).toBe('text-sm font-medium')
  })
})
```

- [ ] **Step 3: Run it — expect FAIL** — `TZ=UTC npx vitest run __tests__/uiVariants.test.ts` → cannot find `cn`.

- [ ] **Step 4: Implement**

`components/ui/variants.ts`:
```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, resolving conflicting Tailwind utilities (last wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```
(If `clsx`/`tailwind-merge` are absent: `npm i clsx tailwind-merge`.)

- [ ] **Step 5: Run — expect PASS.**

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(ui): add cn variant helper + deps"`

---

### Task 2: Design tokens (@theme)

**Files:**
- Modify: `app/globals.css`
- Modify: `app/[locale]/layout.tsx` (wire Geist font)
- Test: `__tests__/designTokens.test.ts`

- [ ] **Step 1: Failing test asserting the token contract exists**

`__tests__/designTokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const css = readFileSync('app/globals.css', 'utf8')

describe('design tokens', () => {
  it.each([
    '--color-primary', '--color-accent', '--color-surface', '--color-border',
    '--color-muted', '--color-success', '--color-warning', '--color-danger',
    '--radius-md', '--shadow-md', '--ease-standard', '--duration-base',
  ])('defines %s', (token) => {
    expect(css).toContain(token)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement tokens** in `app/globals.css` inside the `@theme` block (Tailwind v4). Warm neutral scale, deep-blue primary, amber accent, semantic tokens, radii, layered shadows, motion tokens:

```css
@theme {
  /* warm neutrals */
  --color-neutral-50: oklch(0.985 0.003 75);
  --color-neutral-100: oklch(0.97 0.004 75);
  --color-neutral-200: oklch(0.922 0.005 75);
  --color-neutral-300: oklch(0.87 0.006 75);
  --color-neutral-400: oklch(0.708 0.007 75);
  --color-neutral-500: oklch(0.556 0.008 75);
  --color-neutral-600: oklch(0.44 0.008 75);
  --color-neutral-700: oklch(0.371 0.007 75);
  --color-neutral-800: oklch(0.269 0.006 75);
  --color-neutral-900: oklch(0.205 0.005 75);
  --color-neutral-950: oklch(0.145 0.004 75);
  /* brand */
  --color-primary: oklch(0.45 0.13 255);
  --color-primary-fg: oklch(0.985 0 0);
  --color-accent: oklch(0.78 0.14 75);
  --color-accent-fg: oklch(0.205 0.02 75);
  /* semantic surfaces */
  --color-bg: var(--color-neutral-50);
  --color-surface: oklch(1 0 0);
  --color-border: var(--color-neutral-200);
  --color-text: var(--color-neutral-900);
  --color-muted: var(--color-neutral-500);
  --color-success: oklch(0.6 0.14 150);
  --color-warning: oklch(0.75 0.15 80);
  --color-danger: oklch(0.58 0.2 25);
  /* radii */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  /* layered premium shadows */
  --shadow-sm: 0 1px 2px oklch(0 0 0 / 0.05);
  --shadow-md: 0 2px 4px oklch(0 0 0 / 0.05), 0 4px 12px oklch(0 0 0 / 0.06);
  --shadow-lg: 0 8px 24px oklch(0 0 0 / 0.08), 0 2px 6px oklch(0 0 0 / 0.05);
  /* motion */
  --duration-fast: 120ms;
  --duration-base: 220ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-entrance: cubic-bezier(0, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
}
```
Add a dark-mode override block later (`@media (prefers-color-scheme: dark)` remapping `--color-bg/surface/text/border`); light-first is enough for this task.

- [ ] **Step 4: Wire Geist** in `app/[locale]/layout.tsx`:
```tsx
import { GeistSans } from 'geist/font/sans'
// on <html> or <body>: className={GeistSans.className}
```

- [ ] **Step 5: Run test — expect PASS**, then `TZ=UTC npx next build` → exit 0.

- [ ] **Step 6: Commit** — `git commit -am "feat(ui): design tokens + Geist font"`

---

### Task 3: Button primitive (the reference pattern)

**Files:**
- Create: `components/ui/Button.tsx`
- Test: `__tests__/uiButton.test.tsx`

- [ ] **Step 1: Failing test**

`__tests__/uiButton.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from '../components/ui/Button'

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDefined()
  })
  it('applies the destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button').className).toContain('bg-danger')
  })
  it('is disabled and shows a busy state when loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
  })
})
```
(Add `import '@testing-library/jest-dom'` to `vitest.config.ts` setup or a `__tests__/setup.ts`; configure `environment: 'jsdom'` in vitest.config if not already.)

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement**

`components/ui/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './variants'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary/90 shadow-sm',
        secondary: 'bg-surface text-text border border-border hover:bg-neutral-100',
        ghost: 'text-text hover:bg-neutral-100',
        destructive: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
      },
      size: { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
export default Button
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit** — `git commit -am "feat(ui): Button primitive"`

---

### Task 4: Input / Field + Select

**Files:** Create `components/ui/Field.tsx`, `components/ui/Input.tsx`, `components/ui/Select.tsx`; Test `__tests__/uiField.test.tsx`

Follow the Button pattern (cva + `cn` + `forwardRef`). Requirements:
- `Field` wraps a control with a `<label>` (linked via `htmlFor`/`id`), optional hint (`text-muted text-sm`) and error (`text-danger text-sm`, `role="alert"`); sets `aria-invalid` + `aria-describedby` on the child when error present.
- `Input`: token-styled (`h-11 rounded-md border border-border bg-surface px-3 focus-visible:ring-2 ring-primary/40`), forwards ref + all `InputHTMLAttributes`.
- `Select`: same shell as Input for a native `<select>`.

- [ ] **Step 1: Failing tests** — `Field` renders label linked to input; error sets `role="alert"` and `aria-invalid="true"` on the control; `Input` forwards `type`/`value`.
- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** the three files per the requirements above (Button pattern).
- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): Field + Input + Select"`

---

### Task 5: Surface primitives — Card, Badge, Skeleton

**Files:** Create `components/ui/Card.tsx`, `Badge.tsx`, `Skeleton.tsx`; Test `__tests__/uiSurface.test.tsx`

- `Card`: `rounded-lg border border-border bg-surface shadow-sm`; optional `interactive` variant adds `hover:shadow-md transition-shadow`. Sub-parts `Card.Header/Body/Footer` (padding tokens).
- `Badge`: variants `neutral|primary|accent|success|warning|danger`, `rounded-full px-2.5 py-0.5 text-xs font-medium`.
- `Skeleton`: `animate-pulse rounded-md bg-neutral-200`, width/height via className.

- [ ] **Step 1: Failing tests** — Card renders children + interactive class; Badge success variant contains `bg-success`; Skeleton has `animate-pulse`.
- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS** → **Step 5: Commit** `feat(ui): Card + Badge + Skeleton`

---

### Task 6: Overlay primitives — Dialog, Tooltip, Toast

**Files:** Create `components/ui/Dialog.tsx`, `Tooltip.tsx`, `Toast.tsx` (+ `ToastProvider`); Test `__tests__/uiOverlay.test.tsx`

Use Radix primitives if already present (`@radix-ui/react-dialog`, `-tooltip`) else `npm i` them; style with tokens. Requirements:
- `Dialog`: focus-trapped, `Esc`/overlay-click close, `role="dialog"`, animated open/close via motion tokens; content `rounded-lg bg-surface shadow-lg`.
- `Tooltip`: hover/focus, `role="tooltip"`.
- `Toast`: `ToastProvider` + `useToast()` (reconcile with any existing toast in the repo — refactor, don't duplicate).

- [ ] **Step 1: Failing tests** — Dialog opens on trigger and shows `role="dialog"`; Esc closes; useToast pushes a message that renders.
- [ ] **Step 2: FAIL** → **Step 3: Implement** → **Step 4: PASS** → **Step 5: Commit** `feat(ui): Dialog + Tooltip + Toast`

---

### Task 7: Refactor existing components onto tokens/variants

**Files:** Modify `components/ui/Tabs.tsx`, `components/ui/Accordion.tsx`, `components/auth/PasswordInput.tsx` (and any other existing `components/ui/*`); Tests: existing tests must stay green.

- [ ] **Step 1:** Run existing suite green first — `TZ=UTC npx vitest run` (baseline).
- [ ] **Step 2:** Replace hard-coded colors/spacing with tokens and route class merging through `cn`; keep public props/behavior identical (no test changes).
- [ ] **Step 3:** Run full suite — expect same tests PASS (no regressions).
- [ ] **Step 4: Commit** — `git commit -am "refactor(ui): existing components onto design tokens"`

---

### Task 8: Motion primitives

**Files:** Create `components/motion/FadeIn.tsx`, `SlideIn.tsx`, `Stagger.tsx`, `PageTransition.tsx`, `Reveal.tsx`, `components/motion/useReducedMotion.ts`; Test `__tests__/motion.test.tsx`

- [ ] **Step 1: Failing test — reduced-motion disables animation**

`__tests__/motion.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import FadeIn from '../components/motion/FadeIn'

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce, media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
}

describe('FadeIn', () => {
  it('renders children with no opacity animation under reduced motion', () => {
    mockReducedMotion(true)
    render(<FadeIn><p>hello</p></FadeIn>)
    const el = screen.getByText('hello').parentElement as HTMLElement
    expect(el.style.opacity === '' || el.style.opacity === '1').toBe(true)
  })
})
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement** — `useReducedMotion.ts` (subscribe to `prefers-reduced-motion`), then wrappers. Example `FadeIn.tsx`:
```tsx
'use client'
import { motion } from 'framer-motion'
import { useReducedMotion } from './useReducedMotion'

export default function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) return <div>{children}</div>
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.22, ease: [0, 0, 0, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
```
`SlideIn` (directional x/y), `Stagger` (parent `staggerChildren` + child variants), `PageTransition` (wrap `usePathname` keyed `AnimatePresence`), `Reveal` (scroll `useScroll`/`useTransform` opacity+translate). Each returns a plain wrapper when `reduce` is true.

- [ ] **Step 4: Run — PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat(motion): reduced-motion-aware Framer Motion primitives"`

---

### Task 9: `/styleguide` living reference route

**Files:** Create `app/styleguide/page.tsx` (dev-only), maybe `components/styleguide/Section.tsx`

- [ ] **Step 1:** Create a page that renders: the color token swatches, type scale, every UI primitive with all variants, and live motion demos. Gate to dev: at top, `if (process.env.NODE_ENV === 'production') notFound()`.
- [ ] **Step 2: Verify via preview** — start dev server, load `/styleguide`, screenshot; confirm tokens/primitives/motion render.
- [ ] **Step 3: Build** — `TZ=UTC npx next build` → exit 0 (route excluded/renders in prod harmlessly).
- [ ] **Step 4: Commit** — `git commit -am "feat: /styleguide living design reference"`

---

### Task 10: Documentation + reviewer enforcement

**Files:** Create `DESIGN_SYSTEM.md`; Modify `CLAUDE.md`

- [ ] **Step 1:** Write `DESIGN_SYSTEM.md` — token reference, primitive list + props, motion primitives, usage rules, and a short "For the Designer agent (SP2)" section describing how a page spec references tokens/primitives/motion.
- [ ] **Step 2:** Add to `CLAUDE.md` reviewer checklist a "Design system" section:
  - UI uses theme tokens — no hard-coded hex/px.
  - Compose UI from `components/ui` primitives — flag ad-hoc reimplementations.
  - Animate only via `components/motion`, preserving `prefers-reduced-motion`.
- [ ] **Step 3: Commit** — `git commit -am "docs: DESIGN_SYSTEM.md + reviewer rules"`

---

### Task 11: Final verification + PR

- [ ] **Step 1:** `TZ=UTC npx vitest run` → all PASS (incl. pre-existing).
- [ ] **Step 2:** `npx eslint .` → clean; `TZ=UTC npx next build` → exit 0.
- [ ] **Step 3:** Push branch, open PR describing the design system + any deferred scope; merge during a cycle-idle window, resolving shared-file conflicts (`globals.css`, `components/ui/*`) then.
- [ ] **Step 4:** Confirm CI green on the PR before merge.

---

## Self-Review

- **Spec coverage:** tokens (T2) ✓; primitives incl. reconcile-existing (T3–T7) ✓; motion + reduced-motion (T8) ✓; `/styleguide` (T9) ✓; DESIGN_SYSTEM.md + CLAUDE.md enforcement (T10) ✓; testing + CI (each task + T11) ✓; isolation/PR delivery (T11) ✓; SP2 hook (T10) ✓.
- **Placeholders:** none (repetitive primitives carry explicit interfaces + variant tables + test lists, not "similar to").
- **Type consistency:** `cn` (T1) used throughout; `cva` variant API consistent T3→T7; `useReducedMotion` defined T8 and used by all motion wrappers.
