import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationDeletionRepository", () => ({
  deleteOwnedApplicationDraft: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { deleteOwnApplicationDraft } from "@/modules/applications/ServerApplicationDeletionService";
import { deleteOwnedApplicationDraft } from "@/modules/applications/infrastructure/ApplicationDeletionRepository";

const applicationId = "10000000-0000-4000-8000-000000000001";
const correlationId = "20000000-0000-4000-8000-000000000002";
const actorId = "30000000-0000-4000-8000-000000000003";

function actor(permissions: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(permissions),
    createdAt: new Date(),
    displayName: "Applicant",
    email: "applicant@example.test",
    id: actorId,
    identitySubject: "firebase-applicant",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("delete own application draft", () => {
  it("requires the specific draft deletion permission", async () => {
    await expect(deleteOwnApplicationDraft(
      actor([permissionCodes.fundingApplicationOwnUpdate]),
      applicationId,
      correlationId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(deleteOwnedApplicationDraft).not.toHaveBeenCalled();
  });

  it("passes the verified actor ID to the owner-scoped repository", async () => {
    vi.mocked(deleteOwnedApplicationDraft).mockResolvedValue("deleted");
    await expect(deleteOwnApplicationDraft(
      actor([permissionCodes.fundingApplicationDraftOwnDelete]),
      applicationId,
      correlationId,
    )).resolves.toEqual({ id: applicationId });
    expect(deleteOwnedApplicationDraft).toHaveBeenCalledWith({
      actorId,
      applicationId,
      correlationId,
    });
  });

  it("rejects an unowned or already deleted draft", async () => {
    vi.mocked(deleteOwnedApplicationDraft).mockResolvedValue("not_found");
    await expect(deleteOwnApplicationDraft(
      actor([permissionCodes.fundingApplicationDraftOwnDelete]),
      applicationId,
      correlationId,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("rejects an application that is no longer a draft", async () => {
    vi.mocked(deleteOwnedApplicationDraft).mockResolvedValue("not_draft");
    await expect(deleteOwnApplicationDraft(
      actor([permissionCodes.fundingApplicationDraftOwnDelete]),
      applicationId,
      correlationId,
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
