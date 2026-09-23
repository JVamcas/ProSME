import { describe, expect, it } from "vitest";

import {
  eligibilityBuilderFieldPresentations,
} from "@/modules/eligibility/ui/EligibilityBuilderFieldPresentation";
import type {
  EligibilityFieldDescriptor,
} from "@/modules/eligibility/domain/EligibilityFieldRegistry";

const versionId = "81000000-0000-4000-8000-000000000001";
const definitionId = "81000000-0000-4000-8000-000000000002";

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
      "BOTH",
    )).toHaveLength(1);
  });

  it("shows administrator-facing mode and source labels without internal ids", () => {
    const [presentation] = eligibilityBuilderFieldPresentations(
      [field(["SELF_CHECK", "SCREENING"])],
      "BOTH",
    );

    expect(presentation).toMatchObject({
      sourceLabel: "Applicant / Application",
    });
    expect(presentation?.builderField.label).toBe(
      "Employee count [Applicant / Application]",
    );
    expect(JSON.stringify(presentation)).not.toContain(definitionId);
    expect(JSON.stringify(presentation)).not.toContain(versionId);
  });
});
