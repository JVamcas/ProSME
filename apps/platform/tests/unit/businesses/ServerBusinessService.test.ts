import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/BusinessRepository", () => ({
  createOwnedBusiness: vi.fn(),
  deleteOwnedBusiness: vi.fn(),
  findOwnedBusiness: vi.fn(),
  listOwnedBusinesses: vi.fn(),
  listOwnedBusinessesForApplication: vi.fn(),
  updateOwnedBusiness: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  deleteOwnedBusiness,
  listOwnedBusinesses,
  listOwnedBusinessesForApplication,
  updateOwnedBusiness,
} from "@/db/repositories/BusinessRepository";
import {
  BusinessNotFoundError,
  deleteBusiness,
  listApplicationBusinesses,
  listBusinesses,
  updateBusiness,
} from "@/modules/businesses/ServerBusinessService";

const ownerId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const businessId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
const input = {
  businessType: "Close corporation",
  employeeCount: "4",
  establishedYear: "2020",
  legalName: "Anna Trading CC",
  physicalAddress: "1 Independence Avenue",
  region: "Khomas",
  registrationNumber: "CC/2026/1",
  sector: "Retail",
  tradingName: "Anna Trading",
};

function user(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "owner@example.test",
    id: ownerId,
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    profileComplete: true,
    businessProfileComplete: true,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("owned business service", () => {
  const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";

  it("scopes the business list to the authenticated owner", async () => {
    vi.mocked(listOwnedBusinesses).mockResolvedValue([]);
    await listBusinesses(user([permissionCodes.businessOwnRead]));
    expect(listOwnedBusinesses).toHaveBeenCalledWith(ownerId);
  });

  it("marks businesses already used for the application funding call", async () => {
    vi.mocked(listOwnedBusinessesForApplication).mockResolvedValue([
      {
        ...input,
        alreadyApplied: true,
        createdAt: new Date("2026-09-15T08:00:00.000Z"),
        employeeCount: 4,
        establishedYear: 2020,
        id: businessId,
        updatedAt: new Date("2026-09-15T08:00:00.000Z"),
      },
    ]);
    const result = await listApplicationBusinesses(
      user([permissionCodes.businessOwnRead]),
      { applicationId: ownerId, fundingOpportunityId },
    );

    expect(result[0]).toMatchObject({ alreadyApplied: true, id: businessId });
    expect(listOwnedBusinessesForApplication).toHaveBeenCalledWith({
      applicationId: ownerId,
      fundingOpportunityId,
      ownerUserId: ownerId,
    });
  });

  it("rejects updates without business update permission", async () => {
    await expect(
      updateBusiness(user([permissionCodes.businessOwnRead]), businessId, input),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateOwnedBusiness).not.toHaveBeenCalled();
  });

  it("does not reveal a business outside the ownership scope", async () => {
    vi.mocked(deleteOwnedBusiness).mockResolvedValue(false);
    await expect(
      deleteBusiness(user([permissionCodes.businessOwnUpdate]), businessId),
    ).rejects.toBeInstanceOf(BusinessNotFoundError);
    expect(deleteOwnedBusiness).toHaveBeenCalledWith(ownerId, businessId);
  });
});
