import type { ConditionFieldDefinition } from "./ConditionConfiguration";

/** Format presentation metadata without changing the stable operand key. */
export function formatConditionFieldLabel(
  field: Pick<ConditionFieldDefinition, "label" | "source">,
): string {
  if (!field.source?.length) return field.label;
  const path = field.source.map((segment) => segment.name
    ? `[${segment.label} → ${segment.name}]`
    : `[${segment.label}]`);
  return [...path, field.label].join(".");
}
