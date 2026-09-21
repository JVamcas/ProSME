export type PublicEligibilityQuestionType =
  | "boolean"
  | "date"
  | "number"
  | "text";

export type PublicEligibilityQuestion = {
  id: string;
  label: string;
  type: PublicEligibilityQuestionType;
};

export type PublicEligibilitySelfCheckWorkspace = {
  advisory: true;
  configurationToken: string;
  fundingCall: {
    applicationsOpen: boolean;
    id: string;
    slug: string;
    title: string;
  };
  questions: PublicEligibilityQuestion[];
};

export type PublicEligibilityAnswer = boolean | number | string;

export type PublicEligibilitySelfCheckInput = {
  answers: Record<string, PublicEligibilityAnswer>;
  configurationToken: string;
};

export type PublicEligibilityGuidanceSeverity =
  | "blocking"
  | "review"
  | "warning";

export type PublicEligibilityGuidance = {
  message: string;
  severity: PublicEligibilityGuidanceSeverity;
};

export type PublicEligibilitySelfCheckOutcome =
  | "likely-eligible"
  | "not-currently-eligible"
  | "review-required";

export type PublicEligibilitySelfCheckResult = {
  advisory: true;
  applicationsOpen: boolean;
  disclaimer: string;
  fundingCallId: string;
  guidance: PublicEligibilityGuidance[];
  outcome: PublicEligibilitySelfCheckOutcome;
};
