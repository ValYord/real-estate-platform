# Agency Project — Session Handoff (2026-06-23)

> Read this first when continuing in a new session. Memory (`agency-project.md`, `language-policy.md`)
> auto-loads, but this is the precise "you are here / do this next".

## TL;DR
We built **"agency"** — an autonomous multi-agent software team — from scratch (Plans 1–6), and
it now runs on the user's **Claude Max subscription**. Next concrete action: the **first live run**
(scaffold the real-estate product through the full PR→CI→review→gated-merge flow).

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

## NEXT ACTION — first live build (scaffold, through delivery)
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
