import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadPriorStageContext } from "@/modules/workflows/infrastructure/StageActivationContextRepository";

describe("prior stage activation context", () => {
  it("reads task keys from the code column within the requested workflow", async () => {
    const workflowInstanceId = "10000000-0000-4000-8000-000000000001";
    const execute = vi.fn().mockResolvedValue({
      rows: [
        {
          stageKey: "REVIEW",
          taskId: "20000000-0000-4000-8000-000000000002",
          taskKey: "ASSESSMENT",
          reviewerSlot: 1,
          reviewerCount: 1,
          reviewerId: "30000000-0000-4000-8000-000000000003",
          responseValues: { recommendation: "APPROVE" },
          taskResult: null,
        },
      ],
    });

    const stages = await loadPriorStageContext({ execute }, workflowInstanceId);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);

    expect(query.sql).toContain('definition.code AS "taskKey"');
    expect(query.sql).not.toContain("definition.stable_key");
    expect(query.params).toEqual([workflowInstanceId]);
    expect(query.sql).toContain("stage.workflow_instance_id =");
    expect(query.sql).toContain("app_workflow_task_coi_cleared");
    expect(query.sql).toContain("successor.supersedes_task_id = task.id");
    expect(stages).toEqual([
      {
        stableKey: "REVIEW",
        values: expect.objectContaining({
          task: {
            ASSESSMENT: {
              reviewer_1: {
                recommendation: "APPROVE",
                form: { recommendation: "APPROVE" },
                reviewerId: "30000000-0000-4000-8000-000000000003",
                taskId: "20000000-0000-4000-8000-000000000002",
              },
            },
          },
        }),
      },
    ]);
  });
});
