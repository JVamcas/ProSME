import type { AuthoritativeEligibilityOutcome } from "./AuthoritativeEligibilityOutcome";

export function evidenceFingerprint(
  outcome: Pick<
    AuthoritativeEligibilityOutcome,
    "evaluatedValueProvenance" | "evaluatedValues"
  >,
) {
  const provenance = Object.fromEntries(
    Object.entries(outcome.evaluatedValueProvenance).map(([path, value]) => [
      path,
      {
        inputDefinitionId: value.inputDefinitionId,
        sourceDefinitionId: value.sourceDefinitionId,
        sourceKey: value.sourceKey,
        sourceKind: value.sourceKind,
        sourceRecordId: value.sourceRecordId,
        sourceVersionId: value.sourceVersionId,
      },
    ]),
  );
  return JSON.stringify({ provenance, values: outcome.evaluatedValues });
}
