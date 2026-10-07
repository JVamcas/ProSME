import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reporting/ServerWebsiteAnalyticsSyncService", () => ({
  processWebsiteAnalyticsSynchronization: vi.fn(),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn() },
}));
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { processWebsiteAnalyticsSynchronization } from "@/modules/reporting/ServerWebsiteAnalyticsSyncService";
import { POST } from "@/app/api/internal/reporting/process/route";

beforeEach(() => vi.clearAllMocks());
describe("analytics processor route", () => {
  it("maps service authentication denial to 401", async () => {
    vi.mocked(processWebsiteAnalyticsSynchronization).mockRejectedValue(
      new AuthenticationRequiredError(),
    );
    expect(
      (
        await POST(
          new Request("http://localhost/api/internal/reporting/process", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("returns no-store processor counts and forwards only authorization", async () => {
    const data = { claimed: 1, processed: 1, failed: 0, skipped: 0 };
    vi.mocked(processWebsiteAnalyticsSynchronization).mockResolvedValue(data);
    const response = await POST(
      new Request("http://localhost/api/internal/reporting/process", {
        method: "POST",
        headers: { authorization: "Bearer supplied" },
      }),
    );
    expect(await response.json()).toEqual({ data });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(processWebsiteAnalyticsSynchronization).toHaveBeenCalledWith(
      "Bearer supplied",
    );
  });
  it("does not expose internal or provider error details", async () => {
    vi.mocked(processWebsiteAnalyticsSynchronization).mockRejectedValue(
      new Error("sensitive provider error"),
    );
    const response = await POST(
      new Request("http://localhost/api/internal/reporting/process", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("sensitive");
  });
});
