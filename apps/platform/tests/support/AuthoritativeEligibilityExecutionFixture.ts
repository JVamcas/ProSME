import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export const actor: AuthenticatedUser = {
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
export const versionId = "20000000-0000-4000-8000-000000000001";
export const taskId = "30000000-0000-4000-8000-000000000001";
export const input = {
  correlationId: "40000000-0000-4000-8000-000000000001",
  expectedRowVersion: 2,
  idempotencyKey: "50000000-0000-4000-8000-000000000001",
  taskId,
};

export function target() {
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
    formVersionId: null,
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

export function previousOutcome() {
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

