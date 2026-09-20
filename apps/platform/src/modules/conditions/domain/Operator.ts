declare const operatorBrand: unique symbol;

export type Operator<Code extends string = string> = Code & {
  readonly [operatorBrand]: "Operator";
};

export function operator<const Code extends string>(code: Code): Operator<Code> {
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
    throw new Error("Operator codes must be uppercase stable keys.");
  }

  return code as Operator<Code>;
}
