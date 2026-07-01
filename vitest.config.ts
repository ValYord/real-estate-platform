import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // Mirror the @/* path alias from tsconfig.json
      '@': resolve(__dirname, '.'),
    },
  },
})
