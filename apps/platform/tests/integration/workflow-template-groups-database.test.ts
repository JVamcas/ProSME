import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
import {
  enabled,
  pool,
  actorId,
  executedQueries,
  createGraphFixture,
} from "../support/WorkflowGraphDatabaseFixture";
import {
  listWorkflowTemplatePage,
  listWorkflowTemplateVersionPage,
} from "@/modules/workflows/infrastructure/WorkflowTemplateRepository";
import { updateWorkflowTemplateDefinition } from "@/modules/workflows/infrastructure/WorkflowTemplateDefinitionRepository";
import {
  cloneWorkflowVersion,
  createWorkflowDefinition,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { cloneWorkflowGraph } from "@/modules/workflows/domain/definitions/WorkflowGraphCloning";
import { publishWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";

(enabled ? describe : describe.skip)("grouped template storage", () => {
  it("paginates templates independently of version count, and versions within the selected template", async () => {
    const first = await createGraphFixture();
    const second = await createGraphFixture();
    await pool!.query(
      "UPDATE app_workflow_definitions SET name=CASE WHEN id=$1 THEN 'Alpha' ELSE 'Zebra' END WHERE id=ANY($2::uuid[])",
      [first.definitionId, [first.definitionId, second.definitionId]],
    );
    for (let number = 2; number <= 12; number++) {
      await pool!.query(
        "INSERT INTO app_workflow_definition_versions (definition_id,version_number,created_by,metadata) VALUES ($1,$2,$3,$4)",
        [
          first.definitionId,
          number,
          actorId,
          JSON.stringify({
            code: "OLD",
            name: `Historical ${number}`,
            description: "",
          }),
        ],
      );
    }
    executedQueries.length = 0;
    const parentPage = await listWorkflowTemplatePage(1, 1);
    expect(executedQueries).toHaveLength(2);
    expect(parentPage.total).toBe(2);
    expect(parentPage.items[0]).toMatchObject({
      id: first.definitionId,
      currentVersionNumber: 12,
      metadata: { name: "Alpha" },
      isLatest: true,
    });
    expect((await listWorkflowTemplatePage(2, 1)).items[0].id).toBe(
      second.definitionId,
    );
    expect((await listWorkflowTemplatePage(3, 1)).items).toEqual([]);
    const firstVersions = await listWorkflowTemplateVersionPage(
      first.definitionId,
      1,
      10,
    );
    const remaining = await listWorkflowTemplateVersionPage(
      first.definitionId,
      2,
      10,
    );
    expect(firstVersions.total).toBe(12);
    expect(firstVersions.items.map((row) => row.currentVersionNumber)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
    ]);
    expect(firstVersions.items[0].isLatest).toBe(true);
    expect(remaining.items.map((row) => row.currentVersionNumber)).toEqual([
      2, 1,
    ]);
    expect(
      remaining.items.every(
        (row) => row.id === first.definitionId && !row.isLatest,
      ),
    ).toBe(true);
    expect(
      (await listWorkflowTemplateVersionPage(second.definitionId, 1, 10)).total,
    ).toBe(1);
    await pool!.query(
      "UPDATE app_workflow_definitions SET active=false WHERE id=ANY($1::uuid[])",
      [[first.definitionId, second.definitionId]],
    );
    expect(
      (await listWorkflowTemplateVersionPage(second.definitionId, 1, 10)).items,
    ).toEqual([]);
    expect((await listWorkflowTemplatePage(1, 10)).total).toBe(0);
  });

  it("edits a published definition without changing versions, and publication retains that definition", async () => {
    const fixture = await createGraphFixture();
    await publishWorkflowVersion({
      actorId,
      correlationId: randomUUID(),
      expectedRowVersion: 1,
      idempotencyKey: randomUUID(),
      versionId: fixture.versionId,
    });
    const before = await pool!.query(
      "SELECT updated_at FROM app_workflow_definitions WHERE id=$1",
      [fixture.definitionId],
    );
    const versionsBefore = await pool!.query(
      "SELECT id,metadata,row_version,status FROM app_workflow_definition_versions WHERE definition_id=$1",
      [fixture.definitionId],
    );
    const input = {
      actorId,
      correlationId: randomUUID(),
      definitionId: fixture.definitionId,
      expectedUpdatedAt: before.rows[0].updated_at.toISOString(),
      code: `RENAMED_${randomUUID()}`,
      name: "Renamed definition",
      description: "Canonical description",
    };
    const updated = await updateWorkflowTemplateDefinition(input);
    expect(updated?.name).toBe("Renamed definition");
    expect(await updateWorkflowTemplateDefinition(input)).toBeNull();
    expect(
      (
        await pool!.query(
          "SELECT id,metadata,row_version,status FROM app_workflow_definition_versions WHERE definition_id=$1",
          [fixture.definitionId],
        )
      ).rows,
    ).toEqual(versionsBefore.rows);
    const draftId = await cloneWorkflowVersion({
      actorId,
      correlationId: randomUUID(),
      definitionId: fixture.definitionId,
      sourceVersionId: fixture.versionId,
      graph: cloneWorkflowGraph(fixture.stored.graph),
    });
    await publishWorkflowVersion({
      actorId,
      correlationId: randomUUID(),
      expectedRowVersion: 1,
      idempotencyKey: randomUUID(),
      versionId: draftId,
    });
    expect((await listWorkflowTemplatePage(1, 10)).items[0].metadata.name).toBe(
      "Renamed definition",
    );
    const audit = await pool!.query(
      "SELECT before,after FROM app_workflow_audit_entries WHERE target_id=$1 AND action='WORKFLOW_DEFINITION_UPDATED'",
      [fixture.definitionId],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].after.name).toBe("Renamed definition");
    await pool!.query(
      "UPDATE app_workflow_definitions SET active=false WHERE id=$1",
      [fixture.definitionId],
    );
  });

  it("copies a selected graph into a distinct template at draft v1 with audit provenance", async () => {
    const source = await createGraphFixture();
    const copyId = await createWorkflowDefinition({
      actorId,
      correlationId: randomUUID(),
      code: `COPY_${randomUUID()}`,
      name: "Independent copy",
      description: "",
      graph: cloneWorkflowGraph(source.stored.graph),
      copiedFrom: {
        definitionId: source.definitionId,
        versionId: source.versionId,
      },
    });
    const copy = (await findWorkflowGraph(copyId))!;
    expect(copy.definition.id).not.toBe(source.definitionId);
    expect(copy.version).toMatchObject({
      versionNumber: 1,
      status: "DRAFT",
    });
    const sourceLink = await pool!.query(
      "SELECT source_version_id FROM app_workflow_definition_versions WHERE id=$1",
      [copyId],
    );
    expect(sourceLink.rows[0].source_version_id).toBeNull();
    expect(copy.graph.stages.map((stage) => stage.stableKey)).toEqual(
      source.stored.graph.stages.map((stage) => stage.stableKey),
    );
    expect(copy.graph.stages[0].id).not.toBe(source.stored.graph.stages[0].id);
    expect(copy.graph.stages[0].tasks[0].formBinding).toEqual(
      source.stored.graph.stages[0].tasks[0].formBinding,
    );
    expect(copy.graph.transitions).toHaveLength(
      source.stored.graph.transitions.length,
    );
    expect(copy.graph.transitions).toEqual(
      expect.arrayContaining(
        source.stored.graph.transitions.map(({ id, ...route }) => {
          expect(id).toBeDefined();
          return expect.objectContaining(route);
        }),
      ),
    );
    const audit = await pool!.query(
      "SELECT after FROM app_workflow_audit_entries WHERE target_id=$1 AND action='WORKFLOW_CREATED'",
      [copy.definition.id],
    );
    expect(audit.rows[0].after.copiedFrom).toEqual({
      definitionId: source.definitionId,
      versionId: source.versionId,
    });
    expect(
      (
        await pool!.query(
          "SELECT count(*) FROM app_workflow_definition_versions WHERE definition_id=$1",
          [source.definitionId],
        )
      ).rows[0].count,
    ).toBe("1");
  });
});
