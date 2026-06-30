# Agency — Autonomous Multi-Agent Orchestration Platform

**Date:** 2026-06-23
**Status:** Design (approved) → next: implementation plan
**Authors:** Valery + Claude (brainstorming session)

> **Language policy:** All artifacts (this spec, docs, code, comments, commits) are written in
> English only, to avoid mixed-script corruption. Chat replies to the user are in Armenian/Russian.

---

## 1. Goal and Vision

Build a **"digital team"** — an autonomous multi-agent system that takes software work from zero
to production. The user talks to a single **Product Manager (PM) agent** in natural language
(e.g. "find an important feature for us", "do market research"). The system then autonomously
researches, decides, creates and dispatches tasks, and specialist agents do design → code → test,
fixing bugs in an autonomous loop.

**Dual goal.**
1. **Reusable platform** — agency is generic and can serve any project.
2. **Real use** — the first real target project (real-estate / fitneks) will be built with it.

**Autonomy level.** Fully autonomous. Instead of human approval, internal "verification gates"
(passing tests, multi-agent review) decide quality.

---

## 2. Scope

### 2.1 This spec (Thin Slice — first version)
The smallest working system that proves the concept: **4 roles + orchestrator**.

- **Product Manager (PM)** agent — conversational, research, feature→task + acceptance criteria, final review
- **Designer** agent — UX/UI design, wireframe/spec, design tokens
- **Developer** agent — code per task + design
- **QA** agent — unit/integration tests + browser tests (Playwright), bug→task loop
- **Orchestrator** (code, not LLM) — queue, state machine, routing, loop safety

### 2.2 Out of scope (later phases)
- 24/7 always-on server, Postgres, distributed queue (we start with SQLite)
- Additional roles (DevOps, Security, Data, Tech Writer agents)
- Deep self-improvement automation (first bootstrap steps are manual)
- Building the real-estate / fitneks product itself (separate spec, after agency)

> **Decomposition.** This is two separate projects: (1) the agency platform (this spec), and
> (2) the target product. We build the agency first, then use it to build the product.

---

## 3. Architecture

```
   USER ──💬── ┌──────────────────────────────┐
   (high-level │    PRODUCT MANAGER agent      │
   command)    │  • conversation • research    │
               │  • idea → task + criteria     │
               │  • review of results          │
               └──────────────┬───────────────┘
                              │ tasks
               ┌──────────────▼───────────────┐
               │        ORCHESTRATOR (code)    │
               │  queue • state • routing • loop│
               └──────────────┬───────────────┘
           ┌──────────┬───────┴───────┬──────────┐
           ▼          ▼               ▼          ▼
     ┌─────────┐ ┌─────────┐    ┌─────────┐  (later:
     │Designer │ │Developer│    │   QA    │   DevOps,
     │  agent  │ │  agent  │    │ unit +  │   Security…)
     └─────────┘ └─────────┘    │ browser │
           ▲                     └────┬────┘
           └──────────────────────────┘ bug → new "fix" task → loop
```

**Key decisions.**
- **Orchestrator is plain code** (not an LLM) — queue + state + routing → cheap, reliable, easy
  to self-improve later.
- **Each agent = Claude Agent SDK** — tool use, file edit, bash built in. Hybrid approach: a thin
  custom core + a proven agent engine.
- **State in SQLite** — a file, no server. Later we promote to Postgres.
- **Verification gate** = QA's green tests, in place of human approval.

---

## 4. Components and Responsibilities

| Component | Type | Responsibility | Tools |
|---|---|---|---|
| **PM agent** | 🧠 LLM | Conversation • web research/market • feature→task + acceptance criteria • final review | web search/fetch, task-create |
| **Designer agent** | 🧠 LLM | UX/UI design • wireframe/spec • design tokens • handoff to Dev | file r/w, web |
| **Developer agent** | 🧠 LLM | Code per task + design • file edit • run | file edit, bash |
| **QA agent** | 🧠 LLM | unit/integration tests • browser tests (Playwright) • bug→task | bash, Playwright |
| **Orchestrator** | ⚙️ code | queue • state (SQLite) • routing • loop • retry/budget | — |
| **Agent runtime** | ⚙️ code | Run each agent via Claude Agent SDK with system prompt + tool allowlist | Claude API |

---

## 5. Task Flow and State

**State machine.**
```
new → in_design → in_dev → in_qa → done
                    ▲          │
                    └──────────┘  bug found → new "fix" task (parent_id)
```

**SQLite tables.**
- `tasks` — id, title, description, acceptance_criteria, status, parent_id, assigned_role, created_at, updated_at
- `artifacts` — id, task_id, type (design|code|test), path, summary, created_at
- `events` — id, task_id, agent, action, result, tokens, timestamp (full history: debug + self-learning)
- `messages` — id, role, content, created_at (conversation with PM)

**Loop safety (critical in autonomous mode).**
- `max_retry` per task (default 3) — avoid infinite PM↔Dev↔QA ping-pong
- Token/cost budget for the whole run — stop when exceeded
- Every step written to `events` → fully transparent history

---

## 6. Verification and Testing

**Agent verification gate** = QA's green tests (in place of human approval).

**QA agent blueprint = fitneks `/code-review` pattern** (proven, not reinvented):
- gate-check (is review even warranted?)
- parallel specialized reviewers (bug, security/logic, conventions, ADR compliance)
- validation subagents (confirm each issue with high confidence)
- high-signal filter (drop false positives)

**Testing the agency system itself** — pytest + TDD. Orchestrator unit tests (queue, state
machine, routing) so it does not break itself during bootstrap. Lint gate (ruff + mypy) must pass.

---

## 7. Quality from Day One (fitneks lessons applied to agency)

| Principle | In agency |
|---|---|
| **Conventions doc** | Own `CLAUDE.md` for Python: structure, type hints, `logging` not `print`, where business logic lives, naming |
| **ADRs** | `docs/adr/` — ADR-001 hybrid orchestrator, ADR-002 SQLite state, ADR-003 Claude Agent SDK, ADR-004 loop safety limits |
| **Testing discipline** | pytest + TDD, ruff/mypy lint gate (required before merge) |
| **Multi-agent QA gate** | QA agent = `/code-review` pattern |
| **Self-learning** | Orchestrator writes lessons from `events` into `CLAUDE.md` "Known Mistakes" → agents read them next time |

---

## 8. Project Layout

```
agency/
  orchestrator/      # queue, state, routing, loop (code)
  agents/            # pm.py, designer.py, developer.py, qa.py
    prompts/         # system prompt per role
  runtime/           # Claude Agent SDK wrapper (system prompt + tool allowlist)
  db/                # SQLite schema + migrations
  tests/             # pytest (orchestrator, state machine, routing)
  docs/adr/          # ADR-001..004
  CLAUDE.md          # Python conventions + Known Mistakes
  cli.py             # `agency talk` — conversation with PM
```

---

## 9. Stack

- **Language:** Python
- **Agent engine:** Claude Agent SDK (Anthropic, latest Claude models)
- **State:** SQLite (Postgres later)
- **Browser tests:** Playwright
- **Quality:** pytest, ruff, mypy

---

## 10. Open Questions / Later Decisions

- Final location (folder) of the agency code — decide in the implementation plan
- Git init (current working dir is not yet a git repo) — needed to commit the spec
- Target product documentation (other session) = the agents' "fuel"; start implementation once
  docs are ready and in English
- Depth of bootstrap (self-improvement) — manual in the first slice, automated later

---

## 11. Next Step

Implementation plan (writing-plans skill) → build the thin slice with TDD.
Start implementation once the target product documentation is ready (and in English).
