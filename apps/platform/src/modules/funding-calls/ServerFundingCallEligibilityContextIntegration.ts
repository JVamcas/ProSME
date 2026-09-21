import "server-only";

import { getConfigurableFormFields } from "@/modules/forms/infrastructure/FormRepository";
import { readEligibilityRuleSetContexts } from "./infrastructure/FundingCallEligibilityContextRepository";
import { readFundingCallById } from "./infrastructure/FundingCallRepository";

export async function resolveEligibilityRuleSetContexts(versionId: string) {
  const calls = await readEligibilityRuleSetContexts(versionId);
  const contexts = await Promise.all(
    calls.map(async (call) => ({
      ...call,
      formFields: call.formVersionId
        ? await getConfigurableFormFields(call.formVersionId)
        : null,
    })),
  );
  return contexts;
}

export async function resolveEligibilityTestFundingCall(
  fundingCallId: string,
  eligibilityVersionId: string,
) {
  const call = await readFundingCallById(fundingCallId);
  if (call?.eligibilityRuleSetVersionId !== eligibilityVersionId) return null;
  return call;
}
