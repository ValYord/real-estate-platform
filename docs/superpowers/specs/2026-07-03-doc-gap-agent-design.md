# Doc-gap Agent (#2) — Design (2026-07-03)

## Problem

The planner turns *existing* docs into build tasks, but nothing grows the docs themselves. A live
PM gap-analysis earlier found real missing product areas (off-plan "New Developments", price/m²,
DOM, AI search, tour scheduling). This sub-project adds a **doc-gap agent**: it researches the
market + reads our docs, finds pages/features we are missing, and **writes new doc pages** into
`docs/en/pages/`. Those pages then feed the planner → build tasks, closing the loop from
market-research all the way to shipped features.

Sub-project **#2** of the autonomous-team roadmap. Non-goals: translating to `docs/hy`/`docs/ru`,
editing the existing spec/pages, integrating into the daily cycle (a later wiring), and a retry
loop (doc-gap is run occasionally, not on the critical unattended path — single-shot for now).

## Goals

- `agency doc-gap --count N` researches + writes up to N new pages to `docs/en/pages/` that are not
  already covered, following the existing page format.
- Reuses the cheap page index (from #1b) so the agent sees what exists without reading all 26 files.
- Deterministic core (prompt, page-count delta) is unit-tested offline; the actual writing is
  integration (like the planner's create_task).

## Current state (verified)

- The PM agent has read/web tools + `create_task` but **no Write** tool, so it cannot author docs.
- `docs/en/` = `00-PRODUCT-SPEC.md` + `pages/` (26 pages), each starting `# Page NN — Title 🟢 Phase N`.
- `planner.read_page_index(workspace_root)` already returns the cheap page roadmap (reusable).
- The planner is the pattern to mirror: a thin class + a dedicated system prompt + one engine call.

## Design

### Component 1: `DOCGAP_SYSTEM` prompt (`prompts.py`)

A dedicated system prompt (like `PLANNER_SYSTEM`): "You are a product researcher for a real-estate
platform. Research the market (competitors Zillow / Redfin / Idealista, and the Yerevan/Armenia
context) and read our docs, then find pages/features MISSING from our docs and **write new page
files** for them. You MUST use the Write tool to create the files — do not describe them in prose.
Follow the existing page format and cite sources. All artifacts in English."

### Component 2: `docgap.py` (new)

```python
_DOCGAP_TOOLS = ["Read", "Grep", "Glob", "WebSearch", "WebFetch", "Write"]

def build_docgap_prompt(count: int, page_index: str) -> str:
    # instructs: add `count` NEW pages missing from the list below; write each as
    # docs/en/pages/NN-<slug>.md (NN = next number) in the existing format; do NOT duplicate;
    # research competitors + Yerevan market, cite sources; write exactly `count` files, then stop.

class DocGapper:
    def __init__(self, engine, workspace, model=None): ...
        # self._cwd = str(workspace.root)
    def _count_pages(self) -> int:
        return len(glob.glob(os.path.join(self._cwd, "docs", "en", "pages", "*.md")))
    def fill(self, count: int = 2) -> int:
        page_index = read_page_index(self._cwd)   # reuse #1b
        before = self._count_pages()
        self._engine.run(AgentRequest(
            system_prompt=DOCGAP_SYSTEM,
            prompt=build_docgap_prompt(count, page_index),
            cwd=self._cwd, allowed_tools=_DOCGAP_TOOLS, model=self._model))
        return self._count_pages() - before   # new page files written
```

No MCP tool — the agent writes files directly with the `Write` tool. `fill` returns the number of
new page files created (before/after count of `docs/en/pages/*.md`).

### Component 3: `doc-gap` CLI subcommand (`cli.py`)

`agency --workspace <ws> doc-gap [--count N]` (default 2). Builds a `DocGapper` from the shared
`engine`/`workspace`, calls `fill(count)`, prints `wrote N new pages`.

### ADR-013

Records the doc-gap agent decision (research → write new pages; feeds the planner; single-shot,
Write-enabled, English-only).

## Testing (TDD, offline)

- `DOCGAP_SYSTEM`: contains "researcher", "Write", "docs/en/pages", "missing".
- `build_docgap_prompt(2, "- Page 01 — Home")`: contains "2", "do NOT duplicate", the injected
  page index, and "Write".
- `DocGapper.fill` counting: a stub engine that writes a `.md` into the workspace's
  `docs/en/pages/` on `run` → `fill(count=1)` returns 1 and calls the engine once; a `FakeEngine`
  that writes nothing → returns 0. (Mirrors the planner's stub-engine test approach.)
- Full gate on `~/agency`: `pytest -q && ruff check . && mypy` green; suite stays offline (the
  stub writes a local temp file, no network).

## Verification (after implementation)

`agency --workspace ~/real-estate-campony doc-gap --count 1` (or sandboxed) writes one new page to
`docs/en/pages/` — review it, then the planner can turn it into a build task.

## Risks

- Like the planner, the agent might research without writing (single-shot, no retry here). If that
  proves flaky in practice, add the same bounded retry-if-no-progress pattern (#1 reliability) —
  deferred to keep this focused.
- Web research quality varies; the written page is a draft for human/planner review, not
  auto-merged.
