import type {
  ComputedOperand,
  DirectOperand,
  JsonValue,
  Operand,
} from "../domain/Operand";

export type FieldValues = Readonly<Record<string, JsonValue>>;

export class FieldOperandNotFoundError extends Error {
  readonly fieldKey: string;

  constructor(fieldKey: string) {
    super(`No value was provided for field operand "${fieldKey}".`);
    this.name = "FieldOperandNotFoundError";
    this.fieldKey = fieldKey;
  }
}

export type ComputedOperandErrorCode =
  | "COMPUTED_OPERAND_REQUIRES_FINITE_NUMBERS"
  | "COMPUTED_OPERAND_DIVISION_BY_ZERO"
  | "COMPUTED_OPERAND_RESULT_NOT_FINITE";

export class ComputedOperandEvaluationError extends TypeError {
  readonly code: ComputedOperandErrorCode;

  constructor(code: ComputedOperandErrorCode, message: string) {
    super(message);
    this.name = "ComputedOperandEvaluationError";
    this.code = code;
  }
}

function resolveDirectOperand(
  operand: DirectOperand,
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

function resolveComputedOperand(
  operand: ComputedOperand,
  fieldValues: FieldValues,
): number {
  const left = resolveDirectOperand(operand.leftOperand, fieldValues);
  const right = resolveDirectOperand(operand.rightOperand, fieldValues);
  if (
    typeof left !== "number"
    || typeof right !== "number"
    || !Number.isFinite(left)
    || !Number.isFinite(right)
  ) {
    throw new ComputedOperandEvaluationError(
      "COMPUTED_OPERAND_REQUIRES_FINITE_NUMBERS",
      `Computed operand ${operand.operation} requires two finite numbers.`,
    );
  }
  if (operand.operation === "DIVIDE" && right === 0) {
    throw new ComputedOperandEvaluationError(
      "COMPUTED_OPERAND_DIVISION_BY_ZERO",
      "Computed operand DIVIDE cannot divide by zero.",
    );
  }

  let result: number;
  switch (operand.operation) {
    case "ADD":
      result = left + right;
      break;
    case "SUBTRACT":
      result = left - right;
      break;
    case "MULTIPLY":
      result = left * right;
      break;
    case "DIVIDE":
      result = left / right;
      break;
  }
  if (!Number.isFinite(result)) {
    throw new ComputedOperandEvaluationError(
      "COMPUTED_OPERAND_RESULT_NOT_FINITE",
      `Computed operand ${operand.operation} must produce a finite result.`,
    );
  }

  return result;
}

export function resolveOperand(
  operand: Operand,
  fieldValues: FieldValues,
): JsonValue {
  if (operand.kind === "COMPUTED") {
    return resolveComputedOperand(operand, fieldValues);
  }

  return resolveDirectOperand(operand, fieldValues);
}
