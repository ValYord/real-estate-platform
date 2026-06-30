# Agency Autonomous Delivery (PR → CI → review → gated merge) — Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** When a task reaches DONE, the agency autonomously: creates a feature branch, commits the work, opens a GitHub PR, runs a multi-agent code review (posts findings as PR comments), waits for CI, and **gated-auto-merges to `main`** — merge ONLY if CI is green AND the review found no Critical/Important issues; otherwise leave the PR open for a human.

**Architecture:** A deterministic `Shipper` (plain code, per ADR-001) drives git + `gh` through a thin, mockable `GitGh` wrapper. The orchestrator gains a minimal `on_done(task)` hook (fired when a task transitions to DONE); the `Shipper` is that hook. The code review reuses the engine-based reviewers (`confirmed_findings`). Tests inject `FakeGitGh` + `FakeEngine` so the suite stays offline; real `gh`/CI is exercised only by the first live run.

**Tech Stack:** Python 3.12, stdlib `subprocess`, the `gh` CLI (authenticated as **ValYord**), pytest. Builds on Plans 1–5.

> **Runtime prereqs (already satisfied):** repo `ValYord/real-estate-platform` (public, default `main`); `~/real-estate-campony` tracks `origin/main`; `gh auth switch --user ValYord` active with `repo`+`workflow` scopes. CI: a GitHub Actions workflow must exist for "wait for CI" to be meaningful — the **scaffold task** (first real build) adds `.github/workflows/ci.yml` (lint/test/build), so the first PR has CI.

## Prerequisite
Plans 1–5 complete on `master` of `~/agency` (the agency's OWN repo — distinct from the product repo). Use `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

## Sequencing note
Tasks are processed effectively one-at-a-time by the orchestrator (lowest-id actionable first; a task runs design→dev→qa→DONE before the next starts), so when `on_done` fires the working tree holds only that task's changes. The `Shipper` ships, then syncs `main`, leaving a clean tree for the next task.

## File structure (added by this plan)
```
~/agency/src/agency/delivery/
  __init__.py
  git_ops.py     # GitGh (subprocess wrapper) + FakeGitGh
  shipper.py     # Shipper.ship(task) -> ShipResult (gated merge)
~/agency/src/agency/review/review_diff.py   # confirmed_findings(engine, workspace, task)
~/agency/tests/delivery/ (test_git_ops.py, test_shipper.py)
~/agency/tests/review/test_review_diff.py
```

---

## Task 1: GitGh wrapper + FakeGitGh

**Files:** Create `src/agency/delivery/__init__.py` (empty), `src/agency/delivery/git_ops.py`; `tests/delivery/__init__.py` (empty), `tests/delivery/test_git_ops.py`.

`GitGh` wraps git/gh subprocess calls scoped to a repo dir. `FakeGitGh` records calls and returns scripted CI statuses — for offline tests. We unit-test `FakeGitGh` and the pure `slugify`/branch-name helper; the real subprocess calls are integration-only.

- [ ] **Step 1: Write the failing tests**

```python
# tests/delivery/test_git_ops.py
from agency.delivery.git_ops import FakeGitGh, branch_name


def test_branch_name_slugifies():
    assert branch_name(7, "Add Favorites Filter!") == "agency/task-7-add-favorites-filter"
    assert branch_name(1, "  Price/m2  & DOM  ") == "agency/task-1-price-m2-dom"


def test_fake_gitgh_records_and_scripts():
    gh = FakeGitGh(ci_status="success", pr_url="https://github.com/x/y/pull/3")
    gh.create_branch("agency/task-1-x")
    gh.commit_all("feat: x")
    gh.push("agency/task-1-x")
    url = gh.pr_create("t", "body", base="main", head="agency/task-1-x")
    gh.pr_comment(url, "findings")
    assert gh.wait_ci(url) == "success"
    gh.merge(url)
    gh.sync_main()
    assert url == "https://github.com/x/y/pull/3"
    assert gh.merged is True
    assert "create_branch" in gh.calls and "merge" in gh.calls
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/delivery/test_git_ops.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.delivery'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/delivery/git_ops.py
from __future__ import annotations

import re
import subprocess
import time
from typing import Protocol


def branch_name(task_id: int, title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"agency/task-{task_id}-{slug}"


class GitGhPort(Protocol):
    def create_branch(self, name: str) -> None: ...
    def commit_all(self, message: str) -> None: ...
    def push(self, name: str) -> None: ...
    def pr_create(self, title: str, body: str, base: str, head: str) -> str: ...
    def pr_comment(self, pr_url: str, body: str) -> None: ...
    def wait_ci(self, pr_url: str) -> str: ...
    def merge(self, pr_url: str) -> None: ...
    def sync_main(self) -> None: ...


class GitGh:
    """Real git + gh operations in a repo directory. Not unit-tested (integration)."""

    def __init__(self, repo_dir: str, base: str = "main", ci_timeout_s: int = 1800) -> None:
        self._dir = repo_dir
        self._base = base
        self._ci_timeout_s = ci_timeout_s

    def _run(self, *args: str, check: bool = True) -> str:
        result = subprocess.run(
            args, cwd=self._dir, capture_output=True, text=True, check=check
        )
        return result.stdout.strip()

    def create_branch(self, name: str) -> None:
        self._run("git", "checkout", "-B", name, self._base)

    def commit_all(self, message: str) -> None:
        self._run("git", "add", "-A")
        self._run("git", "commit", "-m", message, check=False)

    def push(self, name: str) -> None:
        self._run("git", "push", "-u", "origin", name)

    def pr_create(self, title: str, body: str, base: str, head: str) -> str:
        return self._run(
            "gh", "pr", "create", "--base", base, "--head", head,
            "--title", title, "--body", body,
        )

    def pr_comment(self, pr_url: str, body: str) -> None:
        self._run("gh", "pr", "comment", pr_url, "--body", body)

    def wait_ci(self, pr_url: str) -> str:
        deadline = self._ci_timeout_s
        while deadline > 0:
            out = self._run("gh", "pr", "checks", pr_url, check=False)
            lowered = out.lower()
            if "pending" in lowered or "in progress" in lowered or out == "":
                time.sleep(20)
                deadline -= 20
                continue
            return "success" if "fail" not in lowered and "error" not in lowered else "failure"
        return "timeout"

    def merge(self, pr_url: str) -> None:
        self._run("gh", "pr", "merge", pr_url, "--squash", "--delete-branch")

    def sync_main(self) -> None:
        self._run("git", "checkout", self._base)
        self._run("git", "pull", "--ff-only", "origin", self._base, check=False)


class FakeGitGh:
    """Offline test double; records calls, scripts CI status."""

    def __init__(self, ci_status: str = "success", pr_url: str = "https://example/pr/1") -> None:
        self._ci_status = ci_status
        self._pr_url = pr_url
        self.calls: list[str] = []
        self.comments: list[str] = []
        self.merged = False
        self.synced = False

    def create_branch(self, name: str) -> None:
        self.calls.append("create_branch")

    def commit_all(self, message: str) -> None:
        self.calls.append("commit_all")

    def push(self, name: str) -> None:
        self.calls.append("push")

    def pr_create(self, title: str, body: str, base: str, head: str) -> str:
        self.calls.append("pr_create")
        return self._pr_url

    def pr_comment(self, pr_url: str, body: str) -> None:
        self.calls.append("pr_comment")
        self.comments.append(body)

    def wait_ci(self, pr_url: str) -> str:
        self.calls.append("wait_ci")
        return self._ci_status

    def merge(self, pr_url: str) -> None:
        self.calls.append("merge")
        self.merged = True

    def sync_main(self) -> None:
        self.calls.append("sync_main")
        self.synced = True
```

- [ ] **Step 4: Run tests + lint + types + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/delivery -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: 2 passed, gates clean.
```bash
cd ~/agency
git add src/agency/delivery/__init__.py src/agency/delivery/git_ops.py tests/delivery/__init__.py tests/delivery/test_git_ops.py
git commit -m "feat: add GitGh wrapper + FakeGitGh for delivery"
```

---

## Task 2: confirmed_findings helper (shared review)

**Files:** Create `src/agency/review/review_diff.py`; modify `src/agency/review/review_runner.py` to use it; create `tests/review/test_review_diff.py`.

Extract the "run reviewers → validate → confirmed findings" logic so both `ReviewQaRunner` and the `Shipper` reuse it.

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_review_diff.py
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.review.review_diff import confirmed_findings
from agency.runtime.workspace import Workspace


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def test_confirmed_findings_filters_to_validated(tmp_path):
    one = {"findings": [{"title": "bug", "file": "a.py", "severity": "important", "rationale": "r"}]}
    none = {"findings": []}
    engine = FakeEngine([
        AgentReply("", one, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", {"is_real": True, "reason": "yes"}, 1, False),
    ])
    findings, tokens = confirmed_findings(engine, Workspace(tmp_path), _task())
    assert len(findings) == 1
    assert findings[0].severity == "important"
    assert tokens == 4


def test_confirmed_findings_drops_rejected(tmp_path):
    one = {"findings": [{"title": "bug", "file": "a.py", "severity": "minor", "rationale": "r"}]}
    none = {"findings": []}
    engine = FakeEngine([
        AgentReply("", one, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", {"is_real": False, "reason": "fp"}, 1, False),
    ])
    findings, _ = confirmed_findings(engine, Workspace(tmp_path), _task())
    assert findings == []
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_review_diff.py -v`
Expected: FAIL — `No module named 'agency.review.review_diff'`

- [ ] **Step 3: Write `src/agency/review/review_diff.py`**

```python
# src/agency/review/review_diff.py
from __future__ import annotations

from agency.domain import Task
from agency.engine.base import Engine
from agency.review.diff import capture_diff
from agency.review.dimensions import REVIEW_DIMENSIONS, ReviewDimension
from agency.review.reviewer import run_reviewer, validate_finding
from agency.review.schemas import Finding
from agency.runtime.workspace import Workspace


def confirmed_findings(
    engine: Engine,
    workspace: Workspace,
    task: Task,
    dimensions: list[ReviewDimension] | None = None,
    model: str | None = None,
) -> tuple[list[Finding], int]:
    """Run all reviewers over the diff, validate each finding, return confirmed ones + tokens."""
    dims = dimensions if dimensions is not None else REVIEW_DIMENSIONS
    diff = capture_diff(workspace)
    cwd = str(workspace.root)
    tokens = 0
    found: list[Finding] = []
    for dim in dims:
        items, used = run_reviewer(engine, dim, task, diff, cwd, model)
        tokens += used
        found.extend(items)
    confirmed: list[Finding] = []
    for finding in found:
        is_real, used = validate_finding(engine, finding, diff, cwd, model)
        tokens += used
        if is_real:
            confirmed.append(finding)
    return confirmed, tokens
```

- [ ] **Step 4: Refactor `ReviewQaRunner.run` to use it**

In `src/agency/review/review_runner.py`, replace the body of `run` so it calls `confirmed_findings(self._engine, self._workspace, task, self._dimensions, self._model)` and maps: any confirmed → `BUG_FOUND` (summary joined), else `SUCCESS`; wrap in the existing try/except → ERROR. Keep the class interface unchanged. (Add `model` param to `__init__` if not already present from Plan 5's minor fix — it is.) The existing `tests/review/test_review_runner.py` must still pass unchanged.

- [ ] **Step 5: Run review tests + suite + lint + types + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green (incl. the unchanged `test_review_runner.py`).
```bash
cd ~/agency
git add src/agency/review/review_diff.py src/agency/review/review_runner.py tests/review/test_review_diff.py
git commit -m "feat: extract confirmed_findings shared by ReviewQaRunner and Shipper"
```

---

## Task 3: Shipper (gated merge)

**Files:** Create `src/agency/delivery/shipper.py`; `tests/delivery/test_shipper.py`.

`Shipper.ship(task)` runs the full delivery flow and gates the merge.

- [ ] **Step 1: Write the failing tests**

```python
# tests/delivery/test_shipper.py
from agency.delivery.git_ops import FakeGitGh
from agency.delivery.shipper import ShipResult, Shipper
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.runtime.workspace import Workspace


def _task() -> Task:
    return Task(id=3, title="Add favorites", description="d", acceptance_criteria="ac",
                status=TaskStatus.DONE)


def _clean_review() -> FakeEngine:
    none = {"findings": []}
    return FakeEngine([AgentReply("", none, 1, False) for _ in range(3)])


def test_merges_when_ci_green_and_no_blocking(tmp_path):
    git = FakeGitGh(ci_status="success")
    shipper = Shipper(git_gh=git, engine=_clean_review(), workspace=Workspace(tmp_path))
    result = shipper.ship(_task())
    assert isinstance(result, ShipResult)
    assert result.merged is True
    assert git.merged is True
    assert git.synced is True


def test_no_merge_when_ci_fails(tmp_path):
    git = FakeGitGh(ci_status="failure")
    shipper = Shipper(git_gh=git, engine=_clean_review(), workspace=Workspace(tmp_path))
    result = shipper.ship(_task())
    assert result.merged is False
    assert git.merged is False
    assert git.synced is True  # still resets the tree for the next task


def test_no_merge_when_blocking_finding(tmp_path):
    git = FakeGitGh(ci_status="success")
    one = {"findings": [{"title": "bug", "file": "a.py", "severity": "critical", "rationale": "r"}]}
    none = {"findings": []}
    engine = FakeEngine([
        AgentReply("", one, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", {"is_real": True, "reason": "confirmed"}, 1, False),
    ])
    shipper = Shipper(git_gh=git, engine=engine, workspace=Workspace(tmp_path))
    result = shipper.ship(_task())
    assert result.merged is False
    assert git.merged is False
    assert "pr_comment" in git.calls  # findings were posted to the PR
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/delivery/test_shipper.py -v`
Expected: FAIL — `No module named 'agency.delivery.shipper'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/delivery/shipper.py
from __future__ import annotations

import logging
from dataclasses import dataclass

from agency.delivery.git_ops import GitGhPort, branch_name
from agency.domain import Task
from agency.engine.base import Engine
from agency.review.review_diff import confirmed_findings
from agency.review.schemas import Finding
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)

_BLOCKING = {"critical", "important"}


@dataclass
class ShipResult:
    pr_url: str
    merged: bool
    ci_status: str
    confirmed_findings: int


def _format_findings(findings: list[Finding]) -> str:
    lines = ["## 🤖 Agency code review", ""]
    for f in findings:
        lines.append(f"- **[{f.severity}]** {f.title} (`{f.file}`) — {f.rationale}")
    return "\n".join(lines)


class Shipper:
    """Deterministic delivery: branch -> commit -> PR -> review -> CI -> gated merge."""

    def __init__(
        self,
        git_gh: GitGhPort,
        engine: Engine,
        workspace: Workspace,
        model: str | None = None,
        base: str = "main",
    ) -> None:
        self._git = git_gh
        self._engine = engine
        self._workspace = workspace
        self._model = model
        self._base = base

    def ship(self, task: Task) -> ShipResult:
        assert task.id is not None
        branch = branch_name(task.id, task.title)
        self._git.create_branch(branch)
        self._git.commit_all(f"feat: {task.title}\n\n{task.description}")
        self._git.push(branch)
        pr_url = self._git.pr_create(
            title=task.title,
            body=f"{task.description}\n\nAcceptance criteria:\n{task.acceptance_criteria}",
            base=self._base,
            head=branch,
        )

        findings, _ = confirmed_findings(self._engine, self._workspace, task, model=self._model)
        if findings:
            self._git.pr_comment(pr_url, _format_findings(findings))

        ci_status = self._git.wait_ci(pr_url)
        blocking = [f for f in findings if f.severity in _BLOCKING]
        merged = False
        if ci_status == "success" and not blocking:
            self._git.merge(pr_url)
            merged = True
        else:
            logger.warning(
                "PR left open for human review: ci=%s blocking=%d", ci_status, len(blocking)
            )

        self._git.sync_main()
        return ShipResult(pr_url=pr_url, merged=merged, ci_status=ci_status,
                          confirmed_findings=len(findings))
```

- [ ] **Step 4: Run tests + suite + lint + types + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/delivery -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green
```bash
cd ~/agency
git add src/agency/delivery/shipper.py tests/delivery/test_shipper.py
git commit -m "feat: add Shipper (gated auto-merge: CI green + no critical/important)"
```

---

## Task 4: Orchestrator on_done hook

**Files:** Modify `src/agency/orchestrator.py`; modify `tests/test_orchestrator.py` (append).

Add an optional `on_done` callback fired when a task transitions to DONE. Backward compatible (defaults to None).

- [ ] **Step 1: Write the failing test (append)**

```python
# tests/test_orchestrator.py  (append)
def test_on_done_fires_when_task_reaches_done(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    shipped: list[int] = []
    orch = Orchestrator(
        tasks=tasks,
        events=EventRepository(conn),
        runner=FakeAgentRunner(),
        config=OrchestratorConfig(),
        on_done=lambda task: shipped.append(task.id),
    )
    orch.run(max_steps=20)
    assert shipped == [task_id]  # fired exactly once, on DONE
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/test_orchestrator.py -k on_done -v`
Expected: FAIL — `Orchestrator.__init__` has no `on_done`.

- [ ] **Step 3: Implement**

In `src/agency/orchestrator.py`:
- Add `from collections.abc import Callable` (or `from typing import Callable`) and `from agency.domain import Task` import if not present.
- Add `on_done: Callable[[Task], None] | None = None` to `__init__`, store `self._on_done = on_done`.
- In `step()`, the SUCCESS branch currently does `self._tasks.update(task.id, status=next_status_on_success(task.status))`. Change it to capture the next status and fire the hook on DONE:
```python
        if result.outcome is Outcome.SUCCESS:
            next_status = next_status_on_success(task.status)
            self._tasks.update(task.id, status=next_status)
            if next_status is TaskStatus.DONE and self._on_done is not None:
                self._on_done(self._tasks.get(task.id))
            return True
```
(Keep the rest of `step` unchanged. `TaskStatus` is already imported.)

- [ ] **Step 4: Run suite + lint + types + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green (all prior orchestrator tests still pass; on_done defaults to None)
```bash
cd ~/agency
git add src/agency/orchestrator.py tests/test_orchestrator.py
git commit -m "feat: add Orchestrator on_done hook (fires on DONE transition)"
```

---

## Task 5: Wire delivery into run_agency + CLI `--deliver`

**Files:** Modify `src/agency/app.py`, `src/agency/cli.py`; update `tests/test_app.py`.

- [ ] **Step 1: Update `run_agency`** to optionally ship on done

```python
# src/agency/app.py  — add params + on_done wiring
from agency.delivery.git_ops import GitGh, GitGhPort
from agency.delivery.shipper import Shipper
# ...
def run_agency(
    conn, workspace, engine,
    token_budget=None, max_steps=1000, model=None, review=False,
    deliver=False, git_gh: GitGhPort | None = None,
) -> int:
    runner = build_composite_runner(engine, workspace, model, review)
    on_done = None
    if deliver:
        port = git_gh if git_gh is not None else GitGh(str(workspace.root))
        shipper = Shipper(git_gh=port, engine=engine, workspace=workspace, model=model)
        on_done = shipper.ship  # Callable[[Task], None]-compatible (returns ShipResult, ignored)
    orchestrator = Orchestrator(
        tasks=TaskRepository(conn), events=EventRepository(conn),
        runner=runner, config=OrchestratorConfig(token_budget=token_budget), on_done=on_done,
    )
    steps = orchestrator.run(max_steps=max_steps)
    record_lessons_if_failed(conn=conn, workspace=workspace, engine=engine, model=model)
    return steps
```
Keep existing imports; add the two delivery imports. `on_done = shipper.ship` works because the orchestrator ignores the return value.

- [ ] **Step 2: Add a delivery test to `tests/test_app.py`**

```python
# tests/test_app.py  (append)
def test_run_agency_ships_on_done(tmp_path):
    from agency.delivery.git_ops import FakeGitGh
    from agency.engine.base import AgentReply
    from agency.engine.fake import FakeEngine

    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    git = FakeGitGh(ci_status="success")
    # designer, developer, qa-verdict, then 3 review reviewers (all clean) for the shipper
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
    assert tasks.get(task_id).status is TaskStatus.DONE
    assert git.merged is True
```
(Ensure `Workspace`, `connect`, `TaskRepository`, `TaskStatus`, `run_agency` are imported at the top.)

- [ ] **Step 3: CLI `--deliver`**

In `src/agency/cli.py`, on the `run` subparser add `--deliver` (action="store_true", help="commit→PR→CI→review→gated-merge each finished task"). Pass `deliver=args.deliver` into `run_agency(...)`. (The real `GitGh` is built inside `run_agency` from the workspace when `git_gh` is None.)

- [ ] **Step 4: Run suite + lint + types + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green
```bash
cd ~/agency
git add src/agency/app.py src/agency/cli.py tests/test_app.py
git commit -m "feat: wire autonomous delivery into run_agency + agency run --deliver"
```

---

## Task 6: ADR-007 + final review

**Files:** Create `docs/adr/007-autonomous-delivery.md`; update `CLAUDE.md` Tech Stack note.

- [ ] **Step 1: ADR-007**
```markdown
# ADR-007: Autonomous delivery with gated auto-merge
**Status:** Accepted
**Decision:** On a task reaching DONE, a deterministic `Shipper` (behind the orchestrator's
`on_done` hook) creates a feature branch, commits, opens a GitHub PR via `gh`, runs the
multi-agent code review (posts findings as PR comments), waits for CI, and merges to `main`
ONLY if CI is green AND the review has no Critical/Important confirmed findings; otherwise the
PR is left open for a human. Enabled via `agency run --deliver`.
**Why:** Close the loop from task to merged code without a human in the hot path, while keeping
a safety gate (CI + severity-gated review) on `main`.
**Consequence:** Requires a GitHub remote + `gh` auth + a CI workflow (added by the scaffold
task). Tasks ship sequentially (one task's diff per PR). ADR-005 still applies. To require a
human before every merge instead, run without `--deliver` and merge PRs manually.
```
Add a one-line note to `CLAUDE.md`.

- [ ] **Step 2: Full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**
```bash
cd ~/agency
git add docs/adr/007-autonomous-delivery.md CLAUDE.md
git commit -m "docs: ADR-007 autonomous delivery"
```

---

## Definition of Done (Plan 6)
- `pytest` green offline; ruff + mypy clean.
- `agency run --deliver` ships each DONE task: branch → commit → PR → review-comments → CI wait → **gated merge** (CI green + no Critical/Important) → sync main. Otherwise the PR stays open.
- Suite is offline (`FakeGitGh` + `FakeEngine`); real `gh`/CI exercised by the first live run.

## First live run (scaffold, goes through delivery)
1. PM (talk) creates the scaffold task — and it MUST include adding `.github/workflows/ci.yml` (lint + test + build) so CI exists.
2. `export CLAUDE_CODE_OAUTH_TOKEN=...` (ValYord), `gh auth switch --user ValYord`.
3. `~/agency/.venv/bin/agency --workspace /Users/valeryordanyan/real-estate-campony run --deliver --budget 250000 --max-steps 10`
4. Watch the PR appear on `ValYord/real-estate-platform`, CI run, review comments post, and (if green + clean) auto-merge to `main`.

## Follow-ups
- Branch protection on `main` as defense-in-depth.
- Per-PR CI logs surfaced on failure.
- Parallel reviewers.
