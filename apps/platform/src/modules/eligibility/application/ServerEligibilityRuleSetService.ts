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
  CreateEligibilityRuleSetCommand,
  EligibilityRuleSetLifecycleCommand,
  UpdateEligibilityRuleSetDraftCommand,
} from "./EligibilityRuleSetCommands";
import {
  cloneEligibilityRuleSetVersion,
  createEligibilityRuleSet,
  findEligibilityRuleSet,
  findEligibilityRuleSetVersion,
  InvalidEligibilityRulesError,
  publishEligibilityRuleSetVersion,
  retireEligibilityRuleSetVersion,
  updateEligibilityRuleSetDraft,
} from "../infrastructure/EligibilityRuleSetRepository";

async function requireRuleSet(ruleSetId: string) {
  const ruleSet = await findEligibilityRuleSet(ruleSetId);
  if (!ruleSet) throw new ResourceNotFoundError("eligibility ruleset");
  return ruleSet;
}

async function requireRuleSetVersion(versionId: string) {
  const ruleSet = await findEligibilityRuleSetVersion(versionId);
  if (!ruleSet) {
    throw new ResourceNotFoundError("eligibility ruleset version");
  }
  return ruleSet;
}

export async function getEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  return requireRuleSet(ruleSetId);
}

export async function getEligibilityRuleSetVersion(
  user: AuthenticatedUser | null,
  versionId: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  return requireRuleSetVersion(versionId);
}

export async function createNewEligibilityRuleSet(
  user: AuthenticatedUser | null,
  input: CreateEligibilityRuleSetCommand,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetCreate,
  );
  const created = await createEligibilityRuleSet({
    ...input,
    actorId: actor.id,
  });
  return requireRuleSet(created.definition.id);
}

export async function updateEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  input: UpdateEligibilityRuleSetDraftCommand,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetUpdate,
  );
  try {
    const updated = await updateEligibilityRuleSetDraft({
      ...input,
      actorId: actor.id,
      ruleSetId,
      versionId,
    });
    if (!updated) {
      throw new ResourceConflictError(
        "The eligibility ruleset draft changed or is not editable.",
      );
    }
  } catch (error) {
    if (error instanceof InvalidEligibilityRulesError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
  return requireRuleSet(ruleSetId);
}

export async function publishEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  input: EligibilityRuleSetLifecycleCommand,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetPublish,
  );
  let version;
  try {
    version = await publishEligibilityRuleSetVersion({
      ...input,
      actorId: actor.id,
      ruleSetId,
      versionId,
    });
  } catch (error) {
    if (error instanceof InvalidEligibilityRulesError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
  if (!version) {
    throw new ResourceConflictError(
      "The eligibility ruleset version changed or is not a draft.",
    );
  }
  return requireRuleSetVersion(versionId);
}

export async function retireEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  versionId: string,
  input: EligibilityRuleSetLifecycleCommand,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRetire);
  const version = await retireEligibilityRuleSetVersion({
    ...input,
    ruleSetId,
    versionId,
  });
  if (!version) {
    throw new ResourceConflictError(
      "The eligibility ruleset version changed or is not published.",
    );
  }
  return requireRuleSetVersion(versionId);
}

export async function cloneEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  sourceVersionId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.eligibilityRuleSetUpdate,
  );
  const version = await cloneEligibilityRuleSetVersion({
    actorId: actor.id,
    ruleSetId,
    sourceVersionId,
  });
  if (!version) {
    throw new ResourceConflictError(
      "The source version does not exist or the ruleset already has a draft.",
    );
  }
  return requireRuleSet(ruleSetId);
}
