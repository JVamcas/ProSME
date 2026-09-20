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

export type Operand = FieldOperand | ConstantOperand;
