import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import {
  enabled,
  pool,
  createGraphFixture,
  deletionInput,
} from "../support/WorkflowGraphDatabaseFixture";
import { deleteDraftWorkflowAction } from "@/modules/workflows/infrastructure/WorkflowActionDeletionRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { publishWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { removeWorkflowAction } from "@/modules/workflows/domain/actions/WorkflowActionDeletion";

(enabled ? describe : describe.skip)(
  "targeted workflow action deletion",
  () => {
    it("deletes every selected route/target/binding and preserves unrelated identities and configuration", async () => {
      const fixture = await createGraphFixture();
      const result = await deleteDraftWorkflowAction(deletionInput(fixture));
      expect(result.kind).toBe("deleted");
      const after = (await findWorkflowGraph(fixture.versionId))!;
      expect(after.version.rowVersion).toBe(2);
      expect(after.graph).toEqual(
        removeWorkflowAction(fixture.stored.graph, "PRE_SCREENING", "ADVANCE"),
      );
      expect(
        after.graph.stages[0].actions.map((action) => action.displayOrder),
      ).toEqual([1, 2]);
      expect(after.graph.stages.slice(1)).toEqual(
        fixture.stored.graph.stages.slice(1),
      );
      const dangling = await pool!.query(`SELECT count(*)::int AS count
      FROM app_workflow_transition_targets target
      LEFT JOIN app_workflow_transition_definitions route ON route.id=target.transition_id
      WHERE route.id IS NULL`);
      expect(dangling.rows[0].count).toBe(0);
      const audit = await pool!.query(
        "SELECT action, after FROM app_workflow_audit_entries WHERE target_id=$1 AND action='WORKFLOW_ACTION_DELETED'",
        [fixture.versionId],
      );
      expect(audit.rows).toEqual([
        expect.objectContaining({
          after: expect.objectContaining({
            rowVersion: 2,
            stageKey: "PRE_SCREENING",
            actionKey: "ADVANCE",
          }),
        }),
      ]);
    });

    it("rejects stale tokens, wrong owners and missing targets without writes", async () => {
      const fixture = await createGraphFixture();
      const input = deletionInput(fixture);
      for (const [changes, kind] of [
        [{ expectedRowVersion: 0 }, "conflict"],
        [{ definitionId: randomUUID() }, "not_found"],
        [{ versionId: randomUUID() }, "not_found"],
        [{ stageKey: "MISSING" }, "missing_action"],
        [{ actionKey: "MISSING" }, "missing_action"],
      ] as const) {
        expect(
          (await deleteDraftWorkflowAction({ ...input, ...changes })).kind,
        ).toBe(kind);
      }
      expect(await findWorkflowGraph(fixture.versionId)).toEqual(
        fixture.stored,
      );
    });

    it("preserves a published source version", async () => {
      const fixture = await createGraphFixture();
      const input = deletionInput(fixture);
      await publishWorkflowVersion({ ...input, idempotencyKey: randomUUID() });
      expect(
        (await deleteDraftWorkflowAction({ ...input, expectedRowVersion: 2 }))
          .kind,
      ).toBe("not_draft");
      expect((await findWorkflowGraph(fixture.versionId))?.graph).toEqual(
        fixture.stored.graph,
      );
    });

    it("rolls back deletion and revision changes when audit persistence fails", async () => {
      const fixture = await createGraphFixture();
      await pool!
        .query(`CREATE FUNCTION fail_action_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action='WORKFLOW_ACTION_DELETED' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_action_audit BEFORE INSERT ON app_workflow_audit_entries FOR EACH ROW EXECUTE FUNCTION fail_action_audit();`);
      try {
        await expect(
          deleteDraftWorkflowAction(deletionInput(fixture)),
        ).rejects.toMatchObject({
          cause: { message: "synthetic audit failure" },
        });
        expect(await findWorkflowGraph(fixture.versionId)).toEqual(
          fixture.stored,
        );
      } finally {
        await pool!.query(
          "DROP TRIGGER fail_action_audit ON app_workflow_audit_entries; DROP FUNCTION fail_action_audit()",
        );
      }
    });

    it("serializes concurrent deletions against the same draft revision", async () => {
      const fixture = await createGraphFixture();
      const input = deletionInput(fixture);
      const results = await Promise.all([
        deleteDraftWorkflowAction(input),
        deleteDraftWorkflowAction({ ...input, actionKey: "KEEP_FIRST" }),
      ]);
      expect(results.map((result) => result.kind).sort()).toEqual([
        "conflict",
        "deleted",
      ]);
      expect(
        (await findWorkflowGraph(fixture.versionId))?.version.rowVersion,
      ).toBe(2);
    });
  },
);
