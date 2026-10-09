import "server-only";

import { and, asc, eq, max } from "drizzle-orm";
import type { DatabaseTransaction } from "@/db/client";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import type { FundingCall } from "../domain/FundingCall";
import { fundingCallPublicationRevisions } from "./funding-call.schema";
import { fundingCallPublicDocuments } from "./funding-call-public-document.schema";

const absentVersionId = "00000000-0000-0000-0000-000000000000";

export async function readPublicationBindings(
  transaction: DatabaseTransaction,
  call: FundingCall,
) {
  const bindings = await Promise.all([
    transaction
      .select({ id: formVersions.id })
      .from(formVersions)
      .where(
        and(
          eq(formVersions.id, call.formVersionId ?? absentVersionId),
          eq(formVersions.status, "PUBLISHED"),
        ),
      )
      .for("share")
      .limit(1),
    transaction
      .select({ id: eligibilityRuleSetVersions.id })
      .from(eligibilityRuleSetVersions)
      .where(
        and(
          eq(
            eligibilityRuleSetVersions.id,
            call.eligibilityRuleSetVersionId ?? absentVersionId,
          ),
          eq(eligibilityRuleSetVersions.status, "PUBLISHED"),
        ),
      )
      .for("share")
      .limit(1),
    transaction
      .select({ id: workflowDefinitionVersions.id })
      .from(workflowDefinitionVersions)
      .where(
        and(
          eq(
            workflowDefinitionVersions.id,
            call.workflowTemplateVersionId ?? absentVersionId,
          ),
          eq(workflowDefinitionVersions.status, "PUBLISHED"),
        ),
      )
      .for("share")
      .limit(1),
  ]);
  return bindings.every((rows) => rows.length === 1);
}

export async function readPublicationDocumentsAndSequence(
  transaction: DatabaseTransaction,
  fundingCallId: string,
) {
  const [publicDocuments, [previous]] = await Promise.all([
    transaction
      .select({
        label: fundingCallPublicDocuments.label,
        url: fundingCallPublicDocuments.url,
      })
      .from(fundingCallPublicDocuments)
      .where(
        and(
          eq(fundingCallPublicDocuments.fundingCallId, fundingCallId),
          eq(fundingCallPublicDocuments.markedForPublication, true),
        ),
      )
      .orderBy(
        asc(fundingCallPublicDocuments.displayOrder),
        asc(fundingCallPublicDocuments.id),
      ),
    transaction
      .select({
        revisionNumber: max(fundingCallPublicationRevisions.revisionNumber),
      })
      .from(fundingCallPublicationRevisions)
      .where(eq(fundingCallPublicationRevisions.fundingCallId, fundingCallId)),
  ]);
  return {
    publicDocuments,
    revisionNumber: (previous?.revisionNumber ?? 0) + 1,
  };
}
