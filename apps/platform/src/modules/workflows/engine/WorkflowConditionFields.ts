import { formatConditionFieldLabel } from "@/modules/conditions/domain/ConditionFieldLabel";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { FormField } from "@/modules/forms/FormTypes";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowRuntimeContextFields } from "@/modules/workflows/domain/WorkflowRuntimeContextFieldCatalogue";
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";

const workflowConditionRuntimeFields = workflowRuntimeContextFields.filter(
  (field) =>
    field.key.startsWith("application.") ||
    field.key.startsWith("eligibility.") ||
    field.key.startsWith("fundingCall."),
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

function taskFieldSource(stageName: string, taskName: string) {
  return [
    { label: "Stage", name: stageName },
    { label: "Task", name: taskName },
  ];
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
    const fields = form.flatMap((field) => {
      const type = formConditionType(field);
      return type
        ? [
            {
              key: `stage.${stagePathKey(stage.stableKey)}.form.${stagePathKey(field.key)}`,
              label: field.label,
              source: taskFieldSource(stage.name, task.name),
              type,
            },
          ]
        : [];
    });
    return reviewerConditionFields(stage, task, fields);
  });
}

function reviewerConditionFields(
  stage: WorkflowStageInput,
  task: WorkflowStageInput["tasks"][number],
  fields: ConditionFieldDefinition[],
) {
  const prefix = `stage.${stagePathKey(stage.stableKey)}.`;
  const scoped = Array.from({ length: task.reviewerCount }, (_, index) => {
    const slotKey = `reviewer_${index + 1}`;
    return fields.map((field) => ({
      ...field,
      key: `${prefix}task.${stagePathKey(task.stableKey)}.${slotKey}.${field.key.slice(prefix.length)}`,
      source:
        task.reviewerCount > 1
          ? [
              ...(field.source ?? []),
              { label: "Reviewer", name: `Slot ${index + 1}` },
            ]
          : field.source,
    }));
  }).flat();
  return task.reviewerCount === 1 ? [...scoped, ...fields] : scoped;
}

function taskResultField(
  stage: WorkflowStageInput,
  taskName: string,
  key: string,
  label: string,
  type: ConditionFieldDefinition["type"],
) {
  return {
    key: `stage.${stagePathKey(stage.stableKey)}.${stagePathKey(key)}`,
    label,
    source: taskFieldSource(stage.name, taskName),
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
          task.name,
          `checklist.${item.key}.accepted`,
          item.text,
          "BOOLEAN",
        ),
        taskResultField(
          stage,
          task.name,
          `checklist.${item.key}.comment`,
          `${item.text} comment`,
          "TEXT",
        ),
      ]);
    if (parsed.data.categories && parsed.data.outcomes) {
      fields.push(
        ...parsed.data.categories.map((category) =>
          taskResultField(
            stage,
            task.name,
            `decision.${category.code}.outcome`,
            category.label,
            "TEXT",
          ),
        ),
      );
    }
    if (parsed.data.criteria) {
      for (const criterion of parsed.data.criteria) {
        fields.push(
          taskResultField(
            stage,
            task.name,
            `scoring.${criterion.code}.value`,
            criterion.label,
            "NUMBER",
          ),
        );
        if (criterion.commentRequired) {
          fields.push(
            taskResultField(
              stage,
              task.name,
              `scoring.${criterion.code}.comment`,
              `${criterion.label} comment`,
              "TEXT",
            ),
          );
        }
      }
      fields.push(
        taskResultField(
          stage,
          task.name,
          "scoring.WEIGHTED_TOTAL.value",
          "Weighted total",
          "NUMBER",
        ),
      );
    }
    fields.push(
      ...(stage.commentFields ?? [])
        .filter((field) => field.taskStableKey === task.stableKey)
        .map((field) =>
          taskResultField(
            stage,
            task.name,
            `comment.${field.key}`,
            field.label,
            "TEXT",
          ),
        ),
    );
    fields.push(
      ...stage.documentRequirements
        .filter((requirement) => requirement.taskStableKey === task.stableKey)
        .flatMap((requirement) => [
          taskResultField(
            stage,
            task.name,
            `document.${requirement.stableKey}.outcome`,
            `${requirement.name} outcome`,
            "TEXT",
          ),
          taskResultField(
            stage,
            task.name,
            `document.${requirement.stableKey}.comment`,
            `${requirement.name} comment`,
            "TEXT",
          ),
        ]),
    );
    const taskScoring = stage.scoring?.find(
      (scoring) => scoring.taskStableKey === task.stableKey,
    );
    if (taskScoring) {
      taskScoring.criteria.forEach((criterion) => {
        fields.push(
          taskResultField(
            stage,
            task.name,
            `scoring.${criterion.stableKey}.value`,
            criterion.criterion,
            "NUMBER",
          ),
        );
        fields.push(
          taskResultField(
            stage,
            task.name,
            `scoring.${criterion.stableKey}.comment`,
            `${criterion.criterion} comment`,
            "TEXT",
          ),
        );
      });
    }
    fields.push(
      ...stage.actions
        .filter((action) => task.actionKeys.includes(action.stableKey))
        .map((action) =>
          taskResultField(
            stage,
            task.name,
            `actions.${action.stableKey}.selected`,
            action.label,
            "BOOLEAN",
          ),
        ),
    );
    return reviewerConditionFields(stage, task, fields);
  });
}

function boundContextFields(
  stage: WorkflowStageInput,
  graph: WorkflowGraphInput,
) {
  return stage.tasks.flatMap((task) =>
    (task.formBinding?.contextFields ?? [])
      .filter((field) => {
        const segments = field.key.split(".");
        return (
          segments[0] === "application" ||
          segments[0] === "fundingCall" ||
          (segments[0] === "stage" && segments.length >= 3)
        );
      })
      .map((field) => {
        const [root, stageKey] = field.key.split(".");
        const runtimeField = workflowRuntimeContextFields.find(
          (candidate) => candidate.key === field.key,
        );
        if (runtimeField) return runtimeField;
        if (field.source?.length) return field;
        const sourceStage = graph.stages.find(
          (candidate) => stagePathKey(candidate.stableKey) === stageKey,
        );
        const source =
          root === "stage"
            ? [{ label: "Stage", name: sourceStage?.name ?? stageKey }]
            : [
                {
                  label:
                    root === "application" ? "Application" : "Funding Call",
                },
              ];
        return { ...field, source };
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
    formatConditionFieldLabel(left).localeCompare(
      formatConditionFieldLabel(right),
    ),
  );
}

export function workflowConditionFields(
  graph: WorkflowGraphInput,
  forms: WorkflowConditionFormFields,
  stage: WorkflowStageInput,
  includeCurrentStageValues: boolean,
) {
  const contextStages = graph.stages.filter(
    (candidate) => candidate.displayOrder <= stage.displayOrder,
  );
  const valueStages = graph.stages.filter(
    (candidate) =>
      candidate.displayOrder < stage.displayOrder ||
      (includeCurrentStageValues && candidate.stableKey === stage.stableKey),
  );
  return uniqueFields([
    ...workflowConditionRuntimeFields,
    ...contextStages.flatMap((candidate) =>
      boundContextFields(candidate, graph),
    ),
    ...valueStages.flatMap((candidate) => {
      const fields = [
        ...boundFormFields(candidate, forms),
        ...boundTaskResultFields(candidate),
      ];
      const counts = new Map<string, number>();
      fields.forEach((field) =>
        counts.set(field.key, (counts.get(field.key) ?? 0) + 1),
      );
      return fields.filter(
        (field) => field.key.includes(".task.") || counts.get(field.key) === 1,
      );
    }),
  ]);
}
