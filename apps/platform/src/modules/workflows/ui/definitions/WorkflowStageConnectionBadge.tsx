import {
  workflowStageConnectionColors,
  type WorkflowStageConnectionRole,
} from "./WorkflowStageConnectionColors";

export function WorkflowStageConnectionBadge({
  role,
}: {
  role: WorkflowStageConnectionRole;
}) {
  const color = workflowStageConnectionColors[role];
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${color.badge}`}>
      {color.label}
    </span>
  );
}
