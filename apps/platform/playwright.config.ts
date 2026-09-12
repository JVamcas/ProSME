import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3008", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3008",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3008",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: /responsive/, use: { ...devices["Pixel 5"] } },
    { name: "tablet", testMatch: /responsive/, use: { ...devices["iPad (gen 7)"], browserName: "chromium" } },
  ],
});
