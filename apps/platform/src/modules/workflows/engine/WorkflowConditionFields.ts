import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type {
  FormField,
  FormRuntimeSchema,
} from "@/modules/forms/FormTypes";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

function formConditionType(
  field: FormField,
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

function boundFormFields(
  stage: WorkflowStageInput,
  forms: ReadonlyMap<string, FormRuntimeSchema>,
) {
  return stage.tasks.flatMap((task) => {
    if (!task.formBinding) return [];
    const form = forms.get(task.formBinding.formVersionId);
    if (!form) return [];
    return form.fields.flatMap((field) => {
      const type = formConditionType(field);
      return type
        ? [{
            key: `stage.${stagePathKey(stage.stableKey)}.${field.key}`,
            label: `${stage.name} · ${task.name} · ${field.label}`,
            type,
          }]
        : [];
    });
  });
}

function boundContextFields(stage: WorkflowStageInput) {
  return stage.tasks.flatMap(
    (task) => task.formBinding?.contextFields ?? [],
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
  forms: ReadonlyMap<string, FormRuntimeSchema>,
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
    ...contextStages.flatMap(boundContextFields),
    ...valueStages.flatMap((candidate) =>
      boundFormFields(candidate, forms)
    ),
  ]);
}
