import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  evaluateWorkflowActionConditions,
  evaluateWorkflowActionPolicy,
} from "@/modules/workflows/application/runtime/WorkflowActionPolicy";

const action: WorkflowActionDefinition = {
  actionType: "APPROVE_ADVANCE",
  configuration: {},
  displayOrder: 1,
  enabled: true,
  label: "Advance",
  reasonCodeRequired: false,
  stableKey: "ADVANCE",
};

function actor(...permissions: string[]) {
  return {
    capabilities: new Set(permissions),
    status: "active",
  } as unknown as AuthenticatedUser;
}

function target(assignedToActor = true) {
  return {
    action,
    stageStatus: "ACTIVE",
    task: {
      assignedToActor,
      permissions: defaultWorkflowElementPermissions,
      status: "IN_PROGRESS",
    },
    workflowStatus: "ACTIVE",
  };
}

const permittedInputs = {
  conditionsPass: true,
  configurationValid: true,
  targetsValid: true,
};

function condition(expected: string): ConditionGroup {
  return {
    children: [{
      id: `condition-${expected}`,
      kind: "CONDITION",
      leftOperand: { key: "application.status", kind: "FIELD" },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value: expected },
    }],
    combinator: "AND",
    id: `group-${expected}`,
    kind: "GROUP",
  };
}

describe("workflow action policy", () => {
  it("derives actor-specific availability from canonical permissions", () => {
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      target(),
      permittedInputs,
    )).toMatchObject({ available: true, unavailableReason: null });

    expect(evaluateWorkflowActionPolicy(
      actor(),
      target(),
      permittedInputs,
    )).toEqual({
      available: false,
      reason: "PERMISSION_DENIED",
      unavailableReason: "This action is not available to you.",
    });
  });

  it("requires a current eligibility evaluation only on its own task", () => {
    const eligibleTask = {
      ...target(),
      task: { ...target().task, eligibilityReady: false },
    };
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      eligibleTask,
      permittedInputs,
    )).toMatchObject({
      available: false,
      reason: "INVALID_STATE",
    });

    eligibleTask.task.eligibilityReady = true;
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      eligibleTask,
      permittedInputs,
    ).available).toBe(true);
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      target(),
      permittedInputs,
    ).available).toBe(true);
  });

  it("blocks a stage decision until contributing tasks are complete", () => {
    const waitingTask = {
      ...target(),
      task: { ...target().task, prerequisitesComplete: false },
    };

    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      waitingTask,
      permittedInputs,
    )).toEqual({
      available: false,
      reason: "INVALID_STATE",
      unavailableReason:
        "Complete all contributing tasks before making the stage decision.",
    });

    waitingTask.task.prerequisitesComplete = true;
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      waitingTask,
      permittedInputs,
    ).available).toBe(true);
  });

  it("permits an assigned pending task without a claim step", () => {
    const pendingTask = {
      ...target(),
      task: { ...target().task, status: "PENDING" },
    };
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      pendingTask,
      permittedInputs,
    ).available).toBe(true);

    pendingTask.task.assignedToActor = false;
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      pendingTask,
      permittedInputs,
    ).reason).toBe("CONTEXT_MISMATCH");
  });

  it("blocks held work except for the configured Resume action", () => {
    const held = {
      ...target(),
      stageStatus: "BLOCKED",
      task: { ...target().task, activeHold: true },
    };
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      held,
      permittedInputs,
    )).toMatchObject({ available: false, reason: "INVALID_STATE" });

    const resume = {
      ...held,
      action: {
        actionType: "RESUME" as const,
        enabled: true,
      },
    };
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedProcess),
      resume,
      permittedInputs,
    )).toMatchObject({ available: true, reason: null });
  });

  it("blocks source work while a blocking referral is active", () => {
    const referred = {
      ...target(),
      task: { ...target().task, activeReferral: true },
    };
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      referred,
      permittedInputs,
    )).toMatchObject({ available: false, reason: "INVALID_STATE" });
  });

  it("denies assignment mismatches without exposing policy details", () => {
    expect(evaluateWorkflowActionPolicy(
      actor(permissionCodes.workflowTaskAssignedDecide),
      target(false),
      permittedInputs,
    )).toEqual({
      available: false,
      reason: "CONTEXT_MISMATCH",
      unavailableReason: "This action is not available to you.",
    });
  });

  it("uses ordered action and transition conditions for availability", () => {
    const result = evaluateWorkflowActionConditions(
      { ...action, condition: condition("SUBMITTED") },
      [
        { condition: condition("DRAFT"), id: "transition-draft" },
        { condition: condition("SUBMITTED"), id: "transition-submitted" },
      ],
      {
        application: { status: "SUBMITTED" },
        eligibility: {},
        fundingCall: {},
        stages: [],
      },
    );

    expect(result).toMatchObject({
      available: true,
      selectedTransitionId: "transition-submitted",
    });
    expect(result.transitionEvaluations).toHaveLength(2);
  });

  it("fails closed when action conditions are not met", () => {
    const result = evaluateWorkflowActionConditions(
      { ...action, condition: condition("SUBMITTED") },
      [],
      {
        application: { status: "DRAFT" },
        eligibility: {},
        fundingCall: {},
        stages: [],
      },
    );

    expect(result.available).toBe(false);
    expect(result.selectedTransitionId).toBeNull();
  });
});
