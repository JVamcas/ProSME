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
    configuration: {
      outcome: { type: "TRANSITION" },
      reversibleActionKey: null,
    },
    displayOrder: 1,
    enabled: true,
    label: "Reject",
    reasonCodeRequired: false,
    stableKey: "REJECT",
    ...value,
  } as WorkflowActionDefinition;
}

describe("workflow action execution contract", () => {
  it("requires a discriminated action payload and strict transport fields", () => {
    expect(
      workflowActionExecutionRequestSchema.safeParse({
        expectedRuntimeVersion: 3,
        input: {
          actionType: "WITHDRAW",
          confirmed: true,
        },
        sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);

    expect(
      workflowActionExecutionRequestSchema.safeParse({
        expectedRuntimeVersion: 3,
        input: {
          actionType: "WITHDRAW",
          confirmed: false,
        },
        sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched payload types and requires a free-text rejection reason", () => {
    const configured = action({});
    expect(
      validateActionInputAgainstConfiguration(
        configured,
        { actionType: "APPROVE_ADVANCE" },
        "SCREENING",
      ),
    ).toContain("does not match");
    expect(
      workflowActionExecutionRequestSchema.safeParse({
        expectedRuntimeVersion: 3,
        input: { actionType: "REJECT" },
        sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
    expect(
      validateActionInputAgainstConfiguration(
        configured,
        { actionType: "REJECT", comment: "The application is ineligible." },
        "SCREENING",
      ),
    ).toBeNull();
  });

  it("prevents information requests from broadening editable fields", () => {
    const configured = action({
      actionType: "REQUEST_INFORMATION",
      configuration: {
        continuation: "RESUME_SOURCE_TASK",
        deadlineDays: 10,
        editableFieldPaths: ["application.turnover"],
        expiryAction: "RETURN",
        participantScope: "APPLICATION_OWNER_AND_REQUESTER",
        recipientScope: "APPLICATION_OWNER",
        reminderDayOffsets: [3],
      },
      reasonCodeRequired: false,
    });
    expect(
      validateActionInputAgainstConfiguration(
        configured,
        {
          actionType: "REQUEST_INFORMATION",
          editableFieldPaths: ["application.bank_account"],
          instructions: "Clarify this value.",
          requestedDocumentRequirementIds: [],
        },
        "SCREENING",
      ),
    ).toContain("not configured");
    expect(
      validateActionInputAgainstConfiguration(
        configured,
        {
          actionType: "REQUEST_INFORMATION",
          editableFieldPaths: ["application.turnover"],
          instructions: "Provide supporting evidence.",
          requestedDocumentRequirementIds: [
            "10000000-0000-4000-8000-000000000001",
          ],
        },
        "SCREENING",
      ),
    ).toBeNull();
  });

  it("requires an information request to ask for details, documents, or both", () => {
    const request = {
      expectedRuntimeVersion: 3,
      input: {
        actionType: "REQUEST_INFORMATION" as const,
        editableFieldPaths: [],
        instructions: "Please provide the missing information.",
        requestedDocumentRequirementIds: [],
      },
      sourceStageInstanceId: "10000000-0000-4000-8000-000000000001",
    };

    expect(workflowActionExecutionRequestSchema.safeParse(request).success)
      .toBe(false);
    expect(
      workflowActionExecutionRequestSchema.safeParse({
        ...request,
        input: {
          ...request.input,
          editableFieldPaths: ["CLARIFICATION_RESPONSE"],
        },
      }).success,
    ).toBe(true);
    expect(
      workflowActionExecutionRequestSchema.safeParse({
        ...request,
        input: {
          ...request.input,
          requestedDocumentRequirementIds: [
            "20000000-0000-4000-8000-000000000001",
          ],
        },
      }).success,
    ).toBe(true);
  });
});
