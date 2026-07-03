# Token Longevity (#5b) — Design (2026-07-03)

## Problem

The agency authenticates to Claude with `CLAUDE_CODE_OAUTH_TOKEN`. That OAuth token expires. When
it does, every agent call fails with an auth error — and because the scheduler runs unattended,
the daily cycle would **silently churn** (each task ERRORs → retries → FAILED, no work done) with
no one noticing until they read the logs. This sub-project makes an expired/invalid token a
**distinct, loud, and self-limiting** condition instead of a silent slow failure.

Sub-project **#5b** (safety/durability). Non-goals: **auto-refresh** (`claude setup-token` is an
interactive browser flow — cannot be fully automated), a preflight token check, and measuring the
token's exact lifetime. #5b = **detect → loud alert → skip cycles until the user refreshes.**

## Goals

- Classify an auth/token-expired error distinctly (not as a generic or rate-limit error) and log a
  loud, actionable message.
- A cycle stops (does not burn the whole backlog) when the token is dead, and subsequent cycles
  skip until the user refreshes — via a marker file the user removes after refreshing.
- Deterministic core is unit-tested offline.

## Current state (verified)

- `engine/sdk.py` — `SdkEngine.run` has a retry loop with `is_retryable_error` (rate-limit/transient
  backoff) and returns an `is_error` `AgentReply` on any non-retryable error (fail-fast). Auth
  errors are not in `_RETRYABLE`, so they already fail fast — but they are **silent** (look like any
  other ERROR).
- `cycle.py` — `run_cycle` has `is_paused`/`acquire_lock` skip-guards and a pause-file kill switch;
  it runs `Planner.plan` then `run_agency(deliver=True)`.

## Design

### Component 1: `is_auth_error` + auth handling in `SdkEngine` (`sdk.py`)

- `_AUTH_PATTERNS` + `is_auth_error(message) -> bool` (pure) — matches auth failures:
  `unauthorized`, `401`, `authentication`, `oauth token`, `token has expired`, `invalid api key`,
  `please run claude`, `not logged in`. Conservative (avoids bare "expired") to prevent
  false-positives that would wrongly mark the token dead.
- `SdkEngine.__init__` gains `self.auth_failed = False`.
- `SdkEngine.run`, in the `except`, **before** the retryable check: if `is_auth_error(str(exc))`,
  set `self.auth_failed = True`, `logger.error("AUTH FAILURE — the Claude token may be expired. Run
  `claude setup-token` and update ~/.agency-token. (%s)", exc)`, and return an `is_error` reply
  immediately (no backoff — retrying a dead token is pointless). Non-auth errors behave exactly as
  today.

### Component 2: token-marker in `run_cycle` (`cycle.py`)

- `DEFAULT_TOKEN_MARKER = ~/.agency-token-expired`; `run_cycle` gains `token_marker_path` (default).
- **Start:** if the marker exists → return `"token expired"` (skip, like the pause file — the user
  removes it after refreshing).
- **After `plan` and after `run_agency`:** if `getattr(engine, "auth_failed", False)`, call
  `_mark_token_expired(token_marker_path)` (writes a file explaining "run `claude setup-token`,
  update ~/.agency-token, rebuild agency-sandbox if used, then delete this file") and return
  `"token expired — refresh the Claude token"`. Checking after `plan` avoids running the whole
  backlog once the token is known-dead.

### Component 3: docs

- `scripts/README.md` and `docker/README.md`: document that a `~/.agency-token-expired` marker
  means the token expired — refresh it, update `~/.agency-token` (rebuild `agency-sandbox` if used),
  then `rm ~/.agency-token-expired`.

### ADR-014

Records detect-alert-skip (no auto-refresh, since setup-token is interactive).

## Testing (TDD, offline)

- `is_auth_error`: True for "401 Unauthorized", "authentication_error", "OAuth token has expired",
  "Please run `claude login`"; False for "Overloaded", "Reached maximum number of turns", a generic
  "boom".
- `SdkEngine`: a subclass whose `_run_async` raises an auth error → `run()` returns `is_error`,
  `engine.auth_failed is True`, and the injected `sleep` was never called (no retry). A non-auth
  error leaves `auth_failed` False.
- `run_cycle` (tmp marker/lock/pause paths): (a) marker present → returns `"token expired"`, engine
  never called; (b) an engine stub with `auth_failed = True` → `run_cycle` returns the token-expired
  message and the marker file now exists; (c) the existing paused / already-running / normal tests
  still pass.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green; suite stays offline.

## Risks

- Heuristic classifier: an unusual auth message might be missed (then it churns as before) or a rare
  non-auth message might match (then it wrongly marks the token dead — the user removes the marker).
  Conservative patterns keep this rare; the marker is easily cleared.
- The planner's own bounded retries (≤3) still run once before `run_cycle`'s after-plan check fires
  — minor bounded waste; short-circuiting the orchestrator on `auth_failed` is a possible later
  enhancement (out of scope).
