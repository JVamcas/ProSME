import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/funding-opportunities/ServerFundingOpportunityIntegration",
  () => ({
    findPublishedFundingOpportunity: vi.fn(),
    listPublishedFundingOpportunities: vi.fn(),
  }),
);

import * as itemRoute from "@/app/api/portal/funding-opportunities/[id]/route";
import * as listRoute from "@/app/api/portal/funding-opportunities/route";
import { capabilities } from "@/auth/authorization/capabilities";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
} from "@/modules/funding-opportunities/ServerFundingOpportunityIntegration";

const opportunity = {
  closesAt: "2026-10-31T21:59:59.000Z",
  eligibility: { root: { children: [] } } as never,
  id: 42,
  maximumAmount: 200000,
  minimumAmount: 50000,
  opensAt: "2026-09-01T00:00:00.000Z",
  slug: "growth-fund",
  status: "open" as const,
  summary: "Support for growing Namibian businesses.",
  title: "Growth Fund",
};

function user(): AuthenticatedUser {
  return {
    capabilities: new Set([capabilities.profileReadOwn]),
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
    vi.mocked(listPublishedFundingOpportunities).mockResolvedValue({
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
    expect(listPublishedFundingOpportunities).toHaveBeenCalledWith({
      limit: 25,
    });
  });

  it("validates and passes list filters to the service", async () => {
    vi.mocked(listPublishedFundingOpportunities).mockResolvedValue({
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
    expect(listPublishedFundingOpportunities).toHaveBeenCalledWith({
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
    expect(listPublishedFundingOpportunities).not.toHaveBeenCalled();
  });

  it("returns a published opportunity by id", async () => {
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue(opportunity);

    const response = await itemRoute.GET(
      request("/api/portal/funding-opportunities/42"),
      { params: Promise.resolve({ id: "42" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { id: 42, slug: "growth-fund" },
    });
    expect(findPublishedFundingOpportunity).toHaveBeenCalledWith(42);
  });

  it("rejects non-numeric ids", async () => {
    const response = await itemRoute.GET(
      request("/api/portal/funding-opportunities/not-an-id"),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );

    expect(response.status).toBe(400);
    expect(findPublishedFundingOpportunity).not.toHaveBeenCalled();
  });

  it("returns a resource-specific missing-opportunity response", async () => {
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue(null);

    const response = await itemRoute.GET(
      request("/api/portal/funding-opportunities/404"),
      { params: Promise.resolve({ id: "404" }) },
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
    expect(listPublishedFundingOpportunities).not.toHaveBeenCalled();
  });
});
