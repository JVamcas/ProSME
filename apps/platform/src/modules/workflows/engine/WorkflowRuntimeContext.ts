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
  selectedPaths: ReadonlySet<string>,
) {
  if (!selectedPaths.has(path)) return;
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
  selectedPaths: ReadonlySet<string>,
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
      addRecord(target, path, value as WorkflowRuntimeContextRecord, selectedPaths);
      return;
    }
    addContextValue(target, path, value, selectedPaths);
  });
}

export function buildWorkflowRuntimeContext(
  source: WorkflowTaskRuntimeContextSource,
  fundingCall: WorkflowRuntimeContextRecord,
) {
  const available: Record<string, FormContextValue> = {};
  const selectedPaths = new Set(
    source.binding.contextFields.map((field) => field.key),
  );
  const add = (prefix: string, record: WorkflowRuntimeContextRecord) => {
    addRecord(available, prefix, record, selectedPaths);
  };
  add("application", {
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
  ].forEach((section) => add("application", section));
  add(
    "application.section_completion",
    source.application.sectionCompletion,
  );
  add("fundingCall", fundingCall);
  add("eligibility", source.eligibility);
  add("workflow", source.workflow);
  add("stage", source.stage);
  add("task", source.task);
  source.priorStageValues.forEach((prior) => {
    const stagePrefix = `stage.${contextSegment(prior.stageKey)}`;
    add(stagePrefix, prior.values);
    add(stagePrefix, prior.result);
  });
  return available;
}
