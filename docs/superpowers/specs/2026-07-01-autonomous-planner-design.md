# Autonomous Planner — Design (2026-07-01)

## Problem

Today a human hand-crafts each task and feeds it to the PM via `agency talk`. For an
autonomous team that runs ~5 tasks/day, the backlog must fill itself. This sub-project (#1
of the autonomous-team roadmap) adds a **planner**: it reads the product docs and the current
backlog, and tops up the queue to N ready tasks with small, prioritized, buildable,
CI-inclusive tasks — no human in the loop.

The PM machinery already exists (`PmSession`, the `create_task` MCP tool, Read/Grep/Glob/Web
tools). The planner reuses it in a **batch, non-conversational** mode with a dedicated prompt
and a top-up bound. Non-goals: doc-gap writing (#2), scheduler (#4), sandbox/token (#5), and
any change to review, delivery, or the orchestrator.

## Goals

- `agency plan --target N` tops up the backlog to N pending (non-terminal) tasks, creating at
  most `N - pending` new tasks, in priority order.
- Idempotent: if there are already ≥ N pending tasks, it creates nothing.
- Tasks are small, buildable, CI-inclusive, scope-disciplined (the lessons in KNOWN_MISTAKES),
  and do not duplicate existing (queued or done) work.
- Deterministic core (count/gap/skip/prompt) is unit-tested offline; the actual task emission
  (engine calling `create_task`) is integration, exercised live like the PM.

## Current state (verified)

- `runtime/pm_tools.py` — `build_create_task_server(tasks)` → an MCP server exposing
  `create_task(title, description, acceptance_criteria)` that calls `TaskRepository.create`.
- `pm_session.py` — `PmSession.send()` runs the engine with `system_prompt_for(Role.PM)`,
  tools `[Read, Grep, Glob, WebSearch, WebFetch, create_task]`, and a resumable session.
- `repository.py` — `TaskRepository` has `create`, `get`, `update`, `list_actionable()`
  (returns non-terminal tasks, i.e. status not in {DONE, FAILED}, ordered by id). No `list_all`.
- `runtime/prompts.py` — `_BY_ROLE` + `system_prompt_for(role)`; `_COMMON` already tells agents
  to read `KNOWN_MISTAKES.md` first.
- `cli.py` — subcommands `run` and `talk`; `talk` builds a `PmSession` and loops.
- The orchestrator picks the lowest-id actionable task first, so **creation order = priority**.

## Design

### Approach (chosen)

A new `agency plan` CLI subcommand backed by a thin `Planner` that reuses the engine and the
`create_task` MCP tool with a dedicated planner system prompt (batch, single-shot). Rejected:
a "plan mode" inside `talk` (couples interactive with batch) and a separate planner agent role
(duplicates PM machinery, touches the Role enum / state machine).

### Components / changes (agency, `~/agency`)

1. **`TaskRepository.list_all()` (`repository.py`)** — returns every task (all statuses),
   ordered by id. Used for dedup (existing titles) and for measuring how many tasks were
   created.

2. **`PLANNER_SYSTEM` prompt (`runtime/prompts.py`)** — a module-level constant (not a new
   `Role`), exported for the planner. It instructs: you are the planner; read the product docs
   under `docs/en/` (numbered by page, marked by phase) and the roadmap; produce a prioritized
   backlog by calling `create_task` in priority order. Each task must be **small and
   independently buildable**, include or rely on CI staying green, honor its own scope (do not
   fold in extra pages/features), and match the reviewer rules in the root `CLAUDE.md`. Do not
   duplicate any already-listed task. Read `KNOWN_MISTAKES.md` first.

3. **`Planner` (`planner.py`, new)** — `plan(target: int = 5) -> int`:
   - `pending = len(tasks.list_actionable())`. If `pending >= target`, return 0 (skip).
   - `gap = min(target - pending, _MAX_PLAN)` (cap `_MAX_PLAN = 20`, per ADR-004).
   - `existing = [t.title for t in tasks.list_all()]`.
   - `before = len(tasks.list_all())`.
   - Builds the `create_task` tool + MCP server via `build_create_task_server(tasks)` (as in
     `PmSession`).
   - One `engine.run(AgentRequest(system_prompt=PLANNER_SYSTEM,
     prompt=build_planner_prompt(gap, existing), cwd=<workspace>,
     allowed_tools=[Read, Grep, Glob, WebSearch, WebFetch, create_task], mcp_servers={"pm": server},
     model=...))`. The engine calls `create_task` up to `gap` times.
   - `return len(tasks.list_all()) - before` (tasks actually created).
   - `build_planner_prompt(gap, existing)` is a **pure** helper: states "create up to {gap}
     tasks", lists the existing titles under "Already planned (do not duplicate)", and points at
     `docs/en/` + the scoping rules.

4. **`plan` subcommand (`cli.py`)** — `agency --workspace <ws> plan --target 5` (default 5).
   Builds a `Planner` from the engine, workspace, and `TaskRepository(conn)`, calls
   `plan(target)`, prints `planned N tasks`.

5. **ADR-009** — records the top-up planner decision and the `_MAX_PLAN` bound.

### Data flow

```
plan(target):
  pending = len(list_actionable())
  pending >= target            → return 0            (idempotent skip)
  gap = min(target-pending, 20)
  engine.run(PLANNER_SYSTEM, build_planner_prompt(gap, existing_titles), create_task tool)
     → PM emits ≤ gap create_task calls (prioritized, scoped, non-duplicate)
  return created (= tasks after − before)
```

## Error handling

- Engine error → `engine.run` returns an error reply; `plan` returns `after - before` (0 if
  nothing was created). It never raises; the caller (CLI / future scheduler) logs the count.
- The planner may create fewer than `gap` tasks (e.g. no roadmap work left) — that is fine;
  the return value reflects reality.

## Testing (TDD, offline)

- `tests/test_planner.py` with a FakeEngine + in-memory `TaskRepository`:
  - **skip when full**: seed `target` actionable tasks → `plan(target)` returns 0 and does not
    consume an engine reply (no engine call).
  - **runs when short**: seed 1 actionable, `target=3` → an engine reply is consumed (engine
    called once); the prompt passed to the engine contains the gap count `2`.
  - `build_planner_prompt(2, ["Home page"])` (pure) contains `"2"`, `"Home page"`, and the
    scoping keywords (`small`, `CI`).
- `tests/test_repository.py` (extend): `list_all()` returns tasks of every status ordered by id.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green. The live emission of
  `create_task` calls is integration, exercised by running `agency plan` against the real engine
  (like the existing PM).

## Rollout

- `agency plan --target 5` is run manually now; the scheduler (#4) will call it before each
  daily `run --deliver` so the queue never starves.
- Default target 5 matches the ~5-tasks/day cadence; `_MAX_PLAN = 20` bounds a single run.
