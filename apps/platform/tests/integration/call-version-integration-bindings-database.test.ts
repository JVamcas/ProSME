import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    PAYLOAD_SECRET: "synthetic-version-test-token-secret",
  }),
}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallNotificationRepository",
  () => ({ captureFundingCallNotification: vi.fn() }),
);
vi.mock(
  "@/modules/notifications/application/ServerNotificationOccurrenceService",
  () => ({ captureNotificationOccurrence: vi.fn() }),
);

import {
  enabled,
  pool,
  command,
  approveReplacement,
  createDraft,
} from "../support/FundingCallVersionDatabaseHarness";
import {
  seedVersionCall,
  seedVersionBindings,
  versionActorId,
} from "../support/FundingCallVersionDatabaseFixture";
import {
  bindEligibilityIntegration,
  readEligibilityIntegrationSources,
  readApplicationIntegrationBinding,
} from "@/modules/eligibility/infrastructure/EligibilityIntegrationBindingRepository";
import {
  createEligibilityIntegration,
  publishEligibilityIntegrationVersion,
} from "@/modules/eligibility/infrastructure/EligibilityIntegrationRepository";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { createFundingCallReplacement } from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import {
  readFundingCallById,
  readEffectiveFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { cloneEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository";
import { publishEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { readWorkflowEligibilityFormPreviews } from "@/modules/workflows/infrastructure/WorkflowEligibilityPreviewRepository";

import { readEligibilityRuleSetContexts } from "@/modules/funding-calls/infrastructure/FundingCallEligibilityContextRepository";
import { cloneFundingCallRecord } from "@/modules/funding-calls/infrastructure/FundingCallCommandRepository";

async function createPublishedIntegrationContext() {
  const source = await seedVersionCall(pool!);
  await pool!.query(
    "UPDATE app_funding_calls SET status='DRAFT', application_duplicate_policy='none', allow_resubmission_after_withdrawal=true, row_version=row_version+1 WHERE id=$1",
    [source.callId],
  );
  const integration = await createEligibilityIntegration(versionActorId, {
    definition: {
      stableKey: `provider_${crypto.randomUUID().replaceAll("-", "")}`,
      name: "Synthetic register",
      description: "",
    },
    version: {
      outputSchema: [
        {
          key: "registered",
          label: "Registered",
          description: "",
          type: "BOOLEAN",
          eligibleForScreening: true,
        },
      ],
      rawResponsePolicy: { kind: "DISCARD" },
      retryPolicy: { initialBackoffMs: 0, maxAttempts: 1, timeoutMs: 1000 },
    },
  });
  await publishEligibilityIntegrationVersion(
    versionActorId,
    integration.version.id,
  );
  const input = {
    integrationVersionId: integration.version.id,
    manualFallbackAllowed: false,
    providerAdapterKey: "original_provider",
    providerDisplayName: "Original provider",
    secretReference: null,
  };
  const bound = await bindEligibilityIntegration(
    versionActorId,
    source.callId,
    input,
  );
  expect(bound.kind).toBe("BOUND");
  if (bound.kind !== "BOUND") throw new Error("Initial binding failed");
  await pool!.query(
    "UPDATE app_funding_calls SET status='APPROVED', row_version=row_version+1 WHERE id=$1",
    [source.callId],
  );
  let call = (await readFundingCallById(source.callId))!;
  expect(
    (await publishApprovedFundingCall(command(call.id, call.rowVersion))).kind,
  ).toBe("published");
  call = (await readFundingCallById(source.callId))!;
  const oldDraft = await createDraft(call.id);
  expect(oldDraft.kind).toBe("created");
  if (oldDraft.kind !== "created")
    throw new Error("Application creation failed");
  await pool!.query(
    "INSERT INTO app_workflow_instances (application_id, workflow_template_version_id) VALUES ($1,$2)",
    [oldDraft.applicationId, source.workflowVersionId],
  );
  expect(
    await readApplicationIntegrationBinding(
      oldDraft.applicationId,
      bound.binding.id,
    ),
  ).not.toBeNull();
  return { source, input, bound, call, oldDraft };
}

(enabled ? describe : describe.skip)(
  "replacement integration bindings and previews",
  () => {
    it("isolates replacement bindings until publication and preserves old application bindings", async () => {
      const { source, input, bound, call, oldDraft } =
        await createPublishedIntegrationContext();
      const replacement = (await createFundingCallReplacement(
        versionActorId,
        call.id,
        call.rowVersion,
      ))!;
      const target = await seedVersionBindings(pool!);
      const rulesDraft = (await cloneEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: target.rulesId,
        sourceVersionId: target.rulesVersionId,
      }))!;
      await publishEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: target.rulesId,
        versionId: rulesDraft.id,
        expectedRowVersion: rulesDraft.rowVersion,
      });
      const saved = (await updateDraftFundingCall(versionActorId, call.id, {
        ...replacement,
        title: "Replacement context",
        workflowTemplateVersionId: target.workflowVersionId,
        eligibilityRuleSetVersionId: rulesDraft.id,
        opensAt: replacement.opensAt.toISOString(),
        closesAt: replacement.closesAt.toISOString(),
        expectedRowVersion: replacement.rowVersion,
      }))!;
      expect(await readEligibilityRuleSetContexts(rulesDraft.id)).toEqual([
        expect.objectContaining({
          id: call.id,
          draftVersionId: replacement.draftVersionId,
          currentPublishedVersionId: null,
        }),
      ]);
      expect(
        await readWorkflowEligibilityFormPreviews(
          target.workflowId,
          target.workflowVersionId,
        ),
      ).toEqual([
        expect.objectContaining({
          fundingCallId: call.id,
          fundingCallTitle: "Replacement context",
          eligibilityRuleSetVersionId: rulesDraft.id,
          formVersionId: expect.any(String),
        }),
      ]);
      expect(
        await readWorkflowEligibilityFormPreviews(
          source.workflowId,
          source.workflowVersionId,
        ),
      ).toEqual([
        expect.objectContaining({ fundingCallTitle: "Original version" }),
      ]);
      const replacementBinding = await bindEligibilityIntegration(
        versionActorId,
        call.id,
        {
          ...input,
          providerAdapterKey: "replacement_provider",
          providerDisplayName: "Replacement provider",
        },
      );
      expect(replacementBinding.kind).toBe("BOUND");
      if (replacementBinding.kind !== "BOUND")
        throw new Error("Replacement binding failed");
      expect(replacementBinding.binding.id).not.toBe(bound.binding.id);
      expect(replacementBinding.binding.workflowTemplateVersionId).toBe(
        target.workflowVersionId,
      );
      expect(
        (
          await readEligibilityIntegrationSources([
            (await readEffectiveFundingCallById(call.id))!,
          ])
        )[0].label,
      ).toContain("Original provider");
      expect(
        (
          await readEligibilityIntegrationSources([
            { ...saved, draftVersionId: replacement.draftVersionId },
          ])
        )[0].label,
      ).toContain("Replacement provider");
      expect(
        await readApplicationIntegrationBinding(
          oldDraft.applicationId,
          replacementBinding.binding.id,
        ),
      ).toBeNull();
      const approved = await approveReplacement(call.id);
      expect(
        (await bindEligibilityIntegration(versionActorId, call.id, input)).kind,
      ).toBe("NOT_BINDABLE");
      expect(
        (
          await publishApprovedFundingCall(
            command(call.id, approved.rowVersion),
          )
        ).kind,
      ).toBe("published");
      expect(
        (
          await readEligibilityIntegrationSources([
            (await readEffectiveFundingCallById(call.id))!,
          ])
        )[0].label,
      ).toContain("Replacement provider");
      expect(
        (
          await readApplicationIntegrationBinding(
            oldDraft.applicationId,
            bound.binding.id,
          )
        )?.providerDisplayName,
      ).toBe("Original provider");
      const newDraft = await createDraft(call.id);
      expect(newDraft.kind).toBe("created");
      if (newDraft.kind !== "created")
        throw new Error("New application creation failed");
      await pool!.query(
        "INSERT INTO app_workflow_instances (application_id, workflow_template_version_id) VALUES ($1,$2)",
        [newDraft.applicationId, target.workflowVersionId],
      );
      expect(
        await readApplicationIntegrationBinding(
          newDraft.applicationId,
          bound.binding.id,
        ),
      ).toBeNull();
      expect(
        (
          await readApplicationIntegrationBinding(
            newDraft.applicationId,
            replacementBinding.binding.id,
          )
        )?.providerDisplayName,
      ).toBe("Replacement provider");
      const cloned = await cloneFundingCallRecord(versionActorId, call.id);
      expect(cloned).not.toBeNull();
      const copied = await pool!.query(
        "SELECT provider_display_name FROM app_funding_call_eligibility_integration_bindings WHERE funding_call_id=$1",
        [cloned!.id],
      );
      expect(copied.rows).toEqual([
        { provider_display_name: "Replacement provider" },
      ]);
      await expect(
        pool!.query(
          "UPDATE app_funding_call_eligibility_integration_bindings SET provider_display_name='Tampered' WHERE id=$1",
          [bound.binding.id],
        ),
      ).rejects.toThrow(/bindings are immutable/);
      await expect(
        pool!.query(
          "UPDATE app_funding_call_version_integration_bindings SET binding_id=$1 WHERE funding_call_version_id=$2",
          [replacementBinding.binding.id, call.currentPublishedVersionId],
        ),
      ).rejects.toThrow(/links are immutable/);
    });
  },
);
