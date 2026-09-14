import { validateTaskConfiguration } from "./WorkflowTaskRegistry";
import type {
  WorkflowGraphInput,
  WorkflowValidation,
  WorkflowValidationIssue,
} from "./WorkflowTypes";

const sensitiveApplicantTerms = /score|recommendation|assignee|assignment|committee/i;

function issue(code: string, message: string, path: string): WorkflowValidationIssue {
  return { code, message, path };
}

function duplicates(values: (string | number)[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function reachableStages(graph: WorkflowGraphInput, initialCode: string) {
  const visited = new Set<string>();
  const pending = [initialCode];
  while (pending.length) {
    const code = pending.shift()!;
    if (visited.has(code)) continue;
    visited.add(code);
    graph.transitions
      .filter((transition) => transition.fromStageCode === code && transition.toStageCode)
      .forEach((transition) => pending.push(transition.toStageCode!));
  }
  return visited;
}

function validateStage(stage: WorkflowGraphInput["stages"][number], index: number) {
  const errors: WorkflowValidationIssue[] = [];
  const base = `stages.${index}`;
  for (const code of new Set(duplicates(stage.tasks.map((task) => task.code)))) {
    errors.push(issue("DUPLICATE_TASK_CODE", `Task code ${code} is duplicated.`, `${base}.tasks`));
  }
  for (const sequence of new Set(duplicates(stage.tasks.map((task) => task.sequence)))) {
    errors.push(issue("DUPLICATE_TASK_SEQUENCE", `Task sequence ${sequence} is duplicated.`, `${base}.tasks`));
  }
  stage.tasks.forEach((task, taskIndex) => {
    const result = validateTaskConfiguration(task.type, task.config);
    if (!result.success) {
      errors.push(issue("INVALID_TASK_CONFIG", `${task.name} has invalid ${task.type} configuration.`, `${base}.tasks.${taskIndex}.config`));
    }
    if (task.assignmentRoleId && task.assignmentUserId) {
      errors.push(issue("AMBIGUOUS_ASSIGNMENT", `${task.name} cannot assign both a role and a user.`, `${base}.tasks.${taskIndex}`));
    }
  });
  if (sensitiveApplicantTerms.test(`${stage.applicantLabel} ${stage.applicantDescription}`)) {
    errors.push(issue("UNSAFE_APPLICANT_LABEL", `${stage.name} exposes internal workflow terminology.`, base));
  }
  return errors;
}

export function validateWorkflowGraph(graph: WorkflowGraphInput): WorkflowValidation {
  const errors = graph.stages.flatMap(validateStage);
  const initial = graph.stages.filter((stage) => stage.initial);
  if (initial.length !== 1) {
    errors.push(issue("INITIAL_STAGE", "Exactly one initial stage is required.", "stages"));
  }
  for (const code of new Set(duplicates(graph.stages.map((stage) => stage.code)))) {
    errors.push(issue("DUPLICATE_STAGE_CODE", `Stage code ${code} is duplicated.`, "stages"));
  }
  for (const sequence of new Set(duplicates(graph.stages.map((stage) => stage.sequence)))) {
    errors.push(issue("DUPLICATE_STAGE_SEQUENCE", `Stage sequence ${sequence} is duplicated.`, "stages"));
  }
  const stageCodes = new Set(graph.stages.map((stage) => stage.code));
  graph.transitions.forEach((transition, index) => {
    if (!stageCodes.has(transition.fromStageCode) || (transition.toStageCode && !stageCodes.has(transition.toStageCode))) {
      errors.push(issue("INVALID_TRANSITION_STAGE", "Transition stages must belong to this version.", `transitions.${index}`));
    }
    if (Boolean(transition.toStageCode) === Boolean(transition.terminalOutcome)) {
      errors.push(issue("INVALID_TRANSITION_TARGET", "A transition needs one stage target or terminal outcome.", `transitions.${index}`));
    }
    if (initial[0] && transition.toStageCode === initial[0].code) {
      errors.push(issue("INITIAL_STAGE_TARGET", "Transitions cannot return to the initial stage.", `transitions.${index}`));
    }
  });
  const terminalCount = graph.transitions.filter((transition) => transition.terminalOutcome).length;
  if (!terminalCount) errors.push(issue("TERMINAL_OUTCOME", "At least one terminal outcome is required.", "transitions"));
  graph.stages.forEach((stage, index) => {
    if (!graph.transitions.some((transition) => transition.fromStageCode === stage.code)) {
      errors.push(issue("MISSING_TRANSITION", `${stage.name} needs an outgoing transition.`, `stages.${index}`));
    }
  });
  if (initial[0]) {
    const reachable = reachableStages(graph, initial[0].code);
    graph.stages.forEach((stage, index) => {
      if (!reachable.has(stage.code)) errors.push(issue("UNREACHABLE_STAGE", `${stage.name} is unreachable.`, `stages.${index}`));
    });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}
