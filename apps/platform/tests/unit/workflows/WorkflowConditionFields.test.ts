import { describe, expect, it } from "vitest";

import { resolveWorkflowDataPath } from "@/modules/conditions/engine/WorkflowDataResolver";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowConditionFields } from "@/modules/workflows/engine/WorkflowConditionFields";

const screeningFormVersionId = "10000000-0000-4000-8000-000000000001";
const reviewFormVersionId = "10000000-0000-4000-8000-000000000002";

function stage(
  stableKey: string,
  displayOrder: number,
  formVersionId: string,
): WorkflowStageInput {
  return {
    actions: [],
    coiGated: false,
    description: `${stableKey} stage`,
    displayOrder,
    enabled: true,
    entryCondition: null,
    exitCondition: null,
    initial: displayOrder === 1,
    name: stableKey.replaceAll("_", " "),
    optional: false,
    publicStatusMapping: {
      description: "Application under review",
      label: "Under review",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    slaHours: null,
    stableKey,
    tasks: [{
      actionKeys: [],
      assignmentMode: "ROLE",
      coiRequired: false,
      config: {},
      description: "Complete the form",
      displayOrder: 1,
      formBinding: {
        contextFields: [{
          key: "application.client_defined_metric",
          label: "Client-defined metric",
          type: "NUMBER",
        }],
        formVersionId,
      },
      name: `${stableKey} form`,
      quorum: false,
      required: true,
      requiredCompletionCount: 1,
      reviewerCount: 1,
      stableKey: `${stableKey}_FORM`,
      type: "STRUCTURED_FORM",
    }],
  };
}

function form(versionId: string, key: string): FormRuntimeSchema {
  return {
    fields: [{
      columnSpan: 1,
      key,
      label: key.replaceAll("_", " "),
      order: 1,
      required: true,
      sectionId: "20000000-0000-4000-8000-000000000001",
      type: "CURRENCY",
    }],
    instructions: null,
    sections: [],
    submitLabel: "Submit",
    versionId,
    versionNumber: 1,
  };
}

describe("workflow condition fields", () => {
  it("generates typed fields from bindings without hardcoded field names", () => {
    const screening = stage("SCREENING", 1, screeningFormVersionId);
    const review = stage("FINANCE_REVIEW", 2, reviewFormVersionId);
    const graph: WorkflowGraphInput = {
      stages: [screening, review],
      transitions: [],
    };
    const forms = new Map([
      [screeningFormVersionId, form(screeningFormVersionId, "CUSTOM_RESULT")],
      [reviewFormVersionId, form(reviewFormVersionId, "RECOMMENDED_AMOUNT")],
    ]);

    const entryFields = workflowConditionFields(graph, forms, review, false);
    const completionFields = workflowConditionFields(graph, forms, review, true);

    expect(entryFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "application.client_defined_metric",
        type: "NUMBER",
      }),
      expect.objectContaining({
        key: "stage.screening.CUSTOM_RESULT",
        type: "NUMBER",
      }),
    ]));
    expect(entryFields).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "stage.finance_review.RECOMMENDED_AMOUNT",
      }),
    ]));
    expect(completionFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "stage.finance_review.RECOMMENDED_AMOUNT",
        type: "NUMBER",
      }),
    ]));
    expect(resolveWorkflowDataPath(
      "stage.finance_review.RECOMMENDED_AMOUNT",
      {
        application: {},
        fundingCall: {},
        stages: [{
          stableKey: "FINANCE_REVIEW",
          values: { RECOMMENDED_AMOUNT: 125_000 },
        }],
      },
    )).toBe(125_000);
  });
});
