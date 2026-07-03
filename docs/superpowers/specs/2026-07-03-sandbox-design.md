# Sandbox (#5a) — Design (2026-07-03)

## Problem

The agency runs agent-generated bash directly on the host with the user's credentials (ADR-005).
Unattended (via the #4a scheduler), a mistaken or prompt-injected command could damage the host
or read host files outside the project. This sub-project runs the whole agency **inside a Docker
container** so the blast radius of agent bash is contained to the mounted workspace, and scopes
the GitHub credential so a leak can only touch the one repo.

**Feasibility was de-risked by a spike (2026-07-03):** in a plain `python:3.12-slim` container,
`pip install -e .` pulls the **Linux** Claude Code CLI (verified ELF, `claude --version` →
`2.1.191`), and `agency --help` runs. So the agency + SDK work headless in Linux Docker. The one
remaining unverified bit — headless token *auth* for a real agent call — is a documented
verification step (needs the token) before wiring into the scheduler.

This is sub-project **#5a**. Non-goals: token longevity (#5b), cloud/off-machine (#4b), and
network-egress filtering (the agency needs Claude+GitHub network, so perfect isolation against a
malicious agent is out of reach — this is blast-radius reduction, chiefly against mistakes).

## Goals

- A Docker image that runs the agency (`run`/`cycle`) headless in Linux, with Node/npm/gh/git for
  the workspace's product builds and git operations.
- Only the workspace repo is mounted (rw); nothing else on the host is reachable from the container.
- The GitHub credential is a **fine-grained PAT scoped to only `ValYord/real-estate-platform`**.
- The #4a scheduler's wrapper runs the sandboxed container instead of the host `agency`.

## Threat model (honest)

Effective against: agent **mistakes** (a bad `rm`, a runaway command) and **prompt-injection**
side effects — the container can't touch `~/`, ssh keys, or other projects. Partial against a
truly **malicious** agent: it still has network + a repo-scoped token, so it could misuse *that
repo* or attempt exfiltration over the network. Mitigations: repo-scoped PAT (limits GitHub blast
radius) and workspace-only mount (limits filesystem blast radius). The mounted workspace is itself
writable (a bad command could corrupt the working copy) but it is git-backed and pushable, so
recoverable.

## Current state (verified)

- The agency installs via `pip install -e .` (pyproject: `agency = agency.cli:main`,
  dep `claude-agent-sdk>=0.2.107`). The bundled `claude` CLI is platform-specific (macOS binary on
  the host; Linux binary after a fresh in-container install — confirmed by the spike).
- `agency` global args `--db` and `--workspace` precede the subcommand; `run_agency`/`cycle` do
  git + `gh` operations (branch/commit/push/PR/merge) via `GitGh`.
- #4a `scripts/agency-cycle.sh` currently runs the host `~/agency/.venv/bin/agency ... cycle`.

## Design

### Approach (chosen)

Whole-agency-in-Docker. Rejected: sandboxing only the Bash tool (the SDK has no hook to redirect
bash into a container) and a bash allow/deny-list (brittle, not real isolation).

### Components (agency `~/agency`)

1. **`docker/Dockerfile`** — `FROM python:3.12-slim`; apt-install `git`, `curl`, `ca-certificates`,
   Node 20 (`nodesource`), `npm`, and `gh` (GitHub apt repo); `COPY pyproject.toml README.md src/`;
   `pip install --no-cache-dir -e .` (Linux Claude CLI comes with it). `ENTRYPOINT` is a small
   `docker/entrypoint.sh`.

2. **`docker/entrypoint.sh`** (baked into the image) — `git config --global --add safe.directory
   /workspace` (the mount is owned by a different uid); `gh auth setup-git` (so `git push` uses the
   `GH_TOKEN`-authenticated https helper); then `exec agency "$@"`.

3. **`.dockerignore`** (repo root) — exclude `.venv`, `.git`, `__pycache__`, `.mypy_cache`,
   `agency.db`, so the build context is small and host-arch artifacts don't leak in.

4. **`docker/run-sandbox.sh`** — the launch wrapper:
   - `source ~/.agency-token` (`CLAUDE_CODE_OAUTH_TOKEN`) and `~/.agency-gh-token`
     (`export GH_TOKEN=<fine-grained repo-scoped PAT>`).
   - `docker run --rm -v <workspace>:/workspace -v ~/agency-state:/state
     -e CLAUDE_CODE_OAUTH_TOKEN -e GH_TOKEN -e GIT_*_NAME/EMAIL agency-sandbox
     --db /state/agency.db --workspace /workspace "$@"`.
   - So `run-sandbox.sh cycle` or `run-sandbox.sh run --deliver ...` runs sandboxed; the SQLite db
     and any state live in the mounted `~/agency-state` (persist across runs; kept out of the repo).

5. **`scripts/agency-cycle.sh` (modify, from #4a)** — call `docker/run-sandbox.sh cycle` instead of
   the host `agency ... cycle`, so scheduled batches are sandboxed. Logging unchanged
   (`~/agency-logs/`).

6. **`docker/README.md`** — build (`docker build -t agency-sandbox -f docker/Dockerfile .`), create
   the two token files (Max token + a fine-grained PAT limited to the one repo with
   contents/PR/workflow write), verify (`run-sandbox.sh plan --target 1` then a small
   `run --deliver` to confirm headless auth + a full task end-to-end), then rely on #4a.

7. **ADR-012** — records the whole-agency-in-Docker decision, the workspace-only mount, the
   repo-scoped PAT, and the honest threat-model limits.

### Data flow

```
launchd (#4a) → scripts/agency-cycle.sh → docker/run-sandbox.sh:
    docker run --rm -v ~/real-estate-campony:/workspace -v ~/agency-state:/state
        -e CLAUDE_CODE_OAUTH_TOKEN -e GH_TOKEN  agency-sandbox  --db /state/agency.db
        --workspace /workspace cycle
    → entrypoint: safe.directory + gh auth setup-git → agency cycle (plan + deliver, sandboxed)
```

## Testing / verification (honest — this is an infra sub-project)

There is little unit-testable Python here; the deliverables are a Dockerfile, scripts, and docs.
Verification is integration:
- **Build:** `docker build -t agency-sandbox -f docker/Dockerfile .` succeeds.
- **Environment (no token):** `docker run --rm agency-sandbox --help` prints usage; the bundled
  `claude --version` runs (ELF) — already confirmed by the spike.
- **Auth + end-to-end (token, user-run):** `run-sandbox.sh plan --target 1` creates a task, then
  `run-sandbox.sh run --deliver --budget 100000 --max-steps 6` designs→dev→QA→PR→CI→merge one task
  from inside the container — proving headless auth, git/gh push from the container, and workspace
  builds all work. Only after this passes do we point #4a at the sandbox.
- The agency's own `pytest`/`ruff`/`mypy` suite is unchanged and stays green (no `src/` logic
  changed by this sub-project except the #4a wrapper, which is a shell script).

## Risks

- **Headless token auth in-container** is the last unverified assumption; the verification step
  above gates adoption. If the OAuth token can't authenticate headless in the container, we fall
  back (e.g. mount the host Claude config) — decided during implementation from the actual result.
- Node/gh apt install adds image size + build time; acceptable for a daily job.
- First `npm ci` inside the container is uncached (slower first build per task); a named npm-cache
  volume is a possible later optimization (out of scope).
