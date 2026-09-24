import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/funding-calls/application/ServerPublicFundingCallService", () => ({
  findPublicFundingCallById: vi.fn(),
  listPublicFundingCalls: vi.fn(),
}));

import * as itemRoute from "@/app/api/portal/funding-opportunities/[id]/route";
import * as listRoute from "@/app/api/portal/funding-opportunities/route";
import { permissionCodes } from "@/auth/authorization/permissions";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findPublicFundingCallById,
  listPublicFundingCalls,
} from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const opportunityId = "00000000-0000-4000-8000-000000000042";
const missingOpportunityId = "00000000-0000-4000-8000-000000000404";
const opportunity = {
  applicationsOpen: true,
  closesAt: "2026-10-31T21:59:59.000Z",
  description: "<p>Support for growing Namibian businesses.</p>",
  eligibilitySummary: null,
  fundingInstrument: "Grant",
  id: opportunityId,
  maximumAmount: 200000,
  minimumAmount: 50000,
  opensAt: "2026-09-01T00:00:00.000Z",
  publicContact: { email: null, name: null, phone: null },
  publicDocuments: [],
  reference: "GROWTH-2026",
  selfCheckAvailable: true,
  slug: "growth-fund",
  status: "open" as const,
  summary: "Support for growing Namibian businesses.",
  thematicArea: "Growth",
  title: "Growth Fund",
  totalFundingAmount: 1000000,
};

function user(): AuthenticatedUser {
  return {
    capabilities: new Set([permissionCodes.fundingCallRead]),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "owner@example.test",
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

function request(path: string) {
  return new Request(`http://localhost:3008${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(user());
});

describe("portal funding opportunity routes", () => {
  it("returns the list envelope and total", async () => {
    vi.mocked(listPublicFundingCalls).mockResolvedValue({
      items: [opportunity],
      nextCursor: "next-page",
      total: 2,
    });

    const response = await listRoute.GET(
      request("/api/portal/funding-opportunities"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ slug: "growth-fund" }],
      page: { nextCursor: "next-page", total: 2 },
    });
    expect(listPublicFundingCalls).toHaveBeenCalledWith({
      limit: 25,
    });
  });

  it("validates and passes list filters to the service", async () => {
    vi.mocked(listPublicFundingCalls).mockResolvedValue({
      items: [],
      nextCursor: null,
      total: 0,
    });

    const response = await listRoute.GET(
      request(
        "/api/portal/funding-opportunities?limit=10&status=open&search=growth&after=cursor",
      ),
    );

    expect(response.status).toBe(200);
    expect(listPublicFundingCalls).toHaveBeenCalledWith({
      after: "cursor",
      limit: 10,
      search: "growth",
      status: "open",
    });
  });

  it("rejects unsupported list filters", async () => {
    const response = await listRoute.GET(
      request("/api/portal/funding-opportunities?limit=101&status=draft"),
    );

    expect(response.status).toBe(400);
    expect(listPublicFundingCalls).not.toHaveBeenCalled();
  });

  it("returns a published opportunity by id", async () => {
    vi.mocked(findPublicFundingCallById).mockResolvedValue(opportunity);

    const response = await itemRoute.GET(
      request(`/api/portal/funding-opportunities/${opportunityId}`),
      { params: Promise.resolve({ id: opportunityId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { id: opportunityId, slug: "growth-fund" },
    });
    expect(findPublicFundingCallById).toHaveBeenCalledWith(opportunityId);
  });

  it("rejects invalid UUIDs", async () => {
    const response = await itemRoute.GET(
      request("/api/portal/funding-opportunities/not-an-id"),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );

    expect(response.status).toBe(400);
    expect(findPublicFundingCallById).not.toHaveBeenCalled();
  });

  it("returns a resource-specific missing-opportunity response", async () => {
    vi.mocked(findPublicFundingCallById).mockResolvedValue(null);

    const response = await itemRoute.GET(
      request(`/api/portal/funding-opportunities/${missingOpportunityId}`),
      { params: Promise.resolve({ id: missingOpportunityId }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "The requested funding opportunity was not found.",
      },
    });
  });

  it("requires an authenticated applicant", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(null);

    const response = await listRoute.GET(
      request("/api/portal/funding-opportunities"),
    );

    expect(response.status).toBe(401);
    expect(listPublicFundingCalls).not.toHaveBeenCalled();
  });
});
