import { randomUUID } from "node:crypto";
import { getTableName } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { saveDraftWorkflowAction } from "@/modules/workflows/infrastructure/WorkflowActionWriteRepository";
import {
  stageTaskDefinitions,
  stageTaskActionBindings,
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "@/modules/workflows/infrastructure/workflow.schema";
import { workflowTransitionTargets } from "@/modules/workflows/infrastructure/workflow-parallel.schema";
import {
  client,
  enabled,
  input,
  record,
  queries,
  snapshot,
} from "./support/WorkflowActionWritePostgresFixture";

describe.skipIf(!enabled)(
  "targeted workflow action writes on PostgreSQL",
  () => {
    it("changes a label with three writes and preserves every unrelated record", async () => {
      const before = await snapshot();
      const changed = await saveDraftWorkflowAction(input());
      expect(changed?.action.id).toBe(record.graph.stages[0].actions[0].id);
      const after = await snapshot();
      for (const table of [
        workflowStageDefinitions,
        stageTaskDefinitions,
        stageTaskActionBindings,
        workflowTransitionDefinitions,
        workflowTransitionTargets,
      ]) {
        expect(after[getTableName(table)]).toEqual(before[getTableName(table)]);
      }
      expect(
        queries.filter((query) => /^(update|insert|delete)/i.test(query)),
      ).toHaveLength(3);
      expect(
        (
          await client!.query(
            "SELECT row_version FROM app_workflow_definition_versions",
          )
        ).rows[0].row_version,
      ).toBe(8);
    });

    it("creates an action and its bindings without replacing existing actions", async () => {
      const original = record.graph.stages[0].actions[0];
      const request = input();
      const result = await saveDraftWorkflowAction({
        ...request,
        previous: undefined,
        action: {
          ...request.action,
          id: undefined,
          stableKey: "ADDED",
          displayOrder: 2,
        },
        bindingsChanged: true,
        previousRoutes: [],
        routes: [],
      });
      expect(result?.action.id).toBeDefined();
      expect(
        (
          await client!.query(
            "SELECT id FROM app_workflow_action_definitions WHERE id=$1",
            [original.id],
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await client!.query(
            "SELECT task_definition_id FROM app_stage_task_action_bindings WHERE action_key='ADDED'",
          )
        ).rows.map((row) => row.task_definition_id),
      ).toEqual(request.taskIds);
    });

    it("replaces only selected routes without violating restrictive foreign keys", async () => {
      const request = input();
      const unrelated = (
        await client!.query(
          "SELECT id FROM app_workflow_transition_definitions WHERE from_stage_id<>$1 ORDER BY id",
          [request.stage.id],
        )
      ).rows;
      await saveDraftWorkflowAction({
        ...request,
        routes: [
          { ...request.routes[0], priority: 2 },
          { ...request.routes[0], id: undefined, priority: 1 },
        ],
      });
      expect(
        (
          await client!.query(
            "SELECT id FROM app_workflow_transition_definitions WHERE from_stage_id<>$1 ORDER BY id",
            [request.stage.id],
          )
        ).rows,
      ).toEqual(unrelated);
      expect(
        (
          await client!.query(
            "SELECT id FROM app_workflow_transition_definitions WHERE from_stage_id=$1",
            [request.stage.id],
          )
        ).rows,
      ).toHaveLength(2);
    });

    it.each(["stale", "definition", "published"])(
      "rejects %s writes without side effects",
      async (mismatch) => {
        const request = input();
        if (mismatch === "stale") request.expectedRowVersion--;
        if (mismatch === "definition") request.definitionId = randomUUID();
        if (mismatch === "published")
          await client!.query(
            "UPDATE app_workflow_definition_versions SET status='PUBLISHED'",
          );
        const before = await snapshot();
        expect(await saveDraftWorkflowAction(request)).toBeNull();
        expect(await snapshot()).toEqual(before);
      },
    );

    it("rolls back the action and revision when audit insertion fails", async () => {
      await client!
        .query(`CREATE FUNCTION pg_temp.fail_action_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$;
      CREATE TRIGGER fail_action_audit BEFORE INSERT ON app_workflow_audit_entries FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_action_audit();`);
      try {
        const before = await snapshot();
        await expect(saveDraftWorkflowAction(input())).rejects.toMatchObject({
          cause: { message: "synthetic audit failure" },
        });
        expect(await snapshot()).toEqual(before);
      } finally {
        await client!.query(
          "DROP TRIGGER fail_action_audit ON app_workflow_audit_entries; DROP FUNCTION pg_temp.fail_action_audit()",
        );
      }
    });
  },
);
