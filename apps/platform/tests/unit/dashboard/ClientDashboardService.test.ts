import { afterEach, describe, expect, it, vi } from "vitest";

import { clientDashboardService } from "@/modules/dashboard/ClientDashboardService";
import { ClientRequestError } from "@/lib/client-http";

afterEach(() => vi.unstubAllGlobals());

describe("dashboard response contracts", () => {
  it("parses the staff projection and forwards cancellation", async () => {
    const data = {
      activities: [],
      metrics: {
        totalApplications: 3,
        underReview: 1,
        informationRequests: 2,
        pendingDecision: 0,
      },
      period: "7",
      statuses: [],
      visibility: "assigned",
    };
    const fetch = vi.fn().mockResolvedValue(Response.json({ data }));
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    expect(await clientDashboardService.getStaff("7", signal)).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/api/dashboard/staff?period=7", {
      signal,
      cache: "no-store",
    });
  });

  it("rejects malformed successful responses instead of showing false metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: { metrics: { submittedApplications: -1 } } }),
        ),
    );
    await expect(clientDashboardService.getApplicant()).rejects.toMatchObject({
      status: 502,
    });
  });

  it("preserves permission denial for cache eviction", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: { message: "Denied" } }, { status: 403 }),
        ),
    );
    await expect(clientDashboardService.getApplicant()).rejects.toBeInstanceOf(
      ClientRequestError,
    );
    await expect(clientDashboardService.getApplicant()).rejects.toMatchObject({
      status: 403,
    });
  });
});
