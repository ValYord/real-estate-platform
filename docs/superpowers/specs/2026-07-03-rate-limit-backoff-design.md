# Rate-limit Backoff (#5c) — Design (2026-07-03)

## Problem

During the live multi-task run we hit a throttle/transient SDK error (surfaced as
`Claude Code returned an error result: success`). The crash-safety fix caught it and turned it
into an `Outcome.ERROR`, which the orchestrator/CI-healer then **retried immediately** — hammering
the API and producing churn and wasted tokens. We want transient/rate-limit errors to trigger an
**exponential backoff before retry**, so the agency waits out a throttle instead of thrashing.

This is sub-project **#5c** of the safety roadmap (the smallest, empirically-motivated piece).
Non-goals: sandboxing agent bash (#5a), token longevity (#5b), and diagnosing the SDK's internal
cause of the "error result: success" message — we treat it as transient.

## Goals

- `SdkEngine.run` classifies a raised error: **retryable** (rate-limit/overload/transient) →
  sleep with exponential backoff, then retry, up to `max_retries`; **non-retryable** (e.g.
  max-turns) → return an `is_error` reply immediately (today's behavior).
- The backoff is transparent to every caller (orchestrator, reviewers, planner, CI-healer) —
  it lives in the one place the SDK is invoked.
- The classifier and the retry loop are unit-tested offline with an injected (fake) sleep — tests
  never actually wait.

## Current state (verified)

- `engine/sdk.py` — `SdkEngine.__init__(default_model=None, max_turns=80)`; `run` currently:
  `try: return asyncio.run(self._run_async(request)) except Exception as exc: return
  AgentReply(f"engine error: {exc}", None, 0, True, None)`. One attempt, no backoff.
- Every caller already handles `AgentReply.is_error` (EngineRunner → `Outcome.ERROR`; reviewers →
  empty findings; etc.). So adding an internal retry loop is transparent.
- The observed transient message is literally `Claude Code returned an error result: success`; the
  non-transient one is `... error result: Reached maximum number of turns (N)`.

## Design

### Component: `is_retryable_error` (new, pure)

```python
_RETRYABLE = (
    "overloaded", "rate limit", "rate_limit", "429",
    "too many requests", "timeout", "error result: success",
)

def is_retryable_error(message: str) -> bool:
    m = message.lower()
    return any(p in m for p in _RETRYABLE)
```

The max-turns message (`... error result: reached maximum number of turns ...`) does not contain
any pattern, so it is **not** retryable — correct, since a wait won't change a deterministic
turn-limit outcome. The specific `error result: success` pattern is precise enough not to match
the max-turns message.

### Component: `SdkEngine.run` retry-with-backoff loop

`__init__` gains `max_retries: int = 4`, `base_delay: float = 10.0`, and an injectable
`sleep: Callable[[float], None] = time.sleep`.

```python
def run(self, request: AgentRequest) -> AgentReply:
    for attempt in range(self._max_retries + 1):
        try:
            return asyncio.run(self._run_async(request))
        except Exception as exc:
            if is_retryable_error(str(exc)) and attempt < self._max_retries:
                delay = min(self._base_delay * (3 ** attempt), 300.0)
                logger.warning("retryable engine error (attempt %d); backing off %.0fs: %s",
                               attempt + 1, delay, exc)
                self._sleep(delay)
                continue
            logger.exception("SdkEngine.run failed")
            return AgentReply(f"engine error: {exc}", None, 0, True, None)
    return AgentReply("engine error: retries exhausted", None, 0, True, None)
```

Delays are exponential and capped at 5 minutes: with `base_delay=10`, `max_retries=4` →
**10s, 30s, 90s, 270s** across the four retries. For a twice-daily unattended job, waiting out a
throttle (minutes) beats failing the batch. The trailing `return` is unreachable (the loop always
returns on the final attempt) but satisfies the type checker.

### ADR-011

Records the classify-then-backoff decision, the retry envelope, and that the "error result:
success" oddity is treated as transient pending a root-cause.

## Error handling / edge cases

- Non-retryable errors behave exactly as today (immediate `is_error`), so max-turns handling and
  the crash-safety guarantees are unchanged.
- A persistent retryable error returns `is_error` after `max_retries` backoffs — the caller's
  existing ERROR path (retry accounting / park) then applies, so nothing loops forever.
- `except Exception` still does not catch `KeyboardInterrupt`/`SystemExit` (they are BaseException),
  so Ctrl-C still stops a run mid-backoff.

## Testing (TDD, offline)

- `tests/engine/test_sdk_mapping.py` (extend):
  - `is_retryable_error`: True for "Overloaded", "rate limit exceeded",
    "Claude Code returned an error result: success"; False for
    "... Reached maximum number of turns (80)" and a generic "boom".
  - **retry then succeed**: a `SdkEngine` subclass whose `_run_async` raises "Overloaded" on the
    first call and returns a success `AgentReply` on the second; injected `sleep` records calls →
    `run` returns the success reply and slept exactly once.
  - **no retry on non-retryable**: subclass raises "Reached maximum number of turns (80)" → `run`
    returns `is_error` and `sleep` was never called.
  - **give up after max**: subclass always raises "Overloaded", `max_retries=2` → `run` returns
    `is_error` and slept exactly twice.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green; suite stays offline (fake
  sleep, no real waiting, no network).

## Rollout

- No interface change for callers; `SdkEngine()` gets sane defaults. The scheduler/`run`/`cycle`
  automatically benefit. `max_retries`/`base_delay` are constructor-tunable if throttling patterns
  change.
