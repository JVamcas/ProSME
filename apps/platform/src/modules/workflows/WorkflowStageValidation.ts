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

export function validateWorkflowStage(
  stage: WorkflowGraphInput["stages"][number],
  index: number,
) {
  const errors: WorkflowValidationIssue[] = [];
  const base = `stages.${index}`;
  for (const code of new Set(
    duplicates(stage.tasks.map((task) => task.code)),
  )) {
    errors.push(
      issue(
        "DUPLICATE_TASK_CODE",
        `Task code ${code} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  for (const sequence of new Set(
    duplicates(stage.tasks.map((task) => task.sequence)),
  )) {
    errors.push(
      issue(
        "DUPLICATE_TASK_SEQUENCE",
        `Task sequence ${sequence} is duplicated.`,
        `${base}.tasks`,
      ),
    );
  }
  stage.tasks.forEach((task, taskIndex) => {
    if (!validateTaskConfiguration(task.type, task.config).success) {
      errors.push(
        issue(
          "INVALID_TASK_CONFIG",
          `${task.name} has invalid ${task.type} configuration.`,
          `${base}.tasks.${taskIndex}.config`,
        ),
      );
    }
    if (task.assignmentRoleId && task.assignmentUserId) {
      errors.push(
        issue(
          "AMBIGUOUS_ASSIGNMENT",
          `${task.name} cannot assign both a role and a user.`,
          `${base}.tasks.${taskIndex}`,
        ),
      );
    }
  });
  if (
    sensitiveApplicantTerms.test(
      `${stage.applicantLabel} ${stage.applicantDescription}`,
    )
  ) {
    errors.push(
      issue(
        "UNSAFE_APPLICANT_LABEL",
        `${stage.name} exposes internal workflow terminology.`,
        base,
      ),
    );
  }
  return errors;
}
