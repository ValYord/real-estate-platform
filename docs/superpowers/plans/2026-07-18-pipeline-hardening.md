# Pipeline Hardening (agency #3 + #1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the autonomous delivery pipeline land clean retrofit PRs: reset the working tree at each task's start (#3a), stop tracking two infra-noise files (#3b), and auto-fix blocking code-review findings instead of parking the PR (#1).

**Architecture:** Add `reset_workspace()` to the git port and call it from the `Orchestrator` on the `NEW→in_design` transition via a new `prepare_workspace` hook (wired in `app.py` on the deliver path). Untrack + gitignore `.claude/settings.local.json` and `KNOWN_MISTAKES.md` in the product repo. Add a `ReviewHealer` (mirroring `CiHealer`) and run it in `Shipper.ship` before the visual gate, behind an injectable `review` seam.

**Tech Stack:** Python 3.12 (agency repo `~/agency`, branch `master`, uv venv `~/agency/.venv`), pytest/ruff/mypy. Product `.gitignore` in `~/real-estate-campony` (branch `main`). Reference spec: `docs/superpowers/specs/2026-07-18-pipeline-hardening-design.md`. Rebuild `agency-sandbox` after the agency changes.

---

## File Structure

- Modify: `~/agency/src/agency/delivery/git_ops.py` — `reset_workspace()` on `GitGhPort`, `GitGh`, `FakeGitGh`.
- Modify: `~/agency/src/agency/orchestrator.py` — `prepare_workspace` hook, called on `NEW→in_design`.
- Modify: `~/agency/src/agency/app.py` — wire `prepare_workspace = git_gh.reset_workspace` (deliver path).
- Create: `~/agency/src/agency/delivery/review_healer.py` — `ReviewHealer` + `ReviewHealResult`.
- Modify: `~/agency/src/agency/delivery/shipper.py` — `review` seam, `max_review_fix`, run `ReviewHealer`.
- Modify: `~/real-estate-campony/.gitignore` — add the two noise files (product `main`).
- Tests: `tests/delivery/test_git_ops.py`, `tests/test_orchestrator.py`, `tests/test_app.py`,
  `tests/delivery/test_review_healer.py` (new), `tests/delivery/test_shipper.py`.

---

## Task 1: `reset_workspace()` on the git port

**Files:**
- Modify: `~/agency/src/agency/delivery/git_ops.py`
- Test: `~/agency/tests/delivery/test_git_ops.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/delivery/test_git_ops.py
from agency.delivery.git_ops import FakeGitGh


def test_fake_reset_workspace_records_call():
    git = FakeGitGh()
    git.reset_workspace()
    assert "reset_workspace" in git.calls
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_git_ops.py -q -k reset_workspace`
Expected: FAIL — `AttributeError: 'FakeGitGh' object has no attribute 'reset_workspace'`

- [ ] **Step 3: Write minimal implementation**

In `src/agency/delivery/git_ops.py`, add to the `GitGhPort` Protocol (after `sync_main`):
```python
    def reset_workspace(self) -> None: ...
```

Add to `GitGh` (after `sync_main`):
```python
    def reset_workspace(self) -> None:
        # Clean slate at task start: discard any residue (a killed run's uncommitted work,
        # infra-written files) so ship's `git add -A` commits only this task's changes.
        # Ignored files (node_modules, .next, the gitignored noise files) are preserved.
        self._run("git", "checkout", "-f", self._base)
        self._run("git", "fetch", "origin", self._base, check=False)
        self._run("git", "reset", "--hard", f"origin/{self._base}")
        self._run("git", "clean", "-fd")
```

Add to `FakeGitGh` (after `sync_main`):
```python
    def reset_workspace(self) -> None:
        self.calls.append("reset_workspace")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_git_ops.py -q -k reset_workspace`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/delivery/git_ops.py tests/delivery/test_git_ops.py
git commit -m "feat(delivery): reset_workspace() on the git port (#3a)"
```

---

## Task 2: Orchestrator `prepare_workspace` hook

**Files:**
- Modify: `~/agency/src/agency/orchestrator.py`
- Test: `~/agency/tests/test_orchestrator.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/test_orchestrator.py
# (Orchestrator, OrchestratorConfig, TaskRepository, EventRepository, FakeAgentRunner and
# TaskStatus are already imported at the top of this file — do not re-import them.)


def test_prepare_workspace_called_on_new_transition(conn):
    tasks = TaskRepository(conn)
    tid = tasks.create(title="t", description="d", acceptance_criteria="ac")
    calls: list[int] = []
    orch = Orchestrator(
        tasks=tasks,
        events=EventRepository(conn),
        runner=FakeAgentRunner(),
        config=OrchestratorConfig(),
        prepare_workspace=lambda: calls.append(1),
    )
    orch.step()  # NEW -> in_design
    assert calls == [1]
    assert tasks.get(tid).status is TaskStatus.IN_DESIGN


def test_prepare_workspace_not_called_on_actor_step(conn):
    tasks = TaskRepository(conn)
    tid = tasks.create(title="t", description="d", acceptance_criteria="ac")
    tasks.update(tid, status=TaskStatus.IN_DESIGN)  # already started
    calls: list[int] = []
    orch = Orchestrator(
        tasks=tasks,
        events=EventRepository(conn),
        runner=FakeAgentRunner(),
        config=OrchestratorConfig(),
        prepare_workspace=lambda: calls.append(1),
    )
    orch.step()  # runs Designer, in_design -> in_dev; no reset
    assert calls == []
```

(The existing `_orch(conn, ...)` helper in this file does not pass `prepare_workspace`; these two tests construct `Orchestrator(...)` directly so they can pass the hook.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/test_orchestrator.py -q -k prepare_workspace`
Expected: FAIL — `TypeError: Orchestrator.__init__() got an unexpected keyword argument 'prepare_workspace'`

- [ ] **Step 3: Write minimal implementation**

In `src/agency/orchestrator.py`, add the ctor param and store it. Change the `__init__` signature to add (after `on_done`):
```python
        prepare_workspace: Callable[[], None] | None = None,
```
and in the body:
```python
        self._prepare_workspace = prepare_workspace
```

In `step()`, change the `NEW` branch from:
```python
        if task.status is TaskStatus.NEW:
            self._tasks.update(task.id, status=next_status_on_success(TaskStatus.NEW))
            return True
```
to:
```python
        if task.status is TaskStatus.NEW:
            if self._prepare_workspace is not None:
                self._prepare_workspace()
            self._tasks.update(task.id, status=next_status_on_success(TaskStatus.NEW))
            return True
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/test_orchestrator.py -q`
Expected: PASS (new tests + all existing orchestrator tests)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/orchestrator.py tests/test_orchestrator.py
git commit -m "feat(orchestrator): prepare_workspace hook on task start (#3a)"
```

---

## Task 3: Wire `prepare_workspace` in `app.py`

**Files:**
- Modify: `~/agency/src/agency/app.py`
- Test: `~/agency/tests/test_app.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/test_app.py
def test_deliver_resets_workspace_at_task_start(tmp_path):
    from agency.delivery.git_ops import FakeGitGh

    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    tasks.create(title="t", description="d", acceptance_criteria="ac")
    git = FakeGitGh(ci_status="success")
    engine = FakeEngine([
        AgentReply("designed", None, 1, False),
        AgentReply("built", None, 1, False),
        AgentReply("", {"passed": True, "summary": "green"}, 1, False),
        AgentReply("", {"findings": []}, 1, False),
        AgentReply("", {"findings": []}, 1, False),
        AgentReply("", {"findings": []}, 1, False),
    ])
    run_agency(conn=conn, workspace=Workspace(tmp_path), engine=engine,
               max_steps=20, deliver=True, git_gh=git)
    assert "reset_workspace" in git.calls
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/test_app.py -q -k reset`
Expected: FAIL — `reset_workspace` never called (assertion fails)

- [ ] **Step 3: Write minimal implementation**

In `src/agency/app.py` `run_agency`, the deliver block builds `port`/`shipper` and sets `on_done`.
Locate where `Orchestrator(...)` is constructed and pass `prepare_workspace`. First, capture the
reset callable inside the `if deliver:` block (where `port` exists). Change the deliver block so
`port` is available after it, then add `prepare_workspace`:

Find:
```python
    on_done = None
    if deliver:
        port = git_gh if git_gh is not None else GitGh(str(workspace.root))
        shipper = Shipper(git_gh=port, engine=engine, workspace=workspace, model=model)

        def on_done(task: Task) -> None:
            ...
```
After the `if deliver:` block, before constructing the `Orchestrator`, add:
```python
    prepare_workspace = port.reset_workspace if deliver else None
```
and add `prepare_workspace=prepare_workspace,` to the `Orchestrator(...)` constructor call.

(`port` is defined only inside `if deliver:`; since `prepare_workspace` is guarded by the same
`deliver` flag, the reference is only evaluated when `deliver` is True. To satisfy the type
checker, initialize `port` before the block: add `port: GitGhPort | None = None` just above
`on_done = None`, and import `GitGhPort` from `agency.delivery.git_ops` at the top.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/test_app.py -q`
Expected: PASS (new test + existing app tests, incl. `test_run_agency_ships_on_done`)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/app.py tests/test_app.py
git commit -m "feat(app): reset workspace at task start on the deliver path (#3a)"
```

---

## Task 4: Untrack + gitignore the noise files (product repo)

**Files:**
- Modify: `~/real-estate-campony/.gitignore`

- [ ] **Step 1: Untrack the two files (keep them on disk)**

```bash
cd ~/real-estate-campony
git rm --cached .claude/settings.local.json KNOWN_MISTAKES.md
```
Expected: `rm '.claude/settings.local.json'` and `rm 'KNOWN_MISTAKES.md'` (files remain on disk).

- [ ] **Step 2: Add them to `.gitignore`**

Append these two lines to `~/real-estate-campony/.gitignore`:
```
.claude/settings.local.json
KNOWN_MISTAKES.md
```

- [ ] **Step 3: Verify they are ignored and untracked**

```bash
cd ~/real-estate-campony
git check-ignore .claude/settings.local.json KNOWN_MISTAKES.md
git ls-files --error-unmatch KNOWN_MISTAKES.md 2>&1 || echo "untracked (good)"
```
Expected: both paths echoed by `check-ignore`; the `ls-files` prints `untracked (good)`.

- [ ] **Step 4: Commit + push (docs/config live on main, kept in sync so the #3a reset --hard origin/main can't discard local commits)**

```bash
cd ~/real-estate-campony
git add .gitignore .claude/settings.local.json KNOWN_MISTAKES.md
git commit -m "chore: stop tracking settings.local.json and KNOWN_MISTAKES.md (agency #3b)"
git push origin main
```
(The staged removals + `.gitignore` addition are committed together; the files stay on disk.)

---

## Task 5: `ReviewHealer`

**Files:**
- Create: `~/agency/src/agency/delivery/review_healer.py`
- Test: `~/agency/tests/delivery/test_review_healer.py`

- [ ] **Step 1: Write the failing test**

```python
# ~/agency/tests/delivery/test_review_healer.py
from agency.delivery.git_ops import FakeGitGh
from agency.delivery.review_healer import ReviewHealer, ReviewHealResult
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.review.schemas import Finding
from agency.runtime.workspace import Workspace


def _task() -> Task:
    return Task(id=9, title="Retrofit /about", description="d", acceptance_criteria="ac",
                status=TaskStatus.DONE)


def _imp() -> Finding:
    return Finding(title="raw neutral-300", file="Breadcrumbs.tsx", severity="important",
                   rationale="use a semantic token")


class _Recheck:
    """Returns a queued findings list per call (simulates re-running confirmed_findings)."""

    def __init__(self, results: list[list[Finding]]) -> None:
        self._results = list(results)
        self.calls = 0

    def __call__(self) -> list[Finding]:
        r = self._results[self.calls]
        self.calls += 1
        return r


def test_heals_when_recheck_clears(tmp_path):
    git = FakeGitGh()
    engine = FakeEngine([AgentReply("fixed", None, 5, False)])
    healer = ReviewHealer(git, engine, Workspace(tmp_path), max_attempts=2)
    res = healer.heal(_task(), "branch", [_imp()], _Recheck([[]]))
    assert isinstance(res, ReviewHealResult)
    assert res.findings == []
    assert res.attempts == 1
    assert res.tokens == 5
    assert git.calls.count("commit_all") == 1
    assert git.calls.count("push") == 1


def test_stops_after_max_attempts_when_never_clears(tmp_path):
    git = FakeGitGh()
    engine = FakeEngine([AgentReply("", None, 1, False) for _ in range(2)])
    healer = ReviewHealer(git, engine, Workspace(tmp_path), max_attempts=2)
    res = healer.heal(_task(), "branch", [_imp()], _Recheck([[_imp()], [_imp()]]))
    assert res.attempts == 2
    assert any(f.severity == "important" for f in res.findings)
    assert git.calls.count("push") == 2


def test_no_blocking_does_nothing(tmp_path):
    git = FakeGitGh()
    engine = FakeEngine([])
    minor = [Finding(title="nit", file="x", severity="minor", rationale="r")]
    healer = ReviewHealer(git, engine, Workspace(tmp_path))
    res = healer.heal(_task(), "branch", minor, _Recheck([]))
    assert res.attempts == 0
    assert res.findings == minor
    assert "commit_all" not in git.calls
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_review_healer.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'agency.delivery.review_healer'`

- [ ] **Step 3: Write minimal implementation**

```python
# ~/agency/src/agency/delivery/review_healer.py
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from agency.delivery.git_ops import GitGhPort
from agency.domain import Role, Task
from agency.engine.base import Engine
from agency.review.schemas import Finding
from agency.runtime.engine_runner import EngineRunner
from agency.runtime.workspace import Workspace

_BLOCKING = {"critical", "important"}


@dataclass
class ReviewHealResult:
    findings: list[Finding]
    attempts: int
    tokens: int


def _has_blocking(findings: list[Finding]) -> bool:
    return any(f.severity in _BLOCKING for f in findings)


def _format(findings: list[Finding]) -> str:
    return "\n".join(
        f"- [{f.severity}] {f.title} ({f.file}): {f.rationale}" for f in findings
    )


class ReviewHealer:
    """Bounded review-fix loop: blocking findings -> Developer -> commit -> push -> recheck."""

    def __init__(
        self,
        git_gh: GitGhPort,
        engine: Engine,
        workspace: Workspace,
        model: str | None = None,
        max_attempts: int = 2,
    ) -> None:
        self._git = git_gh
        self._runner = EngineRunner(engine, str(workspace.root), model)
        self._max_attempts = max_attempts

    def heal(
        self,
        task: Task,
        branch: str,
        findings: list[Finding],
        recheck: Callable[[], list[Finding]],
    ) -> ReviewHealResult:
        attempts = 0
        tokens = 0
        while attempts < self._max_attempts and _has_blocking(findings):
            attempts += 1
            blocking = [f for f in findings if f.severity in _BLOCKING]
            fix_task = Task(
                id=task.id,
                title=f"Fix code-review findings for: {task.title}",
                description=(
                    "Address these blocking code-review findings. Change only what is needed "
                    "to resolve them; do not alter unrelated files or behavior.\n\n"
                    f"{_format(blocking)}\n\nOriginal task:\n{task.description}"
                ),
                acceptance_criteria="The listed findings are resolved; behavior unchanged.",
                status=task.status,
            )
            result = self._runner.run(Role.DEVELOPER, fix_task)
            tokens += result.tokens
            self._git.commit_all(f"fix: address code-review findings (attempt {attempts})")
            self._git.push(branch)
            findings = recheck()
        return ReviewHealResult(findings=findings, attempts=attempts, tokens=tokens)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_review_healer.py -q`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/delivery/review_healer.py tests/delivery/test_review_healer.py
git commit -m "feat(delivery): ReviewHealer — bounded code-review fix loop (#1)"
```

---

## Task 6: Integrate `ReviewHealer` into `Shipper` (with a `review` seam)

**Files:**
- Modify: `~/agency/src/agency/delivery/shipper.py`
- Test: `~/agency/tests/delivery/test_shipper.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/delivery/test_shipper.py
from agency.delivery.git_ops import FakeGitGh
from agency.delivery.shipper import Shipper
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.review.schemas import Finding
from agency.runtime.workspace import Workspace


def _done_task() -> Task:
    return Task(id=7, title="Retrofit /about", description="d", acceptance_criteria="ac",
                status=TaskStatus.DONE)


def _imp_finding() -> Finding:
    return Finding(title="raw neutral-300", file="Breadcrumbs.tsx", severity="important",
                   rationale="use a semantic token")


class _ScriptedReview:
    """Returns a queued (findings, tokens) per call, matching confirmed_findings' signature."""

    def __init__(self, results: list[list[Finding]]) -> None:
        self._results = list(results)
        self.calls = 0

    def __call__(self, engine, workspace, task, model=None):
        r = self._results[self.calls]
        self.calls += 1
        return r, 0


def _shipper_with_review(tmp_path, git, review):
    # No screenshots -> visual gate is a no-op; only the review path is exercised.
    return Shipper(
        git_gh=git,
        engine=FakeEngine([AgentReply("fixed", None, 1, False) for _ in range(3)]),
        workspace=Workspace(tmp_path),
        review=review,
        capture=lambda ws, route: [],
    )


def test_review_heal_clears_blocking_then_merges(tmp_path):
    git = FakeGitGh(ci_status="success")
    review = _ScriptedReview([[_imp_finding()], []])  # blocks, then clean after the fix
    shipper = _shipper_with_review(tmp_path, git, review)
    result = shipper.ship(_done_task())
    assert result.merged is True
    assert git.merged is True


def test_review_heal_never_clears_parks(tmp_path):
    git = FakeGitGh(ci_status="success")
    review = _ScriptedReview([[_imp_finding()], [_imp_finding()], [_imp_finding()]])
    shipper = _shipper_with_review(tmp_path, git, review)
    result = shipper.ship(_done_task())
    assert result.merged is False
    assert git.merged is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_shipper.py -q -k review_heal`
Expected: FAIL — `TypeError: Shipper.__init__() got an unexpected keyword argument 'review'`

- [ ] **Step 3: Write minimal implementation**

In `src/agency/delivery/shipper.py`:

Add the import (with the other `agency.review` imports):
```python
from agency.delivery.review_healer import ReviewHealer
```

Add a seam type alias next to `CaptureFn`/`VisualReviewFn`:
```python
ReviewFn = Callable[..., tuple[list[Finding], int]]
```

Add two `__init__` params (after `model`) and store them:
```python
        review: ReviewFn = confirmed_findings,
        max_review_fix: int = 2,
```
```python
        self._review = review
        self._max_review_fix = max_review_fix
```

In `ship()`, replace:
```python
        findings, _ = confirmed_findings(self._engine, self._workspace, task, model=self._model)
```
with:
```python
        findings, _ = self._review(self._engine, self._workspace, task, model=self._model)
        if self._max_review_fix > 0 and any(f.severity in _BLOCKING for f in findings):
            heal = ReviewHealer(
                self._git, self._engine, self._workspace, self._model, self._max_review_fix
            ).heal(
                task,
                branch,
                findings,
                lambda: self._review(
                    self._engine, self._workspace, task, model=self._model
                )[0],
            )
            findings = heal.findings
```

(`confirmed_findings` is already imported; it stays as the default value of the `review` seam.
`_BLOCKING` already exists in this module. `branch` is already defined earlier in `ship()`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/delivery/test_shipper.py tests/delivery/test_shipper_visual.py -q`
Expected: PASS (new tests + existing shipper/visual tests — the default `review` seam keeps them unchanged)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/delivery/shipper.py tests/delivery/test_shipper.py
git commit -m "feat(delivery): run ReviewHealer before the visual gate (#1)"
```

---

## Task 7: Full suite green + rebuild image

**Files:** none (verification + image rebuild)

- [ ] **Step 1: Ruff**

Run: `cd ~/agency && .venv/bin/ruff check src/agency tests`
Expected: `All checks passed!` (fix any E501/import-order issues and re-run)

- [ ] **Step 2: Mypy**

Run: `cd ~/agency && .venv/bin/mypy src/agency/delivery/review_healer.py src/agency/delivery/shipper.py src/agency/orchestrator.py src/agency/app.py src/agency/delivery/git_ops.py`
Expected: `Success: no issues found`

- [ ] **Step 3: Full test suite**

Run: `cd ~/agency && .venv/bin/pytest -q`
Expected: all pass (2 skipped: live-smoke + browser capture-scroll)

- [ ] **Step 4: Commit any fixes**

```bash
cd ~/agency && git add -A && git commit -m "chore: lint/type fixes for pipeline hardening" || echo "nothing to commit"
```

- [ ] **Step 5: Rebuild the sandbox image (bakes the agency changes)**

Run: `cd ~/agency && docker build -t agency-sandbox -f docker/Dockerfile . 2>&1 | tail -3`
Expected: `naming to docker.io/library/agency-sandbox:latest done`

---

## Self-Review

- **Spec coverage:** #3a `reset_workspace` (Task 1) + orchestrator hook (Task 2) + app wiring
  (Task 3); #3b untrack+gitignore the two files (Task 4); #1 `ReviewHealer` (Task 5) + shipper
  integration with the `review` seam before the visual gate, `max_review_fix=2` (Task 6);
  testing + image rebuild (Task 7). Every spec section maps to a task. The forced `checkout -f`
  from the spec's Part 1 is in Task 1 Step 3.
- **Placeholders:** none — every code step shows complete code; commands have expected output.
- **Type consistency:** `reset_workspace(self) -> None` on port/GitGh/FakeGitGh (Task 1) matches
  the `prepare_workspace: Callable[[], None]` hook (Task 2) and `port.reset_workspace` wiring
  (Task 3). `ReviewHealer(git_gh, engine, workspace, model=None, max_attempts=2).heal(task,
  branch, findings, recheck) -> ReviewHealResult(findings, attempts, tokens)` (Task 5) matches the
  Shipper call site (Task 6). `ReviewFn = Callable[..., tuple[list[Finding], int]]` matches
  `confirmed_findings`' return and the `_ScriptedReview` fake. `Finding(title, file, severity,
  rationale)` matches the real dataclass.
