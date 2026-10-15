import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowFormDocumentRepository",
  () => ({
    refreshFormDocumentRequirements: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallPublicationEffectsRepository",
  () => ({ capturePublicationEffects: vi.fn() }),
);
vi.mock(
  "@/modules/eligibility/infrastructure/EligibilityIntegrationVersionBindingRepository",
  () => ({ publishCallIntegrationBindings: vi.fn() }),
);
import { publishAttachedFormVersions } from "@/modules/forms/infrastructure/FormCascadePublicationRepository";
import { publishAttachedWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowCascadePublicationRepository";
import {
  actorId,
  client,
  database,
  enabled,
  seedForm,
  statuses,
  workflowId,
} from "../support/CascadePublicationDatabaseFixture";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { capturePublicationEffects } from "@/modules/funding-calls/infrastructure/FundingCallPublicationEffectsRepository";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
(enabled ? describe : describe.skip)(
  "funding-call cascade PostgreSQL transactions",
  () => {
    it.each([false, true])(
      "funding-call cascade is atomic (fail final effects: %s)",
      async (failEffects) => {
        const formId = await seedForm();
        const taskFormId = await seedForm();
        const callId = randomUUID();
        const eligibilityId = randomUUID();
        await client.query(
          "INSERT INTO app_eligibility_rule_set_versions (id, status) VALUES ($1,'PUBLISHED')",
          [eligibilityId],
        );
        await database.insert(fundingCalls).values({
          id: callId,
          reference: callId,
          slug: callId,
          title: "Call",
          description: "Call description",
          totalBudgetEnvelope: "100000",
          minimumGrantAmount: "100",
          maximumGrantAmount: "10000",
          status: "APPROVED",
          rowVersion: 1,
          formVersionId: formId,
          workflowTemplateVersionId: workflowId,
          eligibilityRuleSetVersionId: eligibilityId,
          opensAt: new Date("2027-01-01"),
          closesAt: new Date("2027-12-31"),
          createdBy: actorId,
          updatedBy: actorId,
        });
        const authorize = vi.fn();
        const input = {
          actorId,
          correlationId: randomUUID(),
          expectedRowVersion: 1,
          fundingCallId: callId,
          idempotencyKey: randomUUID(),
          now: new Date("2026-10-15"),
          prepareDependencies: async (
            transaction: Parameters<typeof publishAttachedFormVersions>[0],
          ) => {
            await publishAttachedWorkflowVersion(transaction, {
              actorId,
              versionId: workflowId,
              correlationId: randomUUID(),
              idempotencyKey: randomUUID(),
              authorize,
              preparePublication: (tx) =>
                publishAttachedFormVersions(
                  tx,
                  [formId, taskFormId],
                  actorId,
                  authorize,
                ),
            });
          },
        };
        if (failEffects) {
          vi.mocked(capturePublicationEffects).mockRejectedValueOnce(
            new Error("Effects failed"),
          );
          await expect(publishApprovedFundingCall(input)).rejects.toThrow(
            "Effects failed",
          );
          expect(
            (await statuses()).every((row) => row.status === "DRAFT"),
          ).toBe(true);
          expect(
            (
              await client.query(
                "SELECT status FROM app_workflow_definition_versions",
              )
            ).rows[0].status,
          ).toBe("DRAFT");
          expect(
            (await client.query("SELECT status FROM app_funding_calls")).rows[0]
              .status,
          ).toBe("APPROVED");
          expect(
            (
              await client.query(
                "SELECT id FROM app_funding_call_lifecycle_history",
              )
            ).rows,
          ).toHaveLength(0);
          expect(
            (
              await client.query(
                "SELECT id FROM app_funding_call_publication_revisions",
              )
            ).rows,
          ).toHaveLength(0);
        } else {
          expect((await publishApprovedFundingCall(input)).kind).toBe(
            "published",
          );
          expect(
            (await statuses()).every((row) => row.status === "PUBLISHED"),
          ).toBe(true);
          expect(
            (
              await client.query(
                "SELECT status FROM app_workflow_definition_versions",
              )
            ).rows[0].status,
          ).toBe("PUBLISHED");
          expect(
            (await client.query("SELECT status FROM app_funding_calls")).rows[0]
              .status,
          ).toBe("SCHEDULED");
          const count = authorize.mock.calls.length;
          expect((await publishApprovedFundingCall(input)).kind).toBe(
            "replayed",
          );
          expect(authorize).toHaveBeenCalledTimes(count);
        }
      },
    );
  },
);
