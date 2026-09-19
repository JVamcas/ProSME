import type {
  FormContextUsage,
  FormRuntimeBinding,
  FormRuntimeBindingInput,
} from "@/modules/forms/domain/FormRuntimeBinding";
import type { FormField } from "@/modules/forms/FormTypes";

export type FormContextValue =
  | boolean
  | number
  | string
  | null
  | readonly FormContextValue[]
  | { readonly [key: string]: FormContextValue };

export type FormRuntimeContext = Readonly<Record<string, FormContextValue>>;

export class InvalidFormRuntimeBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFormRuntimeBindingError";
  }
}

const contextPathPattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const bindingKeyPattern = /^[A-Z][A-Z0-9_]*$/;

function requireText(value: string, label: string) {
  if (!value.trim()) {
    throw new InvalidFormRuntimeBindingError(`${label} is required.`);
  }
}

function requireUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new InvalidFormRuntimeBindingError(`${label} must be unique.`);
  }
}

function validateContextPaths(paths: readonly string[], label: string) {
  requireUnique(paths, label);
  const invalidPath = paths.find((path) => !contextPathPattern.test(path));
  if (invalidPath) {
    throw new InvalidFormRuntimeBindingError(
      `${label} contains invalid context path ${invalidPath}.`,
    );
  }
}

function validateAllowedReferences(
  references: readonly string[],
  exposedPaths: ReadonlySet<string>,
  label: string,
) {
  validateContextPaths(references, label);
  const unexposed = references.find((path) => !exposedPaths.has(path));
  if (unexposed) {
    throw new InvalidFormRuntimeBindingError(
      `${label} contains unexposed context path ${unexposed}.`,
    );
  }
}

export function createFormRuntimeBinding(
  input: FormRuntimeBindingInput,
): FormRuntimeBinding {
  if (input.formVersion.status !== "PUBLISHED") {
    throw new InvalidFormRuntimeBindingError(
      "A runtime binding requires a published Form Version.",
    );
  }
  if (!bindingKeyPattern.test(input.key)) {
    throw new InvalidFormRuntimeBindingError(
      "The binding key must be a stable uppercase key.",
    );
  }
  requireText(input.host.type, "Binding host type");
  requireText(input.host.referenceId, "Binding host reference");
  requireText(input.principal.type, "Binding principal type");

  validateContextPaths(input.context.exposedPaths, "Exposed context paths");
  const exposedPaths = new Set(input.context.exposedPaths);
  validateAllowedReferences(
    input.context.visibilityReferences,
    exposedPaths,
    "Visibility references",
  );
  validateAllowedReferences(
    input.context.validationReferences,
    exposedPaths,
    "Validation references",
  );

  return {
    context: {
      exposedPaths: [...input.context.exposedPaths],
      validationReferences: [...input.context.validationReferences],
      visibilityReferences: [...input.context.visibilityReferences],
    },
    formVersionId: input.formVersion.id,
    host: { ...input.host },
    key: input.key,
    principal: { ...input.principal },
  };
}

function freezeContextValue(value: FormContextValue): FormContextValue {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeContextValue));
  }
  if (value && typeof value === "object") {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        freezeContextValue(child),
      ]),
    ));
  }
  return value;
}

export function exposeFormRuntimeContext(
  binding: FormRuntimeBinding,
  availableContext: Readonly<Record<string, FormContextValue>>,
): FormRuntimeContext {
  const entries = binding.context.exposedPaths.map((path) => {
    if (!Object.hasOwn(availableContext, path)) {
      throw new InvalidFormRuntimeBindingError(
        `Required context path ${path} was not supplied.`,
      );
    }
    return [path, freezeContextValue(availableContext[path])] as const;
  });
  return Object.freeze(Object.fromEntries(entries));
}

export function readFormContextReference(
  binding: FormRuntimeBinding,
  context: FormRuntimeContext,
  path: string,
  usage: FormContextUsage,
): FormContextValue {
  const allowed = usage === "VISIBILITY"
    ? binding.context.visibilityReferences
    : binding.context.validationReferences;
  if (!allowed.includes(path)) {
    throw new InvalidFormRuntimeBindingError(
      `Context path ${path} is not allowed for ${usage.toLowerCase()}.`,
    );
  }
  if (!Object.hasOwn(context, path)) {
    throw new InvalidFormRuntimeBindingError(
      `Context path ${path} is not available at runtime.`,
    );
  }
  return context[path];
}

export function captureFormResponseValues(
  fields: readonly FormField[],
  submittedValues: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const fieldKeys = new Set(fields.map((field) => field.key));
  const unexpectedKey = Object.keys(submittedValues).find(
    (key) => !fieldKeys.has(key),
  );
  if (unexpectedKey) {
    throw new InvalidFormRuntimeBindingError(
      `Form response contains non-form value ${unexpectedKey}.`,
    );
  }
  return Object.fromEntries(
    fields.flatMap((field) => (
      Object.hasOwn(submittedValues, field.key)
        ? [[field.key, submittedValues[field.key]]]
        : []
    )),
  );
}

