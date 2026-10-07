import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
const services = vi.hoisted(() => ({ collect: vi.fn(), report: vi.fn() }));
vi.mock("@/modules/reporting/ServerWebsiteHeatmapService", () => ({
  collectWebsiteHeatmap: services.collect,
  getWebsiteHeatmap: services.report,
}));
import { POST } from "@/app/api/public/analytics/heatmap/route";
import { GET } from "@/app/api/reporting/website/heatmap/route";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { heatmapBatch } from "../../support/WebsiteHeatmapFixture";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("heatmap HTTP boundaries", () => {
  it("accepts a bounded valid batch and forwards request context to the service", async () => {
    const request = new Request(
      "https://example.test/api/public/analytics/heatmap",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://example.test",
        },
        body: JSON.stringify(heatmapBatch()),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(services.collect).toHaveBeenCalledWith(
      heatmapBatch(),
      request.headers,
      "https://example.test",
    );
  });
  it.each(["malformed", "oversized", "wrong content type", "private page"])(
    "rejects %s batches before calling the service",
    async (scenario) => {
      const batch = heatmapBatch();
      if (scenario === "private page") batch.layout.page = "/portal";
      const body =
        scenario === "malformed"
          ? "{"
          : scenario === "oversized"
            ? "x".repeat(32769)
            : JSON.stringify(batch);
      const request = new Request(
        "https://example.test/api/public/analytics/heatmap",
        {
          method: "POST",
          headers: {
            "Content-Type":
              scenario === "wrong content type"
                ? "text/plain"
                : "application/json",
          },
          body,
        },
      );
      expect((await POST(request)).status).toBe(400);
      expect(services.collect).not.toHaveBeenCalled();
    },
  );
  it("enforces staff authority and bounded report query validation", async () => {
    const url =
      "https://example.test/api/reporting/website/heatmap?startDate=2026-10-01&endDate=2026-10-07";
    services.report.mockRejectedValueOnce(new AuthenticationRequiredError());
    expect((await GET(new Request(url))).status).toBe(401);
    services.report.mockRejectedValueOnce(
      new PermissionDeniedError("reporting.website.read.all"),
    );
    expect((await GET(new Request(url))).status).toBe(403);
    expect(
      (await GET(new Request(url.replace("2026-10-01", "invalid")))).status,
    ).toBe(400);
    expect(services.report).toHaveBeenCalledTimes(2);
  });
});

describe("nonblocking heatmap upload service", () => {
  it("allows only one regular upload in flight and bounds the request duration", async () => {
    vi.stubGlobal("document", { cookie: "smefund_analytics_consent=accepted" });
    let resolve: (response: Response) => void = () => undefined;
    const fetch = vi.fn<typeof globalThis.fetch>(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const { clientWebsiteHeatmapService } =
      await import("@/modules/reporting/ClientWebsiteHeatmapService");
    const pending = clientWebsiteHeatmapService.collect(heatmapBatch(), false);
    await expect(
      clientWebsiteHeatmapService.collect(heatmapBatch(), false),
    ).rejects.toThrow("already in progress");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    resolve(
      new Response(JSON.stringify({ data: { accepted: true } }), {
        status: 200,
      }),
    );
    await pending;
    vi.stubGlobal("document", { cookie: "smefund_analytics_consent=declined" });
    await clientWebsiteHeatmapService.collect(heatmapBatch(), false);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
