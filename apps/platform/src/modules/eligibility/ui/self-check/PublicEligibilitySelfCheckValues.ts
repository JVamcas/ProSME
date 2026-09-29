import { z } from "zod";

import type {
  PublicEligibilityAnswer,
  PublicEligibilityQuestion,
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckWorkspace,
} from "../../api/PublicEligibilitySelfCheckTransport";

type FormAnswer = string | string[];
export type FormValues = { answers: Record<string, FormAnswer> };

export function defaults(questions: PublicEligibilityQuestion[]): FormValues {
  return {
    answers: Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.type === "multi-select" ? [] : "",
      ]),
    ),
  };
}

export function formSchema(questions: PublicEligibilityQuestion[]) {
  return z
    .object({
      answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    })
    .superRefine((values, context) => {
      questions.forEach((question) => {
        const value = values.answers[question.id];
        const empty = value === "" || (Array.isArray(value) && !value.length);
        if (question.required && empty) {
          context.addIssue({
            code: "custom",
            message: "Choose or enter an answer to continue.",
            path: ["answers", question.id],
          });
        }
      });
    });
}

function answerValue(
  question: PublicEligibilityQuestion,
  value: FormAnswer,
): PublicEligibilityAnswer {
  if (question.type === "boolean") return value === "true";
  if (question.type === "number" || question.type === "percentage") {
    return Number(value);
  }
  return value;
}

export function transportInput(
  workspace: PublicEligibilitySelfCheckWorkspace,
  values: FormValues,
): PublicEligibilitySelfCheckInput {
  const answers: Record<string, PublicEligibilityAnswer> = {};
  workspace.questions.forEach((question) => {
    const value = values.answers[question.id];
    const empty = value === "" || (Array.isArray(value) && !value.length);
    if (!question.required && empty) return;
    answers[question.id] = answerValue(question, value);
  });
  return {
    answers,
    configurationToken: workspace.configurationToken,
  };
}
