import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
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

import { enabled, pool } from "../support/FundingCallVersionDatabaseHarness";
import {
  seedVersionBindings,
  versionActorId,
} from "../support/FundingCallVersionDatabaseFixture";
import {
  cloneFormVersion,
  saveFormDraft,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import { cloneEligibilityRuleSetVersion } from "@/modules/eligibility/infrastructure/EligibilityRuleSetCloneRepository";

(enabled ? describe : describe.skip)(
  "drafts from the selected published version",
  () => {
    it("preserves legacy drafts with unknown sources and supports repeatable migration", async () => {
      const binding = await seedVersionBindings(pool!);
      const legacyId = randomUUID();
      await pool!.query(
        `INSERT INTO app_form_versions
         (id, form_definition_id, version_number, status, created_by, metadata)
         VALUES ($1, $2, 2, 'DRAFT', $3, '{"name":"Legacy draft"}')`,
        [legacyId, binding.formId, versionActorId],
      );
      const migration = readFileSync(
        path.resolve(process.cwd(), "drizzle/0187_version_draft_sources.sql"),
        "utf8",
      );
      await pool!.query(migration);
      await pool!.query(migration);
      const draft = (await cloneFormVersion({
        actorId: versionActorId,
        definitionId: binding.formId,
        sourceVersionId: binding.formVersionId,
      }))!;
      expect(draft.id).not.toBe(legacyId);
      expect(draft.metadata.name).toBe("Synthetic application form");
      expect(
        (
          await pool!.query(
            "SELECT metadata, source_version_id FROM app_form_versions WHERE id=$1",
            [legacyId],
          )
        ).rows[0],
      ).toMatchObject({
        metadata: { name: "Legacy draft" },
        source_version_id: null,
      });
    });
    it("copies the selected form and resumes only its draft while preserving other drafts", async () => {
      const binding = await seedVersionBindings(pool!);
      const latestId = randomUUID();
      const sectionId = randomUUID();
      await pool!.query(
        `INSERT INTO app_form_sections (id, form_version_id, key, title, display_order)
         VALUES ($1, $2, 'ORIGINAL', 'Original section', 1)`,
        [sectionId, binding.formVersionId],
      );
      await pool!.query(
        `INSERT INTO app_form_fields
         (form_version_id, section_id, key, label, type, display_order)
         VALUES ($1, $2, 'ORIGINAL_FIELD', 'Original field', 'TEXT', 1)`,
        [binding.formVersionId, sectionId],
      );
      await pool!.query(
        `INSERT INTO app_form_versions
      (id, form_definition_id, version_number, status, created_by, metadata, instructions)
      VALUES ($1, $2, 2, 'PUBLISHED', $3, '{"name":"Latest form"}', 'Latest instructions')`,
        [latestId, binding.formId, versionActorId],
      );
      const newestDraft = (await cloneFormVersion({
        actorId: versionActorId,
        definitionId: binding.formId,
        sourceVersionId: latestId,
      }))!;
      const [oldDraft, replay] = await Promise.all(
        [0, 1].map(() =>
          cloneFormVersion({
            actorId: versionActorId,
            definitionId: binding.formId,
            sourceVersionId: binding.formVersionId,
          }),
        ),
      );
      expect(oldDraft?.id).toBe(replay?.id);
      expect(oldDraft?.id).not.toBe(newestDraft.id);
      expect(oldDraft?.metadata.name).toBe("Synthetic application form");
      expect(oldDraft?.instructions).toBeNull();
      expect(oldDraft?.sourceVersionId).toBe(binding.formVersionId);
      expect(
        (
          await pool!.query(
            "SELECT key FROM app_form_fields WHERE form_version_id=$1",
            [oldDraft!.id],
          )
        ).rows,
      ).toEqual([{ key: "ORIGINAL_FIELD" }]);
      expect(
        (
          await cloneFormVersion({
            actorId: versionActorId,
            definitionId: binding.formId,
            sourceVersionId: latestId,
          })
        )?.id,
      ).toBe(newestDraft.id);
      await saveFormDraft({
        actorId: versionActorId,
        definitionId: binding.formId,
        expectedRowVersion: 1,
        versionId: newestDraft.id,
        fields: [],
        sections: [],
        submitLabel: "Latest draft submit",
      });
      expect(
        (
          await pool!.query(
            "SELECT submit_label FROM app_form_versions WHERE id=$1",
            [oldDraft!.id],
          )
        ).rows[0].submit_label,
      ).toBe("Submit");
      await saveFormDraft({
        actorId: versionActorId,
        definitionId: binding.formId,
        expectedRowVersion: 1,
        fields: [],
        sections: [],
        submitLabel: "Default draft submit",
      });
      expect(
        (
          await pool!.query(
            "SELECT submit_label FROM app_form_versions WHERE id=$1",
            [newestDraft.id],
          )
        ).rows[0].submit_label,
      ).toBe("Latest draft submit");
    });

    it("copies selected ruleset questions and resumes its draft rather than a newer draft", async () => {
      const binding = await seedVersionBindings(pool!);
      const latestId = randomUUID();
      await pool!.query(
        `INSERT INTO app_eligibility_rule_set_versions
      (id, rule_set_id, version_number, status, created_by, metadata)
      VALUES ($1, $2, 2, 'PUBLISHED', $3, '{"name":"Latest rules"}')`,
        [latestId, binding.rulesId, versionActorId],
      );
      await pool!.query(
        `INSERT INTO app_eligibility_input_definitions
      (version_id, stable_key, label, data_type, available_in, display_order, created_by, updated_by)
      VALUES ($1, 'original', 'Original input', 'NUMBER', '{SELF_CHECK}', 1, $2, $2)`,
        [binding.rulesVersionId, versionActorId],
      );
      const latest = (await cloneEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: binding.rulesId,
        sourceVersionId: latestId,
      }))!;
      const old = (await cloneEligibilityRuleSetVersion({
        actorId: versionActorId,
        ruleSetId: binding.rulesId,
        sourceVersionId: binding.rulesVersionId,
      }))!;
      expect(old.id).not.toBe(latest.id);
      expect(old.metadata.name).toBe("Synthetic rules");
      expect(old.sourceVersionId).toBe(binding.rulesVersionId);
      expect(
        (
          await pool!.query(
            "SELECT stable_key FROM app_eligibility_input_definitions WHERE version_id=$1",
            [old.id],
          )
        ).rows,
      ).toEqual([{ stable_key: "original" }]);
      expect(
        (
          await cloneEligibilityRuleSetVersion({
            actorId: versionActorId,
            ruleSetId: binding.rulesId,
            sourceVersionId: latestId,
          })
        )?.id,
      ).toBe(latest.id);
    });
  },
);
