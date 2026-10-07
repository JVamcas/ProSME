import { afterAll, beforeAll, describe, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import {
  createReportingDatabaseFixture,
  reportingDatabaseEnabled,
} from "../../support/WebsiteAnalyticsDatabaseFixture";
import { verifyWebsiteHeatmapSql } from "../../support/WebsiteHeatmapSqlAssertions";

const fixture = createReportingDatabaseFixture();
beforeAll(() => fixture.prepare());
afterAll(() => fixture.finish());
(reportingDatabaseEnabled ? describe : describe.skip)(
  "platform heatmap SQL",
  () => {
    it("deduplicates retries, preserves maximum depth and scopes bounded projections by layout, call and local date", async () => {
      await fixture.reset();
      await verifyWebsiteHeatmapSql();
    });
  },
);
