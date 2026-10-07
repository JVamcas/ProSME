import "server-only";
import { collectAnonymousEligibilityOutcome } from "@/modules/reporting/ServerWebsiteAnalyticsCollectionService";

import {
  configurationToken,
  questionId,
} from "../domain/PublicEligibilitySelfCheckIdentity";
import { answersByStableKey } from "./PublicEligibilitySelfCheckAnswers";
export { PublicEligibilitySelfCheckChangedError } from "../domain/PublicEligibilitySelfCheckErrors";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { workflowConditionNodeFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import type {
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
} from "../domain/EligibilityEvaluation";
import type { EligibilityInputDefinition } from "../domain/EligibilityInputDefinition";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import type {
  PublicEligibilityGuidance,
  PublicEligibilityQuestion,
  PublicEligibilityQuestionType,
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckResult,
  PublicEligibilitySelfCheckWorkspace,
} from "../api/PublicEligibilitySelfCheckTransport";
import { resolveSelfCheckEligibilityConfiguration } from "./ServerEligibilityBindingService";
import { resolveSelfCheckEligibilityInputs } from "./EligibilityInputResolver";

const disclaimer =
  "This self-check is advisory only. Final eligibility is determined during formal screening.";

export class PublicEligibilitySelfCheckUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("eligibility self-check");
    this.name = "PublicEligibilitySelfCheckUnavailableError";
  }
}

class InvalidPublicEligibilitySelfCheckConfigurationError extends Error {
  constructor(path: string) {
    super(
      `Eligibility self-check field "${path}" is not publicly configurable.`,
    );
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

const questionTypes = {
  BOOLEAN: "boolean",
  DATE: "date",
  MULTI_SELECT: "multi-select",
  NUMBER: "number",
  PERCENTAGE: "percentage",
  SINGLE_SELECT: "single-select",
  TEXT: "text",
  YES_NO_NA: "yes-no-na",
} as const satisfies Record<
  NonNullable<EligibilityInputDefinition["selfCheck"]>["answerType"],
  PublicEligibilityQuestionType
>;

function questionOptions(
  definition: EligibilityInputDefinition,
): PublicEligibilityQuestion["options"] {
  if (definition.selfCheck?.answerType === "YES_NO_NA") {
    return [
      { description: "", label: "Yes", value: "YES" },
      { description: "", label: "No", value: "NO" },
      {
        description: "",
        label: "Not applicable",
        value: "NOT_APPLICABLE",
      },
    ];
  }
  return (definition.selfCheck?.options ?? []).map((option) => ({
    description: option.description ?? "",
    label: option.label,
    value: option.value,
  }));
}

function requiredEligibilityPaths(rules: EligibilityEvaluationRule[]) {
  const paths = new Set<string>();
  for (const rule of rules) {
    for (const path of workflowConditionNodeFieldPaths(
      rule.conditionDefinition,
    )) {
      if (path.startsWith("eligibility.")) {
        paths.add(path);
        continue;
      }
      if (path.startsWith("fundingCall.")) continue;
      throw new InvalidPublicEligibilitySelfCheckConfigurationError(path);
    }
  }
  return [...paths];
}

function questionsFor(
  ruleSet: EligibilityEvaluationRuleSet,
  paths: string[],
  inputDefinitions: ReadonlyMap<string, EligibilityInputDefinition>,
): PublicEligibilityQuestion[] {
  const definitions = paths
    .map((path) => {
      const definition = inputDefinitions.get(path);
      if (!definition?.selfCheck) {
        throw new InvalidPublicEligibilitySelfCheckConfigurationError(path);
      }
      return { definition, selfCheck: definition.selfCheck };
    })
    .sort(
      (left, right) =>
        left.definition.order - right.definition.order ||
        left.definition.id.localeCompare(right.definition.id),
    );
  return definitions.map(({ definition, selfCheck }, index) => {
    const path = `eligibility.${definition.stableKey}`;
    return {
      explanation: selfCheck.explanation,
      helpText: selfCheck.helpText,
      id: questionId(ruleSet.versionId, path),
      label: selfCheck.prompt,
      options: questionOptions(definition),
      order: definition.order,
      progress: {
        current: index + 1,
        total: definitions.length,
      },
      required: selfCheck.required,
      section:
        definition.groupKey && definition.groupLabel
          ? { key: definition.groupKey, label: definition.groupLabel }
          : null,
      type: questionTypes[selfCheck.answerType],
    };
  });
}

async function loadSelfCheck(fundingCallId: string) {
  try {
    const [fundingCall, configuration] = await Promise.all([
      findPublicFundingCallById(fundingCallId),
      resolveSelfCheckEligibilityConfiguration(fundingCallId),
    ]);
    const { inputs, ruleSet } = configuration;
    if (
      !fundingCall ||
      fundingCall.status === "closed" ||
      !fundingCall.selfCheckAvailable
    ) {
      throw new PublicEligibilitySelfCheckUnavailableError();
    }
    const rules = applicableRules(ruleSet);
    if (!rules.length) throw new PublicEligibilitySelfCheckUnavailableError();
    const paths = requiredEligibilityPaths(rules);
    const inputDefinitions = new Map(
      inputs
        .filter((input) => input.availableIn.includes("SELF_CHECK"))
        .map((input) => [`eligibility.${input.stableKey}`, input]),
    );
    const questions = questionsFor(ruleSet, paths, inputDefinitions);
    const pathByQuestionId = new Map(
      [...inputDefinitions].map(([path]) => [
        questionId(ruleSet.versionId, path),
        path,
      ]),
    );
    const orderedPaths = questions.map((question) =>
      pathByQuestionId.get(question.id)!,
    );
    return {
      fundingCall,
      inputDefinitions,
      inputs,
      paths: orderedPaths,
      questions,
      ruleSet,
    };
  } catch (error) {
    if (error instanceof PublicEligibilitySelfCheckUnavailableError)
      throw error;
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
      value.questions,
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
  analyticsConsent = false,
): Promise<PublicEligibilitySelfCheckResult> {
  const value = await loadSelfCheck(fundingCallId);
  const answers = answersByStableKey(
    input,
    value.ruleSet,
    value.paths,
    value.inputDefinitions,
    value.questions,
  );
  const resolved = resolveSelfCheckEligibilityInputs({
    answers,
    inputs: value.inputs,
    paths: value.paths,
  });
  const result = evaluateEligibilityRuleSet(value.ruleSet, "SELF_CHECK", {
    application: {},
    eligibility: resolved.values,
    fundingCall: {
      closesAt: value.fundingCall.closesAt,
      fundingInstrument: value.fundingCall.fundingInstrument,
      id: value.fundingCall.id,
      maximumGrantAmount: value.fundingCall.maximumAmount,
      minimumGrantAmount: value.fundingCall.minimumAmount,
      opensAt: value.fundingCall.opensAt,
      status: value.fundingCall.status,
      thematicArea: value.fundingCall.thematicArea,
      title: value.fundingCall.title,
      totalBudgetEnvelope: value.fundingCall.totalFundingAmount,
    },
    stages: [],
  });
  const response: PublicEligibilitySelfCheckResult = {
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
  if (analyticsConsent) {
    await collectAnonymousEligibilityOutcome({
      fundingCallId: value.fundingCall.id,
      ruleSetVersionId: value.ruleSet.versionId,
      outcome: response.outcome,
    });
  }
  return response;
}
