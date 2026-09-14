import { defineConfig, devices } from "playwright/test";

const port = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3008);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL, trace: "retain-on-failure" },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    url: `${baseURL}/api/auth/session`,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: /responsive/, use: { ...devices["Pixel 5"] } },
    {
      name: "tablet",
      testMatch: /responsive/,
      use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
    },
  ],
});
