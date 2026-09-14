export type EligibilityAnswer = "yes" | "no";

export type EligibilityOutcome =
  | "likely-eligible"
  | "action-required"
  | "not-currently-eligible";

export type EligibilityRuleSnapshot = {
  hardStop: boolean;
  help: string;
  id: string;
  question: string;
};

export type EligibilityAssessmentInput = {
  answers: Record<string, EligibilityAnswer>;
  expectedRuleSetVersion: string;
  fundingOpportunityId: number;
};

export type EligibilityAssessmentView = {
  answers: Record<string, EligibilityAnswer>;
  createdAt: string;
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  id: string;
  outcome: EligibilityOutcome;
  ruleSetVersion: string;
  rules: EligibilityRuleSnapshot[];
};

export type EligibilityWorkspace = {
  assessments: EligibilityAssessmentView[];
  fundingOpportunity: {
    id: number;
    title: string;
  };
  rules: EligibilityRuleSnapshot[];
  ruleSetVersion: string;
};

