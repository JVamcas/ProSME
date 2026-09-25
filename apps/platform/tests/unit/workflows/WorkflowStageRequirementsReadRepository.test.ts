import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { attachWorkflowStageRequirements } from "@/modules/workflows/infrastructure/WorkflowStageRequirementsReadRepository";
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
      comments: [{
        id: "d827ea54-d89a-43d4-b0e2-1fa54f5c9260",
        stageId: stage.id,
        taskStableKey: "PRE_SCREEN_CHECKLIST",
        key: "RECOMMENDATION",
        label: "Recommendation",
        helpText: "Explain your recommendation.",
        mandatory: true,
        visibility: "INTERNAL_ONLY",
        displayOrder: 1,
      }],
      documents: [],
      scoringConfigurations: [],
      scoringCriteria: [],
    });
    expect(stage.commentFields).toEqual([{
      id: "d827ea54-d89a-43d4-b0e2-1fa54f5c9260",
      taskStableKey: "PRE_SCREEN_CHECKLIST",
      key: "RECOMMENDATION",
      label: "Recommendation",
      helpText: "Explain your recommendation.",
      mandatory: true,
      visibility: "INTERNAL_ONLY",
      displayOrder: 1,
    }]);
  });
});
