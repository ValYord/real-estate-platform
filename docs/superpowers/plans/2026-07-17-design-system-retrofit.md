# Design-System Retrofit (SP4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed 18 well-formed "retrofit" tasks into the agency DB so the autonomous agency
restyles the existing off-system pages onto the design system, and verify the pipeline
end-to-end on the first page before committing the whole queue.

**Architecture:** SP4 is an **orchestration** deliverable, not hand-written page CSS — the agency
does the retrofits. We build a small, tested seed module in the agency package
(`agency.sp4_seed`) that turns a route list into `TaskRepository` rows using one restyle
template, plus a thin CLI (`scripts/seed_sp4.py`). We seed one page first (`/about`), let it
flow through the existing Designer→Developer→QA(SP3 gate)→review→merge pipeline, inspect it, then
bulk-seed the remaining 17. Tasks run in `id` order, so they queue **after** the in-flight
new-page builds (tasks 32 `in_qa`, 33/34 `new`) — decision (a) from the spec.

**Tech Stack:** Python 3.12 (agency repo, `~/agency`, branch `master`, uv venv at
`~/agency/.venv`), pytest / ruff / mypy. SQLite state at `~/agency-state/agency.db`. The seed
runs on the **host** (bash is unsandboxed per ADR-005); it needs **no Docker image rebuild**.
Reference spec: `docs/superpowers/specs/2026-07-17-design-system-retrofit-design.md` (in the
product repo).

---

## File Structure

All code lives in the **agency** repo (`~/agency`), committed to `master`. The plan document
itself lives in the **product** repo (`~/real-estate-campony`, `main`).

- Create: `~/agency/src/agency/sp4_seed.py` — route list + `build_task()` template +
  idempotent `seed()` + `main()` CLI entrypoint. One responsibility: turn routes into
  retrofit task rows.
- Create: `~/agency/scripts/seed_sp4.py` — two-line shim that calls `agency.sp4_seed.main`.
- Create: `~/agency/tests/test_sp4_seed.py` — unit tests for the template, idempotent seeding,
  and the CLI (uses the existing in-memory `conn` fixture from `tests/conftest.py`).

Existing files referenced (not modified): `src/agency/db.py` (`connect`, `init_schema`),
`src/agency/repository.py` (`TaskRepository.create/list_all`), `src/agency/domain.py`
(`TaskStatus`).

---

## Task 1: Route list + `build_task` template

**Files:**
- Create: `~/agency/src/agency/sp4_seed.py`
- Test: `~/agency/tests/test_sp4_seed.py`

- [ ] **Step 1: Write the failing test**

```python
# ~/agency/tests/test_sp4_seed.py
from agency.sp4_seed import RETROFIT_ROUTES, build_task, title_for


def test_routes_are_18_and_heaviest_first():
    assert len(RETROFIT_ROUTES) == 18
    routes = [r for r, _ in RETROFIT_ROUTES]
    assert routes[0] == "/about"
    assert routes.index("/about") < routes.index("/admin")


def test_title_format():
    assert title_for("/about") == "Retrofit /about onto the design system (restyle only)"


def test_build_task_is_restyle_not_rebuild():
    title, desc, acc = build_task("/about", "About Us")
    assert title == title_for("/about")
    assert "RESTYLE, NOT A REBUILD" in desc
    assert "do NOT change" in desc
    assert "About Us" in desc
    assert "gray/slate/zinc/stone-*" in acc
    assert "2 PNGs" in acc


def test_static_page_gets_shared_component_note():
    _, about_desc, _ = build_task("/about", "About Us")
    _, dash_desc, _ = build_task("/dashboard", "User Dashboard")
    assert "shares layout/prose components" in about_desc
    assert "shares layout/prose components" not in dash_desc
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'agency.sp4_seed'`

- [ ] **Step 3: Write minimal implementation**

```python
# ~/agency/src/agency/sp4_seed.py
from __future__ import annotations

# (route, human label). Heaviest-first by raw-color-class count in the page file
# (see docs/superpowers/specs/2026-07-17-design-system-retrofit-design.md).
RETROFIT_ROUTES: list[tuple[str, str]] = [
    ("/about", "About Us"),
    ("/help", "Help Center"),
    ("/cookies", "Cookie Policy"),
    ("/saved-searches", "Saved Searches & Alerts"),
    ("/mortgage/rates", "Mortgage Rates hub"),
    ("/favorites", "Favorites / Saved Listings"),
    ("/mortgage-calculators", "Mortgage Calculators hub"),
    ("/pro", "Pricing / Advertise"),
    ("/dashboard", "User Dashboard"),
    ("/agent/[slug]", "Agent / Agency Profile"),
    ("/home-value", "Home Value Tool"),
    ("/contact", "Contact"),
    ("/home-value/[estimateHash]", "Home Value result"),
    ("/dashboard/listings", "Dashboard: My Listings"),
    ("/admin/moderation", "Admin: Moderation Queue"),
    ("/terms", "Terms of Service"),
    ("/faq", "FAQ"),
    ("/admin", "Admin Panel"),
]

# Static/legal pages built together (task 16) that share layout/prose components.
_SHARED_STATIC = {"/about", "/help", "/cookies", "/contact", "/terms", "/faq"}


def title_for(route: str) -> str:
    return f"Retrofit {route} onto the design system (restyle only)"


def build_task(route: str, label: str) -> tuple[str, str, str]:
    shared = ""
    if route in _SHARED_STATIC:
        shared = (
            " This page shares layout/prose components with the other static pages "
            "(/about, /help, /cookies, /contact, /terms, /faq); if an earlier retrofit already "
            "migrated a shared component, keep those tokens and touch only page-local markup — "
            "do not re-litigate shared components."
        )
    description = (
        f"Restyle the {label} page ({route}) and the components it composes onto the shared "
        "design system. This is a RESTYLE, NOT A REBUILD: do NOT change data-fetching, routing, "
        "auth/session gating, API contracts, or any user-visible behavior.\n\n"
        "- Replace gray/slate/zinc/stone-* utilities with semantic tokens (text-text, text-muted, "
        "bg-surface, bg-bg, border-border, text-success/text-warning/text-danger).\n"
        "- Replace any hard-coded hex (including inside chart libs / inline styles) with "
        "var(--color-*).\n"
        "- Replace ad-hoc bg-white + border card divs with the Card primitive; hand-rolled "
        "buttons/inputs/tabs/badges/dialogs/tooltips with the matching components/ui primitive.\n"
        "- Replace bespoke/inline animation with components/motion primitives (FadeIn, SlideIn, "
        "Stagger, Reveal) so prefers-reduced-motion is honored; delete the bespoke animation code.\n"
        "- Reference DESIGN_SYSTEM.md and the /styleguide route for the correct token/primitive. "
        "Keep trivial hover/tap in Tailwind; only orchestrated/entrance motion uses "
        "components/motion." + shared
    )
    acceptance = (
        f"- No gray/slate/zinc/stone-* classes and no hard-coded hex remain in the {route} page "
        "subtree.\n"
        "- UI is composed from components/ui primitives; no ad-hoc reimplementation of an existing "
        "primitive.\n"
        "- Entrance/scroll animation goes only through components/motion; reduced-motion still "
        "works.\n"
        "- Behavior is unchanged: same routes, queries, auth/tier gating, and API contracts as "
        "before (the diff is styling + tests only).\n"
        "- Existing tests are UPDATED to the new token class names, not deleted; behavior under "
        "test is unchanged.\n"
        "- SP3 visual-QA gate passes: desktop + mobile screenshots render (2 PNGs, not []) and look "
        "consistent with /styleguide.\n"
        "- npm run lint, npm test, and npm run build all pass; the root CLAUDE.md reviewer "
        "checklist is clean."
    )
    return title_for(route), description, acceptance
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/sp4_seed.py tests/test_sp4_seed.py
git commit -m "feat(sp4): retrofit-task template + 18-route list"
```

---

## Task 2: Idempotent `seed()`

**Files:**
- Modify: `~/agency/src/agency/sp4_seed.py`
- Test: `~/agency/tests/test_sp4_seed.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/test_sp4_seed.py
from agency.domain import TaskStatus
from agency.repository import TaskRepository
from agency.sp4_seed import seed


def test_seed_creates_18_new_tasks(conn):
    tasks = TaskRepository(conn)
    created = seed(tasks)
    assert len(created) == 18
    assert all(tasks.get(i).status == TaskStatus.NEW for i in created)


def test_seed_is_idempotent(conn):
    tasks = TaskRepository(conn)
    seed(tasks)
    assert seed(tasks) == []


def test_seed_skips_only_the_existing(conn):
    tasks = TaskRepository(conn)
    title, desc, acc = build_task("/about", "About Us")
    tasks.create(title, desc, acc)  # pre-seed /about
    created = seed(tasks)
    assert len(created) == 17
```

(`build_task` is already imported at the top of the file from Task 1.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: FAIL with `ImportError: cannot import name 'seed'`

- [ ] **Step 3: Write minimal implementation**

```python
# append to ~/agency/src/agency/sp4_seed.py
from agency.repository import TaskRepository


def seed(
    tasks: TaskRepository, routes: list[tuple[str, str]] | None = None
) -> list[int]:
    """Insert retrofit tasks that don't already exist. Idempotent by title. Returns new ids."""
    routes = RETROFIT_ROUTES if routes is None else routes
    existing = {t.title for t in tasks.list_all()}
    created: list[int] = []
    for route, label in routes:
        title, description, acceptance = build_task(route, label)
        if title in existing:
            continue
        created.append(tasks.create(title, description, acceptance))
    return created
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/sp4_seed.py tests/test_sp4_seed.py
git commit -m "feat(sp4): idempotent seed() over the retrofit routes"
```

---

## Task 3: CLI entrypoint (`main`) + shim script

**Files:**
- Modify: `~/agency/src/agency/sp4_seed.py`
- Create: `~/agency/scripts/seed_sp4.py`
- Test: `~/agency/tests/test_sp4_seed.py`

- [ ] **Step 1: Write the failing test**

```python
# append to ~/agency/tests/test_sp4_seed.py
from agency.db import connect
from agency.sp4_seed import main


def test_cli_only_seeds_one(tmp_path):
    db = str(tmp_path / "a.db")
    assert main(["--db", db, "--only", "/about"]) == 0
    # /about now exists, so a full seed adds the remaining 17
    assert len(seed(TaskRepository(connect(db)))) == 17


def test_cli_dry_run_seeds_nothing(tmp_path):
    db = str(tmp_path / "a.db")
    assert main(["--db", db, "--dry-run"]) == 0
    # nothing was written, so a full seed adds all 18
    assert len(seed(TaskRepository(connect(db)))) == 18


def test_cli_rejects_unknown_route(tmp_path):
    import pytest

    db = str(tmp_path / "a.db")
    with pytest.raises(SystemExit):
        main(["--db", db, "--only", "/nope"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: FAIL with `ImportError: cannot import name 'main'`

- [ ] **Step 3: Write minimal implementation**

```python
# append to ~/agency/src/agency/sp4_seed.py
import argparse
import os

from agency.db import connect

DEFAULT_DB = os.path.expanduser("~/agency-state/agency.db")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Seed SP4 design-system retrofit tasks")
    parser.add_argument("--db", default=DEFAULT_DB, help="path to agency.db")
    parser.add_argument("--only", help="seed a single route, e.g. /about")
    parser.add_argument(
        "--dry-run", action="store_true", help="print titles without writing"
    )
    args = parser.parse_args(argv)

    routes = RETROFIT_ROUTES
    if args.only:
        routes = [(r, label) for r, label in RETROFIT_ROUTES if r == args.only]
        if not routes:
            parser.error(f"unknown route {args.only!r}")

    if args.dry_run:
        for route, _ in routes:
            print(f"would seed: {title_for(route)}")
        return 0

    ids = seed(TaskRepository(connect(args.db)), routes)
    print(f"seeded {len(ids)} task(s): {ids}")
    return 0
```

```python
# ~/agency/scripts/seed_sp4.py
from agency.sp4_seed import main

if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/agency && .venv/bin/pytest tests/test_sp4_seed.py -q`
Expected: PASS (10 passed)

- [ ] **Step 5: Commit**

```bash
cd ~/agency && git add src/agency/sp4_seed.py scripts/seed_sp4.py tests/test_sp4_seed.py
git commit -m "feat(sp4): seed_sp4 CLI (--db/--only/--dry-run)"
```

---

## Task 4: Lint, type-check, full test suite green

**Files:** none (verification + commit only)

- [ ] **Step 1: Ruff**

Run: `cd ~/agency && .venv/bin/ruff check src/agency/sp4_seed.py scripts/seed_sp4.py tests/test_sp4_seed.py`
Expected: `All checks passed!` (fix any lint issues, e.g. import ordering, and re-run)

- [ ] **Step 2: Mypy**

Run: `cd ~/agency && .venv/bin/mypy src/agency/sp4_seed.py`
Expected: `Success: no issues found`

- [ ] **Step 3: Full agency test suite (no regressions)**

Run: `cd ~/agency && .venv/bin/pytest -q`
Expected: PASS (all tests, including the 10 new ones)

- [ ] **Step 4: Commit any fixes**

```bash
cd ~/agency && git add -A && git commit -m "chore(sp4): lint/type fixes for seed tooling" || echo "nothing to commit"
```

---

## Task 5: Seed the verification page (`/about`) only

**Files:** none (runs the tool against the real DB). Scheduler must be unloaded (it is, per
handoff) so nothing races the write.

- [ ] **Step 1: Confirm nothing is running**

Run: `launchctl list | grep com.agency.cycle || echo "scheduler not loaded (good)"`
Expected: `scheduler not loaded (good)`

- [ ] **Step 2: Dry-run first**

Run: `cd ~/agency && .venv/bin/python scripts/seed_sp4.py --only /about --dry-run`
Expected: `would seed: Retrofit /about onto the design system (restyle only)`

- [ ] **Step 3: Seed /about for real**

Run: `cd ~/agency && .venv/bin/python scripts/seed_sp4.py --only /about`
Expected: `seeded 1 task(s): [35]` (id may differ)

- [ ] **Step 4: Verify the row**

Run: `sqlite3 -header -column ~/agency-state/agency.db "SELECT id,title,status FROM tasks WHERE title LIKE 'Retrofit %'"`
Expected: one row, status `new`, title `Retrofit /about onto the design system (restyle only)`

---

## Task 6: Verification checkpoint — first retrofit end-to-end (ASYNC GATE)

This is a **go/no-go gate**, not a code step. Because tasks run in `id` order (decision a),
`/about` runs only **after** tasks 32/33/34 finish. Drive cycles either by leaving the scheduler
to run them (10:00 & 23:00) or by running manual sandboxed cycles back-to-back:
`~/agency/docker/run-sandbox.sh cycle` (each cycle advances the lowest-id actionable task(s)
within its token/wall-clock budget). Do **not** proceed to Task 7 until this gate passes.

- [ ] **Step 1: Wait for `/about` to reach `done`**

Run: `sqlite3 ~/agency-state/agency.db "SELECT id,status FROM tasks WHERE title='Retrofit /about onto the design system (restyle only)'"`
Expected (when ready): status `done`. If `failed`, read its events:
`sqlite3 ~/agency-state/agency.db "SELECT agent,action,substr(result,1,200) FROM events WHERE task_id=<id> ORDER BY id"` and fix before continuing.

- [ ] **Step 2: Confirm the SP3 visual gate fired**

Run: `sqlite3 ~/agency-state/agency.db "SELECT agent,action,substr(result,1,160) FROM events WHERE task_id=<id> AND agent='qa' ORDER BY id"`
Expected: QA event referencing 2 screenshots (desktop+mobile), not `[]`.

- [ ] **Step 3: Confirm the PR merged and behavior is unchanged**

Run: `cd ~/real-estate-campony && git fetch origin main -q && git log --oneline origin/main | grep -i "about" | head`
Expected: a merged commit restyling `/about`. Inspect the diff is **styling + tests only**:
`git show <sha> --stat` should touch `app/[locale]/about/**` and its components, not API/route/auth files.

- [ ] **Step 4: Spot-check the rendered page**

In `~/real-estate-campony`, start the dev server (preview tooling), open `/en/about`, and confirm
it looks consistent with `/styleguide`. Then confirm no raw scales remain:
Run: `cd ~/real-estate-campony && grep -rnE "(text|bg|border)-(gray|slate|zinc|stone)-[0-9]" app/[locale]/about $(git grep -l . -- 'components/**' | head -0) ; echo "exit=$?"`
Expected: no matches in the `/about` page file.

- [ ] **GATE:** If behavior changed, the gate didn't fire, or the result looks wrong, STOP.
  Fix the task template in `sp4_seed.py` (and re-seed after correcting), or fix SP2/SP3 on agency
  `master` + rebuild the image, before Task 7. If it looks good, proceed.

---

## Task 7: Bulk-seed the remaining 17 pages

**Files:** none (runs the tool against the real DB, after the Task 6 gate passes).

- [ ] **Step 1: Dry-run the full set (sanity)**

Run: `cd ~/agency && .venv/bin/python scripts/seed_sp4.py --dry-run`
Expected: 18 `would seed:` lines.

- [ ] **Step 2: Seed for real (idempotent — /about is skipped)**

Run: `cd ~/agency && .venv/bin/python scripts/seed_sp4.py`
Expected: `seeded 17 task(s): [...]`

- [ ] **Step 3: Verify 18 retrofit tasks exist**

Run: `sqlite3 ~/agency-state/agency.db "SELECT count(*) FROM tasks WHERE title LIKE 'Retrofit %'"`
Expected: `18`

---

## Task 8: Hand off to the scheduler + update docs

**Files:**
- Modify: `~/real-estate-campony/docs/superpowers/HANDOFF.md`
- Modify: `~/.claude/projects/-Users-valeryordanyan-real-estate-campony/memory/session-handoff-2026-07-15.md`

- [ ] **Step 1: (Optional, user's call) Re-enable the scheduler to drain the queue**

Draining 18 retrofits (after 32/33/34) is many token-costed cycles on the Max plan. If the user
wants it to run unattended:
Run: `launchctl load ~/Library/LaunchAgents/com.agency.cycle.plist`
Otherwise leave it unloaded and run `~/agency/docker/run-sandbox.sh cycle` manually as desired.

- [ ] **Step 2: Record SP4 state in the handoff + memory**

Update `HANDOFF.md` and the session-handoff memory: SP1-4 defined; SP4 tasks seeded (track
`N/18 done` via `sqlite3 ~/agency-state/agency.db "SELECT status,count(*) FROM tasks WHERE title LIKE 'Retrofit %' GROUP BY status"`).

- [ ] **Step 3: Commit doc updates**

```bash
cd ~/real-estate-campony && git add docs/superpowers/HANDOFF.md
git commit -m "docs(sp4): retrofit tasks seeded; scheduler drains the queue"
```

---

## Self-Review

- **Spec coverage:** executor=agency (Tasks 5-8 run through the pipeline, no manual CSS);
  one-task-per-page (18-route list, Task 1); direct DB seed bypassing the planner (Task 2-3, 5,
  7); ordering (a) after 32/33/34 (documented in Architecture + Task 6); retrofit template =
  restyle-not-rebuild with the exact token/primitive/motion rules and acceptance criteria (Task
  1); shared-static-component note (Task 1); verify-one-before-bulk (Tasks 5→6→7); heaviest-first
  ordering (route list). All spec sections map to a task.
- **Placeholders:** none — every code step shows complete code; ops steps give exact commands and
  expected output. `<id>`/`<sha>` in Task 6 are runtime values the operator substitutes, not
  unwritten plan content.
- **Type consistency:** `build_task(route, label) -> (title, description, acceptance)`,
  `seed(tasks, routes=None) -> list[int]`, `title_for(route) -> str`, `main(argv=None) -> int`
  used consistently across tasks and tests; `TaskRepository.create/list_all` and
  `TaskStatus.NEW` match the real `repository.py`/`domain.py` signatures.
