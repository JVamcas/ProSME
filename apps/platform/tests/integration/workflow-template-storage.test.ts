import { randomUUID } from "node:crypto";
import { expectRetainedTemplateAudit } from "../support/WorkflowTemplateAuditAssertions";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  changeWorkflowTemplateStatus,
  createWorkflowTemplate,
  getWorkflowTemplateAudit,
  getWorkflowTemplateVersion,
  getWorkflowTemplateVersions,
  updateWorkflowTemplateDraft,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";
import {
  cloneWorkflowVersion,
  replaceWorkflowDraft,
} from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { changeWorkflowTemplateLifecycle } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";

import {
  actor,
  change,
  correlationId,
  enabled,
  metadata,
  pool,
  setVersion,
  templateId,
  version,
} from "../support/WorkflowTemplateDatabaseFixture";

(enabled ? describe : describe.skip)(
  "workflow template governance on PostgreSQL",
  () => {
    it("creates version 1 as Draft and round-trips metadata", async () => {
      const created = await createWorkflowTemplate(
        actor,
        metadata,
        correlationId,
      );
      setVersion(created.version);
      expect(version).toMatchObject({
        versionNumber: 1,
        rowVersion: 1,
        status: "DRAFT",
        metadata,
      });
      expect((await findWorkflowGraph(version.id))?.graph).toEqual({
        stages: [],
        transitions: [],
      });
    });

    it("edits Draft atomically and rejects stale writes", async () => {
      const input = {
        ...metadata,
        description: "Revised draft",
        templateId,
        versionId: version.id,
        expectedRowVersion: 1,
      };
      setVersion(
        (await updateWorkflowTemplateDraft(actor, input, correlationId))
          .version,
      );
      expect(version.metadata.description).toBe("Revised draft");
      await expect(
        updateWorkflowTemplateDraft(actor, input, correlationId),
      ).rejects.toThrow("changed in another session");
    });

    it("blocks direct publication and prevents non-draft insertion", async () => {
      await expect(change("PUBLISH")).rejects.toThrow("Only APPROVED");
      await expect(
        pool!.query(
          `UPDATE app_workflow_definition_versions SET status = 'PUBLISHED', published_by = $2,
       published_at = now(), row_version = row_version + 1 WHERE id = $1`,
          [version.id, actor.id],
        ),
      ).rejects.toThrow("invalid workflow version lifecycle");
      await expect(
        pool!.query(
          `INSERT INTO app_workflow_definition_versions (definition_id, version_number, status, created_by)
       VALUES ($1, 2, 'PUBLISHED', $2)`,
          [templateId, actor.id],
        ),
      ).rejects.toThrow("must start as Draft");
    });

    it("freezes pending approval and records return reason", async () => {
      await change("SUBMIT");
      await expect(
        updateWorkflowTemplateDraft(
          actor,
          {
            ...metadata,
            templateId,
            versionId: version.id,
            expectedRowVersion: version.rowVersion,
          },
          correlationId,
        ),
      ).rejects.toThrow("Only draft");
      await expect(
        changeWorkflowTemplateStatus(
          actor,
          {
            templateId,
            versionId: version.id,
            expectedRowVersion: version.rowVersion,
            idempotencyKey: randomUUID(),
            command: "RETURN",
            reason: " ",
          },
          correlationId,
        ),
      ).rejects.toThrow();
      await change("RETURN");
      const audit = await getWorkflowTemplateAudit(
        actor,
        templateId,
        version.id,
      );
      expect(audit).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "WORKFLOW_VERSION_DRAFT",
            after: expect.objectContaining({
              reason: "Please clarify the description",
            }),
          }),
        ]),
      );
    });

    it("rolls back the state change if its audit insert fails", async () => {
      const key = randomUUID();
      await changeWorkflowTemplateStatus(
        actor,
        {
          templateId,
          versionId: version.id,
          expectedRowVersion: version.rowVersion,
          idempotencyKey: key,
          command: "SUBMIT",
        },
        correlationId,
      );
      setVersion(
        (await getWorkflowTemplateVersion(actor, templateId, version.id))
          .version,
      );
      await expect(
        changeWorkflowTemplateLifecycle(
          {
            actorId: actor.id,
            correlationId,
            versionId: version.id,
            expectedRowVersion: version.rowVersion,
            idempotencyKey: key,
          },
          "APPROVE",
        ),
      ).rejects.toThrow();
      expect(
        (await getWorkflowTemplateVersion(actor, templateId, version.id))
          .version,
      ).toEqual(version);
    });

    it("approves separately, then publishes once under concurrent requests", async () => {
      await change("APPROVE");
      expect(version.status).toBe("APPROVED");
      expect(version.publishedAt).toBeNull();
      const outcomes = await Promise.allSettled([
        change("PUBLISH"),
        change("PUBLISH"),
      ]);
      expect(
        outcomes.filter((outcome) => outcome.status === "fulfilled"),
      ).toHaveLength(1);
      setVersion(
        (await getWorkflowTemplateVersion(actor, templateId, version.id))
          .version,
      );
      expect(version.status).toBe("PUBLISHED");
      const audit = await getWorkflowTemplateAudit(
        actor,
        templateId,
        version.id,
      );
      expect(
        audit.filter((entry) => entry.action === "WORKFLOW_VERSION_PUBLISHED"),
      ).toHaveLength(1);
    });
  },
);

(enabled ? describe : describe.skip)(
  "workflow template version retention",
  () => {
    it("protects published metadata and graph writes even without runtime instances", async () => {
      await expect(
        pool!.query(
          `UPDATE app_workflow_definition_versions SET metadata = jsonb_set(metadata, '{name}', '"Tampered"'),
       row_version = row_version + 1 WHERE id = $1`,
          [version.id],
        ),
      ).rejects.toThrow("metadata is immutable");
      expect(
        await replaceWorkflowDraft({
          actorId: actor.id,
          correlationId,
          versionId: version.id,
          expectedRowVersion: version.rowVersion,
          graph: { stages: [], transitions: [] },
        }),
      ).toBeNull();
      await expect(
        pool!.query(
          `INSERT INTO app_workflow_stage_definitions
       (version_id, code, name, sequence, applicant_status, applicant_label, applicant_description)
       VALUES ($1, 'STAGE', 'Stage', 1, 'SUBMITTED', 'Submitted', 'Submitted')`,
          [version.id],
        ),
      ).rejects.toThrow("only draft workflow versions");
    });

    it("allocates unique version numbers and preserves published snapshots", async () => {
      const drafts = await Promise.allSettled(
        [1, 2].map(() =>
          cloneWorkflowVersion({
            actorId: actor.id,
            correlationId,
            definitionId: templateId,
            graph: { stages: [], transitions: [] },
            sourceVersionId: version.id,
          }),
        ),
      );
      expect(
        drafts.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      const draft = (await getWorkflowTemplateVersions(actor, templateId)).find(
        (item) => item.status === "DRAFT",
      )!;
      expect(draft.versionNumber).toBe(2);
      await updateWorkflowTemplateDraft(
        actor,
        {
          ...metadata,
          name: "Version two name",
          templateId,
          versionId: draft.id,
          expectedRowVersion: 1,
        },
        correlationId,
      );
      const original = await getWorkflowTemplateVersion(
        actor,
        templateId,
        version.id,
      );
      expect(original.version.metadata.name).toBe(metadata.name);
      expect((await findWorkflowGraph(version.id))?.definition.name).toBe(
        metadata.name,
      );
      await expect(
        pool!.query(
          `UPDATE app_workflow_definition_versions SET version_number = 1, row_version = row_version + 1 WHERE id = $1`,
          [draft.id],
        ),
      ).rejects.toThrow("identity or concurrency");
    });

    it("retires without deleting version identity or audit history", async () => {
      await change("RETIRE");
      const retired = await getWorkflowTemplateVersion(
        actor,
        templateId,
        version.id,
      );
      expect(retired.version.status).toBe("RETIRED");
      expect(retired.version.publishedAt).not.toBeNull();
      expect(retired.version.retiredAt).not.toBeNull();
      await expect(
        pool!.query(
          `DELETE FROM app_workflow_definition_versions WHERE id = $1`,
          [version.id],
        ),
      ).rejects.toThrow("cannot be deleted");
      await expectRetainedTemplateAudit();
    });
  },
);
