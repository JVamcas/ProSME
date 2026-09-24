function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assignRecord(
  target: Record<string, unknown>,
  value: unknown,
) {
  if (isRecord(value)) Object.assign(target, value);
}

function assignChecklistItems(
  target: Record<string, unknown>,
  value: unknown,
) {
  if (!Array.isArray(value)) return;
  value.forEach((item) => {
    if (!isRecord(item) || typeof item.code !== "string") return;
    if (typeof item.accepted === "boolean") {
      target[item.code] = item.accepted;
    }
    if (typeof item.comment === "string") {
      target[`${item.code}_COMMENT`] = item.comment;
    }
  });
}

function assignDocumentDecisions(
  target: Record<string, unknown>,
  value: unknown,
) {
  if (!Array.isArray(value)) return;
  value.forEach((decision) => {
    if (!isRecord(decision) || typeof decision.category !== "string") return;
    if (typeof decision.outcome === "string") {
      target[decision.category] = decision.outcome;
    }
    if (typeof decision.comment === "string") {
      target[`${decision.category}_COMMENT`] = decision.comment;
    }
  });
}

function assignComments(
  target: Record<string, unknown>,
  value: unknown,
) {
  if (!isRecord(value)) return;
  Object.entries(value).forEach(([key, comment]) => {
    if (typeof comment === "string") target[`${key}_COMMENT`] = comment;
  });
}

export function buildStageCompletionValues(
  rows: readonly {
    responseValues: Record<string, unknown> | null;
    taskResult: Record<string, unknown> | null;
  }[],
) {
  const values: Record<string, unknown> = {};
  rows.forEach(({ responseValues, taskResult }) => {
    assignRecord(values, responseValues);
    if (!taskResult) return;
    assignRecord(values, taskResult.values);
    assignRecord(values, taskResult.scores);
    assignComments(values, taskResult.comments);
    assignChecklistItems(values, taskResult.items);
    assignDocumentDecisions(values, taskResult.decisions);
    Object.entries(taskResult).forEach(([key, value]) => {
      if (!["comments", "decisions", "items", "scores", "values"].includes(key)) {
        values[key] = value;
      }
    });
  });
  return values;
}
