import type { EligibilityQuestionInputType } from "../domain/EligibilityQuestion";

export type EligibilityQuestionSummary = {
  active: boolean;
  applicantLabel: string;
  bindingCount: number;
  code: string;
  id: string;
  inputType: EligibilityQuestionInputType;
  reviewerLabel: string;
  rowVersion: number;
  updatedAt: string;
};

export type EligibilityQuestionPage = {
  items: EligibilityQuestionSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
