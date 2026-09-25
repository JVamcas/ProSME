import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  formVersionIsBindable,
  listBindableFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  eligibilityRuleSetVersionIsBindable,
  listBindableEligibilityRuleSetVersions as listBindableRuleSetVersions,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { findTestableEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { listEligibilityInputs } from "@/modules/eligibility/infrastructure/EligibilityInputRepository";
import {
  buildEligibilityFieldRegistry,
  eligibilityFieldsForExecutionMode,
} from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import { workflowConditionNodeFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import {
  listBindableWorkflowVersions,
  workflowTemplateVersionIsBindable,
} from "@/modules/workflows/infrastructure/WorkflowRepository";
import type {
  FundingCallCreateInput,
  FundingCallListInput,
  FundingCallUpdateInput,
} from "../api/FundingCallSchemas";
import type {
  FundingCallPage,
  FundingCallView,
} from "../api/FundingCallTransport";
import type { FundingCall } from "../domain/FundingCall";
import {
  insertFundingCall,
  readFundingCallById,
  readFundingCallByPublicIdentifier,
  updateDraftFundingCall,
} from "../infrastructure/FundingCallRepository";
import { readFundingCalls } from "../infrastructure/FundingCallAdminListRepository";
import {
  cloneFundingCallRecord,
  deleteFundingCallRecord,
} from "../infrastructure/FundingCallCommandRepository";
import {
  resolveEligibilityRuleSetContexts,
  resolveFundingCallEligibilityContext,
} from "../ServerFundingCallEligibilityContextIntegration";

function view(call: FundingCall): FundingCallView {
  return {
    ...call,
    closesAt: call.closesAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    opensAt: call.opensAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

async function requireEligibilityCompatibility(
  call: Pick<
    FundingCallCreateInput,
    "formVersionId" | "title" | "workflowTemplateVersionId"
  > & { id?: string },
  eligibilityVersionId: string,
) {
  const [ruleSet, inputs, existingContexts, proposedContext] = await Promise.all([
    findTestableEligibilityRuleSetForEvaluation(eligibilityVersionId),
    listEligibilityInputs(eligibilityVersionId),
    resolveEligibilityRuleSetContexts(eligibilityVersionId),
    resolveFundingCallEligibilityContext({
      formVersionId: call.formVersionId,
      id: call.id ?? "unpersisted-funding-call",
      title: call.title,
      workflowTemplateVersionId: call.workflowTemplateVersionId,
    }),
  ]);
  if (!ruleSet) {
    throw new RequestValidationError(
      "The selected eligibility ruleset version is unavailable.",
    );
  }
  const registry = buildEligibilityFieldRegistry({
    contexts: [
      ...existingContexts.filter((context) => context.fundingCallId !== call.id),
      proposedContext,
    ],
    inputs,
  });
  const ruleIssues = ruleSet.rules.flatMap((rule) => {
    const available = new Set(
      eligibilityFieldsForExecutionMode(registry.fields, rule.executionMode)
        .map((field) => field.key),
    );
    return workflowConditionNodeFieldPaths(rule.conditionDefinition)
      .filter((path) => !available.has(path))
      .map((path) => `${rule.reasonCode}: field "${path}" is unavailable in ${rule.executionMode}.`);
  });
  const issues = [
    ...registry.issues.map((issue) => issue.message),
    ...ruleIssues,
  ];
  if (issues.length) {
    throw new RequestValidationError(
      `The eligibility ruleset is incompatible with these exact bindings: ${[
        ...new Set(issues),
      ].join(" ")}`,
    );
  }
}

async function requireBindableBindings(
  input: Pick<
    FundingCallCreateInput,
    | "eligibilityRuleSetVersionId"
    | "formVersionId"
    | "title"
    | "workflowTemplateVersionId"
  >,
  fundingCallId?: string,
) {
  const [formIsBindable, eligibilityIsBindable, workflowIsBindable] =
    await Promise.all([
      input.formVersionId
        ? formVersionIsBindable(input.formVersionId, "FUNDING_APPLICATION")
        : Promise.resolve(true),
      input.eligibilityRuleSetVersionId
        ? eligibilityRuleSetVersionIsBindable(
            input.eligibilityRuleSetVersionId,
          )
        : Promise.resolve(true),
      input.workflowTemplateVersionId
        ? workflowTemplateVersionIsBindable(input.workflowTemplateVersionId)
        : Promise.resolve(true),
    ]);
  if (!formIsBindable) {
    throw new RequestValidationError(
      "Select a draft or published application form version.",
    );
  }
  if (!eligibilityIsBindable) {
    throw new RequestValidationError(
      "Select a draft or published eligibility ruleset version.",
    );
  }
  if (!workflowIsBindable) {
    throw new RequestValidationError(
      "Select a draft or published workflow template version.",
    );
  }
  if (input.eligibilityRuleSetVersionId) {
    await requireEligibilityCompatibility(
      { ...input, id: fundingCallId },
      input.eligibilityRuleSetVersionId,
    );
  }
}

export async function listFundingCalls(
  user: AuthenticatedUser | null,
  input: FundingCallListInput,
): Promise<FundingCallPage> {
  requirePermission(user, permissionCodes.fundingCallRead);
  const page = await readFundingCalls(input);
  return { ...page, items: page.items.map(view) };
}

export async function getFundingCall(
  user: AuthenticatedUser | null,
  id: string,
): Promise<FundingCallView> {
  requirePermission(user, permissionCodes.fundingCallRead);
  const call = await readFundingCallById(id);
  if (!call) throw new ResourceNotFoundError("funding call");
  return view(call);
}

export async function getFundingCallByPublicIdentifier(
  user: AuthenticatedUser | null,
  identifier: string,
): Promise<FundingCallView> {
  requirePermission(user, permissionCodes.fundingCallRead);
  const call = await readFundingCallByPublicIdentifier(identifier);
  if (!call) throw new ResourceNotFoundError("funding call");
  return view(call);
}

export async function createFundingCall(
  user: AuthenticatedUser | null,
  input: FundingCallCreateInput,
): Promise<FundingCallView> {
  const actor = requirePermission(user, permissionCodes.fundingCallCreate);
  await requireBindableBindings(input);
  return view(await insertFundingCall(actor.id, input));
}

export async function cloneFundingCall(
  user: AuthenticatedUser | null,
  id: string,
): Promise<FundingCallView> {
  const actor = requirePermission(user, permissionCodes.fundingCallCreate);
  const cloned = await cloneFundingCallRecord(actor.id, id);
  if (!cloned) throw new ResourceNotFoundError("funding call");
  return view(cloned);
}

export async function deleteFundingCall(
  user: AuthenticatedUser | null,
  id: string,
): Promise<{ id: string }> {
  requirePermission(user, permissionCodes.fundingCallDelete);
  const result = await deleteFundingCallRecord(id);
  if (result === "not_found") throw new ResourceNotFoundError("funding call");
  if (result === "has_applications") {
    throw new ResourceConflictError(
      "Funding calls with applications cannot be deleted.",
    );
  }
  return { id };
}

export async function listBindableApplicationFormVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listBindableFormVersions("FUNDING_APPLICATION");
}

export async function listBindableEligibilityRuleSetVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listBindableRuleSetVersions();
}

export async function listBindableWorkflowTemplateVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listBindableWorkflowVersions();
}

export async function updateFundingCall(
  user: AuthenticatedUser | null,
  id: string,
  input: FundingCallUpdateInput,
): Promise<FundingCallView> {
  const actor = requirePermission(user, permissionCodes.fundingCallUpdate);
  await requireBindableBindings(input, id);
  const updated = await updateDraftFundingCall(actor.id, id, input);
  if (updated) return view(updated);

  const existing = await readFundingCallById(id);
  if (!existing) throw new ResourceNotFoundError("funding call");
  throw new ResourceConflictError(
    existing.status === "DRAFT"
      ? "The funding call changed. Refresh it before saving again."
      : "Only draft funding calls can be edited.",
  );
}
