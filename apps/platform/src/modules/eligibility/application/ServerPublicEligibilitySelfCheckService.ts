import "server-only";

import { createHash } from "node:crypto";

import {
  ResourceConflictError,
  ResourceNotFoundError,
  RequestValidationError,
} from "@/lib/resource-errors";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import { workflowConditionNodeFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import type {
  JsonValue,
} from "@/modules/conditions/domain/Operand";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import type {
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "../domain/EligibilityEvaluation";
import {
  eligibilityFieldsFromForm,
  fundingCallEligibilityFields,
} from "../domain/EligibilityConditionFields";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import type {
  PublicEligibilityAnswer,
  PublicEligibilityGuidance,
  PublicEligibilityQuestion,
  PublicEligibilityQuestionType,
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckResult,
  PublicEligibilitySelfCheckWorkspace,
} from "../api/PublicEligibilitySelfCheckTransport";
import { resolveSelfCheckEligibilityConfiguration } from "./ServerEligibilityBindingService";

const disclaimer =
  "This self-check is advisory only. Final eligibility is determined during formal screening.";

export class PublicEligibilitySelfCheckUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("eligibility self-check");
    this.name = "PublicEligibilitySelfCheckUnavailableError";
  }
}

export class PublicEligibilitySelfCheckChangedError extends ResourceConflictError {
  constructor() {
    super("The eligibility questions changed. Review them and try again.");
    this.name = "PublicEligibilitySelfCheckChangedError";
  }
}

class InvalidPublicEligibilitySelfCheckConfigurationError extends Error {
  constructor(path: string) {
    super(`Eligibility self-check field "${path}" is not publicly configurable.`);
    this.name = "InvalidPublicEligibilitySelfCheckConfigurationError";
  }
}

function applicableRules(ruleSet: EligibilityEvaluationRuleSet) {
  return [...ruleSet.rules]
    .filter(
      (rule) =>
        rule.executionMode === "SELF_CHECK" || rule.executionMode === "BOTH",
    )
    .sort((left, right) => left.order - right.order);
}

function questionId(versionId: string, path: string) {
  return createHash("sha256")
    .update(`${versionId}:${path}`)
    .digest("hex")
    .slice(0, 32);
}

function configurationToken(versionId: string, questions: string[]) {
  return createHash("sha256")
    .update(JSON.stringify({ questions, versionId }))
    .digest("hex");
}

function questionType(type: string): PublicEligibilityQuestionType {
  return type.toLowerCase() as PublicEligibilityQuestionType;
}

function requiredApplicationPaths(
  rules: EligibilityEvaluationRule[],
  availablePaths: ReadonlySet<string>,
) {
  const paths = new Set<string>();
  for (const rule of rules) {
    for (const path of workflowConditionNodeFieldPaths(
      rule.conditionDefinition,
    )) {
      if (path.startsWith("application.") && availablePaths.has(path)) {
        paths.add(path);
        continue;
      }
      if (
        !fundingCallEligibilityFields.some((field) => field.key === path)
      ) {
        throw new InvalidPublicEligibilitySelfCheckConfigurationError(path);
      }
    }
  }
  return [...paths];
}

function questionsFor(
  ruleSet: EligibilityEvaluationRuleSet,
  paths: string[],
  fieldDefinitions: ReadonlyMap<string, ConditionFieldDefinition>,
): PublicEligibilityQuestion[] {
  return paths.map((path) => {
    const definition = fieldDefinitions.get(path);
    if (!definition) {
      throw new InvalidPublicEligibilitySelfCheckConfigurationError(path);
    }
    return {
      id: questionId(ruleSet.versionId, path),
      label: definition.label,
      type: questionType(definition.type),
    };
  });
}

async function loadSelfCheck(fundingCallId: string) {
  try {
    const [fundingCall, configuration] = await Promise.all([
      findPublicFundingCallById(fundingCallId),
      resolveSelfCheckEligibilityConfiguration(fundingCallId),
    ]);
    const { form, ruleSet } = configuration;
    if (
      !fundingCall ||
      fundingCall.status === "closed" ||
      !fundingCall.selfCheckAvailable
    ) {
      throw new PublicEligibilitySelfCheckUnavailableError();
    }
    const rules = applicableRules(ruleSet);
    if (!rules.length) throw new PublicEligibilitySelfCheckUnavailableError();
    const fields = eligibilityFieldsFromForm(form.fields);
    const fieldDefinitions = new Map(fields.map((field) => [field.key, field]));
    const paths = requiredApplicationPaths(rules, new Set(fieldDefinitions.keys()));
    const questions = questionsFor(ruleSet, paths, fieldDefinitions);
    return { fieldDefinitions, fundingCall, paths, questions, ruleSet };
  } catch (error) {
    if (error instanceof PublicEligibilitySelfCheckUnavailableError) throw error;
    if (error instanceof ResourceNotFoundError) {
      throw new PublicEligibilitySelfCheckUnavailableError();
    }
    throw error;
  }
}

export async function getPublicEligibilitySelfCheck(
  fundingCallId: string,
): Promise<PublicEligibilitySelfCheckWorkspace> {
  const value = await loadSelfCheck(fundingCallId);
  return {
    advisory: true,
    configurationToken: configurationToken(
      value.ruleSet.versionId,
      value.paths,
    ),
    fundingCall: {
      applicationsOpen: value.fundingCall.applicationsOpen,
      id: value.fundingCall.id,
      slug: value.fundingCall.slug,
      title: value.fundingCall.title,
    },
    questions: value.questions,
  };
}

function validateAnswer(
  answer: PublicEligibilityAnswer,
  type: PublicEligibilityQuestionType,
) {
  if (type === "boolean") return typeof answer === "boolean";
  if (type === "number") {
    return typeof answer === "number" && Number.isFinite(answer);
  }
  if (type === "date") {
    return typeof answer === "string" && /^\d{4}-\d{2}-\d{2}$/.test(answer);
  }
  return typeof answer === "string" && answer.trim().length > 0;
}

function answersByPath(
  input: PublicEligibilitySelfCheckInput,
  ruleSet: EligibilityEvaluationRuleSet,
  paths: string[],
  fieldDefinitions: ReadonlyMap<string, ConditionFieldDefinition>,
) {
  const expectedToken = configurationToken(ruleSet.versionId, paths);
  if (input.configurationToken !== expectedToken) {
    throw new PublicEligibilitySelfCheckChangedError();
  }
  const expectedIds = paths.map((path) => questionId(ruleSet.versionId, path));
  if (
    Object.keys(input.answers).sort().join() !== [...expectedIds].sort().join()
  ) {
    throw new RequestValidationError("Answer every eligibility question.");
  }
  return Object.fromEntries(
    paths.map((path) => {
      const definition = fieldDefinitions.get(path)!;
      const answer = input.answers[questionId(ruleSet.versionId, path)];
      if (!validateAnswer(answer, questionType(definition.type))) {
        throw new RequestValidationError("Review the eligibility answers.");
      }
      return [path, answer];
    }),
  );
}

function setApplicationValue(
  application: Record<string, JsonValue>,
  path: string,
  value: JsonValue,
) {
  const segments = path.split(".").slice(1);
  let target = application;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      target[segment] = value;
      return;
    }
    const nested = target[segment];
    if (!nested || Array.isArray(nested) || typeof nested !== "object") {
      target[segment] = {};
    }
    target = target[segment] as Record<string, JsonValue>;
  });
}

function guidance(
  result: ReturnType<typeof evaluateEligibilityRuleSet>,
): PublicEligibilityGuidance[] {
  return [
    ...result.hardFailures.map((item) => ({
      message: item.applicantMessage,
      severity: "blocking" as const,
    })),
    ...result.softFailures.map((item) => ({
      message: item.applicantMessage,
      severity: "review" as const,
    })),
    ...result.warnings.map((item) => ({
      message: item.applicantMessage,
      severity: "warning" as const,
    })),
  ];
}

export async function evaluatePublicEligibilitySelfCheck(
  fundingCallId: string,
  input: PublicEligibilitySelfCheckInput,
): Promise<PublicEligibilitySelfCheckResult> {
  const value = await loadSelfCheck(fundingCallId);
  const answers = answersByPath(
    input,
    value.ruleSet,
    value.paths,
    value.fieldDefinitions,
  );
  const application: Record<string, JsonValue> = {};
  Object.entries(answers).forEach(([path, answer]) =>
    setApplicationValue(application, path, answer),
  );
  const result = evaluateEligibilityRuleSet(value.ruleSet, "SELF_CHECK", {
    application,
    eligibility: {},
    fundingCall: {
      closes_at: value.fundingCall.closesAt,
      funding_instrument: value.fundingCall.fundingInstrument,
      maximum_grant_amount: value.fundingCall.maximumAmount,
      minimum_grant_amount: value.fundingCall.minimumAmount,
      opens_at: value.fundingCall.opensAt,
      thematic_area: value.fundingCall.thematicArea,
      total_budget_envelope: value.fundingCall.totalFundingAmount,
    },
    stages: [],
  });
  return {
    advisory: true,
    applicationsOpen: value.fundingCall.applicationsOpen,
    disclaimer,
    fundingCallId: value.fundingCall.id,
    guidance: guidance(result),
    outcome: result.hardFailures.length
      ? "not-currently-eligible"
      : result.softFailures.length
        ? "review-required"
        : "likely-eligible",
  };
}
