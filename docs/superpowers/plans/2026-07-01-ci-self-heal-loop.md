# CI Self-Heal Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a delivered PR's CI fails, the agency automatically feeds the failure logs back to the Developer agent, pushes a fix, and re-checks CI — bounded to 3 attempts, then parks the PR and lets the run continue.

**Architecture:** A new deterministic `CiHealer` helper runs the bounded loop (`ci_logs → Developer → commit → push → wait_ci`), reusing the existing `EngineRunner` (Developer role). `Shipper.ship` calls it when the first `wait_ci` returns `"failure"`; the merge gate is unchanged. Park = leave the PR open, record an event, and return (the orchestrator continues to the next task). All work is in `~/agency` (Python 3.12, uv venv).

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict, the `gh` CLI. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

---

## File structure

- Modify: `~/agency/src/agency/delivery/git_ops.py` — add `ci_logs` to `GitGhPort`, `GitGh`, `FakeGitGh`; make `FakeGitGh.wait_ci` accept a status sequence.
- Create: `~/agency/src/agency/delivery/ci_healer.py` — `CiHealer` + `HealResult`.
- Modify: `~/agency/src/agency/delivery/shipper.py` — call `CiHealer` on CI failure; extend `ShipResult`; add `park_event_text`.
- Modify: `~/agency/src/agency/app.py` — record a park event when a shipped task is parked.
- Create: `~/agency/docs/adr/008-ci-self-heal.md`.
- Tests: `~/agency/tests/delivery/test_git_ops.py` (extend), `~/agency/tests/delivery/test_ci_healer.py` (new), `~/agency/tests/delivery/test_shipper.py` (extend).

Work from `/Users/valeryordanyan/agency`. Run tools as `.venv/bin/pytest`, `.venv/bin/ruff`, `.venv/bin/mypy`.

---

## Task 1: `ci_logs` port method + sequenced `FakeGitGh.wait_ci`

**Files:**
- Modify: `src/agency/delivery/git_ops.py`
- Test: `tests/delivery/test_git_ops.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/delivery/test_git_ops.py` (it already imports `FakeGitGh`, `branch_name`):

```python
def test_fake_gitgh_wait_ci_sequence():
    gh = FakeGitGh(ci_status=["failure", "success"])
    assert gh.wait_ci("pr") == "failure"
    assert gh.wait_ci("pr") == "success"
    assert gh.wait_ci("pr") == "success"  # exhausted -> last value


def test_fake_gitgh_ci_logs():
    gh = FakeGitGh(ci_logs="npm error picomatch")
    assert "picomatch" in gh.ci_logs("pr")
    assert "ci_logs" in gh.calls
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_git_ops.py -v`
Expected: FAIL (`FakeGitGh` has no `ci_logs`; `wait_ci` ignores a list).

- [ ] **Step 3: Implement**

In `src/agency/delivery/git_ops.py`, add `ci_logs` to the protocol — insert this line into `GitGhPort` after the `wait_ci` line:

```python
    def ci_logs(self, pr_url: str) -> str: ...
```

Add this method to the `GitGh` class (after `wait_ci`):

```python
    def ci_logs(self, pr_url: str) -> str:
        run_id = self._run(
            "gh", "run", "list", "-L", "1", "--json", "databaseId",
            "-q", ".[0].databaseId", check=False,
        )
        if not run_id:
            return ""
        logs = self._run("gh", "run", "view", run_id, "--log-failed", check=False)
        return logs[:6000]
```

Replace the whole `FakeGitGh.__init__` and its `wait_ci` with (and add `ci_logs`):

```python
    def __init__(
        self,
        ci_status: str | list[str] = "success",
        pr_url: str = "https://example/pr/1",
        ci_logs: str = "ci failed",
    ) -> None:
        if isinstance(ci_status, list):
            self._ci_queue: list[str] | None = list(ci_status)
            self._last_ci = ci_status[-1] if ci_status else "success"
        else:
            self._ci_queue = None
            self._last_ci = ci_status
        self._pr_url = pr_url
        self._ci_logs = ci_logs
        self.calls: list[str] = []
        self.comments: list[str] = []
        self.merged = False
        self.synced = False
```

```python
    def wait_ci(self, pr_url: str) -> str:
        self.calls.append("wait_ci")
        if self._ci_queue is not None and self._ci_queue:
            self._last_ci = self._ci_queue.pop(0)
        return self._last_ci

    def ci_logs(self, pr_url: str) -> str:
        self.calls.append("ci_logs")
        return self._ci_logs
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_git_ops.py -v`
Expected: PASS (new tests plus the pre-existing `FakeGitGh` tests — the `ci_status="success"` string path is unchanged).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/delivery/git_ops.py tests/delivery/test_git_ops.py
git commit -m "feat(delivery): add ci_logs port + sequenced FakeGitGh.wait_ci"
```

---

## Task 2: `CiHealer` bounded loop

**Files:**
- Create: `src/agency/delivery/ci_healer.py`
- Test: `tests/delivery/test_ci_healer.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/delivery/test_ci_healer.py`:

```python
from agency.delivery.ci_healer import CiHealer, HealResult
from agency.delivery.git_ops import FakeGitGh
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.runtime.workspace import Workspace


def _task() -> Task:
    return Task(id=5, title="Add X", description="d", acceptance_criteria="ac",
                status=TaskStatus.DONE)


def test_heals_and_returns_success(tmp_path):
    git = FakeGitGh(ci_status=["success"], ci_logs="lint error")
    engine = FakeEngine([AgentReply("fixed", None, 7, False)])
    healer = CiHealer(git, engine, Workspace(tmp_path))
    res = healer.heal(_task(), "pr", "branch")
    assert isinstance(res, HealResult)
    assert res.ci_status == "success"
    assert res.attempts == 1
    assert res.tokens == 7
    assert git.calls.count("commit_all") == 1
    assert git.calls.count("push") == 1
    assert "ci_logs" in git.calls


def test_parks_after_max_attempts(tmp_path):
    git = FakeGitGh(ci_status=["failure", "failure", "failure"], ci_logs="err")
    engine = FakeEngine([AgentReply("", None, 1, False) for _ in range(3)])
    healer = CiHealer(git, engine, Workspace(tmp_path), max_attempts=3)
    res = healer.heal(_task(), "pr", "branch")
    assert res.ci_status == "failure"
    assert res.attempts == 3
    assert git.calls.count("push") == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_ci_healer.py -v`
Expected: FAIL with `ModuleNotFoundError: agency.delivery.ci_healer`.

- [ ] **Step 3: Implement**

Create `src/agency/delivery/ci_healer.py`:

```python
from __future__ import annotations

from dataclasses import dataclass

from agency.delivery.git_ops import GitGhPort
from agency.domain import Role, Task
from agency.engine.base import Engine
from agency.runtime.engine_runner import EngineRunner
from agency.runtime.workspace import Workspace

_MAX_LOG = 6000


@dataclass
class HealResult:
    ci_status: str
    attempts: int
    tokens: int


class CiHealer:
    """Bounded CI-fix loop: logs -> Developer -> commit -> push -> wait_ci."""

    def __init__(
        self,
        git_gh: GitGhPort,
        engine: Engine,
        workspace: Workspace,
        model: str | None = None,
        max_attempts: int = 3,
    ) -> None:
        self._git = git_gh
        self._runner = EngineRunner(engine, str(workspace.root), model)
        self._max_attempts = max_attempts

    def heal(self, task: Task, pr_url: str, branch: str) -> HealResult:
        attempts = 0
        tokens = 0
        ci_status = "failure"
        while attempts < self._max_attempts:
            attempts += 1
            logs = self._git.ci_logs(pr_url)[:_MAX_LOG]
            fix_task = Task(
                id=task.id,
                title=f"Fix CI failure for: {task.title}",
                description=(
                    "The pull request's CI is failing. Fix the code so CI "
                    "(lint, test, build) passes. Do not change unrelated files.\n\n"
                    f"CI failure logs:\n{logs}\n\nOriginal task:\n{task.description}"
                ),
                acceptance_criteria="CI (lint, test, build) passes on the PR.",
                status=task.status,
            )
            result = self._runner.run(Role.DEVELOPER, fix_task)
            tokens += result.tokens
            self._git.commit_all(f"fix: address CI failure (attempt {attempts})")
            self._git.push(branch)
            ci_status = self._git.wait_ci(pr_url)
            if ci_status == "success":
                break
        return HealResult(ci_status=ci_status, attempts=attempts, tokens=tokens)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_ci_healer.py -v`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/delivery/ci_healer.py tests/delivery/test_ci_healer.py
git commit -m "feat(delivery): CiHealer bounded CI-fix loop"
```

---

## Task 3: Wire `CiHealer` into `Shipper` + park flag

**Files:**
- Modify: `src/agency/delivery/shipper.py`
- Test: `tests/delivery/test_shipper.py`

- [ ] **Step 1: Write/replace the tests**

In `tests/delivery/test_shipper.py`, **replace** `test_no_merge_when_ci_fails` with these two tests (CI failure now triggers the heal loop, so the old single-status assertion no longer holds):

```python
def test_heals_ci_then_merges(tmp_path):
    git = FakeGitGh(ci_status=["failure", "success"])
    engine = FakeEngine(
        [AgentReply("", {"findings": []}, 1, False) for _ in range(3)]
        + [AgentReply("fixed", None, 5, False)]
    )
    shipper = Shipper(git_gh=git, engine=engine, workspace=Workspace(tmp_path))
    result = shipper.ship(_task())
    assert result.ci_fix_attempts == 1
    assert result.merged is True
    assert result.parked is False


def test_parks_when_ci_never_heals(tmp_path):
    git = FakeGitGh(ci_status=["failure", "failure", "failure", "failure"])
    engine = FakeEngine(
        [AgentReply("", {"findings": []}, 1, False) for _ in range(3)]
        + [AgentReply("", None, 1, False) for _ in range(3)]
    )
    shipper = Shipper(git_gh=git, engine=engine, workspace=Workspace(tmp_path))
    result = shipper.ship(_task())
    assert result.merged is False
    assert result.parked is True
    assert result.ci_fix_attempts == 3
    assert git.merged is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_shipper.py -v`
Expected: FAIL (`ShipResult` has no `ci_fix_attempts`/`parked`; no heal loop yet).

- [ ] **Step 3: Implement**

In `src/agency/delivery/shipper.py`:

Add the import near the top (after the existing `from agency.delivery.git_ops import ...` line):

```python
from agency.delivery.ci_healer import CiHealer
```

Replace the `ShipResult` dataclass with:

```python
@dataclass
class ShipResult:
    pr_url: str
    merged: bool
    ci_status: str
    confirmed_findings: int
    ci_fix_attempts: int = 0
    parked: bool = False
```

Add `max_ci_fix: int = 3` to `Shipper.__init__` (as the last parameter) and store it:

```python
    def __init__(
        self,
        git_gh: GitGhPort,
        engine: Engine,
        workspace: Workspace,
        model: str | None = None,
        base: str = "main",
        max_ci_fix: int = 3,
    ) -> None:
        self._git = git_gh
        self._engine = engine
        self._workspace = workspace
        self._model = model
        self._base = base
        self._max_ci_fix = max_ci_fix
```

Replace the block from `ci_status = self._git.wait_ci(pr_url)` through the `return ShipResult(...)` at the end of `ship` with:

```python
        ci_status = self._git.wait_ci(pr_url)
        ci_fix_attempts = 0
        if ci_status == "failure":
            heal = CiHealer(
                self._git, self._engine, self._workspace, self._model, self._max_ci_fix
            ).heal(task, pr_url, branch)
            ci_status = heal.ci_status
            ci_fix_attempts = heal.attempts

        blocking = [f for f in findings if f.severity in _BLOCKING]
        merged = False
        if ci_status == "success" and not blocking:
            self._git.merge(pr_url)
            merged = True
        else:
            logger.warning(
                "PR left open: ci=%s blocking=%d attempts=%d",
                ci_status, len(blocking), ci_fix_attempts,
            )

        parked = (not merged) and ci_status != "success"
        self._git.sync_main()
        return ShipResult(
            pr_url=pr_url, merged=merged, ci_status=ci_status,
            confirmed_findings=len(findings), ci_fix_attempts=ci_fix_attempts,
            parked=parked,
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_shipper.py -v`
Expected: PASS (the two new tests plus the unchanged `test_merges_when_ci_green_and_no_blocking` and `test_no_merge_when_blocking_finding`).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/delivery/shipper.py tests/delivery/test_shipper.py
git commit -m "feat(delivery): heal CI in Shipper; add ci_fix_attempts + parked"
```

---

## Task 4: Record a park event in `app.py`

**Files:**
- Modify: `src/agency/app.py`
- Test: `tests/delivery/test_shipper.py` (add a test for `park_event_text`)

- [ ] **Step 1: Write the failing test**

Add to `tests/delivery/test_shipper.py`:

```python
def test_park_event_text_mentions_attempts_and_url():
    from agency.delivery.shipper import park_event_text
    r = ShipResult(pr_url="https://x/pr/9", merged=False, ci_status="failure",
                   confirmed_findings=0, ci_fix_attempts=3, parked=True)
    text = park_event_text(r)
    assert "3" in text
    assert "https://x/pr/9" in text
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/delivery/test_shipper.py::test_park_event_text_mentions_attempts_and_url -v`
Expected: FAIL with `ImportError: cannot import name 'park_event_text'`.

- [ ] **Step 3: Add the helper, then wire app.py**

First add this pure helper to `src/agency/delivery/shipper.py`, below `_format_findings`:

```python
def park_event_text(result: ShipResult) -> str:
    return (
        f"ci red after {result.ci_fix_attempts} fix attempts; "
        f"{result.pr_url} left open"
    )
```

Then in `src/agency/app.py`, change the delivery wiring so `on_done` records a park event. Replace the `if deliver:` block and the `Orchestrator(...)` construction with:

```python
    events = EventRepository(conn)
    on_done = None
    if deliver:
        port = git_gh if git_gh is not None else GitGh(str(workspace.root))
        shipper = Shipper(git_gh=port, engine=engine, workspace=workspace, model=model)

        def on_done(task: Task) -> None:
            try:
                result = shipper.ship(task)
                if result.parked and task.id is not None:
                    logger.warning(
                        "task %s parked: %s", task.id, park_event_text(result)
                    )
                    events.append(task.id, "shipper", "park", park_event_text(result))
            except Exception:
                logger.exception("delivery failed for task %s; leaving for human", task.id)

    orchestrator = Orchestrator(
        tasks=TaskRepository(conn),
        events=events,
        runner=runner,
        config=OrchestratorConfig(token_budget=token_budget),
        on_done=on_done,
    )
```

Add these imports to `app.py` (alongside the existing delivery import and repository import):

```python
from agency.delivery.shipper import Shipper, park_event_text
```

(Replace the existing `from agency.delivery.shipper import Shipper` line with the line above. `EventRepository` is already imported.)

- [ ] **Step 4: Run the full suite + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/mypy`
Expected: all green (the app change is type-checked; `events` is constructed once and shared).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/app.py src/agency/delivery/shipper.py tests/delivery/test_shipper.py
git commit -m "feat(delivery): record a park event when a shipped task is parked"
```

---

## Task 5: ADR-008 + full gate

**Files:**
- Create: `docs/adr/008-ci-self-heal.md`

- [ ] **Step 1: Write the ADR**

Create `~/agency/docs/adr/008-ci-self-heal.md`:

```markdown
# ADR-008: CI self-heal loop

**Status:** Accepted (2026-07-01)

**Context:** Autonomous delivery leaves a PR open when CI fails, requiring a human to
fix it. For an unattended, scheduled team this stalls progress on the first red PR.

**Decision:** On CI failure, `Shipper` delegates to a bounded `CiHealer` loop
(`ci_logs -> Developer -> commit -> push -> wait_ci`), max 3 attempts, reusing the
Developer agent. On success it proceeds to the normal merge gate. On exhaustion it
**parks**: leaves the PR open, records a `shipper/park` event, and returns so the
orchestrator continues to the next task. No task-status change (a parked task stays
DONE and is not re-shipped). Auto-fixing blocking review findings is out of scope.

**Consequences:** Unattended runs recover from most CI failures without a human. A
confidently-wrong fix is bounded by the attempt cap; park is the backstop. Requires
`gh run view --log-failed`. ADR-005 (unsandboxed bash) still applies.
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/008-ci-self-heal.md
git commit -m "docs: ADR-008 CI self-heal loop"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- CI failure in `Shipper.ship` triggers a bounded `CiHealer` loop (≤3 Developer fix attempts);
  success proceeds to the merge gate, exhaustion parks (PR open, `shipper/park` event, run continues).
- `ShipResult` exposes `ci_fix_attempts` and `parked`; `app.py` records the park event.
- ADR-008 committed. Suite stays offline; real `gh`/CI exercised only by the next live run.
