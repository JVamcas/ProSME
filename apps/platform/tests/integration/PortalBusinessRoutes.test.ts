import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/db/repositories/BusinessRepository", () => ({
  createOwnedBusiness: vi.fn(),
  deleteOwnedBusiness: vi.fn(),
  findOwnedBusiness: vi.fn(),
  listOwnedBusinesses: vi.fn(),
  updateOwnedBusiness: vi.fn(),
}));

import * as itemRoute from "@/app/api/portal/businesses/[id]/route";
import * as listRoute from "@/app/api/portal/businesses/route";
import { permissionCodes } from "@/auth/authorization/permissions";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedBusiness,
  deleteOwnedBusiness,
  findOwnedBusiness,
  listOwnedBusinesses,
} from "@/db/repositories/BusinessRepository";

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
const row = {
  ...input,
  createdAt: new Date("2026-09-13T00:00:00.000Z"),
  employeeCount: 4,
  establishedYear: 2020,
  id: businessId,
  updatedAt: new Date("2026-09-13T00:00:00.000Z"),
};

function user(granted: string[]): AuthenticatedUser {
  return {
    businessProfileComplete: true,
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "owner@example.test",
    id: ownerId,
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    profileComplete: true,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3008${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    method,
  });
}

beforeEach(() => vi.clearAllMocks());

describe("owned business routes", () => {
  it("lists only the authenticated user's businesses", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.businessOwnRead]),
    );
    vi.mocked(listOwnedBusinesses).mockResolvedValue([row]);

    const response = await listRoute.GET(request("/api/portal/businesses"));
    expect(response.status).toBe(200);
    expect(listOwnedBusinesses).toHaveBeenCalledWith(ownerId);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: businessId, legalName: input.legalName }],
    });
  });

  it("creates a business for the authenticated owner", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([
        permissionCodes.businessOwnRead,
        permissionCodes.businessOwnUpdate,
      ]),
    );
    vi.mocked(createOwnedBusiness).mockResolvedValue(businessId);
    vi.mocked(findOwnedBusiness).mockResolvedValue(row);

    const response = await listRoute.POST(
      request("/api/portal/businesses", "POST", input),
    );
    expect(response.status).toBe(200);
    expect(createOwnedBusiness).toHaveBeenCalledWith(ownerId, input);
  });

  it("returns not found without exposing another owner's business", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.businessOwnUpdate]),
    );
    vi.mocked(deleteOwnedBusiness).mockResolvedValue(false);

    const response = await itemRoute.DELETE(
      request(`/api/portal/businesses/${businessId}`, "DELETE"),
      { params: Promise.resolve({ id: businessId }) },
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
