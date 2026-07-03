# Doc-gap Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `agency doc-gap --count N` — an agent that researches the market + reads our docs and writes N new page files into `docs/en/pages/` for features we are missing (which the planner then turns into build tasks).

**Architecture:** A thin `DocGapper` (mirrors `Planner`) runs one engine call with the `Write` tool + research tools and a dedicated `DOCGAP_SYSTEM` prompt; it reuses `read_page_index` (from #1b) so the agent sees existing pages without reading them all, and returns the count of new page files written. Single-shot (no retry). All in `~/agency`; suite stays offline.

**Tech Stack:** Python 3.12, pytest, ruff, mypy --strict. Tools: `~/agency/.venv/bin/{pytest,ruff,mypy}`. Commit on `master`.

---

## File structure

- Modify: `~/agency/src/agency/runtime/prompts.py` — add `DOCGAP_SYSTEM`.
- Create: `~/agency/src/agency/docgap.py` — `build_docgap_prompt` + `DocGapper`.
- Modify: `~/agency/src/agency/cli.py` — add the `doc-gap` subcommand.
- Create: `~/agency/tests/test_docgap.py`.
- Create: `~/agency/docs/adr/013-doc-gap-agent.md`.

---

## Task 1: `DOCGAP_SYSTEM` + `docgap.py`

**Files:**
- Modify: `src/agency/runtime/prompts.py`
- Create: `src/agency/docgap.py`
- Test: `tests/test_docgap.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_docgap.py`:

```python
def test_docgap_system_prompt():
    from agency.runtime.prompts import DOCGAP_SYSTEM
    assert "researcher" in DOCGAP_SYSTEM.lower()
    assert "Write" in DOCGAP_SYSTEM
    assert "docs/en/pages" in DOCGAP_SYSTEM
    assert "missing" in DOCGAP_SYSTEM.lower()


def test_build_docgap_prompt():
    from agency.docgap import build_docgap_prompt
    p = build_docgap_prompt(2, "- Page 01 — Home")
    assert "2" in p
    assert "do NOT duplicate" in p
    assert "Page 01 — Home" in p
    assert "Write" in p


class _PageWritingEngine:
    """Simulates the agent writing a new page file with the Write tool."""

    def __init__(self, pages_dir):
        self._dir = pages_dir
        self.calls = 0

    def run(self, request):
        from agency.engine.base import AgentReply
        self.calls += 1
        (self._dir / f"99-new-{self.calls}.md").write_text("# Page 99 — New")
        return AgentReply("", None, 1, False)


def test_fill_counts_new_pages(tmp_path):
    from agency.docgap import DocGapper
    from agency.runtime.workspace import Workspace
    pages = tmp_path / "docs" / "en" / "pages"
    pages.mkdir(parents=True)
    engine = _PageWritingEngine(pages)
    wrote = DocGapper(engine=engine, workspace=Workspace(tmp_path)).fill(count=1)
    assert wrote == 1
    assert engine.calls == 1


def test_fill_zero_when_nothing_written(tmp_path):
    from agency.docgap import DocGapper
    from agency.engine.base import AgentReply
    from agency.engine.fake import FakeEngine
    from agency.runtime.workspace import Workspace
    pages = tmp_path / "docs" / "en" / "pages"
    pages.mkdir(parents=True)
    engine = FakeEngine([AgentReply("", None, 1, False)])
    wrote = DocGapper(engine=engine, workspace=Workspace(tmp_path)).fill(count=1)
    assert wrote == 0
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_docgap.py -v`
Expected: FAIL (`DOCGAP_SYSTEM` and `agency.docgap` do not exist).

- [ ] **Step 3: Add `DOCGAP_SYSTEM`**

In `src/agency/runtime/prompts.py`, add this module-level constant after `PLANNER_SYSTEM`:

```python
DOCGAP_SYSTEM = (
    "You are a product researcher for an international real-estate platform. All artifacts you "
    "write are in English. Research the market (competitors Zillow, Redfin, Idealista, and the "
    "Yerevan/Armenia context) and read the product docs under docs/en/, then find pages or "
    "features that are MISSING from our docs and author them. You MUST use the Write tool to "
    "create the new page files under docs/en/pages/ — do not describe them in prose. Follow the "
    "existing page format, do not duplicate existing pages, and cite your sources."
)
```

- [ ] **Step 4: Create `docgap.py`**

Create `src/agency/docgap.py`:

```python
from __future__ import annotations

import glob
import os

from agency.engine.base import AgentRequest, Engine
from agency.planner import read_page_index
from agency.runtime.prompts import DOCGAP_SYSTEM
from agency.runtime.workspace import Workspace

_DOCGAP_TOOLS = ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"]


def build_docgap_prompt(count: int, page_index: str) -> str:
    return (
        f"Add {count} NEW page(s) that are MISSING from our real-estate product docs. Research "
        "the market — competitors (Zillow, Redfin, Idealista) and the Yerevan/Armenia context — "
        "and read our existing docs.\n\n"
        f"Our current pages (do NOT duplicate these):\n{page_index}\n\n"
        f"For each of the {count} gaps, use the Write tool to create a new file "
        "docs/en/pages/NN-<slug>.md (NN = the next number after the existing pages), following "
        "the existing page format (start with '# Page NN — <Title> Phase N', then an overview "
        "and sections). Cite your sources. "
        f"Write exactly {count} new page file(s) with the Write tool, then stop."
    )


class DocGapper:
    """Researches gaps and writes new docs/en/pages/*.md (single-shot, Write-enabled)."""

    def __init__(self, engine: Engine, workspace: Workspace, model: str | None = None) -> None:
        self._engine = engine
        self._cwd = str(workspace.root)
        self._model = model

    def _count_pages(self) -> int:
        return len(glob.glob(os.path.join(self._cwd, "docs", "en", "pages", "*.md")))

    def fill(self, count: int = 2) -> int:
        page_index = read_page_index(self._cwd)
        before = self._count_pages()
        self._engine.run(
            AgentRequest(
                system_prompt=DOCGAP_SYSTEM,
                prompt=build_docgap_prompt(count, page_index),
                cwd=self._cwd,
                allowed_tools=list(_DOCGAP_TOOLS),
                model=self._model,
            )
        )
        return self._count_pages() - before
```

- [ ] **Step 5: Run to verify they pass**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest tests/test_docgap.py -v`
Expected: PASS (all four tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/runtime/prompts.py src/agency/docgap.py tests/test_docgap.py
git commit -m "feat(docgap): DocGapper + DOCGAP_SYSTEM (research + write new pages)"
```

---

## Task 2: `doc-gap` CLI subcommand

**Files:**
- Modify: `src/agency/cli.py`

- [ ] **Step 1: Add the subparser**

In `src/agency/cli.py`, after the `cycle` subparser block (the `cycle_p...` lines), add:

```python
    docgap_p = sub.add_parser("doc-gap", help="Research gaps and write new doc pages")
    docgap_p.add_argument("--count", type=int, default=2, help="number of new pages to write")
```

- [ ] **Step 2: Add the handler + import**

In `src/agency/cli.py`, add this block directly before the `if args.command == "talk":` block:

```python
    if args.command == "doc-gap":
        wrote = DocGapper(engine=engine, workspace=workspace).fill(count=args.count)
        print(f"wrote {wrote} new pages")
        return 0
```

Add the import at the top of `cli.py` (next to `from agency.planner import Planner`):

```python
from agency.docgap import DocGapper
```

- [ ] **Step 3: Verify suite + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/mypy`
Expected: all green. (The handler is thin glue, like `plan`/`cycle`; exercised live.)

- [ ] **Step 4: Commit**

```bash
cd /Users/valeryordanyan/agency
git add src/agency/cli.py
git commit -m "feat(cli): add doc-gap subcommand"
```

---

## Task 3: ADR-013 + full gate

**Files:**
- Create: `docs/adr/013-doc-gap-agent.md`

- [ ] **Step 1: Write the ADR**

Create `~/agency/docs/adr/013-doc-gap-agent.md`:

```markdown
# ADR-013: Doc-gap agent

**Status:** Accepted (2026-07-03)

**Context:** The planner turns existing docs into build tasks, but nothing grows the docs. A PM
gap-analysis found real missing product areas (off-plan listings, price/m2, DOM, AI search).

**Decision:** Add `agency doc-gap --count N` backed by a thin `DocGapper` that runs one engine
call with a dedicated `DOCGAP_SYSTEM` prompt and the Write tool (plus research tools). It reuses
`read_page_index` so the agent sees existing pages without reading all of them, researches the
market, and writes N new `docs/en/pages/NN-<slug>.md` files; `fill` returns the count of new page
files. Single-shot (no retry); English-only; feeds the planner.

**Consequences:** The team can grow its own roadmap from market research, then plan and build it.
Written pages are drafts for review, not auto-merged. If the agent proves flaky at actually
writing (researches without writing), add the bounded retry-if-no-progress pattern (#1). ADR-005
(unsandboxed bash) still applies; run it in the sandbox for unattended use.
```

- [ ] **Step 2: Full suite + lint + types**

Run: `cd /Users/valeryordanyan/agency && .venv/bin/pytest -q && .venv/bin/ruff check . && .venv/bin/mypy`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
cd /Users/valeryordanyan/agency
git add docs/adr/013-doc-gap-agent.md
git commit -m "docs: ADR-013 doc-gap agent"
```

---

## Definition of Done

- `~/agency`: `pytest -q && ruff check . && mypy` all green.
- `agency doc-gap --count N` runs a Write-enabled research agent that writes new pages to
  `docs/en/pages/`; `DocGapper.fill` returns the count of new page files (unit-tested with a
  page-writing stub engine).
- `DOCGAP_SYSTEM`, `build_docgap_prompt`, `DocGapper`, and the `doc-gap` subcommand exist;
  ADR-013 committed. Suite stays offline; live writing exercised by running `agency doc-gap`.
