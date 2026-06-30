# Review Rigor + Project Adaptation — Design (2026-07-01)

## Problem

The agency's autonomous code review (run during `--deliver`, and as `ReviewQaRunner`)
already has the right skeleton — multiple independent reviewers plus an adversarial
validator — but it is missing the *rigor foundations* of a strong review prompt
(explicit high-signal criteria, a do-NOT-flag list, mandatory project-context reading)
and it has no project-specific rules for the real-estate product (Next.js 15 + Supabase
+ PostGIS). We want the **same foundations** as a rigorous review command, but kept
**generic in the agency** and **adapted to our project via rules that live in the product
repo** — so the agency stays stack-agnostic and reusable.

## Goals

- Add generic review rigor to the agency (stack-agnostic).
- Make the reviewer enforce project rules that live in the product repo's `CLAUDE.md`.
- Cut false positives (high-signal only); keep the gated-merge behavior unchanged.

## Non-goals

- No hardcoding of Next.js/Supabase rules into the agency code.
- No new ADR layer in the real-estate repo (single root `CLAUDE.md` for now).
- No change to the orchestrator, shipper, gating thresholds, or validator design.

## Current state (verified)

- `~/agency/src/agency/review/dimensions.py` — 3 dimensions: `bugs`, `security`,
  `conventions`; shared `_INSTRUCTION` asks for high-signal JSON findings.
- `reviewer.py` — `run_reviewer` (per dimension) + `validate_finding` (adversarial,
  `is_real` defaults false). Reviewers already have `Read/Grep/Glob` tools.
- `review_diff.py` — `confirmed_findings`: run all dimensions over the diff, validate
  each finding, return confirmed + token count.
- `review_runner.py` — `ReviewQaRunner`: confirmed findings → `BUG_FOUND` / `SUCCESS`.
- `schemas.py` — `Finding` (title, file, severity ∈ critical|important|minor, rationale);
  gated merge already blocks on critical/important.
- The real-estate repo has `docs/` only — **no root `CLAUDE.md`, no `docs/adr/`.**

## Design

### Side A — Generic rigor in the agency (`~/agency`, stack-agnostic)

**A1. High-signal contract** — extend the shared `_INSTRUCTION` in `dimensions.py` with:

- **Flag ONLY when:** code will fail to compile/parse (syntax/type/missing import/
  unresolved reference); code will definitely produce wrong results regardless of input
  (clear logic error); a clear, quotable project-rule violation; or an alternative that
  significantly improves correctness/security (only when current code is not good enough).
- **Do NOT flag:** style/quality; issues depending on specific inputs or state; subjective
  suggestions; pre-existing issues (not introduced by this diff); issues a linter would
  catch; rules explicitly silenced in code (e.g. an ignore comment). If not certain an
  issue is real, do not flag it.

**A2. Mandatory project-context reading** — strengthen the `conventions` dimension prompt
so the reviewer **always**:

- Reads the root `CLAUDE.md` (if present) and the `CLAUDE.md` in each directory that
  contains a changed file; enforces only the rules that are scoped to that file's path
  (the file or a parent directory).
- If `docs/adr/` exists, reads the ADRs whose titles relate to the changed areas and
  flags violations with the specific ADR number and the exact rule broken.
- Conditional behavior: when neither `CLAUDE.md` nor `docs/adr/` exists, the dimension
  still runs as a general conventions check (no crash, no fabricated rules).

**A3. Unchanged:** parallel dimensions, adversarial `validate_finding`, severity →
gated-merge thresholds, and passing task title/description/acceptance as reviewer context.

### Side B — Adaptation in the real-estate repo

**B1. New root `CLAUDE.md`** (English) with a "Reviewer Checklist" encoding our stack:

- **Next.js 15 (App Router):** Server Components by default; `'use client'` only when
  needed; no server-only secrets referenced in client components.
- **Env / secrets:** secrets never in `NEXT_PUBLIC_*`; the Supabase service-role key is
  used only server-side (route handlers / server actions), never shipped to the client.
- **Supabase:** new tables must have RLS enabled; queries go through the Supabase client
  and are parameterized; no raw string-concatenated SQL.
- **PostGIS:** spatial queries are parameterized and use the correct SRID.
- **Auth:** protected routes and server actions verify the Supabase session.
- **TypeScript:** no `any` used to bypass typing; no `@ts-ignore` without a reason.
- **Hygiene:** no `console.log` in committed code; validate external input at server
  boundaries (e.g. zod); new logic ships with tests.

## Components & data flow (unchanged shape)

```
diff ── run_reviewer(bugs) ─────┐
     ── run_reviewer(security) ─┼─> findings ─> validate_finding (adversarial)
     ── run_reviewer(convs)* ───┘                       │
        *reads CLAUDE.md / docs/adr                      v
                                          confirmed (critical/important) ─> gate
```

The only behavioral changes are the prompt content of A1/A2 and the new `CLAUDE.md`
artifact (B1). No interface, schema, or threshold changes.

## Testing

- Agency follows TDD. Add/adjust tests asserting:
  - The shared instruction includes the high-signal "flag only / do not flag" contract.
  - The `conventions` dimension prompt mandates reading `CLAUDE.md` (and `docs/adr/` when
    present).
  - Existing tests for dimension keys, schema, validator, and `confirmed_findings` still
    pass (no structural change).
- Keep the suite offline (`FakeEngine`); no new live dependencies.
- Full gate: `pytest -q && ruff check . && mypy` green on the agency repo.
- The real-estate `CLAUDE.md` is a docs artifact (no test); it is exercised by the first
  live review when the scaffold PR is reviewed.

## Risks

- Over-strict prompts could suppress real issues — mitigated by keeping the validator and
  the "significantly improves correctness/security" escape hatch.
- `CLAUDE.md` rules referencing files that do not exist yet (greenfield) — the reviewer
  enforces only path-scoped rules against the actual diff, so unmatched rules are inert.
