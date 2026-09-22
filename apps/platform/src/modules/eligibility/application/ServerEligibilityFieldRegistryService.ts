import "server-only";

import { resolveEligibilityRuleSetContexts } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";
import { buildEligibilityFieldRegistry } from "../domain/EligibilityFieldRegistry";
import { listEligibilityInputs } from "../infrastructure/EligibilityInputRepository";

export async function resolveEligibilityFieldRegistry(versionId: string) {
  const [contexts, inputs] = await Promise.all([
    resolveEligibilityRuleSetContexts(versionId),
    listEligibilityInputs(versionId),
  ]);
  const registry = buildEligibilityFieldRegistry({
    contexts,
    inputs,
  });
  return {
    ...registry,
    fundingCalls: contexts.map((context) => ({
      id: context.fundingCallId,
      title: context.fundingCallTitle,
    })),
  };
}
