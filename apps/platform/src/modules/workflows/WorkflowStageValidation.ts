import { validateTaskConfiguration } from "./WorkflowTaskRegistry";
import type {
  WorkflowGraphInput,
  WorkflowValidationIssue,
} from "./WorkflowTypes";

const sensitiveApplicantTerms =
  /score|recommendation|assignee|assignment|committee/i;

function issue(
  code: string,
  message: string,
  path: string,
): WorkflowValidationIssue {
  return { code, message, path };
}

function duplicates(values: (string | number)[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function validateTaskIdentity(
  task: WorkflowGraphInput["stages"][number]["tasks"][number],
  base: string,
  taskIndex: number,
) {
  const errors: WorkflowValidationIssue[] = [];
  const taskPath = `${base}.tasks.${taskIndex}`;
  if (
    !task.formVersionId &&
    !validateTaskConfiguration(task.type, task.config).success
  ) {
    errors.push(
      issue(
        "INVALID_TASK_CONFIG",
        `${task.name} has invalid ${task.type} configuration.`,
        `${taskPath}.config`,
      ),
    );
  }
  if (!task.formVersionId && task.type === "STRUCTURED_FORM") {
    errors.push(
      issue(
        "MISSING_FORM_VERSION",
        `${task.name} must reference a published form version.`,
        `${taskPath}.formVersionId`,
      ),
    );
  }
  if (task.assignmentRoleId && task.assignmentUserId) {
    errors.push(
      issue(
        "AMBIGUOUS_ASSIGNMENT",
        `${task.name} cannot assign both a role and a user.`,
        taskPath,
      ),
    );
  }
  if (!task.assignmentRoleId && !task.assignmentUserId) {
    errors.push(
      issue(
        "MISSING_ASSIGNMENT",
        `${task.name} must be assigned to a role or user before publication.`,
        taskPath,
      ),
    );
  }
  return errors;
}

function validateTaskUniqueness(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  const errors: WorkflowValidationIssue[] = [];
  const duplicateCodes = new Set(duplicates(stage.tasks.map((task) => task.code)));
  for (const code of duplicateCodes) {
    errors.push(
      issue(
        "DUPLICATE_TASK_CODE",
        `Task code ${code} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  const duplicateSequences = new Set(
    duplicates(stage.tasks.map((task) => task.sequence)),
  );
  for (const sequence of duplicateSequences) {
    errors.push(
      issue(
        "DUPLICATE_TASK_SEQUENCE",
        `Task sequence ${sequence} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  return errors;
}

function validateApplicantLabels(
  stage: WorkflowGraphInput["stages"][number],
  base: string,
) {
  if (
    !sensitiveApplicantTerms.test(
      `${stage.applicantLabel} ${stage.applicantDescription}`,
    )
  ) {
    return [];
  }
  return [
    issue(
      "UNSAFE_APPLICANT_LABEL",
      `${stage.name} exposes internal workflow terminology.`,
      base,
    ),
  ];
}

export function validateWorkflowStage(
  stage: WorkflowGraphInput["stages"][number],
  index: number,
) {
  const errors: WorkflowValidationIssue[] = [];
  const base = `stages.${index}`;
  errors.push(...validateTaskUniqueness(stage, base));
  stage.tasks.forEach((task, taskIndex) => {
    errors.push(...validateTaskIdentity(task, base, taskIndex));
  });
  errors.push(...validateApplicantLabels(stage, base));
  return errors;
}
