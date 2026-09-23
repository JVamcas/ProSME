import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import type { SelfCheckAnswerType } from "./EligibilityInputDefinition";

export const eligibilityQuestionInputTypes = [
  "BOOLEAN",
  "YES_NO_NA",
  "TEXT",
  "NUMBER",
  "PERCENTAGE",
  "DATE",
] as const;

export type EligibilityQuestionInputType =
  (typeof eligibilityQuestionInputTypes)[number];

export type EligibilityQuestion = {
  active: boolean;
  applicantLabel: string;
  code: string;
  createdAt: Date;
  id: string;
  inputType: EligibilityQuestionInputType;
  reviewerLabel: string;
  rowVersion: number;
  updatedAt: Date;
};

export type EligibilityQuestionBinding = {
  applicantLabel: string;
  code: string;
  id: string;
  inputType: EligibilityQuestionInputType;
  order: number;
  questionId: string;
  reviewerLabel: string;
  versionId: string;
};

export function questionConditionType(
  inputType: EligibilityQuestionInputType,
): ConditionFieldType {
  if (inputType === "PERCENTAGE") return "NUMBER";
  if (inputType === "YES_NO_NA") return "TEXT";
  return inputType;
}

export function questionAnswerType(
  inputType: EligibilityQuestionInputType,
): SelfCheckAnswerType {
  return inputType;
}
