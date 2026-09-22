import { describe, expect, it } from "vitest";

import { integrationOutputSourceDescriptors } from "@/modules/eligibility/domain/EligibilityIntegrationFieldSources";

describe("eligibility integration field sources", () => {
  it("publishes eligible typed outputs to the Screening source catalogue", () => {
    const sources = integrationOutputSourceDescriptors("call-1", [{
      fundingCallId: "call-1",
      integrationVersionId: "contract-version-1",
      label: "Register A: Active registration",
      output: {
        description: "Active status",
        eligibleForScreening: true,
        key: "active",
        label: "Active registration",
        type: "BOOLEAN",
      },
    }, {
      fundingCallId: "call-2",
      integrationVersionId: "contract-version-2",
      label: "Other call output",
      output: {
        description: "Other value",
        eligibleForScreening: true,
        key: "other",
        label: "Other",
        type: "TEXT",
      },
    }]);

    expect(sources).toEqual([{
      availableBeforeEligibility: true,
      fundingCallId: "call-1",
      label: "Register A: Active registration",
      sourceDefinitionId: "contract-version-1",
      sourceKey: "active",
      sourceKind: "INTEGRATION_OUTPUT",
      sourceVersionId: "contract-version-1",
      supportedTypes: ["BOOLEAN"],
    }]);
  });

  it("keeps rule-facing identity stable when provider metadata changes", () => {
    const output = {
      description: "Active status",
      eligibleForScreening: true,
      key: "active",
      label: "Active registration",
      type: "BOOLEAN" as const,
    };
    const first = integrationOutputSourceDescriptors("call-1", [{
      fundingCallId: "call-1",
      integrationVersionId: "contract-version-1",
      label: "Provider A: Active registration",
      output,
    }])[0]!;
    const replacement = integrationOutputSourceDescriptors("call-1", [{
      fundingCallId: "call-1",
      integrationVersionId: "contract-version-1",
      label: "Provider B: Active registration",
      output,
    }])[0]!;

    expect({ ...first, label: undefined }).toEqual({
      ...replacement,
      label: undefined,
    });
  });
});
