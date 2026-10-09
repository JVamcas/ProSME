import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reporting/infrastructure/ReportRepository", () => ({
  findConfiguredReport: vi.fn(),
  listConfiguredReports: vi.fn(),
  saveConfiguredReport: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/ReportTemplateRepository", () => ({
  findPublishedReportTemplate: vi.fn(),
}));
vi.mock("@/modules/reporting/application/ReportAccess", () => ({
  requireReportSourceAccess: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import { ResourceConflictError } from "@/lib/resource-errors";
import { putReport } from "@/modules/reporting/ServerReportService";
import {
  findConfiguredReport,
  saveConfiguredReport,
} from "@/modules/reporting/infrastructure/ReportRepository";
import { findPublishedReportTemplate } from "@/modules/reporting/infrastructure/ReportTemplateRepository";
import { requireReportSourceAccess } from "@/modules/reporting/application/ReportAccess";
import { applicationPipelineTemplate } from "@/modules/reporting/application/bootstrap/ApplicationPipelineTemplate";

const actor: AuthenticatedUser = {
  id: crypto.randomUUID(),
  status: "active",
  capabilities: new Set(Object.values(p)),
  email: "reporter@example.test",
  displayName: "Reporter",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  identitySubject: "reporter",
  roleCodes: new Set(),
};
const reportId = crypto.randomUUID();
const input = {
  key: "pipeline",
  name: "Pipeline",
  description: "Active applications by stage.",
  templateId: crypto.randomUUID(),
  defaults: { period: "explicit" as const, values: {} },
  format: "XLSX" as const,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findPublishedReportTemplate).mockResolvedValue({
    templateId: input.templateId,
    version: 3,
    definition: applicationPipelineTemplate.definition,
  });
  vi.mocked(findConfiguredReport).mockResolvedValue({
    ...input,
    id: reportId,
    ownerId: actor.id,
    rowVersion: 8,
    reportVersion: 2,
    templateVersion: 1,
    templateName: "Pipeline",
    datasetName: "Workflow Operations",
    definition: applicationPipelineTemplate.definition,
  });
  vi.mocked(saveConfiguredReport).mockResolvedValue({
    id: reportId,
    reportVersion: 1,
  });
});

describe("automatic configured report template selection", () => {
  it("resolves the current published version when creating a report", async () => {
    await putReport(actor, input);
    expect(findPublishedReportTemplate).toHaveBeenCalledWith(
      input.templateId,
      undefined,
    );
    expect(saveConfiguredReport).toHaveBeenCalledWith(
      actor.id,
      { ...input, templateVersion: 3 },
      undefined,
    );
  });

  it("keeps the saved template version when editing an existing report", async () => {
    vi.mocked(findPublishedReportTemplate).mockResolvedValue({
      templateId: input.templateId,
      version: 1,
      definition: applicationPipelineTemplate.definition,
    });
    await putReport(
      actor,
      { ...input, name: "Renamed", rowVersion: 8 },
      reportId,
    );
    expect(findPublishedReportTemplate).toHaveBeenCalledWith(
      input.templateId,
      1,
    );
    expect(saveConfiguredReport).toHaveBeenCalledWith(
      actor.id,
      expect.objectContaining({ templateVersion: 1, rowVersion: 8 }),
      reportId,
    );
  });

  it("chooses the published version when selecting another template", async () => {
    const templateId = crypto.randomUUID();
    await putReport(actor, { ...input, templateId, rowVersion: 8 }, reportId);
    expect(findPublishedReportTemplate).toHaveBeenCalledWith(
      templateId,
      undefined,
    );
  });

  it("rejects a caller-supplied template or report version before any data access", async () => {
    for (const extra of [{ templateVersion: 99 }, { reportVersion: 99 }]) {
      await expect(putReport(actor, { ...input, ...extra })).rejects.toThrow();
    }
    expect(findConfiguredReport).not.toHaveBeenCalled();
    expect(findPublishedReportTemplate).not.toHaveBeenCalled();
    expect(saveConfiguredReport).not.toHaveBeenCalled();
  });

  it.each([null, { ...actor, capabilities: new Set<string>() }])(
    "requires authenticated operation and template grants before reading data",
    async (user) => {
      await expect(putReport(user, input)).rejects.toThrow();
      expect(findPublishedReportTemplate).not.toHaveBeenCalled();
      expect(saveConfiguredReport).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing report, missing concurrency token and unpublished template", async () => {
    await expect(putReport(actor, input, reportId)).rejects.toThrow("version");
    vi.mocked(findConfiguredReport).mockResolvedValue(null);
    await expect(
      putReport(actor, { ...input, rowVersion: 8 }, reportId),
    ).rejects.toThrow("report");
    vi.mocked(findPublishedReportTemplate).mockResolvedValue(null);
    await expect(putReport(actor, input)).rejects.toThrow("published");
    expect(saveConfiguredReport).not.toHaveBeenCalled();
  });

  it("checks source access before writes and propagates optimistic conflicts", async () => {
    vi.mocked(requireReportSourceAccess).mockRejectedValueOnce(
      new Error("Missing source grant"),
    );
    await expect(putReport(actor, input)).rejects.toThrow("source grant");
    expect(saveConfiguredReport).not.toHaveBeenCalled();
    vi.mocked(saveConfiguredReport).mockRejectedValueOnce(
      new ResourceConflictError("Report changed"),
    );
    await expect(
      putReport(actor, { ...input, rowVersion: 8 }, reportId),
    ).rejects.toThrow("changed");
  });
});
