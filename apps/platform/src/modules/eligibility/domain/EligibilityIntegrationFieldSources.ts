import type { EligibilitySourceDescriptor } from "./EligibilityFieldRegistry";
import type { EligibilityIntegrationOutputDefinition } from "./EligibilityIntegration";

export type BoundEligibilityIntegrationOutput = {
  fundingCallId: string;
  integrationVersionId: string;
  label: string;
  output: EligibilityIntegrationOutputDefinition;
};

export function integrationOutputSourceDescriptors(
  fundingCallId: string,
  outputs: readonly BoundEligibilityIntegrationOutput[],
): EligibilitySourceDescriptor[] {
  return outputs
    .filter((source) =>
      source.fundingCallId === fundingCallId
      && source.output.eligibleForScreening
    )
    .map((source) => ({
      availableBeforeEligibility: true,
      fundingCallId,
      label: source.label,
      sourceDefinitionId: source.integrationVersionId,
      sourceKey: source.output.key,
      sourceKind: "INTEGRATION_OUTPUT",
      sourceVersionId: source.integrationVersionId,
      supportedTypes: [source.output.type],
    }));
}
