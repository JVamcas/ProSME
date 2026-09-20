import { describe, expect, it } from "vitest";

import {
  createFormRuntimeBinding,
  exposeFormRuntimeContext,
} from "@/modules/forms/engine/FormRuntimeContext";
import type { WorkflowTaskRuntimeContextSource } from "@/modules/workflows/domain/WorkflowRuntimeContext";
import { buildWorkflowRuntimeContext } from "@/modules/workflows/engine/WorkflowRuntimeContext";

const selectedPaths = [
  "application.client_defined_metric",
  "fundingCall.maximum_amount",
  "workflow.version_number",
  "stage.name",
  "task.status",
  "stage.screening.eligibility_result",
];
const selectedFields = selectedPaths.map((key) => ({
  key,
  label: key,
  type: key.endsWith("amount") || key.endsWith("metric")
    ? "NUMBER" as const
    : "TEXT" as const,
}));

const source: WorkflowTaskRuntimeContextSource = {
  application: {
    business: {},
    declarations: {},
    financial: {},
    fundingOpportunityId: 42,
    id: "10000000-0000-4000-8000-000000000001",
    project: {
      clientDefinedMetric: 73,
      internalNote: "Not selected",
    },
    reference: "SMEF-2026-000001",
    sectionCompletion: {},
    status: "submitted",
  },
  binding: {
    contextFields: selectedFields,
    formVersionId: "20000000-0000-4000-8000-000000000001",
  },
  fundingCallTitle: "Growth Fund",
  priorStageValues: [{
    result: {},
    stageKey: "SCREENING",
    values: { ELIGIBILITY_RESULT: "ELIGIBLE" },
  }],
  stage: { name: "Finance review" },
  task: {
    definitionId: "30000000-0000-4000-8000-000000000001",
    id: "30000000-0000-4000-8000-000000000002",
    key: "FINANCE_FORM",
    status: "IN_PROGRESS",
  },
  workflow: { versionNumber: 3 },
};

describe("workflow runtime context", () => {
  it("exposes only selected application, Funding Call and workflow values", () => {
    const binding = createFormRuntimeBinding({
      context: {
        exposedPaths: selectedPaths,
        validationReferences: [],
        visibilityReferences: [],
      },
      formVersion: {
        id: source.binding.formVersionId,
        status: "PUBLISHED",
      },
      host: {
        referenceId: String(source.task.definitionId),
        type: "WORKFLOW_TASK_DEFINITION",
      },
      key: String(source.task.key),
      principal: { type: "ASSIGNED_REVIEWER" },
    });
    const available = buildWorkflowRuntimeContext(source, {
      id: 42,
      maximumAmount: 1_000_000,
      title: "Growth Fund",
    });

    const context = exposeFormRuntimeContext(binding, available);

    expect(context).toEqual({
      "application.client_defined_metric": 73,
      "fundingCall.maximum_amount": 1_000_000,
      "stage.name": "Finance review",
      "stage.screening.eligibility_result": "ELIGIBLE",
      "task.status": "IN_PROGRESS",
      "workflow.version_number": 3,
    });
    expect(context).not.toHaveProperty("application.internal_note");
    expect(Object.isFrozen(context)).toBe(true);
  });
});
