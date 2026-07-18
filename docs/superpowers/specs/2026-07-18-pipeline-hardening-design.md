# Pipeline Hardening — Clean Autonomous Retrofit (agency #3 + #1) — Design

**Date:** 2026-07-18
**Status:** Approved (brainstorm), pending implementation plan
**Repo:** agency (`~/agency`, branch `master`) + product `.gitignore` (`~/real-estate-campony`, `main`)

## Goal

Make the autonomous delivery pipeline able to land clean retrofit PRs without human help. Two
defects (surfaced during the 2026-07-18 SP4 run) block this:

- **#3 — dirty commits.** `Shipper.ship` → `GitGh.commit_all` runs `git add -A`, and the
  orchestrator never resets the working tree, so a killed run's uncommitted residue and recurring
  infra noise (`.claude/settings.local.json`, `KNOWN_MISTAKES.md`) get swept into the next task's
  PR (observed on PR #35 /about).
- **#1 — blocking findings park forever.** `Shipper.ship` withholds merge when a review finding is
  critical/important (`_BLOCKING`) but never hands the finding back to a Developer to fix (only CI
  failures have `CiHealer` and visual findings have `_default_visual_fix`). So a real finding like
  /about's `Breadcrumbs neutral-300` nit leaves the PR open with no path to merge (8 PRs observed
  parked this way).

Companion to the already-landed **#11** (capture scrolls to reveal `whileInView` content, agency
`master` `36f924b`). Together, #11 + #3 + #1 let a retrofit task flow design→dev→QA→review→merge
cleanly.

## Non-goals

- No change to what the reviewers flag (dimensions/rubric) or to the visual gate itself.
- No orchestrator scheduling/model changes; no product page code.
- Not fixing the engine `1MB JSON buffer` / `max-turns-80` robustness (separate follow-up; the
  reset in #3 shrinks diffs and reduces its trigger, but it is out of scope here).

## Part 1 (#3a) — Reset the working tree at task start

The only safe reset point is when a task **starts** (its `NEW → in_design` transition), before
the Designer/Developer edit the tree — resetting on every actor step would wipe in-progress work.

- Add `reset_workspace()` to `GitGhPort` and `GitGh` (in `src/agency/delivery/git_ops.py`):
  ```
  git checkout -f <base>             # -f: force past a dirty tree or a prior task's branch
  git fetch origin <base>            # check=False (offline-tolerant)
  git reset --hard origin/<base>
  git clean -fd                      # remove untracked residue; ignored files (node_modules,
                                     # .next, and the gitignored noise files) are preserved
  ```
- Inject `prepare_workspace: Callable[[], None] | None = None` into `Orchestrator.__init__`
  (mirroring the existing `on_done` hook). In `Orchestrator.step`, when a task transitions
  `NEW → in_design`, call `self._prepare_workspace()` (if set) **before** returning. It runs once
  per task (the transition happens once); retries (`in_dev` after `BUG_FOUND`) do NOT reset.
- In `app.py` `run_agency`, wire `prepare_workspace = git_gh.reset_workspace` only on the deliver
  path (where `git_gh` exists); leave it `None` otherwise (non-deliver runs keep current behavior).
- `FakeGitGh` gains `reset_workspace()` that records the call (for orchestrator tests).

**Operating-model note:** the reset discards ALL uncommitted working-tree changes at task start.
This is safe under the sandbox model (the agency owns `/workspace`; humans use an isolated
worktree/clone per the shared-tree rule) and is the point of the fix.

## Part 2 (#3b) — Stop tracking the two noise files

Refinement of the brainstormed "relocate `KNOWN_MISTAKES.md` to `/state`": the coding agents are
told to read `KNOWN_MISTAKES.md` from the project (`runtime/prompts.py` lines ~10, ~60), so moving
it out of the workspace would break the learning-read loop. Instead, **untrack + gitignore** both
files in the product repo:

- `git rm --cached .claude/settings.local.json KNOWN_MISTAKES.md` (keep the files on disk).
- Add to `~/real-estate-campony/.gitignore`:
  ```
  .claude/settings.local.json
  KNOWN_MISTAKES.md
  ```

Effect: agents still read `KNOWN_MISTAKES.md` and `learning.append_known_mistake` still appends to
it in the workspace; but `git add -A` never stages it, and the Part-1 reset's `git clean -fd`
**keeps** it (git clean skips ignored files without `-x`). Lessons persist on the host mount across
runs; neither file ever pollutes a task PR. `learning.py` is unchanged.

## Part 3 (#1) — ReviewHealer: auto-fix blocking review findings

Mirror `CiHealer` (`src/agency/delivery/ci_healer.py`) as a new `ReviewHealer` in
`src/agency/delivery/review_healer.py`:

- `ReviewHealer(git_gh, engine, workspace, model=None, max_attempts=2)`.
- `heal(task, branch, findings, recheck) -> ReviewHealResult(findings, attempts, tokens)`:
  ```
  attempts = 0
  while attempts < max_attempts and any blocking (critical/important) in findings:
      attempts += 1
      re-engage the Developer (EngineRunner / Role.DEVELOPER) with a fix task whose
        description lists the blocking findings (title/file/severity/rationale) and says
        "fix these; change only what's needed; keep behavior"
      git_gh.commit_all("fix: address code-review findings (attempt N)")
      git_gh.push(branch)
      findings = recheck()          # re-run confirmed_findings over the new diff
  return ReviewHealResult(findings, attempts, tokens)
  ```
  `recheck` is a zero-arg callable the Shipper supplies (closes over `confirmed_findings(engine,
  workspace, task, model)`), keeping `ReviewHealer` decoupled from the review internals.

**Shipper integration** (`src/agency/delivery/shipper.py`, `ship()`): after the initial
`confirmed_findings`, if it has blocking findings and `max_review_fix > 0`, run
`ReviewHealer(...).heal(...)` and replace `findings` with its result — placed **before** the visual
gate, so both code-review and visual findings get a bounded fix pass before the final merge
decision. Add `max_review_fix: int = 2` to `Shipper.__init__`. The final gate is unchanged: merge
only if `ci_status == "success"` and no blocking findings remain; otherwise park (now only after
the heal loop has genuinely tried and failed).

## Architecture / files

```
src/agency/delivery/git_ops.py       # + reset_workspace() on GitGhPort/GitGh/FakeGitGh
src/agency/orchestrator.py           # + prepare_workspace hook, called on NEW->in_design
src/agency/app.py                    # wire prepare_workspace = git_gh.reset_workspace (deliver)
src/agency/delivery/review_healer.py # new: ReviewHealer (mirrors CiHealer)
src/agency/delivery/shipper.py       # + max_review_fix; run ReviewHealer before the visual gate
~/real-estate-campony/.gitignore     # + settings.local.json, KNOWN_MISTAKES.md (product main)
```

## Testing

- **reset at task start**: orchestrator test with `FakeGitGh`/fake prepare hook — `NEW→in_design`
  calls `prepare_workspace` exactly once; an `in_dev`-retry step does not; `prepare_workspace=None`
  path unchanged.
- **reset_workspace** on `FakeGitGh` records the call; `GitGh.reset_workspace` is integration
  (not unit-tested, like the rest of `GitGh`).
- **ReviewHealer.heal**: (a) blocking findings → re-engages Developer, commits, pushes, rechecks,
  clears within `max_attempts` → returns no-blocking result; (b) findings never clear → stops at
  `max_attempts`, returns still-blocking; (c) no blocking initially → no Developer call, 0 attempts.
  Use `FakeGitGh` + a fake engine + a `recheck` stub returning a scripted findings sequence.
- **Shipper**: with a scripted `recheck`, a blocking code finding that the heal clears now **merges**
  (was: parked); one that never clears still parks after `max_review_fix` attempts. Existing
  `tests/delivery/test_shipper_visual.py` stays green (visual path unchanged).
- Full agency suite + ruff + mypy green.

## Delivery

Agency changes on `master` (TDD per task, ruff + mypy, then rebuild `agency-sandbox`). Product
`.gitignore` + `git rm --cached` as a small commit on product `main`. Sequence: Part 1 → Part 2 →
Part 3 (independent; Part 3 is the largest).
