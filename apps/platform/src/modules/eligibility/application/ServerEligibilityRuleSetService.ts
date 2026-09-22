import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
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
  createEligibilityRuleSet,
  findEligibilityRuleSet,
  findEligibilityRuleSetVersion,
  InvalidEligibilityRulesError,
  publishEligibilityRuleSetVersion,
  retireEligibilityRuleSetVersion,
} from "../infrastructure/EligibilityRuleSetRepository";
import {
  cloneEligibilityRuleSetVersion,
} from "../infrastructure/EligibilityRuleSetCloneRepository";
import {
  updateEligibilityRuleSetDefinition,
  updateEligibilityRuleSetDraft,
} from "../infrastructure/EligibilityRuleSetWriteRepository";
import { findEligibilityRuleSetBuilder } from "../infrastructure/EligibilityBuilderRepository";
import { findEligibilityInputPublicationIssues } from "../infrastructure/EligibilityInputRepository";
import { eligibilityFieldsForExecutionMode } from "../domain/EligibilityFieldRegistry";
import { resolveEligibilityFieldRegistry } from "./ServerEligibilityFieldRegistryService";

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

export async function updateEligibilityRuleSetMetadata(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: CreateEligibilityRuleSetCommand,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetUpdate);
  const definition = await updateEligibilityRuleSetDefinition({
    ...input,
    ruleSetId,
  });
  if (!definition) throw new ResourceNotFoundError("eligibility ruleset");
  return { definition };
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
  const [builder, registry, inputIssues] = await Promise.all([
    findEligibilityRuleSetBuilder(ruleSetId, versionId),
    resolveEligibilityFieldRegistry(versionId),
    findEligibilityInputPublicationIssues(versionId),
  ]);
  const registryIssues = registry.issues.map((issue) => issue.message);
  if (inputIssues.length || registryIssues.length) {
    throw new RequestValidationError(
      [...new Set([...inputIssues, ...registryIssues])].join(" "),
    );
  }
  if (!builder || builder.version.id !== versionId || !registry.fields.length) {
    throw new RequestValidationError(
      "Bind this draft ruleset to a draft funding call before publishing it.",
    );
  }
  const contextIssues = builder.rules.flatMap((rule) =>
    validateConditionGroup(
      rule.condition,
      eligibilityFieldsForExecutionMode(
        registry.fields,
        rule.executionMode,
      ),
      conditionBuilderOperators,
    ).issues.map((issue) => `${rule.reasonCode}: ${issue.message}`)
  );
  if (contextIssues.length) {
    throw new RequestValidationError(contextIssues.join(" "));
  }
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
