import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { formFieldRulesSchema } from "../api/FormFieldRuleSchemas";
import type { FormField, FormSection } from "../FormTypes";
import { formVisibilityConditionFields } from "./FormVisibility";

export function fieldsBeforeFormField(
  fields: readonly FormField[],
  sections: readonly FormSection[],
  target: Pick<FormField, "sectionId" | "order">,
) {
  const sectionOrder = new Map(
    sections.map((section) => [section.id, section.order]),
  );
  const targetOrder = sectionOrder.get(target.sectionId) ?? Infinity;
  return fields.filter((field) => {
    const order = sectionOrder.get(field.sectionId) ?? Infinity;
    return (
      order < targetOrder ||
      (order === targetOrder && field.order < target.order)
    );
  });
}

export function formRuleConfigurationErrors(
  fields: readonly FormField[],
  sections: readonly FormSection[],
) {
  return fields.flatMap((field) => {
    if (!field.rules) return [];
    const parsed = formFieldRulesSchema.safeParse(field.rules);
    if (!parsed.success)
      return parsed.error.issues.map(
        (issue) => `${field.label}: ${issue.message}`,
      );
    return (
      ["validationCondition", "editableCondition", "requiredCondition"] as const
    ).flatMap((key) => {
      const condition = field.rules?.[key];
      if (!condition) return [];
      const available =
        key === "validationCondition"
          ? fields
          : fieldsBeforeFormField(fields, sections, field);
      return validateConditionGroup(
        condition,
        formVisibilityConditionFields(available),
        conditionBuilderOperators,
      ).issues.map((issue) => `${field.label} ${key}: ${issue.message}`);
    });
  });
}
