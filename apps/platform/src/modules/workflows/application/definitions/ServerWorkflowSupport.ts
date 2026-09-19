import "server-only";

import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import {
  findConfigurationReferences,
  listWorkflowAssignmentOptions,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { toWorkflowEditor } from "@/modules/workflows/api/WorkflowRepresentation";
import type {
  WorkflowGraphInput,
  WorkflowValidation,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { validateWorkflowGraph } from "@/modules/workflows/WorkflowValidation";

export class WorkflowNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("workflow version");
  }
}

export class WorkflowConflictError extends ResourceConflictError {
  constructor(
    message = "The workflow changed in another session. Reload it and try again.",
  ) {
    super(message);
  }
}

export function requireWorkflowIdempotencyKey(value?: string | null) {
  if (!value?.trim())
    throw new WorkflowConflictError("An Idempotency-Key header is required.");
  return value.trim();
}

export async function loadWorkflowEditor(versionId: string) {
  const record = await findWorkflowGraph(versionId);
  if (!record) throw new WorkflowNotFoundError();
  return record;
}

async function validateReferences(
  graph: WorkflowGraphInput,
  validation: WorkflowValidation,
  references: Omit<
    Awaited<ReturnType<typeof findConfigurationReferences>>,
    "forms"
  > & {
    forms?: Map<string, string>;
  },
) {
  graph.stages.forEach((stage, index) => {
    stage.actions.forEach((action, actionIndex) => {
      if (action.actionType !== "ESCALATE") return;
      const path = `stages.${index}.actions.${actionIndex}.configuration.targetId`;
      if (
        action.configuration.targetType === "ROLE" &&
        !references.roles.has(action.configuration.targetId)
      ) {
        validation.errors.push({
          code: "UNKNOWN_ESCALATION_ROLE",
          message: "The escalation role is not active.",
          path,
        });
      }
      if (
        action.configuration.targetType === "USER" &&
        references.users.get(action.configuration.targetId) !== "active"
      ) {
        validation.errors.push({
          code: "INACTIVE_ESCALATION_USER",
          message: "The escalation user is not active.",
          path,
        });
      }
    });
    stage.tasks.forEach((task, taskIndex) => {
      if (
        task.roleId &&
        !references.roles.has(task.roleId)
      ) {
        validation.errors.push({
          code: "UNKNOWN_ROLE",
          message: "The assigned role is not active.",
          path: `stages.${index}.tasks.${taskIndex}.roleId`,
        });
      }
      if (
        task.formVersionId &&
        references.forms?.get(task.formVersionId) !== "PUBLISHED"
      ) {
        validation.errors.push({
          code: "INVALID_FORM_VERSION",
          message:
            "New workflow tasks must reference a published form version.",
          path: `stages.${index}.tasks.${taskIndex}.formVersionId`,
        });
      }
      if (
        task.namedUserOverrideId &&
        references.users.get(task.namedUserOverrideId) !== "active"
      ) {
        validation.errors.push({
          code: "INACTIVE_USER",
          message: "The assigned user is not active.",
          path: `stages.${index}.tasks.${taskIndex}.namedUserOverrideId`,
        });
      }
    });
  });
  validation.valid = validation.errors.length === 0;
  return validation;
}

export async function workflowEditorView(versionId: string) {
  const record = await loadWorkflowEditor(versionId);
  const [validation, assignmentOptions] = await Promise.all([
    validateReferences(
      record.graph,
      validateWorkflowGraph(record.graph),
      await findConfigurationReferences(record.graph),
    ),
    listWorkflowAssignmentOptions(),
  ]);
  return { ...toWorkflowEditor(record, validation), assignmentOptions };
}
