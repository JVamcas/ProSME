import type {
  WorkflowGraphInput,
  WorkflowValidation,
  WorkflowValidationIssue,
} from "../../domain/definitions/WorkflowTypes";

export type WorkflowStageAttention = {
  label: "Unreachable" | "Needs attention";
  messages: string[];
};

export function workflowStageAttention(
  graph: WorkflowGraphInput,
  validation: WorkflowValidation,
): Map<string, WorkflowStageAttention> {
  const issuesByStage = new Map<string, WorkflowValidationIssue[]>();
  for (const issue of [...validation.errors, ...validation.warnings]) {
    const stageMatch = /^stages\.(\d+)(?:\.|$)/.exec(issue.path);
    const transitionMatch = /^transitions\.(\d+)(?:\.|$)/.exec(issue.path);
    const keys: string[] = [];
    if (stageMatch) {
      const stage = graph.stages[Number(stageMatch[1])];
      if (stage) keys.push(stage.stableKey);
    }
    if (transitionMatch) {
      const transition = graph.transitions[Number(transitionMatch[1])];
      if (transition) {
        keys.push(transition.sourceStageKey);
        const targetMatch = /\.targetStageKeys\.(\d+)(?:\.|$)/.exec(issue.path);
        const targetKey = targetMatch
          ? transition.targetStageKeys[Number(targetMatch[1])]
          : undefined;
        if (targetKey) keys.push(targetKey);
      }
    }
    for (const key of new Set(keys)) {
      if (!graph.stages.some((stage) => stage.stableKey === key)) continue;
      issuesByStage.set(key, [...(issuesByStage.get(key) ?? []), issue]);
    }
  }
  return new Map(
    [...issuesByStage].map(([key, issues]) => [
      key,
      {
        label: issues.some((issue) => issue.code === "UNREACHABLE_STAGE")
          ? "Unreachable"
          : "Needs attention",
        messages: [...new Set(issues.map((issue) => issue.message))],
      },
    ]),
  );
}
