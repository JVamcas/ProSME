import type { JsonValue } from "../domain/Operand";
import { operator, type Operator } from "../domain/Operator";
import { jsonValuesEqual } from "./BasicOperators";

export const additionalOperators = {
  IN: operator("IN"),
  NOT_IN: operator("NOT_IN"),
  BETWEEN: operator("BETWEEN"),
  BEFORE: operator("BEFORE"),
  AFTER: operator("AFTER"),
  IS_EMPTY: operator("IS_EMPTY"),
  IS_NOT_EMPTY: operator("IS_NOT_EMPTY"),
  WITHIN_LAST_N_MONTHS: operator("WITHIN_LAST_N_MONTHS"),
} as const;

export type AdditionalOperator =
  (typeof additionalOperators)[keyof typeof additionalOperators];

const additionalOperatorCodes = new Set<Operator>(
  Object.values(additionalOperators),
);
const unaryOperatorCodes = new Set<Operator>([
  additionalOperators.IS_EMPTY,
  additionalOperators.IS_NOT_EMPTY,
]);

export class InvalidAdditionalOperatorOperandsError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAdditionalOperatorOperandsError";
  }
}

export function isAdditionalOperator(
  value: Operator,
): value is AdditionalOperator {
  return additionalOperatorCodes.has(value);
}

export function additionalOperatorRequiresRightOperand(
  value: AdditionalOperator,
): boolean {
  return !unaryOperatorCodes.has(value);
}

function requireArray(value: JsonValue | undefined, operatorCode: string) {
  if (!Array.isArray(value)) {
    throw new InvalidAdditionalOperatorOperandsError(
      `${operatorCode} requires an array as its right operand.`,
    );
  }

  return value;
}

function compareRangeValues(left: JsonValue, right: JsonValue): number {
  const bothNumbers = typeof left === "number" && typeof right === "number";
  const bothStrings = typeof left === "string" && typeof right === "string";
  if (!bothNumbers && !bothStrings) {
    throw new InvalidAdditionalOperatorOperandsError(
      "BETWEEN requires a number or string and two bounds of the same type.",
    );
  }
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function isEmpty(value: JsonValue): boolean {
  if (value === null || value === "") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return typeof value === "object" && Object.keys(value).length === 0;
}

function parseIsoDate(value: JsonValue | undefined, operatorCode: string): Date {
  if (typeof value !== "string") {
    throw new InvalidAdditionalOperatorOperandsError(
      `${operatorCode} requires ISO date strings.`,
    );
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = new Date(Date.UTC(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    ));
    if (date.toISOString().slice(0, 10) === value) {
      return date;
    }
  }

  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (timestamp.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new InvalidAdditionalOperatorOperandsError(
    `${operatorCode} requires valid ISO date strings.`,
  );
}

function subtractUtcMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCFullYear() * 12 + date.getUTCMonth() - months;
  const targetYear = Math.floor(targetMonth / 12);
  const monthWithinYear = targetMonth - targetYear * 12;
  const lastDay = new Date(Date.UTC(targetYear, monthWithinYear + 1, 0))
    .getUTCDate();

  return new Date(Date.UTC(
    targetYear,
    monthWithinYear,
    Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  ));
}

function evaluateBetween(left: JsonValue, right: JsonValue | undefined) {
  const bounds = requireArray(right, additionalOperators.BETWEEN);
  if (bounds.length !== 2) {
    throw new InvalidAdditionalOperatorOperandsError(
      "BETWEEN requires exactly two bounds.",
    );
  }
  if (compareRangeValues(bounds[0], bounds[1]) > 0) {
    throw new InvalidAdditionalOperatorOperandsError(
      "BETWEEN requires its lower bound before its upper bound.",
    );
  }

  return compareRangeValues(left, bounds[0]) >= 0
    && compareRangeValues(left, bounds[1]) <= 0;
}

function evaluateWithinLastMonths(
  left: JsonValue,
  right: JsonValue | undefined,
  currentDate: Date,
) {
  if (typeof right !== "number" || !Number.isInteger(right) || right < 1) {
    throw new InvalidAdditionalOperatorOperandsError(
      "WITHIN_LAST_N_MONTHS requires a positive integer month count.",
    );
  }

  const date = parseIsoDate(left, additionalOperators.WITHIN_LAST_N_MONTHS);
  const lowerBound = subtractUtcMonths(currentDate, right);
  return date >= lowerBound && date <= currentDate;
}

export function evaluateAdditionalOperator(
  selectedOperator: AdditionalOperator,
  left: JsonValue,
  right?: JsonValue,
  currentDate = new Date(),
): boolean {
  switch (selectedOperator) {
    case additionalOperators.IN:
      return requireArray(right, selectedOperator).some((candidate) =>
        jsonValuesEqual(left, candidate),
      );
    case additionalOperators.NOT_IN:
      return !requireArray(right, selectedOperator).some((candidate) =>
        jsonValuesEqual(left, candidate),
      );
    case additionalOperators.BETWEEN:
      return evaluateBetween(left, right);
    case additionalOperators.BEFORE:
      return parseIsoDate(left, selectedOperator)
        < parseIsoDate(right, selectedOperator);
    case additionalOperators.AFTER:
      return parseIsoDate(left, selectedOperator)
        > parseIsoDate(right, selectedOperator);
    case additionalOperators.IS_EMPTY:
      return isEmpty(left);
    case additionalOperators.IS_NOT_EMPTY:
      return !isEmpty(left);
    case additionalOperators.WITHIN_LAST_N_MONTHS:
      return evaluateWithinLastMonths(left, right, currentDate);
    default:
      throw new Error(`Unsupported additional operator: ${selectedOperator}`);
  }
}
