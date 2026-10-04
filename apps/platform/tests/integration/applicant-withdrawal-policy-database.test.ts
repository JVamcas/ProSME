import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDatabase } from "@/db/client";
import { readOwnedApplicationStatus } from "@/modules/applications/infrastructure/ApplicationListRepository";
import { createApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import { findApplicationPolicyConflict } from "@/modules/applications/infrastructure/ApplicationDuplicatePolicyRepository";
import { withdrawOwnedApplication } from "@/modules/applications/infrastructure/ApplicationWithdrawalRepository";
import { seedWithdrawalPolicyScenario } from "../support/ApplicantWithdrawalPolicyDatabaseFixture";

const enabled = process.env.RUN_WITHDRAWAL_POLICY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const query = async (text: string, values: unknown[] = []) => {
  if (!pool) throw new Error("Withdrawal test database is not configured.");
  return pool.query(text, values);
};
afterAll(async () => pool?.end());

function command(scenario: { applicationId: string; ownerId: string }) {
  return {
    actorId: scenario.ownerId,
    applicationId: scenario.applicationId,
    correlationId: randomUUID(),
    idempotencyKey: randomUUID(),
    reason: "Applicant no longer requires funding.",
  };
}

function createCommand(scenario: {
  callId: string;
  ownerId: string;
  businessId: string;
}) {
  return {
    actorUserId: scenario.ownerId,
    businessId: scenario.businessId,
    correlationId: randomUUID(),
    fundingCallIdOrSlug: scenario.callId,
    idempotencyKey: randomUUID(),
    requestFingerprint: randomUUID(),
  };
}

(enabled ? describe : describe.skip)(
  "applicant withdrawal policy in PostgreSQL",
  () => {
    it("defaults withdrawal to allowed and rejects another applicant", async () => {
      const scenario = await seedWithdrawalPolicyScenario(query);
      expect(
        (
          await readOwnedApplicationStatus(
            scenario.ownerId,
            scenario.applicationId,
          )
        )?.canWithdraw,
      ).toBe(true);
      const other = await seedWithdrawalPolicyScenario(query);
      await expect(
        withdrawOwnedApplication({
          ...command(scenario),
          actorId: other.ownerId,
        }),
      ).resolves.toEqual({ kind: "not_found" });
      const stages = await query(
        `SELECT allow_applicant_withdrawal FROM app_workflow_stage_definitions
       WHERE version_id = $1`,
        [scenario.versionId],
      );
      expect(stages.rows).toEqual([
        { allow_applicant_withdrawal: true },
        { allow_applicant_withdrawal: true },
      ]);
    });

    it.each([
      {
        allowedStages: [false, true] as [boolean, boolean],
        secondStageStatus: "ACTIVE" as const,
        expected: true,
      },
      {
        allowedStages: [false, true] as [boolean, boolean],
        secondStageStatus: "BLOCKED" as const,
        expected: true,
      },
      {
        allowedStages: [false, false] as [boolean, boolean],
        secondStageStatus: "ACTIVE" as const,
        expected: false,
      },
      {
        allowedStages: [false, true] as [boolean, boolean],
        secondStageStatus: "COMPLETED" as const,
        expected: false,
      },
      {
        allowedStages: [false, true] as [boolean, boolean],
        secondStageStatus: "NOT_STARTED" as const,
        expected: false,
      },
    ])(
      "matches portal and server policy for $secondStageStatus / $allowedStages",
      async (options) => {
        const scenario = await seedWithdrawalPolicyScenario(query, options);
        expect(
          (
            await readOwnedApplicationStatus(
              scenario.ownerId,
              scenario.applicationId,
            )
          )?.canWithdraw,
        ).toBe(options.expected);
        expect((await withdrawOwnedApplication(command(scenario))).kind).toBe(
          options.expected ? "withdrawn" : "unavailable",
        );
        if (!options.expected) {
          const work = await query(
            `SELECT status FROM app_workflow_instances WHERE id = $1`,
            [scenario.workflowId],
          );
          expect(work.rows).toEqual([{ status: "ACTIVE" }]);
        }
      },
    );

    it("cancels all branches atomically and replays concurrent retries once", async () => {
      const scenario = await seedWithdrawalPolicyScenario(query, {
        allowedStages: [false, true],
        secondStageStatus: "BLOCKED",
      });
      const input = command(scenario);
      const results = await Promise.all([
        withdrawOwnedApplication(input),
        withdrawOwnedApplication(input),
      ]);
      expect(results[0].kind).toBe("withdrawn");
      expect(results[1]).toEqual(results[0]);
      const state = await query(
        `SELECT
        (SELECT status FROM app_applications WHERE id = $1) AS application_status,
        (SELECT terminal_outcome FROM app_workflow_instances WHERE id = $2) AS outcome,
        (SELECT count(*)::int FROM app_workflow_stage_instances
          WHERE workflow_instance_id = $2 AND status <> 'CANCELLED') AS open_stages,
        (SELECT count(*)::int FROM app_workflow_tasks task
          JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
          WHERE stage.workflow_instance_id = $2 AND task.status <> 'CANCELLED') AS open_tasks,
        (SELECT count(*)::int FROM app_workflow_action_executions
          WHERE workflow_instance_id = $2) AS executions`,
        [scenario.applicationId, scenario.workflowId],
      );
      expect(state.rows[0]).toEqual({
        application_status: "withdrawn",
        outcome: "WITHDRAWN",
        open_stages: 0,
        open_tasks: 0,
        executions: 1,
      });
      expect(
        (
          await readOwnedApplicationStatus(
            scenario.ownerId,
            scenario.applicationId,
          )
        )?.canWithdraw,
      ).toBe(false);
      await expect(
        withdrawOwnedApplication(command(scenario)),
      ).resolves.toEqual({ kind: "unavailable" });
    });

    it("keeps published stage settings immutable", async () => {
      const scenario = await seedWithdrawalPolicyScenario(query, {
        allowedStages: [false, false],
      });
      await expect(
        query(
          `UPDATE app_workflow_stage_definitions SET allow_applicant_withdrawal = true
       WHERE version_id = $1`,
          [scenario.versionId],
        ),
      ).rejects.toThrow("only draft workflow versions are editable");
    });

    it.each(["one_per_applicant", "one_per_business", "none"] as const)(
      "enforces the call resubmission switch with application limit %s",
      async (duplicatePolicy) => {
        const blocked = await seedWithdrawalPolicyScenario(query, {
          duplicatePolicy,
        });
        await withdrawOwnedApplication(command(blocked));
        await expect(
          createApplicationDraft(createCommand(blocked)),
        ).resolves.toEqual({ kind: "resubmission_not_allowed" });
        const allowed = await seedWithdrawalPolicyScenario(query, {
          allowResubmission: true,
          duplicatePolicy,
        });
        await withdrawOwnedApplication(command(allowed));
        const result = await createApplicationDraft(createCommand(allowed));
        expect(result.kind).toBe("created");
        if (!("applicationId" in result))
          throw new Error("Replacement application was not created.");
        expect(result.applicationId).not.toBe(allowed.applicationId);
        const replacement = await query(
          `SELECT status, allow_resubmission_after_withdrawal FROM app_applications WHERE id = $1`,
          [result.applicationId],
        );
        expect(replacement.rows).toEqual([
          {
            status: "draft",
            allow_resubmission_after_withdrawal: true,
          },
        ]);
        // Submission uses exactly the same conflict query, excluding its own draft.
        await expect(
          getDatabase().transaction((transaction) =>
            findApplicationPolicyConflict(transaction, {
              applicationId: result.applicationId,
              ownerUserId: allowed.ownerId,
              businessId: allowed.businessId,
              fundingCallId: allowed.callId,
              duplicatePolicy,
              allowResubmissionAfterWithdrawal: true,
            }),
          ),
        ).resolves.toBeNull();
        await expect(
          createApplicationDraft(createCommand(allowed)),
        ).resolves.toMatchObject({
          kind: duplicatePolicy === "none" ? "created" : "duplicate",
        });
        if (duplicatePolicy !== "none") {
          await expect(
            query(
              `INSERT INTO app_applications
            (owner_user_id, business_id, funding_opportunity_id, funding_opportunity_title,
             duplicate_policy, allow_resubmission_after_withdrawal)
           VALUES ($1, $2, $3, 'Duplicate replacement', $4, true)`,
              [
                allowed.ownerId,
                allowed.businessId,
                allowed.callId,
                duplicatePolicy,
              ],
            ),
          ).rejects.toMatchObject({ code: "23505" });
        }
        await expect(
          query(
            `UPDATE app_applications SET allow_resubmission_after_withdrawal = false,
          row_version = row_version + 1 WHERE id = $1`,
            [result.applicationId],
          ),
        ).rejects.toThrow(/resubmission policy is immutable/);
      },
    );

    it("does not bypass the call submission window for a replacement", async () => {
      const scenario = await seedWithdrawalPolicyScenario(query, {
        allowResubmission: true,
      });
      await withdrawOwnedApplication(command(scenario));
      await query(
        `UPDATE app_funding_calls SET status = 'CLOSED', row_version = row_version + 1 WHERE id = $1`,
        [scenario.callId],
      );
      await expect(
        createApplicationDraft(createCommand(scenario)),
      ).resolves.toEqual({ kind: "unavailable" });
    });
  },
);
