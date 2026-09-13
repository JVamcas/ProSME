import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/business.repository", () => ({
  createOwnedBusiness: vi.fn(),
  deleteOwnedBusiness: vi.fn(),
  findOwnedBusiness: vi.fn(),
  listOwnedBusinesses: vi.fn(),
  updateOwnedBusiness: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  deleteOwnedBusiness,
  listOwnedBusinesses,
  updateOwnedBusiness,
} from "@/db/repositories/business.repository";
import {
  BusinessNotFoundError,
  deleteBusiness,
  listBusinesses,
  updateBusiness,
} from "@/modules/profiles/business.service";

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
  it("scopes the business list to the authenticated owner", async () => {
    vi.mocked(listOwnedBusinesses).mockResolvedValue([]);
    await listBusinesses(user([capabilities.businessReadOwn]));
    expect(listOwnedBusinesses).toHaveBeenCalledWith(ownerId);
  });

  it("rejects updates without business update permission", async () => {
    await expect(
      updateBusiness(user([capabilities.businessReadOwn]), businessId, input),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateOwnedBusiness).not.toHaveBeenCalled();
  });

  it("does not reveal a business outside the ownership scope", async () => {
    vi.mocked(deleteOwnedBusiness).mockResolvedValue(false);
    await expect(
      deleteBusiness(user([capabilities.businessUpdateOwn]), businessId),
    ).rejects.toBeInstanceOf(BusinessNotFoundError);
    expect(deleteOwnedBusiness).toHaveBeenCalledWith(ownerId, businessId);
  });
});
