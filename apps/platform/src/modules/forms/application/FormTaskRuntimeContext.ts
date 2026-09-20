import "server-only";

import { ResourceConflictError } from "@/lib/resource-errors";
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import {
  createFormRuntimeBinding,
  exposeFormRuntimeContext,
  InvalidFormRuntimeBindingError,
} from "@/modules/forms/engine/FormRuntimeContext";
import type { WorkflowTaskRuntimeContextSource } from "@/modules/workflows/domain/WorkflowRuntimeContext";
import {
  buildWorkflowRuntimeContext,
  InvalidWorkflowRuntimeContextError,
} from "@/modules/workflows/engine/WorkflowRuntimeContext";

export async function exposeTaskFormRuntimeContext(
  source: WorkflowTaskRuntimeContextSource,
) {
  const fundingCall = await findPublishedFundingOpportunity(
    source.application.fundingOpportunityId,
  );
  try {
    const binding = createFormRuntimeBinding({
      context: {
        exposedPaths: source.binding.contextFields.map((field) => field.key),
        validationReferences: [],
        visibilityReferences: [],
      },
      formVersion: {
        id: source.binding.formVersionId,
        status: "PUBLISHED",
      },
      host: {
        referenceId: String(source.task.definitionId),
        type: "WORKFLOW_TASK_DEFINITION",
      },
      key: String(source.task.key),
      principal: {
        referenceId: String(source.task.id),
        type: "ASSIGNED_REVIEWER",
      },
    });
    const fundingCallValues = fundingCall ?? {
      id: source.application.fundingOpportunityId,
      title: source.fundingCallTitle,
    };
    return exposeFormRuntimeContext(
      binding,
      buildWorkflowRuntimeContext(source, fundingCallValues),
    );
  } catch (error) {
    if (
      error instanceof InvalidFormRuntimeBindingError
      || error instanceof InvalidWorkflowRuntimeContextError
    ) {
      throw new ResourceConflictError(error.message);
    }
    throw error;
  }
}
