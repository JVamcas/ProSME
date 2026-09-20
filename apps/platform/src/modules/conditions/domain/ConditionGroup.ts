import type { Condition } from "./Condition";

export const conditionGroupCombinators = ["AND", "OR"] as const;

export type ConditionGroupCombinator =
  (typeof conditionGroupCombinators)[number];

export type ConditionNode = Condition | ConditionGroup;

export type ConditionGroup = {
  id: string;
  kind: "GROUP";
  combinator: ConditionGroupCombinator;
  children: ConditionNode[];
};
