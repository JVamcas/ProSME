import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository",
  () => ({
    findAuthoritativeEligibilityExecutionByCommand: vi.fn(),
    lockAuthoritativeEligibilityTask: vi.fn(),
    persistAuthoritativeEligibilityExecution: vi.fn(),
    withAuthoritativeEligibilityExecutionTransaction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository",
  () => ({ findRuntimeEligibilityRuleSetForEvaluation: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/application/ServerEligibilityDataResolver",
  () => ({ resolveAuthoritativeEligibilityData: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import {
  executeAuthoritativeEligibility,
} from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import { resolveAuthoritativeEligibilityData } from "@/modules/eligibility/application/ServerEligibilityDataResolver";
import {
  findAuthoritativeEligibilityExecutionByCommand,
  lockAuthoritativeEligibilityTask,
  persistAuthoritativeEligibilityExecution,
  withAuthoritativeEligibilityExecutionTransaction,
} from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityExecutionRepository";
import { findRuntimeEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedProcess]),
  createdAt: new Date(),
  displayName: "Screening officer",
  email: "screening@example.test",
  id: "10000000-0000-4000-8000-000000000001",
  identitySubject: "screening-officer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
const versionId = "20000000-0000-4000-8000-000000000001";
const taskId = "30000000-0000-4000-8000-000000000001";
const input = {
  correlationId: "40000000-0000-4000-8000-000000000001",
  expectedRowVersion: 2,
  idempotencyKey: "50000000-0000-4000-8000-000000000001",
  taskId,
};

function target() {
  return {
    application: {
      businessSection: {},
      declarationsSection: {},
      eligibilityRuleSetVersionId: versionId,
      financialSection: {},
      formVersionId: null,
      id: "60000000-0000-4000-8000-000000000001",
      projectSection: {},
      rowVersion: 4,
    },
    assignedToActor: true,
    business: {
      employeeCount: 2,
      establishedYear: 2024,
      registrationNumber: "B-1",
      updatedAt: new Date("2026-09-22T08:00:00.000Z"),
    },
    config: {
      command: "AUTHORITATIVE_ELIGIBILITY",
      reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
    },
    fundingCall: {
      closesAt: new Date("2026-12-01T00:00:00.000Z"),
      eligibilityRuleSetVersionId: versionId,
      fundingInstrument: "Grant",
      id: "70000000-0000-4000-8000-000000000001",
      maximumGrantAmount: "100000",
      minimumGrantAmount: "1000",
      opensAt: new Date("2026-09-01T00:00:00.000Z"),
      slug: "growth",
      status: "LIVE",
      thematicArea: "Growth",
      title: "Growth",
      totalBudgetEnvelope: "1000000",
    },
    permissions: defaultWorkflowElementPermissions,
    prerequisiteNames: [],
    previousOutcome: null,
    rowVersion: 2,
    stageInstanceId: "80000000-0000-4000-8000-000000000001",
    status: "IN_PROGRESS",
    taskId,
    taskKey: "AUTHORITATIVE_ELIGIBILITY",
    workflowInstanceId: "90000000-0000-4000-8000-000000000001",
  };
}

function previousOutcome() {
  return {
    applicationId: "60000000-0000-4000-8000-000000000001",
    contextReference: {
      applicationId: "60000000-0000-4000-8000-000000000001",
      applicationRowVersion: 4,
      businessProfileUpdatedAt: "2026-09-22T08:00:00.000Z",
      correlationId: "40000000-0000-4000-8000-000000000000",
      fundingCallId: "70000000-0000-4000-8000-000000000001",
    },
    eligible: true,
    evaluatedAt: new Date("2026-09-22T08:30:00.000Z"),
    evaluatedBy: actor.id,
    evaluatedValueProvenance: {},
    evaluatedValues: {},
    evaluationNumber: 1,
    finalOutcome: "ELIGIBLE" as const,
    hardFailures: [],
    id: "b0000000-0000-4000-8000-000000000000",
    manualScreeningRequired: false,
    ruleOutcomes: [],
    ruleSetVersionId: versionId,
    ruleSetVersionNumber: 3,
    softFailures: [],
    warnings: [],
    workflowTaskId: taskId,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withAuthoritativeEligibilityExecutionTransaction)
    .mockImplementation(async (work) => work({} as never));
  vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue(target());
  vi.mocked(findAuthoritativeEligibilityExecutionByCommand)
    .mockResolvedValue(null);
  vi.mocked(findRuntimeEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId: "a0000000-0000-4000-8000-000000000001",
    rules: [],
    versionId,
    versionNumber: 3,
  });
  vi.mocked(resolveAuthoritativeEligibilityData).mockResolvedValue({
    provenance: {},
    resolutions: [],
    values: {},
  });
  vi.mocked(persistAuthoritativeEligibilityExecution).mockResolvedValue({
    eligible: true,
    evaluationId: "b0000000-0000-4000-8000-000000000001",
    evaluationNumber: 1,
    hardFailureCount: 0,
    manualScreeningRequired: false,
    outcome: "ELIGIBLE",
    rowVersion: 3,
    softFailureCount: 0,
    warningCount: 0,
  });
});

describe("authoritative eligibility workflow execution", () => {
  it("persists the verified outcome inside the workflow transaction", async () => {
    await expect(executeAuthoritativeEligibility(actor, input)).resolves
      .toMatchObject({ outcome: "ELIGIBLE", rowVersion: 3 });
    expect(persistAuthoritativeEligibilityExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        commandKey: input.idempotencyKey,
        outcome: expect.objectContaining({
          evaluatedBy: actor.id,
          evaluationNumber: 1,
          ruleSetVersionId: versionId,
          workflowTaskId: taskId,
        }),
      }),
    );
  });

  it("blocks evaluation until required Screening tasks complete", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      prerequisiteNames: ["Completeness and document screening"],
    });

    await expect(executeAuthoritativeEligibility(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });

  it("denies an actor without the configured process permission", async () => {
    await expect(executeAuthoritativeEligibility({
      ...actor,
      capabilities: new Set(),
    }, input)).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("hides a task assigned to a different actor", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      assignedToActor: false,
    });

    await expect(executeAuthoritativeEligibility(actor, input)).rejects
      .toBeInstanceOf(ResourceNotFoundError);
  });

  it("blocks re-evaluation when the published task policy forbids it", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      config: {
        command: "AUTHORITATIVE_ELIGIBILITY",
        reevaluationPolicy: "NEVER",
      },
      previousOutcome: previousOutcome(),
    });

    await expect(executeAuthoritativeEligibility(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
    expect(resolveAuthoritativeEligibilityData).not.toHaveBeenCalled();
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });

  it("requires changed resolved evidence before creating a new evaluation", async () => {
    vi.mocked(lockAuthoritativeEligibilityTask).mockResolvedValue({
      ...target(),
      previousOutcome: previousOutcome(),
      status: "COMPLETED",
    });

    await expect(executeAuthoritativeEligibility(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
    expect(persistAuthoritativeEligibilityExecution).not.toHaveBeenCalled();
  });
});
