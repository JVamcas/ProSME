import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationSubmissionRepository", () => ({
  submitOwnedApplication: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { IdempotencyConflictError } from "@/lib/resource-errors";
import { submitOwnedApplication } from "@/modules/applications/infrastructure/ApplicationSubmissionRepository";
import {
  ApplicationSubmissionConflictError,
  submitApplication,
} from "@/modules/applications/ServerApplicationSubmissionService";

const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
const correlationId = "89e20de0-3558-4d63-90a4-8c9f5125df07";
const command = {
  expectedApplicationRowVersion: 4,
  finalConfirmation: true as const,
  readinessToken: "signed-readiness-token",
};

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

describe("application submission service", () => {
  it("authorizes and passes the confirmed versioned command", async () => {
    const result = {
      applicationId,
      reference: "SME-2027-01-2026-000001",
      submittedAt: "2026-09-15T08:00:00.000Z",
      workflowInstanceId: "69e20de0-3558-4d63-90a4-8c9f5125df07",
      workflowTemplateVersionId: "59e20de0-3558-4d63-90a4-8c9f5125df07",
    };
    vi.mocked(submitOwnedApplication).mockResolvedValue({
      kind: "submitted",
      result,
    });

    await expect(submitApplication(
      applicant([permissionCodes.fundingApplicationSubmit]),
      applicationId,
      command,
      " submission-command ",
      correlationId,
    )).resolves.toEqual(result);
    expect(submitOwnedApplication).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      applicationId,
      expectedApplicationRowVersion: 4,
      finalConfirmation: true,
      idempotencyKey: "submission-command",
      readinessToken: "signed-readiness-token",
    }));
  });

  it("rejects missing permission before repository access", async () => {
    await expect(submitApplication(
      applicant([]),
      applicationId,
      command,
      "submission-command",
      correlationId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(submitOwnedApplication).not.toHaveBeenCalled();
  });

  it("requires an idempotency key", async () => {
    await expect(submitApplication(
      applicant([permissionCodes.fundingApplicationSubmit]),
      applicationId,
      command,
      null,
      correlationId,
    )).rejects.toMatchObject({ name: "RequestValidationError" });
    expect(submitOwnedApplication).not.toHaveBeenCalled();
  });

  it.each([
    ["draft_incomplete", "Complete every application section"],
    ["documents_invalid", "finish uploading"],
    ["duplicate_submission", "submission already exists"],
    ["eligibility_unavailable", "Eligibility validation is unavailable"],
    ["opportunity_unavailable", "not accepting submissions"],
    ["reference_configuration_invalid", "reference configuration is invalid"],
    ["representative_authority_required", "not authorized"],
    ["stage_entry_condition_failed", "entry conditions were not met"],
    ["stale_preflight", "Run preflight again"],
    ["workflow_unavailable", "exactly one valid initial workflow stage"],
  ] as const)("returns a safe conflict for %s", async (kind, message) => {
    vi.mocked(submitOwnedApplication).mockResolvedValue({ kind });
    await expect(submitApplication(
      applicant([permissionCodes.fundingApplicationSubmit]),
      applicationId,
      command,
      `key-${kind}`,
      correlationId,
    )).rejects.toMatchObject({
      message: expect.stringContaining(message),
      name: "ApplicationSubmissionConflictError",
    });
  });

  it("distinguishes an idempotency key collision", async () => {
    vi.mocked(submitOwnedApplication).mockResolvedValue({
      kind: "idempotency_conflict",
    });
    await expect(submitApplication(
      applicant([permissionCodes.fundingApplicationSubmit]),
      applicationId,
      command,
      "reused-key",
      correlationId,
    )).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("uses the submission conflict error family", () => {
    expect(new ApplicationSubmissionConflictError("conflict").userMessage)
      .toBe("conflict");
  });
});
