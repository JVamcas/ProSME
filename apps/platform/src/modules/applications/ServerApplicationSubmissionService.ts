import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { submitOwnedApplication } from "./infrastructure/ApplicationSubmissionRepository";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { applicationDocumentRequirements } from "./ApplicationDocumentSchemas";

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
    idempotencyKey: requireIdempotencyKey(idempotencyKey),
    requiredDocumentTypes: applicationDocumentRequirements
      .filter((requirement) => requirement.required)
      .map((requirement) => requirement.id),
  });
  if (result.kind === "submitted") return result.result;
  if (result.kind === "not_found") {
    throw new ResourceNotFoundError("application draft");
  }
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  if (result.kind === "draft_incomplete") {
    throw new ApplicationSubmissionConflictError(
      "Complete every application section and accept the declarations before submitting.",
    );
  }
  if (result.kind === "documents_invalid") {
    throw new ApplicationSubmissionConflictError(
      "All required documents must pass security scanning before submission.",
    );
  }
  if (result.kind === "business_required") {
    throw new ApplicationSubmissionConflictError(
      "Select a business before submitting this application.",
    );
  }
  throw new ApplicationSubmissionConflictError(
    "This funding call does not have a bound published workflow template version.",
  );
}
