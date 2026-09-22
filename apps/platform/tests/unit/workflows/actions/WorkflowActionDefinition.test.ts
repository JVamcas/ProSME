import { describe, expect, it } from "vitest";

import { workflowActionDefinitionSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";

const action = {
  stableKey: "APPROVE_REVIEW",
  label: "Approve review",
  actionType: "APPROVE_ADVANCE" as const,
  enabled: true,
  reasonCodeRequired: false,
  displayOrder: 1,
  configuration: {},
};

describe("WorkflowActionDefinition", () => {
  it("accepts every common Phase 1.5 field", () => {
    expect(workflowActionDefinitionSchema.parse(action)).toEqual(action);
  });

  it("supports every standard action type", () => {
    const configurations = {
      APPROVE_ADVANCE: {},
      REJECT: {
        commentRequired: true,
        outcome: { type: "TRANSITION" },
        reasonCodes: ["INELIGIBLE"],
        reversibleActionKey: null,
      },
      REQUEST_INFORMATION: {
        deadlineDays: 10,
        editableFieldKeys: ["BUSINESS_PLAN"],
        reminderDayOffsets: [3, 7],
        expiryAction: "ESCALATE",
      },
      RETURN: {
        dataHandling: "RETAIN",
        reasonRequired: true,
      },
      REFER: {
        returnToReferrer: true,
      },
      ESCALATE: {
        targetType: "ROLE",
        targetId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
        trigger: "SLA_BREACH",
      },
      PUT_ON_HOLD: {
        reasonCodes: ["EXTERNAL_REVIEW"],
        reviewDateRequired: true,
      },
      WITHDRAW: {
        allowedStageKeys: ["PRE_SCREENING"],
        resubmissionRule: "NEW_APPLICATION",
      },
      DEFER: { targetType: "DATE", targetDate: "2027-01-15" },
    } as const;
    for (const actionType of workflowActionTypes) {
      const parsed = workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType,
        configuration: configurations[actionType],
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) continue;
      expect(
        toWorkflowActionDefinition(
          workflowActionFormDefaults(parsed.data, 1),
        ),
      ).toEqual(parsed.data);
    }
  });

  it("rejects arbitrary action types and invalid stable keys", () => {
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType: "CUSTOM_ACTION",
      }).success,
    ).toBe(false);
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        stableKey: "approve-review",
      }).success,
    ).toBe(false);
  });

  it("rejects configuration belonging to a different action type", () => {
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType: "REJECT",
        configuration: {
          returnToReferrer: true,
        },
      }).success,
    ).toBe(false);
  });

  it("enforces RFI reminder and deferral contracts", () => {
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType: "REQUEST_INFORMATION",
        configuration: {
          deadlineDays: 5,
          editableFieldKeys: ["BUSINESS_PLAN"],
          reminderDayOffsets: [5],
          expiryAction: "RETURN",
        },
      }).success,
    ).toBe(false);
    expect(
      workflowActionDefinitionSchema.safeParse({
        ...action,
        actionType: "DEFER",
        configuration: {
          targetType: "FUNDING_CALL",
          targetDate: "2027-01-15",
        },
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate keys and display orders within one stage", () => {
    const graph = structuredClone(referenceWorkflow);
    graph.stages[0].actions = [action, { ...action, label: "Another label" }];
    const codes = validateWorkflowGraph(graph).errors.map((item) => item.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ACTION_KEY",
        "DUPLICATE_ACTION_ORDER",
      ]),
    );
  });

  it("round-trips approve actions without duplicating transition routing", () => {
    const values = {
      ...workflowActionFormDefaults(undefined, 1),
      stableKey: "ADVANCE",
      label: "Advance",
    };
    expect(
      toWorkflowActionDefinition(values).configuration,
    ).toEqual({});
  });
});
