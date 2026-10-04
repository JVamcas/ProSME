import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  workflowTaskChecklistItems,
  workflowTaskPreviewActions,
  workflowTaskPreviewFormName,
  workflowTaskPreviewPanelClass,
} from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { WorkflowTaskPreviewSummary } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";
import { taskDisplayMode } from "@/modules/workflows/WorkflowTaskRegistry";

const previewStatus = {
  checklist: "Required",
  comments: "Required",
  documents: "Required",
  form: "Required",
  scoring: "Required",
};

describe("workflow task reviewer preview", () => {
  it("shows every enabled action bound to the selected task", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    const task = stage.tasks[0];
    stage.actions.push({
      actionType: "REJECT",
      configuration: {
        outcome: { type: "TRANSITION" },
        reversibleActionKey: null,
      },
      displayOrder: 2,
      enabled: true,
      label: "Reject",
      reasonRequired: false,
      stableKey: "REJECT",
    });
    task.actionKeys.push("REJECT");

    expect(workflowTaskPreviewActions(stage, task)).toMatchObject([
      {
        actionType: "APPROVE_ADVANCE",
        available: false,
        key: "ADVANCE",
        label: "Advance",
      },
      {
        actionType: "REJECT",
        available: false,
        key: "REJECT",
        label: "Reject",
      },
    ]);
  });

  it("selects only checklist items assigned to the previewed task", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    const task = stage.tasks[0];
    stage.checklistItems = [
      {
        taskStableKey: task.stableKey,
        key: "THIS_TASK",
        text: "This task",
        mandatory: true,
        responseType: "YES_NO",
        evidenceRequirement: "NONE",
        notes: "",
        displayOrder: 1,
      },
      {
        taskStableKey: "OTHER_TASK",
        key: "OTHER_TASK",
        text: "Other task",
        mandatory: true,
        responseType: "YES_NO",
        evidenceRequirement: "NONE",
        notes: "",
        displayOrder: 2,
      },
    ];

    const items = workflowTaskChecklistItems(stage, task);
    expect(items.map((item) => item.key)).toEqual(["THIS_TASK"]);
    const markup = renderToStaticMarkup(
      createElement(WorkflowTaskWorkSections, {
        checklistItems: items.map((item) => ({
          code: item.key,
          label: item.text,
          required: item.mandatory,
        })),
        commentFields: [],
        disabled: true,
        displayMode: "SECTIONS",
        documentRequirements: [],
        scoring: null,
        status: previewStatus,
      }),
    );
    expect(markup).toContain("This task");
    expect(markup).not.toContain("Other task");
  });

  it("keeps a fixed outer width while preview content loads or changes", () => {
    expect(workflowTaskPreviewPanelClass()).toBe("w-full max-w-6xl");
  });

  it("uses step progress by default when no task layout is stored", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkflowTaskWorkSections, {
        checklistItems: [
          {
            code: "VERIFY",
            label: "Verify application",
            required: true,
          },
        ],
        commentFields: [],
        disabled: true,
        displayMode: taskDisplayMode({}),
        documentRequirements: [],
        scoring: null,
        status: previewStatus,
      }),
    );
    expect(taskDisplayMode({})).toBe("STEP_PROGRESS");
    expect(markup).toContain('aria-label="Task progress"');
    expect(markup).not.toContain("<details");
  });

  it("uses the bound form name in the preview", () => {
    expect(
      workflowTaskPreviewFormName(
        [
          {
            definitionId: "10000000-0000-4000-8000-000000000001",
            formName: "Finance application",
            purpose: "FUNDING_APPLICATION",
            versionId: "20000000-0000-4000-8000-000000000001",
            versionNumber: 2,
          },
        ],
        "20000000-0000-4000-8000-000000000001",
      ),
    ).toBe("Finance application");
  });

  it("renders configured reviewer work as collapsible sections", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.checklistItems = [
      {
        taskStableKey: stage.tasks[0].stableKey,
        key: "VERIFY_AMOUNT",
        text: "Verify the requested amount",
        mandatory: true,
        responseType: "YES_NO",
        evidenceRequirement: "REQUIRED",
        notes: "Compare the form and supporting documents.",
        displayOrder: 1,
      },
    ];
    stage.documentRequirements = [
      {
        taskStableKey: stage.tasks[0].stableKey,
        stableKey: "FINANCIAL_STATEMENTS",
        name: "Financial statements",
        mandatory: true,
        acceptedFileTypes: ["PDF"],
        maximumSizeMb: 10,
        expiryDays: null,
        requestOnStageActivation: false,
        uploader: "APPLICANT",
        verifier: "ASSIGNED_REVIEWER",
        templateReference: "",
      },
    ];
    stage.scoring = [
      {
        aggregation: "WEIGHTED_AVERAGE",
        taskStableKey: stage.tasks[0].stableKey,
        criteria: [
          {
            stableKey: "BUSINESS_VIABILITY",
            criterion: "Business viability",
            description: "Assess the business case.",
            weight: 100,
            scaleMinimum: 0,
            scaleMaximum: 10,
            mandatoryComment: true,
          },
        ],
      },
    ];
    const markup = [
      renderToStaticMarkup(
        createElement(WorkflowTaskPreviewSummary, {
          requiredCount: 3,
          sectionCount: 3,
        }),
      ),
      renderToStaticMarkup(
        createElement(WorkflowTaskWorkSections, {
          checklistItems: stage.checklistItems.map((item) => ({
            code: item.key,
            label: item.text,
            required: item.mandatory,
          })),
          commentFields: [],
          disabled: true,
          displayMode: "SECTIONS",
          documentRequirements: stage.documentRequirements.map(
            (requirement) => ({
              ...requirement,
              requestStatus: "MISSING" as const,
            }),
          ),
          scoring: stage.scoring[0],
          status: previewStatus,
        }),
      ),
    ].join("");

    expect(markup).toContain("0 of 3 required items complete");
    expect(markup).toContain("Verify the requested amount");
    const otherTaskChecklist = renderToStaticMarkup(
      createElement(WorkflowTaskWorkSections, {
        checklistItems: [],
        commentFields: [],
        disabled: true,
        displayMode: "SECTIONS",
        documentRequirements: [],
        scoring: null,
        status: previewStatus,
      }),
    );
    expect(otherTaskChecklist).not.toContain("Verify the requested amount");
    expect(markup).toContain("Financial statements");
    expect(markup).toContain("Business viability");
    expect(markup).not.toContain("Comments & recommendations");
    expect(markup.match(/<details/g)).toHaveLength(3);
    expect(markup).not.toContain('open=""');
    expect(markup).toContain('disabled=""');
    const otherTaskMarkup = renderToStaticMarkup(
      createElement(WorkflowTaskWorkSections, {
        checklistItems: [],
        commentFields: [],
        disabled: true,
        displayMode: "SECTIONS",
        documentRequirements: [],
        scoring: null,
        status: previewStatus,
      }),
    );
    expect(otherTaskMarkup).not.toContain("Financial statements");
  });
});
