import { describe, expect, it } from "vitest";

import {
  eligibilityBuilderFieldPresentations,
} from "@/modules/eligibility/ui/EligibilityBuilderFieldPresentation";
import type {
  EligibilityFieldDescriptor,
  EligibilitySourceDescriptor,
} from "@/modules/eligibility/domain/EligibilityFieldRegistry";

const versionId = "81000000-0000-4000-8000-000000000001";
const definitionId = "81000000-0000-4000-8000-000000000002";

const source: EligibilitySourceDescriptor = {
  availableBeforeEligibility: true,
  fundingCallId: "81000000-0000-4000-8000-000000000003",
  label: "Verified employee count",
  sourceDefinitionId: definitionId,
  sourceKey: "employee_count",
  sourceKind: "APPLICATION_FORM_FIELD",
  sourceVersionId: versionId,
  supportedTypes: ["NUMBER"],
};

function field(
  availableIn: EligibilityFieldDescriptor["availableIn"],
): EligibilityFieldDescriptor {
  return {
    availableIn,
    key: "eligibility.employee_count",
    label: "Employee count",
    screeningSource: availableIn.includes("SCREENING")
      ? {
          sourceDefinitionId: definitionId,
          sourceKey: "employee_count",
          sourceKind: "APPLICATION_FORM_FIELD",
          sourceVersionId: versionId,
          valuePath: "answers.employee_count",
        }
      : null,
    sourceDefinitionId: "81000000-0000-4000-8000-000000000004",
    sourceKind: "ELIGIBILITY_INPUT",
    sourceVersionId: versionId,
    type: "NUMBER",
  };
}

describe("Eligibility Builder field presentation", () => {
  it("filters fields by the selected execution mode", () => {
    const selfCheckOnly = field(["SELF_CHECK"]);
    const both = field(["SELF_CHECK", "SCREENING"]);

    expect(eligibilityBuilderFieldPresentations(
      [selfCheckOnly, both],
      [source],
      "BOTH",
    )).toHaveLength(1);
  });

  it("shows administrator-facing mode and source labels without internal ids", () => {
    const [presentation] = eligibilityBuilderFieldPresentations(
      [field(["SELF_CHECK", "SCREENING"])],
      [source],
      "BOTH",
    );

    expect(presentation).toMatchObject({
      modeLabel: "Self Check + Screening",
      sourceLabel: "Applicant answer / Verified employee count",
    });
    expect(presentation?.builderField.label).toBe(
      "Employee count — Self Check + Screening · Applicant answer / Verified employee count",
    );
    expect(JSON.stringify(presentation)).not.toContain(definitionId);
    expect(JSON.stringify(presentation)).not.toContain(versionId);
  });
});
