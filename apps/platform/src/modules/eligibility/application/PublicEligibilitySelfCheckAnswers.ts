import { RequestValidationError } from "@/lib/resource-errors";
import type { EligibilityEvaluationRuleSet } from "../domain/EligibilityEvaluation";
import type { EligibilityInputDefinition } from "../domain/EligibilityInputDefinition";
import type {
  PublicEligibilityAnswer,
  PublicEligibilityQuestion,
  PublicEligibilitySelfCheckInput,
} from "../api/PublicEligibilitySelfCheckTransport";
import {
  configurationToken,
  questionId,
} from "../domain/PublicEligibilitySelfCheckIdentity";
import { PublicEligibilitySelfCheckChangedError } from "../domain/PublicEligibilitySelfCheckErrors";

function validateAnswer(
  answer: PublicEligibilityAnswer | undefined,
  question: PublicEligibilityQuestion,
) {
  if (question.type === "boolean") return typeof answer === "boolean";
  if (question.type === "number" || question.type === "percentage") {
    if (typeof answer !== "number" || !Number.isFinite(answer)) return false;
    return question.type !== "percentage" || (answer >= 0 && answer <= 100);
  }
  if (question.type === "date") {
    if (typeof answer !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(answer)) {
      return false;
    }
    const date = new Date(`${answer}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === answer
    );
  }
  if (question.type === "multi-select") {
    if (!Array.isArray(answer) || new Set(answer).size !== answer.length) {
      return false;
    }
    const allowed = new Set(question.options.map((option) => option.value));
    return answer.length > 0 && answer.every((value) => allowed.has(value));
  }
  if (question.type === "single-select" || question.type === "yes-no-na") {
    return (
      typeof answer === "string" &&
      question.options.some((option) => option.value === answer)
    );
  }
  if (question.type === "text") {
    return (
      typeof answer === "string" &&
      answer.trim().length > 0 &&
      answer.length <= 500
    );
  }
  return false;
}

export function answersByStableKey(
  input: PublicEligibilitySelfCheckInput,
  ruleSet: EligibilityEvaluationRuleSet,
  paths: string[],
  inputDefinitions: ReadonlyMap<string, EligibilityInputDefinition>,
  questions: PublicEligibilityQuestion[],
) {
  const expectedToken = configurationToken(ruleSet.versionId, questions);
  if (input.configurationToken !== expectedToken) {
    throw new PublicEligibilitySelfCheckChangedError();
  }
  const questionsById = new Map(
    questions.map((question) => [question.id, question]),
  );
  const unexpected = Object.keys(input.answers).some(
    (id) => !questionsById.has(id),
  );
  const missingRequired = questions.some(
    (question) => question.required && !(question.id in input.answers),
  );
  if (unexpected || missingRequired) {
    throw new RequestValidationError("Review the eligibility answers.");
  }
  return Object.fromEntries(
    paths.map((path) => {
      const definition = inputDefinitions.get(path)!;
      const id = questionId(ruleSet.versionId, path);
      const question = questionsById.get(id)!;
      const answer = input.answers[id];
      if (answer === undefined && !question.required) {
        return [definition.stableKey, null];
      }
      if (!validateAnswer(answer, question)) {
        throw new RequestValidationError("Review the eligibility answers.");
      }
      return [definition.stableKey, answer];
    }),
  );
}
