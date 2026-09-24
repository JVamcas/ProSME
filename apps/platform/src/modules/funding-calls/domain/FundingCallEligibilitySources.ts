import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";

export type FundingCallEligibilitySourceDefinition = {
  key: string;
  label: string;
  type: ConditionFieldType;
};

// These are platform Funding Call properties, not programme eligibility criteria.
export const fundingCallEligibilitySourceDefinitions = [
  { key: "id", label: "Funding Call ID", type: "TEXT" },
  { key: "title", label: "Funding Call title", type: "TEXT" },
  { key: "status", label: "Funding Call status", type: "TEXT" },
  {
    key: "minimumGrantAmount",
    label: "Minimum grant amount",
    type: "NUMBER",
  },
  {
    key: "maximumGrantAmount",
    label: "Maximum grant amount",
    type: "NUMBER",
  },
  {
    key: "totalBudgetEnvelope",
    label: "Total budget envelope",
    type: "NUMBER",
  },
  {
    key: "fundingInstrument",
    label: "Funding instrument",
    type: "TEXT",
  },
  { key: "thematicArea", label: "Thematic area", type: "TEXT" },
  { key: "opensAt", label: "Opening date", type: "DATE" },
  { key: "closesAt", label: "Closing date", type: "DATE" },
] as const satisfies readonly FundingCallEligibilitySourceDefinition[];
