import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "page-responsiveness.spec.ts",
    "application-responsiveness.spec.ts",
  ],
  timeout: 45_000,
  workers: 1,
  outputDir: "/tmp/page-responsiveness/browser-results",
  use: {
    baseURL: process.env.RESPONSIVENESS_BASE_URL ?? "http://localhost:3018",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
});
