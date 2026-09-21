import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/ServerFundingOpportunityIntegration",
  () => ({
    findPublishedFundingOpportunity: vi.fn(),
    listPublishedFundingOpportunities: vi.fn(),
  }),
);

import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
} from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import {
  FundingOpportunityNotFoundError,
  getFundingOpportunity,
  listFundingOpportunities,
} from "@/modules/funding-calls/ServerFundingOpportunityService";

function user(status: "active" | "disabled" = "active"): AuthenticatedUser {
  return {
    businessProfileComplete: false,
    capabilities: new Set([permissionCodes.fundingCallRead]),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "owner@example.test",
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    profileComplete: true,
    roleCodes: new Set(["applicant"]),
    status,
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("funding opportunity service", () => {
  const fundingCallId = "00000000-0000-4000-8000-000000000404";

  it("lists published business funding calls for an active applicant", async () => {
    const input = { limit: 25 };
    const page = { items: [], nextCursor: null, total: 0 };
    vi.mocked(listPublishedFundingOpportunities).mockResolvedValue(page);

    await expect(listFundingOpportunities(user(), input)).resolves.toEqual(page);
    expect(listPublishedFundingOpportunities).toHaveBeenCalledWith(input);
  });

  it("rejects a disabled applicant before querying funding calls", async () => {
    await expect(
      listFundingOpportunities(user("disabled"), { limit: 25 }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(listPublishedFundingOpportunities).not.toHaveBeenCalled();
  });

  it("returns not found for a missing published opportunity", async () => {
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue(null);

    await expect(
      getFundingOpportunity(user(), fundingCallId),
    ).rejects.toBeInstanceOf(FundingOpportunityNotFoundError);
  });
});
