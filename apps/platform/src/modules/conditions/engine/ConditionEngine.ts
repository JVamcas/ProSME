import type { Condition } from "../domain/Condition";
import type { JsonValue } from "../domain/Operand";
import type { Operator } from "../domain/Operator";
import {
  evaluateBasicOperator,
  IncomparableOperandsError,
  isBasicOperator,
} from "./BasicOperators";
import {
  additionalOperatorRequiresRightOperand,
  evaluateAdditionalOperator,
  InvalidAdditionalOperatorOperandsError,
  isAdditionalOperator,
} from "./AdditionalOperators";
import {
  ComputedOperandEvaluationError,
  type ComputedOperandErrorCode,
  FieldOperandNotFoundError,
  type FieldValues,
  resolveOperand,
} from "./OperandResolver";

export type ResolvedOperands = {
  left?: JsonValue;
  right?: JsonValue;
};

export type ConditionEvaluationError =
  | {
      code: "FIELD_NOT_FOUND";
      message: string;
      fieldKey: string;
    }
  | {
      code: "RIGHT_OPERAND_REQUIRED";
      message: string;
    }
  | {
      code: "UNSUPPORTED_OPERATOR";
      message: string;
    }
  | {
      code: "INCOMPARABLE_OPERANDS";
      message: string;
    }
  | {
      code: "INVALID_OPERATOR_OPERANDS";
      message: string;
    }
  | {
      code: ComputedOperandErrorCode;
      message: string;
    };

export type ConditionEvaluationResult = {
  passed: boolean;
  resolvedOperands: ResolvedOperands;
  operator: Operator;
  error: ConditionEvaluationError | null;
};

function errorResult(
  operator: Operator,
  resolvedOperands: ResolvedOperands,
  error: ConditionEvaluationError,
): ConditionEvaluationResult {
  return {
    passed: false,
    resolvedOperands,
    operator,
    error,
  };
}

export function evaluateCondition(
  condition: Condition,
  fieldValues: FieldValues,
): ConditionEvaluationResult {
  const resolvedOperands: ResolvedOperands = {};

  const basicOperator = isBasicOperator(condition.operator)
    ? condition.operator
    : null;
  const additionalOperator = isAdditionalOperator(condition.operator)
    ? condition.operator
    : null;
  if (!basicOperator && !additionalOperator) {
    return errorResult(condition.operator, resolvedOperands, {
      code: "UNSUPPORTED_OPERATOR",
      message: `Operator "${condition.operator}" is not supported.`,
    });
  }

  try {
    resolvedOperands.left = resolveOperand(
      condition.leftOperand,
      fieldValues,
    );
    const requiresRightOperand = basicOperator
      ? true
      : additionalOperatorRequiresRightOperand(additionalOperator!);
    if (requiresRightOperand && !condition.rightOperand) {
      return errorResult(condition.operator, resolvedOperands, {
        code: "RIGHT_OPERAND_REQUIRED",
        message: `Operator "${condition.operator}" requires a right operand.`,
      });
    }
    if (condition.rightOperand) {
      resolvedOperands.right = resolveOperand(
        condition.rightOperand,
        fieldValues,
      );
    }

    const passed = basicOperator
      ? evaluateBasicOperator(
        basicOperator,
        resolvedOperands.left,
        resolvedOperands.right!,
      )
      : evaluateAdditionalOperator(
        additionalOperator!,
        resolvedOperands.left,
        resolvedOperands.right,
      );

    return {
      passed,
      resolvedOperands,
      operator: condition.operator,
      error: null,
    };
  } catch (error) {
    if (error instanceof FieldOperandNotFoundError) {
      return errorResult(condition.operator, resolvedOperands, {
        code: "FIELD_NOT_FOUND",
        message: error.message,
        fieldKey: error.fieldKey,
      });
    }
    if (error instanceof IncomparableOperandsError) {
      return errorResult(condition.operator, resolvedOperands, {
        code: "INCOMPARABLE_OPERANDS",
        message: error.message,
      });
    }
    if (error instanceof InvalidAdditionalOperatorOperandsError) {
      return errorResult(condition.operator, resolvedOperands, {
        code: "INVALID_OPERATOR_OPERANDS",
        message: error.message,
      });
    }
    if (error instanceof ComputedOperandEvaluationError) {
      return errorResult(condition.operator, resolvedOperands, {
        code: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
