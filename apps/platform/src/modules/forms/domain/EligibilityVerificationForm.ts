import type { StandardFormSeed } from "./StandardFormDefinition";
import { defineStandardForm } from "./StandardFormBuilder";

export function eligibilityVerificationForm(): StandardFormSeed {
  return {
    ...defineStandardForm({
      code: "ELIGIBILITY_VERIFICATION",
      description:
        "Captures verified Screening values for the Funding Call's bound Eligibility Ruleset.",
      instructions:
        "Record verified values from configured application, document, checklist and register evidence before authoritative eligibility runs.",
      name: "Eligibility Verification Form",
      sections: [{
        fields: [
          {
            key: "NAMIBIAN_OWNERSHIP_PERCENTAGE",
            label: "Verified Namibian ownership percentage",
            maximum: 100,
            minimum: 0,
            required: true,
            type: "PERCENTAGE",
          },
          {
            key: "NIPDB_MSME_DATABASE_REGISTERED",
            label: "NIPDB MSME database registration verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "APPLICABLE_REGISTRATIONS_VERIFIED",
            label: "Applicable statutory and sectoral registrations verified",
            options: ["Yes", "No", "Not applicable"],
            required: true,
            type: "SINGLE_SELECT",
          },
          {
            key: "NAMRA_GOOD_STANDING",
            label: "NAMRA good standing verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "SOCIAL_SECURITY_GOOD_STANDING",
            label: "Social Security Commission good standing verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "MSME_STATUS_VALID",
            label: "Valid MSME status verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "FUNCTIONAL_BUSINESS_BANK_ACCOUNT",
            label: "Functional business bank account verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "OPERATING_MONTHS",
            label: "Verified complete operating months",
            minimum: 0,
            required: true,
            type: "NUMBER",
          },
          {
            key: "BUSINESS_MODEL_FEASIBLE",
            label: "Business model feasibility verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "MARKET_EXPANSION_READINESS",
            label: "Market expansion readiness verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "INCUBATION_OR_ACCELERATION_COMMITMENT",
            label: "Incubation or acceleration commitment verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "BUSINESS_PROFILE_WITHIN_PAGE_LIMIT",
            label: "Business profile page limit verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "PITCH_DECK_WITHIN_SLIDE_LIMIT",
            label: "Pitch deck slide limit verified",
            required: true,
            type: "YES_NO",
          },
          {
            key: "POLICE_CLEARANCE_OR_APPLICATION_PROOF_PRESENT",
            label: "Police clearance evidence verified",
            required: true,
            type: "YES_NO",
          },
        ],
        key: "VERIFIED_ELIGIBILITY",
        title: "Verified eligibility evidence",
      }],
      submitLabel: "Complete eligibility verification",
    }),
    publishOnSeed: true,
  };
}
