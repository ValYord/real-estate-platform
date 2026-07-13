# Project Rules — Real-Estate Platform

Stack: Next.js 15 (App Router) + TypeScript + Tailwind + Supabase (PostgreSQL + PostGIS).
All code and docs are written in English.

## Reviewer Checklist

Reviewers enforce these rules against the diff. Flag only path-scoped, clearly-broken rules.

### Next.js 15 (App Router)
- Components are Server Components by default; add `'use client'` only when the component
  needs browser-only APIs, state, or effects.
- Never reference server-only secrets (service-role keys, private API keys) from a client
  component or any module that a client component imports.

### Environment / secrets
- Secrets must never be placed in a `NEXT_PUBLIC_*` variable (those are shipped to the browser).
- The Supabase service-role key is used only server-side (route handlers / server actions),
  never imported into client code.

### Supabase
- New database tables must have Row Level Security (RLS) enabled.
- Database access goes through the Supabase client with parameterized queries; never build
  SQL by string concatenation of user input.

### PostGIS
- Spatial queries are parameterized and use the correct SRID (4326 for lat/lng).

### Auth
- Protected routes and server actions verify the Supabase session before doing work.

### TypeScript
- Do not use `any` to bypass typing; do not use `@ts-ignore` without an explanatory reason.

### Design system
- UI uses theme tokens (`app/globals.css` `@theme`) — no hard-coded hex colors or px spacing in
  components/pages; use the Tailwind utilities they back (`bg-primary`, `text-muted`, `shadow-md`,
  `rounded-lg`, etc). See `DESIGN_SYSTEM.md`. (Exception: discrete data-viz ramps that need distinct
  hues with no semantic-token equivalent, e.g. the password-strength meter — comment the exemption.)
- Compose UI from `components/ui` primitives (`Button`, `Card`, `Badge`, `Input`, `Select`,
  `Field`, `Skeleton`, `Dialog`, `Tooltip`) — flag ad-hoc reimplementations of a primitive that
  already exists there.
- Animate only via `components/motion` primitives (`FadeIn`, `SlideIn`, `Stagger`,
  `PageTransition`, `Reveal`) — flag direct `framer-motion` usage in page/feature code that
  bypasses these, since the primitives preserve `prefers-reduced-motion`.

### Hygiene
- No `console.log` in committed code.
- Validate external input at server boundaries (e.g. with zod).
- New logic ships with tests; CI (lint + test + build) must pass.
