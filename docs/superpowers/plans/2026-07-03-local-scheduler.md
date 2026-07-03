# Local Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `agency cycle` (pause-check → lock → plan → deliver → summary) and a macOS LaunchAgent that fires it at 10:00 and 23:00 daily, so the agency runs two ~5-task batches a day with no human in the loop (while the Mac is awake+online).

**Architecture:** A small, testable `cycle.py` (pause/lock helpers + `run_cycle`) reuses the existing `Planner` and `run_agency`. A `cycle` subcommand exposes it. A wrapper shell script sets the token/env and a LaunchAgent plist schedules two daily runs. All Python in `~/agency`; the plist/scripts are config the user installs once.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict, macOS launchd. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on the agency repo's `master`.

---

## File structure

- Create: `~/agency/src/agency/cycle.py` — `is_paused`, `acquire_lock`, `release_lock`, `run_cycle`.
- Modify: `~/agency/src/agency/cli.py` — add the `cycle` subcommand + handler.
- Create: `~/agency/scripts/agency-cycle.sh` — wrapper (env + token + gh + run).
- Create: `~/agency/scripts/com.agency.cycle.plist` — LaunchAgent (10:00 + 23:00).
- Create: `~/agency/scripts/README.md` — install/uninstall/pause docs.
- Create: `~/agency/docs/adr/010-local-scheduler.md`.
- Test: `~/agency/tests/test_cycle.py` (new). Uses the existing `conn` fixture.

Work from `/Users/valeryordanyan/agency`. Run tools as `.venv/bin/pytest`, etc.

---

## Task 1: `cycle.py` — pause, lock, run_cycle

**Files:**
- Create: `src/agency/cycle.py`
- Test: `tests/test_cycle.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_cycle.py`:

```python
import os

from agency.cycle import acquire_lock, is_paused, release_lock, run_cycle
from agency.engine.fake import FakeEngine
from agency.runtime.workspace import Workspace


def test_is_paused(tmp_path):
    p = tmp_path / "paused"
    assert is_paused(str(p)) is False
    p.write_text("")
    assert is_paused(str(p)) is True


def test_acquire_release_lock(tmp_path):
    lock = str(tmp_path / "lock")
    assert acquire_lock(lock) is True
    assert acquire_lock(lock) is False  # held by this live PID
    release_lock(lock)
    assert acquire_lock(lock) is True


def test_stale_lock_is_reclaimed(tmp_path):
    lock = tmp_path / "lock"
    lock.write_text("2147483647")  # a PID that is not running
    assert acquire_lock(str(lock)) is True


def test_run_cycle_skips_when_paused(conn, tmp_path):
    pause = tmp_path / "paused"
    pause.write_text("")
    engine = FakeEngine([])  # raises if the engine is ever called
    out = run_cycle(
        conn=conn, workspace=Workspace(tmp_path), engine=engine,
        target=5, budget=1000, max_steps=1,
        lock_path=str(tmp_path / "lock"), pause_path=str(pause),
    )
    assert out == "paused"
    assert engine.requests == []


def test_run_cycle_skips_when_already_running(conn, tmp_path):
    lock = tmp_path / "lock"
    lock.write_text(str(os.getpid()))  # a live PID -> lock held
    engine = FakeEngine([])
    out = run_cycle(
        conn=conn, workspace=Workspace(tmp_path), engine=engine,
        target=5, budget=1000, max_steps=1,
        lock_path=str(lock), pause_path=str(tmp_path / "paused"),
    )
    assert out == "already running"
    assert engine.requests == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_cycle.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.cycle'`.

- [ ] **Step 3: Implement**

Create `src/agency/cycle.py`:

```python
from __future__ import annotations

import os
import sqlite3

from agency.app import run_agency
from agency.engine.base import Engine
from agency.planner import Planner
from agency.repository import TaskRepository
from agency.runtime.workspace import Workspace

DEFAULT_LOCK = os.path.expanduser("~/.agency-cycle.lock")
DEFAULT_PAUSE = os.path.expanduser("~/.agency-paused")


def is_paused(pause_path: str) -> bool:
    return os.path.exists(pause_path)


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def acquire_lock(lock_path: str) -> bool:
    if os.path.exists(lock_path):
        pid = 0
        try:
            with open(lock_path) as f:
                pid = int(f.read().strip() or "0")
        except (ValueError, OSError):
            pid = 0
        if pid and _pid_alive(pid):
            return False
    with open(lock_path, "w") as f:
        f.write(str(os.getpid()))
    return True


def release_lock(lock_path: str) -> None:
    try:
        os.remove(lock_path)
    except FileNotFoundError:
        pass


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
) -> str:
    if is_paused(pause_path):
        return "paused"
    if not acquire_lock(lock_path):
        return "already running"
    try:
        planned = Planner(
            engine=engine, workspace=workspace, tasks=TaskRepository(conn)
        ).plan(target)
        steps = run_agency(
            conn=conn, workspace=workspace, engine=engine,
            token_budget=budget, max_steps=max_steps, deliver=True,
        )
        return f"planned {planned}, ran {steps} steps"
    finally:
        release_lock(lock_path)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_cycle.py -v`
Expected: PASS (all five tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/cycle.py tests/test_cycle.py
git commit -m "feat(cycle): pause/lock guards + run_cycle (plan + deliver)"
```

---

## Task 2: `cycle` CLI subcommand

**Files:**
- Modify: `src/agency/cli.py`

- [ ] **Step 1: Add the subcommand parser**

In `src/agency/cli.py`, right after the `plan` subparser block (the two `plan_p...` lines), add:

```python
    cycle_p = sub.add_parser("cycle", help="One scheduled batch: plan + deliver, lock-guarded")
    cycle_p.add_argument("--target", type=int, default=5, help="top up to this many pending tasks")
    cycle_p.add_argument("--budget", type=int, default=500000, help="token budget for the batch")
    cycle_p.add_argument("--max-steps", type=int, default=30)
```

- [ ] **Step 2: Add the handler**

In `src/agency/cli.py`, add this block directly before the `if args.command == "talk":` block:

```python
    if args.command == "cycle":
        summary = run_cycle(
            conn=conn, workspace=workspace, engine=engine,
            target=args.target, budget=args.budget, max_steps=args.max_steps,
        )
        print(summary)
        return 0
```

Add the import at the top of `cli.py` (next to the other `from agency...` imports):

```python
from agency.cycle import run_cycle
```

- [ ] **Step 3: Verify suite + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/mypy`
Expected: all green. (The handler is thin glue; the `talk`/`plan` subcommands are likewise not unit-tested. The default lock/pause paths come from `run_cycle`'s defaults.)

- [ ] **Step 4: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/cli.py
git commit -m "feat(cli): add cycle subcommand"
```

---

## Task 3: Wrapper script, LaunchAgent plist, README

**Files:**
- Create: `scripts/agency-cycle.sh`
- Create: `scripts/com.agency.cycle.plist`
- Create: `scripts/README.md`

- [ ] **Step 1: Create the wrapper script**

Create `~/agency/scripts/agency-cycle.sh` with exactly:

```bash
#!/bin/bash
set -euo pipefail

# Token lives in ~/.agency-token (chmod 600), which `export`s CLAUDE_CODE_OAUTH_TOKEN.
# shellcheck disable=SC1090
source "$HOME/.agency-token"
unset ANTHROPIC_API_KEY

# Ensure gh/node/git are on PATH under launchd's minimal environment.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

gh auth switch --user ValYord >/dev/null 2>&1 || true

mkdir -p "$HOME/agency-logs"
LOG="$HOME/agency-logs/cycle-$(date +%F).log"

echo "=== cycle start $(date) ===" >> "$LOG"
"$HOME/agency/.venv/bin/agency" \
  --workspace /Users/valeryordanyan/real-estate-campony \
  cycle >> "$LOG" 2>&1
echo "=== cycle end $(date) ===" >> "$LOG"
```

Then make it executable:

```bash
chmod +x ~/agency/scripts/agency-cycle.sh
```

- [ ] **Step 2: Create the LaunchAgent plist**

Create `~/agency/scripts/com.agency.cycle.plist` with exactly:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agency.cycle</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/valeryordanyan/agency/scripts/agency-cycle.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict>
            <key>Hour</key><integer>10</integer>
            <key>Minute</key><integer>0</integer>
        </dict>
        <dict>
            <key>Hour</key><integer>23</integer>
            <key>Minute</key><integer>0</integer>
        </dict>
    </array>
    <key>StandardOutPath</key>
    <string>/Users/valeryordanyan/agency-logs/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/valeryordanyan/agency-logs/launchd.err.log</string>
</dict>
</plist>
```

- [ ] **Step 3: Create the README**

Create `~/agency/scripts/README.md` with exactly:

```markdown
# Local scheduler (agency cycle)

Runs `agency cycle` (plan + deliver, lock-guarded) at 10:00 and 23:00 daily, while the Mac
is awake and online. Two ~5-task batches per day.

## Install (once)

1. Store the Max token (chmod 600 so only you can read it):
   ```bash
   echo 'export CLAUDE_CODE_OAUTH_TOKEN=<token-from `claude setup-token`>' > ~/.agency-token
   chmod 600 ~/.agency-token
   ```
2. Make the wrapper executable and install the LaunchAgent:
   ```bash
   chmod +x ~/agency/scripts/agency-cycle.sh
   cp ~/agency/scripts/com.agency.cycle.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.agency.cycle.plist
   ```
3. (Optional) run one batch now to verify:
   ```bash
   launchctl start com.agency.cycle
   tail -f ~/agency-logs/cycle-$(date +%F).log
   ```

## Pause / resume (kill switch)

```bash
touch ~/.agency-paused     # next cycles log "paused" and do nothing
rm ~/.agency-paused        # resume
```

## Uninstall

```bash
launchctl unload ~/Library/LaunchAgents/com.agency.cycle.plist
rm ~/Library/LaunchAgents/com.agency.cycle.plist
```

## Notes

- The Mac must be awake and online at 10:00 and 23:00. If it is asleep, launchd runs the job
  on the next wake (or skips it). This is a local stepping stone — cloud (off-machine) is #4b.
- The agent's bash is NOT sandboxed (ADR-005); sandboxing is #5. Review `~/agency-logs/` regularly.
- Logs: `~/agency-logs/cycle-<date>.log` (per-run) and `launchd.{out,err}.log`.
```

- [ ] **Step 4: Commit**

```bash
cd /Users/valeryordanyan/agency
git add scripts/agency-cycle.sh scripts/com.agency.cycle.plist scripts/README.md
git commit -m "feat(scheduler): wrapper script, LaunchAgent plist, install docs"
```

---

## Task 4: ADR-010 + full gate

**Files:**
- Create: `docs/adr/010-local-scheduler.md`

- [ ] **Step 1: Write the ADR**

Create `~/agency/docs/adr/010-local-scheduler.md`:

```markdown
# ADR-010: Local scheduler

**Status:** Accepted (2026-07-03)

**Context:** The agency can plan its own backlog and deliver autonomously, but a human still
starts each run. We want a daily, hands-off cadence without yet taking on cloud hosting.

**Decision:** Add `agency cycle` (a small `cycle.py`: pause-check -> lock -> plan -> deliver ->
summary) and a macOS LaunchAgent that fires it at 10:00 and 23:00, giving two ~5-task batches a
day. A PID lock (`~/.agency-cycle.lock`) prevents overlapping batches; a pause file
(`~/.agency-paused`) is a one-touch kill switch. The token is read from `~/.agency-token`
(chmod 600) by a wrapper script; logs go to `~/agency-logs/`.

**Consequences:** The agency runs unattended while the Mac is awake and online — not
computer-independent (that is #4b, cloud) and NOT sandboxed (ADR-005 still applies; sandboxing
is #5). Guardrails: per-batch budget cap, lock, pause switch, and daily logs. Token longevity
and rate-limit backoff are follow-ups (#5).
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/010-local-scheduler.md
git commit -m "docs: ADR-010 local scheduler"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `agency cycle` skips when paused or already-running (unit-tested); otherwise plans then
  delivers, releasing the lock even on failure.
- `scripts/agency-cycle.sh`, `scripts/com.agency.cycle.plist`, and `scripts/README.md` exist so
  the user can install the 10:00/23:00 LaunchAgent; ADR-010 committed.
- The scheduler runs the (still unsandboxed) agency — #5 sandbox and #4b cloud remain follow-ups.
