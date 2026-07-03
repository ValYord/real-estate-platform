# Planner Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Planner.plan` reliably enqueue work: harden the prompt to force `create_task` calls, and retry (bounded) when an attempt creates nothing, instead of silently returning 0.

**Architecture:** Two changes in `~/agency`: (1) forceful wording in `PLANNER_SYSTEM` + `build_planner_prompt`; (2) a bounded retry-if-no-progress loop in `Planner.plan`. Tests use an injected engine stub that simulates the agent calling `create_task` by writing to the repo. All Python; suite stays offline.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

---

## File structure

- Modify: `~/agency/src/agency/runtime/prompts.py` — harden `PLANNER_SYSTEM`.
- Modify: `~/agency/src/agency/planner.py` — harden `build_planner_prompt`; add the retry loop + `_MAX_PLAN_ATTEMPTS`.
- Modify: `~/agency/tests/test_planner.py` — new retry tests; update prompt-content assertions; replace the now-invalid single-call test.
- Modify: `~/agency/docs/adr/009-autonomous-planner.md` — one-line note.

---

## Task 1: Harden the planner prompts

**Files:**
- Modify: `src/agency/runtime/prompts.py`, `src/agency/planner.py`
- Test: `tests/test_planner.py`

- [ ] **Step 1: Update the prompt-content tests**

In `tests/test_planner.py`, replace `test_planner_system_prompt_mentions_scoping` and
`test_build_planner_prompt_content` with:

```python
def test_planner_system_prompt_forces_tool_calls():
    from agency.runtime.prompts import PLANNER_SYSTEM
    assert "create_task" in PLANNER_SYSTEM
    assert "MUST call create_task" in PLANNER_SYSTEM
    assert "small" in PLANNER_SYSTEM.lower()
    assert "docs/en/" in PLANNER_SYSTEM
    assert "KNOWN_MISTAKES" in PLANNER_SYSTEM


def test_build_planner_prompt_content():
    from agency.planner import build_planner_prompt
    p = build_planner_prompt(2, ["Home page"])
    assert "exactly 2 times" in p
    assert "Home page" in p
    assert "small" in p.lower()
    assert "CI" in p
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py::test_planner_system_prompt_forces_tool_calls tests/test_planner.py::test_build_planner_prompt_content -v`
Expected: FAIL (phrases "MUST call create_task" / "exactly 2 times" not present yet).

- [ ] **Step 3: Harden `PLANNER_SYSTEM`**

In `src/agency/runtime/prompts.py`, replace the `PLANNER_SYSTEM = (...)` assignment with:

```python
PLANNER_SYSTEM = (
    "You are the Planner for an autonomous engineering team. All artifacts you reference "
    "are in English. Read the product docs under docs/en/ (pages are numbered and marked "
    "by phase) and the root CLAUDE.md, then queue the next work by calling the create_task "
    "tool in priority order (most foundational first). You MUST call create_task for each "
    "task — do not describe tasks in prose, do not ask questions, and do not end your turn "
    "until you have created the requested tasks. Every task MUST be small and independently "
    "buildable, keep CI (lint, test, build) green, honor its own scope (never fold in extra "
    "pages or features), and follow the CLAUDE.md reviewer checklist. Never duplicate a task "
    "that already exists. Read KNOWN_MISTAKES.md first if it exists."
)
```

- [ ] **Step 4: Harden `build_planner_prompt`**

In `src/agency/planner.py`, replace the `build_planner_prompt` function body's return with:

```python
def build_planner_prompt(gap: int, existing_titles: list[str]) -> str:
    existing = "\n".join(f"- {t}" for t in existing_titles) or "(none)"
    return (
        "Plan the next work for this product. Read the product docs under docs/en/ "
        "(pages are numbered and marked by phase) and the root CLAUDE.md.\n\n"
        f"Call the create_task tool exactly {gap} times (one call per task), in priority "
        "order (most foundational first). Do NOT reply in prose or ask questions — call the "
        "tool. Each task must be small and independently buildable, keep CI (lint, test, "
        "build) green, honor its own scope (do not fold in extra pages or features), and "
        "follow the CLAUDE.md reviewer checklist.\n\n"
        f"Already planned (do NOT duplicate these):\n{existing}\n\n"
        f"Call create_task {gap} times now, then stop."
    )
```

- [ ] **Step 5: Run to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py::test_planner_system_prompt_forces_tool_calls tests/test_planner.py::test_build_planner_prompt_content -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/runtime/prompts.py src/agency/planner.py tests/test_planner.py
git commit -m "feat(planner): force create_task tool calls in planner prompts"
```

---

## Task 2: Bounded retry-if-no-progress loop

**Files:**
- Modify: `src/agency/planner.py`
- Test: `tests/test_planner.py`

- [ ] **Step 1: Write the tests (and replace the invalid single-call test)**

In `tests/test_planner.py`, **remove `test_plan_runs_when_short`** (the retry loop makes it call
the engine more than once, so its `FakeEngine([one reply])` + `len(requests)==1` assertion is no
longer valid). Add a stub engine and the retry tests:

```python
class _TaskCreatingEngine:
    """Simulates the agent calling create_task by writing to the repo."""

    def __init__(self, tasks, create_from_call=1):
        self._tasks = tasks
        self._create_from = create_from_call
        self.calls = 0

    def run(self, request):
        from agency.engine.base import AgentReply
        self.calls += 1
        if self.calls >= self._create_from:
            self._tasks.create(title=f"planned-{self.calls}", description="d",
                               acceptance_criteria="ac")
        return AgentReply("", None, 1, False)


def test_plan_retries_until_a_task_is_created(conn, tmp_path):
    from agency.planner import Planner
    tasks = TaskRepository(conn)
    engine = _TaskCreatingEngine(tasks, create_from_call=2)  # 1st attempt dry, 2nd creates
    created = Planner(engine=engine, workspace=Workspace(tmp_path), tasks=tasks).plan(target=1)
    assert created == 1
    assert engine.calls == 2


def test_plan_bounded_when_always_dry(conn, tmp_path):
    from agency.planner import Planner
    tasks = TaskRepository(conn)
    engine = _TaskCreatingEngine(tasks, create_from_call=99)  # never creates
    created = Planner(engine=engine, workspace=Workspace(tmp_path), tasks=tasks).plan(target=1)
    assert created == 0
    assert engine.calls == 2  # stops after 2 consecutive dry attempts, not 3+
```

Keep the existing `test_plan_skips_when_backlog_full` (still valid: `pending >= target` returns 0
without calling the engine).

- [ ] **Step 2: Run to verify the new tests fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: the two new tests FAIL (current `plan` calls the engine exactly once, so
`engine.calls == 2` is not met; `test_plan_retries_until_a_task_is_created` sees `calls == 1`).

- [ ] **Step 3: Implement the retry loop**

In `src/agency/planner.py`, add the constant near `_MAX_PLAN`:

```python
_MAX_PLAN = 20
_MAX_PLAN_ATTEMPTS = 3
```

Replace the `Planner.plan` method with:

```python
    def plan(self, target: int = 5) -> int:
        if len(self._tasks.list_actionable()) >= target:
            return 0
        before = len(self._tasks.list_all())
        dry = 0
        for _ in range(_MAX_PLAN_ATTEMPTS):
            gap = min(target - len(self._tasks.list_actionable()), _MAX_PLAN)
            if gap <= 0:
                break
            count_before = len(self._tasks.list_all())
            existing = [t.title for t in self._tasks.list_all()]
            self._engine.run(
                AgentRequest(
                    system_prompt=PLANNER_SYSTEM,
                    prompt=build_planner_prompt(gap, existing),
                    cwd=self._cwd,
                    allowed_tools=[*PM_READ_TOOLS, self._create_task_tool],
                    mcp_servers={"pm": self._server},
                    model=self._model,
                )
            )
            if len(self._tasks.list_all()) == count_before:
                dry += 1
                if dry >= 2:
                    break
            else:
                dry = 0
        return len(self._tasks.list_all()) - before
```

- [ ] **Step 4: Run to verify all planner tests pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: PASS (retry-then-succeed → `calls == 2`, `created == 1`; always-dry → `calls == 2`,
`created == 0`; skip-when-full unchanged).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/planner.py tests/test_planner.py
git commit -m "feat(planner): bounded retry-if-no-progress loop in plan()"
```

---

## Task 3: ADR note + full gate

**Files:**
- Modify: `docs/adr/009-autonomous-planner.md`

- [ ] **Step 1: Add the note**

In `~/agency/docs/adr/009-autonomous-planner.md`, append to the **Consequences** paragraph:

```markdown

**Refinement (2026-07-03):** the planner occasionally finished without calling create_task
(flaky). `plan` now hardens the prompt (MUST call the tool) and retries up to 3 attempts,
stopping when enough tasks are pending or after 2 consecutive attempts that create nothing.
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/009-autonomous-planner.md
git commit -m "docs: ADR-009 note on planner retry refinement"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `PLANNER_SYSTEM` and `build_planner_prompt` force `create_task` tool calls (unit-tested).
- `Planner.plan` retries (bounded, `_MAX_PLAN_ATTEMPTS = 3`) when an attempt creates nothing,
  stops on enough-pending or 2 consecutive dry attempts, and never loops forever (unit-tested with
  a task-creating stub engine).
- ADR-009 notes the refinement. Suite stays offline.
