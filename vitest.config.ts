import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: ['boats-code_old_dontuse/**', 'node_modules/**', 'e2e/**'],
  },
})
