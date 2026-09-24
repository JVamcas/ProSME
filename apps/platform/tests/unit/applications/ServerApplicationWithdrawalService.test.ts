import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationWithdrawalRepository", () => ({
  withdrawOwnedApplication: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { withdrawApplication } from "@/modules/applications/ServerApplicationWithdrawalService";
import { withdrawOwnedApplication } from "@/modules/applications/infrastructure/ApplicationWithdrawalRepository";

const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
const correlationId = "89e20de0-3558-4d63-90a4-8c9f5125df07";
const command = { confirmed: true as const, reasonCode: "OTHER" };

function applicant(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Applicant",
    email: "applicant@example.test",
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("applicant withdrawal service", () => {
  it("requires the narrow withdrawal permission", async () => {
    await expect(withdrawApplication(
      applicant([permissionCodes.fundingApplicationOwnRead]),
      applicationId,
      command,
      "key",
      correlationId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(withdrawOwnedApplication).not.toHaveBeenCalled();
  });

  it("passes actor identity and the stable retry key to the repository", async () => {
    const result = {
      applicationId,
      reference: "SME-001",
      withdrawnAt: "2026-09-24T08:00:00.000Z",
    };
    vi.mocked(withdrawOwnedApplication).mockResolvedValue({
      kind: "withdrawn",
      result,
    });
    await expect(withdrawApplication(
      applicant([permissionCodes.fundingApplicationOwnWithdraw]),
      applicationId,
      command,
      " retry-key ",
      correlationId,
    )).resolves.toEqual(result);
    expect(withdrawOwnedApplication).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      applicationId,
      idempotencyKey: "retry-key",
    }));
  });

  it("hides another applicant's record and rejects terminal state", async () => {
    const user = applicant([permissionCodes.fundingApplicationOwnWithdraw]);
    vi.mocked(withdrawOwnedApplication).mockResolvedValueOnce({ kind: "not_found" });
    await expect(withdrawApplication(
      user, applicationId, command, "first", correlationId,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
    vi.mocked(withdrawOwnedApplication).mockResolvedValueOnce({ kind: "unavailable" });
    await expect(withdrawApplication(
      user, applicationId, command, "second", correlationId,
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
