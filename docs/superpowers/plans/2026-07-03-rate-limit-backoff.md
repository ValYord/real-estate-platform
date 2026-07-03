# Rate-limit Backoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `SdkEngine.run` retry transient/rate-limit errors with exponential backoff (instead of failing immediately and letting callers thrash), while non-retryable errors (e.g. max-turns) still fail fast.

**Architecture:** A pure `is_retryable_error(msg)` classifier plus a retry-with-backoff loop inside `SdkEngine.run` (the single place the SDK is invoked, so every caller benefits transparently). Sleep is injectable so tests never wait. All in `~/agency`.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

---

## File structure

- Modify: `~/agency/src/agency/engine/sdk.py` — add `is_retryable_error`; add backoff params + loop to `SdkEngine`.
- Modify: `~/agency/tests/engine/test_sdk_mapping.py` — classifier + retry-loop tests.
- Create: `~/agency/docs/adr/011-rate-limit-backoff.md`.

Work from `/Users/valeryordanyan/agency`.

---

## Task 1: `is_retryable_error` + backoff loop in `SdkEngine.run`

**Files:**
- Modify: `src/agency/engine/sdk.py`
- Test: `tests/engine/test_sdk_mapping.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/engine/test_sdk_mapping.py`:

```python
def test_is_retryable_error_classifies():
    from agency.engine.sdk import is_retryable_error
    assert is_retryable_error("Overloaded, please retry") is True
    assert is_retryable_error("rate limit exceeded") is True
    assert is_retryable_error("Claude Code returned an error result: success") is True
    assert is_retryable_error("... error result: Reached maximum number of turns (80)") is False
    assert is_retryable_error("some random boom") is False


def test_sdk_retries_retryable_then_succeeds():
    from agency.engine.base import AgentReply, AgentRequest
    from agency.engine.sdk import SdkEngine

    slept: list[float] = []
    calls: list[int] = []

    class _Flaky(SdkEngine):
        async def _run_async(self, request):
            calls.append(1)
            if len(calls) == 1:
                raise RuntimeError("Overloaded")
            return AgentReply("ok", None, 5, False)

    reply = _Flaky(sleep=slept.append).run(AgentRequest(system_prompt="s", prompt="p", cwd="."))
    assert reply.is_error is False
    assert reply.text == "ok"
    assert len(slept) == 1


def test_sdk_no_retry_on_non_retryable():
    from agency.engine.base import AgentRequest
    from agency.engine.sdk import SdkEngine

    slept: list[float] = []

    class _Boom(SdkEngine):
        async def _run_async(self, request):
            raise RuntimeError("Reached maximum number of turns (80)")

    reply = _Boom(sleep=slept.append).run(AgentRequest(system_prompt="s", prompt="p", cwd="."))
    assert reply.is_error is True
    assert slept == []


def test_sdk_gives_up_after_max_retries():
    from agency.engine.base import AgentRequest
    from agency.engine.sdk import SdkEngine

    slept: list[float] = []

    class _Always(SdkEngine):
        async def _run_async(self, request):
            raise RuntimeError("Overloaded")

    reply = _Always(sleep=slept.append, max_retries=2).run(
        AgentRequest(system_prompt="s", prompt="p", cwd=".")
    )
    assert reply.is_error is True
    assert len(slept) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/engine/test_sdk_mapping.py -v`
Expected: FAIL — `is_retryable_error` does not exist; `SdkEngine.__init__` has no `sleep`/`max_retries`.

- [ ] **Step 3: Implement**

In `src/agency/engine/sdk.py`, add these imports at the top (after the existing `import asyncio`/`import logging`):

```python
import time
from collections.abc import Callable
```

Add this module-level classifier below the `logger = logging.getLogger(__name__)` line:

```python
_RETRYABLE = (
    "overloaded", "rate limit", "rate_limit", "429",
    "too many requests", "timeout", "error result: success",
)


def is_retryable_error(message: str) -> bool:
    m = message.lower()
    return any(p in m for p in _RETRYABLE)
```

Replace the `SdkEngine.__init__` with:

```python
    def __init__(
        self,
        default_model: str | None = None,
        max_turns: int = 80,
        max_retries: int = 4,
        base_delay: float = 10.0,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._default_model = default_model
        self._max_turns = max_turns
        self._max_retries = max_retries
        self._base_delay = base_delay
        self._sleep = sleep
```

Replace the `SdkEngine.run` method with:

```python
    def run(self, request: AgentRequest) -> AgentReply:
        for attempt in range(self._max_retries + 1):
            try:
                return asyncio.run(self._run_async(request))
            except Exception as exc:
                if is_retryable_error(str(exc)) and attempt < self._max_retries:
                    delay = min(self._base_delay * (3 ** attempt), 300.0)
                    logger.warning(
                        "retryable engine error (attempt %d); backing off %.0fs: %s",
                        attempt + 1, delay, exc,
                    )
                    self._sleep(delay)
                    continue
                logger.exception("SdkEngine.run failed")
                return AgentReply(f"engine error: {exc}", None, 0, True, None)
        return AgentReply("engine error: retries exhausted", None, 0, True, None)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/engine/test_sdk_mapping.py -v`
Expected: PASS (the new tests plus the pre-existing mapping / max_turns / catch-exception tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/engine/sdk.py tests/engine/test_sdk_mapping.py
git commit -m "feat(engine): exponential backoff retry for transient/rate-limit errors"
```

---

## Task 2: ADR-011 + full gate

**Files:**
- Create: `docs/adr/011-rate-limit-backoff.md`

- [ ] **Step 1: Write the ADR**

Create `~/agency/docs/adr/011-rate-limit-backoff.md`:

```markdown
# ADR-011: Rate-limit backoff

**Status:** Accepted (2026-07-03)

**Context:** A live multi-task run hit a transient SDK error (surfaced as "error result:
success"). The crash-safety fix turned it into an ERROR, which callers retried immediately,
hammering the API and wasting tokens.

**Decision:** `SdkEngine.run` classifies a raised error via `is_retryable_error` (matches
rate-limit / overloaded / 429 / too-many-requests / timeout, plus the observed "error result:
success"). Retryable errors are retried with exponential backoff (base 10s x 3^attempt, capped
at 5 min; default 4 retries -> 10/30/90/270s); non-retryable errors (e.g. max-turns) fail fast
with an is_error reply, unchanged. Sleep is injectable so tests never wait.

**Consequences:** Unattended runs wait out throttling instead of thrashing. The backoff is
transparent to all callers (it lives at the single SDK call site). A persistent retryable error
still returns is_error after the retries, so the existing ERROR/park path applies. The root cause
of "error result: success" is unknown and treated as transient (revisit if the SDK clarifies it).
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/011-rate-limit-backoff.md
git commit -m "docs: ADR-011 rate-limit backoff"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `SdkEngine.run` retries retryable errors with exponential backoff (max_retries, injectable
  sleep) and fails fast on non-retryable ones; `is_retryable_error` unit-tested.
- ADR-011 committed. Suite stays offline (fake sleep, no real waiting).
