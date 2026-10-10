import type { ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import type { Operand } from "@/modules/conditions/domain/Operand";
import type { PublicEligibilityKnowledge } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import { chatbotLimits } from "../domain/ChatbotLimits";

export class EligibilityExplanationError extends Error {
  constructor(readonly code: "UNSUPPORTED_CONDITION" | "PRIVATE_DEPENDENCY") {
    super(
      code === "PRIVATE_DEPENDENCY"
        ? "This criterion depends on information outside the public self-check."
        : "This condition cannot be explained deterministically; correct its public source before approval.",
    );
  }
}

type Input = PublicEligibilityKnowledge["inputs"][number];
const expectedTypes: Record<string, string> = {
  NUMBER: "number",
  BOOLEAN: "boolean",
  TEXT: "string",
  DATE: "string",
};
const comparisons: Record<string, string> = {
  EQUALS: "is equal to",
  NOT_EQUALS: "is not equal to",
  GREATER_THAN: "is greater than",
  GREATER_THAN_OR_EQUAL: "is at least",
  LESS_THAN: "is less than",
  LESS_THAN_OR_EQUAL: "is at most",
  IN: "is one of",
  NOT_IN: "is none of",
  BEFORE: "is before",
  AFTER: "is after",
};

export function explainEligibilityCondition(
  node: ConditionNode,
  inputs: Input[],
  publicCallFacts: Record<string, { label: string; value: string }> = {},
) {
  const definitions = new Map(
    inputs.map((input) => [`eligibility.${input.stableKey}`, input]),
  );
  let nodes = 0;
  function operand(value: Operand | undefined, options?: Input): string {
    if (!value) throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    if (value.kind === "FIELD") {
      const definition = definitions.get(value.key);
      const callFact = publicCallFacts[value.key];
      if (callFact) return `${callFact.label} (${callFact.value})`;
      if (!definition)
        throw new EligibilityExplanationError("PRIVATE_DEPENDENCY");
      return definition.label;
    }
    if (value.kind !== "CONSTANT")
      throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    const values = Array.isArray(value.value) ? value.value : [value.value];
    return values
      .map((item) => {
        if (item === null || typeof item === "object")
          throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
        if (options?.selfCheck.answerType === "YES_NO_NA") {
          const label = {
            YES: "Yes",
            NO: "No",
            NOT_APPLICABLE: "Not applicable",
          }[String(item)];
          if (!label)
            throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
          return label;
        }
        if (
          options &&
          ["SINGLE_SELECT", "MULTI_SELECT"].includes(
            options.selfCheck.answerType,
          )
        ) {
          const label = options.selfCheck.options.find(
            (option) => option.value === String(item),
          )?.label;
          if (!label)
            throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
          return label;
        }
        if (options) {
          const expected = expectedTypes[options.type];
          if (expected && typeof item !== expected)
            throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
          if (options.type === "DATE" && Number.isNaN(Date.parse(String(item))))
            throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
          if (options.selfCheck.answerType === "PERCENTAGE") return `${item}%`;
        }
        return item === true ? "Yes" : item === false ? "No" : String(item);
      })
      .join(", ");
  }
  function explain(current: ConditionNode, depth: number): string {
    if (
      ++nodes > chatbotLimits.conditionNodes ||
      depth > chatbotLimits.conditionDepth
    ) {
      throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    }
    if (current.kind === "GROUP") {
      if (
        !current.children.length ||
        !["AND", "OR"].includes(current.combinator)
      ) {
        throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
      }
      const label = current.combinator === "AND" ? "All of" : "At least one of";
      const clauses = current.children.map((child) =>
        explain(child, depth + 1),
      );
      return `${label}: (${clauses.join(` ${current.combinator}; `)})`;
    }
    const left = operand(current.leftOperand);
    const definition =
      current.leftOperand.kind === "FIELD"
        ? definitions.get(current.leftOperand.key)
        : undefined;
    if (current.operator === "IS_EMPTY") return `${left} is empty`;
    if (current.operator === "IS_NOT_EMPTY") return `${left} is not empty`;
    const right = current.rightOperand;
    const list =
      right?.kind === "CONSTANT" && Array.isArray(right.value)
        ? right.value
        : null;
    if (current.operator === "BETWEEN") {
      if (
        !list ||
        list.length !== 2 ||
        !["number", "string"].includes(typeof list[0]) ||
        typeof list[0] !== typeof list[1] ||
        (typeof list[0] === "number" &&
          typeof list[1] === "number" &&
          list[0] > list[1]) ||
        (typeof list[0] === "string" &&
          typeof list[1] === "string" &&
          list[0] > list[1])
      ) {
        throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
      }
      const lower = operand({ kind: "CONSTANT", value: list[0] }, definition);
      const upper = operand({ kind: "CONSTANT", value: list[1] }, definition);
      return `${left} is between ${lower} and ${upper}, including both limits`;
    }
    if (["IN", "NOT_IN"].includes(current.operator)) {
      if (!list?.length)
        throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    } else if (list) {
      throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    }
    const comparison = comparisons[current.operator];
    if (!comparison)
      throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
    return `${left} ${comparison} ${operand(current.rightOperand, definition)}`;
  }
  return explain(node, 0);
}
