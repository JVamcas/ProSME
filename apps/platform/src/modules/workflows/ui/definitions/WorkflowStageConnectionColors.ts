export type WorkflowStageConnectionRole = "incoming" | "outgoing" | "both" | "deleting";

const affectedStageColors = {
  label: "Affected",
  panel: "border-blue-300 bg-blue-50",
  badge: "border-blue-300 bg-blue-100 text-blue-900",
  row: "bg-blue-50 ring-1 ring-blue-400",
};

export const workflowStageConnectionColors = {
  incoming: affectedStageColors,
  outgoing: affectedStageColors,
  both: affectedStageColors,
  deleting: {
    label: "Deleting",
    panel: "border-red-300 bg-red-50",
    badge: "border-red-300 bg-red-100 text-red-900",
    row: "bg-red-50 ring-1 ring-red-400",
  },
} satisfies Record<WorkflowStageConnectionRole, {
  label: string;
  panel: string;
  badge: string;
  row: string;
}>;
