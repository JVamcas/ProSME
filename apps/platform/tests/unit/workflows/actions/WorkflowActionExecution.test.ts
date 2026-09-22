import { describe, expect, it } from "vitest";

import {
  validateActionInputAgainstConfiguration,
  workflowActionExecutionRequestSchema,
} from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

function action(
  value: Partial<WorkflowActionDefinition>,
): WorkflowActionDefinition {
  return {
    actionType: "REJECT",
    configuration: { reasonCodes: ["INELIGIBLE"] },
    displayOrder: 1,
    enabled: true,
    label: "Reject",
    reasonCodeRequired: true,
    stableKey: "REJECT",
    ...value,
  } as WorkflowActionDefinition;
}

describe("workflow action execution contract", () => {
  it("requires a discriminated action payload and strict transport fields", () => {
    expect(workflowActionExecutionRequestSchema.safeParse({
      expectedRuntimeVersion: 3,
      input: {
        actionType: "WITHDRAW",
        confirmed: true,
      },
      sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
    }).success).toBe(true);

    expect(workflowActionExecutionRequestSchema.safeParse({
      expectedRuntimeVersion: 3,
      input: {
        actionType: "WITHDRAW",
        confirmed: false,
      },
      sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
    }).success).toBe(false);
  });

  it("rejects payload types and reason codes outside published configuration", () => {
    const configured = action({});
    expect(validateActionInputAgainstConfiguration(
      configured,
      { actionType: "APPROVE_ADVANCE" },
      "SCREENING",
    )).toContain("does not match");
    expect(validateActionInputAgainstConfiguration(
      configured,
      { actionType: "REJECT", reasonCode: "OTHER" },
      "SCREENING",
    )).toContain("not configured");
  });

  it("prevents information requests from broadening editable fields", () => {
    const configured = action({
      actionType: "REQUEST_INFORMATION",
      configuration: {
        deadlineDays: 10,
        editableFieldKeys: ["application.turnover"],
        expiryAction: "RETURN",
        reminderDayOffsets: [3],
      },
      reasonCodeRequired: false,
    });
    expect(validateActionInputAgainstConfiguration(
      configured,
      {
        actionType: "REQUEST_INFORMATION",
        editableFieldKeys: ["application.bank_account"],
        instructions: "Clarify this value.",
        requestedDocumentCategories: [],
      },
      "SCREENING",
    )).toContain("not configured");
  });
});
