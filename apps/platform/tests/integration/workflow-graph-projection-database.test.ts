import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import {
  enabled,
  executedQueries,
  createGraphFixture,
  actorId,
} from "../support/WorkflowGraphDatabaseFixture";
import { readWorkflowGraphRows } from "@/modules/workflows/infrastructure/WorkflowGraphReadRepository";
import { createWorkflowDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";

(enabled ? describe : describe.skip)("workflow graph SQL projections", () => {
  it("reads one row per entity/binding and isolates exact versions", async () => {
    const first = await createGraphFixture();
    const second = await createGraphFixture();
    executedQueries.length = 0;
    const rows = await readWorkflowGraphRows(first.versionId);
    expect(executedQueries).toHaveLength(8);
    expect(rows.header.version.id).toBe(first.versionId);
    expect(rows.stages).toHaveLength(first.graph.stages.length);
    expect(rows.actions).toHaveLength(
      first.graph.stages.reduce(
        (total, stage) => total + stage.actions.length,
        0,
      ),
    );
    expect(rows.tasks).toHaveLength(
      first.graph.stages.reduce(
        (total, stage) => total + stage.tasks.length,
        0,
      ),
    );
    expect(rows.taskActions).toHaveLength(
      first.graph.stages.reduce(
        (total, stage) =>
          total +
          stage.tasks.reduce(
            (count, task) => count + task.actionKeys.length,
            0,
          ),
        0,
      ),
    );
    expect(rows.transitions).toHaveLength(first.graph.transitions.length);
    expect(rows.targets).toHaveLength(
      first.graph.transitions.reduce(
        (total, route) => total + route.targetStageKeys.length,
        0,
      ),
    );
    expect(rows.predecessors).toHaveLength(2);
    const secondIds = new Set(
      second.stored.graph.stages.map((stage) => stage.id),
    );
    expect(rows.stages.every((stage) => !secondIds.has(stage.id))).toBe(true);
  });

  it("round-trips routes, tasks, stage requirements, predecessors and metadata without duplicate records", async () => {
    const fixture = await createGraphFixture();
    executedQueries.length = 0;
    const result = (await findWorkflowGraph(fixture.versionId))!;
    expect(executedQueries).toHaveLength(13);
    expect(result.definition.name).toBe("Synthetic graph");
    expect(result.graph.stages.map((stage) => stage.stableKey)).toEqual(
      fixture.graph.stages.map((stage) => stage.stableKey),
    );
    for (const stage of result.graph.stages) {
      expect(stage.actions.map((action) => action.displayOrder)).toEqual(
        [...stage.actions.map((action) => action.displayOrder)].sort(
          (left, right) => left - right,
        ),
      );
      expect(new Set(stage.actions.map((action) => action.id)).size).toBe(
        stage.actions.length,
      );
      expect(new Set(stage.tasks.map((task) => task.id)).size).toBe(
        stage.tasks.length,
      );
    }
    expect(result.graph.stages[0].tasks[0].formBinding).toEqual(
      fixture.graph.stages[0].tasks[0].formBinding,
    );
    expect(result.graph.stages[0].checklistItems).toHaveLength(
      fixture.graph.stages[0].checklistItems.length,
    );
    expect(result.graph.stages[2].joinPredecessorStageKeys.sort()).toEqual(
      fixture.graph.stages[2].joinPredecessorStageKeys.sort(),
    );
    expect(result.graph.transitions).toHaveLength(
      fixture.graph.transitions.length,
    );
    expect(
      result.graph.transitions.filter(
        (route) => route.targetStageKeys.length === 2,
      ),
    ).toHaveLength(1);
    expect(result.graph).toEqual(fixture.stored.graph);
  });

  it("returns null for unknown versions and an empty graph for an existing empty version", async () => {
    expect(await findWorkflowGraph(randomUUID())).toBeNull();
    const fixture = await createGraphFixture();
    const versionId = await createWorkflowDefinition({
      actorId,
      correlationId: randomUUID(),
      code: `EMPTY_${randomUUID()}`,
      name: "Empty workflow",
      description: "",
      graph: { stages: [], transitions: [] },
    });
    expect((await findWorkflowGraph(versionId))?.graph).toEqual({
      stages: [],
      transitions: [],
    });
    expect(
      (await readWorkflowGraphRows(fixture.versionId)).stages,
    ).not.toHaveLength(0);
  });
});
