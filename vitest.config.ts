import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
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
