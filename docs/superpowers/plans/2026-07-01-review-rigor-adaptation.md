# Review Rigor + Project Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the agency's review the rigor foundations (high-signal criteria + mandatory project-context reading) while staying stack-agnostic, and add a root `CLAUDE.md` to the real-estate repo that encodes our Next.js 15 + Supabase + PostGIS rules.

**Architecture:** Two repos. In `~/agency` (Python 3.12, uv venv) we extend two static prompt strings in `src/agency/review/dimensions.py` — no interface/schema/threshold changes. In `~/real-estate-campony` we add one docs artifact (`CLAUDE.md`) that the `conventions` reviewer reads at review time. Validator, gating, and parallel dimensions are unchanged.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict (agency); Markdown (product repo). Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`.

---

## File structure

- Modify: `~/agency/src/agency/review/dimensions.py` — extend `_INSTRUCTION` (high-signal contract) and the `conventions` dimension prompt (mandatory CLAUDE.md / docs/adr reading).
- Modify: `~/agency/tests/review/test_dimensions.py` — assert the new prompt content.
- Create: `~/real-estate-campony/CLAUDE.md` — root project rules + Reviewer Checklist.

No new modules; all other review files (`reviewer.py`, `review_diff.py`, `review_runner.py`, `schemas.py`, `diff.py`) are untouched.

---

## Task 1: High-signal contract in the shared instruction

**Files:**
- Modify: `~/agency/src/agency/review/dimensions.py` (the `_INSTRUCTION` string)
- Test: `~/agency/tests/review/test_dimensions.py`

- [ ] **Step 1: Write the failing test**

Add to `~/agency/tests/review/test_dimensions.py`:

```python
def test_instruction_has_high_signal_contract():
    for dim in REVIEW_DIMENSIONS:
        p = dim.system_prompt
        assert "Flag an issue ONLY when" in p
        assert "Do NOT flag" in p
        assert "pre-existing" in p.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py::test_instruction_has_high_signal_contract -v`
Expected: FAIL (assert "Flag an issue ONLY when" in p) — phrase not yet present.

- [ ] **Step 3: Write the implementation**

In `~/agency/src/agency/review/dimensions.py`, replace the `_INSTRUCTION` assignment with:

```python
_INSTRUCTION = (
    "Review ONLY the provided diff for the task. Report concrete, high-signal issues. "
    "Return your findings as JSON matching the required schema (a `findings` array; each "
    "finding has title, file, severity, rationale). If there are no real issues, return an "
    "empty findings array. Do not invent issues to seem thorough. "
    "Flag an issue ONLY when one of these holds: the code will fail to compile or parse "
    "(syntax/type error, missing import, unresolved reference); the code will definitely "
    "produce wrong results regardless of input (clear logic error); a clear, quotable "
    "project-rule violation; or an alternative that significantly improves correctness or "
    "security (only when the current code is not good enough). "
    "Do NOT flag: code style or quality; issues that depend on specific inputs or state; "
    "subjective suggestions; pre-existing issues not introduced by this diff; issues a "
    "linter would catch; or rules explicitly silenced in the code (e.g. an ignore comment). "
    "If you are not certain an issue is real, do not flag it."
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py -v`
Expected: PASS (all dimension tests, including the new one and the pre-existing `test_each_dimension_has_a_prompt` which still finds "json").

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/review/dimensions.py tests/review/test_dimensions.py
git commit -m "feat(review): add high-signal flag-only/do-not-flag contract"
```

---

## Task 2: Mandatory project-context reading in the conventions reviewer

**Files:**
- Modify: `~/agency/src/agency/review/dimensions.py` (the `conventions` `ReviewDimension`)
- Test: `~/agency/tests/review/test_dimensions.py`

- [ ] **Step 1: Write the failing test**

Add to `~/agency/tests/review/test_dimensions.py`:

```python
def test_conventions_mandates_reading_project_context():
    conv = next(d for d in REVIEW_DIMENSIONS if d.key == "conventions")
    p = conv.system_prompt
    assert "MUST read" in p
    assert "CLAUDE.md" in p
    assert "docs/adr" in p
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py::test_conventions_mandates_reading_project_context -v`
Expected: FAIL (assert "MUST read" in p) — current conventions prompt says "if referenced", not "MUST read".

- [ ] **Step 3: Write the implementation**

In `~/agency/src/agency/review/dimensions.py`, replace the `conventions` `ReviewDimension` entry with:

```python
    ReviewDimension(
        key="conventions",
        system_prompt=(
            "You are a conventions reviewer. You MUST read the project's conventions before "
            "reviewing: always read the root CLAUDE.md if it exists, and the CLAUDE.md in each "
            "directory that contains a changed file. Enforce only rules whose path scope covers "
            "the changed file (the file itself or a parent directory). If a docs/adr/ directory "
            "exists, also read the ADRs whose titles relate to the changed areas and flag "
            "violations with the specific ADR number and the exact rule broken. If neither "
            "CLAUDE.md nor docs/adr/ exists, fall back to a general conventions check (naming, "
            "no debug prints, typing, required tests for new logic) without inventing rules. "
            + _INSTRUCTION
        ),
    ),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py -v`
Expected: PASS (new test plus `test_dimensions_present` and `test_each_dimension_has_a_prompt`).

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/review/dimensions.py tests/review/test_dimensions.py
git commit -m "feat(review): require reading CLAUDE.md/ADRs in conventions reviewer"
```

---

## Task 3: Agency full-suite gate

**Files:** none (verification only)

- [ ] **Step 1: Run the full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: all green (no test asserts the exact old `_INSTRUCTION` text, so the prompt edits do not break other suites).

- [ ] **Step 2: If anything fails, fix inline**

If a test asserted the old prompt text, update that assertion to match the new contract (do not weaken the new prompts). Re-run Step 1 until green. No commit needed if Step 1 was already green.

---

## Task 4: Root CLAUDE.md for the real-estate repo

**Files:**
- Create: `~/real-estate-campony/CLAUDE.md`

- [ ] **Step 1: Create the file**

Create `~/real-estate-campony/CLAUDE.md` with exactly this content:

```markdown
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

### Hygiene
- No `console.log` in committed code.
- Validate external input at server boundaries (e.g. with zod).
- New logic ships with tests; CI (lint + test + build) must pass.
```

- [ ] **Step 2: Verify the file is well-formed**

Run: `cd ~/real-estate-campony && head -5 CLAUDE.md && grep -c "###" CLAUDE.md`
Expected: the title line prints and the section count is `7`.

- [ ] **Step 3: Commit**

```bash
cd ~/real-estate-campony
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md with stack rules + reviewer checklist"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green; the shared instruction carries
  the flag-only / do-NOT-flag contract; the `conventions` reviewer mandates reading
  `CLAUDE.md` (and `docs/adr/` when present).
- `~/real-estate-campony`: root `CLAUDE.md` committed with the six-section Reviewer Checklist.
- No changes to schemas, gating thresholds, the validator, or the orchestrator.
- The new rules are exercised end-to-end by the first live scaffold PR review.
