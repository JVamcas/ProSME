import { normalizeLegacyTaskScoring } from "@/modules/workflows/engine/migration/LegacyTaskScoring";
import { describe, expect, it } from "vitest";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { runtimeDefinition } from "../../support/form-runtime";
import { convertTaskForm } from "@/modules/workflows/engine/migration/TaskFormConversion";
import {
  convertTaskFormConditionReferences,
  addTaskFormConditionMappings,
} from "@/modules/workflows/engine/migration/TaskFormConditionConversion";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";

function fixture() {
  const stage = structuredClone(referenceWorkflow.stages[0]);
  const task = stage.tasks[0];
  stage.checklistItems = [
    {
      taskStableKey: task.stableKey,
      key: "CHECK",
      text: "Confirm completeness",
      mandatory: true,
      responseType: "YES_NO",
      evidenceRequirement: "OPTIONAL",
      notes: "Check the details",
      displayOrder: 1,
    },
  ];
  stage.documentRequirements = [
    {
      taskStableKey: task.stableKey,
      stableKey: "EVIDENCE",
      name: "Evidence",
      mandatory: true,
      acceptedFileTypes: ["PDF"],
      maximumSizeMb: 20,
      expiryDays: 60,
      requestOnStageActivation: true,
      uploader: "APPLICANT",
      verifier: "STAFF",
      templateReference: "template",
    },
  ];
  stage.scoring = [
    {
      taskStableKey: task.stableKey,
      aggregation: "WEIGHTED_SUM",
      criteria: [
        {
          stableKey: "QUALITY",
          criterion: "Quality",
          description: "Quality guidance",
          weight: 2,
          scaleMinimum: 1,
          scaleMaximum: 5,
          mandatoryComment: true,
        },
      ],
    },
  ];
  stage.commentFields = [
    {
      taskStableKey: task.stableKey,
      key: "RECOMMEND",
      label: "Recommendation",
      helpText: "Explain",
      mandatory: true,
      displayOrder: 1,
    },
  ];
  task.config = {
    sectionOrder: ["checklist", "form", "scoring", "documents", "comments"],
  };
  return { stage, task };
}

describe("workflow tab conversion", () => {
  it("retains the existing form and inserts sections in the task's configured order", () => {
    const { stage, task } = fixture();
    const original = runtimeDefinition();
    original.fields.forEach((field) =>
      field.options?.sort((a, b) => a.order - b.order),
    );
    const snapshot = structuredClone(original);
    const result = convertTaskForm(stage, task, original);
    expect(original).toEqual(snapshot);
    expect(result.sections[0].title).toBe("Checklist");
    expect(
      result.sections
        .slice(1, 1 + original.sections.length)
        .map((section) => section.key),
    ).toEqual(original.sections.map((section) => section.key));
    for (const field of original.fields) {
      expect(
        result.fields.find((item) => item.key === field.key),
      ).toMatchObject({
        ...field,
        id: expect.any(String),
        sectionId: expect.any(String),
      });
    }
    expect(
      formPublicationErrors(result.fields, result.sections, "Complete"),
    ).toEqual([]);
  });
  it("preserves acceptance, score comments, document policies, and weighted-sum configuration", () => {
    const { stage, task } = fixture();
    const result = convertTaskForm(stage, task);
    expect(
      result.fields.find((field) => field.key === "CHECK_CHECK"),
    ).toMatchObject({ type: "CHECKBOX", required: true });
    expect(
      result.fields.find((field) => field.key === "SCORE_COMMENT_QUALITY"),
    ).toMatchObject({ type: "COMMENT", required: true });
    expect(
      result.fields.find((field) => field.type === "DOCUMENT")
        ?.workflowDocument,
    ).toMatchObject({
      maximumSizeMb: 20,
      uploader: "APPLICANT",
      verifier: "STAFF",
      expiryDays: 60,
    });
    expect(
      result.fields.find((field) => field.type === "SCORING_AGGREGATE")
        ?.scoringAggregate,
    ).toMatchObject({
      method: "WEIGHTED_SUM",
      normalization: "RAW",
      missing: "REQUIRE_ALL",
    });
  });
  it("reconciles duplicate legacy scoring and retains old condition aliases", () => {
    const { stage, task } = fixture();
    task.config = {
      criteria: [
        {
          code: "OLD_QUALITY",
          label: "Quality",
          maximumScore: 5,
          weight: 2,
          commentRequired: true,
        },
      ],
    };
    const normalized = normalizeLegacyTaskScoring(stage);
    expect(normalized.scoring?.[0].criteria).toHaveLength(1);
    const result = convertTaskForm(normalized, task);
    const mappings = new Map<string, Set<string>>();
    addTaskFormConditionMappings(mappings, normalized, task, result.sourceKeys);
    const key =
      `stage.${stage.stableKey}.task.${task.stableKey}.reviewer_1.scoring.old_quality.value`.toLowerCase();
    expect(
      convertTaskFormConditionReferences({ kind: "FIELD", key }, mappings).key,
    ).toContain(".form.score_quality");
    (task.config as { criteria: { weight: number }[] }).criteria[0].weight = 3;
    expect(() => normalizeLegacyTaskScoring(stage)).toThrow(
      "conflicting legacy scoring",
    );
  });

  it("avoids key collisions and separates copies of shared forms", () => {
    const { stage, task } = fixture();
    const original = runtimeDefinition();
    original.fields[0].key = "CHECK_CHECK";
    const first = convertTaskForm(stage, task, original);
    const second = convertTaskForm(stage, task, original);
    expect(new Set(first.fields.map((field) => field.key)).size).toBe(
      first.fields.length,
    );
    expect(first.sourceKeys.CHECK_CHECK).not.toBe("CHECK_CHECK");
    expect(first.sections[0].id).not.toBe(second.sections[0].id);
  });
  it("rewrites exact workflow field references, including reviewer slots, without changing constants", () => {
    const { stage, task } = fixture();
    const result = convertTaskForm(stage, task);
    const mappings = new Map<string, Set<string>>();
    addTaskFormConditionMappings(mappings, stage, task, result.sourceKeys);
    const key =
      `stage.${stage.stableKey}.task.${task.stableKey}.reviewer_1.checklist.check.accepted`.toLowerCase();
    expect(
      convertTaskFormConditionReferences({ kind: "FIELD", key }, mappings).key,
    ).toContain(".form.check_check");
    expect(
      convertTaskFormConditionReferences(
        { kind: "CONSTANT", value: key },
        mappings,
      ).value,
    ).toBe(key);
  });
});
