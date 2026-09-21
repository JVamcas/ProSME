import { describe, expect, it } from "vitest";

import { resolveWorkflowDataPath } from "@/modules/conditions/engine/WorkflowDataResolver";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowConditionFields } from "@/modules/workflows/engine/WorkflowConditionFields";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const screeningFormVersionId = "10000000-0000-4000-8000-000000000001";
const reviewFormVersionId = "10000000-0000-4000-8000-000000000002";

function stage(
  stableKey: string,
  displayOrder: number,
  formVersionId: string,
): WorkflowStageInput {
  return {
    actions: [],
    checklistItems: [],
    documentRequirements: [],
    commentFields: [],
    scoring: null,
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
      permissions: defaultWorkflowElementPermissions,
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

function form(key: string) {
  return [{
      columnSpan: 1,
      key,
      label: key.replaceAll("_", " "),
      order: 1,
      required: true,
      sectionId: "20000000-0000-4000-8000-000000000001",
      type: "CURRENCY",
    }] as const;
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
      [screeningFormVersionId, form("CUSTOM_RESULT")],
      [reviewFormVersionId, form("RECOMMENDED_AMOUNT")],
    ]);

    const entryFields = workflowConditionFields(graph, forms, review, false);
    const completionFields = workflowConditionFields(graph, forms, review, true);

    expect(entryFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "application.client_defined_metric",
        type: "NUMBER",
      }),
      expect.objectContaining({
        key: "stage.screening.custom_result",
        type: "NUMBER",
      }),
    ]));
    expect(entryFields).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "stage.finance_review.recommended_amount",
      }),
    ]));
    expect(completionFields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "stage.finance_review.recommended_amount",
        type: "NUMBER",
      }),
    ]));
    expect(resolveWorkflowDataPath(
      "stage.finance_review.recommended_amount",
      {
        application: {},
        eligibility: {},
        fundingCall: {},
        stages: [{
          stableKey: "FINANCE_REVIEW",
          values: { recommended_amount: 125_000 },
        }],
      },
    )).toBe(125_000);
  });

  it("exposes configured checklist, document and scoring result paths", () => {
    const review = stage("TECHNICAL_REVIEW", 1, reviewFormVersionId);
    const taskTemplate = review.tasks[0];
    review.tasks = [
      {
        ...taskTemplate,
        config: {
          items: [{ code: "DOCUMENTS_VALID", label: "Documents valid" }],
        },
        stableKey: "CHECK_DOCUMENTS",
        type: "CHECKLIST",
      },
      {
        ...taskTemplate,
        config: {
          categories: [{ code: "TAX_STATUS", label: "Tax status" }],
          outcomes: [{ code: "VERIFIED", label: "Verified" }],
        },
        stableKey: "DOCUMENT_REVIEW",
        type: "DOCUMENT_REVIEW",
      },
      {
        ...taskTemplate,
        config: {
          criteria: [{
            code: "DELIVERY",
            commentRequired: true,
            label: "Delivery capacity",
            maximumScore: 10,
            weight: 100,
          }],
        },
        stableKey: "SCORING",
        type: "ASSESSMENT_FORM",
      },
    ];

    const fields = workflowConditionFields(
      { stages: [review], transitions: [] },
      new Map(),
      review,
      true,
    );

    expect(fields.map((field) => field.key)).toEqual(expect.arrayContaining([
      "stage.technical_review.delivery",
      "stage.technical_review.delivery_comment",
      "stage.technical_review.documents_valid",
      "stage.technical_review.tax_status",
      "stage.technical_review.weighted_total",
    ]));
  });
});
