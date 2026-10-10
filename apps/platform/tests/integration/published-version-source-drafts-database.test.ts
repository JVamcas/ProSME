import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ PAYLOAD_SECRET: "synthetic-version-secret" }),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationOccurrenceService",
  () => ({
    captureNotificationOccurrence: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallNotificationRepository",
  () => ({
    captureFundingCallNotification: vi.fn(),
  }),
);

import {
  enabled,
  pool,
  publishInitialCall,
  approveReplacement,
  command,
} from "../support/FundingCallVersionDatabaseHarness";
import {
  seedVersionBindings,
  versionActorId,
} from "../support/FundingCallVersionDatabaseFixture";
import { cloneWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { createFundingCallReplacement } from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import {
  readEffectiveFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { referenceWorkflow } from "../support/ReferenceWorkflowFixture";

(enabled ? describe : describe.skip)(
  "drafts from the selected published version",
  () => {
    it("copies selected workflow metadata and graph without resuming another source's draft", async () => {
      const binding = await seedVersionBindings(pool!);
      const latestId = randomUUID();
      await pool!.query(
        `INSERT INTO app_workflow_definition_versions
      (id, definition_id, version_number, status, created_by, metadata)
      VALUES ($1, $2, 2, 'PUBLISHED', $3, '{"code":"LATEST","name":"Latest workflow","description":""}')`,
        [latestId, binding.workflowId, versionActorId],
      );
      const input = {
        actorId: versionActorId,
        correlationId: randomUUID(),
        definitionId: binding.workflowId,
        graph: {
          stages: [
            {
              ...referenceWorkflow.stages[0],
              stableKey: "REVIEW",
              name: "Original review",
              actions: [],
              tasks: [],
              checklistItems: [],
            },
          ],
          transitions: [],
        },
      };
      const latestDraft = await cloneWorkflowVersion({
        ...input,
        sourceVersionId: latestId,
        graph: {
          ...input.graph,
          stages: [{ ...input.graph.stages[0], name: "Latest review" }],
        },
      });
      const oldDraft = await cloneWorkflowVersion({
        ...input,
        sourceVersionId: binding.workflowVersionId,
      });
      expect(oldDraft).not.toBe(latestDraft);
      const stored = await pool!.query(
        `SELECT version.source_version_id, version.metadata, stage.name
      FROM app_workflow_definition_versions version
      JOIN app_workflow_stage_definitions stage ON stage.version_id=version.id
      WHERE version.id=$1`,
        [oldDraft],
      );
      expect(stored.rows[0]).toMatchObject({
        source_version_id: binding.workflowVersionId,
        metadata: { name: "Synthetic workflow" },
        name: "Original review",
      });
      expect(
        await cloneWorkflowVersion({ ...input, sourceVersionId: latestId }),
      ).toBe(latestDraft);
      await expect(
        pool!.query(
          "UPDATE app_workflow_definition_versions SET source_version_id=$1 WHERE id=$2",
          [latestId, oldDraft],
        ),
      ).rejects.toThrow(/source is immutable/);
    });

    it("creates a call replacement from historical configuration and leaves current publication effective", async () => {
      const { callId } = await publishInitialCall();
      const original = (await readEffectiveFundingCallById(callId))!;
      const first = (await createFundingCallReplacement(
        versionActorId,
        callId,
        original.rowVersion,
      ))!;
      await updateDraftFundingCall(versionActorId, callId, {
        ...first,
        title: "Latest published call",
        opensAt: "2050-01-01T00:00:00Z",
        closesAt: "2101-01-01T00:00:00Z",
        expectedRowVersion: first.rowVersion,
      });
      const approved = await approveReplacement(callId);
      expect(
        (await publishApprovedFundingCall(command(callId, approved.rowVersion)))
          .kind,
      ).toBe("published");
      const current = (await readEffectiveFundingCallById(callId))!;
      const oldDraft = (await createFundingCallReplacement(
        versionActorId,
        callId,
        current.rowVersion,
        original.currentPublishedVersionId!,
      ))!;
      expect(oldDraft).toMatchObject({
        title: "Original version",
        status: "DRAFT",
        reference: current.reference,
        slug: current.slug,
      });
      expect(oldDraft.opensAt.getUTCFullYear()).toBe(2000);
      expect((await readEffectiveFundingCallById(callId))?.title).toBe(
        "Latest published call",
      );
      await expect(
        createFundingCallReplacement(
          versionActorId,
          callId,
          oldDraft.rowVersion,
          current.currentPublishedVersionId!,
        ),
      ).rejects.toThrow(/replacement based on another published version/);
      const other = await publishInitialCall();
      expect(
        await createFundingCallReplacement(
          versionActorId,
          other.callId,
          2,
          original.currentPublishedVersionId!,
        ),
      ).toBeNull();
    });
  },
);
