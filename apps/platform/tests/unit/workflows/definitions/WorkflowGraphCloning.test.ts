import { describe, expect, it } from "vitest";

import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";

describe("workflow graph cloning", () => {
  it("clones Phase 1.9 configuration into independent records", () => {
    const source = structuredClone(referenceWorkflow);
    source.stages[0].id = "41111111-1111-4111-8111-111111111111";
    source.stages[0].actions[0].id =
      "42222222-2222-4222-8222-222222222222";
    source.stages[0].tasks[0].id =
      "43333333-3333-4333-8333-333333333333";
    source.stages[0].checklistItems = [{
      taskStableKey: source.stages[0].tasks[0].stableKey,
      id: "47777777-7777-4777-8777-777777777777",
      key: "OWNERSHIP_CONFIRMED",
      text: "Confirm ownership.",
      mandatory: true,
      responseType: "YES_NO",
      evidenceRequirement: "REQUIRED",
      notes: "Use current ownership records.",
      displayOrder: 1,
    }];
    source.stages[0].documentRequirements = [{
      taskStableKey: source.stages[0].tasks[0].stableKey,
      id: "48888888-8888-4888-8888-888888888888",
      name: "Tax clearance certificate",
      mandatory: true,
      acceptedFileTypes: ["PDF"],
      maximumSizeMb: 10,
      expiryDays: 180,
      uploader: "APPLICANT",
      verifier: "ASSIGNED_REVIEWER",
      templateReference: "TAX_CLEARANCE_TEMPLATE",
    }];
    source.stages[0].scoring = {
      aggregation: "WEIGHTED_AVERAGE",
      taskStableKey: source.stages[0].tasks[0].stableKey,
      criteria: [{
        id: "49999999-9999-4999-8999-999999999999",
        criterion: "Business viability",
        description: "Assess viability.",
        weight: 100,
        scaleMinimum: 0,
        scaleMaximum: 10,
        mandatoryComment: true,
      }],
    };
    source.stages[0].tasks[0].roleId =
      "44444444-4444-4444-8444-444444444444";
    source.stages[0].tasks[0].formBinding = {
      contextFields: [{
        key: "application.requested_amount",
        label: "Requested amount",
        type: "NUMBER",
      }],
      formVersionId: "45555555-5555-4555-8555-555555555555",
    };
    source.stages[0].actions[0] = {
      ...source.stages[0].actions[0],
      actionType: "REJECT",
      configuration: {
        commentRequired: true,
        outcome: { type: "TRANSITION" },
        reasonCodes: ["INELIGIBLE"],
        reversibleActionKey: null,
      },
    };
    source.transitions[0].id = "46666666-6666-4666-8666-666666666666";
    source.stages[0].entryCondition = {
      children: [{
        id: "entry-condition",
        kind: "CONDITION",
        leftOperand: {
          key: "application.user_defined_answer",
          kind: "FIELD",
        },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: true },
      }],
      combinator: "AND",
      id: "entry-group",
      kind: "GROUP",
    };
    source.stages[0].exitCondition = {
      children: [{
        id: "exit-condition",
        kind: "CONDITION",
        leftOperand: {
          key: "stage.pre_screening.USER_DEFINED_RESULT",
          kind: "FIELD",
        },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: "COMPLETE" },
      }],
      combinator: "AND",
      id: "exit-group",
      kind: "GROUP",
    };
    source.transitions[0].condition = {
      children: [{
        id: "transition-condition",
        kind: "CONDITION",
        leftOperand: {
          key: "stage.pre_screening.USER_DEFINED_RESULT",
          kind: "FIELD",
        },
        operator: basicOperators.NOT_EQUALS,
        rightOperand: { kind: "CONSTANT", value: "BLOCKED" },
      }],
      combinator: "AND",
      id: "transition-group",
      kind: "GROUP",
    };

    const clone = cloneWorkflowGraph(source);

    expect(clone.stages[0]).toMatchObject({
      entryCondition: source.stages[0].entryCondition,
      exitCondition: source.stages[0].exitCondition,
      id: undefined,
      publicStatusMapping: source.stages[0].publicStatusMapping,
    });
    expect(clone.stages[0].tasks[0]).toMatchObject({
      id: undefined,
      roleId: source.stages[0].tasks[0].roleId,
      assignmentMode: source.stages[0].tasks[0].assignmentMode,
      formBinding: source.stages[0].tasks[0].formBinding,
    });
    expect(clone.stages[0].actions[0]).toEqual({
      ...source.stages[0].actions[0],
      id: undefined,
    });
    expect(clone.stages[0].checklistItems[0]).toEqual({
      ...source.stages[0].checklistItems[0],
      id: undefined,
    });
    expect(clone.stages[0].documentRequirements[0]).toEqual({
      ...source.stages[0].documentRequirements[0],
      id: undefined,
    });
    expect(clone.stages[0].scoring?.criteria[0]).toEqual({
      ...source.stages[0].scoring!.criteria[0],
      id: undefined,
    });
    expect(clone.transitions[0]).toEqual({
      ...source.transitions[0],
      id: undefined,
    });
    expect(clone.stages[0].entryCondition).not.toBe(
      source.stages[0].entryCondition,
    );
    expect(clone.stages[0].exitCondition).not.toBe(
      source.stages[0].exitCondition,
    );
    expect(clone.transitions[0].condition).not.toBe(
      source.transitions[0].condition,
    );

    clone.stages[0].publicStatusMapping.label = "Changed clone";
    const clonedAction = clone.stages[0].actions[0];
    const sourceAction = source.stages[0].actions[0];
    if (clonedAction.actionType !== "REJECT") throw new Error("Clone failed.");
    if (sourceAction.actionType !== "REJECT") throw new Error("Setup failed.");
    clonedAction.configuration.reasonCodes.push("DUPLICATE");
    clone.stages[0].entryCondition!.children.length = 0;
    expect(source.stages[0].publicStatusMapping.label).not.toBe("Changed clone");
    expect(sourceAction.configuration.reasonCodes).toEqual(["INELIGIBLE"]);
    expect(source.stages[0].entryCondition?.children).toHaveLength(1);
    expect(clone).not.toBe(source);
  });
});
