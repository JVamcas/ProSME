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
  getConfigurableFormFields,
  listBindableFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  eligibilityRuleSetVersionIsBindable,
  listBindableEligibilityRuleSetVersions as listBindableRuleSetVersions,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { findTestableEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { eligibilityContextFields } from "@/modules/eligibility/domain/EligibilityConditionFields";
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
  formVersionId: string,
  eligibilityVersionId: string,
) {
  const [formFields, ruleSet] = await Promise.all([
    getConfigurableFormFields(formVersionId),
    findTestableEligibilityRuleSetForEvaluation(eligibilityVersionId),
  ]);
  if (!formFields || !ruleSet) {
    throw new RequestValidationError(
      "The selected form or eligibility ruleset version is unavailable.",
    );
  }
  const available = new Set(
    eligibilityContextFields(formFields).map((field) => field.key),
  );
  const missing = [...new Set(ruleSet.rules.flatMap((rule) =>
    workflowConditionNodeFieldPaths(rule.conditionDefinition)
      .filter((path) => !available.has(path))
  ))];
  if (missing.length) {
    throw new RequestValidationError(
      `The eligibility ruleset requires fields not supplied by this funding call and form: ${missing.join(", ")}.`,
    );
  }
}

async function requireBindableBindings(
  input: Pick<
    FundingCallCreateInput,
    | "eligibilityRuleSetVersionId"
    | "formVersionId"
    | "workflowTemplateVersionId"
  >,
) {
  const [formIsBindable, eligibilityIsBindable, workflowIsBindable] =
    await Promise.all([
      input.formVersionId
        ? formVersionIsBindable(input.formVersionId)
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
  if (input.eligibilityRuleSetVersionId && input.formVersionId) {
    await requireEligibilityCompatibility(
      input.formVersionId,
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

export async function listBindableApplicationFormVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listBindableFormVersions();
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
  await requireBindableBindings(input);
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
