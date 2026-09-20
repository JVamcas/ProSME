import type { FormContextValue } from "@/modules/forms/engine/FormRuntimeContext";
import type {
  WorkflowRuntimeContextRecord,
  WorkflowTaskRuntimeContextSource,
} from "@/modules/workflows/domain/WorkflowRuntimeContext";

export class InvalidWorkflowRuntimeContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWorkflowRuntimeContextError";
  }
}

function contextSegment(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function contextValue(value: unknown): FormContextValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number" && Number.isFinite(value)
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(contextValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => (
        child === undefined ? [] : [[contextSegment(key), contextValue(child)]]
      )),
    );
  }
  throw new InvalidWorkflowRuntimeContextError(
    "Runtime context contains an unsupported value.",
  );
}

function addContextValue(
  target: Record<string, FormContextValue>,
  path: string,
  value: unknown,
) {
  if (value === undefined) return;
  if (Object.hasOwn(target, path)) {
    throw new InvalidWorkflowRuntimeContextError(
      `Runtime context path ${path} is ambiguous.`,
    );
  }
  target[path] = contextValue(value);
}

function addRecord(
  target: Record<string, FormContextValue>,
  prefix: string,
  record: WorkflowRuntimeContextRecord,
) {
  Object.entries(record).forEach(([key, value]) => {
    const path = `${prefix}.${contextSegment(key)}`;
    if (
      value
      && typeof value === "object"
      && !Array.isArray(value)
      && !(value instanceof Date)
      && Object.keys(value).length
    ) {
      addRecord(target, path, value as WorkflowRuntimeContextRecord);
      return;
    }
    addContextValue(target, path, value);
  });
}

export function buildWorkflowRuntimeContext(
  source: WorkflowTaskRuntimeContextSource,
  fundingCall: WorkflowRuntimeContextRecord,
) {
  const available: Record<string, FormContextValue> = {};
  addRecord(available, "application", {
    fundingOpportunityId: source.application.fundingOpportunityId,
    id: source.application.id,
    reference: source.application.reference,
    status: source.application.status,
  });
  [
    source.application.business,
    source.application.project,
    source.application.financial,
    source.application.declarations,
  ].forEach((section) => addRecord(available, "application", section));
  addRecord(
    available,
    "application.section_completion",
    source.application.sectionCompletion,
  );
  addRecord(available, "fundingCall", fundingCall);
  addRecord(available, "workflow", source.workflow);
  addRecord(available, "stage", source.stage);
  addRecord(available, "task", source.task);
  source.priorStageValues.forEach((prior) => {
    const stagePrefix = `stage.${contextSegment(prior.stageKey)}`;
    addRecord(available, stagePrefix, prior.values);
    addRecord(available, stagePrefix, prior.result);
  });
  return available;
}
