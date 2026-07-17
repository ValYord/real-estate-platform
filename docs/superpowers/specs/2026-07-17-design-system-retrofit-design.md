# Design-System Retrofit (SP4) — Design

**Date:** 2026-07-17
**Status:** Approved (brainstorm), pending implementation plan
**Sub-project:** 4 of 4 in "make the Designer agent professional" (see
`2026-07-13-design-system-design.md` Non-goals)

## Goal

Bring the ~18 already-shipped pages that still use hand-rolled Tailwind onto the shared design
system (tokens + `components/ui` + `components/motion`) so the whole site reads as one
consistent, modern-premium product. This is the last of the four sub-projects; SP1 built the
system, SP2 taught the Designer agent to use it, SP3 added the visual-QA gate — SP4 **dogfoods
all three** by having the upgraded autonomous agency retrofit the existing pages.

## Approach (decided during brainstorm)

- **Executor: the autonomous agency**, not a manual pass. This is deliberate — it is the first
  real end-to-end test of the SP1-3 upgrade on production pages.
- **Granularity: one task per page** (~18 tasks). Matches how the agency already works (tasks
  2-31 are ~one page each) and gives SP3's per-task screenshot gate the sharpest signal.
- **Seeding: direct DB insert**, bypassing the planner. Per the session handoff the scheduled
  planner "planned 0" and is still flaky, so SP4 tasks are inserted straight into
  `~/agency-state/agency.db` as `new` rather than relying on the planner to generate them.
- **Ordering: retrofit runs after the current queue.** Task selection is `ORDER BY id`
  (`repository.py` `list_actionable`), so tasks seeded now (ids ≥ 35) are picked up only after
  the in-flight new-page builds (task 32 `in_qa`, 33/34 `new`). We let those two finish rather
  than interrupt them — only two remain and interrupting mid-flight risks the working-tree
  collisions noted in the agency fix-backlog. Within SP4, pages are seeded **heaviest-first** so
  the biggest visual wins land early.

## Scope — the 18 pages

Pages whose `page.tsx` (and feature-component subtree) still use the non-token `gray/slate/zinc/
stone` scales. Pages already on-system are **excluded**: the home/root page, and any page using
only the token-backed `neutral-*` scale. Ordered heaviest-first by raw-color-class count in the
page file (a proxy; the real work also spans the components each page composes):

| # | Route | page.tsx raw-color hits |
|---|-------|------|
| 1 | `/about` | 16 |
| 2 | `/help` | 10 |
| 3 | `/cookies` | 10 |
| 4 | `/saved-searches` | 9 |
| 5 | `/mortgage/rates` | 9 |
| 6 | `/favorites` | 9 |
| 7 | `/mortgage-calculators` | 7 |
| 8 | `/pro` | 5 |
| 9 | `/dashboard` | 4 |
| 10 | `/agent/[slug]` | 4 |
| 11 | `/home-value` | 3 |
| 12 | `/contact` | 3 |
| 13 | `/home-value/[estimateHash]` | 2 |
| 14 | `/dashboard/listings` | 2 |
| 15 | `/admin/moderation` | 2 |
| 16 | `/terms` | 1 |
| 17 | `/faq` | 1 |
| 18 | `/admin` | 1 |

**Shared-component note:** the static/legal pages (`/about`, `/help`, `/cookies`, `/contact`,
`/terms`, `/faq`) were built together (task 16, "Page 23 — Static pages") and likely share
layout/prose components. Whichever static-page task runs first will restyle those shared
components; later static-page tasks should mostly verify and touch only page-local markup. Each
task description names this so agents don't re-litigate shared components or fight over them.

## Retrofit task template

Modeled on the proven restyle commit `08fe2ac` ("Page 18 — restyle Pro Dashboard onto the shared
design system"). Every SP4 task carries three fields:

**`title`** — `Retrofit <route> onto the design system (restyle only)`

**`description`** — restyle `<route>` and the components it composes onto the shared design
system. This is a **restyle, not a rebuild**: do NOT change data-fetching, routing, auth/session
gating, API contracts, or user-visible behavior. Specifically:
- Replace `gray/slate/zinc/stone-*` utilities with semantic tokens (`text-text`, `text-muted`,
  `bg-surface`, `bg-bg`, `border-border`, `text-success`/`text-warning`/`text-danger`).
- Replace any hard-coded hex (incl. inside chart libs / inline styles) with `var(--color-*)`.
- Replace ad-hoc `bg-white` + `border` card divs with the `Card` primitive; hand-rolled
  buttons/inputs/tabs/badges/dialogs/tooltips with the matching `components/ui` primitive.
- Replace bespoke/inline animation with `components/motion` primitives (`FadeIn`, `SlideIn`,
  `Stagger`, `Reveal`) so `prefers-reduced-motion` is honored; delete the bespoke animation code.
- Reference `DESIGN_SYSTEM.md` and the `/styleguide` route for the correct token/primitive.
- Keep trivial hover/tap in Tailwind (per the design-system spec) — only orchestrated/entrance
  motion goes through `components/motion`.

**`acceptance_criteria`**
- No `gray/slate/zinc/stone-*` classes and no hard-coded hex remain in the page's subtree.
- UI is composed from `components/ui` primitives; no ad-hoc reimplementation of an existing one.
- Entrance/scroll animation goes only through `components/motion`; reduced-motion still works.
- **Behavior is unchanged**: same routes, queries, auth/tier gating, and API contracts as before
  the change (reviewer confirms the diff is styling + tests only).
- Existing tests are **updated** to the new token class names, not deleted; behavior under test
  is unchanged. New rendering assertions added where a component's structure changed.
- SP3 visual-QA gate passes: desktop + mobile screenshots render (2 PNGs, not `[]`) and look
  consistent with `/styleguide`.
- `npm run lint`, `npm test`, `npm run build` all green; root `CLAUDE.md` reviewer checklist
  clean (no hard-coded hex/px, primitives used, motion via `components/motion`).

## Seeding mechanism

A one-shot, idempotent seed inserts the 18 tasks into `~/agency-state/agency.db` `tasks`
(`status='new'`, `parent_id=NULL`, `assigned_role=NULL`), heaviest-first so ids ascend in run
order. The seed is re-runnable without creating duplicates (guard on an SP4 marker in the title,
e.g. the `Retrofit <route>` prefix). Rows use the template above with `<route>` substituted.

## Verification (de-risk before bulk-seeding)

1. Seed **only task 1** (`/about`, heaviest) first.
2. Run one manual sandboxed cycle: `~/agency/docker/run-sandbox.sh cycle` (scheduler stays
   unloaded so nothing else races the tree).
3. Confirm it flows Designer → Developer → QA (SP3 visual gate produces 2 PNGs) → code-review →
   PR → gated merge, and that the merged `/about` renders correctly (spot-check via the preview).
4. Only then seed the remaining 17. If step 3 exposes a prompt/gate gap, fix it (SP2/SP3 code on
   agency `master`, rebuild the image) before bulk-seeding — that fix is itself a valuable SP1-3
   outcome.

## Non-goals

- No new pages, features, or content — styling + test-updates only.
- No agency-code changes unless step-3 verification reveals a gap (then fix, don't work around).
- No redesign of the tokens/primitives themselves (that was SP1); SP4 only *adopts* them.
- Home/root and already-on-system pages are out of scope.

## Delivery

Each task ships as its own agency PR, merged during a cycle-idle window by the normal gated
pipeline. SP4 is "done" when all 18 are merged and a site-wide grep for
`(text|bg|border)-(gray|slate|zinc|stone)-[0-9]` under `app/[locale]` returns nothing in page
subtrees. Progress is tracked by task status in `~/agency-state/agency.db`.
