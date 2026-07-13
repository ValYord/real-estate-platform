# Design System Foundation — Design

**Date:** 2026-07-13
**Status:** Approved (brainstorm), pending implementation plan
**Sub-project:** 1 of 4 in "make the Designer agent professional" (see Non-goals)

## Goal

Give the real-estate platform a single, reusable **design system** so every page — built by
the autonomous agency or by hand — has a consistent, modern-premium look (clean, spacious,
subtle motion, quality typography; Linear/Vercel register) instead of ad-hoc per-page styling.

This is the **foundation** the user chose to build first and directly (by us, not the agency),
so the later Designer-agent upgrade builds on solid ground.

## Scope (this sub-project only)

Design tokens + theme, a set of polished UI primitives, motion primitives, a living
`/styleguide` page, documentation, and reviewer-checklist enforcement. Self-contained in the
**product repo**; touches no agency code.

## Non-goals (later sub-projects)

- **SP2** — upgrading the Designer agent's prompt/role to design *within* this system.
- **SP3** — a visual-QA gate that screenshots rendered output and loops back on quality.
- **SP4** — retrofitting the ~22 already-built pages onto the system.

This spec only lays the foundation and leaves a documented hook for SP2.

## Constraint: build in isolation (no collision)

The agency scheduler runs cycles inside the **same working tree** (`/workspace` mount), doing
`git checkout` as it builds pages. Building here directly would collide (an in-progress manual
merge was already discarded once). Therefore this work is done in an **isolated clone** on
branch `feat/design-system`, off `origin/main`, and delivered as a PR merged during a cycle-idle
window. Expect PR-time conflicts on shared files (`globals.css`, `components/ui/*`) — normal and
manageable; no live collision during the build.

## Section 1 — Design tokens + theme

Centralized tokens are the single source of truth, defined in the Tailwind theme layer
(`app/globals.css` `@theme` / `tailwind.config`) and consumed everywhere via utility classes /
CSS variables.

- **Color** — a **warm-tinted neutral** scale (50→950) for premium warmth; **primary = deep
  blue** (trust/premium, fitting real estate); **accent = warm amber/gold** (CTAs, highlights);
  and **semantic** tokens (`bg`, `surface`, `border`, `text`, `muted`, `success`, `warning`,
  `danger`). Authored light-first with dark-mode-ready variables.
- **Typography** — **Geist** (variable), a modular type scale (`xs`→`display`), tight heading
  tracking, comfortable body line-height.
- **Spacing / radii / shadows** — one spacing scale; a small radii set (`sm/md/lg/xl/full`);
  subtle layered shadows (a key premium signal).
- **Motion tokens** — durations (`fast/base/slow`) and easings (`standard/entrance/exit`) so all
  animation is consistent.

Reviewer rule (Section 3): UI uses tokens — no hard-coded hex/px.

## Section 2 — Component primitives + motion primitives

**UI primitives** (`components/ui/`) — token-based, variant-driven via a single variant helper
(`cva` / tailwind-variants), a11y-ready:

- Button (primary/secondary/ghost/destructive; sizes; loading), Card/Surface, Input/Field
  (label + hint + error), Select, Badge/Tag, Dialog/Modal, Tooltip, Skeleton, Toast (if absent).
- **Reconcile, don't duplicate** — existing `Tabs`, `Accordion`, `PasswordInput`, etc. are
  refactored onto tokens + the shared variant pattern rather than re-created.

**Motion primitives** (`components/motion/`) — Framer Motion (`motion`) wrappers, all
`prefers-reduced-motion`-aware (auto-simplify/disable):

- `FadeIn` / `SlideIn` — scroll-triggered entrance.
- `Stagger` — sequential children reveal (card grids, feature lists).
- `PageTransition` — smooth route transitions.
- `Reveal` / `Parallax` — selective "wow" for key landing sections.

Usage: pages are composed from primitives + motion wrappers; no ad-hoc CSS or raw animation.
Trivial hover/tap stays in Tailwind to keep the bundle lean; orchestrated/scroll/entrance motion
uses Framer Motion.

## Section 3 — Documentation, enforcement, testing

- **`DESIGN_SYSTEM.md`** — tokens, primitives, motion, and usage rules in one reference.
- **`/styleguide` route** (dev-only) — renders every token + primitive (all variants) + motion
  demos. Serves as a visual check now and the basis for the SP3 visual-QA gate later.
- **Enforcement** — new path-scoped rules in the root `CLAUDE.md` reviewer checklist, which the
  agency reviewer already reads:
  - Tokens only — no hard-coded hex/px in UI.
  - Compose UI from `components/ui` primitives — flag ad-hoc reimplementation.
  - Animate only via `components/motion`, preserving `prefers-reduced-motion`.
- **Testing** — unit tests: primitives render each variant + a11y attributes + disabled/loading;
  motion primitives simplify under reduced-motion. CI (lint + test + build) stays green.

## Integration hook (to SP2)

Leave a short "For the Designer agent" note in `DESIGN_SYSTEM.md` describing how a page spec
should reference tokens/primitives/motion. SP2 will wire the Designer prompt to it; this spec
does not change agency code.

## Architecture / file layout

```
app/globals.css            # @theme tokens (color, type, spacing, radii, shadow, motion)
app/styleguide/page.tsx    # living style guide (dev-only)
components/ui/*             # primitives (+ refactor existing onto tokens/variants)
components/ui/variants.ts   # shared cva/tailwind-variants config
components/motion/*         # Framer Motion primitives (reduced-motion aware)
DESIGN_SYSTEM.md           # reference + Designer-agent hook
CLAUDE.md                  # + reviewer rules
__tests__/*                # primitive + motion tests
```

## Testing strategy

- Unit (vitest): each primitive's variants render expected classes/roles; a11y attributes
  present; Button loading/disabled; motion primitives return simplified output under a mocked
  `prefers-reduced-motion: reduce`.
- Manual: `/styleguide` visually verified via the preview before the PR.
- CI: lint + test + build green (run under TZ=UTC to match CI locally).

## Delivery

Branch `feat/design-system` → PR → merge during a cycle-idle window (resolve shared-file
conflicts at PR time). Announce any deferred scope in the PR description.
