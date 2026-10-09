import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
import { enabled, pool } from "../support/FundingCallVersionDatabaseHarness";
import {
  seedVersionBindings,
  versionActorId,
} from "../support/FundingCallVersionDatabaseFixture";
import {
  cloneFormVersion,
  saveFormDraft,
  publishFormVersion,
} from "@/modules/forms/infrastructure/FormWriteRepository";
import {
  getFormEditor,
  listPublishedFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  findEligibilityRuleSet,
  findEligibilityRuleSetVersion,
  publishEligibilityRuleSetVersion,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { updateEligibilityRuleSetDefinition } from "@/modules/eligibility/infrastructure/EligibilityRuleSetWriteRepository";

(enabled ? describe : describe.skip)(
  "asset metadata publication isolation",
  () => {
    it("keeps form metadata on the draft and preserves earlier published names after publication", async () => {
      const source = await seedVersionBindings(pool!);
      const draft = (await cloneFormVersion({
        actorId: versionActorId,
        definitionId: source.formId,
        sourceVersionId: source.formVersionId,
      }))!;
      const sectionId = crypto.randomUUID();
      const saved = (await saveFormDraft({
        actorId: versionActorId,
        definitionId: source.formId,
        versionId: draft.id,
        expectedRowVersion: draft.rowVersion,
        name: "Replacement form",
        description: "Replacement description",
        submitLabel: "Apply",
        sections: [
          {
            id: sectionId,
            key: "PROJECT",
            title: "Project",
            description: "",
            order: 1,
            columnSpan: 1,
            showContainer: true,
          },
        ],
        fields: [
          {
            sectionId,
            key: "PROJECT",
            label: "Project",
            type: "TEXT",
            columnSpan: 1,
            order: 1,
            required: false,
          },
        ],
      }))!;
      expect(
        (await getFormEditor(source.formId, draft.id))?.definition.name,
      ).toBe("Replacement form");
      expect(
        (await getFormEditor(source.formId, source.formVersionId))?.definition
          .name,
      ).toBe("Synthetic application form");
      expect(
        (
          await pool!.query(
            "SELECT name FROM app_form_definitions WHERE id=$1",
            [source.formId],
          )
        ).rows[0].name,
      ).toBe("Synthetic application form");
      expect(
        (
          await publishFormVersion({
            actorId: versionActorId,
            definitionId: source.formId,
            versionId: draft.id,
            expectedRowVersion: saved.rowVersion,
          })
        ).kind,
      ).toBe("published");
      expect(
        (await getFormEditor(source.formId, source.formVersionId))?.definition
          .name,
      ).toBe("Synthetic application form");
      const published = (await listPublishedFormVersions()).filter(
        (row) => row.definitionId === source.formId,
      );
      expect(published.map((row) => row.formName)).toEqual([
        "Replacement form",
        "Synthetic application form",
      ]);
      await expect(
        pool!.query(
          "UPDATE app_form_versions SET metadata='{}', row_version=row_version+1 WHERE id=$1",
          [source.formVersionId],
        ),
      ).rejects.toThrow(/metadata is immutable/);
      const oldSourceDraft = (await cloneFormVersion({
        actorId: versionActorId,
        definitionId: source.formId,
        sourceVersionId: source.formVersionId,
      }))!;
      expect(oldSourceDraft.metadata.name).toBe("Synthetic application form");
    });

    it("creates or resumes a ruleset draft for metadata edits without changing published definitions", async () => {
      const source = await seedVersionBindings(pool!);
      const update = {
        actorId: versionActorId,
        ruleSetId: source.rulesId,
        code: source.rulesId,
        name: "Replacement rules",
        description: "Draft description",
      };
      expect((await updateEligibilityRuleSetDefinition(update))?.name).toBe(
        "Replacement rules",
      );
      const draft = (await findEligibilityRuleSet(source.rulesId))!;
      expect(draft.version.status).toBe("DRAFT");
      expect(
        (await findEligibilityRuleSetVersion(source.rulesVersionId))?.definition
          .name,
      ).toBe("Synthetic rules");
      await updateEligibilityRuleSetDefinition({
        ...update,
        description: "Final draft description",
      });
      const saved = (await findEligibilityRuleSet(source.rulesId))!;
      expect(saved.version.id).toBe(draft.version.id);
      expect(
        (
          await pool!.query(
            "SELECT name FROM app_eligibility_rule_sets WHERE id=$1",
            [source.rulesId],
          )
        ).rows[0].name,
      ).toBe("Synthetic rules");
      expect(
        await publishEligibilityRuleSetVersion({
          actorId: versionActorId,
          ruleSetId: source.rulesId,
          versionId: saved.version.id,
          expectedRowVersion: saved.version.rowVersion,
        }),
      ).not.toBeNull();
      expect(
        (await findEligibilityRuleSetVersion(source.rulesVersionId))?.definition
          .name,
      ).toBe("Synthetic rules");
      expect(
        (await findEligibilityRuleSetVersion(saved.version.id))?.definition
          .description,
      ).toBe("Final draft description");
      await expect(
        pool!.query(
          "UPDATE app_eligibility_rule_set_versions SET metadata='{}', row_version=row_version+1 WHERE id=$1",
          [source.rulesVersionId],
        ),
      ).rejects.toThrow(/metadata is immutable/);
    });
  },
);
