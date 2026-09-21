import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { FormField } from "@/modules/forms/FormTypes";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";

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
    const parsed = validateTaskConfiguration(task.type, task.config);
    if (!parsed.success) return [];
    if (task.type === "CHECKLIST") {
      const config = parsed.data as {
        items: { code: string; label: string }[];
      };
      return config.items.map((item) => taskResultField(
        stage,
        item.code,
        `${stage.name} · ${task.name} · ${item.label}`,
        "BOOLEAN",
      ));
    }
    if (task.type === "DOCUMENT_REVIEW") {
      const config = parsed.data as {
        categories: { code: string; label: string }[];
      };
      return config.categories.map((category) => taskResultField(
        stage,
        category.code,
        `${stage.name} · ${task.name} · ${category.label}`,
        "TEXT",
      ));
    }
    if (task.type === "ASSESSMENT_FORM") {
      const config = parsed.data as {
        criteria: {
          code: string;
          commentRequired: boolean;
          label: string;
        }[];
      };
      return [
        ...config.criteria.flatMap((criterion) => [
          taskResultField(
            stage,
            criterion.code,
            `${stage.name} · ${task.name} · ${criterion.label}`,
            "NUMBER",
          ),
          ...(criterion.commentRequired
            ? [taskResultField(
                stage,
                `${criterion.code}_COMMENT`,
                `${stage.name} · ${task.name} · ${criterion.label} comment`,
                "TEXT",
              )]
            : []),
        ]),
        taskResultField(
          stage,
          "WEIGHTED_TOTAL",
          `${stage.name} · ${task.name} · Weighted total`,
          "NUMBER",
        ),
      ];
    }
    return [];
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
    ...contextStages.flatMap(boundContextFields),
    ...valueStages.flatMap((candidate) =>
      [
        ...boundFormFields(candidate, forms),
        ...boundTaskResultFields(candidate),
      ]
    ),
  ]);
}
