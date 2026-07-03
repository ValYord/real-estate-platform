# Local Scheduler (#4a) — Design (2026-07-03)

## Problem

The agency now plans its own backlog (`agency plan`) and delivers autonomously (`run --deliver`
with CI self-heal + crash-safe runners). But a human still starts each run by hand. This
sub-project adds a **local scheduler**: a macOS LaunchAgent that runs the agency twice a day,
each time topping up the backlog and delivering ~5 tasks — no human in the loop while the Mac
is awake and online.

This is sub-project **#4a** of the autonomous-team roadmap. It is deliberately the *local*
stepping stone: it does NOT make the agency computer-independent (the Mac must be awake at the
scheduled times), and it does NOT sandbox the agent's bash (ADR-005 still applies). Those are
#5 (safety/sandbox) and #4b (cloud), which come next.

## Goals

- `agency cycle` runs one bounded batch: skip-if-paused → skip-if-already-running → plan →
  deliver → log a summary.
- A LaunchAgent fires `cycle` at **10:00** and **23:00** daily (two batches, ~5 tasks each).
- A lock prevents overlapping batches; a pause file is a one-touch kill switch.
- Deterministic core (pause/lock) is unit-tested offline; plan/deliver reuse existing (tested) code.

## Non-goals

- Sandbox / containment of agent bash (#5).
- Cloud/off-machine execution (#4b); token auto-refresh; rate-limit backoff.
- Dynamic "N hours after the previous batch finished" timing — we use two fixed clock times.

## Current state (verified)

- `cli.py` builds `conn`, `workspace`, and an `engine` (`SdkEngine`) in `main`, then dispatches
  by subcommand (`run`, `talk`, `plan`). `run` calls `run_agency(...)`.
- `app.py` — `run_agency(conn, workspace, engine, token_budget=None, max_steps=1000, model=None,
  review=False, deliver=False, git_gh=None) -> int`.
- `planner.py` — `Planner(engine, workspace, tasks, model=None).plan(target=5) -> int`.
- No scheduler, lock, or pause mechanism exists yet.

## Design

### Approach (chosen)

An `agency cycle` subcommand backed by a small, testable `cycle.py`, invoked by a macOS
LaunchAgent via a thin wrapper script that sets up the token/env. Rejected: a pure shell script
driven by launchd (token + control flow in shell, not unit-testable), and the environment's
`schedule`/cron MCP tools (those schedule *Claude routines*, not a standalone local CLI).

### Components (agency `~/agency`)

1. **`cycle.py` (new)** — pause + lock + one cycle.
   - `DEFAULT_LOCK = ~/.agency-cycle.lock`, `DEFAULT_PAUSE = ~/.agency-paused` (via `expanduser`).
   - `is_paused(pause_path) -> bool` — the pause file exists.
   - `acquire_lock(lock_path) -> bool` — if the file exists and the PID inside is alive
     (`os.kill(pid, 0)` does not raise), return `False`; otherwise write the current PID and
     return `True` (a stale lock from a dead PID is reclaimed).
   - `release_lock(lock_path)` — remove the file (ignore if missing).
   - `run_cycle(*, conn, workspace, engine, target, budget, max_steps, model=None,
     lock_path, pause_path) -> str`:
     1. `if is_paused(pause_path): return "paused"`.
     2. `if not acquire_lock(lock_path): return "already running"`.
     3. `try:` `planned = Planner(engine, workspace, TaskRepository(conn), model).plan(target)`;
        `steps = run_agency(conn, workspace, engine, token_budget=budget, max_steps=max_steps,
        model=model, deliver=True)`; `return f"planned {planned}, ran {steps} steps"`.
     4. `finally: release_lock(lock_path)`.

2. **`cycle` subcommand (`cli.py`)** — `agency ... cycle [--target 5] [--budget 500000]
   [--max-steps 30]`. Builds nothing new; calls `run_cycle(...)` with the `conn/workspace/engine`
   already built in `main` and the default lock/pause paths; prints the summary.

3. **Wrapper script (`scripts/agency-cycle.sh`, new)** — sources `~/.agency-token` (which
   `export`s `CLAUDE_CODE_OAUTH_TOKEN`; chmod 600), `unset ANTHROPIC_API_KEY`, ensures PATH has
   `gh`/`node`, `gh auth switch --user ValYord`, then runs
   `~/agency/.venv/bin/agency --workspace /Users/valeryordanyan/real-estate-campony cycle`,
   appending to `~/agency-logs/cycle-<date>.log`.

4. **LaunchAgent plist (`scripts/com.agency.cycle.plist`, new template)** — `Label`
   `com.agency.cycle`; `ProgramArguments` runs `/bin/bash <repo>/scripts/agency-cycle.sh`;
   `StartCalendarInterval` array with two entries (Hour 10 / Minute 0, Hour 23 / Minute 0);
   `StandardOutPath`/`StandardErrorPath` under `~/agency-logs/`.

5. **`scripts/README.md` (new)** — install/uninstall: create `~/.agency-token`
   (`echo 'export CLAUDE_CODE_OAUTH_TOKEN=...' > ~/.agency-token && chmod 600 ~/.agency-token`),
   copy the plist to `~/Library/LaunchAgents/`, `launchctl load` it; pause with
   `touch ~/.agency-paused`, resume by removing it; uninstall with `launchctl unload`.

6. **ADR-010 (`docs/adr/010-local-scheduler.md`, new)** — records the launchd + `cycle` decision,
   the two-batch cadence, the lock/pause guardrails, and the explicit caveat that this runs the
   **unsandboxed** agency (ADR-005) and needs the Mac awake+online (sandbox #5 and cloud #4b are
   the follow-ups).

### Data flow

```
launchd @10:00 / @23:00 → agency-cycle.sh (env + token + gh) → agency cycle:
    is_paused? → "paused"        (kill switch)
    acquire_lock fails? → "already running"   (batch 2 skips if batch 1 still running)
    plan(target=5) → run_agency(deliver=True, budget=500k, max_steps=30) → "planned N, ran M"
    finally release_lock
  → appended to ~/agency-logs/cycle-<date>.log
```

## Error handling

- `run_agency` and `Planner.plan` are already exception-safe internally (crash-safe runners,
  exception-safe delivery); `run_cycle`'s `finally` guarantees the lock is released even if they
  raise, so a crash never leaves a permanent lock.
- If the token is missing/expired, the agent calls fail and the cycle logs errors (token
  longevity handling is #5).

## Testing (TDD, offline)

- `tests/test_cycle.py` with a `conn` fixture, `tmp_path` for lock/pause files, and a
  `FakeEngine([])` (raises if called):
  - **paused**: create the pause file → `run_cycle(...)` returns `"paused"` and the engine is
    never called (`engine.requests == []`).
  - **already running**: write the current PID (`os.getpid()`) to the lock file →
    `run_cycle(...)` returns `"already running"`, engine never called.
  - `acquire_lock` returns `True` and writes a PID; a second call while held returns `False`;
    `release_lock` removes it and a subsequent `acquire_lock` returns `True`.
  - a lock file holding a dead PID (e.g. `2147483647`) is reclaimed (`acquire_lock` → `True`).
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green. The scripts/plist are
  config, verified by a real `launchctl load` (manual), not unit tests.

## Rollout

- The user installs it once: write `~/.agency-token`, copy the plist, `launchctl load`. From then
  on, two batches/day run automatically while the Mac is awake+online. Pause anytime with
  `touch ~/.agency-paused`. Logs in `~/agency-logs/`.
