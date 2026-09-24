import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { isFundingCallEffectivelyOpen } from "@/modules/funding-calls/domain/FundingCallLifecycle";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { getAttachedApplicationForm } from "../infrastructure/AttachedApplicationFormRepository";
import { evaluateApplicationReadiness } from "../domain/ApplicationReadiness";
import { listLatestOwnedApplicationDocumentVersions } from "../infrastructure/ApplicationDocumentRepository";
import { findOwnedApplication } from "../infrastructure/ApplicationRepository";
import { readOwnedApplicationDraftResponse } from "../infrastructure/ApplicationResponseRepository";

export async function getOwnApplicationReadiness(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  const application = await findOwnedApplication(actor.id, applicationId);
  if (!application) throw new ResourceNotFoundError("application");
  if (!application.formVersionId) {
    throw new ResourceNotFoundError("application configuration");
  }
  const now = new Date();
  const [call, documents, form, response] = await Promise.all([
    readFundingCallById(application.fundingOpportunityId),
    listLatestOwnedApplicationDocumentVersions(actor.id, applicationId),
    getAttachedApplicationForm(
      application.formVersionId,
      application.fundingOpportunityId,
    ),
    readOwnedApplicationDraftResponse(actor.id, applicationId),
  ]);
  if (!call || !form || !response) {
    throw new ResourceNotFoundError("application configuration");
  }
  return evaluateApplicationReadiness({
    application: {
      businessId: application.businessId,
      formVersionId: application.formVersionId,
      rowVersion: application.rowVersion,
      status: application.status,
    },
    callOpen: isFundingCallEffectivelyOpen(call, now),
    configurationAvailable: Boolean(
      application.eligibilityRuleSetVersionId
      && call.eligibilityRuleSetVersionId === application.eligibilityRuleSetVersionId
      && call.formVersionId === application.formVersionId
      && call.workflowTemplateVersionId,
    ),
    documents,
    evaluatedAt: now,
    form,
    response,
  });
}
