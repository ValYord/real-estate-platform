# Planner Reliability — Design (2026-07-03)

## Problem

Verifying the sandbox surfaced a reliability bug in the planner (#1): `Planner.plan` makes a
single engine call, and the agent sometimes finishes without calling `create_task` (it describes
tasks in prose, asks a question, or spends its turns reading docs). When that happens `plan`
returns 0 and a scheduled `cycle` does no work. Observed: 2 of 3 sandboxed runs planned 0 tasks
(the same code created 5 on the host earlier — it is flaky, not broken). For reliable unattended
operation the planner must reliably enqueue work.

This is a refinement of sub-project #1. Non-goals: task *quality* (e.g. the planner over-scoping
page-level tasks), structured-output/forced-tool-use via the SDK, and anything in the sandbox or
scheduler.

## Goals

- `agency plan --target N` reliably creates tasks when work remains (bounded retries until it
  makes progress), instead of silently returning 0 on a flaky no-tool-call run.
- Keep it bounded (no infinite loop when there is genuinely nothing left to plan).
- Deterministic core is unit-tested offline.

## Current state (verified)

- `planner.py` — `Planner.plan(target=5)`: `pending = len(list_actionable())`; if `pending >=
  target` return 0; else one `engine.run(...)` with the `create_task` MCP tool; return
  `len(list_all()) - before`. A single attempt with no guarantee the agent calls the tool.
- `build_planner_prompt(gap, existing_titles)` and `PLANNER_SYSTEM` (in `prompts.py`) currently
  say "Create up to {gap} new tasks by calling create_task" — permissive ("up to", no MUST).
- The planner uses `self._engine.run(...)` directly (not via `EngineRunner`), so tests can inject
  an engine stub that simulates `create_task` by writing to the repo.

## Design

### Approach (chosen)

Prompt hardening **plus** a bounded retry-if-no-progress loop. The prompt reduces how often the
agent skips the tool; the retry loop is the reliability guarantee. Rejected: prompt-only (no
guarantee) and SDK forced-tool-use/structured-output (over-engineering for this seam).

### Component 1: prompt hardening (`prompts.py`, `planner.py`)

- `PLANNER_SYSTEM`: add a forceful clause — *you MUST call the `create_task` tool; do not
  describe tasks in prose, do not ask questions, and do not end your turn until you have created
  the requested tasks.*
- `build_planner_prompt(gap, existing_titles)`: change "Create up to {gap}" to *"Call `create_task`
  exactly {gap} times (one per task), in priority order. Do not reply in prose or ask questions —
  call the tool {gap} times, then stop."*

### Component 2: bounded retry loop (`planner.py` `Planner.plan`)

Add `_MAX_PLAN_ATTEMPTS = 3`. Rewrite `plan`:

```
if len(list_actionable()) >= target: return 0
before = len(list_all())
dry = 0
for _ in range(_MAX_PLAN_ATTEMPTS):
    gap = min(target - len(list_actionable()), _MAX_PLAN)
    if gap <= 0: break                       # enough pending tasks now
    count_before = len(list_all())
    existing = [t.title for t in list_all()]
    engine.run(AgentRequest(PLANNER_SYSTEM, build_planner_prompt(gap, existing), ...create_task tool...))
    if len(list_all()) == count_before:      # this attempt created nothing
        dry += 1
        if dry >= 2: break                   # 2 dry attempts => nothing to plan; stop
    else:
        dry = 0
return len(list_all()) - before
```

- **Retries the flaky case**: one dry attempt is followed by another attempt (the agent usually
  succeeds on retry, especially with the hardened prompt).
- **Bounded**: at most `_MAX_PLAN_ATTEMPTS` (3) engine calls; stops early when `pending >= target`
  (enough created) or after 2 consecutive dry attempts (genuinely nothing to plan / persistently
  unable), so it never loops forever and never spams tasks.
- Gap is recomputed each attempt so partial progress (e.g. 2 of 5 created) accumulates across
  attempts without over-creating.

### ADR

Add a one-line note to ADR-009 recording the retry-if-no-progress refinement (no new ADR — same
decision, hardened).

## Testing (TDD, offline)

A stub engine that simulates the agent calling `create_task` by writing to the repo:

```
class _TaskCreatingEngine:  # in the test
    def __init__(self, tasks, create_from_call=1): ... ; self.calls = 0
    def run(self, request):
        self.calls += 1
        if self.calls >= self._create_from: self._tasks.create(title=f"planned-{self.calls}", ...)
        return AgentReply("", None, 1, False)
```

- **retry then succeed**: `create_from_call=2` (first call dry, second creates one) → `plan(target=1)`
  returns 1 and `engine.calls == 2` (it retried).
- **always dry → bounded, returns 0**: a stub that never creates → `plan(target=1)` returns 0 and
  `engine.calls == 2` (stops after 2 consecutive dry attempts, not 3+).
- **skip when full**: `target` pending tasks already present → returns 0, engine never called.
- **prompt hardening**: `PLANNER_SYSTEM` and `build_planner_prompt(2, [...])` contain the forceful
  phrases (`MUST`, `create_task`, and the exact-count wording).
- Existing planner tests updated for the new prompt wording where needed.
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green; suite stays offline.

## Risks

- If the planner is *persistently* unable to call the tool (a deeper model/prompt problem), the
  loop stops after 2 dry attempts and returns 0 — same visible outcome as today but bounded and
  logged, and the hardened prompt should make this rare. Task quality remains a separate #1
  follow-up.
