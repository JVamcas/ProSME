import { defineStandardForm } from "./StandardFormBuilder";
import type { StandardFormSeed } from "./StandardFormDefinition";

export function eligibilityVerificationForm(): StandardFormSeed {
  return {
    ...defineStandardForm({
      code: "ELIGIBILITY_VERIFICATION",
      description:
        "Workflow template placeholder. Published Eligibility Rulesets generate the reviewer fields.",
      instructions:
        "The attached Eligibility Ruleset supplies the reviewer questions.",
      name: "Eligibility Verification Form",
      sections: [{
        fields: [{
          helpText:
            "This template field is replaced by the published Eligibility Ruleset at task activation.",
          key: "RULESET_CONFIGURATION",
          label: "Eligibility Ruleset configuration",
          type: "TEXT",
        }],
        key: "RULESET_CONFIGURATION",
        title: "Eligibility configuration",
      }],
      submitLabel: "Complete eligibility verification",
    }),
    publishOnSeed: true,
  };
}
