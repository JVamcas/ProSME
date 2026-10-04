export function workflowReworkContinuation(source: {
  returnContext?: Record<string, unknown> | null;
}) {
  if (!source.returnContext) return null;
  return {
    iterationStrategy: "REWORK" as const,
    // Retention applies to the explicit Return destination. Stages reached
    // afterward perform a fresh review, while keeping the Return ancestry.
    returnContext: {
      ...source.returnContext,
      dataHandling: "CLEAR",
    },
  };
}
