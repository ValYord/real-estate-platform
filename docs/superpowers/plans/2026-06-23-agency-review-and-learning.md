# Agency Multi-Agent QA Review + Self-Learning — Implementation Plan (Plan 4 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade QA from a single agent to a multi-agent review pipeline modeled on the user's fitneks `/code-review` (parallel specialized reviewers → adversarial validation → high-signal verdict), and add a self-learning loop that records lessons from failures into the target project's Known-Mistakes file so agents avoid repeating them.

**Architecture:** A `ReviewQaRunner` (implements `AgentRunner`) captures the working-tree diff, fans out to several specialized reviewers (bugs, security/logic, conventions) — each a single structured-output Claude call returning findings — then runs an adversarial validator call per finding and keeps only confirmed ones. Any confirmed finding → `BUG_FOUND` (drives the Plan 1 retry loop); none → `SUCCESS`. Separately, `learning.py` summarizes failures from the `events` table into a one-line lesson and appends it to `<workspace>/KNOWN_MISTAKES.md`; agent prompts are updated to read that file first. The `anthropic` client stays injected, so the whole suite runs against the fake client with zero network.

**Tech Stack:** Python 3.12, `anthropic` (`claude-opus-4-8`, adaptive thinking, structured outputs via `output_config.format`), stdlib `json`, pytest. Builds on Plans 1–3.

> **Reference:** Follows the `claude-api` skill — structured outputs use `output_config={"format": {"type": "json_schema", "schema": ...}}` and the first text block holds valid JSON; JSON schemas use `additionalProperties: false`, simple types, and `enum` (no `minLength`/`minimum`). Model is `claude-opus-4-8`. Re-read that skill before changing the API wiring.

---

## Prerequisite

Plans 1–3 complete and committed on `master` (63 passing tests). Use venv tools `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit directly on `master` (no feature branches). Reviewers run sequentially in this plan (correctness + testability); parallelizing with threads is a later optimization, noted but not built.

## File Structure (added by this plan)

```
~/agency/src/agency/review/
  __init__.py
  diff.py            # capture_diff(workspace) -> str
  schemas.py         # Finding dataclass; FINDINGS_SCHEMA; VERDICT_SCHEMA; parse helpers
  dimensions.py      # ReviewDimension; REVIEW_DIMENSIONS (bugs, security, conventions)
  reviewer.py        # run_reviewer(...) -> (findings, tokens); validate_finding(...) -> (is_real, tokens)
  review_runner.py   # ReviewQaRunner (AgentRunner)
~/agency/src/agency/learning.py   # summarize_lesson(...); append_known_mistake(...)
~/agency/tests/review/
  __init__.py
  test_diff.py
  test_schemas.py
  test_reviewer.py
  test_review_runner.py
~/agency/tests/test_learning.py
```

---

## Task 1: Capture the working-tree diff

**Files:**
- Create: `src/agency/review/__init__.py` (empty), `src/agency/review/diff.py`
- Create: `tests/review/__init__.py` (empty), `tests/review/test_diff.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_diff.py
import subprocess

from agency.review.diff import capture_diff
from agency.runtime.workspace import Workspace


def _git(root, *args):
    subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)


def test_capture_diff_shows_committed_file_change(tmp_path):
    ws = Workspace(tmp_path)
    ws.write_file("f.txt", "old line\n")
    _git(tmp_path, "init")
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-m", "base")
    ws.write_file("f.txt", "new line\n")
    diff = capture_diff(ws)
    assert "new line" in diff


def test_capture_diff_non_git_lists_files(tmp_path):
    ws = Workspace(tmp_path)
    ws.write_file("hello.txt", "hi")
    diff = capture_diff(ws)  # not a git repo
    assert "hello.txt" in diff
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_diff.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.review'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/review/diff.py
from __future__ import annotations

from agency.runtime.workspace import Workspace


def capture_diff(workspace: Workspace) -> str:
    """Best-effort working-tree diff for review. Falls back to a file listing."""
    out = workspace.bash("git --no-pager diff HEAD 2>&1")
    lowered = out.lower()
    if any(
        marker in lowered
        for marker in ("not a git repository", "unknown revision", "ambiguous argument")
    ):
        out = workspace.bash("git --no-pager diff 2>&1")
        if "not a git repository" in out.lower():
            out = workspace.bash("find . -type f -not -path './.git/*' | head -100")
    return out
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_diff.py -v`
Expected: 2 passed

- [ ] **Step 5: Run lint + types, then commit**

```bash
cd ~/agency && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/review/__init__.py src/agency/review/diff.py tests/review/__init__.py tests/review/test_diff.py
git commit -m "feat: add capture_diff for review"
```

---

## Task 2: Finding schema + structured-output JSON schemas

**Files:**
- Create: `src/agency/review/schemas.py`
- Create: `tests/review/test_schemas.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_schemas.py
from agency.review.schemas import (
    FINDINGS_SCHEMA,
    VERDICT_SCHEMA,
    Finding,
    parse_findings,
    parse_verdict,
)


def test_findings_schema_is_strict_object():
    assert FINDINGS_SCHEMA["type"] == "object"
    assert FINDINGS_SCHEMA["additionalProperties"] is False
    item = FINDINGS_SCHEMA["properties"]["findings"]["items"]
    assert item["additionalProperties"] is False
    assert set(item["required"]) == {"title", "file", "severity", "rationale"}


def test_parse_findings():
    raw = '{"findings": [{"title": "bug", "file": "a.py", "severity": "important", "rationale": "off by one"}]}'
    findings = parse_findings(raw)
    assert len(findings) == 1
    assert findings[0] == Finding(title="bug", file="a.py", severity="important", rationale="off by one")


def test_parse_findings_empty():
    assert parse_findings('{"findings": []}') == []


def test_parse_verdict():
    assert parse_verdict('{"is_real": true, "reason": "confirmed"}') is True
    assert parse_verdict('{"is_real": false, "reason": "false positive"}') is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_schemas.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.review.schemas'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/review/schemas.py
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Finding:
    title: str
    file: str
    severity: str  # "critical" | "important" | "minor"
    rationale: str


FINDINGS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "file": {"type": "string"},
                    "severity": {"type": "string", "enum": ["critical", "important", "minor"]},
                    "rationale": {"type": "string"},
                },
                "required": ["title", "file", "severity", "rationale"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["findings"],
    "additionalProperties": False,
}

VERDICT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "is_real": {"type": "boolean"},
        "reason": {"type": "string"},
    },
    "required": ["is_real", "reason"],
    "additionalProperties": False,
}


def parse_findings(raw: str) -> list[Finding]:
    data = json.loads(raw)
    return [
        Finding(
            title=item["title"],
            file=item["file"],
            severity=item["severity"],
            rationale=item["rationale"],
        )
        for item in data["findings"]
    ]


def parse_verdict(raw: str) -> bool:
    return bool(json.loads(raw)["is_real"])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_schemas.py -v`
Expected: 4 passed

- [ ] **Step 5: Run lint + types, then commit**

```bash
cd ~/agency && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/review/schemas.py tests/review/test_schemas.py
git commit -m "feat: add review Finding + structured-output schemas"
```

---

## Task 3: Review dimensions

**Files:**
- Create: `src/agency/review/dimensions.py`
- Test: append to `tests/review/test_schemas.py` is NOT allowed (keep concerns separate) — create `tests/review/test_dimensions.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_dimensions.py
from agency.review.dimensions import REVIEW_DIMENSIONS, ReviewDimension


def test_dimensions_present():
    keys = {d.key for d in REVIEW_DIMENSIONS}
    assert {"bugs", "security", "conventions"} <= keys


def test_each_dimension_has_a_prompt():
    for dim in REVIEW_DIMENSIONS:
        assert isinstance(dim, ReviewDimension)
        assert len(dim.system_prompt) > 50
        assert "json" in dim.system_prompt.lower()  # reviewers must return JSON findings
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.review.dimensions'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/review/dimensions.py
from __future__ import annotations

from dataclasses import dataclass

_INSTRUCTION = (
    "Review ONLY the provided diff for the task. Report concrete, high-signal issues. "
    "Return your findings as JSON matching the required schema (a `findings` array; each "
    "finding has title, file, severity, rationale). If there are no real issues, return an "
    "empty findings array. Do not invent issues to seem thorough."
)


@dataclass(frozen=True)
class ReviewDimension:
    key: str
    system_prompt: str


REVIEW_DIMENSIONS: list[ReviewDimension] = [
    ReviewDimension(
        key="bugs",
        system_prompt=(
            "You are a bug-finding reviewer. Look for logic errors, off-by-ones, unhandled "
            "None/null, wrong conditionals, and code that will not do what the task asks. "
            + _INSTRUCTION
        ),
    ),
    ReviewDimension(
        key="security",
        system_prompt=(
            "You are a security reviewer. Look for injection, unsafe input handling, secrets "
            "in code, auth/authorization gaps, and unsafe shell/SQL construction. " + _INSTRUCTION
        ),
    ),
    ReviewDimension(
        key="conventions",
        system_prompt=(
            "You are a conventions reviewer. Check the diff against the project's stated "
            "conventions (read CLAUDE.md and any KNOWN_MISTAKES.md if referenced in the diff "
            "context): naming, no debug prints, typing, required tests for new logic. "
            + _INSTRUCTION
        ),
    ),
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_dimensions.py -v`
Expected: 2 passed

- [ ] **Step 5: Run lint + types, then commit**

```bash
cd ~/agency && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/review/dimensions.py tests/review/test_dimensions.py
git commit -m "feat: add review dimensions (bugs, security, conventions)"
```

---

## Task 4: Reviewer + validator calls

**Files:**
- Create: `src/agency/review/reviewer.py`
- Test: `tests/review/test_reviewer.py`

Each function makes ONE structured-output Claude call and returns `(result, tokens)`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_reviewer.py
from agency.domain import Task, TaskStatus
from agency.review.dimensions import ReviewDimension
from agency.review.reviewer import run_reviewer, validate_finding
from agency.review.schemas import Finding
from tests.runtime.conftest import FakeMessage, FakeText, FakeUsage


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def _dim() -> ReviewDimension:
    return ReviewDimension(key="bugs", system_prompt="find bugs, return JSON")


def test_run_reviewer_parses_findings_and_tokens(make_client):
    client = make_client([
        FakeMessage(
            "end_turn",
            [FakeText('{"findings": [{"title": "off by one", "file": "a.py", "severity": "important", "rationale": "loop"}]}')],
            FakeUsage(5, 3),
        )
    ])
    findings, tokens = run_reviewer(client, _dim(), _task(), diff="some diff")
    assert tokens == 8
    assert findings[0].title == "off by one"
    # the reviewer must request structured output
    call = client.messages.calls[0]
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert call["system"] == "find bugs, return JSON"


def test_run_reviewer_empty(make_client):
    client = make_client([FakeMessage("end_turn", [FakeText('{"findings": []}')], FakeUsage(1, 1))])
    findings, tokens = run_reviewer(client, _dim(), _task(), diff="d")
    assert findings == []
    assert tokens == 2


def test_validate_finding_true(make_client):
    client = make_client([
        FakeMessage("end_turn", [FakeText('{"is_real": true, "reason": "confirmed"}')], FakeUsage(2, 2))
    ])
    finding = Finding(title="x", file="a.py", severity="important", rationale="r")
    is_real, tokens = validate_finding(client, finding, diff="d")
    assert is_real is True
    assert tokens == 4


def test_validate_finding_false(make_client):
    client = make_client([
        FakeMessage("end_turn", [FakeText('{"is_real": false, "reason": "fp"}')], FakeUsage(1, 1))
    ])
    finding = Finding(title="x", file="a.py", severity="minor", rationale="r")
    is_real, _ = validate_finding(client, finding, diff="d")
    assert is_real is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_reviewer.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.review.reviewer'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/review/reviewer.py
from __future__ import annotations

from typing import Any

from agency.domain import Task
from agency.review.dimensions import ReviewDimension
from agency.review.schemas import (
    FINDINGS_SCHEMA,
    VERDICT_SCHEMA,
    Finding,
    parse_findings,
    parse_verdict,
)

_MODEL = "claude-opus-4-8"

_VALIDATOR_SYSTEM = (
    "You are an adversarial validator. Given a claimed code-review finding and the diff, "
    "decide if it is a REAL issue in the changed code. Default to is_real=false unless you "
    "can confirm it from the diff. Return JSON matching the schema (is_real, reason)."
)


def _first_text(content: list[Any]) -> str:
    for block in content:
        if getattr(block, "type", None) == "text":
            return str(block.text)
    raise ValueError("no text block in response")


def _tokens(response: Any) -> int:
    return int(response.usage.input_tokens + response.usage.output_tokens)


def run_reviewer(
    client: Any, dimension: ReviewDimension, task: Task, diff: str, model: str = _MODEL
) -> tuple[list[Finding], int]:
    user = (
        f"Task: {task.title}\n{task.description}\n\n"
        f"Acceptance criteria:\n{task.acceptance_criteria}\n\n"
        f"Diff to review:\n{diff}"
    )
    response = client.messages.create(
        model=model,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        system=dimension.system_prompt,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": FINDINGS_SCHEMA}},
    )
    return parse_findings(_first_text(response.content)), _tokens(response)


def validate_finding(
    client: Any, finding: Finding, diff: str, model: str = _MODEL
) -> tuple[bool, int]:
    user = (
        f"Finding: {finding.title}\nFile: {finding.file}\nSeverity: {finding.severity}\n"
        f"Rationale: {finding.rationale}\n\nDiff:\n{diff}"
    )
    response = client.messages.create(
        model=model,
        max_tokens=4000,
        thinking={"type": "adaptive"},
        system=_VALIDATOR_SYSTEM,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": VERDICT_SCHEMA}},
    )
    return parse_verdict(_first_text(response.content)), _tokens(response)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_reviewer.py -v`
Expected: 4 passed

- [ ] **Step 5: Run lint + types, then commit**

```bash
cd ~/agency && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy
git add src/agency/review/reviewer.py tests/review/test_reviewer.py
git commit -m "feat: add reviewer and adversarial validator calls"
```

---

## Task 5: ReviewQaRunner + factory wiring

**Files:**
- Create: `src/agency/review/review_runner.py`
- Modify: `src/agency/runtime/factory.py` (add `review` flag)
- Test: `tests/review/test_review_runner.py`

`ReviewQaRunner.run`: capture diff → run all dimensions → validate each finding → keep confirmed → `BUG_FOUND` if any, else `SUCCESS`. It implements `AgentRunner`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/review/test_review_runner.py
from agency.domain import Outcome, Role, Task, TaskStatus
from agency.review.review_runner import ReviewQaRunner
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeUsage


def _task() -> Task:
    return Task(id=1, title="t", description="d", acceptance_criteria="ac", status=TaskStatus.IN_QA)


def _findings(json_text):
    return FakeMessage("end_turn", [FakeText(json_text)], FakeUsage(1, 1))


def test_no_findings_is_success(make_client, tmp_path):
    # 3 reviewers each return empty -> SUCCESS
    client = make_client([_findings('{"findings": []}') for _ in range(3)])
    runner = ReviewQaRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.SUCCESS


def test_confirmed_finding_is_bug_found(make_client, tmp_path):
    one = '{"findings": [{"title": "bug", "file": "a.py", "severity": "important", "rationale": "r"}]}'
    none = '{"findings": []}'
    client = make_client([
        _findings(one),    # bugs reviewer finds 1
        _findings(none),   # security: none
        _findings(none),   # conventions: none
        _findings('{"is_real": true, "reason": "confirmed"}'),  # validator confirms it
    ])
    runner = ReviewQaRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.BUG_FOUND
    assert "bug" in result.summary


def test_unconfirmed_finding_is_success(make_client, tmp_path):
    one = '{"findings": [{"title": "bug", "file": "a.py", "severity": "minor", "rationale": "r"}]}'
    none = '{"findings": []}'
    client = make_client([
        _findings(one),
        _findings(none),
        _findings(none),
        _findings('{"is_real": false, "reason": "false positive"}'),  # validator rejects
    ])
    runner = ReviewQaRunner(client=client, workspace=Workspace(tmp_path), model="claude-opus-4-8")
    result = runner.run(Role.QA, _task())
    assert result.outcome is Outcome.SUCCESS
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/review/test_review_runner.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.review.review_runner'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/review/review_runner.py
from __future__ import annotations

import logging
from typing import Any

from agency.domain import AgentResult, Outcome, Role, Task
from agency.review.diff import capture_diff
from agency.review.dimensions import REVIEW_DIMENSIONS, ReviewDimension
from agency.review.reviewer import run_reviewer, validate_finding
from agency.runtime.workspace import Workspace

logger = logging.getLogger(__name__)


class ReviewQaRunner:
    """QA via a multi-agent review: fan-out reviewers -> validate -> high-signal verdict."""

    def __init__(
        self,
        client: Any,
        workspace: Workspace,
        model: str = "claude-opus-4-8",
        dimensions: list[ReviewDimension] | None = None,
    ) -> None:
        self._client = client
        self._workspace = workspace
        self._model = model
        self._dimensions = dimensions if dimensions is not None else REVIEW_DIMENSIONS

    def run(self, role: Role, task: Task) -> AgentResult:
        tokens = 0
        try:
            diff = capture_diff(self._workspace)
            findings = []
            for dimension in self._dimensions:
                found, used = run_reviewer(self._client, dimension, task, diff, self._model)
                tokens += used
                findings.extend(found)

            confirmed = []
            for finding in findings:
                is_real, used = validate_finding(self._client, finding, diff, self._model)
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

- [ ] **Step 4: Wire into the factory (opt-in flag)**

In `src/agency/runtime/factory.py`, add an import and a `review: bool = False` parameter that swaps the QA runner. Replace the existing `build_composite_runner` with:

```python
from agency.review.review_runner import ReviewQaRunner  # add near the other imports


def build_composite_runner(
    client: Any, workspace: Workspace, model: str = "claude-opus-4-8", review: bool = False
) -> CompositeRunner:
    qa: Any = (
        ReviewQaRunner(client, workspace, model)
        if review
        else QaAgentRunner(client, workspace, model)
    )
    return CompositeRunner(
        {
            Role.PM: ClaudeAgentRunner(client, workspace, model, extra_tools=[WEB_SEARCH_TOOL]),
            Role.DESIGNER: ClaudeAgentRunner(client, workspace, model),
            Role.DEVELOPER: ClaudeAgentRunner(client, workspace, model),
            Role.QA: qa,
        }
    )
```

- [ ] **Step 5: Add a factory test for the flag**

Append to `tests/runtime/test_factory.py`:
```python
def test_review_flag_uses_review_runner(tmp_path):
    from agency.review.review_runner import ReviewQaRunner

    composite = build_composite_runner(client=object(), workspace=Workspace(tmp_path), review=True)
    assert isinstance(composite._runners[Role.QA], ReviewQaRunner)
```

- [ ] **Step 6: Run tests + full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: all green

- [ ] **Step 7: Commit**

```bash
cd ~/agency
git add src/agency/review/review_runner.py src/agency/runtime/factory.py tests/review/test_review_runner.py tests/runtime/test_factory.py
git commit -m "feat: add ReviewQaRunner and factory review flag"
```

---

## Task 6: Self-learning (Known Mistakes)

**Files:**
- Create: `src/agency/learning.py`
- Modify: `src/agency/app.py` (record a lesson after a run when a task FAILED)
- Modify: `src/agency/runtime/prompts.py` (tell agents to read KNOWN_MISTAKES.md first)
- Test: `tests/test_learning.py`

`summarize_lesson` turns failure events into a one-line lesson via one Claude call; `append_known_mistake` appends it to `<workspace>/KNOWN_MISTAKES.md`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_learning.py
from agency.db import connect
from agency.learning import append_known_mistake, record_lessons_if_failed, summarize_lesson
from agency.repository import EventRepository, TaskRepository
from agency.runtime.workspace import Workspace
from tests.runtime.conftest import FakeMessage, FakeText, FakeUsage


def test_append_known_mistake_creates_and_appends(tmp_path):
    ws = Workspace(tmp_path)
    append_known_mistake(ws, "Do not access nested fields without a null check.")
    text = ws.read_file("KNOWN_MISTAKES.md")
    assert "null check" in text
    append_known_mistake(ws, "Wrap side effects in try/except.")
    text = ws.read_file("KNOWN_MISTAKES.md")
    assert "null check" in text and "try/except" in text  # both retained


def test_summarize_lesson_uses_client(make_client):
    client = make_client([
        FakeMessage("end_turn", [FakeText("Always validate input at the boundary.")], FakeUsage(1, 1))
    ])
    lesson = summarize_lesson(client, ["dev failed: crash", "qa: bug_found login 500"])
    assert "validate input" in lesson.lower()


def test_record_lessons_only_when_failed(make_client, tmp_path):
    conn = connect(":memory:")
    tasks = TaskRepository(conn)
    events = EventRepository(conn)
    tid = tasks.create(title="t", description="d", acceptance_criteria="ac")
    events.append(task_id=tid, agent="developer", action="run", result="error", tokens=1)
    from agency.domain import TaskStatus

    tasks.update(tid, status=TaskStatus.FAILED)
    client = make_client([FakeMessage("end_turn", [FakeText("Handle the crash path.")], FakeUsage(1, 1))])
    ws = Workspace(tmp_path)
    recorded = record_lessons_if_failed(conn=conn, workspace=ws, client=client)
    assert recorded is True
    assert "crash path" in ws.read_file("KNOWN_MISTAKES.md").lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/test_learning.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.learning'`

- [ ] **Step 3: Write minimal implementation**

```python
# src/agency/learning.py
from __future__ import annotations

import sqlite3
from typing import Any

from agency.domain import TaskStatus
from agency.runtime.workspace import Workspace

_KNOWN_MISTAKES = "KNOWN_MISTAKES.md"
_HEADER = "# Known Mistakes — Do Not Repeat\n\n"

_LESSON_SYSTEM = (
    "You write one concise lesson (a single sentence, imperative) that future coding agents "
    "should follow to avoid repeating the failure described. Output only the sentence."
)


def append_known_mistake(workspace: Workspace, lesson: str) -> None:
    try:
        existing = workspace.read_file(_KNOWN_MISTAKES)
    except OSError:
        existing = _HEADER
    if not existing.startswith(_HEADER):
        existing = _HEADER + existing
    workspace.write_file(_KNOWN_MISTAKES, f"{existing.rstrip()}\n- {lesson.strip()}\n")


def _first_text(content: list[Any]) -> str:
    for block in content:
        if getattr(block, "type", None) == "text":
            return str(block.text)
    return ""


def summarize_lesson(client: Any, failure_notes: list[str], model: str = "claude-opus-4-8") -> str:
    response = client.messages.create(
        model=model,
        max_tokens=300,
        thinking={"type": "adaptive"},
        system=_LESSON_SYSTEM,
        messages=[{"role": "user", "content": "Failures:\n" + "\n".join(failure_notes)}],
    )
    return _first_text(response.content).strip()


def record_lessons_if_failed(
    conn: sqlite3.Connection, workspace: Workspace, client: Any, model: str = "claude-opus-4-8"
) -> bool:
    """If any task FAILED, summarize its failure events into one lesson and record it."""
    failed = conn.execute(
        "SELECT id FROM tasks WHERE status = ?", (TaskStatus.FAILED.value,)
    ).fetchall()
    if not failed:
        return False
    failed_ids = [row[0] for row in failed]
    placeholders = ", ".join("?" for _ in failed_ids)
    rows = conn.execute(
        f"SELECT agent, result FROM events WHERE task_id IN ({placeholders}) ORDER BY id",
        failed_ids,
    ).fetchall()
    notes = [f"{row[0]}: {row[1]}" for row in rows] or ["a task failed with no recorded events"]
    lesson = summarize_lesson(client, notes, model)
    if lesson:
        append_known_mistake(workspace, lesson)
    return True
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest tests/test_learning.py -v`
Expected: 3 passed

- [ ] **Step 5: Wire into `run_agency` and update prompts**

In `src/agency/app.py`, after computing `steps`, record lessons before returning. Replace the body of `run_agency`'s final lines so it reads:
```python
    steps = orchestrator.run(max_steps=max_steps)
    from agency.learning import record_lessons_if_failed

    record_lessons_if_failed(conn=conn, workspace=workspace, client=client, model=model)
    return steps
```
(Keep the existing build/orchestrator lines above unchanged. The `from agency.learning import ...` may also be placed at the top of the file with the other imports — either is fine as long as ruff passes; top-of-file is preferred.)

In `src/agency/runtime/prompts.py`, add one sentence to `_COMMON` so agents consult learned lessons. Change `_COMMON` to end with:
```python
    "Work until the task's acceptance criteria are met, then stop. "
    "If a KNOWN_MISTAKES.md file exists in the project, read it first and avoid those mistakes."
```

- [ ] **Step 6: Run full suite + lint + types**

Run: `cd ~/agency && ~/agency/.venv/bin/pytest -q && ~/agency/.venv/bin/ruff check . && ~/agency/.venv/bin/mypy`
Expected: all green. (The existing `test_app.py` calls `run_agency` with no FAILED task, so `record_lessons_if_failed` returns False without an extra client call — the scripted fake messages still suffice. If `test_app`'s fake client runs out of scripted messages, that means a lesson call was unexpectedly made; investigate rather than padding the script.)

- [ ] **Step 7: Commit**

```bash
cd ~/agency
git add src/agency/learning.py src/agency/app.py src/agency/runtime/prompts.py tests/test_learning.py
git commit -m "feat: add Known-Mistakes self-learning loop"
```

---

## Definition of Done (Plan 4)

- `pytest` green across all plans; `ruff` + `mypy --strict` clean.
- QA can run as a multi-agent review: parallel-capable reviewers (bugs/security/conventions) produce findings, an adversarial validator confirms each, and only confirmed findings yield `BUG_FOUND` (else `SUCCESS`) — modeled on the fitneks `/code-review` pipeline. Enabled via `build_composite_runner(..., review=True)`.
- After a run with a FAILED task, a one-line lesson is appended to `<workspace>/KNOWN_MISTAKES.md`, and agent prompts instruct reading it first — closing the self-learning loop.

## Follow-ups (not in this plan)

- Parallelize reviewers/validators with a thread pool (currently sequential).
- Expose `--review` on the `agency run` CLI.
- Richer lesson extraction (cluster recurring bug types, dedup against existing entries).
- OS-level `bash` sandbox (ADR-005).
