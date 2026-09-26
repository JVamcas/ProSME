import "server-only";

import { RequestValidationError, ResourceConflictError } from "@/lib/resource-errors";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { saveDraftInTransaction } from "@/modules/forms/infrastructure/FormResponseRepository";
import { validateFormValues } from "@/modules/forms/FormValidation";
import {
  captureFormResponseValues,
  InvalidFormRuntimeBindingError,
} from "@/modules/forms/engine/FormRuntimeContext";
import {
  activeFormDefinition,
  sanitizeFormResponseValues,
} from "@/modules/forms/engine/FormVisibility";
import type { AuthoritativeEligibilityExecutionTransaction } from "../infrastructure/AuthoritativeEligibilityExecutionRepository";

export async function saveEligibilityEvaluationForm(
  transaction: AuthoritativeEligibilityExecutionTransaction,
  input: {
    actorId: string;
    correlationId: string;
    expectedResponseRowVersion?: number;
    expectedTaskRowVersion: number;
    formVersionId: string;
    taskId: string;
    values: Record<string, unknown>;
  },
) {
  const schema = await getFormRuntime(input.formVersionId);
  if (!schema) throw new ResourceConflictError("The eligibility form is unavailable.");

  let captured;
  try {
    captured = captureFormResponseValues(schema.fields, input.values);
  } catch (error) {
    if (error instanceof InvalidFormRuntimeBindingError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
  const values = sanitizeFormResponseValues(schema, captured);
  const active = activeFormDefinition(schema, captured);
  if (!validateFormValues(active.fields, values, true)) {
    throw new RequestValidationError(
      "Complete all required eligibility fields before running the evaluation.",
    );
  }
  const saved = await saveDraftInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    expectedResponseRowVersion: input.expectedResponseRowVersion,
    expectedTaskRowVersion: input.expectedTaskRowVersion,
    formVersionId: input.formVersionId,
    values,
    workflowTaskId: input.taskId,
  });
  if (!saved) {
    throw new ResourceConflictError("The eligibility answers changed. Refresh and retry.");
  }
  return values;
}
