import { z } from "zod";

import type { Condition } from "./Condition";
import type { ConditionGroup, ConditionNode } from "./ConditionGroup";
import type { JsonValue, Operand } from "./Operand";
import { operator, type Operator } from "./Operator";

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const fieldOperandSchema = z
  .object({
    kind: z.literal("FIELD"),
    key: z.string().min(1),
  })
  .strict();

const constantOperandSchema = z
  .object({
    kind: z.literal("CONSTANT"),
    value: jsonValueSchema,
  })
  .strict();

export const operandSchema: z.ZodType<Operand> = z.discriminatedUnion("kind", [
  fieldOperandSchema,
  constantOperandSchema,
]);

export const operatorSchema: z.ZodType<Operator> = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]*$/)
  .transform(operator);

export const conditionSchema: z.ZodType<Condition> = z
  .object({
    id: z.string().uuid(),
    kind: z.literal("CONDITION"),
    leftOperand: operandSchema,
    operator: operatorSchema,
    rightOperand: operandSchema.optional(),
  })
  .strict();

export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.union([conditionSchema, conditionGroupSchema]),
);

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z
    .object({
      id: z.string().uuid(),
      kind: z.literal("GROUP"),
      combinator: z.enum(["AND", "OR"]),
      children: z.array(conditionNodeSchema),
    })
    .strict(),
);

export function serializeConditionGroup(group: ConditionGroup): ConditionGroup {
  return conditionGroupSchema.parse(group);
}

export function deserializeConditionGroup(value: unknown): ConditionGroup {
  return conditionGroupSchema.parse(value);
}
