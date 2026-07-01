# Autonomous Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `agency plan --target N`, which reads the product docs and current backlog and tops up the queue to N pending tasks with small, prioritized, non-duplicate tasks — no human in the loop.

**Architecture:** A thin `Planner` reuses the engine and the existing `create_task` MCP tool with a dedicated `PLANNER_SYSTEM` prompt (batch, single-shot). It counts pending tasks via `TaskRepository.list_actionable()`, computes the gap to N, and runs one engine call that emits up to `gap` `create_task` calls. Deterministic core (count/gap/skip/prompt) is unit-tested offline; live task emission is integration, like the PM. All work in `~/agency` (Python 3.12).

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict, the Claude Agent SDK MCP tool bridge. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

---

## File structure

- Modify: `~/agency/src/agency/repository.py` — add `TaskRepository.list_all()`.
- Modify: `~/agency/src/agency/runtime/prompts.py` — add the `PLANNER_SYSTEM` constant.
- Create: `~/agency/src/agency/planner.py` — `Planner` + pure `build_planner_prompt`.
- Modify: `~/agency/src/agency/cli.py` — add the `plan` subcommand + handler.
- Create: `~/agency/docs/adr/009-autonomous-planner.md`.
- Tests: `~/agency/tests/test_repository.py` (extend), `~/agency/tests/test_planner.py` (new).

Work from `/Users/valeryordanyan/agency`. Run tools as `.venv/bin/pytest`, `.venv/bin/ruff`, `.venv/bin/mypy`. Tests use the existing `conn` pytest fixture (in-memory DB with schema) — the same one `tests/test_repository.py` already uses.

---

## Task 1: `TaskRepository.list_all()`

**Files:**
- Modify: `src/agency/repository.py`
- Test: `tests/test_repository.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_repository.py`:

```python
def test_list_all_returns_every_status_ordered_by_id(conn):
    from agency.domain import TaskStatus
    repo = TaskRepository(conn)
    a = repo.create(title="a", description="d", acceptance_criteria="ac")
    b = repo.create(title="b", description="d", acceptance_criteria="ac")
    repo.update(b, status=TaskStatus.DONE)
    titles = [t.title for t in repo.list_all()]
    assert titles == ["a", "b"]  # includes the DONE one, ordered by id
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_repository.py::test_list_all_returns_every_status_ordered_by_id -v`
Expected: FAIL with `AttributeError: 'TaskRepository' object has no attribute 'list_all'`.

- [ ] **Step 3: Implement**

In `src/agency/repository.py`, add this method to `TaskRepository` (directly after `list_actionable`):

```python
    def list_all(self) -> list[Task]:
        rows = self._conn.execute("SELECT * FROM tasks ORDER BY id").fetchall()
        return [_row_to_task(row) for row in rows]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_repository.py -v`
Expected: PASS (new test plus the existing repository tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/repository.py tests/test_repository.py
git commit -m "feat(repo): add TaskRepository.list_all"
```

---

## Task 2: `PLANNER_SYSTEM` prompt

**Files:**
- Modify: `src/agency/runtime/prompts.py`
- Test: `tests/test_planner.py` (new file — this test goes first)

- [ ] **Step 1: Write the failing test**

Create `tests/test_planner.py` with:

```python
def test_planner_system_prompt_mentions_scoping():
    from agency.runtime.prompts import PLANNER_SYSTEM
    assert "create_task" in PLANNER_SYSTEM
    assert "small" in PLANNER_SYSTEM.lower()
    assert "docs/en/" in PLANNER_SYSTEM
    assert "KNOWN_MISTAKES" in PLANNER_SYSTEM
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: FAIL with `ImportError: cannot import name 'PLANNER_SYSTEM'`.

- [ ] **Step 3: Implement**

In `src/agency/runtime/prompts.py`, add this module-level constant after the `_BY_ROLE` dict (it is standalone — the planner does not use `system_prompt_for`, which prepends `_COMMON` about write/bash tools the planner lacks):

```python
PLANNER_SYSTEM = (
    "You are the Planner for an autonomous engineering team. All artifacts you reference "
    "are in English. Read the product docs under docs/en/ (pages are numbered and marked "
    "by phase) and the root CLAUDE.md, then queue the next work by calling create_task in "
    "priority order (most foundational first). Every task MUST be small and independently "
    "buildable, keep CI (lint, test, build) green, honor its own scope (never fold in extra "
    "pages or features), and follow the CLAUDE.md reviewer checklist. Never duplicate a task "
    "that already exists. Read KNOWN_MISTAKES.md first if it exists."
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/runtime/prompts.py tests/test_planner.py
git commit -m "feat(planner): add PLANNER_SYSTEM prompt"
```

---

## Task 3: `Planner` + `build_planner_prompt`

**Files:**
- Create: `src/agency/planner.py`
- Test: `tests/test_planner.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_planner.py`:

```python
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace


def test_build_planner_prompt_content():
    from agency.planner import build_planner_prompt
    p = build_planner_prompt(2, ["Home page"])
    assert "2" in p
    assert "Home page" in p
    assert "small" in p.lower()
    assert "CI" in p


def test_plan_skips_when_backlog_full(conn, tmp_path):
    from agency.planner import Planner
    tasks = TaskRepository(conn)
    for i in range(3):
        tasks.create(title=f"t{i}", description="d", acceptance_criteria="ac")
    engine = FakeEngine([])  # must not be called
    planner = Planner(engine=engine, workspace=Workspace(tmp_path), tasks=tasks)
    created = planner.plan(target=3)
    assert created == 0
    assert engine.requests == []


def test_plan_runs_when_short(conn, tmp_path):
    from agency.planner import Planner
    tasks = TaskRepository(conn)
    tasks.create(title="t0", description="d", acceptance_criteria="ac")
    engine = FakeEngine([AgentReply("done", None, 1, False)])
    planner = Planner(engine=engine, workspace=Workspace(tmp_path), tasks=tasks)
    created = planner.plan(target=3)
    assert len(engine.requests) == 1
    assert "2" in engine.requests[0].prompt  # gap = target(3) - pending(1)
    assert created == 0  # FakeEngine does not execute the create_task tool
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.planner'`.

- [ ] **Step 3: Implement**

Create `src/agency/planner.py`:

```python
from __future__ import annotations

from agency.engine.base import AgentRequest, Engine
from agency.repository import TaskRepository
from agency.runtime.pm_tools import build_create_task_server
from agency.runtime.prompts import PLANNER_SYSTEM
from agency.runtime.workspace import Workspace

_MAX_PLAN = 20
_PLANNER_TOOLS = ["Read", "Grep", "Glob", "WebSearch", "WebFetch"]


def build_planner_prompt(gap: int, existing_titles: list[str]) -> str:
    existing = "\n".join(f"- {t}" for t in existing_titles) or "(none)"
    return (
        "Plan the next work for this product. Read the product docs under docs/en/ "
        "(pages are numbered and marked by phase) and the root CLAUDE.md.\n\n"
        f"Create up to {gap} new tasks by calling create_task, in priority order "
        "(most foundational first). Each task must be small and independently buildable, "
        "keep CI (lint, test, build) green, honor its own scope (do not fold in extra pages "
        "or features), and follow the CLAUDE.md reviewer checklist.\n\n"
        f"Already planned (do NOT duplicate these):\n{existing}\n\n"
        f"Create the next {gap} highest-priority tasks, then stop."
    )


class Planner:
    """Tops up the backlog to a target of pending tasks (batch, single-shot)."""

    def __init__(
        self,
        engine: Engine,
        workspace: Workspace,
        tasks: TaskRepository,
        model: str | None = None,
    ) -> None:
        self._engine = engine
        self._cwd = str(workspace.root)
        self._tasks = tasks
        self._model = model
        self._server, self._create_task_tool = build_create_task_server(tasks)

    def plan(self, target: int = 5) -> int:
        pending = len(self._tasks.list_actionable())
        if pending >= target:
            return 0
        gap = min(target - pending, _MAX_PLAN)
        existing = [t.title for t in self._tasks.list_all()]
        before = len(existing)
        self._engine.run(
            AgentRequest(
                system_prompt=PLANNER_SYSTEM,
                prompt=build_planner_prompt(gap, existing),
                cwd=self._cwd,
                allowed_tools=[*_PLANNER_TOOLS, self._create_task_tool],
                mcp_servers={"pm": self._server},
                model=self._model,
            )
        )
        return len(self._tasks.list_all()) - before
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: PASS (all four tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/planner.py tests/test_planner.py
git commit -m "feat(planner): Planner top-up-to-N with dedup + scoping prompt"
```

---

## Task 4: `plan` CLI subcommand

**Files:**
- Modify: `src/agency/cli.py`

- [ ] **Step 1: Add the subcommand parser**

In `src/agency/cli.py`, next to the existing `sub.add_parser("talk", ...)` line, add:

```python
    plan_p = sub.add_parser("plan", help="Plan the next tasks into the backlog")
    plan_p.add_argument("--target", type=int, default=5, help="top up to this many pending tasks")
```

- [ ] **Step 2: Add the handler**

In `src/agency/cli.py`, add this block directly before the `if args.command == "talk":` block (mirror how `talk` builds its session — no explicit model, matching `PmSession` usage):

```python
    if args.command == "plan":
        from agency.planner import Planner

        planner = Planner(engine=engine, workspace=workspace, tasks=TaskRepository(conn))
        created = planner.plan(target=args.target)
        print(f"planned {created} tasks")
        return 0
```

- [ ] **Step 3: Verify suite + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/mypy`
Expected: all green. (The CLI handler is thin glue, verified by types and the existing suite — the `talk` subcommand is likewise not unit-tested; the `plan` command is exercised live against the real engine.)

- [ ] **Step 4: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/cli.py
git commit -m "feat(cli): add plan subcommand"
```

---

## Task 5: ADR-009 + full gate

**Files:**
- Create: `docs/adr/009-autonomous-planner.md`

- [ ] **Step 1: Write the ADR**

Create `~/agency/docs/adr/009-autonomous-planner.md`:

```markdown
# ADR-009: Autonomous planner

**Status:** Accepted (2026-07-01)

**Context:** A human hand-crafts each task via `talk`. An autonomous team needs the backlog
to fill itself so a daily run always has work.

**Decision:** Add `agency plan --target N` backed by a thin `Planner` that reuses the engine
and the existing `create_task` MCP tool with a dedicated `PLANNER_SYSTEM` prompt. It counts
pending (non-terminal) tasks, and if fewer than N, runs one engine call that emits up to
`N - pending` tasks (capped at `_MAX_PLAN = 20`) in priority order — small, buildable,
CI-inclusive, scope-disciplined, and non-duplicate (existing titles are injected). Idempotent:
if the backlog already has N pending tasks it creates nothing. The scheduler (#4) will call it
before each daily `run --deliver`.

**Consequences:** The team plans its own work. Task quality depends on the planner prompt and
the docs; the `_MAX_PLAN` cap bounds a runaway plan. Live `create_task` emission is integration,
not unit-tested (like the PM). ADR-005 (unsandboxed bash) still applies.
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/009-autonomous-planner.md
git commit -m "docs: ADR-009 autonomous planner"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `agency plan --target N` tops up the backlog to N pending tasks (creates ≤ `N - pending`,
  capped at 20), idempotent when full, non-duplicate, priority-ordered.
- `TaskRepository.list_all()`, `PLANNER_SYSTEM`, `Planner`, `build_planner_prompt`, and the
  `plan` subcommand exist; ADR-009 committed.
- Deterministic core unit-tested offline; live `create_task` emission exercised by running
  `agency plan` against the real engine.
