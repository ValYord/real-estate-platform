# Agency → Claude Agent SDK (Max subscription) Migration — Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate the entire LLM layer from the raw `anthropic` Messages API to the **Claude Agent SDK** (`claude-agent-sdk` v0.2.107) so the whole agency runs on the user's **Claude Max subscription** (auth via `CLAUDE_CODE_OAUTH_TOKEN`), not pay-per-token API credits. The deterministic core (domain, db, repository, state_machine, orchestrator) is UNCHANGED — only the runner implementations behind the `AgentRunner` protocol change.

**Architecture:** Introduce a thin **Engine** abstraction (`Engine.run(AgentRequest) -> AgentReply`) that wraps `claude_agent_sdk.query()`. Each role runner calls `engine.run(...)`; QA and reviewers use the SDK's `output_format` (structured JSON) for verdicts/findings; PM keeps conversation context across turns via the SDK's `resume` session id; PM's `create_task` is an in-process SDK custom tool bound to the repository. The SDK provides built-in Read/Write/Edit/Bash/Glob/Grep scoped to `cwd` — replacing our hand-rolled tools for agent work. Tests inject a `FakeEngine` (scripted replies) so the suite stays 100% offline; the real `SdkEngine` is exercised only by an opt-in live smoke test.

**Tech Stack:** Python 3.12, `claude-agent-sdk` (v0.2.107, already installed in `~/agency/.venv`), pytest. Built on Plans 1–4.

> **Verified API (introspected from installed v0.2.107 — build on THESE, not assumptions):**
> - `from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage, tool, create_sdk_mcp_server`
> - `query(*, prompt: str, options: ClaudeAgentOptions, transport=None)` → async iterator yielding `UserMessage|AssistantMessage|SystemMessage|ResultMessage|...`
> - `ClaudeAgentOptions(system_prompt: str|..., cwd, allowed_tools: list[str], disallowed_tools, mcp_servers: dict, permission_mode: 'default'|'acceptEdits'|'plan'|'bypassPermissions'|'dontAsk'|'auto', model: str|None, max_turns: int|None, output_format: dict|None, setting_sources: list|None, ...)`
> - `ResultMessage` fields: `subtype`, `is_error: bool`, `result: str|None`, `structured_output: Any`, `usage: dict|None`, `total_cost_usd: float|None`, `session_id: str`, `stop_reason`, `errors`.
> - `usage` dict keys include `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`.
> - `tool(name: str, description: str, input_schema: dict)` decorator on an `async def fn(args: dict)->dict` returning `{"content":[{"type":"text","text":...}]}`.
> - `create_sdk_mcp_server(name: str, version='1.0.0', tools=[...])` → config for `mcp_servers={name: cfg}`; allow a tool via `"mcp__<name>__<tool>"`.
> - A plain-string `system_prompt` REPLACES Claude Code's large default prompt (cuts per-call overhead). Set `setting_sources=[]` so project/user settings (CLAUDE.md) aren't auto-loaded.

## Prerequisite

Plans 1–4 complete on `master` (83 tests). `claude-agent-sdk` installed in `~/agency/.venv`. Runtime auth: `export CLAUDE_CODE_OAUTH_TOKEN=...` (from `claude setup-token`, Max account) and ensure `ANTHROPIC_API_KEY` is unset so it can't fall back to API billing. Use venv tools `~/agency/.venv/bin/{pytest,ruff,mypy}`; commit on `master`.

## What changes / stays

- **Unchanged:** `domain.py`, `db.py`, `repository.py`, `state_machine.py`, `config.py`, `orchestrator.py`, `runner.py` (the `AgentRunner` protocol). `review/diff.py`, `review/schemas.py`, `review/dimensions.py` (schemas/prompts reused). `learning.append_known_mistake`. `Workspace` (kept for `capture_diff` + KNOWN_MISTAKES writes).
- **Replaced (new impls behind the same seams):** `runtime/claude_runner.py`+`qa_runner.py` → engine-based runners; `review/reviewer.py`+`review_runner.py` → engine-based; `pm_session.py` → engine-based; `learning.summarize_lesson` → engine; `runtime/factory.py`, `app.py`, `cli.py` → build/inject the engine.
- **Removed at the end:** raw-`anthropic` code paths and the `anthropic` dependency (Task 7), plus now-unused `runtime/tools.py`/`dispatch` (the SDK supplies agent tools). `tests/runtime/conftest.py` fake-`client` fixtures are superseded by `FakeEngine`.

---

## Task 1: Engine abstraction + FakeEngine

**Files:**
- Create: `src/agency/engine/__init__.py` (empty), `src/agency/engine/base.py`, `src/agency/engine/fake.py`
- Create: `tests/engine/__init__.py` (empty), `tests/engine/test_base.py`, `tests/engine/test_fake.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/engine/test_base.py
from agency.engine.base import AgentReply, AgentRequest, tokens_from_usage


def test_request_defaults():
    req = AgentRequest(system_prompt="s", prompt="p", cwd="/tmp")
    assert req.allowed_tools == []
    assert req.mcp_servers == {}
    assert req.output_format is None
    assert req.resume is None


def test_tokens_from_usage():
    assert tokens_from_usage(None) == 0
    assert tokens_from_usage({"input_tokens": 10, "output_tokens": 5}) == 15
    assert tokens_from_usage({"output_tokens": 5}) == 5  # missing key -> 0


def test_reply_fields():
    reply = AgentReply(text="hi", structured={"x": 1}, tokens=3, is_error=False, session_id="s1")
    assert reply.text == "hi"
    assert reply.structured == {"x": 1}
    assert reply.session_id == "s1"
```

```python
# tests/engine/test_fake.py
import pytest

from agency.engine.base import AgentReply, AgentRequest
from agency.engine.fake import FakeEngine


def _req() -> AgentRequest:
    return AgentRequest(system_prompt="s", prompt="p", cwd="/tmp")


def test_fake_engine_pops_replies_and_records_requests():
    engine = FakeEngine([AgentReply("ok", None, 4, False, "s1")])
    reply = engine.run(_req())
    assert reply.text == "ok"
    assert reply.tokens == 4
    assert engine.requests[0].prompt == "p"


def test_fake_engine_runs_out():
    engine = FakeEngine([])
    with pytest.raises(AssertionError):
        engine.run(_req())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/engine -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.engine'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/engine/base.py
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class AgentRequest:
    system_prompt: str
    prompt: str
    cwd: str
    allowed_tools: list[str] = field(default_factory=list)
    mcp_servers: dict[str, Any] = field(default_factory=dict)
    output_format: dict[str, Any] | None = None
    model: str | None = None
    max_turns: int = 40
    resume: str | None = None  # session id to continue a prior conversation


@dataclass
class AgentReply:
    text: str
    structured: Any | None
    tokens: int
    is_error: bool
    session_id: str | None = None


def tokens_from_usage(usage: dict[str, Any] | None) -> int:
    if not usage:
        return 0
    return int(usage.get("input_tokens", 0)) + int(usage.get("output_tokens", 0))


class Engine(Protocol):
    def run(self, request: AgentRequest) -> AgentReply: ...
```

```python
# src/agency/engine/fake.py
from __future__ import annotations

from agency.engine.base import AgentReply, AgentRequest


class FakeEngine:
    """Offline Engine for tests: returns scripted replies, records requests."""

    def __init__(self, replies: list[AgentReply]) -> None:
        self._replies = list(replies)
        self.requests: list[AgentRequest] = []

    def run(self, request: AgentRequest) -> AgentReply:
        self.requests.append(request)
        if not self._replies:
            raise AssertionError("FakeEngine ran out of scripted replies")
        return self._replies.pop(0)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/engine -v`
Expected: 5 passed

- [ ] **Step 5: lint + types + commit**

```bash
cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/engine/__init__.py src/agency/engine/base.py src/agency/engine/fake.py tests/engine
git commit -m "feat: add Engine abstraction + FakeEngine"
```

---

## Task 2: SdkEngine (wraps claude_agent_sdk.query)

**Files:**
- Create: `src/agency/engine/sdk.py`
- Test: `tests/engine/test_sdk_mapping.py`

The pure mapper `reply_from_result(result_message)` is unit-tested with a stand-in object; the live `query()` call is NOT unit-tested (it would hit the subscription). A separate opt-in smoke test is added in Task 7.

- [ ] **Step 1: Write the failing tests**

```python
# tests/engine/test_sdk_mapping.py
from dataclasses import dataclass
from typing import Any

from agency.engine.sdk import reply_from_result


@dataclass
class _FakeResult:
    result: str | None
    structured_output: Any
    usage: dict[str, Any] | None
    is_error: bool
    session_id: str | None = "sess-1"


def test_maps_success():
    rm = _FakeResult("done", {"passed": True}, {"input_tokens": 7, "output_tokens": 3}, False)
    reply = reply_from_result(rm)
    assert reply.text == "done"
    assert reply.structured == {"passed": True}
    assert reply.tokens == 10
    assert reply.is_error is False
    assert reply.session_id == "sess-1"


def test_maps_error_and_none_text():
    rm = _FakeResult(None, None, None, True)
    reply = reply_from_result(rm)
    assert reply.text == ""
    assert reply.tokens == 0
    assert reply.is_error is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/engine/test_sdk_mapping.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.engine.sdk'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/engine/sdk.py
from __future__ import annotations

import asyncio
import logging
from typing import Any

from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

from agency.engine.base import AgentReply, AgentRequest, tokens_from_usage

logger = logging.getLogger(__name__)


def reply_from_result(result: Any) -> AgentReply:
    """Map a claude_agent_sdk ResultMessage (or compatible) to an AgentReply."""
    return AgentReply(
        text=result.result or "",
        structured=result.structured_output,
        tokens=tokens_from_usage(result.usage),
        is_error=bool(result.is_error),
        session_id=getattr(result, "session_id", None),
    )


class SdkEngine:
    """Engine backed by the Claude Agent SDK (runs on the Claude Code/Max subscription)."""

    def __init__(self, default_model: str | None = None, max_turns: int = 40) -> None:
        self._default_model = default_model
        self._max_turns = max_turns

    def run(self, request: AgentRequest) -> AgentReply:
        return asyncio.run(self._run_async(request))

    async def _run_async(self, request: AgentRequest) -> AgentReply:
        options = ClaudeAgentOptions(
            system_prompt=request.system_prompt,
            cwd=request.cwd,
            allowed_tools=request.allowed_tools,
            mcp_servers=request.mcp_servers,
            output_format=request.output_format,
            model=request.model or self._default_model,
            max_turns=request.max_turns or self._max_turns,
            permission_mode="bypassPermissions",
            setting_sources=[],
            resume=request.resume,
        )
        result: Any = None
        async for message in query(prompt=request.prompt, options=options):
            if isinstance(message, ResultMessage):
                result = message
        if result is None:
            return AgentReply("", None, 0, True, None)
        return reply_from_result(result)
```

- [ ] **Step 4: Run tests + verify import of the real module**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/engine/test_sdk_mapping.py -v && ~/agency/.venv/bin/python -c "from agency.engine.sdk import SdkEngine; print('import ok')"`
Expected: 2 passed + "import ok"

- [ ] **Step 5: lint + types + commit**

```bash
cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/engine/sdk.py tests/engine/test_sdk_mapping.py
git commit -m "feat: add SdkEngine wrapping claude_agent_sdk.query"
```

> Note for the implementer: if `mypy --strict` complains that `claude_agent_sdk` is untyped (missing stubs), add to `pyproject.toml` under a new `[[tool.mypy.overrides]]`: `module = "claude_agent_sdk.*"` with `ignore_missing_imports = true`. Only add this if mypy actually errors on the import.

---

## Task 3: Engine-based role runners (Developer/Designer + QA)

**Files:**
- Create: `src/agency/runtime/engine_runner.py`
- Test: `tests/runtime/test_engine_runner.py`

`EngineRunner` (for PM/Designer/Developer worker stages) maps an engine reply to `SUCCESS`/`ERROR`. `QaEngineRunner` requests structured output (`VERDICT_SCHEMA`) and maps `passed` → `SUCCESS`/`BUG_FOUND`. Both implement `AgentRunner`. They build the file/bash tool allowlist for the SDK.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_engine_runner.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.runtime.engine_runner import EngineRunner, QaEngineRunner


def _task(status: TaskStatus) -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=status)


def test_engine_runner_success(tmp_path):
    engine = FakeEngine([AgentReply("built it", None, 12, False)])
    runner = EngineRunner(engine=engine, workspace_dir=str(tmp_path))
    result = runner.run(Role.DEVELOPER, _task(TaskStatus.IN_DEV))
    assert result.outcome is Outcome.SUCCESS
    assert result.tokens == 12
    # request was scoped to the workspace and given file/bash tools
    req = engine.requests[0]
    assert req.cwd == str(tmp_path)
    assert "Bash" in req.allowed_tools and "Edit" in req.allowed_tools


def test_engine_runner_error(tmp_path):
    engine = FakeEngine([AgentReply("", None, 1, True)])
    runner = EngineRunner(engine=engine, workspace_dir=str(tmp_path))
    assert runner.run(Role.DESIGNER, _task(TaskStatus.IN_DESIGN)).outcome is Outcome.ERROR


def test_qa_verdict_passed_is_success(tmp_path):
    engine = FakeEngine([AgentReply("", {"passed": True, "summary": "green"}, 5, False)])
    runner = QaEngineRunner(engine=engine, workspace_dir=str(tmp_path))
    result = runner.run(Role.QA, _task(TaskStatus.IN_QA))
    assert result.outcome is Outcome.SUCCESS
    # QA asked for structured verdict output
    assert engine.requests[0].output_format is not None


def test_qa_verdict_failed_is_bug_found(tmp_path):
    engine = FakeEngine([
        AgentReply("", {"passed": False, "summary": "1 fail", "bug_description": "500 on login"}, 5, False)
    ])
    runner = QaEngineRunner(engine=engine, workspace_dir=str(tmp_path))
    result = runner.run(Role.QA, _task(TaskStatus.IN_QA))
    assert result.outcome is Outcome.BUG_FOUND
    assert "500 on login" in result.summary


def test_qa_missing_structured_is_error(tmp_path):
    engine = FakeEngine([AgentReply("no json", None, 1, False)])
    runner = QaEngineRunner(engine=engine, workspace_dir=str(tmp_path))
    assert runner.run(Role.QA, _task(TaskStatus.IN_QA)).outcome is Outcome.ERROR
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/runtime/test_engine_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.runtime.engine_runner'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/runtime/engine_runner.py
from __future__ import annotations

import logging
from typing import Any

from agency.domain import AgentResult, Outcome, Role, Task
from agency.engine.base import AgentRequest, Engine
from agency.runtime.prompts import system_prompt_for

logger = logging.getLogger(__name__)

# Built-in Claude Agent SDK tools each coding agent may use, scoped to cwd.
WORKER_TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]

VERDICT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "passed": {"type": "boolean"},
        "summary": {"type": "string"},
        "bug_description": {"type": "string"},
    },
    "required": ["passed", "summary"],
    "additionalProperties": False,
}


def _task_prompt(task: Task) -> str:
    return (
        f"Task: {task.title}\n\nDescription:\n{task.description}\n\n"
        f"Acceptance criteria:\n{task.acceptance_criteria}\n\n"
        "Do the work now. Stop when the acceptance criteria are met."
    )


class EngineRunner:
    """AgentRunner for worker roles (Designer/Developer): success unless the engine errors."""

    def __init__(self, engine: Engine, workspace_dir: str, model: str | None = None) -> None:
        self._engine = engine
        self._cwd = workspace_dir
        self._model = model

    def run(self, role: Role, task: Task) -> AgentResult:
        reply = self._engine.run(
            AgentRequest(
                system_prompt=system_prompt_for(role),
                prompt=_task_prompt(task),
                cwd=self._cwd,
                allowed_tools=list(WORKER_TOOLS),
                model=self._model,
            )
        )
        if reply.is_error:
            return AgentResult(Outcome.ERROR, reply.text or "engine error", reply.tokens)
        return AgentResult(Outcome.SUCCESS, reply.text or "done", reply.tokens)


class QaEngineRunner:
    """AgentRunner for QA: structured verdict -> SUCCESS / BUG_FOUND."""

    def __init__(self, engine: Engine, workspace_dir: str, model: str | None = None) -> None:
        self._engine = engine
        self._cwd = workspace_dir
        self._model = model

    def run(self, role: Role, task: Task) -> AgentResult:
        reply = self._engine.run(
            AgentRequest(
                system_prompt=system_prompt_for(role),
                prompt=_task_prompt(task) + "\n\nRun the tests, then return the verdict JSON.",
                cwd=self._cwd,
                allowed_tools=list(WORKER_TOOLS),
                output_format={"type": "json_schema", "schema": VERDICT_SCHEMA},
                model=self._model,
            )
        )
        if reply.is_error:
            return AgentResult(Outcome.ERROR, reply.text or "engine error", reply.tokens)
        verdict = reply.structured
        if not isinstance(verdict, dict) or "passed" not in verdict:
            return AgentResult(Outcome.ERROR, "QA returned no verdict", reply.tokens)
        if verdict.get("passed"):
            return AgentResult(Outcome.SUCCESS, str(verdict.get("summary", "passed")), reply.tokens)
        bug = verdict.get("bug_description") or verdict.get("summary", "bug found")
        return AgentResult(Outcome.BUG_FOUND, str(bug), reply.tokens)
```

- [ ] **Step 4: Run tests + full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/runtime/test_engine_runner.py -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: 5 passed, gates clean

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add src/agency/runtime/engine_runner.py tests/runtime/test_engine_runner.py
git commit -m "feat: add engine-based EngineRunner + QaEngineRunner"
```

---

## Task 4: Engine-based reviewers + ReviewQaRunner

**Files:**
- Modify: `src/agency/review/reviewer.py` (rewrite on the Engine)
- Modify: `src/agency/review/review_runner.py` (use Engine)
- Modify/replace tests: `tests/review/test_reviewer.py`, `tests/review/test_review_runner.py`

Reviewers now call `engine.run(...)` with `output_format=FINDINGS_SCHEMA` and read `reply.structured`; the validator uses `VERDICT_SCHEMA`-style `{is_real, reason}`.

- [ ] **Step 1: Rewrite `tests/review/test_reviewer.py`**

```python
# tests/review/test_reviewer.py
from agency.domain import Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.review.dimensions import ReviewDimension
from agency.review.reviewer import run_reviewer, validate_finding
from agency.review.schemas import Finding


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def _dim() -> ReviewDimension:
    return ReviewDimension(key="bugs", system_prompt="find bugs")


def test_run_reviewer_reads_structured_findings(tmp_path):
    engine = FakeEngine([
        AgentReply(
            "",
            {"findings": [{"title": "off by one", "file": "a.py", "severity": "important", "rationale": "loop"}]},
            8,
            False,
        )
    ])
    findings, tokens = run_reviewer(engine, _dim(), _task(), diff="d", cwd=str(tmp_path))
    assert tokens == 8
    assert findings[0].title == "off by one"
    assert engine.requests[0].output_format is not None


def test_run_reviewer_empty(tmp_path):
    engine = FakeEngine([AgentReply("", {"findings": []}, 2, False)])
    findings, tokens = run_reviewer(engine, _dim(), _task(), diff="d", cwd=str(tmp_path))
    assert findings == []
    assert tokens == 2


def test_validate_finding_true(tmp_path):
    engine = FakeEngine([AgentReply("", {"is_real": True, "reason": "confirmed"}, 4, False)])
    finding = Finding(title="x", file="a.py", severity="important", rationale="r")
    is_real, tokens = validate_finding(engine, finding, diff="d", cwd=str(tmp_path))
    assert is_real is True
    assert tokens == 4


def test_validate_finding_false_or_missing(tmp_path):
    engine = FakeEngine([AgentReply("", {"is_real": False, "reason": "fp"}, 1, False)])
    finding = Finding(title="x", file="a.py", severity="minor", rationale="r")
    assert validate_finding(engine, finding, diff="d", cwd=str(tmp_path))[0] is False
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_reviewer.py -v`
Expected: FAIL (signature changed; old impl used a fake `client`)

- [ ] **Step 3: Rewrite `src/agency/review/reviewer.py`**

```python
# src/agency/review/reviewer.py
from __future__ import annotations

from typing import Any

from agency.domain import Task
from agency.engine.base import AgentRequest, Engine
from agency.review.dimensions import ReviewDimension
from agency.review.schemas import FINDINGS_SCHEMA, VERDICT_SCHEMA, Finding, parse_findings

_VALIDATOR_SYSTEM = (
    "You are an adversarial validator. Given a claimed code-review finding and the diff, "
    "decide if it is a REAL issue in the changed code. Default to is_real=false unless you "
    "can confirm it from the diff."
)


def _findings_format() -> dict[str, Any]:
    return {"type": "json_schema", "schema": FINDINGS_SCHEMA}


def _verdict_format() -> dict[str, Any]:
    return {"type": "json_schema", "schema": VERDICT_SCHEMA}


def run_reviewer(
    engine: Engine, dimension: ReviewDimension, task: Task, diff: str, cwd: str
) -> tuple[list[Finding], int]:
    prompt = (
        f"Task: {task.title}\n{task.description}\n\n"
        f"Acceptance criteria:\n{task.acceptance_criteria}\n\nDiff to review:\n{diff}"
    )
    reply = engine.run(
        AgentRequest(
            system_prompt=dimension.system_prompt,
            prompt=prompt,
            cwd=cwd,
            allowed_tools=["Read", "Grep", "Glob"],
            output_format=_findings_format(),
        )
    )
    structured = reply.structured if isinstance(reply.structured, dict) else {"findings": []}
    findings = parse_findings_from_obj(structured)
    return findings, reply.tokens


def parse_findings_from_obj(obj: dict[str, Any]) -> list[Finding]:
    return [
        Finding(
            title=item["title"],
            file=item["file"],
            severity=item["severity"],
            rationale=item["rationale"],
        )
        for item in obj.get("findings", [])
    ]


def validate_finding(engine: Engine, finding: Finding, diff: str, cwd: str) -> tuple[bool, int]:
    prompt = (
        f"Finding: {finding.title}\nFile: {finding.file}\nSeverity: {finding.severity}\n"
        f"Rationale: {finding.rationale}\n\nDiff:\n{diff}"
    )
    reply = engine.run(
        AgentRequest(
            system_prompt=_VALIDATOR_SYSTEM,
            prompt=prompt,
            cwd=cwd,
            allowed_tools=["Read", "Grep", "Glob"],
            output_format=_verdict_format(),
        )
    )
    structured = reply.structured if isinstance(reply.structured, dict) else {}
    return bool(structured.get("is_real", False)), reply.tokens
```
NOTE: `parse_findings` (the raw-JSON-string parser in `schemas.py`) is no longer used by the reviewer (we now get a parsed dict from `reply.structured`); keep the import only if used. If ruff flags `parse_findings`/`VERDICT_SCHEMA` imports as unused, remove them. `parse_findings_from_obj` is the new helper.

- [ ] **Step 4: Rewrite `src/agency/review/review_runner.py` to use the engine**

```python
# src/agency/review/review_runner.py
from __future__ import annotations

import logging

from agency.domain import AgentResult, Outcome, Role, Task
from agency.engine.base import Engine
from agency.review.diff import capture_diff
from agency.review.dimensions import REVIEW_DIMENSIONS, ReviewDimension
from agency.review.reviewer import run_reviewer, validate_finding
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)


class ReviewQaRunner:
    """QA via a multi-agent review (engine-backed): reviewers -> validate -> verdict."""

    def __init__(
        self,
        engine: Engine,
        workspace: Workspace,
        dimensions: list[ReviewDimension] | None = None,
    ) -> None:
        self._engine = engine
        self._workspace = workspace
        self._dimensions = dimensions if dimensions is not None else REVIEW_DIMENSIONS

    def run(self, role: Role, task: Task) -> AgentResult:
        tokens = 0
        try:
            diff = capture_diff(self._workspace)
            cwd = str(self._workspace.root)
            findings = []
            for dimension in self._dimensions:
                found, used = run_reviewer(self._engine, dimension, task, diff, cwd)
                tokens += used
                findings.extend(found)

            confirmed = []
            for finding in findings:
                is_real, used = validate_finding(self._engine, finding, diff, cwd)
                tokens += used
                if is_real:
                    confirmed.append(finding)

            if confirmed:
                summary = "; ".join(f"{f.severity}: {f.title} ({f.file})" for f in confirmed)
                return AgentResult(Outcome.BUG_FOUND, summary, tokens)
            return AgentResult(Outcome.SUCCESS, "no confirmed issues", tokens)
        except Exception as exc:
            logger.exception("ReviewQaRunner.run failed")
            return AgentResult(Outcome.ERROR, f"exception: {exc}", tokens)
```

- [ ] **Step 5: Rewrite `tests/review/test_review_runner.py`** (FakeEngine; note `Workspace`)

```python
# tests/review/test_review_runner.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.review.review_runner import ReviewQaRunner
from agency.runtime.workspace import Workspace


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def test_no_findings_is_success(tmp_path):
    engine = FakeEngine([AgentReply("", {"findings": []}, 1, False) for _ in range(3)])
    runner = ReviewQaRunner(engine=engine, workspace=Workspace(tmp_path))
    assert runner.run(Role.QA, _task()).outcome is Outcome.SUCCESS


def test_confirmed_finding_is_bug_found(tmp_path):
    one = {"findings": [{"title": "bug", "file": "a.py", "severity": "important", "rationale": "r"}]}
    none = {"findings": []}
    engine = FakeEngine([
        AgentReply("", one, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", {"is_real": True, "reason": "confirmed"}, 1, False),
    ])
    runner = ReviewQaRunner(engine=engine, workspace=Workspace(tmp_path))
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.BUG_FOUND
    assert "bug" in result.summary


def test_unconfirmed_finding_is_success(tmp_path):
    one = {"findings": [{"title": "bug", "file": "a.py", "severity": "minor", "rationale": "r"}]}
    none = {"findings": []}
    engine = FakeEngine([
        AgentReply("", one, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", none, 1, False),
        AgentReply("", {"is_real": False, "reason": "fp"}, 1, False),
    ])
    runner = ReviewQaRunner(engine=engine, workspace=Workspace(tmp_path))
    assert runner.run(Role.QA, _task()).outcome is Outcome.SUCCESS
```

- [ ] **Step 6: Run review tests + full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green (test_diff, test_schemas, test_dimensions still pass; reviewer/review_runner now engine-based)

- [ ] **Step 7: Commit**

```bash
cd ~/agency
git add src/agency/review/reviewer.py src/agency/review/review_runner.py tests/review/test_reviewer.py tests/review/test_review_runner.py
git commit -m "feat: move reviewers + ReviewQaRunner onto the Engine (structured output)"
```

---

## Task 5: Engine-based PmSession (create_task as an SDK tool)

**Files:**
- Create: `src/agency/runtime/pm_tools.py` (the `create_task` SDK tool factory)
- Modify: `src/agency/pm_session.py` (rewrite on the engine + resume)
- Test: `tests/test_pm_session.py` (rewrite), `tests/runtime/test_pm_tools.py`

The `create_task` SDK tool is an `async` function bound to a `TaskRepository`. PmSession passes it via `mcp_servers`/`allowed_tools` and keeps the conversation's `session_id` to thread context across `send()` calls. Offline tests cover (a) the tool function writes to the repo, and (b) PmSession wires the tool + threads `resume`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/runtime/test_pm_tools.py
import asyncio

from agency.db import connect
from agency.repository import TaskRepository
from agency.runtime.pm_tools import build_create_task_server, make_create_task


def test_create_task_callable_writes_to_repo():
    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    fn = make_create_task(tasks)
    result = asyncio.run(
        fn({"title": "Add favorites", "description": "save listings", "acceptance_criteria": "works"})
    )
    assert "content" in result
    actionable = tasks.list_actionable()
    assert len(actionable) == 1
    assert actionable[0].title == "Add favorites"


def test_build_server_returns_config_and_tool_name():
    conn = connect(":memory:")
    server, tool_name = build_create_task_server(TaskRepository(conn))
    assert tool_name == "mcp__pm__create_task"
    assert server is not None
```

```python
# tests/test_pm_session.py
from agency.db import connect
from agency.engine.base import AgentReply
from agency.engine.fake import FakeEngine
from agency.pm_session import PmSession
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace


def test_send_returns_text_and_threads_session(tmp_path):
    engine = FakeEngine([
        AgentReply("first", None, 1, False, session_id="s1"),
        AgentReply("second", None, 1, False, session_id="s1"),
    ])
    session = PmSession(engine=engine, workspace=Workspace(tmp_path), tasks=TaskRepository(connect(":memory:")))
    assert session.send("hello") == "first"
    session.send("again")
    # second request resumes the session id returned by the first
    assert engine.requests[1].resume == "s1"


def test_pm_wires_create_task_tool(tmp_path):
    engine = FakeEngine([AgentReply("ok", None, 1, False, session_id="s1")])
    session = PmSession(engine=engine, workspace=Workspace(tmp_path), tasks=TaskRepository(connect(":memory:")))
    session.send("we need favorites")
    req = engine.requests[0]
    assert "mcp__pm__create_task" in req.allowed_tools
    assert "pm" in req.mcp_servers
```

- [ ] **Step 2: Run to verify failure**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/runtime/test_pm_tools.py tests/test_pm_session.py -v`
Expected: FAIL (modules/signatures missing)

- [ ] **Step 3: Write `src/agency/runtime/pm_tools.py`**

```python
# src/agency/runtime/pm_tools.py
from __future__ import annotations

from typing import Any, Callable

from claude_agent_sdk import create_sdk_mcp_server, tool

from agency.repository import TaskRepository

_CREATE_TASK_SCHEMA = {
    "title": str,
    "description": str,
    "acceptance_criteria": str,
}


def make_create_task(tasks: TaskRepository) -> Callable[[dict[str, Any]], Any]:
    @tool("create_task", "Queue a new task for the engineering team.", _CREATE_TASK_SCHEMA)
    async def create_task(args: dict[str, Any]) -> dict[str, Any]:
        task_id = tasks.create(
            title=args["title"],
            description=args["description"],
            acceptance_criteria=args["acceptance_criteria"],
        )
        return {"content": [{"type": "text", "text": f"created task {task_id}: {args['title']}"}]}

    return create_task


def build_create_task_server(tasks: TaskRepository) -> tuple[Any, str]:
    """Return (mcp server config, fully-qualified tool name) for the PM create_task tool."""
    server = create_sdk_mcp_server(name="pm", version="1.0.0", tools=[make_create_task(tasks)])
    return server, "mcp__pm__create_task"
```
NOTE: the `@tool` decorator returns an `SdkMcpTool`, not a plain callable — so `make_create_task` actually returns that wrapped tool object. The unit test calls the underlying async function; if the decorator wraps such that the returned object is not directly awaitable, expose the inner coroutine for the test. Implementer: inspect `SdkMcpTool` (e.g. `~/agency/.venv/bin/python -c "from claude_agent_sdk import tool; help(tool)"`); if the wrapped object stores the handler (commonly as `.handler`), have `make_create_task` return the wrapped tool for `build_create_task_server`, and the unit test should call the handler attribute. Adjust the test to match the real SDK shape — keep the INTENT (calling the tool writes to the repo) and confirm the shape against the installed SDK rather than guessing.

- [ ] **Step 4: Write `src/agency/pm_session.py` (rewrite)**

```python
# src/agency/pm_session.py
from __future__ import annotations

import logging

from agency.domain import Role
from agency.engine.base import AgentRequest, Engine
from agency.repository import TaskRepository
from agency.runtime.prompts import system_prompt_for
from agency.runtime.pm_tools import build_create_task_server
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)

_PM_TOOLS = ["Read", "Grep", "Glob", "WebSearch", "WebFetch"]


class PmSession:
    """A persistent conversation with the PM agent (engine-backed, subscription)."""

    def __init__(
        self,
        engine: Engine,
        workspace: Workspace,
        tasks: TaskRepository,
        model: str | None = None,
    ) -> None:
        self._engine = engine
        self._cwd = str(workspace.root)
        self._model = model
        self._server, self._create_task_tool = build_create_task_server(tasks)
        self._session_id: str | None = None

    def send(self, user_message: str) -> str:
        reply = self._engine.run(
            AgentRequest(
                system_prompt=system_prompt_for(Role.PM),
                prompt=user_message,
                cwd=self._cwd,
                allowed_tools=[*_PM_TOOLS, self._create_task_tool],
                mcp_servers={"pm": self._server},
                model=self._model,
                resume=self._session_id,
            )
        )
        if reply.session_id:
            self._session_id = reply.session_id
        return reply.text or "(no reply)"
```

- [ ] **Step 5: Run tests; verify + commit**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/runtime/test_pm_tools.py tests/test_pm_session.py -v && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green

```bash
cd ~/agency
git add src/agency/runtime/pm_tools.py src/agency/pm_session.py tests/runtime/test_pm_tools.py tests/test_pm_session.py
git commit -m "feat: engine-based PmSession with create_task SDK tool + resume"
```

---

## Task 6: Rewire factory, app, cli, learning; remove old runners

**Files:**
- Modify: `src/agency/runtime/factory.py`, `src/agency/app.py`, `src/agency/cli.py`, `src/agency/learning.py`
- Delete: `src/agency/runtime/claude_runner.py`, `src/agency/runtime/qa_runner.py`, `src/agency/runtime/tools.py`, and their tests (`tests/runtime/test_claude_runner.py`, `test_claude_runner_extras.py`, `test_qa_runner.py`, `test_tools.py`, `test_runner_with_orchestrator.py`); `tests/runtime/conftest.py` fake-client fixtures.

- [ ] **Step 1: Rewrite `factory.py`**

```python
# src/agency/runtime/factory.py
from __future__ import annotations

from agency.domain import Role
from agency.engine.base import Engine
from agency.review.review_runner import ReviewQaRunner
from agency.runtime.composite import CompositeRunner
from agency.runtime.engine_runner import EngineRunner, QaEngineRunner
from agency.runtime.workspace import Workspace


def build_composite_runner(
    engine: Engine, workspace: Workspace, model: str | None = None, review: bool = False
) -> CompositeRunner:
    cwd = str(workspace.root)
    qa = (
        ReviewQaRunner(engine, workspace)
        if review
        else QaEngineRunner(engine, cwd, model)
    )
    return CompositeRunner(
        {
            Role.PM: EngineRunner(engine, cwd, model),
            Role.DESIGNER: EngineRunner(engine, cwd, model),
            Role.DEVELOPER: EngineRunner(engine, cwd, model),
            Role.QA: qa,
        }
    )
```
Update `tests/runtime/test_factory.py` to construct with a `FakeEngine` and assert the QA type (EngineRunner-family vs ReviewQaRunner). Keep the `review=True` assertion.

- [ ] **Step 2: Rewrite `app.py`**

```python
# src/agency/app.py
from __future__ import annotations

import sqlite3

from agency.config import OrchestratorConfig
from agency.engine.base import Engine
from agency.learning import record_lessons_if_failed
from agency.orchestrator import Orchestrator
from agency.repository import EventRepository, TaskRepository
from agency.runtime.factory import build_composite_runner
from agency.runtime.workspace import Workspace


def run_agency(
    conn: sqlite3.Connection,
    workspace: Workspace,
    engine: Engine,
    token_budget: int | None = None,
    max_steps: int = 1000,
    model: str | None = None,
    review: bool = False,
) -> int:
    runner = build_composite_runner(engine, workspace, model, review)
    orchestrator = Orchestrator(
        tasks=TaskRepository(conn),
        events=EventRepository(conn),
        runner=runner,
        config=OrchestratorConfig(token_budget=token_budget),
    )
    steps = orchestrator.run(max_steps=max_steps)
    record_lessons_if_failed(conn=conn, workspace=workspace, engine=engine, model=model)
    return steps
```
Update `tests/test_app.py` to pass a `FakeEngine` with scripted replies (design end_turn-equivalent SUCCESS, dev SUCCESS, QA verdict passed). With `QaEngineRunner` (default), QA needs a reply whose `.structured = {"passed": True, "summary": "green"}`.

- [ ] **Step 3: Rewrite `learning.summarize_lesson` to use the engine**

In `src/agency/learning.py`, change `summarize_lesson(client, ...)` → `summarize_lesson(engine, failure_notes, model=None)` which calls `engine.run(AgentRequest(system_prompt=_LESSON_SYSTEM, prompt="Failures:\n"+..., cwd=".", ))` and returns `reply.text.strip()`. Update `record_lessons_if_failed(conn, workspace, engine, model=None)` accordingly (replace the `client`/`summarize_lesson(client,...)` call). Update `tests/test_learning.py` to use `FakeEngine`.

- [ ] **Step 4: Rewrite `cli.py`** to build the SdkEngine (subscription)

```python
# src/agency/cli.py  (key changes)
from agency.engine.sdk import SdkEngine
# ...
def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO)
    args = build_parser().parse_args(argv)
    conn = connect(args.db)
    workspace = Workspace(args.workspace)
    engine = SdkEngine(default_model=args.model)
    if args.command == "run":
        steps = run_agency(
            conn=conn, workspace=workspace, engine=engine,
            token_budget=args.budget, max_steps=args.max_steps, review=args.review,
        )
        print(f"ran {steps} steps")
        return 0
    if args.command == "talk":
        session = PmSession(engine=engine, workspace=workspace, tasks=TaskRepository(conn))
        # ... unchanged interactive loop ...
```
Add CLI args: global `--model` (default None), and on `run`: `--review` (store_true). Keep `--db`, `--workspace`, `--budget`, `--max-steps`. Remove the `import anthropic` and `anthropic.Anthropic()` line. Add a startup note: if `CLAUDE_CODE_OAUTH_TOKEN` is not set AND `ANTHROPIC_API_KEY` is not set, print a hint that one is required.

- [ ] **Step 5: Delete the obsolete raw-`anthropic` runner files and their tests**

```bash
cd ~/agency
git rm src/agency/runtime/claude_runner.py src/agency/runtime/qa_runner.py src/agency/runtime/tools.py
git rm tests/runtime/test_claude_runner.py tests/runtime/test_claude_runner_extras.py tests/runtime/test_qa_runner.py tests/runtime/test_tools.py tests/runtime/test_runner_with_orchestrator.py
```
Then trim `tests/runtime/conftest.py` and the top-level `tests/conftest.py` `make_client` re-export (the fake-client fixtures are now unused). If any remaining test imports them, update it. Keep `tests/runtime/test_workspace.py`, `test_prompts.py`, `test_composite.py`, `test_factory.py`, `test_engine_runner.py`, `test_pm_tools.py`.

- [ ] **Step 6: Full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: all green. Fix any import fallout from the deletions (e.g. `runtime/prompts.py` `_COMMON` still references tools by name in text — that's fine; but ensure nothing imports the deleted modules).

- [ ] **Step 7: Commit**

```bash
cd ~/agency
git add -A
git commit -m "refactor: wire SdkEngine through factory/app/cli/learning; remove raw-anthropic runners"
```

---

## Task 7: Remove the anthropic dependency, add an opt-in live smoke test, docs

**Files:**
- Modify: `pyproject.toml` (drop `anthropic` from dependencies; keep `claude-agent-sdk`)
- Modify: `CLAUDE.md` / `docs/adr/` (record the subscription/SDK decision)
- Create: `tests/test_live_smoke.py` (skipped unless `AGENCY_LIVE=1`)

- [ ] **Step 1: Update `pyproject.toml` dependencies**

Set `dependencies = ["claude-agent-sdk>=0.2.107"]` (remove `anthropic`). Reinstall: `cd ~/agency && uv pip install -e ".[dev]"`. Confirm nothing imports `anthropic` anymore: `cd ~/agency && ! grep -rn "import anthropic" src/ tests/`.

- [ ] **Step 2: Add ADR-006 + CLAUDE.md note**

`docs/adr/006-agent-sdk-subscription.md`:
```markdown
# ADR-006: Claude Agent SDK on the Max subscription
**Status:** Accepted
**Decision:** The LLM layer runs on the Claude Agent SDK (`claude-agent-sdk`), authenticated
with a Claude Code/Max subscription via `CLAUDE_CODE_OAUTH_TOKEN`, behind an `Engine` seam.
Agent file/bash work uses the SDK's built-in tools scoped to `cwd`; QA/reviewers use the SDK
`output_format` for structured verdicts; PM uses `resume` for multi-turn + a `create_task`
in-process SDK tool.
**Why:** Run on the user's subscription instead of pay-per-token API billing. The `Engine`
seam keeps the deterministic core and the `AgentRunner` protocol unchanged and the test suite
offline (FakeEngine).
**Consequence:** Requires `CLAUDE_CODE_OAUTH_TOKEN` at runtime; subject to subscription usage
limits. ADR-005 (bash trust boundary) still applies — `permission_mode="bypassPermissions"`
means run untrusted tasks in a container/VM.
```
Add a one-line note to `CLAUDE.md` Tech Stack: LLM engine = Claude Agent SDK on subscription.

- [ ] **Step 3: Add the opt-in live smoke test**

```python
# tests/test_live_smoke.py
import os

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("AGENCY_LIVE") != "1",
    reason="set AGENCY_LIVE=1 (and CLAUDE_CODE_OAUTH_TOKEN) to run the live subscription smoke test",
)


def test_engine_round_trips_against_subscription(tmp_path):
    from agency.engine.base import AgentRequest
    from agency.engine.sdk import SdkEngine

    engine = SdkEngine()
    reply = engine.run(
        AgentRequest(
            system_prompt="You are a terse assistant.",
            prompt="Reply with exactly: ok",
            cwd=str(tmp_path),
            allowed_tools=[],
        )
    )
    assert reply.is_error is False
    assert reply.text.strip() != ""
```

- [ ] **Step 4: Full offline suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: green (live smoke test skipped).

- [ ] **Step 5: Commit**

```bash
cd ~/agency
git add -A
git commit -m "chore: drop anthropic dep, add ADR-006 + opt-in live smoke test"
```

---

## Definition of Done (Plan 5)

- `pytest` green offline; `ruff` + `mypy --strict` clean; no `import anthropic` remains.
- The whole agency runs through the `Engine` seam on the Claude Agent SDK; `agency run`/`agency talk` build an `SdkEngine` that authenticates via the Max subscription (`CLAUDE_CODE_OAUTH_TOKEN`, no API key).
- QA/reviewers use SDK `output_format`; PM threads context via `resume` and queues work via a `create_task` SDK tool; budget/token accounting reads SDK `usage`.
- `AGENCY_LIVE=1 CLAUDE_CODE_OAUTH_TOKEN=... pytest tests/test_live_smoke.py` round-trips against the subscription.

## Manual run (subscription)

```bash
export CLAUDE_CODE_OAUTH_TOKEN=...      # from `claude setup-token` (Max account); ANTHROPIC_API_KEY unset
~/agency/.venv/bin/agency --workspace /path/to/project talk
~/agency/.venv/bin/agency --workspace /path/to/project run --review --budget 200000
```

## Follow-ups (not in this plan)

- Parallelize reviewers (async gather within one event loop).
- Tighten `permission_mode`/`SandboxSettings` instead of `bypassPermissions`.
- Surface subscription rate-limit events (`RateLimitEvent`) to the user.
