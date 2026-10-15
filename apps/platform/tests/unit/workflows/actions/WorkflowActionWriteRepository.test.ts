import { drizzle } from "drizzle-orm/pg-proxy";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/platform/database/client";
import { saveDraftWorkflowAction } from "@/modules/workflows/infrastructure/WorkflowActionWriteRepository";
import {
  workflowActionSaveInput,
  workflowActionSaveRecord,
} from "../../../support/WorkflowActionSaveFixture";

function fixture() {
  const record = workflowActionSaveRecord();
  const change = workflowActionSaveInput(record);
  return {
    actorId: record.definition.id,
    correlationId: "test",
    definitionId: record.definition.id,
    versionId: record.version.id,
    expectedRowVersion: 7,
    stage: record.graph.stages[0],
    previous: record.graph.stages[0].actions[0],
    action: change.action,
    taskIds: record.graph.stages[0].tasks.map((task) => task.id!),
    bindingsChanged: false,
    previousRoutes: change.routes,
    routes: change.routes,
    stageIds: new Map(
      record.graph.stages.map((stage) => [stage.stableKey, stage.id!]),
    ),
  };
}
function database(conflict = false) {
  const execute = vi.fn(async (query: string, parameters: unknown[]) => ({
    rows:
      parameters &&
      query.startsWith('update "app_workflow_definition_versions"') &&
      !conflict
        ? [[8]]
        : [],
  }));
  const transaction = drizzle(execute);
  vi.mocked(getDatabase).mockReturnValue({
    transaction: async (run: (connection: typeof transaction) => unknown) =>
      run(transaction),
  } as never);
  return execute;
}
beforeEach(() => vi.clearAllMocks());

describe("targeted workflow action persistence", () => {
  it("updates only the action and version plus audit when changing a label", async () => {
    const execute = database();
    const input = fixture();
    const saved = await saveDraftWorkflowAction(input);
    expect(saved?.action.id).toBe(input.previous.id);
    expect(saved?.rowVersion).toBe(8);
    expect(execute.mock.calls).toHaveLength(3);
    const [guard, guardParameters] = execute.mock.calls[0];
    expect(guard).toContain('"definition_id" =');
    expect(guardParameters).toEqual(
      expect.arrayContaining([input.definitionId, input.versionId, "DRAFT", 7]),
    );
    const [update, parameters] = execute.mock.calls[1];
    expect(update).toContain('update "app_workflow_action_definitions"');
    expect(update).toContain('where ("app_workflow_action_definitions"."id" =');
    expect(parameters).toContain(input.stage.id);
    expect(parameters).toContain(input.previous.id);
    expect(execute.mock.calls[2][0]).toContain(
      'insert into "app_workflow_audit_entries"',
    );
  });

  it("does not touch children or audit when the draft revision check fails", async () => {
    const execute = database(true);
    expect(await saveDraftWorkflowAction(fixture())).toBeNull();
    expect(execute.mock.calls).toHaveLength(1);
  });

  it("creates an action without deleting or recreating stages or tasks", async () => {
    const execute = database();
    const input = fixture();
    const saved = await saveDraftWorkflowAction({
      ...input,
      previous: undefined,
      bindingsChanged: true,
    });
    expect(saved?.action.id).not.toBe(input.previous.id);
    const queries = execute.mock.calls.map(([query]) => query).join("\n");
    expect(queries).toContain('insert into "app_workflow_action_definitions"');
    expect(queries).toContain('insert into "app_stage_task_action_bindings"');
    expect(queries).not.toMatch(
      /(?:delete from|insert into|update) "app_workflow_stage_definitions"/,
    );
    expect(queries).not.toMatch(
      /(?:delete from|insert into|update) "app_stage_task_definitions"/,
    );
  });

  it("scopes route replacement to one stage action and preserves existing route IDs", async () => {
    const execute = database();
    const input = fixture();
    const saved = await saveDraftWorkflowAction({
      ...input,
      routes: input.routes.map((route) => ({ ...route, priority: 2 })),
    });
    expect(saved?.routes[0].id).toBe(input.routes[0].id);
    const deletes = execute.mock.calls.filter(([query]) =>
      query.startsWith("delete"),
    );
    expect(deletes).toHaveLength(2);
    for (const [query, parameters] of deletes) {
      expect(query).toContain('"version_id" =');
      expect(query).toContain('"from_stage_id" =');
      expect(query).toContain('"action_key" =');
      expect(parameters).toEqual(
        expect.arrayContaining([
          input.versionId,
          input.stage.id,
          input.action.stableKey,
        ]),
      );
    }
  });
});
