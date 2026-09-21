import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/eligibility/infrastructure/AuthoritativeEligibilityRepository", () => ({
  findAuthoritativeEligibilityOutcome: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findRuntimeEligibilityRuleSetForEvaluation: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { ApplicationRecord } from "@/db/schema/applications";
import type { BusinessProfile } from "@/db/schema/profiles";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  AuthoritativeEligibilityUnavailableError,
  prepareAuthoritativeEligibilityOutcome,
  getAuthoritativeEligibilityOutcome,
} from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import { findAuthoritativeEligibilityOutcome } from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityRepository";
import { findRuntimeEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const applicationId = "20000000-0000-4000-8000-000000000001";
const fundingCallId = "30000000-0000-4000-8000-000000000001";
const versionId = "40000000-0000-4000-8000-000000000001";
const evaluatedAt = new Date("2026-09-21T08:00:00.000Z");

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: evaluatedAt,
    displayName: "Eligibility actor",
    email: "actor@example.test",
    id: actorId,
    identitySubject: "firebase-actor",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: evaluatedAt,
    userType: "applicant",
  };
}

const application = {
  businessId: "50000000-0000-4000-8000-000000000001",
  declarationsSection: { compliance: true },
  eligibilityRuleSetVersionId: versionId,
  financialSection: { amountRequested: 250_000 },
  id: applicationId,
  rowVersion: 7,
} as ApplicationRecord;
const business = {
  employeeCount: 0,
  establishedYear: 2024,
  registrationNumber: "B-123",
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
} as BusinessProfile;
const fundingCall = {
  eligibilityRuleSetVersionId: versionId,
  id: fundingCallId,
  maximumGrantAmount: "500000.00",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findRuntimeEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId: "70000000-0000-4000-8000-000000000001",
    rules: [{
      applicantMessage: "At least one employee is required.",
      condition: {
        conditionGroupId: "80000000-0000-4000-8000-000000000001",
        conditionId: "90000000-0000-4000-8000-000000000001",
        kind: "CONDITION",
      },
      conditionDefinition: {
        id: "90000000-0000-4000-8000-000000000001",
        kind: "CONDITION",
        leftOperand: {
          key: "application.business.employee_count",
          kind: "FIELD",
        },
        operator: basicOperators.GREATER_THAN,
        rightOperand: { kind: "CONSTANT", value: 0 },
      },
      executionMode: "SCREENING",
      failureType: "HARD_FAIL",
      id: "a0000000-0000-4000-8000-000000000001",
      order: 1,
      reasonCode: "EMPLOYEE_REQUIRED",
    }],
    versionId,
    versionNumber: 3,
  });
});

describe("authoritative eligibility service", () => {
  it("prepares a complete, version-bound screening snapshot", async () => {
    const result = await prepareAuthoritativeEligibilityOutcome({} as never, {
      actorId,
      application,
      business,
      correlationId: "submission-123",
      evaluatedAt,
      fundingCall,
    });

    expect(findRuntimeEligibilityRuleSetForEvaluation).toHaveBeenCalledWith(
      versionId,
      expect.anything(),
    );
    expect(result).toMatchObject({
      applicationId,
      eligible: false,
      evaluatedAt,
      evaluatedValues: {
        "application.business.employee_count": 0,
      },
      finalOutcome: "INELIGIBLE",
      hardFailures: [{ reasonCode: "EMPLOYEE_REQUIRED" }],
      ruleSetVersionId: versionId,
      ruleSetVersionNumber: 3,
    });
    expect(result.contextReference).toEqual({
      applicationId,
      applicationRowVersion: 7,
      businessProfileUpdatedAt: "2026-09-20T08:00:00.000Z",
      correlationId: "submission-123",
      fundingCallId,
    });
  });

  it("rejects a version that differs from the Funding Call binding", async () => {
    await expect(prepareAuthoritativeEligibilityOutcome({} as never, {
      actorId,
      application,
      business,
      correlationId: "submission-123",
      evaluatedAt,
      fundingCall: {
        ...fundingCall,
        eligibilityRuleSetVersionId:
          "b0000000-0000-4000-8000-000000000001",
      },
    })).rejects.toBeInstanceOf(AuthoritativeEligibilityUnavailableError);
  });

  it("enforces own/all read permissions and ownership scope", async () => {
    vi.mocked(findAuthoritativeEligibilityOutcome).mockResolvedValue({
      applicationId,
    } as never);

    await getAuthoritativeEligibilityOutcome(
      user([permissionCodes.fundingApplicationOwnRead]),
      applicationId,
    );
    expect(findAuthoritativeEligibilityOutcome).toHaveBeenLastCalledWith(
      applicationId,
      actorId,
    );

    await getAuthoritativeEligibilityOutcome(
      user([permissionCodes.fundingApplicationAllRead]),
      applicationId,
    );
    expect(findAuthoritativeEligibilityOutcome).toHaveBeenLastCalledWith(
      applicationId,
      undefined,
    );

    await expect(getAuthoritativeEligibilityOutcome(
      user([]),
      applicationId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});
