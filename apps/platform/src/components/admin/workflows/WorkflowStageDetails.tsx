import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowAssignmentOptions,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageTaskTable } from "@/modules/workflows/ui/definitions/WorkflowStageTaskTable";
import { WorkflowStageActionTable } from "@/modules/workflows/ui/definitions/WorkflowStageActionTable";
import { Badge, type BadgeProps } from "@/shared/ui/Badge";

type Props = {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  assignmentOptions?: WorkflowAssignmentOptions;
  onAddAction: () => void;
  onAddTask: () => void;
  onDelete: () => void;
  onDeleteAction: (action: WorkflowActionDefinition) => void;
  onEdit: () => void;
  onEditAction: (action: WorkflowActionDefinition) => void;
  onDeleteTask: (task: WorkflowTaskInput) => void;
  onEditTask: (task: WorkflowTaskInput) => void;
  stage?: WorkflowStageInput;
  stageIndex: number;
};

export function WorkflowStageDetails({
  canEdit,
  canDelete,
  isDeleting,
  assignmentOptions,
  onAddAction,
  onAddTask,
  onDelete,
  onDeleteAction,
  onEdit,
  onEditAction,
  onDeleteTask,
  onEditTask,
  stage,
  stageIndex,
}: Props) {
  if (!stage) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-brand-navy/15 text-sm text-brand-navy/55">
        Select a stage to view its details.
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5">
      <StageDetailHeader
        canEdit={canEdit}
        canDelete={canDelete}
        isDeleting={isDeleting}
        onDelete={onDelete}
        onEdit={onEdit}
        stage={stage}
        stageIndex={stageIndex}
      />
      <StageConfiguration stage={stage} />
      <WorkflowStageActionTable
        canEdit={canEdit}
        onAdd={onAddAction}
        onDelete={onDeleteAction}
        onEdit={onEditAction}
        stage={stage}
      />
      <WorkflowStageTaskTable
        assignmentOptions={assignmentOptions}
        canEdit={canEdit}
        onAdd={onAddTask}
        onDelete={onDeleteTask}
        onEdit={onEditTask}
        stage={stage}
      />
    </article>
  );
}

function StageConfiguration({ stage }: { stage: WorkflowStageInput }) {
  const badges = [
    {
      label: stage.enabled ? "Enabled" : "Disabled",
      variant: stage.enabled ? "success" : "outline",
    },
    {
      label: stage.optional ? "Optional" : "Required",
      variant: stage.optional ? "gold" : "navy",
    },
    {
      label: stage.repeatable ? "Repeatable" : "Single-run",
      variant: stage.repeatable ? "yellow" : "subtle",
    },
    {
      label: stage.coiGated ? "COI-gated" : "No COI gate",
      variant: stage.coiGated ? "primary" : "outlineOrange",
    },
  ] satisfies Array<{ label: string; variant: BadgeProps["variant"] }>;

  return (
    <dl className="mt-4 grid gap-3 rounded-xl border border-brand-navy/10 p-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Stable key</dt>
        <dd className="font-mono text-brand-navy">{stage.stableKey}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Display order</dt>
        <dd className="text-brand-navy">{stage.displayOrder}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs font-semibold text-brand-navy/55">Description</dt>
        <dd className="text-brand-navy">{stage.description || "No description"}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-brand-navy/55">Configuration</dt>
        <dd className="mt-1.5 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.label}
            </Badge>
          ))}
        </dd>
      </div>
    </dl>
  );
}

function StageDetailHeader({
  canEdit,
  canDelete,
  isDeleting,
  onDelete,
  onEdit,
  stage,
  stageIndex,
}: {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  stage: WorkflowStageInput;
  stageIndex: number;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-brand-navy/10 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy/45">
          Stage {stageIndex + 1} · Approval
        </p>
        <h3 className="mt-1 text-lg font-bold text-brand-navy">{stage.name}</h3>
      </div>
      <div className="flex items-center gap-2">
        <EditButton disabled={!canEdit} onClick={onEdit} title="Edit stage" />
        <DeleteButton
          disabled={!canDelete}
          isLoading={isDeleting}
          onClick={onDelete}
          title="Delete stage"
        />
      </div>
    </header>
  );
}
