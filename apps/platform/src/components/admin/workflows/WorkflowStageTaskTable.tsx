import { CheckCircle2, Plus } from "lucide-react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import type {
  WorkflowAssignmentOptions,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Props = {
  assignmentOptions?: WorkflowAssignmentOptions;
  canEdit: boolean;
  onAdd: () => void;
  onDelete: (task: WorkflowTaskInput) => void;
  onEdit: (task: WorkflowTaskInput) => void;
  stage: WorkflowStageInput;
};

function assignmentLabel(
  task: WorkflowTaskInput,
  options?: WorkflowAssignmentOptions,
) {
  if (task.assignmentUserId) {
    return (
      options?.users.find((item) => item.id === task.assignmentUserId)?.label ??
      "Specific user"
    );
  }
  const roleId = task.assignmentRoleId;
  if (!roleId) return "Unassigned";
  const role = options?.roles.find((item) => item.id === roleId)?.label;
  return role ?? "Configured role";
}

export function WorkflowStageTaskTable({
  assignmentOptions,
  canEdit,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  return (
    <section className="mt-5 overflow-x-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-brand-navy">
          Tasks ({stage.tasks.length})
        </h4>
        <GeneralButton
          disabled={!canEdit}
          onClick={onAdd}
          size="sm"
          type="button"
          variant="primary"
        >
          <Plus className="size-4" /> Add task
        </GeneralButton>
      </div>
      <table className="w-full min-w-[820px] overflow-hidden rounded-xl border border-brand-navy/15 text-left text-xs">
        <thead className="bg-brand-cream text-[10px] text-brand-navy/55">
          <tr>
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">Task Type</th>
            <th className="px-4 py-3">Requirement</th>
            <th className="px-4 py-3">Assignee</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stage.tasks.map((task) => (
            <tr className="border-t border-brand-navy/10" key={task.code}>
              <td className="px-4 py-3 font-semibold text-brand-navy">
                {task.name}
              </td>
              <td className="px-4 py-3 text-brand-navy/65">
                {task.type.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-brand-cream px-2 py-1 font-semibold text-brand-navy/65">
                  {task.required ? "Mandatory" : "Optional"}
                </span>
              </td>
              <td className="max-w-56 truncate px-4 py-3 text-brand-navy/65">
                {assignmentLabel(task, assignmentOptions)}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-brand-green">
                  <CheckCircle2 className="size-3.5" /> Active
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <EditButton
                    disabled={!canEdit}
                    onClick={() => onEdit(task)}
                    title={`Edit ${task.name}`}
                  />
                  <DeleteButton
                    disabled={!canEdit}
                    onClick={() => onDelete(task)}
                    title={`Delete ${task.name}`}
                  />
                </div>
              </td>
            </tr>
          ))}
          {stage.tasks.length === 0 ? (
            <tr className="border-t border-brand-navy/10">
              <td className="px-4 py-8 text-center text-brand-navy/55" colSpan={6}>
                No tasks have been added to this stage.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
