import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const repository = vi.hoisted(() => ({ store: vi.fn(), read: vi.fn() }));
vi.mock("@/modules/reporting/infrastructure/WebsiteHeatmapRepository", () => ({
  storeWebsiteHeatmap: repository.store,
  readWebsiteHeatmap: repository.read,
}));
vi.mock(
  "@/modules/reporting/infrastructure/AnonymousEligibilityRepository",
  () => ({}),
);
import {
  collectWebsiteHeatmap,
  getWebsiteHeatmap,
} from "@/modules/reporting/application/ServerWebsiteHeatmapService";
import { heatmapBatchSchema } from "@/modules/reporting/api/WebsiteHeatmapSchemas";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { heatmapBatch } from "../../support/WebsiteHeatmapFixture";
import { POST } from "@/app/api/public/analytics/heatmap/route";

const actor = {
  id: "staff",
  email: "reporting@example.test",
  displayName: "Reporting staff",
  identitySubject: "reporting-staff",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roleCodes: new Set<string>(),
  status: "active",
  capabilities: new Set([permissionCodes.reportingWebsiteReadAll]),
} as AuthenticatedUser;
const query = { startDate: "2026-10-01", endDate: "2026-10-07" };
const origin = "https://example.test";
function headers(cookie = "", requestOrigin = origin) {
  const result = new Headers({
    origin: requestOrigin,
  });
  if (cookie) result.set("cookie", `smefund_analytics_consent=${cookie}`);
  return result;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("WEBSITE_HEATMAP_ENABLED", "true");
  vi.stubEnv("GA_PROPERTY_TIMEZONE", "Africa/Windhoek");
});
afterEach(() => vi.unstubAllEnvs());

describe("heatmap privacy and authority", () => {
  it.each([
    {
      host: "localhost:3008",
      protocol: "http",
      origin: "http://localhost:3008",
    },
    { host: "smefund.na", protocol: "https", origin: "https://smefund.na" },
  ])(
    "accepts the browser origin behind the container ($origin)",
    async (deployment) => {
      const request = new Request(
        "http://0.0.0.0:3008/api/public/analytics/heatmap",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            host: deployment.host,
            "x-forwarded-proto": deployment.protocol,
            origin: deployment.origin,
            "sec-fetch-site": "same-origin",
          },
          body: JSON.stringify(heatmapBatch()),
        },
      );
      expect((await POST(request)).status).toBe(200);
      expect(repository.store).toHaveBeenCalledWith(heatmapBatch());
    },
  );

  it.each([
    { origin: "https://evil.test" },
    { origin: "https://smefund.na:444" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
    { "x-forwarded-proto": "https, http" },
    { host: "smefund.na/private" },
    { host: "visitor@smefund.na" },
  ])(
    "rejects mismatched or malformed proxy context before storage: %j",
    async (overrides) => {
      const request = new Request(
        "http://0.0.0.0:3008/api/public/analytics/heatmap",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            host: "smefund.na",
            "x-forwarded-proto": "https",
            origin: "https://smefund.na",
            "sec-fetch-site": "same-origin",
            ...overrides,
          },
          body: JSON.stringify(heatmapBatch()),
        },
      );
      expect((await POST(request)).status).toBe(400);
      expect(repository.store).not.toHaveBeenCalled();
    },
  );

  it.each(["", "declined", "accepted", "accepted-evil"])(
    "accepts anonymous capture independently of analytics consent (%s)",
    async (cookie) => {
      await collectWebsiteHeatmap(heatmapBatch(), headers(cookie), origin);
      expect(repository.store).toHaveBeenCalledWith(heatmapBatch());
    },
  );
  it("requires enabled collection and a same-origin request", async () => {
    await expect(
      collectWebsiteHeatmap(
        heatmapBatch(),
        headers("accepted", "https://evil.test"),
        origin,
      ),
    ).rejects.toThrow();
    vi.stubEnv("WEBSITE_HEATMAP_ENABLED", "false");
    await expect(
      collectWebsiteHeatmap(heatmapBatch(), headers(), origin),
    ).rejects.toThrow();
    expect(repository.store).not.toHaveBeenCalled();
  });
  it("rejects a missing origin or cross-site context before storage", async () => {
    await expect(
      collectWebsiteHeatmap(heatmapBatch(), new Headers(), origin),
    ).rejects.toThrow("same-origin");
    const crossSite = headers();
    crossSite.set("sec-fetch-site", "cross-site");
    await expect(
      collectWebsiteHeatmap(heatmapBatch(), crossSite, origin),
    ).rejects.toThrow("same-origin");
    expect(repository.store).not.toHaveBeenCalled();
  });
  it.each([
    "/portal/applications/private-id/edit",
    "/cms",
    "/admin",
    "/sign-in",
    "/contact",
    "/how-to-apply/eligibility",
    "/?email=secret",
  ])("rejects capture outside approved pages (%s)", async (page) => {
    const batch = heatmapBatch();
    batch.layout.page = page;
    await expect(
      collectWebsiteHeatmap(batch, headers(), origin),
    ).rejects.toThrow();
    expect(repository.store).not.toHaveBeenCalled();
  });
  it("rejects text, screenshots, arbitrary attributes and unbounded geometry", () => {
    const batch = heatmapBatch();
    for (const extra of [
      { text: "private answer" },
      { screenshot: "data:image/png;base64,secret" },
      { visitorId: "private" },
    ]) {
      expect(heatmapBatchSchema.safeParse({ ...batch, ...extra }).success).toBe(
        false,
      );
    }
    expect(
      heatmapBatchSchema.safeParse({
        ...batch,
        layout: {
          ...batch.layout,
          boxes: [{ ...batch.layout.boxes[0], text: "secret" }],
        },
      }).success,
    ).toBe(false);
    expect(
      heatmapBatchSchema.safeParse({
        ...batch,
        clicks: Array.from({ length: 201 }, () => batch.clicks[0]),
      }).success,
    ).toBe(false);
    expect(
      heatmapBatchSchema.safeParse({
        ...batch,
        layout: {
          ...batch.layout,
          boxes: Array.from({ length: 81 }, () => batch.layout.boxes[0]),
        },
      }).success,
    ).toBe(false);
  });
  it("stores only validated public geometry", async () => {
    await collectWebsiteHeatmap(heatmapBatch(), headers(), origin);
    expect(repository.store).toHaveBeenCalledWith(heatmapBatch());
  });
  it("denies unauthenticated, inactive and unrelated permissions before repository access", async () => {
    for (const user of [
      null,
      { ...actor, status: "suspended" },
      { ...actor, capabilities: new Set(["cms.access"]) },
    ]) {
      await expect(
        getWebsiteHeatmap(user as AuthenticatedUser | null, query),
      ).rejects.toThrow();
    }
    expect(repository.read).not.toHaveBeenCalled();
  });
  it("reads bounded SQL results for the authorized reporting actor", async () => {
    repository.read.mockResolvedValue({
      variants: [],
      selected: null,
      clicks: [],
      scroll: [],
      truncated: false,
    });
    const result = await getWebsiteHeatmap(actor, query);
    expect(repository.read).toHaveBeenCalledWith(query, "Africa/Windhoek");
    expect(result.collectionEnabled).toBe(true);
  });
});
