import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import type {
  WorkflowAssignmentOptions,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageTaskTable } from "@/modules/workflows/ui/definitions/WorkflowStageTaskTable";

type Props = {
  canEdit: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  assignmentOptions?: WorkflowAssignmentOptions;
  onAddTask: () => void;
  onDelete: () => void;
  onEdit: () => void;
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
  onAddTask,
  onDelete,
  onEdit,
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
      <ApprovalRule stage={stage} />
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
        <dd className="text-brand-navy">
          {[
            stage.enabled ? "Enabled" : "Disabled",
            stage.optional ? "Optional" : "Required",
            stage.repeatable ? "Repeatable" : "Single-run",
            stage.coiGated ? "COI-gated" : "No COI gate",
          ].join(" · ")}
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

function ApprovalRule({ stage }: { stage: WorkflowStageInput }) {
  const required = stage.tasks.reduce(
    (total, task) => total + task.requiredCompletionCount,
    0,
  );
  const reviewers = stage.tasks.reduce(
    (total, task) => total + task.reviewerCount,
    0,
  );
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-blue/15 px-4 py-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-navy/60">
          Approval rule
        </p>
        <p className="mt-1 text-sm font-semibold text-brand-navy">
          {required} required completions across {reviewers} reviewer slots
        </p>
      </div>
      <span className="rounded-full border border-brand-orange bg-white px-3 py-1 text-[10px] font-bold text-brand-orange">
        {stage.tasks.filter((task) => task.quorum).length} quorum tasks
      </span>
    </div>
  );
}
