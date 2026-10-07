import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/client-http", () => ({
  requestData: vi.fn(),
  requestJson: vi.fn(),
  patchData: vi.fn(),
  deleteData: vi.fn(),
}));
vi.mock("@/modules/reporting/ClientWebsiteAnalyticsService", () => ({
  clientWebsiteAnalyticsService: { track: vi.fn() },
}));
import { requestData } from "@/lib/client-http";
import { clientWebsiteAnalyticsService } from "@/modules/reporting/ClientWebsiteAnalyticsService";
import { clientApplicationService } from "@/modules/applications/ClientApplicationService";

beforeEach(() => vi.clearAllMocks());
const call = "00000000-0000-4000-8000-000000000042";
describe("confirmed application metrics", () => {
  it("tracks only the successful server-confirmed application start", async () => {
    vi.mocked(requestData).mockRejectedValueOnce(new Error("denied"));
    const input = { businessId: "business", fundingCallIdOrSlug: call };
    await expect(
      clientApplicationService.createApplication(input),
    ).rejects.toThrow("denied");
    expect(clientWebsiteAnalyticsService.track).not.toHaveBeenCalled();
    vi.mocked(requestData).mockResolvedValue({
      id: "application",
      fundingOpportunityId: call,
    });
    await clientApplicationService.createApplication(input);
    expect(clientWebsiteAnalyticsService.track).toHaveBeenCalledWith(
      "application_start",
      { fundingCallId: call },
      "application",
    );
  });

  it("tracks a confirmed submission with a retry-stable local key", async () => {
    const input = {
      expectedApplicationRowVersion: 1,
      finalConfirmation: true as const,
      readinessToken: "confirmed",
    };
    vi.mocked(requestData).mockRejectedValueOnce(new Error("not ready"));
    await expect(
      clientApplicationService.submitApplication("application", input, call),
    ).rejects.toThrow();
    expect(clientWebsiteAnalyticsService.track).not.toHaveBeenCalled();
    vi.mocked(requestData).mockResolvedValue({
      applicationId: "application",
      submittedAt: "2026-10-06T12:00:00Z",
    });
    await clientApplicationService.submitApplication(
      "application",
      input,
      call,
    );
    expect(clientWebsiteAnalyticsService.track).toHaveBeenCalledWith(
      "application_submit",
      { fundingCallId: call },
      "application:2026-10-06T12:00:00Z",
    );
  });
});
