import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "./domain/definitions/WorkflowTypes";

export class WorkflowPublicationValidationError extends Error {
  readonly graph: WorkflowGraphInput;
  readonly issues: WorkflowValidationIssue[];

  constructor(
    issues: WorkflowValidationIssue[],
    graph: WorkflowGraphInput,
  ) {
    super("Resolve the workflow configuration issues before publishing.");
    this.name = "WorkflowPublicationValidationError";
    this.graph = graph;
    this.issues = issues;
  }
}

export function workflowValidationIssueMessage(issue: WorkflowValidationIssue) {
  if (issue.code === "INVALID_FORM_VERSION") {
    return "Remove the unavailable form binding or select a published form version.";
  }
  if (issue.code === "INVALID_WORKFLOW_CONDITION") {
    return issue.message.includes("is not available")
      ? "Select an available condition field or update the form bound to this workflow."
      : issue.message;
  }
  return issue.message;
}

export function workflowValidationIssueLocation(
  issue: WorkflowValidationIssue,
  graph: WorkflowGraphInput,
) {
  const parts = issue.path.split(".");
  const labels: string[] = [];
  const stageIndex = parts[0] === "stages" ? Number(parts[1]) : null;
  const stage = stageIndex === null ? undefined : graph.stages[stageIndex];
  if (stageIndex !== null) labels.push(stage?.name ?? `Stage ${stageIndex + 1}`);

  const taskPart = parts.indexOf("tasks");
  if (taskPart >= 0) {
    const taskIndex = Number(parts[taskPart + 1]);
    labels.push(stage?.tasks[taskIndex]?.name ?? `Task ${taskIndex + 1}`);
  }

  const actionPart = parts.indexOf("actions");
  if (actionPart >= 0) {
    const actionIndex = Number(parts[actionPart + 1]);
    labels.push(
      stage?.actions[actionIndex]?.label ?? `Action ${actionIndex + 1}`,
    );
  }

  if (parts[0] === "transitions") {
    labels.push(`Transition ${Number(parts[1]) + 1}`);
  }
  if (parts.includes("entryCondition")) labels.push("Entry condition");
  if (parts.includes("exitCondition")) labels.push("Exit condition");
  if (parts.includes("condition")) labels.push("Condition");

  return labels.join(" → ") || "Workflow configuration";
}
