import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("server-only", () => ({}));

import {
  loadRequiredTaskCompletionsForStages,
  loadStageCompletionValuesForStages,
} from "@/modules/workflows/infrastructure/StageCompletionReadRepository";

const stageIds = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
];

describe("batched stage completion evidence", () => {
  it("scopes thresholds to requested runs and preserves strict evidence checks", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({
        rows: [{ stageInstanceId: stageIds[1], completedCount: 1 }],
      });
    const rows = await loadRequiredTaskCompletionsForStages(
      { execute } as never,
      stageIds,
    );
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toEqual(expect.arrayContaining(stageIds));
    expect(query.sql).toContain('stage.id AS "stageInstanceId"');
    expect(query.sql).toContain("GROUP BY stage.id");
    expect(query.sql).toContain("definition.required = TRUE");
    expect(query.sql).toContain("app_workflow_task_coi_cleared");
    expect(query.sql).toContain("successor.supersedes_task_id = task.id");
    expect(query.sql).toContain("response.status = 'COMPLETED'");
    expect(rows[0].stageInstanceId).toBe(stageIds[1]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("loads only valid completed values in deterministic order for the selected runs", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    await loadStageCompletionValuesForStages({ execute } as never, stageIds);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toEqual(stageIds);
    expect(query.sql).toContain('definition.code AS "taskKey"');
    expect(query.sql).not.toContain("definition.stable_key");
    expect(query.sql).toContain("task.status = 'COMPLETED'");
    expect(query.sql).toContain(
      "ORDER BY task.created_at, task.id, response.created_at, response.id",
    );
    expect(query.sql).toContain(
      "task.form_version_id IS NULL OR response.id IS NOT NULL",
    );
  });

  it("does not query for an empty batch", async () => {
    const execute = vi.fn();
    expect(
      await loadRequiredTaskCompletionsForStages({ execute } as never, []),
    ).toEqual([]);
    expect(
      await loadStageCompletionValuesForStages({ execute } as never, []),
    ).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });
});
