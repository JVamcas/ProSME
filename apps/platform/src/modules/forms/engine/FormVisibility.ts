import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import { evaluateConditionGroup } from "@/modules/conditions/engine/ConditionGroupEngine";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import type {
  FormField,
  FormRuntimeSchema,
  FormSection,
} from "@/modules/forms/FormTypes";

function conditionFieldType(
  field: FormField,
): ConditionFieldDefinition["type"] | null {
  if (["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type)) {
    return "NUMBER";
  }
  if (field.type === "YES_NO") return "BOOLEAN";
  if (field.type === "DATE") return "DATE";
  if (["TEXT", "TEXTAREA", "SINGLE_SELECT"].includes(field.type)) {
    return "TEXT";
  }
  return null;
}

export function formVisibilityConditionFields(
  fields: readonly FormField[],
): ConditionFieldDefinition[] {
  return fields.flatMap((field) => {
    const type = conditionFieldType(field);
    return type
      ? [{ key: field.key, label: `${field.label} (${field.key})`, type }]
      : [];
  });
}

function jsonValue(value: unknown): JsonValue {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || typeof value === "number" && Number.isFinite(value)
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, jsonValue(child)]),
    );
  }
  return null;
}

function conditionValues(
  fields: readonly FormField[],
  values: Readonly<Record<string, unknown>>,
) {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    Object.hasOwn(values, field.key) ? jsonValue(values[field.key]) : null,
  ]));
}

function emptyConditionValues(
  fields: readonly FormField[],
): Record<string, JsonValue> {
  return Object.fromEntries(fields.map((field) => [field.key, null]));
}

function conditionPasses(
  condition: ConditionGroup | null | undefined,
  values: Readonly<Record<string, JsonValue>>,
) {
  return !condition || evaluateConditionGroup(condition, values).passed;
}

export type FormVisibilityResult = {
  fields: FormField[];
  sections: FormSection[];
};

export function resolveFormVisibility(
  definition: Pick<FormRuntimeSchema, "fields" | "sections">,
  values: Readonly<Record<string, unknown>>,
): FormVisibilityResult {
  const suppliedValues = conditionValues(definition.fields, values);
  const resolvedValues = emptyConditionValues(definition.fields);
  const sections: FormSection[] = [];
  const fields: FormField[] = [];
  const orderedSections = [...definition.sections]
    .sort((left, right) => left.order - right.order);
  for (const section of orderedSections) {
    if (!conditionPasses(section.visibilityCondition, resolvedValues)) {
      continue;
    }
    sections.push(section);
    const sectionFields = definition.fields
      .filter((field) => field.sectionId === section.id)
      .sort((left, right) => left.order - right.order);
    for (const field of sectionFields) {
      if (!conditionPasses(field.visibilityCondition, resolvedValues)) {
        continue;
      }
      fields.push(field);
      resolvedValues[field.key] = suppliedValues[field.key];
    }
  }
  const visibleFields = new Set(fields);
  const visibleSections = new Set(sections);
  return {
    fields: definition.fields.filter((field) => visibleFields.has(field)),
    sections: definition.sections.filter((section) => (
      visibleSections.has(section)
    )),
  };
}

export function activeFormDefinition(
  definition: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
): FormRuntimeSchema {
  const visible = resolveFormVisibility(definition, values);
  return {
    ...definition,
    fields: visible.fields,
    sections: visible.sections,
  };
}

export function sanitizeFormResponseValues(
  definition: FormRuntimeSchema,
  values: Readonly<Record<string, unknown>>,
) {
  const visible = resolveFormVisibility(definition, values);
  return Object.fromEntries(visible.fields.flatMap((field) => (
    Object.hasOwn(values, field.key) ? [[field.key, values[field.key]]] : []
  )));
}

function conditionErrors(
  condition: ConditionGroup | null | undefined,
  fields: readonly ConditionFieldDefinition[],
  label: string,
) {
  if (!condition) return [];
  return validateConditionGroup(
    condition,
    fields,
    conditionBuilderOperators,
  ).issues.map((issue) => `${label}: ${issue.message}`);
}

export function formVisibilityConfigurationErrors(
  fields: readonly FormField[],
  sections: readonly FormSection[],
) {
  const sectionOrder = new Map(
    sections.flatMap((section) => section.id
      ? [[section.id, section.order] as const]
      : []),
  );
  const fieldsBeforeSection = (target: FormSection) => fields.filter(
    (field) => (sectionOrder.get(field.sectionId) ?? Infinity) < target.order,
  );
  const fieldsBeforeField = (target: FormField) => fields.filter((field) => {
    const sourceSectionOrder = sectionOrder.get(field.sectionId) ?? Infinity;
    const targetSectionOrder = sectionOrder.get(target.sectionId) ?? Infinity;
    return sourceSectionOrder < targetSectionOrder
      || sourceSectionOrder === targetSectionOrder && field.order < target.order;
  });
  return [
    ...sections.flatMap((section) => conditionErrors(
      section.visibilityCondition,
      formVisibilityConditionFields(fieldsBeforeSection(section)),
      `Section ${section.key} visibility`,
    )),
    ...fields.flatMap((field) => conditionErrors(
      field.visibilityCondition,
      formVisibilityConditionFields(fieldsBeforeField(field)),
      `Field ${field.key} visibility`,
    )),
  ];
}
