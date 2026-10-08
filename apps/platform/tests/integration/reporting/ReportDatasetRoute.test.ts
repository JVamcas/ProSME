import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/reporting/ServerReportDefinitionService", () => ({
  getReportDatasets: vi.fn(),
}));
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getReportDatasets } from "@/modules/reporting/ServerReportDefinitionService";
import { GET } from "@/app/api/reporting/datasets/route";

beforeEach(() => vi.clearAllMocks());
describe("protected read-only dataset catalogue transport", () => {
  it("forwards the resolved actor and returns a no-store projection", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
    vi.mocked(getReportDatasets).mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/reporting/datasets"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getReportDatasets).toHaveBeenCalledWith(null);
    expect(await response.json()).toMatchObject({ data: [] });
  });
  it("maps permission denial without disclosing the dataset catalogue", async () => {
    vi.mocked(getReportDatasets).mockRejectedValue(
      new PermissionDeniedError("reporting.dataset.read.all"),
    );
    expect((await GET(new Request("http://localhost/api/reporting/datasets"))).status).toBe(403);
  });
});
