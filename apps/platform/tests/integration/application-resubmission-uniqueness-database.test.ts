import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDatabase } from "@/db/client";
import { createApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import { findApplicationPolicyConflict } from "@/modules/applications/infrastructure/ApplicationDuplicatePolicyRepository";
import { withdrawOwnedApplication } from "@/modules/applications/infrastructure/ApplicationWithdrawalRepository";
import { seedWithdrawalPolicyScenario } from "../support/ApplicantWithdrawalPolicyDatabaseFixture";

const enabled = process.env.RUN_WITHDRAWAL_POLICY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("Resubmission test database is not configured.");
  return pool.query(text, values);
}

afterAll(async () => pool?.end());

const duplicatePolicies = ["one_per_business", "one_per_applicant"] as const;

(enabled ? describe : describe.skip)(
  "resubmission with historical application policies in PostgreSQL",
  () => {
    it.each(duplicatePolicies)(
      "allows one replacement under %s when withdrawn history disabled resubmission",
      async (duplicatePolicy) => {
        const scenario = await seedWithdrawalPolicyScenario(query, {
          allowResubmission: true,
          applicationAllowResubmission: false,
          duplicatePolicy,
        });
        await withdrawOwnedApplication({
          actorId: scenario.ownerId,
          applicationId: scenario.applicationId,
          correlationId: randomUUID(),
          idempotencyKey: randomUUID(),
          reason: "Application withdrawn before resubmission was enabled.",
        });
        const input = {
          actorUserId: scenario.ownerId,
          businessId: scenario.businessId,
          correlationId: randomUUID(),
          fundingCallIdOrSlug: scenario.callId,
          idempotencyKey: randomUUID(),
          requestFingerprint: randomUUID(),
        };
        const outcomes = await Promise.all([
          createApplicationDraft(input),
          createApplicationDraft({ ...input, idempotencyKey: randomUUID() }),
        ]);
        expect(outcomes.map((outcome) => outcome.kind).sort())
          .toEqual(["created", "duplicate"]);
        const created = outcomes.find((outcome) => outcome.kind === "created");
        if (!created || !("applicationId" in created)) {
          throw new Error("Replacement application was not created.");
        }
        const state = await query(
          `SELECT id, status, allow_resubmission_after_withdrawal AS resubmission,
            (SELECT count(*)::int FROM app_application_draft_responses
             WHERE application_id = app_applications.id) AS responses,
            (SELECT count(*)::int FROM app_application_audit_entries
             WHERE application_id = app_applications.id
               AND action = 'APPLICATION_DRAFT_CREATED') AS creation_audits
           FROM app_applications WHERE id IN ($1, $2) ORDER BY status`,
          [created.applicationId, scenario.applicationId],
        );
        expect(state.rows).toEqual([
          {
            id: created.applicationId,
            status: "draft",
            resubmission: true,
            responses: 1,
            creation_audits: 1,
          },
          {
            id: scenario.applicationId,
            status: "withdrawn",
            resubmission: false,
            responses: 0,
            creation_audits: 0,
          },
        ]);
        await expect(
          getDatabase().transaction((transaction) =>
            findApplicationPolicyConflict(transaction, {
              applicationId: created.applicationId,
              ownerUserId: scenario.ownerId,
              businessId: scenario.businessId,
              fundingCallId: scenario.callId,
              duplicatePolicy,
              allowResubmissionAfterWithdrawal: true,
            }),
          ),
        ).resolves.toBeNull();
        await expect(
          query(
            `INSERT INTO app_applications
              (owner_user_id, business_id, funding_opportunity_id,
               funding_opportunity_title, duplicate_policy,
               allow_resubmission_after_withdrawal)
             VALUES ($1, $2, $3, 'Duplicate active application', $4, true)`,
            [scenario.ownerId, scenario.businessId, scenario.callId, duplicatePolicy],
          ),
        ).rejects.toMatchObject({ code: "23505" });
      },
    );

    it.each(duplicatePolicies)(
      "rejects replacements under %s when the published call disables resubmission",
      async (duplicatePolicy) => {
        const scenario = await seedWithdrawalPolicyScenario(query, {
          allowResubmission: false,
          applicationAllowResubmission: true,
          duplicatePolicy,
        });
        await withdrawOwnedApplication({
          actorId: scenario.ownerId,
          applicationId: scenario.applicationId,
          correlationId: randomUUID(),
          idempotencyKey: randomUUID(),
          reason: "Withdrawn application with an older permissive policy.",
        });
        await expect(createApplicationDraft({
          actorUserId: scenario.ownerId,
          businessId: scenario.businessId,
          correlationId: randomUUID(),
          fundingCallIdOrSlug: scenario.callId,
          idempotencyKey: randomUUID(),
          requestFingerprint: randomUUID(),
        })).resolves.toEqual({ kind: "resubmission_not_allowed" });
        const applications = await query(
          `SELECT count(*)::int AS count FROM app_applications
           WHERE funding_opportunity_id = $1`,
          [scenario.callId],
        );
        expect(applications.rows).toEqual([{ count: 1 }]);
      },
    );
  },
);
