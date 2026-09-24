import type { ConditionFieldType } from "../domain/ConditionConfiguration";
import type { JsonValue } from "../domain/Operand";

function isValidIsoDate(value: string) {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = new Date(Date.UTC(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    ));
    return date.toISOString().slice(0, 10) === value;
  }
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  return timestamp.test(value) && !Number.isNaN(new Date(value).getTime());
}

export function valueMatchesFieldType(
  value: JsonValue,
  expected: ConditionFieldType,
) {
  if (expected === "NUMBER") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (expected === "BOOLEAN") return typeof value === "boolean";
  if (expected === "DATE") {
    return typeof value === "string" && isValidIsoDate(value);
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function expectedValueDescription(type: ConditionFieldType) {
  if (type === "NUMBER") return "a finite number";
  if (type === "BOOLEAN") return "true or false";
  if (type === "DATE") return "a valid ISO date";
  return "non-empty text";
}

export function rangeIsOutOfOrder(lower: JsonValue, upper: JsonValue) {
  if (typeof lower === "number" && typeof upper === "number") {
    return lower > upper;
  }
  if (typeof lower === "string" && typeof upper === "string") {
    return lower > upper;
  }
  return false;
}
