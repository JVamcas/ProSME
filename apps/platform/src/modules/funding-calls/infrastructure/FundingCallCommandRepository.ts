import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { applications } from "@/modules/applications/infrastructure/application.schema";
import { fundingCallEligibilityIntegrationBindings } from "@/modules/eligibility/infrastructure/eligibility-integration.schema";
import type { FundingCall } from "../domain/FundingCall";
import {
  fundingCallGovernanceReviews,
  fundingCallLifecycleHistory,
  fundingCallPublicationRevisions,
  fundingCallPublicDocuments,
  fundingCalls,
} from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

export type DeleteFundingCallResult = "deleted" | "has_applications" | "not_found";

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
  };
}

function cloneIdentifiers(source: typeof fundingCalls.$inferSelect) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return {
    reference: `${source.reference.slice(0, 66)}-COPY-${suffix.toUpperCase()}`,
    slug: `${source.slug.slice(0, 106)}-copy-${suffix}`,
  };
}

export async function cloneFundingCallRecord(
  actorId: string,
  fundingCallId: string,
): Promise<FundingCall | null> {
  return getDatabase().transaction(async (transaction) => {
    const [source] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, fundingCallId))
      .for("update")
      .limit(1);
    if (!source) return null;

    const [documents, integrationBindings] = await Promise.all([
      transaction
        .select()
        .from(fundingCallPublicDocuments)
        .where(eq(fundingCallPublicDocuments.fundingCallId, fundingCallId)),
      transaction
        .select()
        .from(fundingCallEligibilityIntegrationBindings)
        .where(eq(
          fundingCallEligibilityIntegrationBindings.fundingCallId,
          fundingCallId,
        )),
    ]);
    const identifiers = cloneIdentifiers(source);
    const [cloned] = await transaction
      .insert(fundingCalls)
      .values({
        applicationDuplicatePolicy: source.applicationDuplicatePolicy,
        closesAt: source.closesAt,
        createdBy: actorId,
        description: source.description,
        eligibilityRuleSetVersionId: source.eligibilityRuleSetVersionId,
        eligibilitySummary: source.eligibilitySummary,
        formVersionId: source.formVersionId,
        fundingInstrument: source.fundingInstrument,
        maximumGrantAmount: source.maximumGrantAmount,
        minimumGrantAmount: source.minimumGrantAmount,
        opensAt: source.opensAt,
        publicContactEmail: source.publicContactEmail,
        publicContactName: source.publicContactName,
        publicContactPhone: source.publicContactPhone,
        reference: identifiers.reference,
        slug: identifiers.slug,
        status: "DRAFT",
        thematicArea: source.thematicArea,
        title: `Copy of ${source.title}`.slice(0, 240),
        totalBudgetEnvelope: source.totalBudgetEnvelope,
        updatedBy: actorId,
        workflowTemplateVersionId: source.workflowTemplateVersionId,
      })
      .returning();

    if (documents.length) {
      await transaction.insert(fundingCallPublicDocuments).values(
        documents.map((document) => ({
          displayOrder: document.displayOrder,
          finalized: false,
          fundingCallId: cloned.id,
          label: document.label,
          markedForPublication: false,
          publishedAt: null,
          securityCleared: false,
          url: document.url,
        })),
      );
    }
    if (integrationBindings.length) {
      await transaction
        .insert(fundingCallEligibilityIntegrationBindings)
        .values(integrationBindings.map((binding) => ({
          createdBy: actorId,
          fundingCallId: cloned.id,
          integrationVersionId: binding.integrationVersionId,
          manualFallbackAllowed: binding.manualFallbackAllowed,
          providerAdapterKey: binding.providerAdapterKey,
          providerDisplayName: binding.providerDisplayName,
          secretReference: binding.secretReference,
          workflowTemplateVersionId: binding.workflowTemplateVersionId,
        })));
    }
    return toFundingCall(cloned);
  });
}

export async function deleteFundingCallRecord(
  fundingCallId: string,
): Promise<DeleteFundingCallResult> {
  return getDatabase().transaction(async (transaction) => {
    const [call] = await transaction
      .select({ id: fundingCalls.id })
      .from(fundingCalls)
      .where(eq(fundingCalls.id, fundingCallId))
      .for("update")
      .limit(1);
    if (!call) return "not_found";

    const [application] = await transaction
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.fundingOpportunityId, fundingCallId))
      .limit(1);
    if (application) return "has_applications";

    await transaction
      .delete(fundingCallPublicationRevisions)
      .where(eq(fundingCallPublicationRevisions.fundingCallId, fundingCallId));
    await transaction
      .delete(fundingCallGovernanceReviews)
      .where(eq(fundingCallGovernanceReviews.fundingCallId, fundingCallId));
    await transaction
      .delete(fundingCallEligibilityIntegrationBindings)
      .where(eq(
        fundingCallEligibilityIntegrationBindings.fundingCallId,
        fundingCallId,
      ));
    await transaction
      .delete(fundingCallLifecycleHistory)
      .where(eq(fundingCallLifecycleHistory.fundingCallId, fundingCallId));
    await transaction.delete(fundingCalls).where(eq(fundingCalls.id, fundingCallId));
    return "deleted";
  });
}
