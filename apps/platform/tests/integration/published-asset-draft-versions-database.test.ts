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

import { enabled, pool } from "../support/FundingCallVersionDatabaseHarness";

import {
  versionActorId,
  seedVersionBindings,
} from "../support/FundingCallVersionDatabaseFixture";
import {
  cloneFormVersion,
  saveFormDraft,
  publishFormVersion,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import { cloneWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowTemplateWriteRepository";
import { updateWorkflowDefinitionDetails } from "@/modules/workflows/infrastructure/WorkflowDetailsRepository";
import { publishWorkflowVersion } from "@/modules/workflows/infrastructure/WorkflowLifecycleRepository";
import { publishEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { referenceWorkflow } from "../support/ReferenceWorkflowFixture";
import { cloneEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository";

(enabled ? describe : describe.skip)(
  "published assets and replacement drafts",
  () => {
    it("creates/resumes form and ruleset drafts without retiring the published originals", async () => {
      const binding = await seedVersionBindings(pool!);
      const form = (await cloneFormVersion({
        actorId: versionActorId,
        definitionId: binding.formId,
        sourceVersionId: binding.formVersionId,
      }))!;
      const same = await cloneFormVersion({
        actorId: versionActorId,
        definitionId: binding.formId,
        sourceVersionId: binding.formVersionId,
      });
      expect(same?.id).toBe(form.id);
      const saved = await saveFormDraft({
        actorId: versionActorId,
        definitionId: binding.formId,
        versionId: form.id,
        expectedRowVersion: form.rowVersion,
        fields: [
          {
            key: "PROJECT",
            label: "Project",
            type: "TEXT",
            required: false,
            order: 1,
            sectionId: "20000000-0000-4000-8000-000000000001",
            columnSpan: 1,
          },
        ],
        sections: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            key: "PROJECT",
            title: "Project",
            description: "",
            order: 1,
            columnSpan: 1,
            showContainer: true,
          },
        ],
        submitLabel: "Apply",
      });
      expect(saved?.id).toBe(form.id);
      expect(
        (
          await publishFormVersion({
            actorId: versionActorId,
            definitionId: binding.formId,
            versionId: form.id,
            expectedRowVersion: saved!.rowVersion,
          })
        ).kind,
      ).toBe("published");
      expect(
        (
          await pool!.query(
            "SELECT status FROM app_form_versions WHERE form_definition_id = $1 ORDER BY version_number",
            [binding.formId],
          )
        ).rows.map((row) => row.status),
      ).toEqual(["PUBLISHED", "PUBLISHED"]);
      const rules = (await cloneEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: binding.rulesId,
        sourceVersionId: binding.rulesVersionId,
      }))!;
      expect(
        (
          await cloneEligibilityRuleSetVersion({
            actorId: versionActorId,
            ruleSetId: binding.rulesId,
            sourceVersionId: binding.rulesVersionId,
          })
        )?.id,
      ).toBe(rules.id);
      expect(
        (
          await pool!.query(
            "SELECT status FROM app_eligibility_rule_set_versions WHERE id = $1",
            [binding.rulesVersionId],
          )
        ).rows[0].status,
      ).toBe("PUBLISHED");
    });
    it("copies dynamic eligibility inputs and leaves both published versions available", async () => {
      const binding = await seedVersionBindings(pool!);
      const inputId = randomUUID();
      await pool!.query(
        `INSERT INTO app_eligibility_input_definitions
        (id, version_id, stable_key, label, data_type, available_in, display_order, created_by, updated_by)
        VALUES ($1, $2, 'amount', 'Amount', 'NUMBER', '{SELF_CHECK,SCREENING}', 1, $3, $3)`,
        [inputId, binding.rulesVersionId, versionActorId],
      );
      await pool!.query(
        `INSERT INTO app_eligibility_self_check_questions
        (input_definition_id, prompt, answer_type) VALUES ($1, 'Requested amount?', 'NUMBER')`,
        [inputId],
      );
      await pool!.query(
        `INSERT INTO app_eligibility_screening_source_bindings
        (input_definition_id, source_kind, source_definition_id, source_key, value_path)
        VALUES ($1, 'FUNDING_CALL_FIELD', $2, 'maximumGrantAmount', 'maximumGrantAmount')`,
        [inputId, binding.rulesId],
      );
      const draft = (await cloneEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: binding.rulesId,
        sourceVersionId: binding.rulesVersionId,
      }))!;
      const copied = await pool!.query(
        `SELECT input.id, input.stable_key, question.prompt, source.value_path
        FROM app_eligibility_input_definitions input
        JOIN app_eligibility_self_check_questions question ON question.input_definition_id = input.id
        JOIN app_eligibility_screening_source_bindings source ON source.input_definition_id = input.id
        WHERE input.version_id = $1`,
        [draft.id],
      );
      expect(copied.rows[0]).toMatchObject({
        stable_key: "amount",
        prompt: "Requested amount?",
        value_path: "maximumGrantAmount",
      });
      expect(copied.rows[0].id).not.toBe(inputId);
      expect(
        await publishEligibilityRuleSetVersion({
          actorId: versionActorId,
          ruleSetId: binding.rulesId,
          versionId: draft.id,
          expectedRowVersion: draft.rowVersion,
        }),
      ).toMatchObject({ status: "PUBLISHED" });
      const versions = await pool!.query(
        "SELECT status FROM app_eligibility_rule_set_versions WHERE rule_set_id = $1 ORDER BY version_number",
        [binding.rulesId],
      );
      expect(versions.rows.map((row) => row.status)).toEqual([
        "PUBLISHED",
        "PUBLISHED",
      ]);
    });
  },
);

(enabled ? describe : describe.skip)(
  "published workflow metadata and replacement drafts",
  () => {
    it("resumes the workflow draft and publishes it without retiring the original", async () => {
      const binding = await seedVersionBindings(pool!);
      const graph = {
        stages: [
          {
            ...referenceWorkflow.stages[0],
            stableKey: "REVIEW",
            name: "Review",
            checklistItems: [],
            documentRequirements: [],
            actions: [],
            tasks: [],
          },
        ],
        transitions: [],
      };
      const input = {
        actorId: versionActorId,
        correlationId: randomUUID(),
        definitionId: binding.workflowId,
        sourceVersionId: binding.workflowVersionId,
        graph,
      };
      const draftId = await cloneWorkflowVersion(input);
      expect(await cloneWorkflowVersion(input)).toBe(draftId);
      await updateWorkflowDefinitionDetails({
        actorId: versionActorId,
        correlationId: randomUUID(),
        definitionId: binding.workflowId,
        versionId: draftId,
        expectedRowVersion: 1,
        code: binding.workflowId,
        name: "Replacement workflow",
        description: "Replacement description",
      });
      expect(
        (
          await pool!.query(
            "SELECT name FROM app_workflow_definitions WHERE id=$1",
            [binding.workflowId],
          )
        ).rows[0].name,
      ).toBe("Synthetic workflow");
      expect(
        await publishWorkflowVersion({
          actorId: versionActorId,
          correlationId: randomUUID(),
          expectedRowVersion: 2,
          idempotencyKey: randomUUID(),
          versionId: draftId,
        }),
      ).toMatchObject({ status: "PUBLISHED" });
      const versions = await pool!.query(
        "SELECT status FROM app_workflow_definition_versions WHERE definition_id = $1 ORDER BY version_number",
        [binding.workflowId],
      );
      expect(versions.rows.map((row) => row.status)).toEqual([
        "PUBLISHED",
        "PUBLISHED",
      ]);
      expect(
        (
          await pool!.query(
            "SELECT metadata FROM app_workflow_definition_versions WHERE id=$1",
            [binding.workflowVersionId],
          )
        ).rows[0].metadata.name,
      ).toBe("Synthetic workflow");
      expect(
        (
          await pool!.query(
            "SELECT name FROM app_workflow_definitions WHERE id=$1",
            [binding.workflowId],
          )
        ).rows[0].name,
      ).toBe("Synthetic workflow");
    });
  },
);
