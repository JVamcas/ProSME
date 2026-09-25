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
            key: `stage.${stagePathKey(stage.stableKey)}.${stagePathKey(field.key)}`,
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
      .map((item) => taskResultField(
        stage,
        item.key,
        `${stage.name} · ${task.name} · ${item.text}`,
        item.responseType === "YES_NO"
          ? "BOOLEAN"
          : item.responseType === "NUMBER"
            ? "NUMBER"
            : item.responseType === "DATE"
              ? "DATE"
              : "TEXT",
      ));
    if (parsed.data.categories && parsed.data.outcomes) {
      fields.push(...parsed.data.categories.map((category) => taskResultField(
        stage,
        category.code,
        `${stage.name} · ${task.name} · ${category.label}`,
        "TEXT",
      )));
    }
    if (parsed.data.criteria) {
      for (const criterion of parsed.data.criteria) {
        fields.push(taskResultField(
          stage,
          criterion.code,
          `${stage.name} · ${task.name} · ${criterion.label}`,
          "NUMBER",
        ));
        if (criterion.commentRequired) {
          fields.push(taskResultField(
            stage,
            `${criterion.code}_COMMENT`,
            `${stage.name} · ${task.name} · ${criterion.label} comment`,
            "TEXT",
          ));
        }
      }
      fields.push(taskResultField(
        stage,
        "WEIGHTED_TOTAL",
        `${stage.name} · ${task.name} · Weighted total`,
        "NUMBER",
      ));
    }
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
