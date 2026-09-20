import type { ConditionGroup, ConditionNode } from "./ConditionGroup";

export function findConditionNode(
  group: ConditionGroup,
  nodeId: string,
): ConditionNode | null {
  if (group.id === nodeId) return group;

  for (const child of group.children) {
    if (child.id === nodeId) return child;
    if (child.kind === "GROUP") {
      const nested = findConditionNode(child, nodeId);
      if (nested) return nested;
    }
  }

  return null;
}
