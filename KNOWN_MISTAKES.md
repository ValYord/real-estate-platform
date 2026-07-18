# Known Mistakes — Do Not Repeat

# Known Mistakes (agency self-learning)

One-line lessons from failed/looped tasks. Read before scaffolding or editing build config.

- Generate `package-lock.json` so CI (Linux) accepts it: a macOS-generated lockfile can fail `npm ci` on Linux due to native-dep hoisting (picomatch/tinyglobby). Prefer `npm install` in CI, or generate the lockfile on Linux.
- Do not commit build artifacts: add `*.tsbuildinfo` and `next-env.d.ts` to `.gitignore` (Next.js regenerates them).
- Honor task scope: when a task says "minimal / no i18n / no shadcn", do not add those dependencies or files.
- Every scaffold PR must include a working CI workflow (`.github/workflows/ci.yml`) so the delivery gate has a check to wait on.
- In a multi-agent pipeline, design retry/error-handling for each stage explicitly (e.g., cap and log developer/qa error retries) rather than assuming agents always return success or a clean bug report, since transient tool/agent errors can recur and stall the loop.
