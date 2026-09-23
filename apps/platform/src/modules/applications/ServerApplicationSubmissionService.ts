import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { ApplicationSubmissionCommandInput } from "./api/ApplicationSubmissionSchemas";
import { submitOwnedApplication } from "./infrastructure/ApplicationSubmissionRepository";

export class ApplicationSubmissionConflictError extends ResourceConflictError {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationSubmissionConflictError";
  }
}

function requireIdempotencyKey(value: string | null) {
  const key = value?.trim();
  if (!key) {
    throw new RequestValidationError("An Idempotency-Key header is required.");
  }
  if (key.length > 200) {
    throw new RequestValidationError(
      "The Idempotency-Key header must be 200 characters or fewer.",
    );
  }
  return key;
}

export async function submitApplication(
  user: AuthenticatedUser | null,
  applicationId: string,
  command: ApplicationSubmissionCommandInput,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationSubmit,
  );
  const result = await submitOwnedApplication({
    actorId: actor.id,
    applicationId,
    correlationId,
    ...command,
    idempotencyKey: requireIdempotencyKey(idempotencyKey),
  });
  if (result.kind === "submitted") return result.result;
  if (result.kind === "not_found") {
    throw new ResourceNotFoundError("application draft");
  }
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "The idempotency key was already used for a different command.",
    );
  }
  const messages = {
    documents_invalid:
      "All required documents must be finalized and pass security scanning before submission.",
    draft_incomplete:
      "Complete every application section and accept the declarations before submitting.",
    duplicate_submission:
      "A submission already exists under this Funding Call's application limit.",
    eligibility_unavailable:
      "Eligibility validation is unavailable for this application.",
    opportunity_unavailable:
      "This funding call is not accepting submissions.",
    reference_configuration_invalid:
      "The Funding Call application reference configuration is invalid.",
    representative_authority_required:
      "You are not authorized to submit for the selected business.",
    stage_entry_condition_failed:
      "The workflow's initial stage entry conditions were not met.",
    stale_preflight:
      "Submission readiness changed or expired. Run preflight again.",
    workflow_unavailable:
      "This funding call does not have exactly one valid initial workflow stage.",
  } as const;
  throw new ApplicationSubmissionConflictError(messages[result.kind]);
}
