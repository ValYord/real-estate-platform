# Agency Roles & CLI — Implementation Plan (Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the thin slice — give every role a runner (PM with web research, Designer, Developer, and a QA runner whose pass/fail verdict drives the autonomous bug loop), wire them into one `CompositeRunner`, and ship the `agency` CLI (`run` for the autonomous loop, `talk` for a conversation with the PM).

**Architecture:** `ClaudeAgentRunner` (Plan 2) gains injectable `extra_tools` plus `pause_turn` handling so the PM can use the server-side `web_search` tool. A separate `QaAgentRunner` runs the same agentic loop but requires the agent to call a `report_verdict` tool — `passed=false` maps to `BUG_FOUND` (driving the orchestrator's retry/bug loop), `passed=true` to `SUCCESS`. A `CompositeRunner` routes each `Role` to its runner. The CLI builds an `anthropic` client, a `Workspace`, the composite runner, and the Plan 1 orchestrator.

**Tech Stack:** Python 3.12, `anthropic` (`claude-opus-4-8`), pytest. Builds on Plans 1–2.

> **Reference:** Follows the `claude-api` skill — model `claude-opus-4-8`, adaptive thinking, the `web_search_20260209` server tool, and `pause_turn` resume semantics for server-side tools. Re-read that skill before changing model/tool wiring.

---

## Prerequisite

Plans 1 and 2 are complete and committed (`pytest` green). All paths are relative to `~/agency/`.

## File Structure (added/changed by this plan)

```
~/agency/
  src/agency/runtime/
    claude_runner.py    # MODIFIED: extra_tools param + pause_turn handling
    qa_runner.py        # NEW: QaAgentRunner (report_verdict -> SUCCESS/BUG_FOUND)
    composite.py        # NEW: CompositeRunner (Role -> AgentRunner)
    factory.py          # NEW: build_composite_runner(), WEB_SEARCH_TOOL
  src/agency/
    app.py              # NEW: run_agency() core (testable, client injected)
    cli.py              # NEW: argparse entry points (`run`, `talk`)
    pm_session.py       # NEW: PmSession.send() for `agency talk`
  tests/runtime/
    test_claude_runner_extras.py
    test_qa_runner.py
    test_composite.py
    test_factory.py
  tests/
    test_app.py
    test_pm_session.py
```

---

## Task 1: Extend ClaudeAgentRunner — extra_tools + pause_turn

**Files:**
- Modify: `src/agency/runtime/claude_runner.py`
- Test: `tests/runtime/test_claude_runner_extras.py`

Server-side tools (like `web_search`) are passed in `tools` but executed by Anthropic; the loop must (a) accept extra tool schemas and (b) handle `stop_reason == "pause_turn"` by appending the assistant turn and re-sending.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_claude_runner_extras.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.runtime.claude_runner import ClaudeAgentRunner
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeUsage


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_DEV)


def test_extra_tools_are_passed_to_api(make_client, tmp_path):
    client = make_client([FakeMessage("end_turn", [FakeText("ok")], FakeUsage(1, 1))])
    extra = [{"type": "web_search_20260209", "name": "web_search"}]
    runner = ClaudeAgentRunner(
        client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8", extra_tools=extra
    )
    runner.run(Role.PM, _task())
    sent = client.messages.calls[0]["tools"]
    assert {"type": "web_search_20260209", "name": "web_search"} in sent


def test_pause_turn_is_resumed(make_client, tmp_path):
    client = make_client([
        FakeMessage("pause_turn", [FakeText("searching...")], FakeUsage(2, 2)),
        FakeMessage("end_turn", [FakeText("done")], FakeUsage(1, 1)),
    ])
    runner = ClaudeAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.PM, _task())
    assert result.outcome is Outcome.SUCCESS
    assert len(client.messages.calls) == 2  # resumed after pause
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_claude_runner_extras.py -v`
Expected: FAIL — `extra_tools` is not a parameter, and `pause_turn` falls through to the ERROR branch.

- [ ] **Step 3: Edit `__init__` to accept `extra_tools`**

Replace the `__init__` method in `src/agency/runtime/claude_runner.py` with:

```python
    def __init__(
        self,
        client: Any,
        workspace: Workspace,
        model: str = "claude-opus-4-8",
        max_iterations: int = 30,
        max_tokens: int = 16000,
        extra_tools: list[dict[str, Any]] | None = None,
    ) -> None:
        self._client = client
        self._workspace = workspace
        self._model = model
        self._max_iterations = max_iterations
        self._max_tokens = max_tokens
        self._tools = [*TOOL_SCHEMAS, *(extra_tools or [])]
```

- [ ] **Step 4: Use `self._tools` and handle `pause_turn`**

In `run()`, change the `tools=TOOL_SCHEMAS` argument to `tools=self._tools`, and add a `pause_turn` branch immediately after the `end_turn` check:

```python
                if response.stop_reason == "end_turn":
                    return AgentResult(Outcome.SUCCESS, _final_text(response.content), tokens)
                if response.stop_reason == "pause_turn":
                    messages.append({"role": "assistant", "content": response.content})
                    continue
                if response.stop_reason != "tool_use":
                    return AgentResult(
                        Outcome.ERROR, f"unexpected stop_reason: {response.stop_reason}", tokens
                    )
```

- [ ] **Step 5: Run tests + suite**

Run: `cd ~/agency && pytest tests/runtime -v && mypy`
Expected: all green (Plan 2 runner tests still pass — `extra_tools` defaults to none, behavior unchanged)

- [ ] **Step 6: Commit**

```bash
cd ~/agency
git add src/agency/runtime/claude_runner.py tests/runtime/test_claude_runner_extras.py
git commit -m "feat: ClaudeAgentRunner supports extra_tools and pause_turn"
```

---

## Task 2: QaAgentRunner (verdict drives the bug loop)

**Files:**
- Create: `src/agency/runtime/qa_runner.py`
- Test: `tests/runtime/test_qa_runner.py`

QA gets the local tools plus a `report_verdict` tool. When the agent calls it: `passed=false → BUG_FOUND` (summary = bug description), `passed=true → SUCCESS`. Reaching `end_turn` with no verdict is an `ERROR` (QA must report).

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_qa_runner.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.runtime.qa_runner import QaAgentRunner
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeToolUse, FakeUsage


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def test_verdict_passed_is_success(make_client, tmp_path):
    client = make_client([
        FakeMessage(
            "tool_use",
            [FakeToolUse(id="v", name="report_verdict", input={"passed": True, "summary": "all green"})],
            FakeUsage(4, 2),
        ),
    ])
    runner = QaAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.SUCCESS
    assert result.tokens == 6


def test_verdict_failed_is_bug_found(make_client, tmp_path):
    client = make_client([
        FakeMessage(
            "tool_use",
            [FakeToolUse(
                id="v", name="report_verdict",
                input={"passed": False, "summary": "1 failure", "bug_description": "login returns 500"},
            )],
            FakeUsage(3, 3),
        ),
    ])
    runner = QaAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.BUG_FOUND
    assert "login returns 500" in result.summary


def test_qa_runs_a_tool_then_reports(make_client, tmp_path):
    client = make_client([
        FakeMessage("tool_use", [FakeToolUse(id="b", name="bash", input={"command": "true"})], FakeUsage(1, 1)),
        FakeMessage(
            "tool_use",
            [FakeToolUse(id="v", name="report_verdict", input={"passed": True, "summary": "ok"})],
            FakeUsage(1, 1),
        ),
    ])
    runner = QaAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    assert runner.run(Role.QA, _task()).outcome is Outcome.SUCCESS


def test_end_turn_without_verdict_is_error(make_client, tmp_path):
    client = make_client([FakeMessage("end_turn", [FakeText("forgot to report")], FakeUsage(1, 1))])
    runner = QaAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    assert runner.run(Role.QA, _task()).outcome is Outcome.ERROR
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_qa_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.qa_runner'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/qa_runner.py
from __future__ import annotations

import logging
from typing import Any

from agency.domain import AgentResult, Outcome, Role, Task
from agency.runtime.claude_runner import _final_text, _task_prompt
from agency.runtime.prompts import system_prompt_for
from agency.runtime.tools import TOOL_SCHEMAS, dispatch
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)

VERDICT_TOOL: dict[str, Any] = {
    "name": "report_verdict",
    "description": "Report the QA verdict after running the tests. Call this exactly once at the end.",
    "input_schema": {
        "type": "object",
        "properties": {
            "passed": {"type": "boolean", "description": "True if acceptance criteria are met and tests pass"},
            "summary": {"type": "string"},
            "bug_description": {"type": "string", "description": "If not passed, what is broken and how to reproduce"},
        },
        "required": ["passed", "summary"],
    },
}


class QaAgentRunner:
    """AgentRunner for QA: runs tests, then maps report_verdict to SUCCESS/BUG_FOUND."""

    def __init__(
        self,
        client: Any,
        workspace: Workspace,
        model: str = "claude-opus-4-8",
        max_iterations: int = 30,
        max_tokens: int = 16000,
    ) -> None:
        self._client = client
        self._workspace = workspace
        self._model = model
        self._max_iterations = max_iterations
        self._max_tokens = max_tokens
        self._tools = [*TOOL_SCHEMAS, VERDICT_TOOL]

    def run(self, role: Role, task: Task) -> AgentResult:
        system = system_prompt_for(role)
        messages: list[dict[str, Any]] = [{"role": "user", "content": _task_prompt(task)}]
        tokens = 0
        try:
            for _ in range(self._max_iterations):
                response = self._client.messages.create(
                    model=self._model,
                    max_tokens=self._max_tokens,
                    thinking={"type": "adaptive"},
                    system=system,
                    tools=self._tools,
                    messages=messages,
                )
                tokens += response.usage.input_tokens + response.usage.output_tokens

                if response.stop_reason == "end_turn":
                    return AgentResult(Outcome.ERROR, "QA finished without a verdict", tokens)
                if response.stop_reason == "pause_turn":
                    messages.append({"role": "assistant", "content": response.content})
                    continue
                if response.stop_reason != "tool_use":
                    return AgentResult(
                        Outcome.ERROR, f"unexpected stop_reason: {response.stop_reason}", tokens
                    )

                verdict = _find_verdict(response.content)
                if verdict is not None:
                    if verdict.get("passed"):
                        return AgentResult(Outcome.SUCCESS, verdict.get("summary", "passed"), tokens)
                    bug = verdict.get("bug_description") or verdict.get("summary", "bug found")
                    return AgentResult(Outcome.BUG_FOUND, bug, tokens)

                messages.append({"role": "assistant", "content": response.content})
                tool_results: list[dict[str, Any]] = []
                for block in response.content:
                    if getattr(block, "type", None) == "tool_use":
                        content, is_error = dispatch(self._workspace, block.name, block.input)
                        tool_results.append(
                            {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
                        )
                messages.append({"role": "user", "content": tool_results})

            return AgentResult(Outcome.ERROR, "max iterations reached", tokens)
        except Exception as exc:  # noqa: BLE001
            logger.exception("QaAgentRunner.run failed")
            return AgentResult(Outcome.ERROR, f"exception: {exc}", tokens)


def _find_verdict(content: list[Any]) -> dict[str, Any] | None:
    for block in content:
        if getattr(block, "type", None) == "tool_use" and block.name == "report_verdict":
            return dict(block.input)
    return None
```

> Note: `_final_text` is imported for symmetry/reuse with the Developer runner; it is fine to leave it imported even if unused here, but if `ruff` flags F401, drop it from the import line.

- [ ] **Step 4: Run tests + lint + types**

Run: `cd ~/agency && pytest tests/runtime/test_qa_runner.py -v && ruff check . && mypy`
Expected: all green (remove the `_final_text` import if ruff flags it)

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/qa_runner.py tests/runtime/test_qa_runner.py
git commit -m "feat: add QaAgentRunner with report_verdict bug-loop mapping"
```

---

## Task 3: CompositeRunner

**Files:**
- Create: `src/agency/runtime/composite.py`
- Test: `tests/runtime/test_composite.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_composite.py
from agency.domain import AgentResult, Outcome, Role, Task, TaskStatus
from agency.runtime.composite import CompositeRunner


class _StubRunner:
    def __init__(self, label: str) -> None:
        self.label = label

    def run(self, role: Role, task: Task) -> AgentResult:
        return AgentResult(Outcome.SUCCESS, self.label, 0)


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_DEV)


def test_routes_to_role_runner():
    composite = CompositeRunner({Role.DEVELOPER: _StubRunner("dev"), Role.QA: _StubRunner("qa")})
    assert composite.run(Role.QA, _task()).summary == "qa"


def test_missing_role_returns_error():
    composite = CompositeRunner({Role.DEVELOPER: _StubRunner("dev")})
    result = composite.run(Role.QA, _task())
    assert result.outcome is Outcome.ERROR
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_composite.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.composite'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/composite.py
from __future__ import annotations

from agency.domain import AgentResult, Outcome, Role, Task
from agency.runner import AgentRunner


class CompositeRunner:
    """Routes each role to its own AgentRunner."""

    def __init__(self, runners: dict[Role, AgentRunner]) -> None:
        self._runners = runners

    def run(self, role: Role, task: Task) -> AgentResult:
        runner = self._runners.get(role)
        if runner is None:
            return AgentResult(Outcome.ERROR, f"no runner registered for role {role.value}", 0)
        return runner.run(role, task)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/runtime/test_composite.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/composite.py tests/runtime/test_composite.py
git commit -m "feat: add CompositeRunner (role routing)"
```

---

## Task 4: Runner factory

**Files:**
- Create: `src/agency/runtime/factory.py`
- Test: `tests/runtime/test_factory.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_factory.py
from agency.domain import Role
from agency.runtime.factory import build_composite_runner
from agency.runtime.qa_runner import QaAgentRunner
from agency.runtime.claude_runner import ClaudeAgentRunner
from agency.runtime.workspace import Workspace


def test_factory_builds_all_four_roles(tmp_path):
    composite = build_composite_runner(client=object(), workspace=Workspace(tmp_path))
    runners = composite._runners  # internal check is acceptable in a unit test
    assert set(runners) == {Role.PM, Role.DESIGNER, Role.DEVELOPER, Role.QA}
    assert isinstance(runners[Role.QA], QaAgentRunner)
    assert isinstance(runners[Role.DEVELOPER], ClaudeAgentRunner)


def test_pm_has_web_search_tool(tmp_path):
    composite = build_composite_runner(client=object(), workspace=Workspace(tmp_path))
    pm = composite._runners[Role.PM]
    assert any(t.get("name") == "web_search" for t in pm._tools)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_factory.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.factory'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/factory.py
from __future__ import annotations

from typing import Any

from agency.domain import Role
from agency.runtime.claude_runner import ClaudeAgentRunner
from agency.runtime.composite import CompositeRunner
from agency.runtime.qa_runner import QaAgentRunner
from agency.runtime.workspace import Workspace

WEB_SEARCH_TOOL: dict[str, Any] = {"type": "web_search_20260209", "name": "web_search"}


def build_composite_runner(
    client: Any, workspace: Workspace, model: str = "claude-opus-4-8"
) -> CompositeRunner:
    return CompositeRunner(
        {
            Role.PM: ClaudeAgentRunner(client, workspace, model, extra_tools=[WEB_SEARCH_TOOL]),
            Role.DESIGNER: ClaudeAgentRunner(client, workspace, model),
            Role.DEVELOPER: ClaudeAgentRunner(client, workspace, model),
            Role.QA: QaAgentRunner(client, workspace, model),
        }
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/runtime/test_factory.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/factory.py tests/runtime/test_factory.py
git commit -m "feat: add runner factory (PM web search, QA verdict)"
```

---

## Task 5: `run_agency` core + CLI entry

**Files:**
- Create: `src/agency/app.py`, `src/agency/cli.py`
- Test: `tests/test_app.py`
- Modify: `pyproject.toml` (add console script)

`run_agency` is the testable core (client injected). `cli.py` builds the real `anthropic` client and parses args.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_app.py
from agency.app import run_agency
from agency.db import connect
from agency.domain import TaskStatus
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeToolUse, FakeUsage


def test_run_agency_drives_a_task_to_done(make_client, tmp_path):
    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    # Designer/Developer finish with end_turn; QA reports passed via report_verdict.
    scripted = []
    for _ in range(2):  # design + dev stages
        scripted.append(FakeMessage("end_turn", [FakeText("ok")], FakeUsage(1, 1)))
    scripted.append(
        FakeMessage(
            "tool_use",
            [FakeToolUse(id="v", name="report_verdict", input={"passed": True, "summary": "green"})],
            FakeUsage(1, 1),
        )
    )
    client = make_client(scripted)
    steps = run_agency(conn=conn, workspace=Workspace(tmp_path), client=client, max_steps=20)
    assert tasks.get(task_id).status is TaskStatus.DONE
    assert steps >= 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && pytest tests/test_app.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.app'`

- [ ] **Step 3: Write `app.py`**

```python
# src/agency/app.py
from __future__ import annotations

import sqlite3
from typing import Any

from agency.config import OrchestratorConfig
from agency.orchestrator import Orchestrator
from agency.repository import EventRepository, TaskRepository
from agency.runtime.factory import build_composite_runner
from agency.runtime.workspace import Workspace


def run_agency(
    conn: sqlite3.Connection,
    workspace: Workspace,
    client: Any,
    token_budget: int | None = None,
    max_steps: int = 1000,
    model: str = "claude-opus-4-8",
) -> int:
    runner = build_composite_runner(client, workspace, model)
    orchestrator = Orchestrator(
        tasks=TaskRepository(conn),
        events=EventRepository(conn),
        runner=runner,
        config=OrchestratorConfig(token_budget=token_budget),
    )
    return orchestrator.run(max_steps=max_steps)
```

- [ ] **Step 4: Write `cli.py`**

```python
# src/agency/cli.py
from __future__ import annotations

import argparse
import logging

import anthropic

from agency.app import run_agency
from agency.db import connect
from agency.pm_session import PmSession
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="agency", description="Autonomous multi-agent team")
    parser.add_argument("--db", default="agency.db", help="SQLite database path")
    parser.add_argument("--workspace", default=".", help="Target project directory")
    sub = parser.add_subparsers(dest="command", required=True)

    run_cmd = sub.add_parser("run", help="Run the autonomous orchestrator loop")
    run_cmd.add_argument("--budget", type=int, default=None, help="Token budget for the run")
    run_cmd.add_argument("--max-steps", type=int, default=1000)

    sub.add_parser("talk", help="Converse with the Product Manager")
    return parser


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO)
    args = build_parser().parse_args(argv)
    conn = connect(args.db)
    workspace = Workspace(args.workspace)
    client = anthropic.Anthropic()

    if args.command == "run":
        steps = run_agency(
            conn=conn,
            workspace=workspace,
            client=client,
            token_budget=args.budget,
            max_steps=args.max_steps,
        )
        print(f"ran {steps} steps")
        return 0

    if args.command == "talk":
        session = PmSession(client=client, workspace=workspace, tasks=TaskRepository(conn))
        print("Talking to the Product Manager. Type 'exit' to quit.")
        while True:
            try:
                user = input("you> ")
            except EOFError:
                break
            if user.strip().lower() in {"exit", "quit"}:
                break
            print(f"pm> {session.send(user)}")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 5: Add the console script to `pyproject.toml`**

Under `[project]` add:

```toml
[project.scripts]
agency = "agency.cli:main"
```

- [ ] **Step 6: Run test + types**

Run: `cd ~/agency && pytest tests/test_app.py -v && mypy`
Expected: `test_app` passes. (`cli.py` imports `PmSession`, created in Task 6 — if running mypy/import before Task 6, expect an import error there; complete Task 6 before the final full run.)

- [ ] **Step 7: Commit**

```bash
cd ~/agency
git add src/agency/app.py src/agency/cli.py pyproject.toml tests/test_app.py
git commit -m "feat: add run_agency core and agency CLI (run/talk)"
```

---

## Task 6: PmSession (the `talk` brain)

**Files:**
- Create: `src/agency/pm_session.py`
- Test: `tests/test_pm_session.py`

`PmSession.send(text)` runs one PM turn over a persistent conversation. The PM has the local tools, `web_search`, and a `create_task` tool that writes straight into the `TaskRepository` so tasks it decides on are queued for the orchestrator.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_pm_session.py
from agency.db import connect
from agency.pm_session import PmSession
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeToolUse, FakeUsage


def test_create_task_tool_writes_to_repo(make_client, tmp_path):
    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    client = make_client([
        FakeMessage(
            "tool_use",
            [FakeToolUse(
                id="c", name="create_task",
                input={"title": "Add favorites", "description": "users save listings", "acceptance_criteria": "POST /favorites works"},
            )],
            FakeUsage(2, 2),
        ),
        FakeMessage("end_turn", [FakeText("Created the favorites task.")], FakeUsage(1, 1)),
    ])
    session = PmSession(client=client, workspace=Workspace(tmp_path), tasks=tasks)
    reply = session.send("We need a favorites feature.")
    assert "favorites" in reply.lower()
    actionable = tasks.list_actionable()
    assert len(actionable) == 1
    assert actionable[0].title == "Add favorites"


def test_history_persists_across_turns(make_client, tmp_path):
    conn = connect(":memory:")
    client = make_client([
        FakeMessage("end_turn", [FakeText("first")], FakeUsage(1, 1)),
        FakeMessage("end_turn", [FakeText("second")], FakeUsage(1, 1)),
    ])
    session = PmSession(client=client, workspace=Workspace(tmp_path), tasks=TaskRepository(conn))
    session.send("hello")
    session.send("again")
    # Second API call should carry the prior user+assistant turns plus the new user message.
    second_messages = client.messages.calls[1]["messages"]
    assert len(second_messages) >= 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/test_pm_session.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.pm_session'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/pm_session.py
from __future__ import annotations

import logging
from typing import Any

from agency.domain import Role
from agency.repository import TaskRepository
from agency.runtime.prompts import system_prompt_for
from agency.runtime.tools import TOOL_SCHEMAS, dispatch
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)

CREATE_TASK_TOOL: dict[str, Any] = {
    "name": "create_task",
    "description": "Queue a new task for the engineering team. Provide clear acceptance criteria.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "acceptance_criteria": {"type": "string"},
        },
        "required": ["title", "description", "acceptance_criteria"],
    },
}
WEB_SEARCH_TOOL: dict[str, Any] = {"type": "web_search_20260209", "name": "web_search"}


class PmSession:
    """A persistent conversation with the Product Manager agent."""

    def __init__(
        self,
        client: Any,
        workspace: Workspace,
        tasks: TaskRepository,
        model: str = "claude-opus-4-8",
        max_iterations: int = 20,
        max_tokens: int = 16000,
    ) -> None:
        self._client = client
        self._workspace = workspace
        self._tasks = tasks
        self._model = model
        self._max_iterations = max_iterations
        self._max_tokens = max_tokens
        self._system = system_prompt_for(Role.PM)
        self._tools = [*TOOL_SCHEMAS, CREATE_TASK_TOOL, WEB_SEARCH_TOOL]
        self._messages: list[dict[str, Any]] = []

    def send(self, user_message: str) -> str:
        self._messages.append({"role": "user", "content": user_message})
        for _ in range(self._max_iterations):
            response = self._client.messages.create(
                model=self._model,
                max_tokens=self._max_tokens,
                thinking={"type": "adaptive"},
                system=self._system,
                tools=self._tools,
                messages=self._messages,
            )
            if response.stop_reason == "end_turn":
                text = _text(response.content)
                self._messages.append({"role": "assistant", "content": response.content})
                return text
            if response.stop_reason == "pause_turn":
                self._messages.append({"role": "assistant", "content": response.content})
                continue
            if response.stop_reason != "tool_use":
                return f"(pm stopped: {response.stop_reason})"

            self._messages.append({"role": "assistant", "content": response.content})
            tool_results: list[dict[str, Any]] = []
            for block in response.content:
                if getattr(block, "type", None) != "tool_use":
                    continue
                if block.name == "create_task":
                    content, is_error = self._create_task(block.input)
                else:
                    content, is_error = dispatch(self._workspace, block.name, block.input)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
                )
            self._messages.append({"role": "user", "content": tool_results})

        return "(pm reached its step limit)"

    def _create_task(self, tool_input: dict[str, Any]) -> tuple[str, bool]:
        try:
            task_id = self._tasks.create(
                title=tool_input["title"],
                description=tool_input["description"],
                acceptance_criteria=tool_input["acceptance_criteria"],
            )
            return f"created task {task_id}: {tool_input['title']}", False
        except Exception as exc:  # noqa: BLE001
            return f"error: {exc}", True


def _text(content: list[Any]) -> str:
    parts = [block.text for block in content if getattr(block, "type", None) == "text"]
    return "\n".join(parts).strip() or "(no reply)"
```

- [ ] **Step 4: Run the full suite + lint + types**

Run: `cd ~/agency && pytest -v && ruff check . && mypy`
Expected: all green across Plans 1–3

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/pm_session.py tests/test_pm_session.py
git commit -m "feat: add PmSession (conversational task creation for `agency talk`)"
```

---

## Definition of Done (Plan 3)

- `pytest` green across all of Plans 1–3; `ruff check .` and `mypy` clean.
- All four roles have runners; QA's `passed=false` verdict produces `BUG_FOUND`, exercising the orchestrator's autonomous retry/bug loop.
- `agency run` drives queued tasks to `DONE`/`FAILED` autonomously; `agency talk` lets the user converse with the PM, which queues tasks the orchestrator then executes.
- Entire suite runs with a fake client — no network calls.

## Manual smoke test (optional, uses real API + token spend)

```bash
cd ~/agency
export ANTHROPIC_API_KEY=...    # real key
mkdir -p /tmp/agency-demo
agency --db /tmp/agency.db --workspace /tmp/agency-demo talk
# e.g. "Create a Python function add(a,b) with a pytest test," then:
agency --db /tmp/agency.db --workspace /tmp/agency-demo run --budget 200000
```

## Next Plan

Plan 4 (later) — the multi-agent QA review pattern (fan-out reviewers + validation, modeled on the fitneks `/code-review`) and the Known-Mistakes self-learning loop.
