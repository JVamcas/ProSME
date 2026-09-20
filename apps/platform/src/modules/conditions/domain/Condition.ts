import type { Operand } from "./Operand";
import type { Operator } from "./Operator";

export type Condition = {
  id: string;
  kind: "CONDITION";
  leftOperand: Operand;
  operator: Operator;
  rightOperand?: Operand;
};
