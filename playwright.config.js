const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/helpers/global-setup.js',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/reports/html' }]],
  workers: 1,
  outputDir: 'e2e/reports/artifacts',
  use: {
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      grep: /@smoke/,
    },
    {
      name: 'critical',
      grep: /@critical/,
    },
  ],
});
