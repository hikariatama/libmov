import { defineConfig } from '@playwright/test'

export default defineConfig({
  outputDir: 'test-results/artifacts',
  reporter: 'line',
  testDir: 'e2e',
  timeout: 45000,
  use: {
    trace: 'retain-on-failure',
  },
  workers: 1,
})
