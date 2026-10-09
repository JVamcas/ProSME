import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    PAYLOAD_SECRET: "synthetic-version-test-token-secret",
  }),
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
  command,
  publishInitialCall,
  approveReplacement,
  createDraft,
} from "../support/FundingCallVersionDatabaseHarness";
import {
  readFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { createFundingCallReplacement } from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";

import {
  versionActorId,
  versionOwnerId,
  seedVersionBindings,
} from "../support/FundingCallVersionDatabaseFixture";
import { getDatabase } from "@/db/client";
import { preflightOwnedApplication } from "@/modules/applications/infrastructure/ApplicationPreflightRepository";
import { submitOwnedApplication } from "@/modules/applications/infrastructure/ApplicationSubmissionRepository";
import { completeVersionApplication } from "../support/FundingCallVersionSubmissionFixture";
import { validateApplicationSubmissionState } from "@/modules/applications/infrastructure/ApplicationSubmissionValidation";

(enabled ? describe : describe.skip)(
  "applications pinned to funding-call versions",
  () => {
    it("pins drafts at creation, retains their configuration at submission, and shares new effective dates", async () => {
      const { callId, formVersionId, rulesVersionId, workflowVersionId } =
        await publishInitialCall();
      const first = await createDraft(callId);
      expect(first.kind).toBe("created");
      if (!("applicationId" in first)) throw new Error("Draft not created");
      await completeVersionApplication(
        pool!,
        first.applicationId,
        formVersionId,
      );
      const oldState = await getDatabase().transaction((transaction) =>
        validateApplicationSubmissionState(transaction, {
          actorId: versionOwnerId,
          applicationId: first.applicationId,
          lockApplication: false,
          now: new Date(),
        }),
      );
      const call = (await readFundingCallById(callId))!;
      const draft = (await createFundingCallReplacement(
        versionActorId,
        callId,
        call.rowVersion,
      ))!;
      const replacements = await seedVersionBindings(pool!);
      await updateDraftFundingCall(versionActorId, callId, {
        ...draft,
        formVersionId: replacements.formVersionId,
        eligibilityRuleSetVersionId: replacements.rulesVersionId,
        workflowTemplateVersionId: replacements.workflowVersionId,
        opensAt: draft.opensAt.toISOString(),
        closesAt: "2099-01-01T00:00:00Z",
        expectedRowVersion: draft.rowVersion,
      });
      const unchanged = await getDatabase().transaction((transaction) =>
        validateApplicationSubmissionState(transaction, {
          actorId: versionOwnerId,
          applicationId: first.applicationId,
          lockApplication: false,
          now: new Date(),
        }),
      );
      expect(unchanged?.configurationFingerprint).toBe(
        oldState?.configurationFingerprint,
      );
      const approved = await approveReplacement(callId);
      expect(
        (await publishApprovedFundingCall(command(callId, approved.rowVersion)))
          .kind,
      ).toBe("published");
      const pinned = await getDatabase().transaction((transaction) =>
        validateApplicationSubmissionState(transaction, {
          actorId: versionOwnerId,
          applicationId: first.applicationId,
          lockApplication: true,
          now: new Date(),
        }),
      );
      expect(pinned?.configuration).toMatchObject({
        formVersionId,
        eligibilityRuleSetVersionId: rulesVersionId,
        workflowTemplateVersionId: workflowVersionId,
      });
      expect(pinned?.configuration?.closesAt.getUTCFullYear()).toBe(2099);
      expect(pinned?.publicationRevision?.id).toBe(
        call.currentPublishedVersionId,
      );
      expect(
        pinned?.readiness?.blockers.map((item) => item.code),
      ).not.toContain("CONFIGURATION_UNAVAILABLE");
      const preflight = await preflightOwnedApplication({
        actorId: versionOwnerId,
        applicationId: first.applicationId,
      });
      expect(preflight?.blockers).toEqual([]);
      const submitted = await submitOwnedApplication({
        actorId: versionOwnerId,
        applicationId: first.applicationId,
        correlationId: randomUUID(),
        expectedApplicationRowVersion: preflight!.applicationRowVersion,
        finalConfirmation: true,
        idempotencyKey: randomUUID(),
        readinessToken: preflight!.readinessToken!,
      });
      expect(submitted.kind).toBe("submitted");
      if (submitted.kind !== "submitted")
        throw new Error("Pinned application not submitted");
      expect(submitted.result.workflowTemplateVersionId).toBe(
        workflowVersionId,
      );
      const runtime = await pool!.query(
        "SELECT workflow_template_version_id FROM app_workflow_instances WHERE application_id = $1",
        [first.applicationId],
      );
      expect(runtime.rows[0].workflow_template_version_id).toBe(
        workflowVersionId,
      );
      expect((await createDraft(callId)).kind).toBe("duplicate");
      const newcomerId = randomUUID();
      await pool!.query(
        "INSERT INTO app_users(id, email, display_name) VALUES ($1, $2, 'Synthetic newcomer')",
        [newcomerId, `${newcomerId}@example.test`],
      );
      const newcomer = await createDraft(callId, newcomerId);
      if (!("applicationId" in newcomer))
        throw new Error("New draft not created");
      const persisted = await pool!.query(
        "SELECT funding_call_version_id, form_version_id FROM app_applications WHERE id = $1",
        [newcomer.applicationId],
      );
      expect(persisted.rows[0]).toMatchObject({
        funding_call_version_id: (await readFundingCallById(callId))!
          .currentPublishedVersionId,
        form_version_id: replacements.formVersionId,
      });
    });
  },
);
