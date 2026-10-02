import { describe, expect, it } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { evaluateWorkflowActionPolicy } from "@/modules/workflows/application/runtime/WorkflowActionPolicy";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const actor = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedDecide]),
  status: "active",
} as unknown as AuthenticatedUser;
const target = {
  action: {
    actionType: "APPROVE_ADVANCE" as const,
    configuration: {},
    displayOrder: 1,
    enabled: true,
    label: "Advance",
    reasonCodeRequired: false,
    stableKey: "ADVANCE",
  },
  stageStatus: "ACTIVE",
  task: {
    assignedToActor: true,
    permissions: defaultWorkflowElementPermissions,
    status: "IN_PROGRESS",
  },
  workflowStatus: "ACTIVE",
};
const checks = { conditionsPass: true, configurationValid: true, targetsValid: true };

describe("approval eligibility policy shared by availability and execution", () => {
  it("blocks advance when the workflow has a failed, missing or stale screening result", () => {
    expect(evaluateWorkflowActionPolicy(actor, {
      ...target, approvalEligibilityReady: false,
    }, checks)).toMatchObject({ available: false, reason: "INVALID_STATE" });
  });

  it("permits advance with current evidence and no hard failures", () => {
    expect(evaluateWorkflowActionPolicy(actor, {
      ...target, approvalEligibilityReady: true,
    }, checks).available).toBe(true);
  });

  it("allows rejection when screening cannot support approval", () => {
    expect(evaluateWorkflowActionPolicy(actor, {
      ...target,
      action: { ...target.action, actionType: "REJECT" },
      approvalEligibilityReady: false,
    }, checks).available).toBe(true);
  });
});
