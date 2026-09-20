import type { ConditionGroup, ConditionNode } from "../domain/ConditionGroup";
import type { DirectOperand, JsonValue, Operand } from "../domain/Operand";
import type { FieldValues } from "./OperandResolver";

export type WorkflowDataRecord = Readonly<Record<string, JsonValue>>;

export type WorkflowStageData = {
  stableKey: string;
  values: WorkflowDataRecord;
};

export type WorkflowDataContext = {
  application: WorkflowDataRecord;
  fundingCall: WorkflowDataRecord;
  stages: readonly WorkflowStageData[];
};

export type WorkflowDataResolutionErrorCode =
  | "INVALID_PATH"
  | "UNSUPPORTED_ROOT"
  | "STAGE_NOT_FOUND"
  | "DUPLICATE_STAGE_KEY"
  | "VALUE_NOT_FOUND"
  | "NON_OBJECT_SEGMENT";

export class WorkflowDataResolutionError extends Error {
  readonly code: WorkflowDataResolutionErrorCode;
  readonly path: string;

  constructor(
    code: WorkflowDataResolutionErrorCode,
    path: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkflowDataResolutionError";
    this.code = code;
    this.path = path;
  }
}

const dataSegmentPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const stagePathKeyPattern = /^[a-z][a-z0-9_]*$/;

function parsePath(path: string) {
  const segments = path.split(".");
  if (
    path.trim() !== path
    || segments.some((segment) => !dataSegmentPattern.test(segment))
  ) {
    throw new WorkflowDataResolutionError(
      "INVALID_PATH",
      path,
      `Workflow data path "${path}" is invalid.`,
    );
  }
  return segments;
}

function requireMinimumSegments(
  path: string,
  segments: readonly string[],
  minimum: number,
) {
  if (segments.length < minimum) {
    throw new WorkflowDataResolutionError(
      "INVALID_PATH",
      path,
      `Workflow data path "${path}" is incomplete.`,
    );
  }
}

function stagePathKey(stableKey: string, path: string) {
  if (!dataSegmentPattern.test(stableKey)) {
    throw new WorkflowDataResolutionError(
      "INVALID_PATH",
      path,
      `Stage stable key "${stableKey}" cannot be used in a data path.`,
    );
  }
  return stableKey.toLowerCase();
}

function indexStages(
  stages: readonly WorkflowStageData[],
  path: string,
) {
  const byStableKey = new Map<string, WorkflowStageData>();
  for (const stage of stages) {
    const key = stagePathKey(stage.stableKey, path);
    if (byStableKey.has(key)) {
      throw new WorkflowDataResolutionError(
        "DUPLICATE_STAGE_KEY",
        path,
        `Stage stable key "${stage.stableKey}" occurs more than once.`,
      );
    }
    byStableKey.set(key, stage);
  }
  return byStableKey;
}

function resolveRecordValue(
  record: WorkflowDataRecord,
  valueSegments: readonly string[],
  path: string,
): JsonValue {
  let current: JsonValue = record;
  for (const segment of valueSegments) {
    if (
      current === null
      || Array.isArray(current)
      || typeof current !== "object"
    ) {
      throw new WorkflowDataResolutionError(
        "NON_OBJECT_SEGMENT",
        path,
        `Cannot read "${segment}" while resolving "${path}".`,
      );
    }
    if (!Object.hasOwn(current, segment)) {
      throw new WorkflowDataResolutionError(
        "VALUE_NOT_FOUND",
        path,
        `No value exists at workflow data path "${path}".`,
      );
    }
    current = current[segment];
  }
  return current;
}

export function resolveWorkflowDataPath(
  path: string,
  context: WorkflowDataContext,
): JsonValue {
  const segments = parsePath(path);
  const [root] = segments;
  if (root === "application" || root === "fundingCall") {
    requireMinimumSegments(path, segments, 2);
    return resolveRecordValue(context[root], segments.slice(1), path);
  }
  if (root !== "stage") {
    throw new WorkflowDataResolutionError(
      "UNSUPPORTED_ROOT",
      path,
      `Workflow data path root "${root}" is not supported.`,
    );
  }

  requireMinimumSegments(path, segments, 3);
  const requestedStageKey = segments[1];
  if (!stagePathKeyPattern.test(requestedStageKey)) {
    throw new WorkflowDataResolutionError(
      "INVALID_PATH",
      path,
      "Stage paths must use a lowercase stable stage key, not a position.",
    );
  }
  const stage = indexStages(context.stages, path).get(requestedStageKey);
  if (!stage) {
    throw new WorkflowDataResolutionError(
      "STAGE_NOT_FOUND",
      path,
      `Stage "${requestedStageKey}" is not available.`,
    );
  }
  return resolveRecordValue(stage.values, segments.slice(2), path);
}

export function resolveWorkflowFieldValues(
  paths: readonly string[],
  context: WorkflowDataContext,
): FieldValues {
  const values: Record<string, JsonValue> = {};
  for (const path of new Set(paths)) {
    values[path] = resolveWorkflowDataPath(path, context);
  }
  return values;
}

function collectDirectOperandPath(
  operand: DirectOperand,
  paths: Set<string>,
) {
  if (operand.kind === "FIELD") paths.add(operand.key);
}

function collectOperandPaths(operand: Operand, paths: Set<string>) {
  if (operand.kind !== "COMPUTED") {
    collectDirectOperandPath(operand, paths);
    return;
  }
  collectDirectOperandPath(operand.leftOperand, paths);
  collectDirectOperandPath(operand.rightOperand, paths);
}

function collectNodePaths(node: ConditionNode, paths: Set<string>) {
  if (node.kind === "GROUP") {
    node.children.forEach((child) => collectNodePaths(child, paths));
    return;
  }
  collectOperandPaths(node.leftOperand, paths);
  if (node.rightOperand) collectOperandPaths(node.rightOperand, paths);
}

export function workflowConditionFieldPaths(group: ConditionGroup) {
  const paths = new Set<string>();
  group.children.forEach((child) => collectNodePaths(child, paths));
  return [...paths];
}

export function resolveWorkflowConditionValues(
  group: ConditionGroup,
  context: WorkflowDataContext,
) {
  return resolveWorkflowFieldValues(
    workflowConditionFieldPaths(group),
    context,
  );
}
