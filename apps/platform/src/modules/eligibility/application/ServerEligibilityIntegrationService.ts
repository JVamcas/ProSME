import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  EligibilityIntegrationBindingInput,
  EligibilityIntegrationCreateInput,
  EligibilityIntegrationManualResultInput,
  EligibilityIntegrationVersionCreateInput,
} from "../api/EligibilityIntegrationSchemas";
import {
  executeEligibilityIntegration,
  validateIntegrationOutputs,
} from "../domain/EligibilityIntegrationExecution";
import type { EligibilityIntegrationProviderAdapter } from "../domain/EligibilityIntegration";
import {
  bindEligibilityIntegration,
  createEligibilityIntegration,
  createEligibilityIntegrationVersion,
  insertEligibilityIntegrationExecution,
  publishEligibilityIntegrationVersion,
  readApplicationIntegrationBinding,
  readEligibilityIntegrationCatalogue,
} from "../infrastructure/EligibilityIntegrationRepository";

export function listEligibilityIntegrations(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.integrationEligibilityRead);
  return readEligibilityIntegrationCatalogue();
}

export function createNewEligibilityIntegration(
  user: AuthenticatedUser | null,
  input: EligibilityIntegrationCreateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.integrationEligibilityCreate,
  );
  return createEligibilityIntegration(actor.id, input);
}

export async function createNewEligibilityIntegrationVersion(
  user: AuthenticatedUser | null,
  definitionId: string,
  input: EligibilityIntegrationVersionCreateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.integrationEligibilityCreate,
  );
  const version = await createEligibilityIntegrationVersion(
    actor.id,
    definitionId,
    input,
  );
  if (!version) throw new ResourceNotFoundError("eligibility integration");
  return version;
}

export async function publishEligibilityIntegration(
  user: AuthenticatedUser | null,
  versionId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.integrationEligibilityPublish,
  );
  const version = await publishEligibilityIntegrationVersion(
    actor.id,
    versionId,
  );
  if (!version) {
    throw new ResourceConflictError(
      "Only a draft eligibility integration version can be published.",
    );
  }
  return version;
}

export async function bindFundingCallEligibilityIntegration(
  user: AuthenticatedUser | null,
  fundingCallId: string,
  input: EligibilityIntegrationBindingInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.integrationEligibilityBind,
  );
  requirePermission(user, permissionCodes.fundingCallUpdate);
  const result = await bindEligibilityIntegration(actor.id, fundingCallId, input);
  if (result.kind === "NOT_FOUND") {
    throw new ResourceNotFoundError("Funding Call or integration version");
  }
  if (result.kind === "NOT_BINDABLE") {
    throw new RequestValidationError(
      "Bind a published integration version to a draft Funding Call with an exact workflow version.",
    );
  }
  return result.binding;
}

export async function executeBoundEligibilityIntegration(
  user: AuthenticatedUser | null,
  input: {
    adapter: EligibilityIntegrationProviderAdapter;
    applicationId: string;
    bindingId: string;
    executedAt?: Date;
  },
) {
  requirePermission(user, permissionCodes.integrationEligibilityExecute);
  const binding = await readApplicationIntegrationBinding(
    input.applicationId,
    input.bindingId,
  );
  if (!binding) throw new ResourceNotFoundError("bound eligibility integration");
  if (binding.providerAdapterKey !== input.adapter.key) {
    throw new ResourceConflictError(
      "The installed provider adapter does not match the bound integration version.",
    );
  }
  const result = await executeEligibilityIntegration({
    adapter: input.adapter,
    applicationId: input.applicationId,
    fundingCallId: binding.fundingCallId,
    provider: { secretReference: binding.secretReference },
    version: binding.integrationVersion,
  });
  return insertEligibilityIntegrationExecution({
    applicationId: input.applicationId,
    binding,
    executedAt: input.executedAt ?? new Date(),
    executionSource: "PROVIDER",
    result,
  });
}

export async function recordManualEligibilityIntegrationResult(
  user: AuthenticatedUser | null,
  applicationId: string,
  bindingId: string,
  input: EligibilityIntegrationManualResultInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.integrationEligibilityManualVerify,
  );
  const binding = await readApplicationIntegrationBinding(
    applicationId,
    bindingId,
  );
  if (!binding) throw new ResourceNotFoundError("bound eligibility integration");
  if (!binding.manualFallbackAllowed) {
    throw new ResourceConflictError(
      "Manual verification is not allowed for this integration binding.",
    );
  }
  const issues = validateIntegrationOutputs(
    binding.integrationVersion.outputSchema,
    input.normalizedOutputs,
  );
  if (issues.length) throw new RequestValidationError(issues.join(" "));
  return insertEligibilityIntegrationExecution({
    actorId: actor.id,
    applicationId,
    binding,
    evidenceReference: input.evidenceReference,
    executedAt: new Date(),
    executionSource: "MANUAL",
    result: {
      attemptCount: 1,
      failureMessage: null,
      normalizedOutputs: input.normalizedOutputs,
      rawResponse: null,
      status: input.status,
    },
  });
}
