# Agency Project — Session Handoff (2026-06-23)

> Read this first when continuing in a new session. Memory (`agency-project.md`, `language-policy.md`)
> auto-loads, but this is the precise "you are here / do this next".

## TL;DR
We built **"agency"** — an autonomous multi-agent software team — from scratch (Plans 1–6), and
it now runs on the user's **Claude Max subscription**. Next concrete action: the **first live run**
(scaffold the real-estate product through the full PR→CI→review→gated-merge flow).

## Update (2026-07-01) — review rigor + project rules
Before the first live build we hardened the review and adapted it to our stack
(spec/plan in `docs/superpowers/{specs,plans}/2026-07-01-review-rigor-adaptation*`):
- Agency review (stack-agnostic): shared instruction now carries a **high-signal
  flag-only / do-NOT-flag contract**; the `conventions` reviewer **MUST read** the root +
  per-changed-dir `CLAUDE.md` (and `docs/adr/` if present), enforcing only path-scoped rules.
  Agency `master`: `pytest` 91 passed/1 skipped, ruff + mypy green.
- Real-estate repo: added root **`CLAUDE.md`** (Next.js15/Supabase/PostGIS Reviewer Checklist) —
  pushed to `origin/main`. The agency reviewer reads it from the local workspace at review time.
NEXT ACTION below (first live scaffold run) is unchanged and still pending.

## Two separate things
1. **The agency (the tool)** — code at `~/agency/` (own git repo, branch `master`, NOT on GitHub).
   Python 3.12 in a uv venv at `~/agency/.venv`. ~89 tests, ruff + mypy --strict all green.
2. **The target product** — a greenfield **real-estate platform** (unnamed). Spec at
   `~/real-estate-campony/docs/en/` (26 pages, Next.js 15 + Supabase + PostGIS + Mapbox).
   Git repo → GitHub **`ValYord/real-estate-platform`** (public, default branch `main`).
   `fitneks` is a DIFFERENT project — do not conflate.

## What the agency does (all built)
PM (research + web) → tasks → Designer → Developer → QA, with:
- Multi-agent **code review** (bugs/security/conventions + adversarial validation) — `--review`/delivery.
- **Autonomous bug loop**: QA BUG_FOUND → Developer retry (max_retry, token budget).
- **Self-learning**: failures → one-line lesson in `<workspace>/KNOWN_MISTAKES.md`.
- **Runs on Max subscription** via Claude Agent SDK behind an `Engine` seam (no API key/billing).
- **Autonomous delivery** (`--deliver`): task DONE → commit → feature branch → PR → CI → review
  comments → **gated merge to main** (merge ONLY if CI green AND no Critical/Important findings;
  else PR left open). Exception-safe; `wait_ci` uses `gh pr checks` exit code.

ADRs: 001 hybrid orchestrator, 002 sqlite, 003 agent-sdk, 004 loop-safety, 005 bash trust
boundary, 006 agent-sdk-subscription, 007 autonomous-delivery (all in `~/agency/docs/adr/`).

## Environment / how to run
- gh CLI authed; **use the ValYord account**: `gh auth switch --user ValYord`.
- Token: `export CLAUDE_CODE_OAUTH_TOKEN=<Max token from \`claude setup-token\`>` (ANTHROPIC_API_KEY unset).
- Tools: `~/agency/.venv/bin/{python,pytest,ruff,mypy,agency}`.
- Commands:
  - Talk to PM: `~/agency/.venv/bin/agency --workspace /Users/valeryordanyan/real-estate-campony talk`
  - Autonomous run + delivery: `... run --deliver --budget 250000 --max-steps 10` (also `--review`, `--model`).
- Verified working: a live PM gap-analysis already ran on the Max subscription (read docs + web
  research with real citations; off-plan "New Developments" flagged as the #1 gap for Yerevan).

## LIVE VALIDATION RUN (2026-07-01) — planner + self-heal proven
Ran `agency plan --target 5` (planner's first live use) → a 5-task backlog (#3 i18n, #4 Supabase
schema+RLS, #5 Auth, #6 Search+Map, #7 Property). Then `run --deliver`. Outcomes:
- **ALL 7 backlog tasks shipped + auto-merged (8 PRs, 0 parked, ~441k tokens).** After the
  max_turns bump the re-run flew through the rest: Scaffold (PR#1), gitignore (PR#2), Home
  (PR#3), i18n (PR#4), Supabase+RLS+vitest (PR#5), Auth (PR#6), Search+Map/Mapbox (PR#7),
  Property SSR+JSON-LD (PR#8). The entire Phase-1 MVP page set + data foundation was built
  autonomously (planner → design → dev → QA → PR → CI → self-heal → merge).
- **CI self-heal proven live**: PR#5's CI failed → CiHealer fixed → CI green → merged.
- **Robustness fix proven**: agents intermittently hit the SDK max-turns limit and RAISED,
  which used to crash the whole run. Fixed so it's contained (`SdkEngine.run` → is_error reply;
  `Orchestrator.step` wraps runner → Outcome.ERROR). Agents now retry and recover; the run
  never dies. (agency commit `3fadab4`.)
- **Tuning**: default `max_turns` raised 40→80 (agency `7ec7c9e`) — 40 was too low, causing
  rabbit-hole churn (wasteful retries, slow runs). Follow-up ideas: make `--max-turns`
  configurable (currently `AgentRequest.max_turns` default overrides the engine's); tighten
  agent prompts; the planner slightly over-scoped #6/#7 (page-level) — planner dedup/scoping
  could be stricter (a #1 refinement).
- Agency master gate after all fixes: 105 passed/1 skipped, ruff + mypy green.

**Next:** the backlog is empty (all 7 done). Run `agency plan --target 5` to generate the next
slice (Phase-1 continues: Dashboard, Favorites, Saved searches, Messages, Settings, Listing
wizard, plus deepening the pages already stubbed), then `run --deliver`. Or build the remaining
autonomous-team roadmap (#2 doc-gap, #4 scheduler, #5 safety) for hands-off daily operation.
Verify the merged product locally: `cd ~/real-estate-campony && npm install && npm run dev`.

## AUTONOMOUS-TEAM ROADMAP (2026-07-01)
Goal: a continuously self-running agent team that plans its own backlog from `docs/en/`,
runs ~5 tasks/day on a schedule, and progresses through all phases with mandatory CI —
no human intermediation. Decomposed into sub-projects, built in dependency order:
- **#3 CI self-heal loop — DONE.** On CI failure, `Shipper` runs a bounded `CiHealer`
  (≤3 attempts: logs → Developer → push → re-check), then **parks** (PR open + `shipper/park`
  event) and continues. Spec/plan `2026-07-01-ci-self-heal-loop*`; ADR-008; agency `master`
  97 passed/1 skipped, ruff+mypy green. This unblocks unattended operation.
- **#1 Autonomous planner — DONE.** `agency plan --target N` tops up the backlog to N pending
  tasks (idempotent, dedup, priority order, small/CI-scoped), reusing the engine + `create_task`
  tool with a `PLANNER_SYSTEM` prompt. Spec/plan `2026-07-01-autonomous-planner*`; ADR-009;
  agency `master` 102 passed/1 skipped, ruff+mypy green. Not yet exercised live.
- **#2 Doc-gap agent — TODO.** Agent finds doc gaps and writes the missing documentation.
- **#4a Local scheduler — DONE.** `agency cycle` (pause-check → PID lock → plan → deliver →
  summary) + a macOS LaunchAgent at 10:00 & 23:00 (two ~5-task batches/day). Kill switch:
  `touch ~/.agency-paused`. Spec/plan `2026-07-03-local-scheduler*`; ADR-010; agency `master`
  110 passed/1 skipped, ruff+mypy green. **Install (once, on the Mac):** see
  `~/agency/scripts/README.md` — write `~/.agency-token`, `cp` the plist to
  `~/Library/LaunchAgents/`, `launchctl load` it. Runs only while the Mac is awake+online.
- **#4b Cloud deploy — TODO.** Off-machine (VM/container) so it's computer-independent; needs
  host + token + gh/git + secrets. Depends on #5 (sandbox).
- **#5 Unattended safety — decomposed into 5a/5b/5c:**
  - **#5c Rate-limit backoff — DONE.** `SdkEngine.run` classifies transient/rate-limit errors
    (`is_retryable_error`: overloaded/rate-limit/429/timeout + the observed "error result:
    success") and retries with exponential backoff (10/30/90/270s, 4 retries, injectable sleep);
    non-retryable (max-turns) fails fast. Spec/plan `2026-07-03-rate-limit-backoff*`; ADR-011;
    agency `master` 114 passed/1 skipped, ruff+mypy green.
  - **#5a Sandbox — DONE (build verified; token-auth pending user).** `docker/Dockerfile`
    (python:3.12-slim + Node20/npm/gh/git + agency; Linux Claude CLI verified ELF in-container),
    `docker/run-sandbox.sh` (mounts ONLY `/workspace` + `/state`, creds via env), `entrypoint.sh`
    (safe.directory + `gh auth setup-git`). The #4a scheduler now calls the sandbox. Spec/plan
    `2026-07-03-sandbox*`; ADR-012; agency `master` 114 passed/1 skipped, ruff+mypy green.
    **User's remaining step:** create `~/.agency-token` + `~/.agency-gh-token` (a fine-grained PAT
    scoped to `ValYord/real-estate-platform`), then verify end-to-end:
    `~/agency/docker/run-sandbox.sh plan --target 1 && ~/agency/docker/run-sandbox.sh run --deliver
    --budget 100000 --max-steps 6` (proves headless token auth + git push from the container). See
    `~/agency/docker/README.md`. If headless auth fails in-container, fall back to mounting the host
    Claude config.
  - **#5b Token longevity — TODO.** Detect/refresh an expired `claude setup-token` so unattended
    runs don't silently die.

## FIRST LIVE BUILD — DONE (2026-07-01)
The first autonomous build shipped to `main`. Full pipeline ran on the Max subscription:
Designer -> Developer -> QA (success) -> branch -> **PR #1** -> CI. The gated merge correctly
**blocked** on a CI failure (PR left open), we fixed it, and **PR #1 squash-merged to `main`**
(commit `1c788cb`, "Scaffold minimal Next.js 15 app + CI"). ~29k tokens for the agent run.
- **Root cause of the CI failure:** the Developer generated `package-lock.json` on this macOS
  machine; CI (Linux, Node 20 / npm 10.8.2) rejected it under `npm ci` (native-dep hoisting:
  picomatch/tinyglobby). Fix committed to the PR: `.github/workflows/ci.yml` uses `npm install`
  instead of `npm ci`. Lessons recorded in `<workspace>/KNOWN_MISTAKES.md`.
- **Observations for agency improvement:** (1) no CI-failure feedback loop — a red CI does not
  re-engage the Developer (only QA does); (2) Developer over-delivered vs the trimmed task
  (kept next-intl/zustand/etc. + committed `tsconfig.tsbuildinfo`, a build artifact).
- **Follow-ups still open:** branch protection on `main` (now that CI exists); restore strict
  `npm ci` with a Linux-generated lockfile; `.gitignore` the tsbuildinfo/next-env artifacts.

## NEXT ACTION — first live build (scaffold, through delivery)  [COMPLETED — see above]
1. `gh auth switch --user ValYord` + export the token (above).
2. `agency ... talk` → ask PM to create ONE scaffold task that ALSO adds `.github/workflows/ci.yml`
   (install + lint + test + build on PRs), then `exit`. (Full prompt is in the chat / Plan 6 "First live run".)
3. `agency ... run --deliver --budget 250000 --max-steps 10`.
4. Watch the PR appear on `ValYord/real-estate-platform`, CI run, review post, and (if green +
   clean) auto-merge to `main`. Checkpoint: review the diff together before trusting it.
5. After the first PR establishes CI: enable GitHub branch protection on `main` (required checks)
   as defense-in-depth.

Then continue **incrementally, feature by feature** (Phase 1 MVP pages: Home, Search+Map, Property,
Wizard, Auth, Dashboard, Favorites, Saved searches, Messages, Settings), same loop. Update the
docs (Claude, English) when adopting PM-recommended gaps (e.g. New Developments, price/m², DOM,
AI search, tour scheduling). Re-run PM gap-analysis periodically.

## Policies / preferences
- **All artifacts in English only** (avoid mixed-script corruption); reply to the user in Armenian/Russian.
- Build with human **checkpoints** early (review before trusting autonomous merges).
- Plans live in `~/real-estate-campony/docs/superpowers/plans/` (orchestrator-core, agent-runtime,
  roles-and-cli, review-and-learning, agent-sdk-migration, autonomous-delivery). Specs in `.../specs/`.

## Open / not done
- First live scaffold run (the NEXT ACTION above) — not yet executed.
- Branch protection on `main` — recommended, not set.
- Bash is unsandboxed (ADR-005) — run untrusted tasks in a container/VM.
- Possible polish: parallelize reviewers; surface CI logs on failure; subscription rate-limit handling.
