import { loadEnvFile } from "node:process";

import { defineConfig, devices } from "@playwright/test";

loadEnvFile(".env.test");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "Playwright requires TEST_DATABASE_URL. Fix: define it in .env.test and rerun the E2E command.",
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3100",
    env: {
      DATABASE_URL: testDatabaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      TEST_DATABASE_URL: testDatabaseUrl,
    },
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
});
