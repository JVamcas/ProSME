import { mergeUnambiguousSubmissionAliases } from "./WorkflowSubmissionAliases";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assignRecord(target: Record<string, unknown>, value: unknown) {
  if (isRecord(value)) Object.assign(target, value);
}

function assignChecklistItems(target: Record<string, unknown>, value: unknown) {
  if (!Array.isArray(value)) return;
  value.forEach((item) => {
    if (!isRecord(item) || typeof item.code !== "string") return;
    const checklist = isRecord(target.checklist) ? target.checklist : {};
    const result: Record<string, unknown> = {};
    if (typeof item.accepted === "boolean") {
      target[item.code] = item.accepted;
      result.accepted = item.accepted;
    }
    if (typeof item.comment === "string") {
      target[`${item.code}_COMMENT`] = item.comment;
      result.comment = item.comment;
    }
    checklist[item.code] = result;
    target.checklist = checklist;
  });
}

function assignDocumentDecisions(
  target: Record<string, unknown>,
  value: unknown,
  namespace: "decision" | "document",
) {
  if (!Array.isArray(value)) return;
  value.forEach((decision) => {
    if (!isRecord(decision) || typeof decision.category !== "string") return;
    const decisions = isRecord(target[namespace]) ? target[namespace] : {};
    const result: Record<string, unknown> = {};
    if (typeof decision.outcome === "string") {
      result.outcome = decision.outcome;
    }
    if (typeof decision.comment === "string") {
      result.comment = decision.comment;
    }
    decisions[decision.category] = result;
    target[namespace] = decisions;
  });
}

function assignScores(target: Record<string, unknown>, value: unknown) {
  if (isRecord(value)) {
    Object.assign(target, value);
    const scoring = isRecord(target.scoring) ? target.scoring : {};
    Object.entries(value).forEach(([key, score]) => {
      if (typeof score === "number") {
        scoring[key] = { value: score };
      }
    });
    target.scoring = scoring;
    return;
  }
  if (!Array.isArray(value)) return;
  value.forEach((score) => {
    if (!isRecord(score) || typeof score.criterion !== "string") return;
    const scoring = isRecord(target.scoring) ? target.scoring : {};
    const result: Record<string, unknown> = {};
    if (typeof score.score === "number") {
      target[score.criterion] = score.score;
      result.value = score.score;
    }
    if (typeof score.comment === "string") {
      target[`${score.criterion}_COMMENT`] = score.comment;
      result.comment = score.comment;
    }
    scoring[score.criterion] = result;
    target.scoring = scoring;
  });
}

function assignComments(target: Record<string, unknown>, value: unknown) {
  if (Array.isArray(value)) {
    const comments = isRecord(target.comment) ? target.comment : {};
    value.forEach((item) => {
      if (!isRecord(item) || typeof item.key !== "string") return;
      if (typeof item.value === "string") {
        target[`${item.key}_COMMENT`] = item.value;
        comments[item.key] = item.value;
      }
    });
    target.comment = comments;
    return;
  }
  if (!isRecord(value)) return;
  const comments = isRecord(target.comment) ? target.comment : {};
  Object.entries(value).forEach(([key, comment]) => {
    if (typeof comment === "string") {
      target[`${key}_COMMENT`] = comment;
      comments[key] = comment;
    }
  });
  target.comment = comments;
}

function assignAction(target: Record<string, unknown>, value: unknown) {
  if (typeof value !== "string" || !value) return;
  const actions = isRecord(target.actions) ? target.actions : {};
  actions[value] = { selected: true };
  target.actions = actions;
}

function buildSubmissionValues(
  rows: readonly {
    responseValues: Record<string, unknown> | null;
    taskResult: Record<string, unknown> | null;
  }[],
) {
  const values: Record<string, unknown> = {};
  const form: Record<string, unknown> = {};
  const result: Record<string, unknown> = {};
  rows.forEach(({ responseValues, taskResult }) => {
    assignRecord(values, responseValues);
    assignRecord(form, responseValues);
    if (!taskResult) return;
    assignRecord(values, taskResult.values);
    assignRecord(form, taskResult.values);
    assignAction(values, taskResult.actionKey);
    assignScores(values, taskResult.scores);
    assignComments(values, taskResult.comments);
    assignChecklistItems(values, taskResult.items);
    assignDocumentDecisions(values, taskResult.documents, "document");
    assignDocumentDecisions(values, taskResult.decisions, "decision");
    Object.entries(taskResult).forEach(([key, value]) => {
      if (
        ![
          "comments",
          "decisions",
          "documents",
          "items",
          "scores",
          "values",
        ].includes(key)
      ) {
        result[key] = value;
        if (
          ![
            "actions",
            "checklist",
            "comment",
            "decision",
            "document",
            "form",
            "result",
            "scoring",
          ].includes(key)
        ) {
          values[key] = value;
        }
      }
    });
  });
  if (Object.keys(form).length) values.form = form;
  if (Object.keys(result).length) values.result = result;
  return values;
}

export type StageCompletionSubmission = {
  responseValues: Record<string, unknown> | null;
  taskResult: Record<string, unknown> | null;
  taskId?: string;
  taskKey?: string;
  reviewerId?: string | null;
  reviewerSlot?: number;
  reviewerCount?: number;
};

export function buildStageCompletionValues(
  rows: readonly StageCompletionSubmission[],
) {
  const values: Record<string, unknown> = {};
  const tasks: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();
  const ambiguous = new Set<string>();
  for (const row of rows) {
    const submission = buildSubmissionValues([row]);
    if (row.taskKey && row.taskId && row.reviewerSlot) {
      const reviewers = tasks[row.taskKey] ?? {};
      const reviewerKey = `reviewer_${row.reviewerSlot}`;
      if (reviewers[reviewerKey]) {
        throw new Error(
          `Duplicate submission for task ${row.taskKey}, ${reviewerKey}.`,
        );
      }
      reviewers[reviewerKey] = {
        ...submission,
        reviewerId: row.reviewerId ?? null,
        taskId: row.taskId,
      };
      tasks[row.taskKey] = reviewers;
    }
    // Existing scalar conditions remain valid only for a single-reviewer task
    // and an unambiguous field. Multiple reviewers always use scoped paths.
    if ((row.reviewerCount ?? 1) === 1) {
      mergeUnambiguousSubmissionAliases(values, submission, seen, ambiguous);
    }
  }
  if (Object.keys(tasks).length) values.task = tasks;
  return values;
}
