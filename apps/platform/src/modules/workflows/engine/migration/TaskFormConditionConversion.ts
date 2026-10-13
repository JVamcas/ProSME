import { validateTaskConfiguration } from "../../WorkflowTaskRegistry";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "../../domain/definitions/WorkflowTypes";

export function addTaskFormConditionMappings(
  mappings: Map<string, Set<string>>,
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
  keys: Record<string, string>,
) {
  const add = (oldPath: string, fieldKey: string | undefined) => {
    if (!fieldKey) return;
    const prefixes = Array.from(
      { length: task.reviewerCount },
      (_, index) =>
        `stage.${stage.stableKey}.task.${task.stableKey}.reviewer_${index + 1}.`,
    );
    if (task.reviewerCount === 1) prefixes.push(`stage.${stage.stableKey}.`);
    for (const prefix of prefixes) {
      const from = `${prefix}${oldPath}`.toLowerCase();
      const to = `${prefix}form.${fieldKey}`.toLowerCase();
      const targets = mappings.get(from) ?? new Set<string>();
      targets.add(to);
      mappings.set(from, targets);
    }
  };
  for (const item of stage.checklistItems.filter(
    (item) => item.taskStableKey === task.stableKey,
  )) {
    add(`checklist.${item.key}.accepted`, keys[`CHECK_${item.key}`]);
    add(`checklist.${item.key}.comment`, keys[`EVIDENCE_${item.key}`]);
  }
  for (const item of stage.scoring?.find(
    (item) => item.taskStableKey === task.stableKey,
  )?.criteria ?? []) {
    add(`scoring.${item.stableKey}.value`, keys[`SCORE_${item.stableKey}`]);
    add(
      `scoring.${item.stableKey}.comment`,
      keys[`SCORE_COMMENT_${item.stableKey}`],
    );
  }
  const config = validateTaskConfiguration(task.config);
  if (config.success) {
    for (const criterion of config.data.criteria ?? []) {
      const source = stage.scoring
        ?.find((item) => item.taskStableKey === task.stableKey)
        ?.criteria.find(
          (item) =>
            item.stableKey === criterion.code ||
            item.criterion === criterion.label,
        );
      if (!source)
        throw new Error(
          `Cannot resolve legacy scoring reference ${criterion.code}.`,
        );
      add(`scoring.${criterion.code}.value`, keys[`SCORE_${source.stableKey}`]);
      add(
        `scoring.${criterion.code}.comment`,
        keys[`SCORE_COMMENT_${source.stableKey}`],
      );
    }
    if (config.data.criteria?.length)
      add("scoring.WEIGHTED_TOTAL.value", keys.SCORING_TOTAL);
  }
  for (const item of (stage.commentFields ?? []).filter(
    (item) => item.taskStableKey === task.stableKey,
  )) {
    add(`comment.${item.key}`, keys[`COMMENT_${item.key}`]);
  }
}

// Only replace exact field-reference keys; labels, constant values and stable IDs remain untouched.
export function convertTaskFormConditionReferences<T>(
  value: T,
  mappings: Map<string, Set<string>>,
): T {
  if (Array.isArray(value))
    return value.map((item) =>
      convertTaskFormConditionReferences(item, mappings),
    ) as T;
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(object)) {
    const targets =
      key === "key" &&
      typeof child === "string" &&
      (object.kind === "FIELD" || ("type" in object && "label" in object))
        ? mappings.get(child)
        : undefined;
    if (targets && targets.size !== 1)
      throw new Error(`Ambiguous workflow field reference: ${child}`);
    result[key] = targets
      ? [...targets][0]
      : convertTaskFormConditionReferences(child, mappings);
  }
  return result as T;
}
