import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/reporting/application/ServerReportingService", () => ({
  getWebsiteAnalytics: vi.fn(),
}));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  PermissionDeniedError,
  AuthenticationRequiredError,
} from "@/auth/authorization/policy";
import { getWebsiteAnalytics } from "@/modules/reporting/application/ServerReportingService";
import { GET } from "@/app/api/reporting/website/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);
});
describe("website metrics API", () => {
  it("rejects invalid dates before accessing a source", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/reporting/website?startDate=invalid&endDate=2026-10-06",
      ),
    );
    expect(response.status).toBe(400);
    expect(getWebsiteAnalytics).not.toHaveBeenCalled();
  });

  it("maps server-side access denial and authentication failures", async () => {
    const url =
      "http://localhost/api/reporting/website?startDate=2026-10-01&endDate=2026-10-06";
    vi.mocked(getWebsiteAnalytics).mockRejectedValueOnce(
      new PermissionDeniedError("reporting.website.read.all"),
    );
    expect((await GET(new Request(url))).status).toBe(403);
    vi.mocked(getWebsiteAnalytics).mockRejectedValueOnce(
      new AuthenticationRequiredError(),
    );
    expect((await GET(new Request(url))).status).toBe(401);
  });

  it("returns normalized partial results without shared HTTP caching", async () => {
    vi.mocked(getWebsiteAnalytics).mockResolvedValue({
      contractVersion: "d1-v2",
      traffic: { state: "failure", data: null },
    } as never);
    const response = await GET(
      new Request(
        "http://localhost/api/reporting/website?startDate=2026-10-01&endDate=2026-10-06",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      data: { contractVersion: "d1-v2", traffic: { state: "failure" } },
    });
  });
});
