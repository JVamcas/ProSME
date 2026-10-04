import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import { fundingCalls } from "./funding-call.schema";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";

export async function readFundingCallDetail(id: string) {
  const [row] = await getDatabase()
    .select({
      call: fundingCalls,
      formDefinitionId: formVersions.formDefinitionId,
      eligibilityRuleSetId: eligibilityRuleSetVersions.ruleSetId,
      workflowDefinitionId: workflowDefinitionVersions.definitionId,
    })
    .from(fundingCalls)
    .leftJoin(formVersions, eq(formVersions.id, fundingCalls.formVersionId))
    .leftJoin(
      eligibilityRuleSetVersions,
      eq(eligibilityRuleSetVersions.id, fundingCalls.eligibilityRuleSetVersionId),
    )
    .leftJoin(
      workflowDefinitionVersions,
      eq(workflowDefinitionVersions.id, fundingCalls.workflowTemplateVersionId),
    )
    .where(eq(fundingCalls.id, id))
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    call: {
      ...row.call,
      description: sanitizeFundingCallDescription(row.call.description),
      eligibilitySummary: sanitizeFundingCallEligibilitySummary(row.call.eligibilitySummary),
    },
  };
}
