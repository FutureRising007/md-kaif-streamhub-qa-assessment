import { defineConfig, devices } from '@playwright/test';
import { cucumberReporter, defineBddProject } from 'playwright-bdd';
import { env } from './tests/support/env';

const apiPort = new URL(env.API_BASE_URL).port || '3000';

export default defineConfig({
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'reports/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    cucumberReporter('html', { outputFile: 'reports/cucumber/report.html' }),
    cucumberReporter('json', { outputFile: 'reports/cucumber/report.json' }),
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      ...defineBddProject({
        name: 'api',
        features: 'tests/features/api/**/*.feature',
        steps: ['tests/steps/api/**/*.ts', 'tests/fixtures/index.ts'],
      }),
      use: { baseURL: env.API_BASE_URL },
    },
    {
      ...defineBddProject({
        name: 'ui',
        features: 'tests/features/ui/**/*.feature',
        steps: ['tests/steps/ui/**/*.ts', 'tests/fixtures/index.ts'],
      }),
      use: { ...devices['Desktop Chrome'], baseURL: env.UI_BASE_URL, screenshot: 'on' },
    },
    {
      // locators broken on purpose for the AI self-healing exercise - these fail by design,
      // so they're not part of `npm test`. See docs/ai-self-healing.md
      ...defineBddProject({
        name: 'self-healing',
        features: 'tests/features/self-healing/**/*.feature',
        steps: ['tests/steps/self-healing/**/*.ts', 'tests/fixtures/index.ts'],
      }),
      use: { ...devices['Desktop Chrome'], baseURL: env.UI_BASE_URL, actionTimeout: 5000 },
      timeout: 20_000,
      retries: 0,
    },
  ],
  // starts our API before the tests (reuses it if already running locally)
  webServer: {
    command: 'npm run api:start',
    url: `${env.API_BASE_URL}/health`,
    env: { API_PORT: apiPort },
    reuseExistingServer: !process.env.CI,
  },
});
