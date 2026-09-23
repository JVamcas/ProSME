import type {
  ConditionFieldDefinition,
  ConditionFieldType,
} from "@/modules/conditions/domain/ConditionConfiguration";
import type {
  EligibilityInputDefinition,
  EligibilityInputMode,
  EligibilityScreeningSourceKind,
  EligibilitySourceBinding,
} from "./EligibilityInputDefinition";
import type { EligibilityExecutionMode } from "./EligibilityRule";

export type EligibilitySourceDescriptor = {
  availableBeforeEligibility: boolean;
  fundingCallId: string;
  label: string;
  sourceDefinitionId: string;
  sourceKey: string;
  sourceKind: EligibilityScreeningSourceKind;
  sourceVersionId: string | null;
  supportedTypes: readonly ConditionFieldType[];
};

export type EligibilityFieldRegistryContext = {
  fundingCallId: string;
  fundingCallTitle: string;
  sources: EligibilitySourceDescriptor[];
};

export type EligibilityFieldDescriptor = ConditionFieldDefinition & {
  availableIn: EligibilityInputMode[];
  sourceDefinitionId: string;
  sourceKind: "ELIGIBILITY_INPUT" | EligibilityScreeningSourceKind;
  sourceVersionId: string | null;
  screeningSource: EligibilitySourceBinding | null;
};

export type EligibilityFieldRegistryIssueCode =
  | "BINDING_REQUIRED"
  | "CIRCULAR_SOURCE_REFERENCE"
  | "INPUT_BINDING_MISSING"
  | "SOURCE_NOT_BOUND"
  | "SOURCE_TYPE_MISMATCH";

export type EligibilityFieldRegistryIssue = {
  code: EligibilityFieldRegistryIssueCode;
  fundingCallId?: string;
  inputId?: string;
  message: string;
  stableKey?: string;
};

export type EligibilityFieldRegistry = {
  fields: EligibilityFieldDescriptor[];
  issues: EligibilityFieldRegistryIssue[];
  sources: EligibilitySourceDescriptor[];
};

function sameSource(
  source: EligibilitySourceDescriptor,
  binding: EligibilitySourceBinding,
) {
  return source.sourceDefinitionId === binding.sourceDefinitionId
    && source.sourceKey === binding.sourceKey
    && source.sourceKind === binding.sourceKind
    && source.sourceVersionId === binding.sourceVersionId;
}

function sourceIdentity(source: EligibilitySourceDescriptor) {
  if (source.sourceKind === "FUNDING_CALL_FIELD") {
    return [source.sourceKind, source.sourceKey].join(":");
  }
  return [
    source.sourceKind,
    source.sourceDefinitionId,
    source.sourceVersionId ?? "",
    source.sourceKey,
  ].join(":");
}

function commonSources(contexts: readonly EligibilityFieldRegistryContext[]) {
  const [first, ...remaining] = contexts;
  if (!first) return [];
  return first.sources.filter((source) => {
    const identity = sourceIdentity(source);
    return remaining.every((context) => context.sources.some(
      (candidate) => sourceIdentity(candidate) === identity,
    ));
  });
}

function validateInput(
  input: EligibilityInputDefinition,
  contexts: readonly EligibilityFieldRegistryContext[],
) {
  const issues: EligibilityFieldRegistryIssue[] = [];
  const selfCheck = input.availableIn.includes("SELF_CHECK");
  const screening = input.availableIn.includes("SCREENING");
  if (selfCheck !== Boolean(input.selfCheck) || screening !== Boolean(input.screening)) {
    issues.push({
      code: "INPUT_BINDING_MISSING",
      inputId: input.id,
      message: `${input.stableKey}: mode availability does not match its configured bindings.`,
      stableKey: input.stableKey,
    });
  }
  if (!screening || !input.screening) return issues;

  if (input.screening.sourceKind === "ELIGIBILITY_QUESTION_RESPONSE") {
    return issues;
  }

  if (
    input.screening.sourceKey === input.stableKey
    && input.screening.valuePath === `eligibility.${input.stableKey}`
  ) {
    issues.push({
      code: "CIRCULAR_SOURCE_REFERENCE",
      inputId: input.id,
      message: `${input.stableKey}: the Screening source refers to the input itself.`,
      stableKey: input.stableKey,
    });
  }

  for (const context of contexts) {
    const source = context.sources.find((candidate) =>
      sameSource(candidate, input.screening!)
    );
    if (!source) {
      issues.push({
        code: "SOURCE_NOT_BOUND",
        fundingCallId: context.fundingCallId,
        inputId: input.id,
        message: `${input.stableKey}: the Screening source is not part of the exact bindings for ${context.fundingCallTitle}.`,
        stableKey: input.stableKey,
      });
      continue;
    }
    if (!source.availableBeforeEligibility) {
      issues.push({
        code: "CIRCULAR_SOURCE_REFERENCE",
        fundingCallId: context.fundingCallId,
        inputId: input.id,
        message: `${input.stableKey}: the Screening source is not completed before authoritative eligibility in ${context.fundingCallTitle}.`,
        stableKey: input.stableKey,
      });
    }
    if (!source.supportedTypes.includes(input.type)) {
      issues.push({
        code: "SOURCE_TYPE_MISMATCH",
        fundingCallId: context.fundingCallId,
        inputId: input.id,
        message: `${input.stableKey}: ${source.label} does not provide a ${input.type.toLowerCase()} value.`,
        stableKey: input.stableKey,
      });
    }
  }
  return issues;
}

export function buildEligibilityFieldRegistry(input: {
  contexts: readonly EligibilityFieldRegistryContext[];
  inputs: readonly EligibilityInputDefinition[];
}): EligibilityFieldRegistry {
  if (!input.contexts.length) {
    return {
      fields: [],
      issues: [{
        code: "BINDING_REQUIRED",
        message: "Bind this ruleset version to a draft funding call before configuring or publishing rules.",
      }],
      sources: [],
    };
  }

  const inputIssues = new Map<string, EligibilityFieldRegistryIssue[]>();
  const issues = input.inputs.flatMap((definition) => {
    const definitionIssues = validateInput(definition, input.contexts);
    inputIssues.set(definition.id, definitionIssues);
    return definitionIssues;
  });
  const questionFields = input.inputs
    .filter((definition) => !inputIssues.get(definition.id)?.length)
    .map((definition): EligibilityFieldDescriptor => ({
      availableIn: definition.availableIn,
      key: `eligibility.${definition.stableKey}`,
      label: definition.label,
      screeningSource: definition.screening,
      sourceDefinitionId: definition.id,
      sourceKind: "ELIGIBILITY_INPUT",
      sourceVersionId: definition.versionId,
      type: definition.type,
    }));
  const sourceFields = commonSources(input.contexts).flatMap(
    (source): EligibilityFieldDescriptor[] => {
      if (
        source.sourceKind !== "APPLICATION_FORM_FIELD"
        && source.sourceKind !== "FUNDING_CALL_FIELD"
      ) {
        return [];
      }
      const [type] = source.supportedTypes;
      if (!type) return [];
      const fundingCallField = source.sourceKind === "FUNDING_CALL_FIELD";
      return [{
        availableIn: fundingCallField
          ? ["SELF_CHECK", "SCREENING"]
          : ["SCREENING"],
        key: `${fundingCallField ? "fundingCall" : "application"}.${source.sourceKey}`,
        label: source.label,
        screeningSource: {
          sourceDefinitionId: source.sourceDefinitionId,
          sourceKey: source.sourceKey,
          sourceKind: source.sourceKind,
          sourceVersionId: source.sourceVersionId,
          valuePath: "value",
        },
        sourceDefinitionId: source.sourceDefinitionId,
        sourceKind: source.sourceKind,
        sourceVersionId: source.sourceVersionId,
        type,
      }];
    },
  );
  const fields = [...questionFields, ...sourceFields];

  return {
    fields,
    issues,
    sources: commonSources(input.contexts),
  };
}

export function eligibilityFieldsForExecutionMode(
  fields: readonly EligibilityFieldDescriptor[],
  mode: EligibilityExecutionMode,
) {
  const requiredModes: EligibilityInputMode[] = mode === "BOTH"
    ? ["SELF_CHECK", "SCREENING"]
    : [mode];
  return fields.filter((field) => requiredModes.every((requiredMode) =>
    field.availableIn.includes(requiredMode)
  ));
}
