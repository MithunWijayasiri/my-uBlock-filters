import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 15000,
  },
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    storageState: {
      cookies: [
        {
          name: 'SOCS',
          value: 'CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
          domain: '.youtube.com',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: true,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
