export type JsonPrimitive = boolean | number | string | null;

export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FieldOperand = {
  kind: "FIELD";
  key: string;
};

export type ConstantOperand = {
  kind: "CONSTANT";
  value: JsonValue;
};

export type DirectOperand = FieldOperand | ConstantOperand;

export const computedOperandOperations = [
  "ADD",
  "SUBTRACT",
  "MULTIPLY",
  "DIVIDE",
] as const;

export type ComputedOperandOperation =
  (typeof computedOperandOperations)[number];

export type ComputedOperand = {
  kind: "COMPUTED";
  operation: ComputedOperandOperation;
  leftOperand: DirectOperand;
  rightOperand: DirectOperand;
};

export type Operand = DirectOperand | ComputedOperand;
