import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
} from "@/lib/resource-errors";
import {
  captureFormResponseValues,
  InvalidFormRuntimeBindingError,
} from "@/modules/forms/engine/FormRuntimeContext";
import {
  activeFormDefinition,
  sanitizeFormResponseValues,
} from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { preserveAttachedBusinessValues } from "./domain/AttachedApplicationForm";
import { getAttachedApplicationForm } from "./infrastructure/AttachedApplicationFormRepository";
import {
  applicationResponseForm,
  applicationResponseValues,
} from "./domain/ApplicationDocumentPolicy";
import {
  canonicalJson,
  hashCanonicalJson,
} from "./domain/ApplicationSubmissionSnapshot";
import type {
  CreateApplicationDraftInput,
  SaveApplicationDraftInput,
} from "./ApplicationSchemas";
import { toApplicationView } from "./ApplicationRepresentation";
import type { ApplicationDraftView } from "./ApplicationTypes";
import {
  readOwnedApplicationDraftResponse,
  saveApplicationDraftResponse,
} from "./infrastructure/ApplicationResponseRepository";
import {
  createApplicationDraft as persistApplicationDraft,
} from "./infrastructure/ApplicationCreationRepository";
import { findOwnedApplication } from "./infrastructure/ApplicationRepository";
import {
  ApplicationBusinessConflictError,
  ApplicationBusinessUnavailableError,
  ApplicationConflictError,
  ApplicationNotFoundError,
  ApplicationOpportunityUnavailableError,
} from "./ServerApplicationService";

function fingerprint(value: unknown) {
  return hashCanonicalJson(canonicalJson(value));
}

async function loadDraft(
  actorId: string,
  applicationId: string,
): Promise<ApplicationDraftView> {
  const application = await findOwnedApplication(actorId, applicationId);
  if (!application) throw new ApplicationNotFoundError();
  if (!application.formVersionId) {
    throw new ApplicationOpportunityUnavailableError();
  }
  const [response, form] = await Promise.all([
    readOwnedApplicationDraftResponse(actorId, applicationId),
    getAttachedApplicationForm(
      application.formVersionId,
      application.fundingOpportunityId,
    ),
  ]);
  if (
    !response
    || !form
    || response.formVersionId !== application.formVersionId
  ) {
    throw new ApplicationOpportunityUnavailableError();
  }
  const responseForm = applicationResponseForm(form);
  return {
    ...toApplicationView(application),
    draftResponse: {
      id: response.id,
      rowVersion: response.rowVersion,
      updatedAt: response.updatedAt.toISOString(),
      values: applicationResponseValues(form, response.values),
    },
    form: responseForm,
  };
}

export async function createApplicationDraft(
  user: AuthenticatedUser | null,
  input: CreateApplicationDraftInput & {
    correlationId: string;
    idempotencyKey: string;
  },
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationCreate,
  );
  const result = await persistApplicationDraft({
    ...input,
    actorUserId: actor.id,
    requestFingerprint: fingerprint({
      businessId: input.businessId ?? null,
      fundingCallIdOrSlug: input.fundingCallIdOrSlug,
    }),
  });
  if (result.kind === "unavailable") {
    throw new ApplicationOpportunityUnavailableError();
  }
  if (result.kind === "business_required") {
    throw new RequestValidationError(
      "Select the business represented by this application.",
    );
  }
  if (result.kind === "unowned_business") {
    throw new ApplicationBusinessUnavailableError();
  }
  if (result.kind === "duplicate") {
    throw new ApplicationBusinessConflictError();
  }
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another application command.",
    );
  }
  if (!("applicationId" in result)) {
    throw new ApplicationConflictError();
  }
  return loadDraft(actor.id, result.applicationId);
}

export async function getOwnApplicationDraft(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  return loadDraft(actor.id, applicationId);
}

function validateDraftValues(
  form: ApplicationDraftView["form"],
  supplied: Record<string, unknown>,
) {
  try {
    const captured = captureFormResponseValues(form.fields, supplied);
    const values = sanitizeFormResponseValues(form, captured);
    const active = activeFormDefinition(form, captured);
    if (!validateFormValues(active.fields, values, false)) {
      throw new RequestValidationError("The draft form values are invalid.");
    }
    return values;
  } catch (error) {
    if (error instanceof InvalidFormRuntimeBindingError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
}

export async function saveOwnApplicationDraft(
  user: AuthenticatedUser | null,
  applicationId: string,
  input: SaveApplicationDraftInput & { correlationId: string },
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnUpdate,
  );
  const current = await loadDraft(actor.id, applicationId);
  const hasAttachedBusinessFields = current.form.fields.some(
    (field) => field.key === "BUSINESS_LEGAL_NAME",
  );
  const values = validateDraftValues(
    current.form,
    hasAttachedBusinessFields
      ? preserveAttachedBusinessValues(
          input.values,
          current.draftResponse.values,
        )
      : input.values,
  );
  const result = await saveApplicationDraftResponse({
    ...input,
    actorUserId: actor.id,
    applicationId,
    requestFingerprint: fingerprint({ applicationId, values }),
    values,
  });
  if (result.kind === "not_found") throw new ApplicationNotFoundError();
  if (result.kind === "not_writable") {
    throw new ResourceConflictError(
      "This application no longer accepts draft changes.",
    );
  }
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another application command.",
    );
  }
  if (result.kind === "conflict") {
    throw new ResourceConflictError(
      "This draft changed in another session. Refresh before reconciling your changes.",
      {
        applicationRowVersion: result.applicationRowVersion!,
        responseRowVersion: result.responseRowVersion!,
      },
    );
  }
  if (!("applicationId" in result)) {
    throw new ApplicationConflictError();
  }
  return loadDraft(actor.id, result.applicationId);
}
