import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/applications/ServerAdminApplicationExportService", () => ({
  exportAdminApplications: vi.fn(),
}));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({
  getAdminApplicationFilterOptions: vi.fn(),
}));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { exportAdminApplications } from "@/modules/applications/ServerAdminApplicationExportService";
import { getAdminApplicationFilterOptions } from "@/modules/applications/ServerAdminApplicationService";
import { GET as exportRoute } from "@/app/api/admin/applications/export/route";
import { GET as optionsRoute } from "@/app/api/admin/applications/filter-options/route";
import { PermissionDeniedError } from "@/auth/authorization/policy";
const user = { id: "staff" } as never;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
});
it("validates export transport and returns a private attachment", async () => {
  vi.mocked(exportAdminApplications).mockResolvedValue({
    body: Buffer.from("csv"),
    fileName: "applications.csv",
    contentType: "text/csv; charset=utf-8",
  });
  const request = new Request(
    "http://localhost/api/admin/applications/export?format=CSV&stage=Screening",
  );
  const response = await exportRoute(request);
  expect(exportAdminApplications).toHaveBeenCalledWith(
    user,
    { status: "all", stage: "Screening", format: "CSV" },
    request.signal,
  );
  expect(response.headers.get("Content-Disposition")).toContain(
    'filename="applications.csv"',
  );
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.text()).toBe("csv");
});
it.each([
  "format=PDF",
  "format=CSV&fundingCallId=invalid",
  "format=XLSX&submittedFrom=2026-10-13&submittedTo=2026-10-01",
])("rejects invalid export filters %s", async (query) => {
  const response = await exportRoute(
    new Request(`http://localhost/api/admin/applications/export?${query}`),
  );
  expect(response.status).toBe(400);
  expect(exportAdminApplications).not.toHaveBeenCalled();
});
it("translates export permission denial", async () => {
  vi.mocked(exportAdminApplications).mockRejectedValue(
    new PermissionDeniedError("funding.application.export"),
  );
  const response = await exportRoute(
    new Request("http://localhost/api/admin/applications/export?format=CSV"),
  );
  expect(response.status).toBe(403);
});
it("returns scoped dropdown options through the protected service", async () => {
  const options = {
    fundingCalls: [{ id: "call", label: "Growth call" }],
    stages: [{ id: "Screening", label: "Screening" }],
  };
  vi.mocked(getAdminApplicationFilterOptions).mockResolvedValue(options);
  const response = await optionsRoute(
    new Request("http://localhost/api/admin/applications/filter-options"),
  );
  expect(getAdminApplicationFilterOptions).toHaveBeenCalledWith(user);
  expect(await response.json()).toMatchObject({ data: options });
});
