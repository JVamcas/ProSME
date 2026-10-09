import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import { fundingCallWorkingView } from "../domain/FundingCallVersion";
import { fundingCallDraftVersions } from "./funding-call-version.schema";
import { fundingCalls } from "./funding-call.schema";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";

export async function readFundingCallDetail(id: string) {
  const [row] = await getDatabase()
    .select({
      call: fundingCalls,
      draft: fundingCallDraftVersions,
      formDefinitionId: formVersions.formDefinitionId,
      eligibilityRuleSetId: eligibilityRuleSetVersions.ruleSetId,
      workflowDefinitionId: workflowDefinitionVersions.definitionId,
    })
    .from(fundingCalls)
    .leftJoin(
      fundingCallDraftVersions,
      eq(fundingCallDraftVersions.fundingCallId, fundingCalls.id),
    )
    .leftJoin(
      formVersions,
      eq(
        formVersions.id,
        sql`case when ${fundingCallDraftVersions.id} is not null then (${fundingCallDraftVersions.snapshot}->>'formVersionId')::uuid else ${fundingCalls.formVersionId} end`,
      ),
    )
    .leftJoin(
      eligibilityRuleSetVersions,
      eq(
        eligibilityRuleSetVersions.id,
        sql`case when ${fundingCallDraftVersions.id} is not null then (${fundingCallDraftVersions.snapshot}->>'eligibilityRuleSetVersionId')::uuid else ${fundingCalls.eligibilityRuleSetVersionId} end`,
      ),
    )
    .leftJoin(
      workflowDefinitionVersions,
      eq(
        workflowDefinitionVersions.id,
        sql`case when ${fundingCallDraftVersions.id} is not null then (${fundingCallDraftVersions.snapshot}->>'workflowTemplateVersionId')::uuid else ${fundingCalls.workflowTemplateVersionId} end`,
      ),
    )
    .where(eq(fundingCalls.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    call: {
      ...fundingCallWorkingView(row.call, row.draft),
      description: sanitizeFundingCallDescription(
        row.draft?.snapshot.description ?? row.call.description,
      ),
      eligibilitySummary: sanitizeFundingCallEligibilitySummary(
        row.draft
          ? row.draft.snapshot.eligibilitySummary
          : row.call.eligibilitySummary,
      ),
    },
  };
}
