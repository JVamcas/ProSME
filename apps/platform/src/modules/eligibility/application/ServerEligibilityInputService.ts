import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  EligibilityInputCreateInput,
  EligibilityInputUpdateInput,
} from "../api/EligibilityInputSchemas";
import type {
  EligibilityInputDependency,
} from "../domain/EligibilityInputDefinition";
import {
  findEligibilityInputDependencies,
  listEligibilityInputs,
} from "../infrastructure/EligibilityInputRepository";
import {
  createEligibilityInput,
  deleteEligibilityInput,
  updateEligibilityInput,
} from "../infrastructure/EligibilityInputWriteRepository";
import { findEligibilityRuleSetVersion } from "../infrastructure/EligibilityRuleSetRepository";

export class EligibilityInputDependencyError extends ResourceConflictError {
  readonly dependencies: EligibilityInputDependency[];

  constructor(
    action: "delete" | "rename",
    dependencies: EligibilityInputDependency[],
  ) {
    const report = dependencies
      .map((dependency) => `${dependency.reasonCode} (${dependency.ruleId})`)
      .join(", ");
    super(
      `Cannot ${action} this eligibility input. Referencing rules: ${report}.`,
    );
    this.name = "EligibilityInputDependencyError";
    this.dependencies = dependencies;
  }
}

async function requireVersion(ruleSetId: string, versionId: string) {
  const ruleSet = await findEligibilityRuleSetVersion(versionId);
  if (!ruleSet || ruleSet.definition.id !== ruleSetId) {
    throw new ResourceNotFoundError("eligibility ruleset version");
  }
  return ruleSet.version;
}

function mutationConflict(): never {
  throw new ResourceConflictError(
    "The eligibility ruleset draft changed or is not editable.",
  );
}

async function inputView(ruleSetId: string, versionId: string) {
  const [version, inputs] = await Promise.all([
    requireVersion(ruleSetId, versionId),
    listEligibilityInputs(versionId),
  ]);
  return { inputs, version };
}

export async function getEligibilityInputs(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  return inputView(ruleSetId, versionId);
}

export async function addEligibilityInput(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  input: EligibilityInputCreateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetUpdate,
  );
  const { expectedRowVersion, ...definition } = input;
  const result = await createEligibilityInput({
    actorId: actor.id,
    definition,
    expectedRowVersion,
    ruleSetId,
    versionId,
  });
  if (result.kind !== "SUCCESS") mutationConflict();
  return inputView(ruleSetId, versionId);
}

export async function editEligibilityInput(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  inputId: string,
  input: EligibilityInputUpdateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetUpdate,
  );
  const { expectedRowVersion, ...definition } = input;
  const result = await updateEligibilityInput({
    actorId: actor.id,
    definition,
    expectedRowVersion,
    inputId,
    ruleSetId,
    versionId,
  });
  if (result.kind === "DEPENDENCIES") {
    throw new EligibilityInputDependencyError("rename", result.dependencies);
  }
  if (result.kind !== "SUCCESS") mutationConflict();
  return inputView(ruleSetId, versionId);
}

export async function removeEligibilityInput(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  inputId: string,
  expectedRowVersion: number,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetUpdate);
  const result = await deleteEligibilityInput({
    expectedRowVersion,
    inputId,
    ruleSetId,
    versionId,
  });
  if (result.kind === "DEPENDENCIES") {
    throw new EligibilityInputDependencyError("delete", result.dependencies);
  }
  if (result.kind !== "SUCCESS") mutationConflict();
  return inputView(ruleSetId, versionId);
}

export async function getEligibilityInputDependencies(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  stableKey: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  await requireVersion(ruleSetId, versionId);
  return findEligibilityInputDependencies(versionId, stableKey);
}
