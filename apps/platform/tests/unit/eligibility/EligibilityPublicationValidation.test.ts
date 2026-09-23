import { describe, expect, it } from "vitest";

import type { EligibilityBuilderRule } from "@/modules/eligibility/api/EligibilityRuleSetTransport";
import type { EligibilityFieldDescriptor } from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import { validateEligibilityPublicationPreview } from "@/modules/eligibility/ui/EligibilityPublicationValidation";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";

const field: EligibilityFieldDescriptor = {
  availableIn: ["SCREENING"],
  key: "eligibility.verified_turnover",
  label: "Verified turnover",
  screeningSource: null,
  sourceDefinitionId: "82000000-0000-4000-8000-000000000001",
  sourceKind: "ELIGIBILITY_INPUT",
  sourceVersionId: "82000000-0000-4000-8000-000000000002",
  type: "NUMBER",
};

const rule: EligibilityBuilderRule = {
  applicantMessage: "Turnover is outside the permitted range.",
  condition: {
    children: [{
      id: "82000000-0000-4000-8000-000000000003",
      kind: "CONDITION",
      leftOperand: { key: field.key, kind: "FIELD" },
      operator: basicOperators.GREATER_THAN,
      rightOperand: { kind: "CONSTANT", value: 0 },
    }],
    combinator: "AND",
    id: "82000000-0000-4000-8000-000000000004",
    kind: "GROUP",
  },
  executionMode: "BOTH",
  failureType: "HARD_FAIL",
  id: "82000000-0000-4000-8000-000000000005",
  order: 1,
  questionId: "82000000-0000-4000-8000-000000000006",
  reasonCode: "TURNOVER_REQUIRED",
};

describe("Eligibility publication validation preview", () => {
  it("reports Both-mode reference impact before publication", () => {
    const result = validateEligibilityPublicationPreview({
      fields: [field],
      registryIssues: [],
      rules: [rule],
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toContain(
      'TURNOVER_REQUIRED: Field "eligibility.verified_turnover" is not available.',
    );
  });

  it("includes binding registry issues in the publication result", () => {
    const result = validateEligibilityPublicationPreview({
      fields: [field],
      registryIssues: [{
        code: "SOURCE_NOT_BOUND",
        message: "Verified turnover no longer resolves from the bound form.",
      }],
      rules: [],
    });

    expect(result).toEqual({
      issues: ["Verified turnover no longer resolves from the bound form."],
      ready: false,
    });
  });
});
