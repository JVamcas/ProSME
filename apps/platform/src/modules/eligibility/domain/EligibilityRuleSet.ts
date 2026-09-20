import type { EligibilityRule } from "./EligibilityRule";

export const eligibilityRuleSetStatuses = [
  "DRAFT",
  "PUBLISHED",
  "RETIRED",
] as const;

export type EligibilityRuleSetStatus =
  (typeof eligibilityRuleSetStatuses)[number];

export type EligibilityRuleSetDefinition = {
  active: boolean;
  code: string;
  createdAt: Date;
  description: string;
  id: string;
  name: string;
  updatedAt: Date;
};

export type EligibilityRuleSetVersion = {
  createdAt: Date;
  id: string;
  publishedAt: Date | null;
  retiredAt: Date | null;
  rowVersion: number;
  ruleSetId: string;
  status: EligibilityRuleSetStatus;
  updatedAt: Date;
  versionNumber: number;
};

export type EligibilityRuleSet = {
  definition: EligibilityRuleSetDefinition;
  rules: EligibilityRule[];
  version: EligibilityRuleSetVersion;
  versions: EligibilityRuleSetVersion[];
};
