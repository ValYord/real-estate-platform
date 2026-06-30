# Agency Orchestrator Core — Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic, non-LLM core of the agency platform — a task queue, state machine, routing, and an autonomous loop with retry/budget safety — fully driven by a pluggable `AgentRunner` interface with a fake implementation for tests.

**Architecture:** Plain Python core (no LLM calls). Tasks live in SQLite. An `Orchestrator` pulls actionable tasks, asks an `AgentRunner` to act for the role implied by the task's status, applies the result through a pure state machine, and loops until no work remains or the token budget is exhausted. Real LLM agents arrive in Plan 2 by implementing the `AgentRunner` protocol.

**Tech Stack:** Python 3.12, stdlib `sqlite3`, `dataclasses`/`enum`, pytest, ruff, mypy. No third-party runtime deps in this plan.

---

## Project Location

The agency is its own project/repo at `~/agency/` (sibling to other projects). All file paths below are **relative to that project root** unless noted. If you want it elsewhere, change only Task 0.

## File Structure (created by this plan)

```
~/agency/
  pyproject.toml            # project metadata, deps, ruff/mypy/pytest config
  CLAUDE.md                 # Python conventions + Known Mistakes (quality from day 1)
  .gitignore
  docs/adr/
    001-hybrid-orchestrator.md
    002-sqlite-state.md
    003-claude-agent-sdk.md
    004-loop-safety-limits.md
  src/agency/
    __init__.py
    domain.py               # Role, TaskStatus, Outcome enums; Task, AgentResult dataclasses
    db.py                   # connection + schema init
    repository.py           # TaskRepository, EventRepository
    state_machine.py        # pure routing: role_for_status, next_status_on_success
    runner.py               # AgentRunner protocol + FakeAgentRunner
    config.py               # OrchestratorConfig (max_retry, token_budget)
    orchestrator.py         # the loop: step() and run()
  tests/
    conftest.py             # in-memory db fixture
    test_domain.py
    test_repository.py
    test_state_machine.py
    test_runner.py
    test_orchestrator.py
```

---

## Task 0: Project scaffold, tooling, conventions, ADRs

**Files:**
- Create: `~/agency/pyproject.toml`, `~/agency/.gitignore`, `~/agency/CLAUDE.md`
- Create: `~/agency/docs/adr/001-hybrid-orchestrator.md` (+ 002, 003, 004)
- Create: `~/agency/src/agency/__init__.py`, `~/agency/tests/__init__.py`

- [ ] **Step 1: Create project + git init**

```bash
mkdir -p ~/agency/src/agency ~/agency/tests ~/agency/docs/adr
cd ~/agency
git init
```

- [ ] **Step 2: Write `pyproject.toml`**

```toml
[project]
name = "agency"
version = "0.1.0"
description = "Autonomous multi-agent orchestration platform"
requires-python = ">=3.12"
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.6", "mypy>=1.11"]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.ruff]
line-length = 100
src = ["src", "tests"]

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
python_version = "3.12"
strict = true
mypy_path = "src"
packages = ["agency"]

[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
```

- [ ] **Step 3: Write `.gitignore`**

```gitignore
__pycache__/
*.pyc
.venv/
.mypy_cache/
.ruff_cache/
.pytest_cache/
*.db
```

- [ ] **Step 4: Write `CLAUDE.md` (conventions + Known Mistakes)**

```markdown
# Agency — Project Conventions

## Tech Stack
- Python 3.12, stdlib sqlite3, pytest, ruff, mypy (strict)
- LLM engine (Plan 2+): Claude Agent SDK

## Conventions
- **Language:** All code, comments, docs, commits in **English only**.
- **Types:** Full type hints; `mypy --strict` must pass.
- **Logging:** Use the stdlib `logging` module. Never use `print()` in library code.
- **Business logic placement:** The `Orchestrator` only coordinates. State-transition rules
  live in `state_machine.py` (pure functions). DB access lives only in `repository.py`.
- **DB access:** Only `repository.py` touches SQL. No SQL elsewhere.
- **Naming:** files `snake_case`, classes `PascalCase`, functions/vars `snake_case`.

## Testing
- pytest, tests colocated under `tests/`, named `test_*.py`.
- TDD: write the failing test first.
- Run: `pytest` (all), `ruff check .`, `mypy` (must all pass before commit).

## Architecture Decision Records
See `docs/adr/`. New significant decisions get a new ADR.

## Known Mistakes — Do Not Repeat
<!-- Auto-updated when reviews find recurring issues. Read before writing code. -->
```

- [ ] **Step 5: Write the four ADRs**

`docs/adr/001-hybrid-orchestrator.md`:
```markdown
# ADR-001: Hybrid orchestrator (code core + LLM agents)
**Status:** Accepted
**Decision:** The orchestrator (queue, state, routing, loop) is plain deterministic Python,
not an LLM. Only the specialist agents are LLM-backed, behind the `AgentRunner` interface.
**Why:** Cheaper, reliable, deterministically testable, and easy to self-improve later.
```

`docs/adr/002-sqlite-state.md`:
```markdown
# ADR-002: SQLite for state
**Status:** Accepted
**Decision:** Persist tasks/events in SQLite (a file). Postgres is deferred until 24/7 operation.
**Why:** Zero infra to start; trivial to test with in-memory databases.
```

`docs/adr/003-claude-agent-sdk.md`:
```markdown
# ADR-003: Claude Agent SDK for agents
**Status:** Accepted
**Decision:** Each LLM agent runs via the Claude Agent SDK (tool use, file edit, bash),
implementing the `AgentRunner` protocol. Wired in Plan 2.
**Why:** Reuse a proven agent engine instead of reinventing tool-use plumbing.
```

`docs/adr/004-loop-safety-limits.md`:
```markdown
# ADR-004: Loop safety limits
**Status:** Accepted
**Decision:** Every task has a max_retry (default 3); the whole run has a token budget.
Exceeding retries marks a task FAILED; exceeding the budget stops the loop.
**Why:** In autonomous mode, prevent infinite Dev↔QA ping-pong and runaway cost.
```

- [ ] **Step 6: Create package markers**

```bash
touch ~/agency/src/agency/__init__.py ~/agency/tests/__init__.py
```

- [ ] **Step 7: Install dev deps and verify tooling runs**

Run: `cd ~/agency && python3 -m pip install -e ".[dev]"`
Expected: installs pytest, ruff, mypy with no errors.

- [ ] **Step 8: Commit**

```bash
cd ~/agency
git add -A
git commit -m "chore: scaffold agency project (tooling, conventions, ADRs)"
```

---

## Task 1: Domain types

**Files:**
- Create: `src/agency/domain.py`
- Test: `tests/test_domain.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_domain.py
from agency.domain import Role, TaskStatus, Outcome, Task, AgentResult


def test_task_defaults():
    task = Task(id=None, title="t", description="d", acceptance_criteria="ac")
    assert task.status is TaskStatus.NEW
    assert task.parent_id is None
    assert task.assigned_role is None
    assert task.retries == 0


def test_enums_are_string_valued():
    assert Role.DEVELOPER.value == "developer"
    assert TaskStatus.IN_QA.value == "in_qa"
    assert Outcome.BUG_FOUND.value == "bug_found"


def test_agent_result_defaults():
    result = AgentResult(outcome=Outcome.SUCCESS, summary="ok")
    assert result.tokens == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && pytest tests/test_domain.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.domain'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/domain.py
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Role(str, Enum):
    PM = "pm"
    DESIGNER = "designer"
    DEVELOPER = "developer"
    QA = "qa"


class TaskStatus(str, Enum):
    NEW = "new"
    IN_DESIGN = "in_design"
    IN_DEV = "in_dev"
    IN_QA = "in_qa"
    DONE = "done"
    FAILED = "failed"


class Outcome(str, Enum):
    SUCCESS = "success"
    BUG_FOUND = "bug_found"
    ERROR = "error"


@dataclass
class Task:
    id: int | None
    title: str
    description: str
    acceptance_criteria: str
    status: TaskStatus = TaskStatus.NEW
    parent_id: int | None = None
    assigned_role: Role | None = None
    retries: int = 0
    created_at: str = ""
    updated_at: str = ""


@dataclass
class AgentResult:
    outcome: Outcome
    summary: str
    tokens: int = 0
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && pytest tests/test_domain.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/domain.py tests/test_domain.py
git commit -m "feat: add domain types (Role, TaskStatus, Outcome, Task, AgentResult)"
```

---

## Task 2: Database connection and schema

**Files:**
- Create: `src/agency/db.py`
- Test: `tests/test_repository.py` (schema portion), `tests/conftest.py`

- [ ] **Step 1: Write the conftest fixture and failing schema test**

```python
# tests/conftest.py
import sqlite3

import pytest

from agency.db import init_schema


@pytest.fixture
def conn() -> sqlite3.Connection:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    init_schema(connection)
    return connection
```

```python
# tests/test_repository.py
def test_schema_creates_expected_tables(conn):
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    names = {row["name"] for row in rows}
    assert {"tasks", "events"} <= names
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && pytest tests/test_repository.py::test_schema_creates_expected_tables -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.db'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/db.py
from __future__ import annotations

import sqlite3

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    status TEXT NOT NULL,
    parent_id INTEGER,
    assigned_role TEXT,
    retries INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    result TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(path: str) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    init_schema(connection)
    return connection


def init_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(_SCHEMA)
    connection.commit()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && pytest tests/test_repository.py::test_schema_creates_expected_tables -v`
Expected: 1 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/db.py tests/conftest.py tests/test_repository.py
git commit -m "feat: add sqlite connection and schema (tasks, events)"
```

---

## Task 3: TaskRepository

**Files:**
- Create: `src/agency/repository.py`
- Test: `tests/test_repository.py` (append)

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_repository.py  (append)
from agency.domain import Role, TaskStatus
from agency.repository import TaskRepository


def test_create_and_get_task(conn):
    repo = TaskRepository(conn)
    task_id = repo.create(title="t", description="d", acceptance_criteria="ac")
    task = repo.get(task_id)
    assert task.id == task_id
    assert task.title == "t"
    assert task.status is TaskStatus.NEW


def test_update_status_and_role(conn):
    repo = TaskRepository(conn)
    task_id = repo.create(title="t", description="d", acceptance_criteria="ac")
    repo.update(task_id, status=TaskStatus.IN_DESIGN, assigned_role=Role.DESIGNER)
    task = repo.get(task_id)
    assert task.status is TaskStatus.IN_DESIGN
    assert task.assigned_role is Role.DESIGNER


def test_increment_retries(conn):
    repo = TaskRepository(conn)
    task_id = repo.create(title="t", description="d", acceptance_criteria="ac")
    repo.update(task_id, retries=2)
    assert repo.get(task_id).retries == 2


def test_list_actionable_excludes_terminal(conn):
    repo = TaskRepository(conn)
    a = repo.create(title="a", description="d", acceptance_criteria="ac")
    b = repo.create(title="b", description="d", acceptance_criteria="ac")
    repo.update(b, status=TaskStatus.DONE)
    actionable = repo.list_actionable()
    ids = [t.id for t in actionable]
    assert a in ids
    assert b not in ids


def test_create_child_task_with_parent(conn):
    repo = TaskRepository(conn)
    parent = repo.create(title="p", description="d", acceptance_criteria="ac")
    child = repo.create(
        title="fix", description="bug", acceptance_criteria="ac", parent_id=parent
    )
    assert repo.get(child).parent_id == parent
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_repository.py -v`
Expected: the new tests FAIL with `ModuleNotFoundError: No module named 'agency.repository'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/repository.py
from __future__ import annotations

import sqlite3

from agency.domain import Role, Task, TaskStatus

_TERMINAL = (TaskStatus.DONE.value, TaskStatus.FAILED.value)


def _row_to_task(row: sqlite3.Row) -> Task:
    return Task(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        acceptance_criteria=row["acceptance_criteria"],
        status=TaskStatus(row["status"]),
        parent_id=row["parent_id"],
        assigned_role=Role(row["assigned_role"]) if row["assigned_role"] else None,
        retries=row["retries"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class TaskRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection

    def create(
        self,
        title: str,
        description: str,
        acceptance_criteria: str,
        parent_id: int | None = None,
    ) -> int:
        cursor = self._conn.execute(
            "INSERT INTO tasks (title, description, acceptance_criteria, status, parent_id) "
            "VALUES (?, ?, ?, ?, ?)",
            (title, description, acceptance_criteria, TaskStatus.NEW.value, parent_id),
        )
        self._conn.commit()
        return int(cursor.lastrowid)

    def get(self, task_id: int) -> Task:
        row = self._conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row is None:
            raise KeyError(f"task {task_id} not found")
        return _row_to_task(row)

    def update(
        self,
        task_id: int,
        status: TaskStatus | None = None,
        assigned_role: Role | None = None,
        retries: int | None = None,
    ) -> None:
        sets: list[str] = []
        values: list[object] = []
        if status is not None:
            sets.append("status = ?")
            values.append(status.value)
        if assigned_role is not None:
            sets.append("assigned_role = ?")
            values.append(assigned_role.value)
        if retries is not None:
            sets.append("retries = ?")
            values.append(retries)
        if not sets:
            return
        sets.append("updated_at = datetime('now')")
        values.append(task_id)
        self._conn.execute(f"UPDATE tasks SET {', '.join(sets)} WHERE id = ?", values)
        self._conn.commit()

    def list_actionable(self) -> list[Task]:
        rows = self._conn.execute(
            "SELECT * FROM tasks WHERE status NOT IN (?, ?) ORDER BY id",
            _TERMINAL,
        ).fetchall()
        return [_row_to_task(row) for row in rows]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/test_repository.py -v`
Expected: all repository tests passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/repository.py tests/test_repository.py
git commit -m "feat: add TaskRepository (create, get, update, list_actionable)"
```

---

## Task 4: EventRepository

**Files:**
- Modify: `src/agency/repository.py` (append class)
- Test: `tests/test_repository.py` (append)

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_repository.py  (append)
from agency.repository import EventRepository


def test_append_and_list_events(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    events = EventRepository(conn)
    events.append(task_id=task_id, agent="developer", action="run", result="success", tokens=12)
    events.append(task_id=task_id, agent="qa", action="run", result="bug_found", tokens=8)
    listed = events.list_by_task(task_id)
    assert [e["agent"] for e in listed] == ["developer", "qa"]
    assert listed[0]["tokens"] == 12


def test_total_tokens(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    events = EventRepository(conn)
    events.append(task_id=task_id, agent="developer", action="run", result="success", tokens=10)
    events.append(task_id=task_id, agent="qa", action="run", result="success", tokens=5)
    assert events.total_tokens() == 15
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_repository.py -k event -v`
Expected: FAIL with `ImportError: cannot import name 'EventRepository'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/repository.py  (append at end of file)
class EventRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self._conn = connection

    def append(
        self, task_id: int, agent: str, action: str, result: str, tokens: int = 0
    ) -> None:
        self._conn.execute(
            "INSERT INTO events (task_id, agent, action, result, tokens) "
            "VALUES (?, ?, ?, ?, ?)",
            (task_id, agent, action, result, tokens),
        )
        self._conn.commit()

    def list_by_task(self, task_id: int) -> list[sqlite3.Row]:
        return self._conn.execute(
            "SELECT * FROM events WHERE task_id = ? ORDER BY id", (task_id,)
        ).fetchall()

    def total_tokens(self) -> int:
        row = self._conn.execute("SELECT COALESCE(SUM(tokens), 0) AS total FROM events").fetchone()
        return int(row["total"])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/test_repository.py -v`
Expected: all passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/repository.py tests/test_repository.py
git commit -m "feat: add EventRepository (append, list_by_task, total_tokens)"
```

---

## Task 5: State machine (pure routing)

**Files:**
- Create: `src/agency/state_machine.py`
- Test: `tests/test_state_machine.py`

State rules:
- `role_for_status`: which role acts on a given status — IN_DESIGN→DESIGNER, IN_DEV→DEVELOPER, IN_QA→QA.
- `next_status_on_success`: NEW→IN_DESIGN, IN_DESIGN→IN_DEV, IN_DEV→IN_QA, IN_QA→DONE.
- `is_actor_status`: True for IN_DESIGN/IN_DEV/IN_QA (statuses an agent acts on). NEW is advanced without an agent.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_state_machine.py
import pytest

from agency.domain import Role, TaskStatus
from agency.state_machine import (
    is_actor_status,
    next_status_on_success,
    role_for_status,
)


def test_role_for_status():
    assert role_for_status(TaskStatus.IN_DESIGN) is Role.DESIGNER
    assert role_for_status(TaskStatus.IN_DEV) is Role.DEVELOPER
    assert role_for_status(TaskStatus.IN_QA) is Role.QA


def test_role_for_non_actor_status_raises():
    with pytest.raises(ValueError):
        role_for_status(TaskStatus.NEW)
    with pytest.raises(ValueError):
        role_for_status(TaskStatus.DONE)


def test_next_status_on_success_chain():
    assert next_status_on_success(TaskStatus.NEW) is TaskStatus.IN_DESIGN
    assert next_status_on_success(TaskStatus.IN_DESIGN) is TaskStatus.IN_DEV
    assert next_status_on_success(TaskStatus.IN_DEV) is TaskStatus.IN_QA
    assert next_status_on_success(TaskStatus.IN_QA) is TaskStatus.DONE


def test_next_status_on_terminal_raises():
    with pytest.raises(ValueError):
        next_status_on_success(TaskStatus.DONE)


def test_is_actor_status():
    assert is_actor_status(TaskStatus.IN_DEV) is True
    assert is_actor_status(TaskStatus.NEW) is False
    assert is_actor_status(TaskStatus.DONE) is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_state_machine.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.state_machine'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/state_machine.py
from __future__ import annotations

from agency.domain import Role, TaskStatus

_ROLE_BY_STATUS: dict[TaskStatus, Role] = {
    TaskStatus.IN_DESIGN: Role.DESIGNER,
    TaskStatus.IN_DEV: Role.DEVELOPER,
    TaskStatus.IN_QA: Role.QA,
}

_NEXT_ON_SUCCESS: dict[TaskStatus, TaskStatus] = {
    TaskStatus.NEW: TaskStatus.IN_DESIGN,
    TaskStatus.IN_DESIGN: TaskStatus.IN_DEV,
    TaskStatus.IN_DEV: TaskStatus.IN_QA,
    TaskStatus.IN_QA: TaskStatus.DONE,
}


def role_for_status(status: TaskStatus) -> Role:
    try:
        return _ROLE_BY_STATUS[status]
    except KeyError:
        raise ValueError(f"no acting role for status {status.value}") from None


def next_status_on_success(status: TaskStatus) -> TaskStatus:
    try:
        return _NEXT_ON_SUCCESS[status]
    except KeyError:
        raise ValueError(f"no successor for status {status.value}") from None


def is_actor_status(status: TaskStatus) -> bool:
    return status in _ROLE_BY_STATUS
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/test_state_machine.py -v`
Expected: all passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/state_machine.py tests/test_state_machine.py
git commit -m "feat: add pure state machine (routing + transitions)"
```

---

## Task 6: AgentRunner protocol + FakeAgentRunner

**Files:**
- Create: `src/agency/runner.py`
- Test: `tests/test_runner.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_runner.py
from agency.domain import AgentResult, Outcome, Role, Task, TaskStatus
from agency.runner import FakeAgentRunner


def _task(status: TaskStatus) -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=status)


def test_fake_runner_default_success():
    runner = FakeAgentRunner()
    result = runner.run(Role.DEVELOPER, _task(TaskStatus.IN_DEV))
    assert result.outcome is Outcome.SUCCESS


def test_fake_runner_scripted_per_role():
    runner = FakeAgentRunner(
        scripts={Role.QA: [AgentResult(Outcome.BUG_FOUND, "bug"), AgentResult(Outcome.SUCCESS, "ok")]}
    )
    first = runner.run(Role.QA, _task(TaskStatus.IN_QA))
    second = runner.run(Role.QA, _task(TaskStatus.IN_QA))
    assert first.outcome is Outcome.BUG_FOUND
    assert second.outcome is Outcome.SUCCESS


def test_fake_runner_records_tokens():
    runner = FakeAgentRunner(default_tokens=7)
    result = runner.run(Role.DESIGNER, _task(TaskStatus.IN_DESIGN))
    assert result.tokens == 7
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runner'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runner.py
from __future__ import annotations

from typing import Protocol

from agency.domain import AgentResult, Outcome, Role, Task


class AgentRunner(Protocol):
    def run(self, role: Role, task: Task) -> AgentResult: ...


class FakeAgentRunner:
    """Deterministic runner for tests. Optionally scripted per role; otherwise SUCCESS."""

    def __init__(
        self,
        scripts: dict[Role, list[AgentResult]] | None = None,
        default_tokens: int = 0,
    ) -> None:
        self._scripts = {role: list(results) for role, results in (scripts or {}).items()}
        self._default_tokens = default_tokens

    def run(self, role: Role, task: Task) -> AgentResult:
        queue = self._scripts.get(role)
        if queue:
            return queue.pop(0)
        return AgentResult(outcome=Outcome.SUCCESS, summary=f"{role.value} ok", tokens=self._default_tokens)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/test_runner.py -v`
Expected: all passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runner.py tests/test_runner.py
git commit -m "feat: add AgentRunner protocol and FakeAgentRunner"
```

---

## Task 7: Config + Orchestrator.step (happy path)

**Files:**
- Create: `src/agency/config.py`
- Create: `src/agency/orchestrator.py`
- Test: `tests/test_orchestrator.py`

`Orchestrator.step()` processes one actionable task:
1. Pick the lowest-id actionable task.
2. If status is NEW, advance to IN_DESIGN (no agent), return True.
3. Otherwise run the role for the status; on SUCCESS advance via `next_status_on_success`,
   record an event. Return True if any task was processed, else False.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_orchestrator.py
from agency.config import OrchestratorConfig
from agency.domain import TaskStatus
from agency.orchestrator import Orchestrator
from agency.repository import EventRepository, TaskRepository
from agency.runner import FakeAgentRunner


def _orch(conn, runner=None, config=None):
    return Orchestrator(
        tasks=TaskRepository(conn),
        events=EventRepository(conn),
        runner=runner or FakeAgentRunner(),
        config=config or OrchestratorConfig(),
    )


def test_step_advances_new_to_in_design(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    orch = _orch(conn)
    did_work = orch.step()
    assert did_work is True
    assert tasks.get(task_id).status is TaskStatus.IN_DESIGN


def test_step_runs_designer_and_advances_to_in_dev(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    tasks.update(task_id, status=TaskStatus.IN_DESIGN)
    orch = _orch(conn)
    orch.step()
    assert tasks.get(task_id).status is TaskStatus.IN_DEV


def test_step_returns_false_when_no_actionable(conn):
    orch = _orch(conn)
    assert orch.step() is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && pytest tests/test_orchestrator.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.config'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/config.py
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class OrchestratorConfig:
    max_retry: int = 3
    token_budget: int | None = None  # None = unlimited
```

```python
# src/agency/orchestrator.py
from __future__ import annotations

import logging

from agency.config import OrchestratorConfig
from agency.domain import Outcome, TaskStatus
from agency.repository import EventRepository, TaskRepository
from agency.runner import AgentRunner
from agency.state_machine import is_actor_status, next_status_on_success, role_for_status

logger = logging.getLogger(__name__)


class Orchestrator:
    def __init__(
        self,
        tasks: TaskRepository,
        events: EventRepository,
        runner: AgentRunner,
        config: OrchestratorConfig,
    ) -> None:
        self._tasks = tasks
        self._events = events
        self._runner = runner
        self._config = config

    def step(self) -> bool:
        actionable = self._tasks.list_actionable()
        if not actionable:
            return False
        task = actionable[0]
        assert task.id is not None  # loaded from DB; always set

        if task.status is TaskStatus.NEW:
            self._tasks.update(task.id, status=next_status_on_success(TaskStatus.NEW))
            return True

        if not is_actor_status(task.status):
            return False

        role = role_for_status(task.status)
        self._tasks.update(task.id, assigned_role=role)
        result = self._runner.run(role, task)
        self._events.append(
            task_id=task.id,
            agent=role.value,
            action="run",
            result=result.outcome.value,
            tokens=result.tokens,
        )
        if result.outcome is Outcome.SUCCESS:
            self._tasks.update(task.id, status=next_status_on_success(task.status))
        return True
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && pytest tests/test_orchestrator.py -v`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/config.py src/agency/orchestrator.py tests/test_orchestrator.py
git commit -m "feat: add OrchestratorConfig and Orchestrator.step happy path"
```

---

## Task 8: Bug loop, retry limit, token budget

**Files:**
- Modify: `src/agency/orchestrator.py` (extend `step`)
- Test: `tests/test_orchestrator.py` (append)

Rules added:
- On `BUG_FOUND` (from QA at IN_QA): increment `retries`, move status back to IN_DEV.
  If new `retries > config.max_retry`, mark task FAILED instead.
- On `ERROR`: same retry accounting as BUG_FOUND but status stays put (re-run same stage),
  and FAILED when retries exceed max.
- Before running an agent, if `config.token_budget` is set and `events.total_tokens()` already
  `>= token_budget`, skip running (return False — loop stops).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_orchestrator.py  (append)
from agency.domain import AgentResult, Outcome, Role


def test_qa_bug_sends_task_back_to_in_dev_and_increments_retries(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    tasks.update(task_id, status=TaskStatus.IN_QA)
    runner = FakeAgentRunner(scripts={Role.QA: [AgentResult(Outcome.BUG_FOUND, "bug")]})
    orch = _orch(conn, runner=runner)
    orch.step()
    task = tasks.get(task_id)
    assert task.status is TaskStatus.IN_DEV
    assert task.retries == 1


def test_retries_exceeding_max_marks_failed(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    tasks.update(task_id, status=TaskStatus.IN_QA, retries=3)
    runner = FakeAgentRunner(scripts={Role.QA: [AgentResult(Outcome.BUG_FOUND, "bug")]})
    orch = _orch(conn, runner=runner, config=OrchestratorConfig(max_retry=3))
    orch.step()
    assert tasks.get(task_id).status is TaskStatus.FAILED


def test_token_budget_stops_processing(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    tasks.update(task_id, status=TaskStatus.IN_DEV)
    events = EventRepository(conn)
    events.append(task_id=task_id, agent="seed", action="run", result="success", tokens=100)
    orch = _orch(conn, config=OrchestratorConfig(token_budget=50))
    assert orch.step() is False
    assert tasks.get(task_id).status is TaskStatus.IN_DEV  # untouched
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_orchestrator.py -k "bug or retries or budget" -v`
Expected: FAIL (current `step` ignores BUG_FOUND, retries, and budget)

- [ ] **Step 3: Write the implementation (replace `step` in `orchestrator.py`)**

```python
# src/agency/orchestrator.py  — replace the step() method with:
    def step(self) -> bool:
        actionable = self._tasks.list_actionable()
        if not actionable:
            return False
        task = actionable[0]
        assert task.id is not None  # loaded from DB; always set

        if task.status is TaskStatus.NEW:
            self._tasks.update(task.id, status=next_status_on_success(TaskStatus.NEW))
            return True

        if not is_actor_status(task.status):
            return False

        budget = self._config.token_budget
        if budget is not None and self._events.total_tokens() >= budget:
            logger.warning("token budget %s reached; stopping", budget)
            return False

        role = role_for_status(task.status)
        self._tasks.update(task.id, assigned_role=role)
        result = self._runner.run(role, task)
        self._events.append(
            task_id=task.id,
            agent=role.value,
            action="run",
            result=result.outcome.value,
            tokens=result.tokens,
        )

        if result.outcome is Outcome.SUCCESS:
            self._tasks.update(task.id, status=next_status_on_success(task.status))
            return True

        # BUG_FOUND or ERROR: retry accounting
        new_retries = task.retries + 1
        if new_retries > self._config.max_retry:
            self._tasks.update(task.id, status=TaskStatus.FAILED, retries=new_retries)
            return True

        if result.outcome is Outcome.BUG_FOUND:
            self._tasks.update(task.id, status=TaskStatus.IN_DEV, retries=new_retries)
        else:  # ERROR: re-run same stage
            self._tasks.update(task.id, retries=new_retries)
        return True
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/test_orchestrator.py -v`
Expected: all passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/orchestrator.py tests/test_orchestrator.py
git commit -m "feat: add bug loop, retry limit, and token budget to step"
```

---

## Task 9: Orchestrator.run loop + full-lifecycle integration test

**Files:**
- Modify: `src/agency/orchestrator.py` (add `run`)
- Test: `tests/test_orchestrator.py` (append)

`run(max_steps)` calls `step()` until it returns False or `max_steps` is reached, returning the
number of steps executed. `max_steps` is a hard safety cap against infinite loops.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_orchestrator.py  (append)
def test_run_drives_task_to_done(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    orch = _orch(conn)  # FakeAgentRunner: every role SUCCESS
    steps = orch.run(max_steps=20)
    assert tasks.get(task_id).status is TaskStatus.DONE
    assert steps >= 4  # NEW->design->dev->qa->done


def test_run_recovers_from_one_qa_bug(conn):
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    runner = FakeAgentRunner(
        scripts={
            Role.QA: [
                AgentResult(Outcome.BUG_FOUND, "bug"),  # first QA fails -> back to dev
                AgentResult(Outcome.SUCCESS, "ok"),      # second QA passes -> done
            ]
        }
    )
    orch = _orch(conn, runner=runner)
    orch.run(max_steps=20)
    assert tasks.get(task_id).status is TaskStatus.DONE
    assert tasks.get(task_id).retries == 1


def test_run_stops_at_max_steps(conn):
    tasks = TaskRepository(conn)
    tasks.create(title="t", description="d", acceptance_criteria="ac")
    orch = _orch(conn)
    assert orch.run(max_steps=2) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_orchestrator.py -k run -v`
Expected: FAIL with `AttributeError: 'Orchestrator' object has no attribute 'run'`

- [ ] **Step 3: Write minimal implementation (append method to `Orchestrator`)**

```python
# src/agency/orchestrator.py  — add this method to the Orchestrator class:
    def run(self, max_steps: int = 1000) -> int:
        steps = 0
        while steps < max_steps:
            if not self.step():
                break
            steps += 1
        return steps
```

- [ ] **Step 4: Run the full suite + lint + types**

Run: `cd ~/agency && pytest -v && ruff check . && mypy`
Expected: all tests pass, ruff clean, mypy clean

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/orchestrator.py tests/test_orchestrator.py
git commit -m "feat: add Orchestrator.run loop with max_steps safety cap"
```

---

## Definition of Done (Plan 1)

- `pytest` green across all modules; `ruff check .` and `mypy` clean.
- A `FakeAgentRunner`-driven task flows NEW → IN_DESIGN → IN_DEV → IN_QA → DONE.
- A QA `BUG_FOUND` sends the task back to IN_DEV and increments retries; exceeding `max_retry`
  marks it FAILED.
- Token budget halts the loop; `max_steps` caps `run()`.
- All `events` recorded for full traceability.

## Next Plan

Plan 2 — Agent Runtime: implement `AgentRunner` with the Claude Agent SDK and wire the first
real agent (Developer), keeping `FakeAgentRunner` for tests.
