import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/ReportTemplateRepository", () => ({
  listReportTemplates: vi.fn(),
  findReportTemplate: vi.fn(),
  saveReportTemplate: vi.fn(),
  findPublishedReportTemplate: vi.fn(),
  publishReportTemplate: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/ReportRepository", () => ({
  listConfiguredReports: vi.fn(),
  findConfiguredReport: vi.fn(),
  saveConfiguredReport: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/ReportRunRepository", () => ({
  enqueueReportRun: vi.fn(),
  listReportRuns: vi.fn(),
  findReportRunDetail: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  listReportTemplates,
  findReportTemplate,
  saveReportTemplate,
} from "@/modules/reporting/infrastructure/ReportTemplateRepository";
import {
  listConfiguredReports,
  saveConfiguredReport,
} from "@/modules/reporting/infrastructure/ReportRepository";
import {
  GET as templatesGET,
  POST as templatePOST,
} from "@/app/api/reporting/templates/route";
import { POST as publishPOST } from "@/app/api/reporting/templates/[templateId]/publish/route";
import {
  GET as reportsGET,
  POST as reportsPOST,
} from "@/app/api/reporting/reports/route";
import { POST as runsPOST } from "@/app/api/reporting/reports/[reportId]/runs/route";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";

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
  roleCodes: new Set(),
  identitySubject: "reporter",
};
const context = {
  params: Promise.resolve({ templateId: crypto.randomUUID() }),
};
const request = (path: string, body?: unknown) =>
  new Request(`http://localhost/api/reporting/${path}`, {
    method: body ? "POST" : "GET",
    ...(body
      ? {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      : {}),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
});
describe("protected report management transport", () => {
  it("rejects missing or blank descriptions before template or report writes", async () => {
    const template = { ...applicationExportTemplate, description: undefined };
    const report = {
      key: "report",
      name: "Application report",
      templateId: crypto.randomUUID(),
      templateVersion: 1,
      defaults: { period: "explicit", values: {} },
      format: "CSV",
    };
    for (const description of [undefined, " \n\t "]) {
      expect(
        (await templatePOST(request("templates", { ...template, description })))
          .status,
      ).toBe(400);
      expect(
        (await reportsPOST(request("reports", { ...report, description })))
          .status,
      ).toBe(400);
    }
    expect(saveReportTemplate).not.toHaveBeenCalled();
    expect(saveConfiguredReport).not.toHaveBeenCalled();
  });
  it("maps anonymous and missing granular operation permissions before any data read/write", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    expect((await templatesGET(request("templates"))).status).toBe(401);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({
      ...actor,
      capabilities: new Set(),
    });
    expect((await reportsGET(request("reports"))).status).toBe(403);
    expect(
      (await templatePOST(request("templates", applicationExportTemplate)))
        .status,
    ).toBe(403);
    expect((await reportsPOST(request("reports", {}))).status).toBe(403);
    expect(
      (
        await runsPOST(request("reports/runs", {}), {
          params: Promise.resolve({ reportId: crypto.randomUUID() }),
        })
      ).status,
    ).toBe(403);
    expect(listReportTemplates).not.toHaveBeenCalled();
    expect(listConfiguredReports).not.toHaveBeenCalled();
  });
  it("validates bounded pagination and returns no-store catalogue responses", async () => {
    expect((await templatesGET(request("templates?pageSize=51"))).status).toBe(
      400,
    );
    vi.mocked(listReportTemplates).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });
    const response = await templatesGET(request("templates"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).data.items).toEqual([]);
  });
  it("returns a validation error for malformed JSON", async () => {
    const response = await reportsPOST(
      new Request("http://localhost/api/reporting/reports", {
        method: "POST",
        body: "{",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toContain("valid JSON");
    expect(listConfiguredReports).not.toHaveBeenCalled();
  });
  it("reports optimistic publication conflicts and malformed parameters through canonical API errors", async () => {
    vi.mocked(findReportTemplate).mockResolvedValue({
      ...applicationExportTemplate,
      id: crypto.randomUUID(),
      rowVersion: 2,
      publishedVersion: null,
    });
    const conflict = await publishPOST(
      request("templates/publish", { rowVersion: 1, values: {} }),
      context,
    );
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe("CONFLICT");
    expect(
      (
        await publishPOST(
          request("templates/publish", {
            rowVersion: 2,
            values: {},
            actorId: actor.id,
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (await reportsPOST(request("reports", { templateVersion: -1 }))).status,
    ).toBe(400);
  });
});
