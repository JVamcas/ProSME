import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import {
  workflowTaskPreviewActions,
  workflowTaskPreviewFormName,
  workflowTaskPreviewPanelClass,
} from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import {
  WorkflowChecklistPreview,
  WorkflowCommentsPreview,
  WorkflowDocumentRequirementsPreview,
  WorkflowScoringPreview,
  WorkflowTaskPreviewSection,
  WorkflowTaskPreviewSummary,
} from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";

describe("workflow task reviewer preview", () => {
  it("shows every enabled action bound to the selected task", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    const task = stage.tasks[0];
    stage.actions.push({
      actionType: "REJECT",
      configuration: {
        commentRequired: true,
        outcome: { type: "TRANSITION" },
        reasonCodes: ["INELIGIBLE"],
        reversibleActionKey: null,
      },
      displayOrder: 2,
      enabled: true,
      label: "Reject",
      reasonCodeRequired: true,
      stableKey: "REJECT",
    });
    task.actionKeys.push("REJECT");

    expect(
      workflowTaskPreviewActions(stage, task),
    ).toMatchObject([
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

  it("keeps a fixed outer width while preview content loads or changes", () => {
    expect(workflowTaskPreviewPanelClass()).toBe("w-full max-w-6xl");
  });

  it("uses the bound form name in the preview", () => {
    expect(workflowTaskPreviewFormName([
      {
        definitionId: "10000000-0000-4000-8000-000000000001",
        formName: "Finance application",
        versionId: "20000000-0000-4000-8000-000000000001",
        versionNumber: 2,
      },
    ], "20000000-0000-4000-8000-000000000001"))
      .toBe("Finance application");
  });

  it("renders configured reviewer work as collapsible sections", () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.checklistItems = [{
      key: "VERIFY_AMOUNT",
      text: "Verify the requested amount",
      mandatory: true,
      responseType: "YES_NO",
      evidenceRequirement: "REQUIRED",
      notes: "Compare the form and supporting documents.",
      displayOrder: 1,
    }];
    stage.documentRequirements = [{
      name: "Financial statements",
      mandatory: true,
      acceptedFileTypes: ["PDF"],
      maximumSizeMb: 10,
      expiryDays: null,
      uploader: "APPLICANT",
      verifier: "ASSIGNED_REVIEWER",
      templateReference: "",
    }];
    stage.scoring = {
      aggregation: "WEIGHTED_AVERAGE",
      criteria: [{
        criterion: "Business viability",
        description: "Assess the business case.",
        weight: 100,
        scaleMinimum: 0,
        scaleMaximum: 10,
        threshold: 6,
        mandatoryComment: true,
      }],
    };
    stage.commentFields = [{
      key: "REVIEW_RECOMMENDATION",
      label: "Review recommendation",
      helpText: "Summarise the recommendation.",
      mandatory: true,
      visibility: "INTERNAL_ONLY",
      displayOrder: 1,
    }];

    const markup = [
      renderToStaticMarkup(createElement(WorkflowTaskPreviewSummary, {
        requiredCount: 4,
        sectionCount: 4,
      })),
      renderToStaticMarkup(createElement(
        WorkflowTaskPreviewSection,
        {
          status: "1 required item",
          title: "Checklist",
        },
        createElement(WorkflowChecklistPreview, { stage }),
      )),
      renderToStaticMarkup(createElement(
        WorkflowTaskPreviewSection,
        {
          status: "1 required field",
          title: "Comments & recommendations",
        },
        createElement(WorkflowCommentsPreview, { stage }),
      )),
      renderToStaticMarkup(createElement(
        WorkflowTaskPreviewSection,
        {
          status: "1 required document",
          title: "Documents",
        },
        createElement(WorkflowDocumentRequirementsPreview, { stage }),
      )),
      renderToStaticMarkup(createElement(
        WorkflowTaskPreviewSection,
        {
          status: "1 criterion",
          title: "Scoring",
        },
        createElement(WorkflowScoringPreview, { stage }),
      )),
    ].join("");

    expect(markup).toContain("0 of 4 required items complete");
    expect(markup).toContain("Verify the requested amount");
    expect(markup).toContain("Financial statements");
    expect(markup).toContain("Business viability");
    expect(markup).toContain("Review recommendation");
    expect(markup).toContain("Internal only");
    expect(markup.match(/<details/g)).toHaveLength(4);
    expect(markup).not.toContain("<details open");
  });
});
