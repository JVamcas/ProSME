import { drizzle } from "drizzle-orm/pg-proxy";
import { getDatabase } from "@/db/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import {
  loadWorkflowStageRequirements,
  attachWorkflowStageRequirements,
} from "@/modules/workflows/infrastructure/WorkflowStageRequirementsReadRepository";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

describe("workflow stage requirement projection", () => {
  it("attaches task-owned comment fields to their stage in display order", () => {
    const stage = {
      ...structuredClone(referenceWorkflow.stages[0]),
      id: "1e64edee-6371-42cf-a913-ab288af4cf17",
      commentFields: [],
    };
    attachWorkflowStageRequirements([stage], {
      checklists: [],
      comments: [
        {
          id: "d827ea54-d89a-43d4-b0e2-1fa54f5c9260",
          stageId: stage.id,
          taskStableKey: "PRE_SCREEN_CHECKLIST",
          key: "RECOMMENDATION",
          label: "Recommendation",
          helpText: "Explain your recommendation.",
          mandatory: true,
          displayOrder: 1,
        },
      ],
      documents: [],
      scoringConfigurations: [],
      scoringCriteria: [],
    });
    expect(stage.commentFields).toEqual([
      {
        id: "d827ea54-d89a-43d4-b0e2-1fa54f5c9260",
        taskStableKey: "PRE_SCREEN_CHECKLIST",
        key: "RECOMMENDATION",
        label: "Recommendation",
        helpText: "Explain your recommendation.",
        mandatory: true,
        displayOrder: 1,
      },
    ]);
  });
  it("keeps criteria with the owning task when another task reuses the same key", () => {
    const stage = {
      ...structuredClone(referenceWorkflow.stages[0]),
      id: "stage-id",
      scoring: null,
    };
    const configuration = (
      taskDefinitionId: string,
      taskStableKey: string,
    ) => ({
      stageId: stage.id,
      taskDefinitionId,
      taskStableKey,
      aggregation: "AVERAGE" as const,
    });
    const criterion = (taskDefinitionId: string, description: string) => ({
      id: taskDefinitionId,
      taskDefinitionId,
      stageId: stage.id,
      stableKey: "VIABILITY",
      criterion: "Viability",
      description,
      weight: 1,
      scaleMinimum: 0,
      scaleMaximum: 10,
      mandatoryComment: false,
    });
    attachWorkflowStageRequirements([stage], {
      checklists: [],
      comments: [],
      documents: [],
      scoringConfigurations: [
        configuration("first", "FIRST"),
        configuration("second", "SECOND"),
      ],
      scoringCriteria: [
        criterion("first", "Technical evidence"),
        criterion("second", "Financial evidence"),
      ],
    });
    expect(stage.scoring).toEqual([
      expect.objectContaining({
        taskStableKey: "FIRST",
        criteria: [
          expect.objectContaining({ description: "Technical evidence" }),
        ],
      }),
      expect.objectContaining({
        taskStableKey: "SECOND",
        criteria: [
          expect.objectContaining({ description: "Financial evidence" }),
        ],
      }),
    ]);
  });
});

it("reads saved page and extension limits in the workflow document projection", async () => {
  const execute = vi.fn(async (query: string) => ({
    rows: query.includes('from "app_workflow_stage_document_requirements"')
      ? [
          [
            "requirement",
            "stage",
            "DOCUMENT",
            "TASK",
            "Evidence",
            true,
            ["PDF"],
            4,
            3,
            [".pdf"],
            null,
            false,
            "ANY",
            "ASSIGNED_REVIEWER",
            "",
          ],
        ]
      : [],
  }));
  vi.mocked(getDatabase).mockReturnValue(drizzle(execute) as never);
  const result = await loadWorkflowStageRequirements("workflow-version");
  expect(result.documents[0]).toMatchObject({
    maxPages: 3,
    acceptedExtensions: [".pdf"],
    maximumSizeMb: 4,
    uploader: "ANY",
  });
  expect(execute).toHaveBeenCalledTimes(5);
});
