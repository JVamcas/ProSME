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
  formVersionIsPublished,
  listPublishedFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  eligibilityRuleSetVersionIsPublished,
  listPublishedEligibilityRuleSetVersions,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import {
  listPublishedWorkflowVersions,
  workflowTemplateVersionIsPublished,
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
  readFundingCalls,
  updateDraftFundingCall,
} from "../infrastructure/FundingCallRepository";

function view(call: FundingCall): FundingCallView {
  return {
    ...call,
    closesAt: call.closesAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    opensAt: call.opensAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

async function requirePublishedBindings(
  input: Pick<
    FundingCallCreateInput,
    | "eligibilityRuleSetVersionId"
    | "formVersionId"
    | "workflowTemplateVersionId"
  >,
) {
  const [formIsPublished, eligibilityIsPublished, workflowIsPublished] =
    await Promise.all([
      formVersionIsPublished(input.formVersionId),
      eligibilityRuleSetVersionIsPublished(input.eligibilityRuleSetVersionId),
      workflowTemplateVersionIsPublished(input.workflowTemplateVersionId),
    ]);
  if (!formIsPublished) {
    throw new RequestValidationError(
      "Select an application form version that is published.",
    );
  }
  if (!eligibilityIsPublished) {
    throw new RequestValidationError(
      "Select an eligibility ruleset version that is published.",
    );
  }
  if (!workflowIsPublished) {
    throw new RequestValidationError(
      "Select a workflow template version that is published.",
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
  await requirePublishedBindings(input);
  return view(await insertFundingCall(actor.id, input));
}

export async function listBindableApplicationFormVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listPublishedFormVersions();
}

export async function listBindableEligibilityRuleSetVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listPublishedEligibilityRuleSetVersions();
}

export async function listBindableWorkflowTemplateVersions(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.fundingCallCreate,
    permissionCodes.fundingCallUpdate,
  ]);
  return listPublishedWorkflowVersions();
}

export async function updateFundingCall(
  user: AuthenticatedUser | null,
  id: string,
  input: FundingCallUpdateInput,
): Promise<FundingCallView> {
  const actor = requirePermission(user, permissionCodes.fundingCallUpdate);
  await requirePublishedBindings(input);
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
