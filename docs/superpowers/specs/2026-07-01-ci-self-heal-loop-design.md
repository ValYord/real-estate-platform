# CI Self-Heal Loop — Design (2026-07-01)

## Problem

The agency's autonomous delivery (`Shipper.ship`) ships a task, waits for CI, and merges only
when CI is green and there are no blocking review findings. When CI **fails**, it leaves the PR
open and returns — there is no automatic recovery. During the first live build this stalled the
pipeline: a human (us) had to diagnose the CI failure and push a fix. For an unattended,
scheduled team that runs ~5 tasks/day, the first failing PR would otherwise leave broken work
un-recovered. This sub-project adds a **bounded CI self-heal loop**: on CI failure, feed the
failure logs back to the Developer agent, push a fix, and re-check — up to a limit, then park.

This is sub-project **#3** of the autonomous-team roadmap. It is the prerequisite that unblocks
unattended operation. Non-goals here: autonomous planner (#1), doc-gap agent (#2), scheduler
(#4), sandbox/token/budget hardening (#5), and auto-fixing blocking **review findings** (a
sibling of this loop, deferred).

## Goals

- On CI failure, automatically attempt to fix and re-run CI, bounded by a max attempt count.
- Reuse the existing Developer agent for the fix (DRY) and keep `Shipper` deterministic (ADR-001).
- On exhaustion, **park**: leave the PR open and let the run continue to the next task (no hang).
- Keep the test suite offline; no interface/threshold changes to the review or gate.

## Current state (verified)

- `delivery/shipper.py` — `Shipper.ship(task)`: branch → `commit_all` → push → `pr_create` →
  `confirmed_findings` (review) → `pr_comment` → `wait_ci` → gate (merge iff `ci=="success"`
  and no critical/important) → `sync_main`. On failure it logs a warning and returns; no retry.
- `delivery/git_ops.py` — `GitGhPort` protocol + `GitGh` (real) + `FakeGitGh` (offline double).
  `wait_ci(pr_url)` returns `"success" | "failure" | "timeout"`. `FakeGitGh.wait_ci` returns a
  single fixed status.
- `app.py` — builds the `Shipper` and wires `on_done(task) -> shipper.ship(task)`.
- `orchestrator.py:63` — calls `on_done` **only** on the transition to `TaskStatus.DONE`, then
  continues its loop (picks the next actionable task). So a parked task (still `DONE`) is never
  re-shipped, and the run proceeds automatically.
- `domain.py` — `TaskStatus` = NEW, IN_DESIGN, IN_DEV, IN_QA, DONE, FAILED (no BLOCKED). Park
  therefore needs **no** status change.

## Design

### Approach (chosen)

Extend `Shipper` with a bounded loop implemented in a small, unit-testable helper `CiHealer`.
`Shipper` stays the deterministic driver; the *fix* is agent-driven (Developer). Rejected
alternatives: routing CI failures into the QA bug-loop (QA runs before the PR exists —
architecturally wrong), and inlining the loop in `ship()` (harder to test).

### Components / changes (agency, `~/agency`)

1. **`GitGhPort` + `GitGh` + `FakeGitGh` (`delivery/git_ops.py`)**
   - Add `ci_logs(pr_url: str) -> str`. `GitGh` implements it via
     `gh run view <latest-run-for-pr> --log-failed` (the failed steps only, to keep the prompt
     small). `FakeGitGh` returns a scripted string.
   - `FakeGitGh.wait_ci` accepts a **sequence** of statuses (e.g. `["failure", "success"]`),
     popping one per call, so the loop can be tested. When the sequence is exhausted it returns
     its last value.

2. **`CiHealer` (new, `delivery/ci_healer.py`)**
   - `heal(task, pr_url, branch) -> HealResult(ci_status, attempts, tokens)`.
   - Loop up to `max_attempts` (default **3**):
     1. `logs = git.ci_logs(pr_url)`
     2. run the **Developer agent** with a fix prompt: the task, the diff/context, and the CI
        failure `logs`, instructed to make CI (lint + test + build) pass; it edits files in the
        workspace (which is on the feature branch at this point).
     3. `git.commit_all("fix: address CI failure (attempt N)")`; `git.push(branch)`.
     4. `ci_status = git.wait_ci(pr_url)`; if `"success"`, return; else continue.
   - Accumulates tokens from each Developer run into `HealResult.tokens`.
   - Reuses the same Developer runner the orchestrator uses (no new agent role).

3. **`Shipper.ship` (`delivery/shipper.py`)**
   - After the first `wait_ci`, if `ci_status == "failure"`, call
     `CiHealer.heal(task, pr_url, branch)` and use its returned `ci_status`.
   - The gate is unchanged: `merge` iff `ci_status == "success"` and no blocking findings.
   - `ShipResult` gains `ci_fix_attempts: int` and `parked: bool` (`parked = not merged and
     ci_status != "success"`). Blocking review findings with green CI still park (auto-fixing
     findings is out of scope).

4. **Park handling (`app.py`)**
   - `on_done` inspects the `ShipResult`. On `parked`, it logs a clear line and records a
     delivery event (`agent="shipper", action="park", result="ci failed after N attempts; PR <url> left open"`).
     No task-status change; `on_done` returns so the orchestrator continues to the next task.

### Data flow

```
wait_ci → "failure" ──> CiHealer.heal:
    repeat ≤ max_attempts:
        ci_logs(pr) → Developer(fix, logs) → commit_all → push → wait_ci
      success → return "success"
      exhausted → return last "failure"
  back in ship(): gate → merge (success + no blocking) | park (leave PR open)
app.on_done: if parked → log + record event; return (run continues)
```

## Error handling

- Developer fix run raises → caught in `heal`, counts as a failed attempt (continue/park); never
  propagates out of `ship` (delivery stays exception-safe, per ADR-007).
- `push` after a fix races the next CI run: `wait_ci` treats pending/in-progress as "keep
  waiting" (existing behavior) and its own timeout bounds each wait.

## Testing (TDD, offline)

- `tests/delivery/test_ci_healer.py`:
  - success-after-retry: `FakeGitGh.wait_ci = ["failure", "success"]`, `FakeEngine` scripts one
    Developer fix reply → `heal` returns `success`, `attempts == 1`, one commit + one push.
  - exhaustion: `wait_ci` always `"failure"` → `attempts == max_attempts`, returns `failure`.
- `tests/delivery/test_shipper.py` (extend): CI fails then heals → merged; CI never heals →
  `parked is True`, not merged.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green. Suite stays offline
  (`FakeGitGh` + `FakeEngine`); real `gh`/CI exercised only by the next live run.

## Rollout / config

- `Shipper.__init__` gains `max_ci_fix: int = 3`, threaded from `app.py` (optionally a CLI flag
  later). Default 3 keeps loops bounded (ADR-004).
- New ADR (008) records the CI self-heal decision and the park-on-exhaustion behavior.

## Risks

- A confidently-wrong Developer fix could push repeatedly without progress — bounded by
  `max_attempts` and budget; park is the backstop.
- `gh run view --log-failed` output can be large — we pass only failed steps; the plan truncates
  to a sane cap before prompting.
