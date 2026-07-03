# Token Longevity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an expired/invalid Claude token a distinct, loud, self-limiting condition: `SdkEngine` classifies auth errors, fails fast, flags `auth_failed`, and logs an actionable message; `run_cycle` writes a `~/.agency-token-expired` marker and skips cycles until the user refreshes.

**Architecture:** Two small changes in `~/agency` — an `is_auth_error` classifier + `auth_failed` flag + loud log in `engine/sdk.py`, and a token-marker guard in `cycle.py`. All Python; suite stays offline.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict. Commit on `master`.

---

## File structure

- Modify: `~/agency/src/agency/engine/sdk.py` — `is_auth_error`, `auth_failed`, auth handling in `run`.
- Modify: `~/agency/src/agency/cycle.py` — `DEFAULT_TOKEN_MARKER`, `_mark_token_expired`, token guards in `run_cycle`.
- Modify: `~/agency/tests/engine/test_sdk_mapping.py`, `~/agency/tests/test_cycle.py`.
- Modify: `~/agency/scripts/README.md`, `~/agency/docker/README.md` — the marker note.
- Create: `~/agency/docs/adr/014-token-longevity.md`.

---

## Task 1: `is_auth_error` + `SdkEngine` auth handling

**Files:**
- Modify: `src/agency/engine/sdk.py`
- Test: `tests/engine/test_sdk_mapping.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/engine/test_sdk_mapping.py`:

```python
def test_is_auth_error_classifies():
    from agency.engine.sdk import is_auth_error
    assert is_auth_error("401 Unauthorized") is True
    assert is_auth_error("authentication_error: invalid") is True
    assert is_auth_error("OAuth token has expired") is True
    assert is_auth_error("Please run `claude login`") is True
    assert is_auth_error("Overloaded") is False
    assert is_auth_error("Reached maximum number of turns (80)") is False


def test_sdk_flags_auth_failure_and_does_not_retry():
    from agency.engine.base import AgentRequest
    from agency.engine.sdk import SdkEngine

    slept: list[float] = []

    class _AuthBoom(SdkEngine):
        async def _run_async(self, request):
            raise RuntimeError("401 Unauthorized")

    eng = _AuthBoom(sleep=slept.append)
    reply = eng.run(AgentRequest(system_prompt="s", prompt="p", cwd="."))
    assert reply.is_error is True
    assert eng.auth_failed is True
    assert slept == []  # auth errors are not retried with backoff
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/engine/test_sdk_mapping.py::test_is_auth_error_classifies tests/engine/test_sdk_mapping.py::test_sdk_flags_auth_failure_and_does_not_retry -v`
Expected: FAIL (`is_auth_error` / `auth_failed` do not exist).

- [ ] **Step 3: Implement**

In `src/agency/engine/sdk.py`, add the classifier after `is_retryable_error`:

```python
_AUTH_PATTERNS = (
    "unauthorized", "401", "authentication", "oauth token",
    "token has expired", "invalid api key", "please run claude", "not logged in",
)


def is_auth_error(message: str) -> bool:
    m = message.lower()
    return any(p in m for p in _AUTH_PATTERNS)
```

In `SdkEngine.__init__`, add (after `self._sleep = sleep`):

```python
        self.auth_failed = False
```

In `SdkEngine.run`, replace the `except Exception as exc:` block with:

```python
            except Exception as exc:
                msg = str(exc)
                if is_auth_error(msg):
                    self.auth_failed = True
                    logger.error(
                        "AUTH FAILURE — the Claude token may be expired. Run `claude setup-token` "
                        "and update ~/.agency-token. (%s)",
                        exc,
                    )
                    return AgentReply(f"auth error: {exc}", None, 0, True, None)
                if is_retryable_error(msg) and attempt < self._max_retries:
                    delay = min(self._base_delay * (3 ** attempt), 300.0)
                    logger.warning(
                        "retryable engine error (attempt %d); backing off %.0fs: %s",
                        attempt + 1, delay, exc,
                    )
                    self._sleep(delay)
                    continue
                logger.exception("SdkEngine.run failed")
                return AgentReply(f"engine error: {exc}", None, 0, True, None)
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/engine/test_sdk_mapping.py -v`
Expected: PASS (new tests plus the existing retry/backoff/max-turns tests — a max-turns error still fails fast, a rate-limit still retries).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/engine/sdk.py tests/engine/test_sdk_mapping.py
git commit -m "feat(engine): detect auth/token-expired errors (fail fast + auth_failed flag)"
```

---

## Task 2: token-marker guard in `run_cycle`

**Files:**
- Modify: `src/agency/cycle.py`
- Test: `tests/test_cycle.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_cycle.py`:

```python
def test_run_cycle_skips_when_token_marker(conn, tmp_path):
    marker = tmp_path / "expired"
    marker.write_text("x")
    engine = FakeEngine([])  # must not be called
    out = run_cycle(
        conn=conn, workspace=Workspace(tmp_path), engine=engine,
        target=5, budget=1000, max_steps=1,
        lock_path=str(tmp_path / "lock"), pause_path=str(tmp_path / "pause"),
        token_marker_path=str(marker),
    )
    assert out == "token expired"
    assert engine.requests == []


class _AuthFailEngine:
    def __init__(self):
        self.auth_failed = True
        self.requests = []

    def run(self, request):
        from agency.engine.base import AgentReply
        self.requests.append(request)
        return AgentReply("auth error", None, 0, True, None)


def test_run_cycle_marks_token_on_auth_failure(conn, tmp_path):
    marker = tmp_path / "expired"
    out = run_cycle(
        conn=conn, workspace=Workspace(tmp_path), engine=_AuthFailEngine(),
        target=1, budget=1000, max_steps=1,
        lock_path=str(tmp_path / "lock"), pause_path=str(tmp_path / "pause"),
        token_marker_path=str(marker),
    )
    assert "token expired" in out
    assert marker.exists()
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_cycle.py::test_run_cycle_skips_when_token_marker tests/test_cycle.py::test_run_cycle_marks_token_on_auth_failure -v`
Expected: FAIL (`run_cycle` has no `token_marker_path` and does not mark on auth failure).

- [ ] **Step 3: Implement**

In `src/agency/cycle.py`, add the constant near `DEFAULT_PAUSE`:

```python
DEFAULT_TOKEN_MARKER = os.path.expanduser("~/.agency-token-expired")
```

Add a helper (below `release_lock`):

```python
def _mark_token_expired(path: str) -> None:
    with open(path, "w") as f:
        f.write(
            "The Claude token appears expired. Run `claude setup-token`, update "
            "~/.agency-token (rebuild agency-sandbox if used), then delete this file.\n"
        )
```

Replace `run_cycle` with:

```python
def run_cycle(
    *,
    conn: sqlite3.Connection,
    workspace: Workspace,
    engine: Engine,
    target: int,
    budget: int,
    max_steps: int,
    lock_path: str = DEFAULT_LOCK,
    pause_path: str = DEFAULT_PAUSE,
    token_marker_path: str = DEFAULT_TOKEN_MARKER,
) -> str:
    if is_paused(pause_path):
        return "paused"
    if os.path.exists(token_marker_path):
        return "token expired"
    if not acquire_lock(lock_path):
        return "already running"
    try:
        planned = Planner(
            engine=engine, workspace=workspace, tasks=TaskRepository(conn)
        ).plan(target)
        if getattr(engine, "auth_failed", False):
            _mark_token_expired(token_marker_path)
            return "token expired — refresh the Claude token"
        steps = run_agency(
            conn=conn, workspace=workspace, engine=engine,
            token_budget=budget, max_steps=max_steps, deliver=True,
        )
        if getattr(engine, "auth_failed", False):
            _mark_token_expired(token_marker_path)
            return "token expired — refresh the Claude token"
        return f"planned {planned}, ran {steps} steps"
    finally:
        release_lock(lock_path)
```

- [ ] **Step 4: Run to verify all cycle tests pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_cycle.py -v`
Expected: PASS (the two new tests plus the existing paused / already-running / lock tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/cycle.py tests/test_cycle.py
git commit -m "feat(cycle): skip on token-expired marker; mark on engine auth failure"
```

---

## Task 3: Docs + ADR-014 + full gate

**Files:**
- Modify: `scripts/README.md`, `docker/README.md`
- Create: `docs/adr/014-token-longevity.md`

- [ ] **Step 1: Add the marker note to both READMEs**

Append this section to `~/agency/scripts/README.md` AND `~/agency/docker/README.md`:

```markdown

## Token expired

If a `~/.agency-token-expired` file appears (or a cycle logs "token expired"), the Claude token
has expired. Refresh it: `claude setup-token`, update `~/.agency-token` (and rebuild
`agency-sandbox` if you use the container), then `rm ~/.agency-token-expired`. Cycles skip while
that file exists.
```

- [ ] **Step 2: Write the ADR**

Create `~/agency/docs/adr/014-token-longevity.md`:

```markdown
# ADR-014: Token longevity

**Status:** Accepted (2026-07-03)

**Context:** `CLAUDE_CODE_OAUTH_TOKEN` expires. Unattended, an expired token makes every agent call
fail silently — the daily cycle churns and does no work with no signal.

**Decision:** `SdkEngine` classifies auth errors (`is_auth_error`), fails fast (no backoff — a dead
token won't recover), sets `auth_failed`, and logs a loud actionable message. `run_cycle` writes a
`~/.agency-token-expired` marker on auth failure and skips cycles while it exists; the user refreshes
the token (`claude setup-token`) and deletes the marker. No auto-refresh — `setup-token` is an
interactive browser flow.

**Consequences:** An expired token becomes loud and self-limiting instead of a silent daily churn.
The classifier is heuristic (conservative patterns); a missed message churns as before, a false
match is cleared by removing the marker. Auto-refresh and a preflight token check are out of scope.
```

- [ ] **Step 3: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
cd /Users/valeryordanyan/agency
git add scripts/README.md docker/README.md docs/adr/014-token-longevity.md
git commit -m "docs: ADR-014 + token-expired recovery note"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `is_auth_error` classifies auth/token-expired errors; `SdkEngine.run` fails fast on them, sets
  `auth_failed`, and logs loudly (no backoff). Non-auth behavior unchanged.
- `run_cycle` skips when the `~/.agency-token-expired` marker exists and writes it when the engine
  reports `auth_failed` (checked after `plan` and after the run).
- Docs explain the recovery; ADR-014 committed. Suite stays offline.
