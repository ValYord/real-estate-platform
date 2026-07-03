# Planner Page-Index Injection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the planner from burning its turns reading 26 doc files — inject the page roadmap (each page's heading) into the prompt so it calls `create_task` for the next undone pages immediately.

**Architecture:** Add `read_page_index(workspace_root)` that cheaply extracts each `docs/en/pages/*.md` heading; give `build_planner_prompt` a `page_index` parameter and a "do NOT read them all" instruction; `Planner.plan` computes the index once and passes it in. All in `~/agency`; suite stays offline.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on `master`.

---

## File structure

- Modify: `~/agency/src/agency/planner.py` — add `read_page_index`; add `page_index` to `build_planner_prompt`; wire it in `Planner.plan`.
- Modify: `~/agency/tests/test_planner.py` — `read_page_index` tests; update the two prompt tests for the new signature.
- Modify: `~/agency/docs/adr/009-autonomous-planner.md` — one-line note.

---

## Task 1: `read_page_index`

**Files:**
- Modify: `src/agency/planner.py`
- Test: `tests/test_planner.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_planner.py`:

```python
def test_read_page_index(tmp_path):
    from agency.planner import read_page_index
    pages = tmp_path / "docs" / "en" / "pages"
    pages.mkdir(parents=True)
    (pages / "01-a.md").write_text("# Page 01 — A\n\nbody")
    (pages / "02-b.md").write_text("no heading here\n")
    idx = read_page_index(str(tmp_path))
    assert "Page 01 — A" in idx
    assert "02-b.md" in idx  # filename fallback when a page has no heading
    assert idx.index("Page 01") < idx.index("02-b.md")  # sorted by filename


def test_read_page_index_missing_dir(tmp_path):
    from agency.planner import read_page_index
    assert read_page_index(str(tmp_path)) == "(no pages found)"
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py::test_read_page_index tests/test_planner.py::test_read_page_index_missing_dir -v`
Expected: FAIL (`read_page_index` does not exist).

- [ ] **Step 3: Implement**

In `src/agency/planner.py`, add `import glob` and `import os` at the top (after `from __future__ import annotations`):

```python
from __future__ import annotations

import glob
import os
```

Add this function above `build_planner_prompt`:

```python
def read_page_index(workspace_root: str) -> str:
    """A cheap roadmap: the first heading of each docs/en/pages/*.md (filename as fallback)."""
    pages = sorted(glob.glob(os.path.join(workspace_root, "docs", "en", "pages", "*.md")))
    lines = []
    for path in pages:
        heading = os.path.basename(path)
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("# "):
                    heading = line[2:].strip()
                    break
        lines.append(f"- {heading}")
    return "\n".join(lines) or "(no pages found)"
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py::test_read_page_index tests/test_planner.py::test_read_page_index_missing_dir -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/planner.py tests/test_planner.py
git commit -m "feat(planner): read_page_index — cheap docs roadmap"
```

---

## Task 2: Inject `page_index` into the prompt and wire `Planner.plan`

**Files:**
- Modify: `src/agency/planner.py`
- Test: `tests/test_planner.py`

- [ ] **Step 1: Update the prompt tests for the new signature**

In `tests/test_planner.py`, replace `test_build_planner_prompt_content` and
`test_build_planner_prompt_retry_adds_nudge` with:

```python
def test_build_planner_prompt_content():
    from agency.planner import build_planner_prompt
    p = build_planner_prompt(2, ["Home page"], "- Page 01 — Home\n- Page 06 — Dashboard")
    assert "exactly 2 times" in p
    assert "Home page" in p
    assert "Page 06 — Dashboard" in p  # the injected roadmap
    assert "do NOT read them all" in p
    assert "small" in p.lower()
    assert "CI" in p


def test_build_planner_prompt_retry_adds_nudge():
    from agency.planner import build_planner_prompt
    assert "previous attempt created" not in build_planner_prompt(2, [], "idx")
    assert "previous attempt created" in build_planner_prompt(2, [], "idx", is_retry=True)
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py::test_build_planner_prompt_content -v`
Expected: FAIL (`build_planner_prompt` takes no `page_index` argument yet).

- [ ] **Step 3: Add `page_index` to `build_planner_prompt`**

In `src/agency/planner.py`, replace the whole `build_planner_prompt` function with:

```python
def build_planner_prompt(
    gap: int, existing_titles: list[str], page_index: str, is_retry: bool = False
) -> str:
    existing = "\n".join(f"- {t}" for t in existing_titles) or "(none)"
    # On a retry the previous attempt produced no tasks; differentiate the prompt so the retry
    # is more than a byte-identical re-send (which would only help via sampling variance).
    nudge = (
        "\n\nYour previous attempt created NO tasks. You MUST call the create_task tool now — "
        "do not reply without calling it."
        if is_retry
        else ""
    )
    return (
        "Plan the next work for this product.\n\n"
        f"The product's pages (roadmap):\n{page_index}\n\n"
        f"Call the create_task tool exactly {gap} times (one call per task), for the next "
        "undone pages/features in priority order (most foundational first). You MAY open one "
        "specific page under docs/en/pages/ for detail, but do NOT read them all — call "
        "create_task. Each task must be small and independently buildable, keep CI (lint, test, "
        "build) green, honor its own scope (do not fold in extra pages or features), and follow "
        "the CLAUDE.md reviewer checklist.\n\n"
        f"Already done (do NOT duplicate these):\n{existing}\n\n"
        f"Call create_task {gap} times now, then stop.{nudge}"
    )
```

- [ ] **Step 4: Wire `Planner.plan`**

In `src/agency/planner.py`, in `Planner.plan`, add the page-index computation and pass it to
`build_planner_prompt`. Replace the body from `before = ...` through the loop's `engine.run(...)`
call so it reads:

```python
        before = len(self._tasks.list_all())
        page_index = read_page_index(self._cwd)
        dry = 0
        for _ in range(_MAX_PLAN_ATTEMPTS):
            gap = min(target - len(self._tasks.list_actionable()), _MAX_PLAN)
            if gap <= 0:
                break
            all_tasks = self._tasks.list_all()
            count_before = len(all_tasks)
            existing = [t.title for t in all_tasks]
            self._engine.run(
                AgentRequest(
                    system_prompt=PLANNER_SYSTEM,
                    prompt=build_planner_prompt(gap, existing, page_index, is_retry=dry > 0),
                    cwd=self._cwd,
                    allowed_tools=[*PM_READ_TOOLS, self._create_task_tool],
                    mcp_servers={"pm": self._server},
                    model=self._model,
                )
            )
```

(Leave the `if len(self._tasks.list_all()) == count_before: ...` dry-tracking tail and the final
`return` unchanged.)

- [ ] **Step 5: Run all planner tests**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_planner.py -v`
Expected: PASS — the updated prompt tests, `read_page_index` tests, and the unchanged retry tests
(`Planner.plan` computes the index from the page-less `tmp_path` → `"(no pages found)"`, the stub
engine still creates tasks).

- [ ] **Step 6: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/planner.py tests/test_planner.py
git commit -m "feat(planner): inject page roadmap; stop forcing a full docs read"
```

---

## Task 3: ADR note + full gate

**Files:**
- Modify: `docs/adr/009-autonomous-planner.md`

- [ ] **Step 1: Add the note**

In `~/agency/docs/adr/009-autonomous-planner.md`, append to the **Consequences** paragraph:

```markdown

**Turn-burn fix (2026-07-03):** the planner was told to read docs/en/ (26 pages) and burned its
turns reading instead of creating tasks. It now injects a cheap page index (each page's heading)
into the prompt and is told not to read them all, so it calls create_task immediately.
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/009-autonomous-planner.md
git commit -m "docs: ADR-009 note on planner page-index fix"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `read_page_index` returns the docs roadmap (heading per page, filename fallback, graceful when
  absent); `build_planner_prompt` injects it and says "do NOT read them all"; `Planner.plan` passes
  the index.
- ADR-009 notes the fix. Suite stays offline.
- (Verification, separate) rebuild `agency-sandbox` and run `run-sandbox.sh plan --target 3` — it
  should now create tasks.
