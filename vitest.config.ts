import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  // tsconfig.json sets `"jsx": "preserve"` (Next.js transforms JSX itself via
  // SWC) — Vite/Vitest (rolldown-vite, oxc-based) inherits that by default
  // and leaves raw JSX in the transformed output, which then fails to parse
  // as plain JS. Overriding to `automatic` here (test-only, doesn't affect
  // the Next.js build) lets `.test.tsx` component-rendering tests use JSX
  // directly.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'node',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/**/*.test.ts', '__tests__/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      // Mirror the @/* path alias from tsconfig.json
      '@': resolve(__dirname, '.'),
    },
  },
})
