import "server-only";

import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { validateWorkflowConditions } from "@/modules/workflows/engine/WorkflowConditionValidation";
import { findWorkflowConditionFormFields } from "@/modules/workflows/infrastructure/WorkflowRepository";

export async function validateStoredWorkflowConditions(
  graph: WorkflowGraphInput,
) {
  return validateWorkflowConditions(
    graph,
    await findWorkflowConditionFormFields(graph),
  );
}
