# Planner Page-Index Injection (#1b) — Design (2026-07-03)

## Problem

Sandbox verification showed the planner reliably creating 0 tasks. Root cause (isolated): the
planner prompt tells the agent to "Read the product docs under docs/en/" — 26 pages — so the agent
burns its turns reading files and never reaches `create_task`. Proven: the MCP `create_task` tool
works in-container (a direct "call create_task with title=X" persisted a task), and a simple
max_turns=6 query creates instantly; only the doc-reading planner prompt fails. The retry loop
(#1 reliability) fires correctly but both attempts read-then-create-nothing, so retrying doesn't
help. This fix removes the need to read all docs.

Sub-project **#1b** (a follow-up to #1). Non-goals: task *quality*/over-scoping, changing docs,
and anything in the sandbox/scheduler.

## Goals

- The planner sees the product's page roadmap **without reading 26 files**, so it can call
  `create_task` for the next undone pages immediately.
- Deterministic core (the page index) is unit-tested offline; degrades gracefully when the pages
  dir is absent (e.g. in unit tests).

## Current state (verified)

- `planner.py` — `build_planner_prompt(gap, existing_titles, is_retry=False)` says "Read the
  product docs under docs/en/ (pages are numbered and marked by phase)". `Planner.plan` runs the
  bounded retry loop (#1 reliability) with this prompt.
- `docs/en/pages/*.md` — 26 files, each starting with a heading like
  `# Page 01 — Home 🟢 Phase 1` (page number, title, phase). Extractable cheaply (first `# ` line).

## Design

### Component 1: `read_page_index(workspace_root) -> str` (new, `planner.py`)

Globs `<workspace_root>/docs/en/pages/*.md` (sorted), reads each file only until its first `# `
heading (early-break — cheap even for large files), and returns a bullet list of those headings
(filename as fallback if a file has no heading). Returns `"(no pages found)"` when the directory
is absent or empty — so it never raises (unit tests with a bare `tmp_path` get the fallback).

```python
def read_page_index(workspace_root: str) -> str:
    pages = sorted(glob.glob(os.path.join(workspace_root, "docs", "en", "pages", "*.md")))
    lines = []
    for path in pages:
        heading = os.path.basename(path)
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("# "):
                    heading = line[2:].strip()
                    break
        lines.append(f"- {heading}")
    return "\n".join(lines) or "(no pages found)"
```

### Component 2: `build_planner_prompt(gap, existing_titles, page_index, is_retry=False)` (`planner.py`)

Add a required `page_index` parameter. Replace "Read the product docs under docs/en/ ..." with the
injected roadmap and an explicit "do NOT read them all":

```
Plan the next work for this product.

The product's pages (roadmap):
{page_index}

Call the create_task tool exactly {gap} times (one call per task), for the next undone
pages/features in priority order (most foundational first). You MAY open one specific page under
docs/en/pages/ for detail, but do NOT read them all — call create_task. Each task must be small
and independently buildable, keep CI (lint, test, build) green, honor its own scope, and follow
the CLAUDE.md reviewer checklist.

Already done (do NOT duplicate these):
{existing}

Call create_task {gap} times now, then stop.{nudge}
```

The `{nudge}` (retry differentiator from #1) is preserved.

### Component 3: `Planner.plan` (`planner.py`)

Compute `page_index = read_page_index(self._cwd)` once before the loop, and pass it to each
`build_planner_prompt(gap, existing, page_index, is_retry=dry > 0)` call. No other loop change.

### ADR

Append a one-line note to ADR-009 (same decision, root-cause fix for the turn-burn).

## Testing (TDD, offline)

- `read_page_index`: a `tmp_path` with `docs/en/pages/01-a.md` (heading `# Page 01 — A`) and
  `02-b.md` (no heading) → returns a list containing `Page 01 — A` and `02-b.md` (filename
  fallback), in sorted order; a bare `tmp_path` (no pages dir) → `"(no pages found)"`.
- `build_planner_prompt`: includes the injected `page_index` text and the phrase "do NOT read them
  all"; still contains "exactly {gap} times", "small", "CI". Update the existing prompt-content and
  retry-nudge tests to pass a `page_index` argument.
- The existing retry tests (`_TaskCreatingEngine`) still pass unchanged — `Planner.plan` computes
  the page index from the (page-less) `tmp_path` workspace, gets the fallback, and the stub creates
  tasks regardless of prompt.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green; suite stays offline.

## Verification (after implementation)

Rebuild `agency-sandbox` and run `run-sandbox.sh plan --target 3` — it should now create tasks
(the agent has the roadmap without reading 26 files). This closes the #1b flakiness.

## Risks

- If the model still reads pages despite "do NOT read them all", it will at least have the index up
  front and should create tasks sooner; the retry + nudge remain as backstops. If it still fails,
  the next lever is lowering the doc-reading further or raising `max_turns` for the planner
  specifically (out of scope here).
