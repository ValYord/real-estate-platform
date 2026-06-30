# Agency Agent Runtime — Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `AgentRunner` protocol from Plan 1 with a real LLM, so the orchestrator can drive actual work — a Claude-backed agent that reads/writes files and runs bash inside a target project directory, wired in as the first real role (Developer).

**Architecture:** A `ClaudeAgentRunner` runs the **Messages API manual agentic loop** (`anthropic` SDK, model `claude-opus-4-8`, adaptive thinking) with our own locally-executed tools (`read_file`, `write_file`, `edit_file`, `bash`) scoped to a `Workspace` directory — so agents act directly on the target project on disk. The `anthropic` client is injected, so the whole suite runs against a fake client with zero network calls. Outcome mapping: a clean `end_turn` → `SUCCESS`; any exception or iteration-cap hit → `ERROR`.

**Tech Stack:** Python 3.12, `anthropic` SDK (`claude-opus-4-8`), stdlib `subprocess`/`pathlib`, pytest. Builds on Plan 1 (`agency.domain`, `agency.runner.AgentRunner`).

> **Reference:** This plan follows the `claude-api` skill (Messages API tool use, manual agentic loop). Model id is `claude-opus-4-8`; thinking is `{"type": "adaptive"}`; tool inputs are parsed objects (`block.input`), never raw-string-matched. Do not change these without re-reading that skill.

---

## Prerequisite

Plan 1 is complete and committed (`pytest` green). All paths are relative to the `~/agency/` project root.

## File Structure (added by this plan)

```
~/agency/
  src/agency/runtime/
    __init__.py
    workspace.py        # Workspace: sandboxed file + bash ops in a project dir
    tools.py            # tool JSON schemas + dispatch(workspace, name, input)
    prompts.py          # system_prompt_for(role)
    claude_runner.py    # ClaudeAgentRunner implementing AgentRunner
  tests/runtime/
    __init__.py
    conftest.py         # fake anthropic client + block/usage builders
    test_workspace.py
    test_tools.py
    test_prompts.py
    test_claude_runner.py
```

---

## Task 1: Add the dependency

**Files:**
- Modify: `pyproject.toml`

- [ ] **Step 1: Add `anthropic` to dependencies**

In `pyproject.toml`, change the `dependencies` line under `[project]`:

```toml
dependencies = ["anthropic>=0.69"]
```

- [ ] **Step 2: Install and verify import**

Run: `cd ~/agency && python3 -m pip install -e ".[dev]" && python3 -c "import anthropic; print(anthropic.__version__)"`
Expected: prints a version string with no error.

- [ ] **Step 3: Commit**

```bash
cd ~/agency
git add pyproject.toml
git commit -m "chore: add anthropic SDK dependency"
```

---

## Task 2: Workspace (sandboxed file + bash ops)

**Files:**
- Create: `src/agency/runtime/__init__.py` (empty), `src/agency/runtime/workspace.py`
- Create: `tests/runtime/__init__.py` (empty), `tests/runtime/test_workspace.py`

`Workspace` confines every path to a root directory and refuses paths that escape it.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_workspace.py
import pytest

from agency.runtime.workspace import Workspace


def test_write_then_read(tmp_path):
    ws = Workspace(tmp_path)
    ws.write_file("a/b.txt", "hello")
    assert ws.read_file("a/b.txt") == "hello"


def test_edit_requires_unique_match(tmp_path):
    ws = Workspace(tmp_path)
    ws.write_file("f.txt", "x = 1\ny = 1\n")
    with pytest.raises(ValueError):
        ws.edit_file("f.txt", "= 1", "= 2")  # two matches
    ws.edit_file("f.txt", "x = 1", "x = 2")
    assert "x = 2" in ws.read_file("f.txt")


def test_path_escape_is_rejected(tmp_path):
    ws = Workspace(tmp_path)
    with pytest.raises(ValueError):
        ws.read_file("../outside.txt")


def test_bash_runs_in_root(tmp_path):
    ws = Workspace(tmp_path)
    ws.write_file("hi.txt", "content")
    out = ws.bash("ls")
    assert "hi.txt" in out
    assert "exit=0" in out
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_workspace.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/workspace.py
from __future__ import annotations

import subprocess
from pathlib import Path


class Workspace:
    """File and bash operations confined to a single project root."""

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, rel: str) -> Path:
        target = (self.root / rel).resolve()
        if target != self.root and self.root not in target.parents:
            raise ValueError(f"path escapes workspace: {rel}")
        return target

    def read_file(self, path: str) -> str:
        return self._resolve(path).read_text()

    def write_file(self, path: str, content: str) -> str:
        target = self._resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return f"wrote {len(content)} chars to {path}"

    def edit_file(self, path: str, old: str, new: str) -> str:
        target = self._resolve(path)
        text = target.read_text()
        count = text.count(old)
        if count != 1:
            raise ValueError(f"expected exactly one match of old text in {path}, found {count}")
        target.write_text(text.replace(old, new))
        return f"edited {path}"

    def bash(self, command: str, timeout: int = 120) -> str:
        result = subprocess.run(
            ["bash", "-c", command],
            cwd=self.root,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return f"exit={result.returncode}\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/runtime/test_workspace.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/__init__.py src/agency/runtime/workspace.py tests/runtime/__init__.py tests/runtime/test_workspace.py
git commit -m "feat: add Workspace (sandboxed file + bash ops)"
```

---

## Task 3: Tool schemas + dispatch

**Files:**
- Create: `src/agency/runtime/tools.py`
- Create: `tests/runtime/test_tools.py`

`dispatch` executes one tool call against a `Workspace` and returns `(content, is_error)` — never raising, so the agent loop can feed errors back to Claude.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_tools.py
from agency.runtime.tools import TOOL_SCHEMAS, dispatch
from agency.runtime.workspace import Workspace


def test_schemas_cover_expected_tools():
    names = {t["name"] for t in TOOL_SCHEMAS}
    assert names == {"read_file", "write_file", "edit_file", "bash"}
    for tool in TOOL_SCHEMAS:
        assert tool["input_schema"]["type"] == "object"


def test_dispatch_write_and_read(tmp_path):
    ws = Workspace(tmp_path)
    content, is_error = dispatch(ws, "write_file", {"path": "x.txt", "content": "hi"})
    assert is_error is False
    content, is_error = dispatch(ws, "read_file", {"path": "x.txt"})
    assert content == "hi"
    assert is_error is False


def test_dispatch_returns_error_instead_of_raising(tmp_path):
    ws = Workspace(tmp_path)
    content, is_error = dispatch(ws, "read_file", {"path": "missing.txt"})
    assert is_error is True
    assert "error" in content.lower()


def test_dispatch_unknown_tool(tmp_path):
    ws = Workspace(tmp_path)
    content, is_error = dispatch(ws, "nonsense", {})
    assert is_error is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_tools.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.tools'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/tools.py
from __future__ import annotations

from typing import Any

from agency.runtime.workspace import Workspace

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "read_file",
        "description": "Read a UTF-8 text file relative to the project root.",
        "input_schema": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Path relative to project root"}},
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Create or overwrite a text file relative to the project root.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "edit_file",
        "description": "Replace exactly one occurrence of old_text with new_text in a file.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_text": {"type": "string"},
                "new_text": {"type": "string"},
            },
            "required": ["path", "old_text", "new_text"],
        },
    },
    {
        "name": "bash",
        "description": "Run a bash command in the project root. Returns exit code, stdout, stderr.",
        "input_schema": {
            "type": "object",
            "properties": {"command": {"type": "string"}},
            "required": ["command"],
        },
    },
]


def dispatch(workspace: Workspace, name: str, tool_input: dict[str, Any]) -> tuple[str, bool]:
    """Execute one tool call. Returns (content, is_error); never raises."""
    try:
        if name == "read_file":
            return workspace.read_file(tool_input["path"]), False
        if name == "write_file":
            return workspace.write_file(tool_input["path"], tool_input["content"]), False
        if name == "edit_file":
            return (
                workspace.edit_file(
                    tool_input["path"], tool_input["old_text"], tool_input["new_text"]
                ),
                False,
            )
        if name == "bash":
            return workspace.bash(tool_input["command"]), False
        return f"error: unknown tool {name}", True
    except Exception as exc:  # noqa: BLE001 — surface tool failures back to the agent
        return f"error: {exc}", True
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/runtime/test_tools.py -v`
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/tools.py tests/runtime/test_tools.py
git commit -m "feat: add tool schemas and local dispatch"
```

---

## Task 4: Role system prompts

**Files:**
- Create: `src/agency/runtime/prompts.py`
- Create: `tests/runtime/test_prompts.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_prompts.py
import pytest

from agency.domain import Role
from agency.runtime.prompts import system_prompt_for


def test_every_role_has_a_prompt():
    for role in Role:
        prompt = system_prompt_for(role)
        assert isinstance(prompt, str)
        assert len(prompt) > 50


def test_developer_prompt_mentions_tests():
    assert "test" in system_prompt_for(Role.DEVELOPER).lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_prompts.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.prompts'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/prompts.py
from __future__ import annotations

from agency.domain import Role

_COMMON = (
    "You are an autonomous software agent working inside a project directory. "
    "Use the provided tools (read_file, write_file, edit_file, bash) to do real work. "
    "All artifacts you write — code, comments, docs — must be in English. "
    "Work until the task's acceptance criteria are met, then stop."
)

_BY_ROLE: dict[Role, str] = {
    Role.PM: (
        "You are the Product Manager. You research the market and the product docs, "
        "decide what is worth building, and write clear tasks with acceptance criteria."
    ),
    Role.DESIGNER: (
        "You are the Designer. You produce UX/UI design specs, wireframe descriptions, "
        "and design tokens (colors, spacing, typography) as markdown files for the developer."
    ),
    Role.DEVELOPER: (
        "You are the Developer. You implement the task by writing and editing code, "
        "following any design spec already in the project. Write tests for new logic and "
        "run them with bash before you finish."
    ),
    Role.QA: (
        "You are QA. You write and run unit/integration tests and browser tests, "
        "and you report whether the work meets its acceptance criteria."
    ),
}


def system_prompt_for(role: Role) -> str:
    return f"{_COMMON}\n\n{_BY_ROLE[role]}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && pytest tests/runtime/test_prompts.py -v`
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/prompts.py tests/runtime/test_prompts.py
git commit -m "feat: add per-role system prompts"
```

---

## Task 5: Fake Claude client fixture

**Files:**
- Create: `tests/runtime/conftest.py`

This fixture lets every runner test script Claude's responses without network calls. It mimics the shape `ClaudeAgentRunner` reads: `response.stop_reason`, `response.content` (blocks with `.type`, `.text` or `.id`/`.name`/`.input`), and `response.usage.input_tokens`/`.output_tokens`.

- [ ] **Step 1: Write the fixture and a self-test**

```python
# tests/runtime/conftest.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest


@dataclass
class FakeUsage:
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class FakeText:
    text: str
    type: str = "text"


@dataclass
class FakeToolUse:
    id: str
    name: str
    input: dict[str, Any]
    type: str = "tool_use"


@dataclass
class FakeMessage:
    stop_reason: str
    content: list[Any]
    usage: FakeUsage = field(default_factory=FakeUsage)


class FakeMessages:
    def __init__(self, scripted: list[FakeMessage]) -> None:
        self._scripted = list(scripted)
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> FakeMessage:
        self.calls.append(kwargs)
        if not self._scripted:
            raise AssertionError("FakeMessages.create called more times than scripted")
        return self._scripted.pop(0)


class FakeClient:
    def __init__(self, scripted: list[FakeMessage]) -> None:
        self.messages = FakeMessages(scripted)


@pytest.fixture
def make_client():
    def _make(scripted: list[FakeMessage]) -> FakeClient:
        return FakeClient(scripted)

    return _make


def test_fake_client_pops_scripted(make_client):
    client = make_client([FakeMessage("end_turn", [FakeText("hi")], FakeUsage(1, 2))])
    msg = client.messages.create(model="x", messages=[])
    assert msg.stop_reason == "end_turn"
    assert client.messages.calls[0]["model"] == "x"
```

- [ ] **Step 2: Run the self-test**

Run: `cd ~/agency && pytest tests/runtime/conftest.py -v`
Expected: 1 passed

- [ ] **Step 3: Commit**

```bash
cd ~/agency
git add tests/runtime/conftest.py
git commit -m "test: add fake Claude client fixture"
```

---

## Task 6: ClaudeAgentRunner (manual agentic loop)

**Files:**
- Create: `src/agency/runtime/claude_runner.py`
- Test: `tests/runtime/test_claude_runner.py`

Implements `AgentRunner.run`. Loops `messages.create` → execute tool calls → feed results, until `end_turn` (→ `SUCCESS`) or the iteration cap / an exception (→ `ERROR`). Accumulates `input_tokens + output_tokens` across calls.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_claude_runner.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.runtime.claude_runner import ClaudeAgentRunner
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeToolUse, FakeUsage


def _task() -> Task:
    return Task(id=1, title="add file", description="create greeting", acceptance_criteria="hello.txt exists", status=TaskStatus.IN_DEV)


def test_runner_executes_tool_then_finishes(make_client, tmp_path):
    client = make_client([
        FakeMessage(
            "tool_use",
            [FakeToolUse(id="t1", name="write_file", input={"path": "hello.txt", "content": "hi"})],
            FakeUsage(10, 5),
        ),
        FakeMessage("end_turn", [FakeText("done")], FakeUsage(3, 2)),
    ])
    ws = Workspace(tmp_path)
    runner = ClaudeAgentRunner(client=client, workspace=ws, model="claude-opus-4-8")
    result = runner.run(Role.DEVELOPER, _task())
    assert result.outcome is Outcome.SUCCESS
    assert result.tokens == 20  # 10+5+3+2
    assert ws.read_file("hello.txt") == "hi"


def test_runner_uses_configured_model_and_adaptive_thinking(make_client, tmp_path):
    client = make_client([FakeMessage("end_turn", [FakeText("ok")], FakeUsage(1, 1))])
    runner = ClaudeAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    runner.run(Role.DEVELOPER, _task())
    call = client.messages.calls[0]
    assert call["model"] == "claude-opus-4-8"
    assert call["thinking"] == {"type": "adaptive"}


def test_runner_error_on_iteration_cap(make_client, tmp_path):
    # Always asks for a tool, never finishes -> hits the cap -> ERROR
    looping = [
        FakeMessage("tool_use", [FakeToolUse(id=f"t{i}", name="bash", input={"command": "true"})], FakeUsage(1, 1))
        for i in range(5)
    ]
    runner = ClaudeAgentRunner(
        client=make_client(looping), workspace=Workspace(tmp_path), model="claude-opus-4-8", max_iterations=3
    )
    result = runner.run(Role.DEVELOPER, _task())
    assert result.outcome is Outcome.ERROR


def test_runner_error_on_exception(make_client, tmp_path):
    class Boom:
        class messages:  # noqa: N801
            @staticmethod
            def create(**kwargs):
                raise RuntimeError("network down")

    runner = ClaudeAgentRunner(client=Boom(), workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.DEVELOPER, _task())
    assert result.outcome is Outcome.ERROR
    assert "network down" in result.summary
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && pytest tests/runtime/test_claude_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.claude_runner'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/claude_runner.py
from __future__ import annotations

import logging
from typing import Any

from agency.domain import AgentResult, Outcome, Role, Task
from agency.runtime.prompts import system_prompt_for
from agency.runtime.tools import TOOL_SCHEMAS, dispatch
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)


def _task_prompt(task: Task) -> str:
    return (
        f"Task: {task.title}\n\n"
        f"Description:\n{task.description}\n\n"
        f"Acceptance criteria:\n{task.acceptance_criteria}\n\n"
        "Do the work now using the tools. Stop when the acceptance criteria are met."
    )


def _final_text(content: list[Any]) -> str:
    parts = [block.text for block in content if getattr(block, "type", None) == "text"]
    return "\n".join(parts).strip() or "(no summary)"


class ClaudeAgentRunner:
    """AgentRunner backed by the Claude Messages API with locally-executed tools."""

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
                    tools=TOOL_SCHEMAS,
                    messages=messages,
                )
                tokens += response.usage.input_tokens + response.usage.output_tokens

                if response.stop_reason == "end_turn":
                    return AgentResult(Outcome.SUCCESS, _final_text(response.content), tokens)
                if response.stop_reason != "tool_use":
                    return AgentResult(
                        Outcome.ERROR, f"unexpected stop_reason: {response.stop_reason}", tokens
                    )

                messages.append({"role": "assistant", "content": response.content})
                tool_results: list[dict[str, Any]] = []
                for block in response.content:
                    if getattr(block, "type", None) == "tool_use":
                        content, is_error = dispatch(self._workspace, block.name, block.input)
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": content,
                                "is_error": is_error,
                            }
                        )
                messages.append({"role": "user", "content": tool_results})

            return AgentResult(Outcome.ERROR, "max iterations reached", tokens)
        except Exception as exc:  # noqa: BLE001 — map any failure to an ERROR outcome
            logger.exception("ClaudeAgentRunner.run failed")
            return AgentResult(Outcome.ERROR, f"exception: {exc}", tokens)
```

- [ ] **Step 4: Run tests + full suite + lint + types**

Run: `cd ~/agency && pytest -v && ruff check . && mypy`
Expected: all green

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/claude_runner.py tests/runtime/test_claude_runner.py
git commit -m "feat: add ClaudeAgentRunner (manual agentic loop)"
```

---

## Task 7: End-to-end smoke wiring (orchestrator + real runner shape)

**Files:**
- Test: `tests/runtime/test_runner_with_orchestrator.py`

Proves `ClaudeAgentRunner` satisfies `AgentRunner` well enough to drive the Plan 1 orchestrator — using the fake client so no network is touched.

- [ ] **Step 1: Write the failing test**

```python
# tests/runtime/test_runner_with_orchestrator.py
from agency.config import OrchestratorConfig
from agency.db import connect
from agency.domain import TaskStatus
from agency.orchestrator import Orchestrator
from agency.repository import EventRepository, TaskRepository
from agency.runtime.claude_runner import ClaudeAgentRunner
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeUsage


def test_orchestrator_drives_real_runner_shape(make_client, tmp_path):
    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    task_id = tasks.create(title="t", description="d", acceptance_criteria="ac")
    # Every agent call immediately finishes successfully.
    client = make_client([FakeMessage("end_turn", [FakeText("ok")], FakeUsage(1, 1)) for _ in range(10)])
    runner = ClaudeAgentRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    orch = Orchestrator(
        tasks=tasks,
        events=EventRepository(conn),
        runner=runner,
        config=OrchestratorConfig(),
    )
    orch.run(max_steps=20)
    assert tasks.get(task_id).status is TaskStatus.DONE
```

- [ ] **Step 2: Run the test**

Run: `cd ~/agency && pytest tests/runtime/test_runner_with_orchestrator.py -v`
Expected: PASS (if it fails, the runner does not conform to `AgentRunner` — fix the runner, not the test)

- [ ] **Step 3: Commit**

```bash
cd ~/agency
git add tests/runtime/test_runner_with_orchestrator.py
git commit -m "test: orchestrator drives ClaudeAgentRunner end to end (fake client)"
```

---

## Definition of Done (Plan 2)

- `pytest` green; `ruff check .` and `mypy` clean.
- `ClaudeAgentRunner` implements `AgentRunner`, runs the documented manual agentic loop against `claude-opus-4-8` with adaptive thinking, executes local file/bash tools in a sandboxed `Workspace`, and accumulates token usage.
- The Plan 1 orchestrator drives the runner to `DONE` with a fake client — zero network calls in the suite.

## Next Plan

Plan 3 — the remaining roles (PM with web research, Designer, QA with a pass/fail verdict driving the bug loop) and the `agency` CLI (`talk`, `run`).
