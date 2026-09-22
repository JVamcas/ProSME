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
