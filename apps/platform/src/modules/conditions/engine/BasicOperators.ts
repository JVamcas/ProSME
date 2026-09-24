import type { JsonValue } from "../domain/Operand";
import { operator, type Operator } from "../domain/Operator";

export const basicOperators = {
  EQUALS: operator("EQUALS"),
  NOT_EQUALS: operator("NOT_EQUALS"),
  GREATER_THAN: operator("GREATER_THAN"),
  LESS_THAN: operator("LESS_THAN"),
  GREATER_THAN_OR_EQUAL: operator("GREATER_THAN_OR_EQUAL"),
  LESS_THAN_OR_EQUAL: operator("LESS_THAN_OR_EQUAL"),
} as const;

export type BasicOperator =
  (typeof basicOperators)[keyof typeof basicOperators];

const basicOperatorCodes = new Set<Operator>(Object.values(basicOperators));

export class IncomparableOperandsError extends TypeError {
  constructor() {
    super("Ordering operators require two numbers or two strings.");
    this.name = "IncomparableOperandsError";
  }
}

export function isBasicOperator(value: Operator): value is BasicOperator {
  return basicOperatorCodes.has(value);
}

export function jsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true;
  }
  if (left === null || right === null || typeof left !== typeof right) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => jsonValuesEqual(value, right[index]));
  }
  if (typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every(
      (key) => Object.hasOwn(right, key)
        && jsonValuesEqual(left[key], right[key]),
    );
}

function compareValues(left: JsonValue, right: JsonValue): number {
  const bothNumbers = typeof left === "number" && typeof right === "number";
  const bothStrings = typeof left === "string" && typeof right === "string";
  if (!bothNumbers && !bothStrings) {
    throw new IncomparableOperandsError();
  }
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export function evaluateBasicOperator(
  selectedOperator: BasicOperator,
  left: JsonValue,
  right: JsonValue,
): boolean {
  switch (selectedOperator) {
    case basicOperators.EQUALS:
      return jsonValuesEqual(left, right);
    case basicOperators.NOT_EQUALS:
      return !jsonValuesEqual(left, right);
    case basicOperators.GREATER_THAN:
      return compareValues(left, right) > 0;
    case basicOperators.LESS_THAN:
      return compareValues(left, right) < 0;
    case basicOperators.GREATER_THAN_OR_EQUAL:
      return compareValues(left, right) >= 0;
    case basicOperators.LESS_THAN_OR_EQUAL:
      return compareValues(left, right) <= 0;
  }

  throw new Error(`Unsupported basic operator: ${selectedOperator}`);
}
