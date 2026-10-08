import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reporting/infrastructure/ReportDatasetRepository", () => ({
  findReportDataset: vi.fn(),
  listReportDatasets: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/ReportQueryRepository", () => ({
  executeReportQuery: vi.fn(),
  validateReportOutputContract: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/GoogleAnalyticsConfiguration", () => ({
  googleAnalyticsConfiguration: () => null,
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import {
  validateReportQuery,
  streamReportQuery,
} from "@/modules/reporting/ServerReportQueryService";
import { getReportDatasets } from "@/modules/reporting/ServerReportDefinitionService";
import {
  findReportDataset,
  listReportDatasets,
} from "@/modules/reporting/infrastructure/ReportDatasetRepository";
import { executeReportQuery } from "@/modules/reporting/infrastructure/ReportQueryRepository";
import { applicationReportDataset as dataset } from "../../support/ReportDatasetFixture";
import type { ReportQueryInput } from "@/modules/reporting/api/ReportQuerySchemas";

const query: ReportQueryInput = {
  datasetKey: "application-data",
  datasetVersion: 1,
  sql: "SELECT reference FROM app_reporting_dataset_applications_v1",
  parameters: [],
  values: {},
  columns: [{ name: "reference", type: "text" }],
};
const actor: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "reporter@example.test",
  displayName: "Reporter",
  status: "active",
  userType: "staff",
  identitySubject: "reporter",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roleCodes: new Set(),
  capabilities: new Set([
    p.reportingDatasetReadAll,
    p.reportingQueryExecuteAll,
    p.fundingApplicationAllRead,
  ]),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findReportDataset).mockResolvedValue(dataset);
});

describe("dataset and source authorization", () => {
  it("requires authentication and operation grants before repository reads", async () => {
    await expect(validateReportQuery(null, query)).rejects.toThrow("Authentication");
    await expect(validateReportQuery({ ...actor, capabilities: new Set() }, query)).rejects.toThrow(
      "Missing",
    );
    await expect(getReportDatasets(null)).rejects.toThrow("Authentication");
    expect(findReportDataset).not.toHaveBeenCalled();
    expect(listReportDatasets).not.toHaveBeenCalled();
  });
  it("does not treat dataset or report execution grants as applicant access", async () => {
    const user = {
      ...actor,
      capabilities: new Set([p.reportingDatasetReadAll, p.reportingQueryExecuteAll]),
    };
    await expect(streamReportQuery(user, query, vi.fn())).rejects.toThrow(
      p.fundingApplicationAllRead,
    );
    expect(executeReportQuery).not.toHaveBeenCalled();
  });
  it("rejects suspended principals, wrong dataset relations and mismatched source context", async () => {
    await expect(validateReportQuery({ ...actor, status: "suspended" }, query)).rejects.toThrow(
      "Missing",
    );
    await expect(
      validateReportQuery(actor, {
        ...query,
        sql: "SELECT numeric_value FROM app_reporting_dataset_website_metrics_v1",
      }),
    ).rejects.toThrow("selected dataset");
    await expect(
      validateReportQuery(actor, {
        ...query,
        websitePeriod: { startDate: "2026-10-01", endDate: "2026-10-08" },
      }),
    ).rejects.toThrow("another dataset");
  });
  it("validates publication and supplies only the authenticated actor as execution owner", async () => {
    await expect(validateReportQuery(actor, query)).resolves.toMatchObject({
      datasetKey: "application-data",
      datasetVersion: 1,
    });
    await streamReportQuery(actor, query, vi.fn());
    expect(executeReportQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: expect.objectContaining({ actorId: actor.id, datasetKey: "application-data" }),
        values: [],
      }),
    );
  });
  it("rejects extra scope fields and result-contract mismatch", async () => {
    await expect(
      validateReportQuery(actor, { ...query, values: { actorId: "other" } }),
    ).rejects.toThrow();
    await expect(
      validateReportQuery(actor, { ...query, columns: [{ name: "email", type: "text" }] }),
    ).rejects.toThrow("projection");
  });
});
