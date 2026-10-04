import { describe, expect, it } from "vitest";
import {
  emptyWorkflowActionInputMetadata,
  type WorkflowActionAvailability,
} from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import { workflowActionInputSchema } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import { resolveEscalationConfiguration } from "@/modules/workflows/domain/actions/WorkflowEscalationTarget";
import {
  actionFormDefaults,
  actionFormSchema,
  actionInput,
} from "@/modules/workflows/ui/tasks/WorkflowTaskActionForm";

const roleId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const configuration = {
  blockUntilResolved: true,
  responsibility: "TRANSFER",
  targetType: "ROLE",
  targetId: roleId,
  trigger: "MANUAL",
} as const;

function action(): WorkflowActionAvailability {
  return {
    actionType: "ESCALATE",
    available: true,
    key: "ESCALATE",
    label: "Escalate",
    presentation: { displayOrder: 0, variant: "primary" },
    runtimeVersion: 1,
    unavailableReason: null,
    requiredInput: {
      ...emptyWorkflowActionInputMetadata,
      target: { type: "ROLE", value: roleId },
      reason: { maxLength: 4000, required: true },
      escalationTargets: [
        { id: roleId, label: "Senior reviewer", targetType: "ROLE" },
        { id: userId, label: "Another reviewer", targetType: "USER" },
      ],
    },
  };
}

describe("runtime escalation destinations", () => {
  it("prefills eligible configured roles and users", () => {
    const available = action();
    expect(actionFormDefaults(available)).toMatchObject({
      escalationTargetType: "ROLE",
      escalationTargetId: roleId,
    });
    available.requiredInput.target = { type: "USER", value: userId };
    expect(actionFormDefaults(available)).toMatchObject({
      escalationTargetType: "USER",
      escalationTargetId: userId,
    });
  });

  it("allows choosing a user when the configured role is no longer eligible", () => {
    const available = action();
    available.requiredInput.escalationTargets = [
      { id: userId, label: "Another reviewer", targetType: "USER" },
    ];
    const defaults = actionFormDefaults(available);
    expect(defaults.escalationTargetId).toBe("");
    expect(actionFormSchema(available).safeParse(defaults).success).toBe(false);
    const values = actionFormSchema(available).parse({
      ...defaults,
      escalationTargetType: "USER",
      escalationTargetId: userId,
      reason: "Senior review needed",
    });
    expect(actionInput(available, values)).toEqual({
      actionType: "ESCALATE",
      targetType: "USER",
      targetId: userId,
      reason: "Senior review needed",
    });
  });

  it("rejects unknown destinations and a user ID presented as a role", () => {
    const available = action();
    const values = {
      ...actionFormDefaults(available),
      reason: "Review needed",
    };
    expect(
      actionFormSchema(available).safeParse({
        ...values,
        escalationTargetId: userId,
      }).success,
    ).toBe(false);
    expect(
      actionFormSchema(available).safeParse({
        ...values,
        escalationTargetId: "30000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("requires both runtime fields together while accepting the configured fallback", () => {
    expect(
      workflowActionInputSchema.safeParse({ actionType: "ESCALATE" }).success,
    ).toBe(true);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "ESCALATE",
        targetType: "USER",
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "ESCALATE",
        targetId: userId,
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "ESCALATE",
        targetType: "USER",
        targetId: userId,
      }).success,
    ).toBe(true);
  });

  it("uses an override for this execution without mutating the workflow default", () => {
    expect(resolveEscalationConfiguration(configuration, {})).toBe(
      configuration,
    );
    expect(
      resolveEscalationConfiguration(configuration, {
        targetType: "USER",
        targetId: userId,
      }),
    ).toMatchObject({ targetType: "USER", targetId: userId });
    expect(configuration).toMatchObject({
      targetType: "ROLE",
      targetId: roleId,
    });
  });
});
