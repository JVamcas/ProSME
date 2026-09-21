import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import {
  evaluateConditionGroup,
  type ConditionGroupEvaluation,
} from "@/modules/conditions/engine/ConditionGroupEngine";
import {
  resolveWorkflowConditionValues,
  WorkflowDataResolutionError,
  type WorkflowDataContext,
} from "@/modules/conditions/engine/WorkflowDataResolver";

export type StageConditionEvaluation = {
  passed: boolean;
  evaluation: ConditionGroupEvaluation | null;
  resolutionError: {
    code: string;
    message: string;
    path: string;
  } | null;
};

function normalizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function normalizeValue(value: unknown): JsonValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number" && Number.isFinite(value)
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => (
        child === undefined ? [] : [[normalizeKey(key), normalizeValue(child)]]
      )),
    );
  }
  throw new TypeError("Stage condition context contains an unsupported value.");
}

export function normalizeStageConditionRecord(
  value: Readonly<Record<string, unknown>>,
) {
  return normalizeValue(value) as Record<string, JsonValue>;
}

export function evaluateStageCondition(
  condition: ConditionGroup | null,
  context: WorkflowDataContext,
): StageConditionEvaluation {
  if (!condition) {
    return { evaluation: null, passed: true, resolutionError: null };
  }

  try {
    const evaluation = evaluateConditionGroup(
      condition,
      resolveWorkflowConditionValues(condition, context),
    );
    return {
      evaluation,
      passed: evaluation.passed,
      resolutionError: null,
    };
  } catch (error) {
    if (error instanceof WorkflowDataResolutionError) {
      return {
        evaluation: null,
        passed: false,
        resolutionError: {
          code: error.code,
          message: error.message,
          path: error.path,
        },
      };
    }
    throw error;
  }
}
