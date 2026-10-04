type TaskRequirementIdentity = {
  id?: string;
  taskStableKey: string;
} & ({ key: string } | { stableKey: string });

export function isSameWorkflowTaskRequirement(
  left: TaskRequirementIdentity,
  right: TaskRequirementIdentity | undefined,
) {
  if (!right) return false;
  if (left.id && right.id) return left.id === right.id;
  const leftKey = "stableKey" in left ? left.stableKey : left.key;
  const rightKey = "stableKey" in right ? right.stableKey : right.key;
  return left.taskStableKey === right.taskStableKey && leftKey === rightKey;
}
