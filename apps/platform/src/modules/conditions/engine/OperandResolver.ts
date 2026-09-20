import type { JsonValue, Operand } from "../domain/Operand";

export type FieldValues = Readonly<Record<string, JsonValue>>;

export class FieldOperandNotFoundError extends Error {
  readonly fieldKey: string;

  constructor(fieldKey: string) {
    super(`No value was provided for field operand "${fieldKey}".`);
    this.name = "FieldOperandNotFoundError";
    this.fieldKey = fieldKey;
  }
}

export function resolveOperand(
  operand: Operand,
  fieldValues: FieldValues,
): JsonValue {
  if (operand.kind === "CONSTANT") {
    return operand.value;
  }

  if (!Object.hasOwn(fieldValues, operand.key)) {
    throw new FieldOperandNotFoundError(operand.key);
  }

  return fieldValues[operand.key];
}
