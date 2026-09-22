import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import { workflowConditionNodeFieldPaths } from "@/modules/conditions/engine/WorkflowDataResolver";
import type {
  EligibilityEvaluationMode,
  EligibilityEvaluationRuleSet,
} from "../domain/EligibilityEvaluation";
import type { EligibilityInputDefinition } from "../domain/EligibilityInputDefinition";
import {
  EligibilityInputResolutionError,
  type EligibilityResolvedData,
  type EligibilityScreeningSourceAdapter,
  type EligibilityScreeningSourceRequest,
  type EligibilityValueResolution,
} from "../domain/EligibilityDataResolution";

function appliesToMode(
  executionMode: "SELF_CHECK" | "SCREENING" | "BOTH",
  mode: EligibilityEvaluationMode,
) {
  return executionMode === "BOTH" || executionMode === mode;
}

export function eligibilityInputPathsForEvaluation(
  ruleSet: EligibilityEvaluationRuleSet,
  mode: EligibilityEvaluationMode,
) {
  const paths = new Set<string>();
  for (const rule of ruleSet.rules) {
    if (!appliesToMode(rule.executionMode, mode)) continue;
    for (const path of workflowConditionNodeFieldPaths(
      rule.conditionDefinition,
    )) {
      if (path.startsWith("eligibility.")) paths.add(path);
    }
  }
  return [...paths];
}

function hasExpectedType(value: JsonValue, type: ConditionFieldType) {
  if (value === null || Array.isArray(value) || typeof value === "object") {
    return false;
  }
  if (type === "BOOLEAN") return typeof value === "boolean";
  if (type === "NUMBER") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (type === "DATE") {
    return typeof value === "string"
      && /^\d{4}-\d{2}-\d{2}(?:T.*Z)?$/.test(value)
      && !Number.isNaN(Date.parse(value));
  }
  return typeof value === "string";
}

function inputsByPath(
  inputs: readonly EligibilityInputDefinition[],
  mode: EligibilityEvaluationMode,
) {
  return new Map(inputs
    .filter((input) => input.availableIn.includes(mode))
    .map((input) => [`eligibility.${input.stableKey}`, input]));
}

function unresolved(
  path: string,
  input: EligibilityInputDefinition | undefined,
  status: "MISSING" | "UNAVAILABLE" | "INVALID",
  message: string,
): EligibilityValueResolution {
  return {
    inputDefinitionId: input?.id ?? "",
    message,
    path,
    provenance: null,
    stableKey: input?.stableKey ?? path.slice("eligibility.".length),
    status,
    value: null,
  };
}

function requireResolved(resolutions: EligibilityValueResolution[]) {
  const failures = resolutions.filter((item) => item.status !== "RESOLVED");
  if (failures.length) throw new EligibilityInputResolutionError(failures);
  return {
    provenance: Object.fromEntries(resolutions.flatMap((item) =>
      item.status === "RESOLVED" && item.provenance
        ? [[item.path, item.provenance]]
        : []
    )),
    resolutions,
    values: Object.fromEntries(resolutions.map((item) => [
      item.stableKey,
      item.value,
    ])),
  } satisfies EligibilityResolvedData;
}

export function resolveSelfCheckEligibilityInputs(input: {
  answers: Readonly<Record<string, JsonValue | undefined>>;
  inputs: readonly EligibilityInputDefinition[];
  paths: readonly string[];
}): EligibilityResolvedData {
  const definitions = inputsByPath(input.inputs, "SELF_CHECK");
  const resolutions = input.paths.map((path): EligibilityValueResolution => {
    const definition = definitions.get(path);
    if (!definition || !definition.selfCheck) {
      return unresolved(
        path,
        definition,
        "UNAVAILABLE",
        `No Self Check source is configured for "${path}".`,
      );
    }
    const value = input.answers[definition.stableKey];
    if (value === undefined || value === null) {
      return unresolved(path, definition, "MISSING", `"${path}" is missing.`);
    }
    if (!hasExpectedType(value, definition.type)) {
      return unresolved(
        path,
        definition,
        "INVALID",
        `"${path}" does not contain a valid ${definition.type} value.`,
      );
    }
    return {
      inputDefinitionId: definition.id,
      path,
      provenance: null,
      stableKey: definition.stableKey,
      status: "RESOLVED",
      value,
    };
  });
  return requireResolved(resolutions);
}

export function resolveEligibilitySampleInputs(input: {
  inputs: readonly EligibilityInputDefinition[];
  mode: EligibilityEvaluationMode;
  paths: readonly string[];
  values: Readonly<Record<string, JsonValue | undefined>>;
}): EligibilityResolvedData {
  const definitions = inputsByPath(input.inputs, input.mode);
  const resolutions = input.paths.map((path): EligibilityValueResolution => {
    const definition = definitions.get(path);
    if (!definition) {
      return unresolved(
        path,
        definition,
        "UNAVAILABLE",
        `"${path}" is not configured for ${input.mode}.`,
      );
    }
    const value = input.values[definition.stableKey];
    if (value === undefined || value === null) {
      return unresolved(path, definition, "MISSING", `"${path}" is missing.`);
    }
    if (!hasExpectedType(value, definition.type)) {
      return unresolved(
        path,
        definition,
        "INVALID",
        `"${path}" does not contain a valid ${definition.type} value.`,
      );
    }
    return {
      inputDefinitionId: definition.id,
      path,
      provenance: null,
      stableKey: definition.stableKey,
      status: "RESOLVED",
      value,
    };
  });
  return requireResolved(resolutions);
}

function requestKey(request: EligibilityScreeningSourceRequest) {
  return request.input.id;
}

export async function resolveScreeningEligibilityInputs(input: {
  adapters: readonly EligibilityScreeningSourceAdapter[];
  applicationId: string;
  evaluatedAt: Date;
  inputs: readonly EligibilityInputDefinition[];
  paths: readonly string[];
}): Promise<EligibilityResolvedData> {
  const definitions = inputsByPath(input.inputs, "SCREENING");
  const adapters = new Map(input.adapters.map((adapter) => [
    adapter.sourceKind,
    adapter,
  ]));
  const requestsByKind = new Map<string, EligibilityScreeningSourceRequest[]>();
  const initial = input.paths.flatMap((path) => {
    const definition = definitions.get(path);
    if (!definition?.screening) {
      return [unresolved(
        path,
        definition,
        "UNAVAILABLE",
        `No Screening source is configured for "${path}".`,
      )];
    }
    const requests = requestsByKind.get(definition.screening.sourceKind) ?? [];
    requests.push({
      applicationId: input.applicationId,
      binding: definition.screening,
      evaluatedAt: input.evaluatedAt,
      input: definition,
    });
    requestsByKind.set(definition.screening.sourceKind, requests);
    return [];
  });
  const batches = await Promise.all([...requestsByKind].map(
    async ([sourceKind, requests]) => {
      const adapter = adapters.get(sourceKind as never);
      if (!adapter) return [sourceKind, null, requests] as const;
      return [sourceKind, await adapter.resolve(requests), requests] as const;
    },
  ));
  const resolved = batches.flatMap(([, batch, requests]) => requests.map(
    (request): EligibilityValueResolution => {
      const path = `eligibility.${request.input.stableKey}`;
      const result = batch?.get(requestKey(request));
      if (!result) {
        return unresolved(
          path,
          request.input,
          "UNAVAILABLE",
          `The ${request.binding.sourceKind} source is unavailable.`,
        );
      }
      if (result.status !== "RESOLVED") {
        return unresolved(path, request.input, result.status, result.message);
      }
      if (!hasExpectedType(result.value.value, request.input.type)) {
        return unresolved(
          path,
          request.input,
          "INVALID",
          `The configured source did not provide a valid ${request.input.type} value.`,
        );
      }
      return {
        inputDefinitionId: request.input.id,
        path,
        provenance: {
          evaluatedAt: input.evaluatedAt.toISOString(),
          inputDefinitionId: request.input.id,
          inputStableKey: request.input.stableKey,
          mode: "SCREENING",
          sourceDefinitionId: request.binding.sourceDefinitionId,
          sourceKey: request.binding.sourceKey,
          sourceKind: request.binding.sourceKind,
          sourceRecordId: result.value.sourceRecordId,
          sourceVersionId: request.binding.sourceVersionId,
        },
        stableKey: request.input.stableKey,
        status: "RESOLVED",
        value: result.value.value,
      };
    },
  ));
  return requireResolved([...initial, ...resolved]);
}
