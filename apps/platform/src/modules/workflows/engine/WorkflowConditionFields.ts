import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { FormField } from "@/modules/forms/FormTypes";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowRuntimeContextFields } from "@/modules/workflows/domain/WorkflowRuntimeContextFieldCatalogue";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";

const workflowConditionRuntimeFields = workflowRuntimeContextFields.filter(
  (field) => (
    field.key.startsWith("application.")
    || field.key.startsWith("eligibility.")
    || field.key.startsWith("fundingCall.")
  ),
);

function formConditionType(
  field: Pick<FormField, "type">,
): ConditionFieldDefinition["type"] | null {
  if (["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type)) {
    return "NUMBER";
  }
  if (field.type === "YES_NO") return "BOOLEAN";
  if (field.type === "DATE") return "DATE";
  if (["TEXT", "TEXTAREA", "SINGLE_SELECT"].includes(field.type)) {
    return "TEXT";
  }
  return null;
}

function stagePathKey(value: string) {
  return value.toLowerCase();
}

export type WorkflowConditionFormField = Pick<
  FormField,
  "key" | "label" | "type"
>;

export type WorkflowConditionFormFields = ReadonlyMap<
  string,
  readonly WorkflowConditionFormField[]
>;

function boundFormFields(
  stage: WorkflowStageInput,
  forms: WorkflowConditionFormFields,
) {
  return stage.tasks.flatMap((task) => {
    if (!task.formBinding) return [];
    const form = forms.get(task.formBinding.formVersionId);
    if (!form) return [];
    return form.flatMap((field) => {
      const type = formConditionType(field);
      return type
        ? [{
            key: `stage.${stagePathKey(stage.stableKey)}.form.${stagePathKey(field.key)}`,
            label: `${stage.name} · ${task.name} · ${field.label}`,
            type,
          }]
        : [];
    });
  });
}

function taskResultField(
  stage: WorkflowStageInput,
  key: string,
  label: string,
  type: ConditionFieldDefinition["type"],
) {
  return {
    key: `stage.${stagePathKey(stage.stableKey)}.${stagePathKey(key)}`,
    label,
    type,
  };
}

function boundTaskResultFields(stage: WorkflowStageInput) {
  return stage.tasks.flatMap((task) => {
    const parsed = validateTaskConfiguration(task.config);
    if (!parsed.success) return [];
    const fields: ReturnType<typeof taskResultField>[] = stage.checklistItems
      .filter((item) => item.taskStableKey === task.stableKey)
      .flatMap((item) => [
        taskResultField(
          stage,
          `checklist.${item.key}.accepted`,
          `${stage.name} · ${task.name} · ${item.text}`,
          "BOOLEAN",
        ),
        taskResultField(
          stage,
          `checklist.${item.key}.comment`,
          `${stage.name} · ${task.name} · ${item.text} comment`,
          "TEXT",
        ),
      ]);
    if (parsed.data.categories && parsed.data.outcomes) {
      fields.push(...parsed.data.categories.map((category) => taskResultField(
        stage,
        `decision.${category.code}.outcome`,
        `${stage.name} · ${task.name} · ${category.label}`,
        "TEXT",
      )));
    }
    if (parsed.data.criteria) {
      for (const criterion of parsed.data.criteria) {
        fields.push(taskResultField(
          stage,
          `scoring.${criterion.code}.value`,
          `${stage.name} · ${task.name} · ${criterion.label}`,
          "NUMBER",
        ));
        if (criterion.commentRequired) {
          fields.push(taskResultField(
            stage,
            `scoring.${criterion.code}.comment`,
            `${stage.name} · ${task.name} · ${criterion.label} comment`,
            "TEXT",
          ));
        }
      }
      fields.push(taskResultField(
        stage,
        "scoring.WEIGHTED_TOTAL.value",
        `${stage.name} · ${task.name} · Weighted total`,
        "NUMBER",
      ));
    }
    fields.push(...(stage.commentFields ?? [])
      .filter((field) => field.taskStableKey === task.stableKey)
      .map((field) => taskResultField(
        stage,
        `comment.${field.key}`,
        `${stage.name} · ${task.name} · ${field.label}`,
        "TEXT",
      )));
    fields.push(...stage.documentRequirements
      .filter((requirement) => requirement.taskStableKey === task.stableKey)
      .flatMap((requirement) => [
        taskResultField(
          stage,
          `document.${requirement.stableKey}.outcome`,
          `${stage.name} · ${task.name} · ${requirement.name} outcome`,
          "TEXT",
        ),
        taskResultField(
          stage,
          `document.${requirement.stableKey}.comment`,
          `${stage.name} · ${task.name} · ${requirement.name} comment`,
          "TEXT",
        ),
      ]));
    if (stage.scoring?.taskStableKey === task.stableKey) {
      stage.scoring.criteria.forEach((criterion) => {
        fields.push(taskResultField(
          stage,
          `scoring.${criterion.stableKey}.value`,
          `${stage.name} · ${task.name} · ${criterion.criterion}`,
          "NUMBER",
        ));
        fields.push(taskResultField(
          stage,
          `scoring.${criterion.stableKey}.comment`,
          `${stage.name} · ${task.name} · ${criterion.criterion} comment`,
          "TEXT",
        ));
      });
    }
    fields.push(...stage.actions
      .filter((action) => task.actionKeys.includes(action.stableKey))
      .map((action) => taskResultField(
        stage,
        `actions.${action.stableKey}.selected`,
        `${stage.name} · ${task.name} · ${action.label}`,
        "BOOLEAN",
      )));
    return fields;
  });
}

function boundContextFields(stage: WorkflowStageInput) {
  return stage.tasks.flatMap(
    (task) => (task.formBinding?.contextFields ?? []).filter((field) => {
      const segments = field.key.split(".");
      return segments[0] === "application"
        || segments[0] === "fundingCall"
        || segments[0] === "stage" && segments.length >= 3;
    }),
  );
}

function uniqueFields(fields: readonly ConditionFieldDefinition[]) {
  const byKey = new Map<string, ConditionFieldDefinition>();
  fields.forEach((field) => {
    const current = byKey.get(field.key);
    if (!current || current.type === field.type) byKey.set(field.key, field);
  });
  return [...byKey.values()].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
}

export function workflowConditionFields(
  graph: WorkflowGraphInput,
  forms: WorkflowConditionFormFields,
  stage: WorkflowStageInput,
  includeCurrentStageValues: boolean,
) {
  const contextStages = graph.stages.filter((candidate) =>
    candidate.displayOrder <= stage.displayOrder
  );
  const valueStages = graph.stages.filter((candidate) =>
    candidate.displayOrder < stage.displayOrder
    || includeCurrentStageValues
      && candidate.stableKey === stage.stableKey
  );
  return uniqueFields([
    ...workflowConditionRuntimeFields,
    ...contextStages.flatMap(boundContextFields),
    ...valueStages.flatMap((candidate) =>
      [
        ...boundFormFields(candidate, forms),
        ...boundTaskResultFields(candidate),
      ]
    ),
  ]);
}
